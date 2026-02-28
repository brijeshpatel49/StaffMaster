import Task from "../models/Task.js";
import Department from "../models/Department.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import User from "../models/User.js";

const PRIORITY_ORDER = { urgent: 1, high: 2, medium: 3, low: 4 };

// Helper: get manager's department
const getManagerDepartment = async (userId) => {
  return Department.findOne({ manager: userId, isActive: true });
};

// ─────────────────────────────────────────────────────────────────────────────
// 1. CREATE TASK  (POST /api/tasks)  — manager only
// ─────────────────────────────────────────────────────────────────────────────
export const createTask = async (req, res) => {
  try {
    const { title, description, assignedTo, priority, deadline, estimatedHours, tags } = req.body;

    // Step 1 — Find manager's department
    const managerDepartment = await getManagerDepartment(req.user._id);
    if (!managerDepartment) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned as manager of any department",
      });
    }

    // Cannot assign to self
    if (assignedTo === req.user._id.toString()) {
      return res.status(400).json({
        success: false,
        message: "You cannot assign tasks to yourself",
      });
    }

    // Step 2 — Validate assignedTo employee
    const employee = await User.findOne({ _id: assignedTo, isActive: true });
    if (!employee) {
      return res.status(404).json({
        success: false,
        message: "Employee not found or inactive",
      });
    }
    if (employee.role !== "employee") {
      return res.status(403).json({
        success: false,
        message: "Tasks can only be assigned to employees",
      });
    }

    // Step 3 — Department validation
    const profile = await EmployeeProfile.findOne({
      userId: assignedTo,
      departmentId: managerDepartment._id,
      status: "active",
    });
    if (!profile) {
      return res.status(403).json({
        success: false,
        message: "You can only assign tasks to employees in your department",
      });
    }

    // Step 4 — Validate deadline
    const deadlineDate = new Date(deadline);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deadlineDate < today) {
      return res.status(400).json({
        success: false,
        message: "Deadline cannot be in the past",
      });
    }

    // Step 5 — Create task
    const task = await Task.create({
      title,
      description,
      assignedTo,
      assignedBy: req.user._id,
      departmentId: managerDepartment._id,
      priority: priority || "medium",
      deadline: deadlineDate,
      estimatedHours,
      tags: tags || [],
      status: "todo",
      updates: [
        {
          message: `Task created and assigned by ${req.user.fullName}`,
          updatedBy: req.user._id,
          updatedAt: new Date(),
        },
      ],
    });

    // Step 6 — Populate and return
    const populated = await Task.findById(task._id)
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName")
      .populate("departmentId", "name code");

    return res.status(201).json({
      success: true,
      message: "Task created successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Create Task Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 2. GET MY TASKS  (GET /api/tasks/my)  — employee only
// ─────────────────────────────────────────────────────────────────────────────
export const getMyTasks = async (req, res) => {
  try {
    const { status, priority, page = 1, limit = 10, sortBy = "deadline" } = req.query;

    const filter = { assignedTo: req.user._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    // Sort options
    let sort = {};
    if (sortBy === "priority") {
      sort = { createdAt: -1 }; // will re-sort below
    } else if (sortBy === "createdAt") {
      sort = { createdAt: -1 };
    } else {
      sort = { deadline: 1 };
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedBy", "fullName")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    // If sortBy priority, re-sort in-memory
    if (sortBy === "priority") {
      tasks.sort(
        (a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3)
      );
    }

    // Summary counts
    const allTasks = await Task.find({ assignedTo: req.user._id });
    const now = new Date();
    const summary = {
      total: allTasks.length,
      todo: allTasks.filter((t) => t.status === "todo").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      cancelled: allTasks.filter((t) => t.status === "cancelled").length,
      overdue: allTasks.filter(
        (t) =>
          ["todo", "in_progress"].includes(t.status) && new Date(t.deadline) < now
      ).length,
    };

    return res.json({
      success: true,
      data: {
        tasks,
        summary,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get My Tasks Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 3. GET TEAM TASKS  (GET /api/tasks/team)  — manager only
// ─────────────────────────────────────────────────────────────────────────────
export const getTeamTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      page = 1,
      limit = 10,
      sortBy = "deadline",
    } = req.query;

    const managerDepartment = await getManagerDepartment(req.user._id);
    if (!managerDepartment) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned as manager of any department",
      });
    }

    const filter = { departmentId: managerDepartment._id };
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let sort = {};
    if (sortBy === "priority") {
      sort = { createdAt: -1 };
    } else if (sortBy === "createdAt") {
      sort = { createdAt: -1 };
    } else {
      sort = { deadline: 1 };
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "fullName email")
        .populate("assignedBy", "fullName")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    if (sortBy === "priority") {
      tasks.sort(
        (a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3)
      );
    }

    // Summary counts (all department tasks, unfiltered)
    const allDeptTasks = await Task.find({ departmentId: managerDepartment._id });
    const now = new Date();
    const summary = {
      total: allDeptTasks.length,
      todo: allDeptTasks.filter((t) => t.status === "todo").length,
      in_progress: allDeptTasks.filter((t) => t.status === "in_progress").length,
      completed: allDeptTasks.filter((t) => t.status === "completed").length,
      cancelled: allDeptTasks.filter((t) => t.status === "cancelled").length,
      overdue: allDeptTasks.filter(
        (t) =>
          ["todo", "in_progress"].includes(t.status) && new Date(t.deadline) < now
      ).length,
    };

    // Per-employee breakdown
    const employeeMap = {};
    for (const t of allDeptTasks) {
      const eid = t.assignedTo.toString();
      if (!employeeMap[eid]) {
        employeeMap[eid] = { total: 0, completed: 0, overdue: 0 };
      }
      employeeMap[eid].total++;
      if (t.status === "completed") employeeMap[eid].completed++;
      if (
        ["todo", "in_progress"].includes(t.status) &&
        new Date(t.deadline) < now
      ) {
        employeeMap[eid].overdue++;
      }
    }

    // Resolve employee names
    const empIds = Object.keys(employeeMap);
    const users = await User.find({ _id: { $in: empIds } }).select("fullName");
    const userNameMap = {};
    for (const u of users) userNameMap[u._id.toString()] = u.fullName;

    const employeeBreakdown = empIds.map((id) => ({
      employeeId: id,
      employee: userNameMap[id] || "Unknown",
      ...employeeMap[id],
    }));

    return res.json({
      success: true,
      data: {
        tasks,
        summary,
        employeeBreakdown,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get Team Tasks Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 4. GET ALL TASKS  (GET /api/tasks)  — admin, hr only
// ─────────────────────────────────────────────────────────────────────────────
export const getAllTasks = async (req, res) => {
  try {
    const {
      status,
      priority,
      assignedTo,
      departmentId,
      page = 1,
      limit = 15,
      sortBy = "deadline",
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (assignedTo) filter.assignedTo = assignedTo;
    if (departmentId) filter.departmentId = departmentId;

    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.max(1, Math.min(50, parseInt(limit)));
    const skip = (pageNum - 1) * limitNum;

    let sort = {};
    if (sortBy === "priority") {
      sort = { createdAt: -1 };
    } else if (sortBy === "createdAt") {
      sort = { createdAt: -1 };
    } else {
      sort = { deadline: 1 };
    }

    const [tasks, total] = await Promise.all([
      Task.find(filter)
        .populate("assignedTo", "fullName email")
        .populate("assignedBy", "fullName")
        .populate("departmentId", "name")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      Task.countDocuments(filter),
    ]);

    if (sortBy === "priority") {
      tasks.sort(
        (a, b) => (PRIORITY_ORDER[a.priority] || 3) - (PRIORITY_ORDER[b.priority] || 3)
      );
    }

    // Summary counts (all tasks, unfiltered)
    const allTasks = await Task.find({});
    const now = new Date();
    const summary = {
      total: allTasks.length,
      todo: allTasks.filter((t) => t.status === "todo").length,
      in_progress: allTasks.filter((t) => t.status === "in_progress").length,
      completed: allTasks.filter((t) => t.status === "completed").length,
      cancelled: allTasks.filter((t) => t.status === "cancelled").length,
      overdue: allTasks.filter(
        (t) =>
          ["todo", "in_progress"].includes(t.status) && new Date(t.deadline) < now
      ).length,
    };

    // Department breakdown
    const deptMap = {};
    for (const t of allTasks) {
      const did = t.departmentId?.toString() || "unknown";
      if (!deptMap[did]) {
        deptMap[did] = { total: 0, in_progress: 0, completed: 0, overdue: 0 };
      }
      deptMap[did].total++;
      if (t.status === "in_progress") deptMap[did].in_progress++;
      if (t.status === "completed") deptMap[did].completed++;
      if (
        ["todo", "in_progress"].includes(t.status) &&
        new Date(t.deadline) < now
      ) {
        deptMap[did].overdue++;
      }
    }

    const deptIds = Object.keys(deptMap).filter((id) => id !== "unknown");
    const departments = await Department.find({ _id: { $in: deptIds } }).select("name");
    const deptNameMap = {};
    for (const d of departments) deptNameMap[d._id.toString()] = d.name;

    const departmentBreakdown = deptIds.map((id) => ({
      departmentId: id,
      department: deptNameMap[id] || "Unknown",
      ...deptMap[id],
    }));

    return res.json({
      success: true,
      data: {
        tasks,
        summary,
        departmentBreakdown,
        pagination: {
          currentPage: pageNum,
          totalPages: Math.ceil(total / limitNum),
          total,
          limit: limitNum,
        },
      },
    });
  } catch (error) {
    console.error("Get All Tasks Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 5. GET TASK BY ID  (GET /api/tasks/:id)  — all authenticated
// ─────────────────────────────────────────────────────────────────────────────
export const getTaskById = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName email")
      .populate("departmentId", "name code")
      .populate("updates.updatedBy", "fullName");

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Authorization check
    const role = req.user.role;
    if (role === "employee") {
      if (task.assignedTo._id.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized to view this task" });
      }
    } else if (role === "manager") {
      const dept = await getManagerDepartment(req.user._id);
      if (!dept || task.departmentId._id.toString() !== dept._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized to view this task" });
      }
    }
    // admin/hr can view all

    return res.json({ success: true, data: task });
  } catch (error) {
    console.error("Get Task By ID Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 6. UPDATE TASK STATUS  (PATCH /api/tasks/:id/status)
// ─────────────────────────────────────────────────────────────────────────────
const VALID_TRANSITIONS = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["completed", "todo", "cancelled"],
  completed: ["in_progress"],
  cancelled: ["todo"],
};

export const updateTaskStatus = async (req, res) => {
  try {
    const { status, message, actualHours } = req.body;
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const role = req.user.role;

    // Authorization
    if (role === "employee") {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }
    } else if (role === "manager") {
      const dept = await getManagerDepartment(req.user._id);
      if (!dept || task.departmentId.toString() !== dept._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }
    }

    const oldStatus = task.status;
    const allowed = VALID_TRANSITIONS[oldStatus] || [];
    if (!allowed.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition from ${oldStatus} to ${status}`,
      });
    }

    // Employee-specific restrictions
    if (role === "employee") {
      if (status === "cancelled") {
        return res.status(403).json({
          success: false,
          message: "Only manager can cancel a task",
        });
      }
      if (oldStatus === "completed" && status === "in_progress") {
        return res.status(403).json({
          success: false,
          message: "Contact your manager to reopen task",
        });
      }
      if (oldStatus === "cancelled" && status === "todo") {
        return res.status(403).json({
          success: false,
          message: "Contact your manager to reopen task",
        });
      }
    }

    // Completed: require actualHours
    if (status === "completed") {
      if (actualHours === undefined || actualHours === null) {
        return res.status(400).json({
          success: false,
          message: "Please provide actual hours spent",
        });
      }
      task.completedAt = new Date();
      task.actualHours = actualHours;
    }

    // Cancelled: require reason
    if (status === "cancelled") {
      if (!message || message.trim().length === 0) {
        return res.status(400).json({
          success: false,
          message: "Please provide cancellation reason",
        });
      }
      task.cancelledAt = new Date();
      task.cancelledBy = req.user._id;
      task.cancelReason = message.trim();
    }

    // If reopening from completed, reset completedAt/actualHours
    if (oldStatus === "completed" && status === "in_progress") {
      task.completedAt = null;
      task.actualHours = null;
    }

    // If reopening from cancelled, reset cancel fields
    if (oldStatus === "cancelled" && status === "todo") {
      task.cancelledAt = null;
      task.cancelledBy = null;
      task.cancelReason = null;
    }

    task.status = status;
    task.updates.push({
      message: message || `Status changed to ${status}`,
      updatedBy: req.user._id,
      updatedAt: new Date(),
      statusChange: `${oldStatus} → ${status}`,
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName")
      .populate("departmentId", "name code")
      .populate("updates.updatedBy", "fullName");

    return res.json({
      success: true,
      message: `Task status updated to ${status}`,
      data: populated,
    });
  } catch (error) {
    console.error("Update Task Status Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. UPDATE TASK  (PUT /api/tasks/:id)  — manager only
// ─────────────────────────────────────────────────────────────────────────────
export const updateTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const dept = await getManagerDepartment(req.user._id);
    if (!dept || task.departmentId.toString() !== dept._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to edit this task" });
    }

    if (["completed", "cancelled"].includes(task.status)) {
      return res.status(400).json({
        success: false,
        message: `Cannot edit a ${task.status} task`,
      });
    }

    const { title, description, priority, deadline, estimatedHours, tags } =
      req.body;

    if (deadline) {
      const deadlineDate = new Date(deadline);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (deadlineDate < today) {
        return res.status(400).json({
          success: false,
          message: "Deadline cannot be in the past",
        });
      }
      task.deadline = deadlineDate;
    }

    if (title !== undefined) task.title = title;
    if (description !== undefined) task.description = description;
    if (priority !== undefined) task.priority = priority;
    if (estimatedHours !== undefined) task.estimatedHours = estimatedHours;
    if (tags !== undefined) task.tags = tags;

    task.updates.push({
      message: "Task details updated by manager",
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName")
      .populate("departmentId", "name code")
      .populate("updates.updatedBy", "fullName");

    return res.json({
      success: true,
      message: "Task updated successfully",
      data: populated,
    });
  } catch (error) {
    console.error("Update Task Error:", error);
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. ADD TASK UPDATE  (POST /api/tasks/:id/updates)
// ─────────────────────────────────────────────────────────────────────────────
export const addTaskUpdate = async (req, res) => {
  try {
    const { message } = req.body;

    if (!message || message.trim().length < 3) {
      return res.status(400).json({
        success: false,
        message: "Update message must be at least 3 characters",
      });
    }
    if (message.length > 500) {
      return res.status(400).json({
        success: false,
        message: "Update message cannot exceed 500 characters",
      });
    }

    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    // Authorization
    const role = req.user.role;
    if (role === "employee") {
      if (task.assignedTo.toString() !== req.user._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }
    } else if (role === "manager") {
      const dept = await getManagerDepartment(req.user._id);
      if (!dept || task.departmentId.toString() !== dept._id.toString()) {
        return res
          .status(403)
          .json({ success: false, message: "Not authorized" });
      }
    }

    if (task.status === "cancelled") {
      return res.status(400).json({
        success: false,
        message: "Cannot add update to cancelled task",
      });
    }

    task.updates.push({
      message: message.trim(),
      updatedBy: req.user._id,
      updatedAt: new Date(),
    });

    await task.save();

    const populated = await Task.findById(task._id)
      .populate("assignedTo", "fullName email")
      .populate("assignedBy", "fullName")
      .populate("departmentId", "name code")
      .populate("updates.updatedBy", "fullName");

    return res.json({
      success: true,
      message: "Update added",
      data: populated,
    });
  } catch (error) {
    console.error("Add Task Update Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. DELETE TASK  (DELETE /api/tasks/:id)  — manager only
// ─────────────────────────────────────────────────────────────────────────────
export const deleteTask = async (req, res) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found" });
    }

    const dept = await getManagerDepartment(req.user._id);
    if (!dept || task.departmentId.toString() !== dept._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete this task" });
    }

    if (task.status !== "todo") {
      return res.status(400).json({
        success: false,
        message: "Can only delete tasks that haven't started. Cancel the task instead.",
      });
    }

    await Task.findByIdAndDelete(req.params.id);

    return res.json({ success: true, message: "Task deleted" });
  } catch (error) {
    console.error("Delete Task Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. GET DEPARTMENT EMPLOYEES  (GET /api/tasks/department/employees)
// ─────────────────────────────────────────────────────────────────────────────
export const getDepartmentEmployees = async (req, res) => {
  try {
    const managerDepartment = await getManagerDepartment(req.user._id);
    if (!managerDepartment) {
      return res.status(404).json({
        success: false,
        message: "You are not assigned as manager of any department",
      });
    }

    const profiles = await EmployeeProfile.find({
      departmentId: managerDepartment._id,
      status: "active",
    }).populate("userId", "fullName email isActive role");

    const employees = profiles
      .filter((p) => p.userId && p.userId.isActive && p.userId.role === "employee")
      .map((p) => ({
        _id: p.userId._id,
        fullName: p.userId.fullName,
        email: p.userId.email,
      }));

    return res.json({ success: true, data: employees });
  } catch (error) {
    console.error("Get Department Employees Error:", error);
    return res.status(500).json({ success: false, message: "Server error" });
  }
};
