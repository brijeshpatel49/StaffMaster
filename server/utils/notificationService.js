import Notification from "../models/Notification.js";
import { sendToUser, sendToUsers } from "./sseManager.js";

export const createNotification = async ({
  recipientId, senderId = null,
  type, title, message, metadata = {}
}) => {
  try {
    const notification = await Notification.create({
      recipientId, senderId, type,
      title, message, isRead: false, metadata,
    });
    sendToUser(recipientId, {
      _id: notification._id,
      type, title, message,
      isRead: false,
      createdAt: notification.createdAt,
      metadata,
    });
    return notification;
  } catch (err) {
    console.error("Notification failed:", err.message);
    return null;
  }
};

export const createBulkNotifications = async (notifications) => {
  try {
    const created = await Notification.insertMany(
      notifications, { ordered: false }
    );
    created.forEach(n => sendToUser(n.recipientId, {
      _id: n._id, type: n.type,
      title: n.title, message: n.message,
      isRead: false, createdAt: n.createdAt,
      metadata: n.metadata,
    }));
    return created;
  } catch (err) {
    console.error("Bulk notify failed:", err.message);
    return [];
  }
};

const fmt = (d) => new Date(d).toLocaleDateString("en-IN", {
  day: "2-digit", month: "short", year: "numeric"
});

export const notifyLeaveApproved = (leave, reviewerName) =>
  createNotification({
    recipientId: leave.employeeId,
    senderId: leave.reviewedBy,
    type: "leave_approved",
    title: "Leave Approved ✓",
    message: `Your ${leave.leaveType} leave (${fmt(leave.fromDate)} – ${fmt(leave.toDate)}) was approved by ${reviewerName}.`,
    metadata: { leaveId: leave._id, leaveType: leave.leaveType },
  });

export const notifyLeaveRejected = (leave, reviewerName, reason) =>
  createNotification({
    recipientId: leave.employeeId,
    senderId: leave.reviewedBy,
    type: "leave_rejected",
    title: "Leave Rejected",
    message: `Your ${leave.leaveType} leave was rejected by ${reviewerName}.${reason ? ` Reason: ${reason}` : ""}`,
    metadata: { leaveId: leave._id, reason },
  });

export const notifyLeaveRequest = (leave, employeeName, managerId) =>
  createNotification({
    recipientId: managerId,
    senderId: leave.employeeId,
    type: "leave_request",
    title: "New Leave Request",
    message: `${employeeName} applied for ${leave.leaveType} leave from ${fmt(leave.fromDate)} to ${fmt(leave.toDate)} (${leave.totalDays} days).`,
    metadata: { leaveId: leave._id, employeeId: leave.employeeId },
  });

export const notifyTaskAssigned = (task, assignerName) =>
  createNotification({
    recipientId: task.assignedTo,
    senderId: task.assignedBy,
    type: "task_assigned",
    title: "New Task Assigned",
    message: `${assignerName} assigned you: "${task.title}". Priority: ${task.priority}. Deadline: ${fmt(task.deadline)}.`,
    metadata: { taskId: task._id, priority: task.priority },
  });

export const notifyTaskCompleted = (task, employeeName) =>
  createNotification({
    recipientId: task.assignedBy, // Manager
    senderId: task.assignedTo, // Employee
    type: "task_completed",
    title: "Task Completed",
    message: `${employeeName} has completed the task: "${task.title}".`,
    metadata: { taskId: task._id },
  });

export const notifyPerformanceReviewed = (performance, managerName) => {
  const month = new Date(performance.period.year,
    performance.period.month - 1)
    .toLocaleString("en", { month: "long" });
  return createNotification({
    recipientId: performance.employeeId,
    senderId: performance.managerId,
    type: "performance_reviewed",
    title: "Performance Review Complete",
    message: `Your ${month} ${performance.period.year} review is done by ${managerName}. Grade: ${performance.grade} | Score: ${performance.finalScore}/5.`,
    metadata: {
      performanceId: performance._id,
      grade: performance.grade,
      finalScore: performance.finalScore,
    },
  });
};

export const notifyPayrollApproved = (payroll) => {
  const month = new Date(payroll.period.year,
    payroll.period.month - 1)
    .toLocaleString("en", { month: "long" });
  return createNotification({
    recipientId: payroll.employeeId,
    type: "payroll_approved",
    title: "Salary Slip Ready",
    message: `Your salary slip for ${month} ${payroll.period.year} is ready. Net: Rs. ${payroll.netSalary.toLocaleString("en-IN")}.`,
    metadata: { payrollId: payroll._id, netSalary: payroll.netSalary },
  });
};

export const notifyPayrollPaid = (payroll) => {
  const month = new Date(payroll.period.year,
    payroll.period.month - 1)
    .toLocaleString("en", { month: "long" });
  return createNotification({
    recipientId: payroll.employeeId,
    type: "payroll_paid",
    title: "Salary Credited 💰",
    message: `Your ${month} ${payroll.period.year} salary of Rs. ${payroll.netSalary.toLocaleString("en-IN")} has been paid via ${payroll.paymentMode?.replace(/_/g, " ")}.`,
    metadata: { payrollId: payroll._id, paymentMode: payroll.paymentMode },
  });
};

export const notifyAnnouncement = (announcement, targetUserIds) => {
  const notifs = targetUserIds.map(userId => ({
    recipientId: userId,
    senderId: announcement.postedBy,
    type: "announcement_posted",
    title: announcement.priority === "urgent"
      ? "🚨 Urgent Announcement"
      : "📢 New Announcement",
    message: announcement.title,
    metadata: {
      announcementId: announcement._id,
      priority: announcement.priority
    },
  }));
  return createBulkNotifications(notifs);
};
