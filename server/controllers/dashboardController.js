import User from "../models/User.js";
import Department from "../models/Department.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Attendance from "../models/Attendance.js";
import Leave from "../models/Leave.js";

export const getDashboardStats = async (req, res) => {
  try {
    // Get total employees (role: employee)
    const totalEmployees = await User.countDocuments({ role: "employee" });

    // Get total departments
    const totalDepartments = await Department.countDocuments();

    // Get total managers (role: manager)
    const totalManagers = await User.countDocuments({ role: "manager" });

    // Get total HR (role: hr)
    const totalHR = await User.countDocuments({ role: "hr" });

    // Get active users
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get inactive users
    const inactiveUsers = await User.countDocuments({ isActive: false });

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        totalManagers,
        totalHR,
        activeUsers,
        inactiveUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};

/* ── Admin Analytics — charts data ── */
export const getAdminAnalytics = async (req, res) => {
  try {
    // 1) Department-wise employee count
    const deptEmployees = await EmployeeProfile.aggregate([
      { $match: { status: "active" } },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "dept",
        },
      },
      { $unwind: "$dept" },
      { $project: { _id: 0, department: "$dept.name", count: 1 } },
      { $sort: { count: -1 } },
    ]);

    // 2) Monthly attendance trend — last 6 months
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const attendanceTrend = await Attendance.aggregate([
      { $match: { date: { $gte: sixMonthsAgo } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            status: "$status",
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ]);

    // Reshape into [ { month: "Jan", present: 40, late: 5, absent: 2, ... } ]
    const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const monthMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
      monthMap[key] = {
        month: monthNames[d.getMonth()],
        present: 0,
        late: 0,
        absent: 0,
        "half-day": 0,
        "on-leave": 0,
      };
    }
    attendanceTrend.forEach((r) => {
      const key = `${r._id.year}-${r._id.month}`;
      if (monthMap[key]) monthMap[key][r._id.status] = r.count;
    });
    const attendanceData = Object.values(monthMap);

    // 3) Leave statistics by type
    const leaveByType = await Leave.aggregate([
      {
        $group: {
          _id: "$leaveType",
          total: { $sum: 1 },
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, 1, 0] } },
        },
      },
      { $project: { _id: 0, type: "$_id", total: 1, approved: 1, pending: 1, rejected: 1 } },
      { $sort: { total: -1 } },
    ]);

    // 4) Leave statistics by status — for pie chart
    const leaveByStatus = await Leave.aggregate([
      { $group: { _id: "$status", count: { $sum: 1 } } },
      { $project: { _id: 0, status: "$_id", count: 1 } },
    ]);

    res.json({
      success: true,
      data: {
        departmentEmployees: deptEmployees,
        attendanceTrend: attendanceData,
        leaveByType,
        leaveByStatus,
      },
    });
  } catch (error) {
    console.error("Error fetching admin analytics:", error);
    res.status(500).json({ success: false, message: "Failed to fetch analytics" });
  }
};

/* ── Attendance Overview with period filter ── */
export const getAttendanceOverview = async (req, res) => {
  try {
    const { period = "today" } = req.query;
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case "yesterday": {
        const y = new Date(now);
        y.setDate(y.getDate() - 1);
        startDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 0, 0, 0, 0);
        endDate = new Date(y.getFullYear(), y.getMonth(), y.getDate(), 23, 59, 59, 999);
        break;
      }
      case "this_week": {
        const day = now.getDay(); // 0=Sun
        const mon = new Date(now);
        mon.setDate(now.getDate() - (day === 0 ? 6 : day - 1));
        startDate = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      case "this_month": {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
        break;
      }
      default: { // today
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
        endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      }
    }

    const totalStaff = await User.countDocuments({ role: { $in: ["employee", "manager", "hr"] } });

    // For multi-day periods we average per day, for single day just count
    const isSingleDay = period === "today" || period === "yesterday";

    const attendanceAgg = await Attendance.aggregate([
      { $match: { date: { $gte: startDate, $lte: endDate } } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]);

    const result = { present: 0, late: 0, absent: 0, "half-day": 0, "on-leave": 0, total: totalStaff };
    attendanceAgg.forEach((r) => { result[r._id] = r.count; });

    if (!isSingleDay) {
      // Count distinct days in range to get average
      const daysAgg = await Attendance.aggregate([
        { $match: { date: { $gte: startDate, $lte: endDate } } },
        { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$date" } } } },
        { $count: "days" },
      ]);
      const days = daysAgg[0]?.days || 1;
      result.present = Math.round(result.present / days);
      result.late = Math.round(result.late / days);
      result.absent = Math.round(result.absent / days);
      result["half-day"] = Math.round(result["half-day"] / days);
      result["on-leave"] = Math.round(result["on-leave"] / days);
    }

    const markedCount = result.present + result.late + result.absent + result["half-day"] + result["on-leave"];
    result.notMarked = Math.max(0, totalStaff - markedCount);

    res.json({ success: true, data: result });
  } catch (error) {
    console.error("Error fetching attendance overview:", error);
    res.status(500).json({ success: false, message: "Failed to fetch attendance overview" });
  }
};
