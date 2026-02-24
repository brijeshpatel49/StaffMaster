import mongoose from "mongoose";
import Leave, { calculateLeaveDays } from "../models/Leave.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Attendance from "../models/Attendance.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";

// ── Helpers ──────────────────────────────────────────────────────────────────

const getStartOfDayUTC = (d = new Date()) => {
  const date = new Date(d);
  date.setUTCHours(0, 0, 0, 0);
  return date;
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

// ─────────────────────────────────────────────────────────────────────────────
// 1. APPLY LEAVE
// ─────────────────────────────────────────────────────────────────────────────
export const applyLeave = async (req, res) => {
  try {
    const { leaveType, fromDate, toDate, reason, isHalfDay } = req.body;

    // Validate required fields
    if (!leaveType || !fromDate || !toDate || !reason) {
      return res.status(400).json({
        success: false,
        message: "All fields are required: leaveType, fromDate, toDate, reason",
      });
    }

    // Validate leaveType
    const validTypes = ["casual", "sick", "annual", "unpaid"];
    if (!validTypes.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message: "Invalid leave type. Must be one of: casual, sick, annual, unpaid",
      });
    }

    // Parse dates
    const from = getStartOfDayUTC(new Date(fromDate));
    const to = getStartOfDayUTC(new Date(toDate));
    const today = getStartOfDayUTC(new Date());

    // Validate fromDate not in past
    if (from < today) {
      return res.status(400).json({
        success: false,
        message: "From date cannot be in the past",
      });
    }

    // Validate toDate >= fromDate
    if (to < from) {
      return res.status(400).json({
        success: false,
        message: "End date must be on or after start date",
      });
    }

    // Half day validations
    if (isHalfDay && from.getTime() !== to.getTime()) {
      return res.status(400).json({
        success: false,
        message: "For half-day leave, from and to date must be the same",
      });
    }

    // Calculate total days
    const totalDays = calculateLeaveDays(from, to, isHalfDay);

    if (totalDays <= 0) {
      return res.status(400).json({
        success: false,
        message: "Total leave days must be greater than 0. Selected dates may only contain Sundays.",
      });
    }

    // Check for overlapping leaves
    const overlapping = await Leave.findOne({
      employeeId: req.user._id,
      status: { $nin: ["rejected", "cancelled"] },
      fromDate: { $lte: to },
      toDate: { $gte: from },
    });

    if (overlapping) {
      return res.status(400).json({
        success: false,
        message: `You already have a leave application for overlapping dates: ${formatDate(overlapping.fromDate)} - ${formatDate(overlapping.toDate)}`,
      });
    }

    // Check leave balance
    const yearOfLeave = from.getUTCFullYear();
    const balance = await LeaveBalance.getOrCreate(req.user._id, yearOfLeave);

    if (leaveType !== "unpaid" && balance[leaveType].remaining < totalDays) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${balance[leaveType].remaining} days, Requested: ${totalDays} days`,
      });
    }

    // Validate reason length
    if (reason.trim().length < 10) {
      return res.status(400).json({
        success: false,
        message: "Reason must be at least 10 characters long",
      });
    }

    // Create leave application
    const leave = await Leave.create({
      employeeId: req.user._id,
      leaveType,
      fromDate: from,
      toDate: to,
      totalDays,
      reason: reason.trim(),
      isHalfDay: !!isHalfDay,
      status: "pending",
    });

    return res.status(201).json({
      success: true,
      message: "Leave application submitted successfully",
      data: leave,
    });
  } catch (error) {
    console.error("applyLeave error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while applying for leave",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET MY LEAVES
// ─────────────────────────────────────────────────────────────────────────────
export const getMyLeaves = async (req, res) => {
  try {
    const { status, year, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { employeeId: req.user._id };

    if (status && status !== "all") {
      filter.status = status;
    }

    if (year) {
      const y = parseInt(year);
      filter.appliedAt = {
        $gte: new Date(Date.UTC(y, 0, 1)),
        $lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    }

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate("reviewedBy", "fullName")
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(filter),
    ]);

    // Get current year balance
    const currentYear = new Date().getFullYear();
    const balance = await LeaveBalance.getOrCreate(req.user._id, currentYear);

    return res.status(200).json({
      success: true,
      data: {
        leaves,
        balance,
        pagination: {
          total,
          page: parseInt(page),
          limit: parseInt(limit),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      },
    });
  } catch (error) {
    console.error("getMyLeaves error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leaves",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET LEAVE BY ID
// ─────────────────────────────────────────────────────────────────────────────
export const getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate("employeeId", "fullName email")
      .populate("reviewedBy", "fullName");

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    const role = req.user.role;

    // Employee can only view own leaves
    if (role === "employee") {
      if (leave.employeeId._id.toString() !== req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own leave applications",
        });
      }
    }

    // Manager can view own + team leaves
    if (role === "manager") {
      if (leave.employeeId._id.toString() !== req.user._id.toString()) {
        const dept = await Department.findOne({ manager: req.user._id });
        if (!dept) {
          return res.status(403).json({
            success: false,
            message: "No department found for this manager",
          });
        }
        const profile = await EmployeeProfile.findOne({
          userId: leave.employeeId._id,
          departmentId: dept._id,
        });
        if (!profile) {
          return res.status(403).json({
            success: false,
            message: "This employee is not in your department",
          });
        }
      }
    }

    return res.status(200).json({
      success: true,
      data: leave,
    });
  } catch (error) {
    console.error("getLeaveById error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leave details",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. CANCEL LEAVE
// ─────────────────────────────────────────────────────────────────────────────
export const cancelLeave = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id);

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    // Only own leaves can be cancelled
    if (leave.employeeId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "You can only cancel your own leave applications",
      });
    }

    // Check if already rejected or cancelled
    if (leave.status === "rejected" || leave.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: `Leave is already ${leave.status}`,
      });
    }

    const today = getStartOfDayUTC(new Date());
    const leaveFrom = getStartOfDayUTC(leave.fromDate);

    // If approved and already started
    if (leave.status === "approved" && leaveFrom <= today) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel leave that has already started",
      });
    }

    // If was approved, restore balance and revert attendance
    if (leave.status === "approved") {
      const yearOfLeave = leaveFrom.getUTCFullYear();

      // Restore balance atomically
      await LeaveBalance.findOneAndUpdate(
        { userId: leave.employeeId, year: yearOfLeave },
        {
          $inc: {
            [`${leave.leaveType}.used`]: -leave.totalDays,
            [`${leave.leaveType}.remaining`]: leave.totalDays,
          },
        }
      );

      // Revert future attendance records back to absent
      if (leave.attendanceMarked) {
        const current = new Date(leaveFrom);
        const end = getStartOfDayUTC(leave.toDate);

        while (current <= end) {
          if (current.getUTCDay() !== 0) {
            // Only revert future dates
            if (current >= today) {
              await Attendance.findOneAndUpdate(
                {
                  employeeId: leave.employeeId,
                  date: new Date(current),
                },
                {
                  $set: {
                    status: "absent",
                    note: "Leave cancelled - reverted",
                    isManual: true,
                    markedBy: req.user._id,
                  },
                }
              );
            }
          }
          current.setUTCDate(current.getUTCDate() + 1);
        }
      }
    }

    leave.status = "cancelled";
    await leave.save();

    return res.status(200).json({
      success: true,
      message: "Leave cancelled successfully",
      data: leave,
    });
  } catch (error) {
    console.error("cancelLeave error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while cancelling leave",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET PENDING LEAVES
// ─────────────────────────────────────────────────────────────────────────────
export const getPendingLeaves = async (req, res) => {
  try {
    const { departmentId, page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = { status: "pending" };

    if (req.user.role === "manager") {
      // Auto-filter to manager's department
      const dept = await Department.findOne({ manager: req.user._id });
      if (!dept) {
        return res.status(200).json({
          success: true,
          count: 0,
          data: [],
        });
      }

      const profiles = await EmployeeProfile.find({
        departmentId: dept._id,
        status: "active",
      }).select("userId");

      const employeeIds = profiles.map((p) => p.userId);
      filter.employeeId = { $in: employeeIds };
    } else if (departmentId) {
      // HR/Admin optional department filter
      const profiles = await EmployeeProfile.find({
        departmentId,
        status: "active",
      }).select("userId");

      const employeeIds = profiles.map((p) => p.userId);
      filter.employeeId = { $in: employeeIds };
    }

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate("employeeId", "fullName email")
        .sort({ appliedAt: 1 }) // FIFO — oldest first
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(filter),
    ]);

    // Enrich with department and designation info
    const enrichedLeaves = await Promise.all(
      leaves.map(async (leave) => {
        const leaveObj = leave.toObject();
        const profile = await EmployeeProfile.findOne({
          userId: leave.employeeId._id,
        }).populate("departmentId", "name code");

        leaveObj.department = profile?.departmentId || null;
        leaveObj.designation = profile?.designation || null;
        return leaveObj;
      })
    );

    return res.status(200).json({
      success: true,
      count: total,
      data: enrichedLeaves,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error("getPendingLeaves error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching pending leaves",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. GET ALL LEAVES (HR/Admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getAllLeaves = async (req, res) => {
  try {
    const {
      status,
      employeeId,
      leaveType,
      month,
      year,
      departmentId,
      page = 1,
      limit = 15,
    } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const filter = {};

    if (status && status !== "all") {
      filter.status = status;
    }

    if (employeeId) {
      filter.employeeId = employeeId;
    }

    if (leaveType && leaveType !== "all") {
      filter.leaveType = leaveType;
    }

    if (month && year) {
      const m = parseInt(month);
      const y = parseInt(year);
      filter.fromDate = {
        $gte: new Date(Date.UTC(y, m - 1, 1)),
        $lte: new Date(Date.UTC(y, m, 0, 23, 59, 59, 999)),
      };
    } else if (year) {
      const y = parseInt(year);
      filter.fromDate = {
        $gte: new Date(Date.UTC(y, 0, 1)),
        $lte: new Date(Date.UTC(y, 11, 31, 23, 59, 59, 999)),
      };
    }

    if (departmentId) {
      const profiles = await EmployeeProfile.find({
        departmentId,
      }).select("userId");
      const employeeIds = profiles.map((p) => p.userId);
      filter.employeeId = { $in: employeeIds };
    }

    const [leaves, total] = await Promise.all([
      Leave.find(filter)
        .populate("employeeId", "fullName email")
        .populate("reviewedBy", "fullName")
        .sort({ appliedAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Leave.countDocuments(filter),
    ]);

    // Enrich with department info
    const enrichedLeaves = await Promise.all(
      leaves.map(async (leave) => {
        const leaveObj = leave.toObject();
        const profile = await EmployeeProfile.findOne({
          userId: leave.employeeId._id,
        }).populate("departmentId", "name code");

        leaveObj.department = profile?.departmentId || null;
        leaveObj.designation = profile?.designation || null;
        return leaveObj;
      })
    );

    return res.status(200).json({
      success: true,
      count: total,
      totalPages: Math.ceil(total / parseInt(limit)),
      currentPage: parseInt(page),
      data: enrichedLeaves,
    });
  } catch (error) {
    console.error("getAllLeaves error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leaves",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. REVIEW LEAVE (Approve / Reject)
// ─────────────────────────────────────────────────────────────────────────────
export const reviewLeave = async (req, res) => {
  try {
    const { action, rejectionReason } = req.body;

    // Validate action
    if (!action || !["approve", "reject"].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"',
      });
    }

    const leave = await Leave.findById(req.params.id).populate(
      "employeeId",
      "fullName email"
    );

    if (!leave) {
      return res.status(404).json({
        success: false,
        message: "Leave application not found",
      });
    }

    // Cannot review non-pending leave
    if (leave.status !== "pending") {
      return res.status(400).json({
        success: false,
        message: `Leave is already ${leave.status}, cannot review`,
      });
    }

    // Manager: verify employee is in their department
    if (req.user.role === "manager") {
      // Manager cannot approve their own leave
      if (leave.employeeId._id.toString() === req.user._id.toString()) {
        return res.status(403).json({
          success: false,
          message:
            "You cannot approve your own leave. It must be reviewed by HR.",
        });
      }

      const dept = await Department.findOne({ manager: req.user._id });
      if (!dept) {
        return res.status(403).json({
          success: false,
          message: "No department found for this manager",
        });
      }

      const profile = await EmployeeProfile.findOne({
        userId: leave.employeeId._id,
        departmentId: dept._id,
      });

      if (!profile) {
        return res.status(403).json({
          success: false,
          message: "This employee is not in your department",
        });
      }
    }

    if (action === "approve") {
      // Double-check leave balance
      const yearOfLeave = new Date(leave.fromDate).getUTCFullYear();
      const balance = await LeaveBalance.getOrCreate(
        leave.employeeId._id,
        yearOfLeave
      );

      if (
        leave.leaveType !== "unpaid" &&
        balance[leave.leaveType].remaining < leave.totalDays
      ) {
        return res.status(400).json({
          success: false,
          message: `Insufficient leave balance for ${leave.employeeId.fullName}. Available: ${balance[leave.leaveType].remaining} days, Requested: ${leave.totalDays} days`,
        });
      }

      // Deduct balance atomically
      await LeaveBalance.findOneAndUpdate(
        { userId: leave.employeeId._id, year: yearOfLeave },
        {
          $inc: {
            [`${leave.leaveType}.used`]: leave.totalDays,
            [`${leave.leaveType}.remaining`]: -leave.totalDays,
          },
        }
      );

      // Update attendance records for the leave period
      const from = getStartOfDayUTC(leave.fromDate);
      const to = getStartOfDayUTC(leave.toDate);
      const current = new Date(from);

      while (current <= to) {
        if (current.getUTCDay() !== 0) {
          // Skip Sundays
          const dateForRecord = new Date(current);

          await Attendance.findOneAndUpdate(
            {
              employeeId: leave.employeeId._id,
              date: dateForRecord,
            },
            {
              $set: {
                status: "on-leave",
                isManual: true,
                markedBy: req.user._id,
                note: `Approved leave - ${leave.leaveType}`,
              },
              $setOnInsert: {
                employeeId: leave.employeeId._id,
                date: dateForRecord,
              },
            },
            { upsert: true, new: true }
          );
        }
        current.setUTCDate(current.getUTCDate() + 1);
      }

      leave.attendanceMarked = true;
      leave.status = "approved";
      leave.reviewedBy = req.user._id;
      leave.reviewedAt = new Date();
      await leave.save();

      return res.status(200).json({
        success: true,
        message: `Leave approved successfully for ${leave.employeeId.fullName}`,
        data: leave,
      });
    }

    if (action === "reject") {
      // Rejection reason is required
      if (!rejectionReason || rejectionReason.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Rejection reason is required",
        });
      }

      leave.status = "rejected";
      leave.reviewedBy = req.user._id;
      leave.reviewedAt = new Date();
      leave.rejectionReason = rejectionReason.trim();
      await leave.save();

      return res.status(200).json({
        success: true,
        message: `Leave rejected for ${leave.employeeId.fullName}`,
        data: leave,
      });
    }
  } catch (error) {
    console.error("reviewLeave error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while reviewing leave",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. GET LEAVE BALANCE
// ─────────────────────────────────────────────────────────────────────────────
export const getLeaveBalance = async (req, res) => {
  try {
    const { year } = req.query;
    let { userId } = req.query;
    const currentYear = new Date().getFullYear();
    const targetYear = year ? parseInt(year) : currentYear;

    // Employee/Manager can only see own balance
    if (req.user.role === "employee" || req.user.role === "manager") {
      userId = req.user._id;
    } else {
      // HR/Admin can view any user's balance
      userId = userId || req.user._id;
    }

    const balance = await LeaveBalance.getOrCreate(userId, targetYear);

    return res.status(200).json({
      success: true,
      data: balance,
    });
  } catch (error) {
    console.error("getLeaveBalance error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leave balance",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. GET LEAVE STATS (HR/Admin)
// ─────────────────────────────────────────────────────────────────────────────
export const getLeaveStats = async (req, res) => {
  try {
    const { month, year, departmentId } = req.query;
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth() + 1;

    const targetYear = year ? parseInt(year) : currentYear;
    const targetMonth = month ? parseInt(month) : currentMonth;

    // Build date range for matching
    const startDate = new Date(Date.UTC(targetYear, targetMonth - 1, 1));
    const endDate = new Date(
      Date.UTC(targetYear, targetMonth, 0, 23, 59, 59, 999)
    );

    const matchStage = {
      fromDate: { $lte: endDate },
      toDate: { $gte: startDate },
    };

    // If department filter, get employee IDs first
    if (departmentId) {
      const profiles = await EmployeeProfile.find({
        departmentId,
      }).select("userId");
      const employeeIds = profiles.map((p) => p.userId);
      matchStage.employeeId = { $in: employeeIds };
    }

    // By status aggregation
    const byStatusAgg = await Leave.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 },
        },
      },
    ]);

    // By type aggregation
    const byTypeAgg = await Leave.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$leaveType",
          count: { $sum: 1 },
        },
      },
    ]);

    // Total
    const total = await Leave.countDocuments(matchStage);

    // Build response
    const byStatus = { pending: 0, approved: 0, rejected: 0, cancelled: 0 };
    byStatusAgg.forEach((item) => {
      byStatus[item._id] = item.count;
    });

    const byType = { casual: 0, sick: 0, annual: 0, unpaid: 0 };
    byTypeAgg.forEach((item) => {
      byType[item._id] = item.count;
    });

    // Department-wise breakdown
    let departmentWise = [];
    if (!departmentId) {
      const deptAgg = await Leave.aggregate([
        { $match: matchStage },
        {
          $lookup: {
            from: "employeeprofiles",
            localField: "employeeId",
            foreignField: "userId",
            as: "profile",
          },
        },
        { $unwind: { path: "$profile", preserveNullAndEmptyArrays: true } },
        {
          $lookup: {
            from: "departments",
            localField: "profile.departmentId",
            foreignField: "_id",
            as: "dept",
          },
        },
        { $unwind: { path: "$dept", preserveNullAndEmptyArrays: true } },
        {
          $group: {
            _id: "$dept._id",
            department: { $first: "$dept.name" },
            total: { $sum: 1 },
            approved: {
              $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] },
            },
          },
        },
        { $sort: { total: -1 } },
      ]);
      departmentWise = deptAgg;
    }

    return res.status(200).json({
      success: true,
      data: {
        total,
        byStatus,
        byType,
        departmentWise,
      },
    });
  } catch (error) {
    console.error("getLeaveStats error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while fetching leave stats",
    });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. UPDATE LEAVE BALANCE (HR/Admin)
// ─────────────────────────────────────────────────────────────────────────────
export const updateLeaveBalance = async (req, res) => {
  try {
    const { userId } = req.params;
    const { year, leaveType, total } = req.body;

    const currentYear = new Date().getFullYear();
    const targetYear = year ? parseInt(year) : currentYear;

    // Validate leaveType
    const validTypes = ["casual", "sick", "annual", "unpaid"];
    if (!leaveType || !validTypes.includes(leaveType)) {
      return res.status(400).json({
        success: false,
        message:
          "Invalid leave type. Must be one of: casual, sick, annual, unpaid",
      });
    }

    if (total === undefined || total === null || total < 0) {
      return res.status(400).json({
        success: false,
        message: "Total must be a non-negative number",
      });
    }

    const balance = await LeaveBalance.getOrCreate(userId, targetYear);

    // Cannot set total less than used
    if (total < balance[leaveType].used) {
      return res.status(400).json({
        success: false,
        message: `Cannot set total less than already used days (${balance[leaveType].used} used)`,
      });
    }

    balance[leaveType].total = total;
    balance[leaveType].remaining = total - balance[leaveType].used;
    await balance.save();

    return res.status(200).json({
      success: true,
      message: "Leave balance updated successfully",
      data: balance,
    });
  } catch (error) {
    console.error("updateLeaveBalance error:", error);
    return res.status(500).json({
      success: false,
      message: "Server error while updating leave balance",
    });
  }
};
