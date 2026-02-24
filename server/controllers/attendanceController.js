import mongoose from "mongoose";
import Attendance from "../models/Attendance.js";
import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const IST_OFFSET = 5.5 * 60 * 60 * 1000; // milliseconds

const getStartOfDayUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const getEndOfDayUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setUTCHours(23, 59, 59, 999);
  return date;
};

const getMonthRange = (month, year) => {
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));
  return { start, end };
};

/** Count working days in a month (all days except Sundays) */
const getWorkingDaysInMonth = (month, year) => {
  const daysInMonth = new Date(year, month, 0).getDate();
  let count = 0;
  for (let d = 1; d <= daysInMonth; d++) {
    const day = new Date(year, month - 1, d).getDay();
    if (day !== 0) count++; // 0 = Sunday
  }
  return count;
};

const buildSummary = (records, month, year) => {
  const totalPresent = records.filter((r) => r.status === "present").length;
  const totalLate = records.filter((r) => r.status === "late").length;
  const totalHalfDay = records.filter((r) => r.status === "half-day").length;
  const totalAbsent = records.filter((r) => r.status === "absent").length;
  const totalOnLeave = records.filter((r) => r.status === "on-leave").length;
  const totalWorkHours = records.reduce((s, r) => s + (r.workHours || 0), 0);
  const workingDaysInMonth = getWorkingDaysInMonth(month, year);
  const attended = totalPresent + totalLate + totalHalfDay;
  const attendancePercentage =
    workingDaysInMonth > 0
      ? Math.round((attended / workingDaysInMonth) * 100 * 100) / 100
      : 0;

  return {
    totalPresent,
    totalLate,
    totalHalfDay,
    totalAbsent,
    totalOnLeave,
    totalWorkHours: Math.round(totalWorkHours * 100) / 100,
    attendancePercentage,
    workingDaysInMonth,
  };
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CHECK IN
// ─────────────────────────────────────────────────────────────────────────────
export const checkIn = async (req, res) => {
  try {
    const now = new Date();
    const today = getStartOfDayUTC(now);

    // Check for existing record
    const existing = await Attendance.findOne({
      employeeId: req.user._id,
      date: today,
    });

    if (existing && existing.checkIn) {
      return res.status(400).json({
        success: false,
        message: "Already checked in today",
      });
    }

    // Determine status by IST time
    const istTime = new Date(now.getTime() + IST_OFFSET);
    const istHour = istTime.getUTCHours();
    const istMinute = istTime.getUTCMinutes();
    const status = istHour > 9 || (istHour === 9 && istMinute > 30) ? "late" : "present";

    // Weekend note
    const dayOfWeek = now.getUTCDay();
    const note = dayOfWeek === 0 || dayOfWeek === 6 ? "Weekend attendance" : "";

    let record;
    if (existing) {
      // Record exists (e.g. marked absent by system) — update it
      existing.checkIn = now;
      existing.status = status;
      existing.note = note || existing.note;
      existing.isManual = false;
      record = await existing.save();
    } else {
      record = await Attendance.create({
        employeeId: req.user._id,
        date: today,
        checkIn: now,
        status,
        isManual: false,
        note,
      });
    }

    return res.status(201).json({
      success: true,
      message: `Checked in successfully — ${status}`,
      data: { checkIn: record.checkIn, status: record.status },
    });
  } catch (error) {
    console.error("checkIn error:", error);
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "Already checked in today" });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. CHECK OUT
// ─────────────────────────────────────────────────────────────────────────────
export const checkOut = async (req, res) => {
  try {
    const now = new Date();
    const today = getStartOfDayUTC(now);

    const record = await Attendance.findOne({
      employeeId: req.user._id,
      date: today,
    });

    if (!record || !record.checkIn) {
      return res.status(400).json({
        success: false,
        message: "You haven't checked in today",
      });
    }

    if (record.checkOut) {
      return res.status(400).json({
        success: false,
        message: "Already checked out today",
      });
    }

    // Calculate work hours
    const diffMs = now.getTime() - record.checkIn.getTime();
    const workHours = Math.max(0, Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100);

    // Update status based on work hours
    let { status } = record;
    if (workHours < 4 && (status === "present" || status === "late")) {
      status = "half-day";
    }

    record.checkOut = now;
    record.workHours = workHours;
    record.status = status;
    await record.save();

    return res.json({
      success: true,
      message: "Checked out successfully",
      data: {
        checkIn: record.checkIn,
        checkOut: record.checkOut,
        workHours: record.workHours,
        status: record.status,
      },
    });
  } catch (error) {
    console.error("checkOut error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET TODAY STATUS
// ─────────────────────────────────────────────────────────────────────────────
export const getTodayStatus = async (req, res) => {
  try {
    const today = getStartOfDayUTC(new Date());
    const record = await Attendance.findOne({
      employeeId: req.user._id,
      date: today,
    }).lean();

    return res.json({ success: true, data: record || null });
  } catch (error) {
    console.error("getTodayStatus error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET MY ATTENDANCE
// ─────────────────────────────────────────────────────────────────────────────
export const getMyAttendance = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    const { start, end } = getMonthRange(month, year);

    const records = await Attendance.find({
      employeeId: req.user._id,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();

    const summary = buildSummary(records, month, year);

    return res.json({ success: true, data: { records, summary } });
  } catch (error) {
    console.error("getMyAttendance error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET TEAM ATTENDANCE (manager)
// ─────────────────────────────────────────────────────────────────────────────
export const getTeamAttendance = async (req, res) => {
  try {
    // Find the department managed by this user
    const department = await Department.findOne({ manager: req.user._id });
    if (!department) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned as manager of any department",
      });
    }

    // Get active employees in this department
    const profiles = await EmployeeProfile.find({
      departmentId: department._id,
      status: "active",
    }).lean();

    const employeeUserIds = profiles.map((p) => p.userId);

    // Build query
    const query = { employeeId: { $in: employeeUserIds } };

    const now = new Date();
    if (req.query.date) {
      const d = new Date(req.query.date);
      query.date = { $gte: getStartOfDayUTC(d), $lte: getEndOfDayUTC(d) };
    } else {
      const month = parseInt(req.query.month) || now.getMonth() + 1;
      const year = parseInt(req.query.year) || now.getFullYear();
      const { start, end } = getMonthRange(month, year);
      query.date = { $gte: start, $lte: end };
    }

    if (req.query.status) {
      query.status = req.query.status;
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("employeeId", "fullName email")
        .sort({ date: -1, employeeId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    // Build summary from all matching records (not paginated)
    const allRecords = await Attendance.find(query).lean();
    const presentCount = allRecords.filter((r) => r.status === "present").length;
    const absentCount = allRecords.filter((r) => r.status === "absent").length;
    const lateCount = allRecords.filter((r) => r.status === "late").length;
    const halfDayCount = allRecords.filter((r) => r.status === "half-day").length;
    const totalHours = allRecords.reduce((s, r) => s + (r.workHours || 0), 0);

    return res.json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: records,
      department: { name: department.name, code: department.code },
      summary: {
        total: employeeUserIds.length,
        presentCount,
        absentCount,
        lateCount,
        halfDayCount,
        avgHours:
          allRecords.length > 0
            ? Math.round((totalHours / allRecords.length) * 100) / 100
            : 0,
      },
    });
  } catch (error) {
    console.error("getTeamAttendance error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET ALL ATTENDANCE (admin, hr)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllAttendance = async (req, res) => {
  try {
    const now = new Date();
    const {
      date,
      departmentId,
      status,
      employeeId,
      role,
      page: pageStr,
      limit: limitStr,
    } = req.query;

    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();

    const query = {};

    // Date filtering
    if (date) {
      const d = new Date(date);
      query.date = { $gte: getStartOfDayUTC(d), $lte: getEndOfDayUTC(d) };
    } else {
      const { start, end } = getMonthRange(month, year);
      query.date = { $gte: start, $lte: end };
    }

    if (status) query.status = status;
    if (employeeId && mongoose.Types.ObjectId.isValid(employeeId)) {
      query.employeeId = new mongoose.Types.ObjectId(employeeId);
    }

    // If departmentId filter → get employees in that department
    if (departmentId && mongoose.Types.ObjectId.isValid(departmentId)) {
      const profiles = await EmployeeProfile.find({
        departmentId: new mongoose.Types.ObjectId(departmentId),
      }).lean();
      const userIds = profiles.map((p) => p.userId);
      query.employeeId = { ...(query.employeeId || {}), $in: userIds };
    }

    // ── Role counts (computed from base query BEFORE role filter) ──
    const roleCountsPipeline = [
      { $match: { ...query } },
      {
        $lookup: {
          from: "users",
          localField: "employeeId",
          foreignField: "_id",
          as: "userInfo",
        },
      },
      { $unwind: "$userInfo" },
      { $group: { _id: "$userInfo.role", count: { $sum: 1 } } },
    ];
    const roleCountsRaw = await Attendance.aggregate(roleCountsPipeline);
    const roleCounts = {};
    roleCountsRaw.forEach((rc) => {
      roleCounts[rc._id] = rc.count;
    });

    // ── Role filter — restrict results by user role ──
    if (role && ["employee", "manager"].includes(role)) {
      const usersWithRole = await User.find({ role }).select("_id").lean();
      const roleUserIds = usersWithRole.map((u) => u._id);

      if (query.employeeId && query.employeeId.$in) {
        // Intersect with existing $in (e.g., from department filter)
        query.employeeId.$in = query.employeeId.$in.filter((id) =>
          roleUserIds.some((rid) => rid.toString() === id.toString())
        );
      } else if (!query.employeeId) {
        query.employeeId = { $in: roleUserIds };
      }
      // If query.employeeId is a single ObjectId, leave as-is
    }

    const page = Math.max(1, parseInt(pageStr) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(limitStr) || 20));
    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      Attendance.find(query)
        .populate("employeeId", "fullName email role")
        .populate("markedBy", "fullName")
        .sort({ date: -1, employeeId: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Attendance.countDocuments(query),
    ]);

    return res.json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      data: records,
      roleCounts,
    });
  } catch (error) {
    console.error("getAllAttendance error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. GET ATTENDANCE BY EMPLOYEE
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceByEmployee = async (req, res) => {
  try {
    const { employeeId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: "Invalid employee ID" });
    }

    const employee = await User.findById(employeeId).select("fullName email role").lean();
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }

    if (!["employee", "manager"].includes(employee.role)) {
      return res.status(400).json({
        success: false,
        message: "Can only view attendance for employees or managers",
      });
    }

    // Manager department check
    if (req.user.role === "manager") {
      const mgrDept = await Department.findOne({ manager: req.user._id });
      const empProfile = await EmployeeProfile.findOne({ userId: employeeId });

      if (
        !mgrDept ||
        !empProfile ||
        mgrDept._id.toString() !== empProfile.departmentId.toString()
      ) {
        return res.status(403).json({
          success: false,
          message: "Access denied: Employee not in your department",
        });
      }
    }

    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    const { start, end } = getMonthRange(month, year);

    const records = await Attendance.find({
      employeeId,
      date: { $gte: start, $lte: end },
    })
      .sort({ date: -1 })
      .lean();

    const summary = buildSummary(records, month, year);

    return res.json({
      success: true,
      data: {
        employee: { fullName: employee.fullName, email: employee.email },
        records,
        summary,
      },
    });
  } catch (error) {
    console.error("getAttendanceByEmployee error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. MARK ATTENDANCE MANUALLY (admin, hr)
// ─────────────────────────────────────────────────────────────────────────────
export const markAttendanceManual = async (req, res) => {
  try {
    const { employeeId, date, status, checkIn, checkOut, note } = req.body;

    // Validate employeeId
    if (!employeeId || !mongoose.Types.ObjectId.isValid(employeeId)) {
      return res.status(400).json({ success: false, message: "Valid employee ID is required" });
    }

    // Validate employee exists and is active
    const employee = await User.findById(employeeId).lean();
    if (!employee) {
      return res.status(404).json({ success: false, message: "Employee not found" });
    }
    if (!employee.isActive) {
      return res.status(400).json({ success: false, message: "Employee is not active" });
    }
    if (["admin", "hr"].includes(employee.role)) {
      return res.status(403).json({
        success: false,
        message: "Cannot mark attendance for admin or HR users",
      });
    }

    // Validate status
    const validStatuses = ["present", "absent", "late", "half-day", "on-leave"];
    if (!status || !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid status value" });
    }

    // Validate date
    if (!date) {
      return res.status(400).json({ success: false, message: "Date is required" });
    }

    const recordDate = getStartOfDayUTC(new Date(date));
    const todayStart = getStartOfDayUTC(new Date());

    if (recordDate > todayStart) {
      return res.status(400).json({
        success: false,
        message: "Cannot mark attendance for future dates",
      });
    }

    // Build update data
    const updateData = {
      status,
      isManual: true,
      markedBy: req.user._id,
      note: note || "",
    };

    if (status === "absent" || status === "on-leave") {
      updateData.checkIn = null;
      updateData.checkOut = null;
      updateData.workHours = 0;
    } else {
      if (checkIn) updateData.checkIn = new Date(checkIn);
      if (checkOut) updateData.checkOut = new Date(checkOut);

      // Calculate work hours if both times provided
      if (checkIn && checkOut) {
        const ciDate = new Date(checkIn);
        const coDate = new Date(checkOut);
        if (coDate > ciDate) {
          const diffMs = coDate.getTime() - ciDate.getTime();
          updateData.workHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;
        } else {
          updateData.workHours = 0;
        }
      }
    }

    // Upsert: update if exists, else create
    const record = await Attendance.findOneAndUpdate(
      { employeeId, date: recordDate },
      { $set: updateData, $setOnInsert: { employeeId, date: recordDate } },
      { upsert: true, returnDocument: 'after', runValidators: true }
    ).populate("employeeId", "fullName email");

    return res.json({
      success: true,
      message: `Attendance marked as ${status}`,
      data: record,
    });
  } catch (error) {
    console.error("markAttendanceManual error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET ATTENDANCE SUMMARY (admin, hr)
// ─────────────────────────────────────────────────────────────────────────────
export const getAttendanceSummary = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1;
    const year = parseInt(req.query.year) || now.getFullYear();
    const { start, end } = getMonthRange(month, year);

    // Department-wise aggregation
    const departmentWise = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },

      // Lookup EmployeeProfile for departmentId
      {
        $lookup: {
          from: "employeeprofiles",
          localField: "employeeId",
          foreignField: "userId",
          as: "profile",
        },
      },
      { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },

      // Lookup Department name
      {
        $lookup: {
          from: "departments",
          localField: "profile.departmentId",
          foreignField: "_id",
          as: "department",
        },
      },
      { $unwind: { path: "$department", preserveNullAndEmptyArrays: true } },

      // Group by department
      {
        $group: {
          _id: "$department._id",
          departmentName: { $first: "$department.name" },
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          halfDayCount: {
            $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] },
          },
          onLeaveCount: {
            $sum: { $cond: [{ $eq: ["$status", "on-leave"] }, 1, 0] },
          },
          totalWorkHours: { $sum: "$workHours" },
          uniqueEmployees: { $addToSet: "$employeeId" },
        },
      },

      // Add computed fields
      {
        $addFields: {
          totalEmployees: { $size: "$uniqueEmployees" },
          attendancePercentage: {
            $cond: [
              { $eq: ["$totalRecords", 0] },
              0,
              {
                $round: [
                  {
                    $multiply: [
                      {
                        $divide: [
                          {
                            $add: ["$presentCount", "$lateCount", "$halfDayCount"],
                          },
                          "$totalRecords",
                        ],
                      },
                      100,
                    ],
                  },
                  2,
                ],
              },
            ],
          },
        },
      },

      { $project: { uniqueEmployees: 0 } },
      { $sort: { departmentName: 1 } },
    ]);

    // Overall totals
    const overall = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: null,
          totalRecords: { $sum: 1 },
          presentCount: {
            $sum: { $cond: [{ $eq: ["$status", "present"] }, 1, 0] },
          },
          absentCount: {
            $sum: { $cond: [{ $eq: ["$status", "absent"] }, 1, 0] },
          },
          lateCount: {
            $sum: { $cond: [{ $eq: ["$status", "late"] }, 1, 0] },
          },
          halfDayCount: {
            $sum: { $cond: [{ $eq: ["$status", "half-day"] }, 1, 0] },
          },
          onLeaveCount: {
            $sum: { $cond: [{ $eq: ["$status", "on-leave"] }, 1, 0] },
          },
          totalWorkHours: { $sum: "$workHours" },
        },
      },
    ]);

    // Top 5 attendees (most work hours this month)
    const topAttendees = await Attendance.aggregate([
      { $match: { date: { $gte: start, $lte: end } } },
      {
        $group: {
          _id: "$employeeId",
          totalWorkHours: { $sum: "$workHours" },
          daysPresent: {
            $sum: {
              $cond: [
                { $in: ["$status", ["present", "late", "half-day"]] },
                1,
                0,
              ],
            },
          },
        },
      },
      { $sort: { totalWorkHours: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "user",
        },
      },
      { $unwind: "$user" },
      {
        $project: {
          _id: 0,
          employeeId: "$_id",
          fullName: "$user.fullName",
          email: "$user.email",
          totalWorkHours: { $round: ["$totalWorkHours", 2] },
          daysPresent: 1,
        },
      },
    ]);

    return res.json({
      success: true,
      data: {
        departmentWise,
        overall: overall[0] || {
          totalRecords: 0,
          presentCount: 0,
          absentCount: 0,
          lateCount: 0,
          halfDayCount: 0,
          onLeaveCount: 0,
          totalWorkHours: 0,
        },
        topAttendees,
      },
    });
  } catch (error) {
    console.error("getAttendanceSummary error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
