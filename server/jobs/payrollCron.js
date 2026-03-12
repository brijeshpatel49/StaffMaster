import cron from "node-cron";
import Payroll from "../models/Payroll.js";
import SalaryStructure from "../models/SalaryStructure.js";
import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Attendance from "../models/Attendance.js";
import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";

// Runs at 2:00 AM UTC on the 1st of every month → generates payroll for previous month
const CRON_SCHEDULE = "0 2 1 * *";

function getWorkingDays(startDate, endDate, holidayDates) {
  let count = 0;
  const cursor = new Date(startDate);
  while (cursor <= endDate) {
    if (
      cursor.getUTCDay() !== 0 &&
      !holidayDates.has(cursor.toISOString().split("T")[0])
    ) {
      count++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return count;
}

async function generatePayrollForMonth(month, year) {
  console.log(`[PayrollCron] Generating payroll for ${month}/${year}...`);

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const holidays = await Holiday.find({
    date: { $gte: startOfMonth, $lte: endOfMonth },
    isActive: true,
  });
  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().split("T")[0])
  );

  const activeProfiles = await EmployeeProfile.find({
    status: "active",
  }).populate("userId", "fullName email role");

  let generated = 0,
    skipped = 0;

  for (const profile of activeProfiles) {
    if (!profile.userId) continue;
    const employeeId = profile.userId._id;

    // Skip if already exists
    const exists = await Payroll.findOne({ employeeId, month, year });
    if (exists) {
      skipped++;
      continue;
    }

    const salary = await SalaryStructure.findOne({ employeeId });
    if (!salary) {
      skipped++;
      continue;
    }

    const joiningDate = profile.joiningDate
      ? new Date(profile.joiningDate)
      : null;

    let effectiveStart = startOfMonth;
    let isProRated = false;
    let proRateDays = 0;

    if (joiningDate && joiningDate > startOfMonth && joiningDate <= endOfMonth) {
      effectiveStart = new Date(joiningDate);
      effectiveStart.setUTCHours(0, 0, 0, 0);
      isProRated = true;
    } else if (joiningDate && joiningDate > endOfMonth) {
      skipped++;
      continue;
    }

    const totalWorkingDays = getWorkingDays(startOfMonth, endOfMonth, holidayDates);
    const effectiveWorkingDays = getWorkingDays(effectiveStart, endOfMonth, holidayDates);
    if (isProRated) proRateDays = effectiveWorkingDays;

    const attendance = await Attendance.find({
      employeeId,
      date: { $gte: effectiveStart, $lte: endOfMonth },
    });

    let presentDays = 0, lateDays = 0, absentDays = 0, halfDays = 0, leaveDays = 0;
    for (const rec of attendance) {
      switch (rec.status) {
        case "present": presentDays++; break;
        case "late": lateDays++; break;
        case "absent": absentDays++; break;
        case "half-day": halfDays++; break;
        case "on-leave": leaveDays++; break;
      }
    }

    const unpaidLeaves = await Leave.find({
      employeeId,
      leaveType: "unpaid",
      status: "approved",
      fromDate: { $lte: endOfMonth },
      toDate: { $gte: effectiveStart },
    });
    let unpaidLeaveDays = 0;
    for (const leave of unpaidLeaves) {
      const from = leave.fromDate < effectiveStart ? effectiveStart : leave.fromDate;
      const to = leave.toDate > endOfMonth ? endOfMonth : leave.toDate;
      const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
      unpaidLeaveDays += leave.isHalfDay ? 0.5 : days;
    }

    const proRateRatio = isProRated ? effectiveWorkingDays / totalWorkingDays : 1;
    const monthlyGross = salary.monthlyGross();

    const basic = Math.round((salary.basic / 12) * proRateRatio);
    const hra = Math.round((salary.hra / 12) * proRateRatio);
    const da = Math.round((salary.da / 12) * proRateRatio);
    const special = Math.round((salary.special / 12) * proRateRatio);
    const grossEarnings = basic + hra + da + special;

    const pf = Math.round((salary.pf / 12) * proRateRatio);
    const tax = Math.round((salary.tax / 12) * proRateRatio);

    const lateAbsents = Math.floor(lateDays / 3);
    const perDaySalary = totalWorkingDays > 0 ? Math.round(monthlyGross / totalWorkingDays) : 0;
    const lateDeduction = lateAbsents * perDaySalary;
    const leaveDeduction = Math.round(unpaidLeaveDays * perDaySalary);

    const totalDeductions = pf + tax + lateDeduction + leaveDeduction;
    const netSalary = Math.max(0, grossEarnings - totalDeductions);
    const paidDays = presentDays + lateDays + halfDays * 0.5 + (leaveDays - unpaidLeaveDays);

    await Payroll.create({
      employeeId,
      month,
      year,
      basic,
      hra,
      da,
      special,
      grossEarnings,
      pf,
      tax,
      lateDeduction,
      leaveDeduction,
      totalDeductions,
      netSalary,
      totalWorkingDays: isProRated ? effectiveWorkingDays : totalWorkingDays,
      presentDays,
      absentDays,
      lateDays,
      halfDays,
      leaveDays,
      holidays: holidays.length,
      paidDays: Math.max(0, paidDays),
      isProRated,
      proRateDays,
      status: "draft",
      generatedBy: null,
    });

    generated++;
  }

  console.log(
    `[PayrollCron] Done — ${generated} generated, ${skipped} skipped`
  );
}

// Schedule: 1st of every month at 2 AM UTC → payroll for previous month
cron.schedule(CRON_SCHEDULE, async () => {
  try {
    const now = new Date();
    // Previous month
    let month = now.getUTCMonth(); // 0-indexed, so this is already prev month
    let year = now.getUTCFullYear();
    if (month === 0) {
      month = 12;
      year -= 1;
    }
    await generatePayrollForMonth(month, year);
  } catch (err) {
    console.error("[PayrollCron] Error:", err.message);
  }
});

console.log("[PayrollCron] Scheduled — runs on 1st of every month at 2:00 AM UTC");
