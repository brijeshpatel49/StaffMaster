import Holiday from "../models/Holiday.js";
import Leave from "../models/Leave.js";
import Task from "../models/Task.js";
import Announcement from "../models/Announcement.js";
import Attendance from "../models/Attendance.js";
import Department from "../models/Department.js";
import EmployeeProfile from "../models/EmployeeProfile.js";

// ── helpers ──────────────────────────────────────────────────────────────────
const toUTCMidnight = (d) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

// ─────────────────────────────────────────────────────────────────────────────
// GET CALENDAR DATA
// ─────────────────────────────────────────────────────────────────────────────
export const getCalendarData = async (req, res) => {
  try {
    const now = new Date();
    const month = parseInt(req.query.month) || now.getMonth() + 1; // 1-indexed
    const year = parseInt(req.query.year) || now.getFullYear();

    const startOfMonth = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0));
    const endOfMonth = new Date(Date.UTC(year, month, 0, 23, 59, 59, 999));

    const role = req.user.role;
    const userId = req.user._id;

    // Build all parallel fetches
    const fetches = {};

    // 1. Holidays
    fetches.holidays = Holiday.find({
      date: { $gte: startOfMonth, $lte: endOfMonth },
      isActive: true,
    })
      .sort({ date: 1 })
      .lean()
      .catch(() => []);

    // 2. My leaves
    fetches.myLeaves = Leave.find({
      employeeId: userId,
      status: { $in: ["approved", "pending"] },
      fromDate: { $lte: endOfMonth },
      toDate: { $gte: startOfMonth },
    })
      .sort({ fromDate: 1 })
      .lean()
      .catch(() => []);

    // 3. Tasks
    if (role === "admin" || role === "hr") {
      fetches.myTasks = Task.find({
        deadline: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $nin: ["completed", "cancelled"] },
      })
        .populate("assignedTo", "fullName")
        .populate("assignedBy", "fullName")
        .sort({ deadline: 1 })
        .limit(100)
        .lean()
        .catch(() => []);
    } else if (role === "manager") {
      fetches.myTasks = Task.find({
        $or: [{ assignedTo: userId }, { assignedBy: userId }],
        deadline: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $nin: ["completed", "cancelled"] },
      })
        .populate("assignedTo", "fullName")
        .populate("assignedBy", "fullName")
        .sort({ deadline: 1 })
        .lean()
        .catch(() => []);
    } else {
      fetches.myTasks = Task.find({
        assignedTo: userId,
        deadline: { $gte: startOfMonth, $lte: endOfMonth },
        status: { $nin: ["completed", "cancelled"] },
      })
        .populate("assignedBy", "fullName")
        .sort({ deadline: 1 })
        .lean()
        .catch(() => []);
    }

    // 4. Announcements
    fetches.announcements = Announcement.find({
      isActive: true,
      expiresAt: { $gte: startOfMonth },
      $or: [
        { targetRoles: { $in: [role] } },
        { targetRoles: { $in: ["all"] } },
      ],
    })
      .populate("postedBy", "fullName")
      .sort({ pinned: -1, createdAt: -1 })
      .lean()
      .catch(() => []);

    // 5. Team leaves (manager only)
    if (role === "manager") {
      fetches.teamLeaves = (async () => {
        try {
          const dept = await Department.findOne({ manager: userId }).lean();
          if (!dept) return [];
          const profiles = await EmployeeProfile.find({
            departmentId: dept._id,
            status: "active",
          })
            .select("userId")
            .lean();
          const teamIds = profiles.map((p) => p.userId);
          return Leave.find({
            employeeId: { $in: teamIds },
            status: "approved",
            fromDate: { $lte: endOfMonth },
            toDate: { $gte: startOfMonth },
          })
            .populate("employeeId", "fullName")
            .sort({ fromDate: 1 })
            .lean();
        } catch {
          return [];
        }
      })();
    } else {
      fetches.teamLeaves = Promise.resolve([]);
    }

    // 6. My attendance (employee/manager)
    if (role === "employee" || role === "manager") {
      fetches.myAttendance = Attendance.find({
        employeeId: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth },
      })
        .sort({ date: 1 })
        .lean()
        .catch(() => []);
    } else {
      fetches.myAttendance = Promise.resolve([]);
    }

    // Execute all in parallel
    const keys = Object.keys(fetches);
    const values = await Promise.all(Object.values(fetches));
    const result = {};
    keys.forEach((k, i) => (result[k] = values[i]));

    return res.json({
      success: true,
      data: {
        month,
        year,
        holidays: result.holidays,
        myLeaves: result.myLeaves,
        myTasks: result.myTasks,
        announcements: result.announcements,
        teamLeaves: result.teamLeaves,
        myAttendance: result.myAttendance,
      },
    });
  } catch (error) {
    console.error("getCalendarData error:", error);
    return res.status(500).json({ success: false, message: "Server error fetching calendar data" });
  }
};
