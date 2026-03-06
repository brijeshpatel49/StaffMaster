import cron from "node-cron";
import Performance from "../models/Performance.js";
import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Task from "../models/Task.js";
import Holiday from "../models/Holiday.js";
import { sendPerformanceReviewEmail } from "../utils/emailService.js";

// Runs at 3:00 AM UTC on the 1st of every month → generates reviews for previous month
const CRON_SCHEDULE = "0 3 1 * *";

async function calculateScoresForEmployee(employeeId, joiningDate, month, year) {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  const attendanceRecords = await Attendance.find({
    employeeId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let present = 0, late = 0, absent = 0, halfDay = 0, onLeave = 0;
  for (const rec of attendanceRecords) {
    switch (rec.status) {
      case "present": present++; break;
      case "late": late++; break;
      case "absent": absent++; break;
      case "half-day": halfDay++; break;
      case "on-leave": onLeave++; break;
    }
  }

  const holidays = await Holiday.find({
    date: { $gte: startOfMonth, $lte: endOfMonth },
    isActive: true,
  });
  const holidayDates = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));

  let effectiveStart = startOfMonth;
  if (joiningDate && new Date(joiningDate) > startOfMonth) {
    effectiveStart = new Date(joiningDate);
    effectiveStart.setUTCHours(0, 0, 0, 0);
  }

  let totalWorkingDays = 0;
  const cursor = new Date(effectiveStart);
  while (cursor <= endOfMonth) {
    if (cursor.getUTCDay() !== 0 && !holidayDates.has(cursor.toISOString().split("T")[0])) {
      totalWorkingDays++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const attendancePercentage = totalWorkingDays > 0
    ? parseFloat((((present + late + halfDay * 0.5) / totalWorkingDays) * 100).toFixed(2))
    : 0;

  const attScore = Performance.calculateAttendanceScore(attendancePercentage);

  const allTasks = await Task.find({ assignedTo: employeeId, createdAt: { $lte: endOfMonth } });
  const nonCancelled = allTasks.filter((t) => t.status !== "cancelled");
  const totalAssigned = nonCancelled.length;
  const cancelled = allTasks.filter((t) => t.status === "cancelled").length;

  let completed = 0, inProgress = 0, overdue = 0, completedOnTime = 0;
  for (const task of nonCancelled) {
    if (task.status === "completed") {
      completed++;
      if (task.completedAt && task.deadline && task.completedAt <= task.deadline) completedOnTime++;
    } else if (task.status === "in_progress") {
      inProgress++;
    }
    if (task.deadline && task.deadline < endOfMonth && task.status !== "completed" && task.status !== "cancelled") {
      overdue++;
    }
  }

  let tScore, taskNote = "";
  if (totalAssigned === 0) {
    tScore = 3;
    taskNote = "No tasks assigned this period";
  } else {
    const completionRate = parseFloat(((completed / totalAssigned) * 100).toFixed(2));
    const onTimeRate = completed > 0 ? parseFloat(((completedOnTime / completed) * 100).toFixed(2)) : 0;
    tScore = Performance.calculateTaskScore(completionRate, onTimeRate);
    return {
      attendanceData: { present, late, absent, halfDay, onLeave, totalWorkingDays, attendancePercentage, score: attScore },
      taskData: { totalAssigned, completed, inProgress, overdue, cancelled, completionRate, onTimeRate, score: tScore, note: taskNote },
      autoScore: parseFloat((attScore * 0.3 + tScore * 0.4).toFixed(2)),
    };
  }

  return {
    attendanceData: { present, late, absent, halfDay, onLeave, totalWorkingDays, attendancePercentage, score: attScore },
    taskData: { totalAssigned, completed, inProgress, overdue, cancelled, completionRate: 0, onTimeRate: 0, score: tScore, note: taskNote },
    autoScore: parseFloat((attScore * 0.3 + tScore * 0.4).toFixed(2)),
  };
}

const MONTH_NAMES = ["", "January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

async function generatePreviousMonthReviews() {
  const now = new Date();
  let month = now.getMonth(); // 0-indexed → previous month
  let year = now.getFullYear();
  if (month === 0) { month = 12; year--; } // January → December of previous year

  console.log(`[Performance Cron] Generating reviews for ${MONTH_NAMES[month]} ${year}...`);

  const existing = await Performance.countDocuments({ "period.month": month, "period.year": year });
  if (existing > 0) {
    console.log(`[Performance Cron] Reviews already exist for ${MONTH_NAMES[month]} ${year}. Skipping.`);
    return;
  }

  const profiles = await EmployeeProfile.find({ status: "active" }).populate({
    path: "userId",
    match: { isActive: true, role: { $in: ["employee", "manager"] } },
    select: "_id fullName email role",
  });

  const activeProfiles = profiles.filter((p) => p.userId);
  const records = [];
  const managerEmployeeMap = {};
  let skipped = 0;

  for (const profile of activeProfiles) {
    const department = await Department.findById(profile.departmentId);
    if (!department || !department.manager) { skipped++; continue; }

    const managerId = department.manager;
    if (managerId.toString() === profile.userId._id.toString()) { skipped++; continue; }

    const { attendanceData, taskData, autoScore } = await calculateScoresForEmployee(
      profile.userId._id, profile.joiningDate, month, year
    );

    records.push({
      employeeId: profile.userId._id,
      managerId,
      departmentId: profile.departmentId,
      period: { month, year },
      attendanceScore: attendanceData,
      taskScore: taskData,
      autoScore,
      status: "pending",
    });

    const mgrId = managerId.toString();
    if (!managerEmployeeMap[mgrId]) managerEmployeeMap[mgrId] = [];
    managerEmployeeMap[mgrId].push({ name: profile.userId.fullName, email: profile.userId.email });
  }

  if (records.length > 0) {
    try {
      await Performance.insertMany(records, { ordered: false });
    } catch (err) {
      if (err.code !== 11000) throw err;
    }
  }

  // Notify managers
  for (const [mgrId, employees] of Object.entries(managerEmployeeMap)) {
    try {
      const manager = await User.findById(mgrId).select("fullName email");
      if (manager) {
        sendPerformanceReviewEmail({
          managerName: manager.fullName,
          managerEmail: manager.email,
          pendingCount: employees.length,
          month,
          year,
          employees,
        }).catch((err) => console.error(`[Performance Cron] Email error:`, err.message));
      }
    } catch { /* skip */ }
  }

  console.log(`[Performance Cron] Done. Generated ${records.length}, skipped ${skipped}.`);
}

// Schedule the cron job
cron.schedule(CRON_SCHEDULE, () => {
  console.log("[Performance Cron] Triggered at", new Date().toISOString());
  generatePreviousMonthReviews().catch((err) =>
    console.error("[Performance Cron] Fatal error:", err)
  );
});

export { generatePreviousMonthReviews };
