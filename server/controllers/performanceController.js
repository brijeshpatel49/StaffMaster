import Performance from "../models/Performance.js";
import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";
import Attendance from "../models/Attendance.js";
import Task from "../models/Task.js";
import Holiday from "../models/Holiday.js";
import {
  sendPerformanceReviewEmail,
  sendPerformanceResultEmail,
} from "../utils/emailService.js";

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
 * Calculate attendance + task scores for ONE employee for a given month/year.
 * Returns { attendanceData, taskData, autoScore }.
 */
async function calculateScoresForEmployee(employeeId, joiningDate, month, year) {
  const startOfMonth = new Date(Date.UTC(year, month - 1, 1));
  const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

  // ── Attendance ──
  const attendanceRecords = await Attendance.find({
    employeeId,
    date: { $gte: startOfMonth, $lte: endOfMonth },
  });

  let present = 0,
    late = 0,
    absent = 0,
    halfDay = 0,
    onLeave = 0;

  for (const rec of attendanceRecords) {
    switch (rec.status) {
      case "present":
        present++;
        break;
      case "late":
        late++;
        break;
      case "absent":
        absent++;
        break;
      case "half-day":
        halfDay++;
        break;
      case "on-leave":
        onLeave++;
        break;
      // holiday records don't count against employee
    }
  }

  // Calculate total working days (exclude Sundays + holidays)
  const holidays = await Holiday.find({
    date: { $gte: startOfMonth, $lte: endOfMonth },
    isActive: true,
  });
  const holidayDates = new Set(
    holidays.map((h) => h.date.toISOString().split("T")[0])
  );

  // Determine effective start date (for new joiners)
  let effectiveStart = startOfMonth;
  if (joiningDate && new Date(joiningDate) > startOfMonth) {
    effectiveStart = new Date(joiningDate);
    effectiveStart.setUTCHours(0, 0, 0, 0);
  }

  let totalWorkingDays = 0;
  const cursor = new Date(effectiveStart);
  while (cursor <= endOfMonth) {
    const dayOfWeek = cursor.getUTCDay();
    const dateStr = cursor.toISOString().split("T")[0];
    if (dayOfWeek !== 0 && !holidayDates.has(dateStr)) {
      totalWorkingDays++;
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const attendancePercentage =
    totalWorkingDays > 0
      ? parseFloat(
          (((present + late + halfDay * 0.5) / totalWorkingDays) * 100).toFixed(
            2
          )
        )
      : 0;

  const attScore =
    Performance.calculateAttendanceScore(attendancePercentage);

  // ── Tasks ──
  const allTasks = await Task.find({
    assignedTo: employeeId,
    createdAt: { $lte: endOfMonth },
  });

  // Exclude cancelled from total
  const nonCancelledTasks = allTasks.filter((t) => t.status !== "cancelled");
  const totalAssigned = nonCancelledTasks.length;
  const cancelled = allTasks.filter((t) => t.status === "cancelled").length;

  let completed = 0,
    inProgress = 0,
    overdue = 0;
  let completedOnTime = 0;

  for (const task of nonCancelledTasks) {
    if (task.status === "completed") {
      completed++;
      if (task.completedAt && task.deadline && task.completedAt <= task.deadline) {
        completedOnTime++;
      }
    } else if (task.status === "in_progress") {
      inProgress++;
    }
    // Check overdue: deadline passed, not completed
    if (
      task.deadline &&
      task.deadline < endOfMonth &&
      task.status !== "completed" &&
      task.status !== "cancelled"
    ) {
      overdue++;
    }
  }

  let taskNote = "";
  let tScore;
  if (totalAssigned === 0) {
    tScore = 3; // neutral
    taskNote = "No tasks assigned this period";
  } else {
    const completionRate = parseFloat(
      ((completed / totalAssigned) * 100).toFixed(2)
    );
    const onTimeRate =
      completed > 0
        ? parseFloat(((completedOnTime / completed) * 100).toFixed(2))
        : 0;

    tScore = Performance.calculateTaskScore(completionRate, onTimeRate);

    return {
      attendanceData: {
        present,
        late,
        absent,
        halfDay,
        onLeave,
        totalWorkingDays,
        attendancePercentage,
        score: attScore,
      },
      taskData: {
        totalAssigned,
        completed,
        inProgress,
        overdue,
        cancelled,
        completionRate,
        onTimeRate,
        score: tScore,
        note: taskNote,
      },
      autoScore: parseFloat(
        (attScore * 0.3 + tScore * 0.4).toFixed(2)
      ),
    };
  }

  // If totalAssigned === 0, we fall through here
  const completionRate = 0;
  const onTimeRate = 0;

  return {
    attendanceData: {
      present,
      late,
      absent,
      halfDay,
      onLeave,
      totalWorkingDays,
      attendancePercentage,
      score: attScore,
    },
    taskData: {
      totalAssigned,
      completed,
      inProgress,
      overdue,
      cancelled,
      completionRate,
      onTimeRate,
      score: tScore,
      note: taskNote,
    },
    autoScore: parseFloat((attScore * 0.3 + tScore * 0.4).toFixed(2)),
  };
}

// ── POST /api/performance/generate ──────────────────────────────────────────
export const generateMonthlyReviews = async (req, res) => {
  try {
    const { month, year } = req.body;

    // Validate
    if (!month || !year || month < 1 || month > 12 || year < 2024) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid month or year." });
    }

    const now = new Date();
    const currentMonth = now.getMonth() + 1;
    const currentYear = now.getFullYear();
    if (year > currentYear || (year === currentYear && month > currentMonth)) {
      return res
        .status(400)
        .json({ success: false, message: "Cannot generate reviews for a future month." });
    }

    // Check already generated
    const existing = await Performance.countDocuments({
      "period.month": month,
      "period.year": year,
    });
    if (existing > 0) {
      return res.status(400).json({
        success: false,
        message: `Reviews already generated for ${MONTH_NAMES[month]} ${year}. Use regenerate endpoint to refresh scores.`,
      });
    }

    // Get all active employees and managers with profiles
    const profiles = await EmployeeProfile.find({ status: "active" }).populate({
      path: "userId",
      match: { isActive: true, role: { $in: ["employee", "manager"] } },
      select: "_id fullName email role",
    });

    const activeProfiles = profiles.filter((p) => p.userId);

    const performanceRecords = [];
    let skipped = 0;
    const managerEmployeeMap = {}; // managerId -> [{ name, email }]

    for (const profile of activeProfiles) {
      // Find department and its manager
      const department = await Department.findById(profile.departmentId);
      if (!department || !department.manager) {
        console.warn(
          `Skipped ${profile.userId.fullName}: no department or manager`
        );
        skipped++;
        continue;
      }

      const managerId = department.manager;

      // Manager cannot be their own reviewer
      if (managerId.toString() === profile.userId._id.toString()) {
        // Skip — managers need a different reviewer (HR/admin handles manually)
        console.warn(
          `Skipped ${profile.userId.fullName}: is the department manager`
        );
        skipped++;
        continue;
      }

      const { attendanceData, taskData, autoScore } =
        await calculateScoresForEmployee(
          profile.userId._id,
          profile.joiningDate,
          month,
          year
        );

      performanceRecords.push({
        employeeId: profile.userId._id,
        managerId,
        departmentId: profile.departmentId,
        period: { month, year },
        attendanceScore: attendanceData,
        taskScore: taskData,
        autoScore,
        status: "pending",
      });

      // Build manager → employees map for emails
      const mgrId = managerId.toString();
      if (!managerEmployeeMap[mgrId]) {
        managerEmployeeMap[mgrId] = [];
      }
      managerEmployeeMap[mgrId].push({
        name: profile.userId.fullName,
        email: profile.userId.email,
      });
    }

    // Insert all — skip duplicates
    let generated = 0;
    if (performanceRecords.length > 0) {
      try {
        const result = await Performance.insertMany(performanceRecords, {
          ordered: false,
        });
        generated = result.length;
      } catch (err) {
        // BulkWriteError — some may have inserted
        if (err.code === 11000 || err.insertedDocs) {
          generated = err.insertedDocs?.length || 0;
        } else {
          throw err;
        }
      }
    }

    // Send emails to managers (best effort)
    let pendingManagers = 0;
    for (const [mgrId, employees] of Object.entries(managerEmployeeMap)) {
      try {
        const manager = await User.findById(mgrId).select("fullName email");
        if (manager) {
          pendingManagers++;
          sendPerformanceReviewEmail({
            managerName: manager.fullName,
            managerEmail: manager.email,
            pendingCount: employees.length,
            month,
            year,
            employees,
          }).catch((err) =>
            console.error(
              `Failed to send review email to ${manager.email}:`,
              err.message
            )
          );
        }
      } catch {
        // skip email errors
      }
    }

    return res.status(201).json({
      success: true,
      message: `Reviews generated for ${MONTH_NAMES[month]} ${year}`,
      data: {
        total: activeProfiles.length,
        generated,
        skipped,
        pendingManagers,
      },
    });
  } catch (error) {
    console.error("generateMonthlyReviews error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── PATCH /api/performance/regenerate ────────────────────────────────────────
export const regenerateScores = async (req, res) => {
  try {
    const { month, year } = req.body;

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "Month and year are required." });
    }

    const records = await Performance.find({
      "period.month": month,
      "period.year": year,
    });

    if (records.length === 0) {
      return res.status(404).json({
        success: false,
        message: `No reviews found for ${MONTH_NAMES[month]} ${year}.`,
      });
    }

    let updated = 0;

    for (const record of records) {
      const profile = await EmployeeProfile.findOne({
        userId: record.employeeId,
      });

      const { attendanceData, taskData, autoScore } =
        await calculateScoresForEmployee(
          record.employeeId,
          profile?.joiningDate,
          month,
          year
        );

      record.attendanceScore = attendanceData;
      record.taskScore = taskData;
      record.autoScore = autoScore;

      // If already completed, recalculate final score and grade
      if (record.status === "completed" && record.managerRating) {
        const fs = parseFloat(
          (
            attendanceData.score * 0.3 +
            taskData.score * 0.4 +
            record.managerRating * 0.3
          ).toFixed(2)
        );
        record.finalScore = fs;
        record.grade = Performance.calculateGrade(fs);
      }

      await record.save();
      updated++;
    }

    return res.json({
      success: true,
      message: `Scores regenerated for ${MONTH_NAMES[month]} ${year}`,
      data: { updated },
    });
  } catch (error) {
    console.error("regenerateScores error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── GET /api/performance/pending ─────────────────────────────────────────────
export const getPendingReviews = async (req, res) => {
  try {
    const reviews = await Performance.find({
      managerId: req.user._id,
      status: "pending",
    })
      .populate("employeeId", "fullName email")
      .populate("departmentId", "name")
      .sort({ "period.year": -1, "period.month": -1, autoScore: -1 });

    return res.json({ success: true, count: reviews.length, data: reviews });
  } catch (error) {
    console.error("getPendingReviews error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── GET /api/performance/team ────────────────────────────────────────────────
export const getTeamPerformance = async (req, res) => {
  try {
    const { month, year, status } = req.query;

    const filter = { managerId: req.user._id };
    if (month) filter["period.month"] = parseInt(month);
    if (year) filter["period.year"] = parseInt(year);
    if (status) filter.status = status;

    const reviews = await Performance.find(filter)
      .populate("employeeId", "fullName email")
      .populate("departmentId", "name")
      .sort({ "period.year": -1, "period.month": -1, finalScore: -1 });

    const completed = reviews.filter((r) => r.status === "completed");
    const pending = reviews.filter((r) => r.status === "pending");

    const avgFinalScore =
      completed.length > 0
        ? parseFloat(
            (
              completed.reduce((a, c) => a + (c.finalScore || 0), 0) /
              completed.length
            ).toFixed(2)
          )
        : 0;

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    completed.forEach((r) => {
      if (r.grade && gradeDistribution[r.grade] !== undefined) {
        gradeDistribution[r.grade]++;
      }
    });

    return res.json({
      success: true,
      data: reviews,
      summary: {
        total: reviews.length,
        pending: pending.length,
        completed: completed.length,
        avgFinalScore,
        gradeDistribution,
      },
    });
  } catch (error) {
    console.error("getTeamPerformance error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── GET /api/performance/:id ─────────────────────────────────────────────────
export const getPerformanceById = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id)
      .populate("employeeId", "fullName email")
      .populate("managerId", "fullName")
      .populate("departmentId", "name");

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found." });
    }

    // Authorization
    const role = req.user.role;
    const userId = req.user._id.toString();

    if (role === "employee" && review.employeeId._id.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }
    if (role === "manager" && review.managerId._id.toString() !== userId) {
      return res
        .status(403)
        .json({ success: false, message: "Access denied." });
    }
    // admin/hr → all access

    return res.json({ success: true, data: review });
  } catch (error) {
    console.error("getPerformanceById error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── PATCH /api/performance/:id/review ────────────────────────────────────────
export const submitReview = async (req, res) => {
  try {
    const review = await Performance.findById(req.params.id);

    if (!review) {
      return res
        .status(404)
        .json({ success: false, message: "Review not found." });
    }

    // Must be the assigned manager
    if (review.managerId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You are not the reviewer for this employee.",
      });
    }

    // Cannot review own
    if (review.employeeId.toString() === req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Cannot review your own performance.",
      });
    }

    if (review.status === "completed") {
      return res
        .status(400)
        .json({ success: false, message: "Review already submitted." });
    }

    const {
      managerRating,
      strengths,
      areasOfImprovement,
      goals,
      additionalComments,
    } = req.body;

    // Validate
    const rating = Math.round(Number(managerRating));
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        message: "Manager rating must be between 1 and 5.",
      });
    }

    if (!strengths || strengths.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Strengths must be at least 10 characters.",
      });
    }
    if (!areasOfImprovement || areasOfImprovement.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Areas of improvement must be at least 10 characters.",
      });
    }
    if (!goals || goals.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Goals must be at least 10 characters.",
      });
    }

    // Calculate final score
    const finalScore = parseFloat(
      (
        review.attendanceScore.score * 0.3 +
        review.taskScore.score * 0.4 +
        rating * 0.3
      ).toFixed(2)
    );
    const grade = Performance.calculateGrade(finalScore);

    review.managerRating = rating;
    review.strengths = strengths.trim();
    review.areasOfImprovement = areasOfImprovement.trim();
    review.goals = goals.trim();
    review.additionalComments = additionalComments
      ? additionalComments.trim()
      : "";
    review.finalScore = finalScore;
    review.grade = grade;
    review.status = "completed";
    review.reviewedAt = new Date();

    await review.save();

    // Populate for response + email
    await review.populate("employeeId", "fullName email");
    await review.populate("managerId", "fullName");

    // Send result email (fire-and-forget)
    sendPerformanceResultEmail({
      employeeName: review.employeeId.fullName,
      employeeEmail: review.employeeId.email,
      month: review.period.month,
      year: review.period.year,
      grade,
      finalScore,
      managerName: review.managerId.fullName,
    }).catch((err) =>
      console.error("Performance result email failed:", err.message)
    );

    return res.json({
      success: true,
      message: "Review submitted successfully.",
      data: review,
    });
  } catch (error) {
    console.error("submitReview error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── GET /api/performance/my ──────────────────────────────────────────────────
export const getMyPerformance = async (req, res) => {
  try {
    const filter = { employeeId: req.user._id };
    if (req.query.year) filter["period.year"] = parseInt(req.query.year);

    const reviews = await Performance.find(filter)
      .populate("managerId", "fullName")
      .populate("departmentId", "name")
      .sort({ "period.year": -1, "period.month": -1 });

    const completed = reviews.filter((r) => r.status === "completed");

    const avgFinalScore =
      completed.length > 0
        ? parseFloat(
            (
              completed.reduce((a, c) => a + (c.finalScore || 0), 0) /
              completed.length
            ).toFixed(2)
          )
        : 0;

    const grades = completed
      .map((r) => r.grade)
      .filter(Boolean);
    const gradeOrder = { A: 5, B: 4, C: 3, D: 2, F: 1 };
    const bestGrade =
      grades.length > 0
        ? grades.reduce((best, g) =>
            gradeOrder[g] > gradeOrder[best] ? g : best
          )
        : null;

    return res.json({
      success: true,
      data: reviews,
      summary: {
        totalReviews: reviews.length,
        completedReviews: completed.length,
        avgFinalScore,
        bestGrade,
        latestGrade: completed[0]?.grade || null,
      },
    });
  } catch (error) {
    console.error("getMyPerformance error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── GET /api/performance ─────────────────────────────────────────────────────
export const getAllPerformance = async (req, res) => {
  try {
    const {
      month,
      year,
      departmentId,
      status,
      grade,
      page = 1,
      limit = 15,
    } = req.query;

    const filter = {};
    if (month) filter["period.month"] = parseInt(month);
    if (year) filter["period.year"] = parseInt(year);
    if (departmentId) filter.departmentId = departmentId;
    if (status) filter.status = status;
    if (grade) filter.grade = grade;

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Performance.countDocuments(filter);

    const reviews = await Performance.find(filter)
      .populate("employeeId", "fullName email")
      .populate("managerId", "fullName")
      .populate("departmentId", "name")
      .sort({ "period.year": -1, "period.month": -1 })
      .skip(skip)
      .limit(parseInt(limit));

    // Summary
    const allForSummary = await Performance.find(filter);
    const completedAll = allForSummary.filter((r) => r.status === "completed");
    const pendingAll = allForSummary.filter((r) => r.status === "pending");

    const avgScore =
      completedAll.length > 0
        ? parseFloat(
            (
              completedAll.reduce((a, c) => a + (c.finalScore || 0), 0) /
              completedAll.length
            ).toFixed(2)
          )
        : 0;

    const gradeDistribution = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    completedAll.forEach((r) => {
      if (r.grade) gradeDistribution[r.grade]++;
    });

    // Department-wise
    const deptMap = {};
    for (const r of allForSummary) {
      const dId = r.departmentId.toString();
      if (!deptMap[dId]) {
        deptMap[dId] = { scores: [], pending: 0, completed: 0 };
      }
      if (r.status === "completed" && r.finalScore) {
        deptMap[dId].scores.push(r.finalScore);
        deptMap[dId].completed++;
      }
      if (r.status === "pending") deptMap[dId].pending++;
    }

    // Populate dept names
    const deptIds = Object.keys(deptMap);
    const departments = await Department.find({
      _id: { $in: deptIds },
    }).select("name");
    const deptNameMap = {};
    departments.forEach((d) => {
      deptNameMap[d._id.toString()] = d.name;
    });

    const departmentWise = deptIds.map((dId) => ({
      department: deptNameMap[dId] || "Unknown",
      departmentId: dId,
      avgScore:
        deptMap[dId].scores.length > 0
          ? parseFloat(
              (
                deptMap[dId].scores.reduce((a, b) => a + b, 0) /
                deptMap[dId].scores.length
              ).toFixed(2)
            )
          : 0,
      pending: deptMap[dId].pending,
      completed: deptMap[dId].completed,
    }));

    return res.json({
      success: true,
      data: reviews,
      total,
      page: parseInt(page),
      totalPages: Math.ceil(total / parseInt(limit)),
      summary: {
        avgScore,
        gradeDistribution,
        pendingCount: pendingAll.length,
        completedCount: completedAll.length,
        departmentWise,
      },
    });
  } catch (error) {
    console.error("getAllPerformance error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

// ── GET /api/performance/summary ─────────────────────────────────────────────
export const getPerformanceSummary = async (req, res) => {
  try {
    const { month, year } = req.query;

    if (!month || !year) {
      return res
        .status(400)
        .json({ success: false, message: "Month and year are required." });
    }

    const m = parseInt(month);
    const y = parseInt(year);

    // Department-wise aggregation
    const deptAgg = await Performance.aggregate([
      { $match: { "period.month": m, "period.year": y } },
      {
        $group: {
          _id: "$departmentId",
          totalEmployees: { $sum: 1 },
          pendingCount: {
            $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] },
          },
          completedCount: {
            $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] },
          },
          avgScore: {
            $avg: {
              $cond: [
                { $eq: ["$status", "completed"] },
                "$finalScore",
                null,
              ],
            },
          },
          grades: {
            $push: {
              $cond: [{ $eq: ["$status", "completed"] }, "$grade", null],
            },
          },
        },
      },
    ]);

    // Populate department names
    const departmentBreakdown = [];
    for (const dept of deptAgg) {
      const deptDoc = await Department.findById(dept._id).select("name");
      const gradeDist = { A: 0, B: 0, C: 0, D: 0, F: 0 };
      dept.grades.forEach((g) => {
        if (g && gradeDist[g] !== undefined) gradeDist[g]++;
      });

      departmentBreakdown.push({
        department: deptDoc?.name || "Unknown",
        departmentId: dept._id,
        totalEmployees: dept.totalEmployees,
        avgScore: dept.avgScore ? parseFloat(dept.avgScore.toFixed(2)) : 0,
        gradeDistribution: gradeDist,
        pendingCount: dept.pendingCount,
        completedCount: dept.completedCount,
      });
    }

    // Top 5 performers
    const topPerformers = await Performance.find({
      "period.month": m,
      "period.year": y,
      status: "completed",
    })
      .sort({ finalScore: -1 })
      .limit(5)
      .populate("employeeId", "fullName email")
      .populate("departmentId", "name");

    // Bottom 5
    const bottomPerformers = await Performance.find({
      "period.month": m,
      "period.year": y,
      status: "completed",
    })
      .sort({ finalScore: 1 })
      .limit(5)
      .populate("employeeId", "fullName email")
      .populate("departmentId", "name");

    // Company overall
    const overallAgg = await Performance.aggregate([
      {
        $match: {
          "period.month": m,
          "period.year": y,
          status: "completed",
        },
      },
      {
        $group: {
          _id: null,
          avgScore: { $avg: "$finalScore" },
          grades: { $push: "$grade" },
          count: { $sum: 1 },
        },
      },
    ]);

    const overallGrades = { A: 0, B: 0, C: 0, D: 0, F: 0 };
    if (overallAgg[0]) {
      overallAgg[0].grades.forEach((g) => {
        if (g) overallGrades[g]++;
      });
    }

    const totalReviews = await Performance.countDocuments({
      "period.month": m,
      "period.year": y,
    });
    const pendingCount = await Performance.countDocuments({
      "period.month": m,
      "period.year": y,
      status: "pending",
    });

    return res.json({
      success: true,
      data: {
        departmentBreakdown,
        topPerformers,
        bottomPerformers,
        overall: {
          totalReviews,
          pendingCount,
          completedCount: totalReviews - pendingCount,
          avgScore: overallAgg[0]
            ? parseFloat(overallAgg[0].avgScore.toFixed(2))
            : 0,
          gradeDistribution: overallGrades,
        },
      },
    });
  } catch (error) {
    console.error("getPerformanceSummary error:", error);
    return res
      .status(500)
      .json({ success: false, message: "Server error." });
  }
};

/**
 * GET /api/performance/trend
 * Returns last 6 months of performance data: avgScore, completed, pending per month.
 */
export const getPerformanceTrend = async (req, res) => {
  try {
    const now = new Date();
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

    // Build last 6 months list
    const months = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      months.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: monthNames[d.getMonth()] });
    }

    const trend = [];
    for (const m of months) {
      const agg = await Performance.aggregate([
        { $match: { "period.month": m.month, "period.year": m.year } },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
            pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
            avgScore: { $avg: { $cond: [{ $eq: ["$status", "completed"] }, "$finalScore", null] } },
          },
        },
      ]);

      const data = agg[0] || { total: 0, completed: 0, pending: 0, avgScore: 0 };
      trend.push({
        month: m.label,
        avgScore: data.avgScore ? parseFloat(data.avgScore.toFixed(2)) : 0,
        completed: data.completed,
        pending: data.pending,
        total: data.total,
      });
    }

    return res.json({ success: true, data: trend });
  } catch (error) {
    console.error("getPerformanceTrend error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
