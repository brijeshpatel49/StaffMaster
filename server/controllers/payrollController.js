import Payroll from "../models/Payroll.js";
import SalaryStructure from "../models/SalaryStructure.js";
import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";
import PDFDocument from "pdfkit";
import { sendPayslipReadyEmail } from "../utils/emailService.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * Calculate working days in a range excluding Sundays and holidays.
 */
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

/**
 * Generate payroll for a single employee for a given month/year.
 * Returns the created/updated Payroll doc, or null if skipped.
 */
async function generateForEmployee(
  employeeId,
  month,
  year,
  generatedBy,
  holidayDates,
  holidayCount
) {
  const salary = await SalaryStructure.findOne({ employeeId });
  if (!salary) {
    return {
      skipped: true,
      reason: "No salary structure defined",
      employeeId,
    };
  }

  const profile = await EmployeeProfile.findOne({ userId: employeeId });
  const joiningDate = profile?.joiningDate
    ? new Date(profile.joiningDate)
    : null;

  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // Pro-rate if joined mid-month
  let effectiveStart = startOfMonth;
  let isProRated = false;
  let proRateDays = 0;

  if (joiningDate && joiningDate > startOfMonth && joiningDate <= endOfMonth) {
    effectiveStart = new Date(joiningDate);
    effectiveStart.setUTCHours(0, 0, 0, 0);
    isProRated = true;
  } else if (joiningDate && joiningDate > endOfMonth) {
    return {
      skipped: true,
      reason: "Employee joins after this month",
      employeeId,
    };
  }

  const totalWorkingDays = getWorkingDays(
    startOfMonth,
    endOfMonth,
    holidayDates
  );
  const effectiveWorkingDays = getWorkingDays(
    effectiveStart,
    endOfMonth,
    holidayDates
  );
  if (isProRated) {
    proRateDays = effectiveWorkingDays;
  }

  // Attendance data
  const attendance = await Attendance.find({
    employeeId,
    date: { $gte: effectiveStart, $lte: endOfMonth },
  });

  let presentDays = 0,
    lateDays = 0,
    absentDays = 0,
    halfDays = 0,
    leaveDays = 0;
  for (const rec of attendance) {
    switch (rec.status) {
      case "present":
        presentDays++;
        break;
      case "late":
        lateDays++;
        break;
      case "absent":
        absentDays++;
        break;
      case "half-day":
        halfDays++;
        break;
      case "on-leave":
        leaveDays++;
        break;
    }
  }

  // Approved unpaid leave days in this month
  const unpaidLeaves = await Leave.find({
    employeeId,
    leaveType: "unpaid",
    status: "approved",
    fromDate: { $lte: endOfMonth },
    toDate: { $gte: effectiveStart },
  });
  let unpaidLeaveDays = 0;
  for (const leave of unpaidLeaves) {
    const from =
      leave.fromDate < effectiveStart ? effectiveStart : leave.fromDate;
    const to = leave.toDate > endOfMonth ? endOfMonth : leave.toDate;
    const days = Math.ceil((to - from) / (1000 * 60 * 60 * 24)) + 1;
    unpaidLeaveDays += leave.isHalfDay ? 0.5 : days;
  }

  // Monthly salary components
  const monthlyGross = salary.monthlyGross();
  const proRateRatio = isProRated
    ? effectiveWorkingDays / totalWorkingDays
    : 1;

  const basic = Math.round((salary.basic / 12) * proRateRatio);
  const hra = Math.round((salary.hra / 12) * proRateRatio);
  const da = Math.round((salary.da / 12) * proRateRatio);
  const special = Math.round((salary.special / 12) * proRateRatio);
  const grossEarnings = basic + hra + da + special;

  const pf = Math.round((salary.pf / 12) * proRateRatio);
  const tax = Math.round((salary.tax / 12) * proRateRatio);

  // 3 lates = 1 absent (deduction)
  const lateAbsents = Math.floor(lateDays / 3);
  const perDaySalary =
    totalWorkingDays > 0 ? Math.round(monthlyGross / totalWorkingDays) : 0;
  const lateDeduction = lateAbsents * perDaySalary;
  const leaveDeduction = Math.round(unpaidLeaveDays * perDaySalary);

  const totalDeductions = pf + tax + lateDeduction + leaveDeduction;
  const netSalary = Math.max(0, grossEarnings - totalDeductions);

  // Paid days = present + late + half-day(0.5 each) + paid leaves
  const paidDays =
    presentDays + lateDays + halfDays * 0.5 + (leaveDays - unpaidLeaveDays);

  const payrollData = {
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
    holidays: holidayCount,
    paidDays: Math.max(0, paidDays),
    isProRated,
    proRateDays,
    status: "draft",
    generatedBy,
    skippedReason: null,
  };

  const payroll = await Payroll.findOneAndUpdate(
    { employeeId, month, year },
    payrollData,
    { upsert: true, returnDocument: "after" }
  );

  return { skipped: false, payroll };
}

// ── Controllers ──────────────────────────────────────────────────────────────

/**
 * GET /api/payroll/salary-structures
 * Get all employees with their salary structure status. HR/Admin only.
 */
export const getAllSalaryStructures = async (req, res) => {
  try {
    const profiles = await EmployeeProfile.find({ status: "active" }).populate(
      "userId",
      "fullName email role"
    );

    const employeeIds = profiles
      .filter((p) => p.userId)
      .map((p) => p.userId._id);

    const structures = await SalaryStructure.find({
      employeeId: { $in: employeeIds },
    });

    const structureMap = {};
    for (const s of structures) {
      structureMap[s.employeeId.toString()] = s;
    }

    const result = profiles
      .filter((p) => p.userId)
      .map((p) => {
        const s = structureMap[p.userId._id.toString()];
        return {
          _id: p.userId._id,
          fullName: p.userId.fullName,
          email: p.userId.email,
          role: p.userId.role,
          designation: p.designation,
          hasSalary: !!s,
          ctc: s?.ctc || null,
          basic: s?.basic || null,
          hra: s?.hra || null,
          da: s?.da || null,
          special: s?.special || null,
          pf: s?.pf || null,
          tax: s?.tax || null,
          effectiveFrom: s?.effectiveFrom || null,
        };
      });

    return res.json({ success: true, data: result });
  } catch (error) {
    console.error("[Payroll] getAllSalaryStructures error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /api/payroll/salary-structures/bulk
 * Set salary structure for multiple employees at once. HR/Admin only.
 * Body: { employees: [{ employeeId, ctc }], effectiveFrom }
 */
export const bulkSetSalaryStructure = async (req, res) => {
  try {
    const { employees, effectiveFrom } = req.body;

    if (!employees?.length || !effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: "employees array and effectiveFrom are required",
      });
    }

    let saved = 0,
      failed = 0;
    const errors = [];

    for (const emp of employees) {
      if (!emp.employeeId || !emp.ctc || emp.ctc <= 0) {
        failed++;
        errors.push({ employeeId: emp.employeeId, reason: "Invalid data" });
        continue;
      }

      try {
        let structure = await SalaryStructure.findOne({
          employeeId: emp.employeeId,
        });
        if (structure) {
          structure.ctc = emp.ctc;
          structure.effectiveFrom = effectiveFrom;
          structure.updatedBy = req.user._id;
          await structure.save();
        } else {
          await SalaryStructure.create({
            employeeId: emp.employeeId,
            ctc: emp.ctc,
            effectiveFrom,
            updatedBy: req.user._id,
          });
        }
        saved++;
      } catch (err) {
        failed++;
        errors.push({ employeeId: emp.employeeId, reason: err.message });
      }
    }

    return res.json({
      success: true,
      message: `Salary structures saved: ${saved}, failed: ${failed}`,
      data: { saved, failed, errors },
    });
  } catch (error) {
    console.error("[Payroll] bulkSetSalaryStructure error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /api/payroll/salary-structure
 * Set or update salary structure for an employee. HR/Admin only.
 */
export const setSalaryStructure = async (req, res) => {
  try {
    const { employeeId, ctc, effectiveFrom } = req.body;

    if (!employeeId || !ctc || !effectiveFrom) {
      return res.status(400).json({
        success: false,
        message: "employeeId, ctc, and effectiveFrom are required",
      });
    }

    const employee = await User.findById(employeeId);
    if (!employee) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    let structure = await SalaryStructure.findOne({ employeeId });
    if (structure) {
      structure.ctc = ctc;
      structure.effectiveFrom = effectiveFrom;
      structure.updatedBy = req.user._id;
      await structure.save();
    } else {
      structure = await SalaryStructure.create({
        employeeId,
        ctc,
        effectiveFrom,
        updatedBy: req.user._id,
      });
    }

    return res.json({
      success: true,
      message: "Salary structure saved",
      data: structure,
    });
  } catch (error) {
    console.error("[Payroll] setSalaryStructure error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/salary-structure/:employeeId
 * Get salary structure for an employee. HR/Admin only.
 */
export const getSalaryStructure = async (req, res) => {
  try {
    const structure = await SalaryStructure.findOne({
      employeeId: req.params.employeeId,
    }).populate("employeeId", "fullName email");

    if (!structure) {
      return res
        .status(404)
        .json({ success: false, message: "No salary structure found" });
    }

    return res.json({ success: true, data: structure });
  } catch (error) {
    console.error("[Payroll] getSalaryStructure error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /api/payroll/generate
 * Generate payroll for all active employees for a given month/year.
 */
export const generatePayroll = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year are required" });
    }

    // Check if already generated
    const existing = await Payroll.countDocuments({ month, year });
    if (existing > 0) {
      return res.status(400).json({
        success: false,
        message: `Payroll already generated for ${MONTH_NAMES[month]} ${year}. Use regenerate to recalculate.`,
      });
    }

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
    const skippedList = [];

    for (const profile of activeProfiles) {
      if (!profile.userId) continue;
      const result = await generateForEmployee(
        profile.userId._id,
        month,
        year,
        req.user._id,
        holidayDates,
        holidays.length
      );
      if (result.skipped) {
        skipped++;
        skippedList.push({
          employee: profile.userId.fullName,
          reason: result.reason,
        });
      } else {
        generated++;
      }
    }

    return res.json({
      success: true,
      message: `Payroll generated for ${MONTH_NAMES[month]} ${year}`,
      data: { generated, skipped, skippedList },
    });
  } catch (error) {
    console.error("[Payroll] generatePayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * POST /api/payroll/regenerate
 * Regenerate (recalculate) payroll for a specific month/year. Resets status to draft.
 */
export const regeneratePayroll = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year are required" });
    }

    // Delete existing records for this month
    await Payroll.deleteMany({ month, year });

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
    const skippedList = [];

    for (const profile of activeProfiles) {
      if (!profile.userId) continue;
      const result = await generateForEmployee(
        profile.userId._id,
        month,
        year,
        req.user._id,
        holidayDates,
        holidays.length
      );
      if (result.skipped) {
        skipped++;
        skippedList.push({
          employee: profile.userId.fullName,
          reason: result.reason,
        });
      } else {
        generated++;
      }
    }

    return res.json({
      success: true,
      message: `Payroll regenerated for ${MONTH_NAMES[month]} ${year}`,
      data: { generated, skipped, skippedList },
    });
  } catch (error) {
    console.error("[Payroll] regeneratePayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * PATCH /api/payroll/:id/approve
 * Approve a payroll record. HR/Admin only.
 */
export const approvePayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll record not found" });
    }

    if (payroll.status !== "draft") {
      return res.status(400).json({
        success: false,
        message: `Cannot approve — status is already "${payroll.status}"`,
      });
    }

    payroll.status = "approved";
    payroll.approvedBy = req.user._id;
    payroll.approvedAt = new Date();
    await payroll.save();

    return res.json({
      success: true,
      message: "Payroll approved",
      data: payroll,
    });
  } catch (error) {
    console.error("[Payroll] approvePayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * PATCH /api/payroll/bulk-approve
 * Bulk approve all draft payrolls for a month/year.
 */
export const bulkApprove = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year are required" });
    }

    const result = await Payroll.updateMany(
      { month, year, status: "draft" },
      {
        status: "approved",
        approvedBy: req.user._id,
        approvedAt: new Date(),
      }
    );

    return res.json({
      success: true,
      message: `${result.modifiedCount} payroll(s) approved`,
      data: { approved: result.modifiedCount },
    });
  } catch (error) {
    console.error("[Payroll] bulkApprove error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * PATCH /api/payroll/:id/mark-paid
 * Mark an approved payroll as paid.
 */
export const markPaid = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id);
    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll record not found" });
    }

    if (payroll.status !== "approved") {
      return res.status(400).json({
        success: false,
        message: "Only approved payrolls can be marked as paid",
      });
    }

    payroll.status = "paid";
    payroll.paidAt = new Date();
    payroll.paidBy = req.user._id;
    await payroll.save();

    // Send payslip ready email
    try {
      const employee = await User.findById(payroll.employeeId);
      if (employee) {
        await sendPayslipReadyEmail({
          fullName: employee.fullName,
          email: employee.email,
          month: MONTH_NAMES[payroll.month],
          year: payroll.year,
          netSalary: payroll.netSalary,
        });
      }
    } catch (emailErr) {
      console.error("[Payroll] Email send failed:", emailErr.message);
    }

    return res.json({
      success: true,
      message: "Payroll marked as paid",
      data: payroll,
    });
  } catch (error) {
    console.error("[Payroll] markPaid error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * PATCH /api/payroll/bulk-pay
 * Bulk mark all approved payrolls for a month/year as paid + send emails.
 */
export const bulkPay = async (req, res) => {
  try {
    const { month, year } = req.body;
    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year are required" });
    }

    const payrolls = await Payroll.find({
      month,
      year,
      status: "approved",
    }).populate("employeeId", "fullName email");

    let paidCount = 0;
    for (const p of payrolls) {
      p.status = "paid";
      p.paidAt = new Date();
      p.paidBy = req.user._id;
      await p.save();
      paidCount++;

      // Send email (don't let email failure block the loop)
      try {
        if (p.employeeId?.email) {
          await sendPayslipReadyEmail({
            fullName: p.employeeId.fullName,
            email: p.employeeId.email,
            month: MONTH_NAMES[month],
            year,
            netSalary: p.netSalary,
          });
        }
      } catch {
        // continue
      }
    }

    return res.json({
      success: true,
      message: `${paidCount} payroll(s) marked as paid`,
      data: { paid: paidCount },
    });
  } catch (error) {
    console.error("[Payroll] bulkPay error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/my
 * Employee gets their own payroll history.
 */
export const getMyPayroll = async (req, res) => {
  try {
    const payrolls = await Payroll.find({
      employeeId: req.user._id,
    }).sort({ year: -1, month: -1 });

    return res.json({ success: true, data: payrolls });
  } catch (error) {
    console.error("[Payroll] getMyPayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/my/latest
 * Employee gets their latest payslip.
 */
export const getMyLatestPayroll = async (req, res) => {
  try {
    const payroll = await Payroll.findOne({
      employeeId: req.user._id,
      status: { $in: ["approved", "paid"] },
    }).sort({ year: -1, month: -1 });

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "No payslip found" });
    }

    return res.json({ success: true, data: payroll });
  } catch (error) {
    console.error("[Payroll] getMyLatestPayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/team
 * Manager gets payroll status (no salary amounts) for their department.
 */
export const getTeamPayroll = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year query params required" });
    }

    // Find manager's department
    const managerProfile = await EmployeeProfile.findOne({
      userId: req.user._id,
    });
    if (!managerProfile) {
      return res
        .status(404)
        .json({ success: false, message: "Manager profile not found" });
    }

    const teamProfiles = await EmployeeProfile.find({
      departmentId: managerProfile.departmentId,
      status: "active",
    }).populate("userId", "fullName email");

    const teamIds = teamProfiles
      .filter((p) => p.userId)
      .map((p) => p.userId._id);

    const payrolls = await Payroll.find({
      employeeId: { $in: teamIds },
      month: Number(month),
      year: Number(year),
    }).populate("employeeId", "fullName email");

    // Return only status — no salary amounts
    const data = payrolls.map((p) => ({
      _id: p._id,
      employeeId: p.employeeId,
      month: p.month,
      year: p.year,
      status: p.status,
      totalWorkingDays: p.totalWorkingDays,
      presentDays: p.presentDays,
      absentDays: p.absentDays,
      lateDays: p.lateDays,
      paidAt: p.paidAt,
    }));

    return res.json({ success: true, data });
  } catch (error) {
    console.error("[Payroll] getTeamPayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/all
 * HR/Admin gets all payrolls for a month/year with employee details.
 */
export const getAllPayroll = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year query params required" });
    }

    const payrolls = await Payroll.find({
      month: Number(month),
      year: Number(year),
    })
      .populate("employeeId", "fullName email")
      .sort({ netSalary: -1 });

    return res.json({ success: true, data: payrolls });
  } catch (error) {
    console.error("[Payroll] getAllPayroll error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/summary
 * HR/Admin gets payroll summary stats for a month/year.
 */
export const getPayrollSummary = async (req, res) => {
  try {
    const { month, year } = req.query;
    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "month and year query params required" });
    }

    const payrolls = await Payroll.find({
      month: Number(month),
      year: Number(year),
    });

    const total = payrolls.length;
    const draft = payrolls.filter((p) => p.status === "draft").length;
    const approved = payrolls.filter((p) => p.status === "approved").length;
    const paid = payrolls.filter((p) => p.status === "paid").length;
    const totalGross = payrolls.reduce((s, p) => s + p.grossEarnings, 0);
    const totalDeductions = payrolls.reduce((s, p) => s + p.totalDeductions, 0);
    const totalNet = payrolls.reduce((s, p) => s + p.netSalary, 0);

    return res.json({
      success: true,
      data: {
        total,
        draft,
        approved,
        paid,
        totalGross,
        totalDeductions,
        totalNet,
      },
    });
  } catch (error) {
    console.error("[Payroll] getPayrollSummary error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/:id
 * Get a single payroll record with employee details.
 */
export const getPayrollById = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id)
      .populate("employeeId", "fullName email")
      .populate("approvedBy", "fullName")
      .populate("paidBy", "fullName");

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll record not found" });
    }

    return res.json({ success: true, data: payroll });
  } catch (error) {
    console.error("[Payroll] getPayrollById error:", error.message);
    return res
      .status(500)
      .json({ success: false, message: "Server error", error: error.message });
  }
};

/**
 * GET /api/payroll/:id/download
 * Download PDF payslip for a payroll record.
 */
export const downloadPayslip = async (req, res) => {
  try {
    const payroll = await Payroll.findById(req.params.id).populate(
      "employeeId",
      "fullName email"
    );

    if (!payroll) {
      return res
        .status(404)
        .json({ success: false, message: "Payroll record not found" });
    }

    // Only allow employee to download their own, or HR/Admin to download any
    if (
      req.user.role === "employee" &&
      payroll.employeeId._id.toString() !== req.user._id.toString()
    ) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized" });
    }

    const profile = await EmployeeProfile.findOne({
      userId: payroll.employeeId._id,
    }).populate("departmentId", "name");

    const doc = new PDFDocument({ size: "A4", margin: 50 });
    const monthName = MONTH_NAMES[payroll.month];
    const fileName = `Payslip_${payroll.employeeId.fullName.replace(/\s+/g, "_")}_${monthName}_${payroll.year}.pdf`;

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
    doc.pipe(res);

    // ── Header ──
    doc.rect(0, 0, doc.page.width, 80).fill("#f59e0b");
    doc
      .font("Helvetica-Bold")
      .fontSize(22)
      .fillColor("#ffffff")
      .text("StaffMaster", 50, 25, { lineGap: 4 });
    doc
      .font("Helvetica")
      .fontSize(10)
      .fillColor("#ffffff")
      .text(`Payslip for ${monthName} ${payroll.year}`, 50, 52);

    doc
      .font("Helvetica-Bold")
      .fontSize(10)
      .fillColor("#ffffff")
      .text(payroll.status.toUpperCase(), doc.page.width - 150, 35, {
        width: 100,
        align: "right",
      });

    // ── Employee Info ──
    doc.fillColor("#333333");
    const infoY = 105;
    doc.font("Helvetica-Bold").fontSize(11).text("Employee Details", 50, infoY);
    doc.moveTo(50, infoY + 16).lineTo(545, infoY + 16).stroke("#e5e7eb");

    const col1 = 50,
      col2 = 300;
    let y = infoY + 25;

    const addRow = (label, value, x) => {
      doc
        .font("Helvetica")
        .fontSize(9)
        .fillColor("#6b7280")
        .text(label, x, y);
      doc
        .font("Helvetica-Bold")
        .fontSize(9)
        .fillColor("#111827")
        .text(value || "N/A", x + 100, y);
    };

    addRow("Name", payroll.employeeId.fullName, col1);
    addRow("Department", profile?.departmentId?.name || "N/A", col2);
    y += 18;
    addRow("Email", payroll.employeeId.email, col1);
    addRow("Designation", profile?.designation || "N/A", col2);
    y += 18;
    addRow("Working Days", String(payroll.totalWorkingDays), col1);
    addRow("Present Days", String(payroll.presentDays), col2);

    // ── Earnings & Deductions Table ──
    y += 40;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#333333")
      .text("Earnings", col1, y);
    doc.text("Deductions", col2, y);
    y += 16;
    doc.moveTo(50, y).lineTo(545, y).stroke("#e5e7eb");
    y += 10;

    const fmtCurrency = (n) =>
      `Rs. ${Number(n).toLocaleString("en-IN")}`;

    const earningsItems = [
      ["Basic Pay", payroll.basic],
      ["HRA", payroll.hra],
      ["DA", payroll.da],
      ["Special Allowance", payroll.special],
    ];
    const deductionItems = [
      ["Provident Fund", payroll.pf],
      ["Tax", payroll.tax],
      ["Late Deduction", payroll.lateDeduction],
      ["Leave Deduction", payroll.leaveDeduction],
    ];

    const maxRows = Math.max(earningsItems.length, deductionItems.length);
    for (let i = 0; i < maxRows; i++) {
      if (earningsItems[i]) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#374151")
          .text(earningsItems[i][0], col1, y);
        doc.text(fmtCurrency(earningsItems[i][1]), col1 + 150, y, {
          width: 80,
          align: "right",
        });
      }
      if (deductionItems[i]) {
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#374151")
          .text(deductionItems[i][0], col2, y);
        doc.text(fmtCurrency(deductionItems[i][1]), col2 + 150, y, {
          width: 80,
          align: "right",
        });
      }
      y += 18;
    }

    // Totals
    y += 5;
    doc.moveTo(50, y).lineTo(545, y).stroke("#e5e7eb");
    y += 10;
    doc.font("Helvetica-Bold").fontSize(10).fillColor("#111827");
    doc.text("Gross Earnings", col1, y);
    doc.text(fmtCurrency(payroll.grossEarnings), col1 + 150, y, {
      width: 80,
      align: "right",
    });
    doc.text("Total Deductions", col2, y);
    doc.text(fmtCurrency(payroll.totalDeductions), col2 + 150, y, {
      width: 80,
      align: "right",
    });

    // Net Salary
    y += 35;
    doc.rect(50, y, 495, 40).fill("#fffbeb");
    doc
      .font("Helvetica-Bold")
      .fontSize(14)
      .fillColor("#92400e")
      .text("Net Salary", 70, y + 12);
    doc.text(fmtCurrency(payroll.netSalary), 300, y + 12, {
      width: 225,
      align: "right",
    });

    // Attendance Summary
    y += 60;
    doc
      .font("Helvetica-Bold")
      .fontSize(11)
      .fillColor("#333333")
      .text("Attendance Summary", col1, y);
    y += 16;
    doc.moveTo(50, y).lineTo(545, y).stroke("#e5e7eb");
    y += 10;

    const attItems = [
      ["Present", payroll.presentDays],
      ["Late", payroll.lateDays],
      ["Absent", payroll.absentDays],
      ["Half Day", payroll.halfDays],
      ["On Leave", payroll.leaveDays],
      ["Holidays", payroll.holidays],
    ];
    for (let i = 0; i < attItems.length; i += 3) {
      for (let j = 0; j < 3 && i + j < attItems.length; j++) {
        const x = col1 + j * 170;
        doc
          .font("Helvetica")
          .fontSize(9)
          .fillColor("#6b7280")
          .text(attItems[i + j][0], x, y);
        doc
          .font("Helvetica-Bold")
          .fontSize(9)
          .fillColor("#111827")
          .text(String(attItems[i + j][1]), x + 80, y);
      }
      y += 18;
    }

    if (payroll.isProRated) {
      y += 10;
      doc
        .font("Helvetica")
        .fontSize(8)
        .fillColor("#92400e")
        .text(
          `* Pro-rated salary — effective working days: ${payroll.proRateDays}`,
          col1,
          y
        );
    }

    // Footer
    y += payroll.isProRated ? 20 : 30;
    doc.moveTo(50, y).lineTo(545, y).stroke("#e5e7eb");
    y += 12;
    doc
      .font("Helvetica")
      .fontSize(8)
      .fillColor("#9ca3af")
      .text(
        "This is a system-generated payslip. No signature required.",
        50,
        y,
        { align: "center", width: 495 }
      );

    doc.end();
  } catch (error) {
    console.error("[Payroll] downloadPayslip error:", error.message);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: "Server error",
        error: error.message,
      });
    }
  }
};
