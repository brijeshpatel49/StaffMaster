import jwt from "jsonwebtoken";
import Notification from "../models/Notification.js";
import { addClient, removeClient } from "../utils/sseManager.js";

// GET /api/notifications/stream
export const sseStream = async (req, res) => {
  const token = req.query.token;
  if (!token) return res.status(401).end();

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).end();
  }

  const userId = decoded.id || decoded._id;

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("X-Accel-Buffering", "no");
  res.flushHeaders();

  addClient(userId, res);

  // Send initial unread count
  try {
    const count = await Notification.countDocuments({
      recipientId: userId, isRead: false
    });
    res.write(`data: ${JSON.stringify({
      type: "unread_count", count
    })}\n\n`);
  } catch (err) {
    console.error("Failed to send initial count:", err);
  }

  // Keepalive every 25s
  const keepalive = setInterval(() => {
    try { res.write(": keepalive\n\n"); }
    catch { clearInterval(keepalive); }
  }, 25000);

  req.on("close", () => {
    clearInterval(keepalive);
    removeClient(userId);
  });
};

// GET /api/notifications
export const getNotifications = async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = "false" } = req.query;
    
    const filter = { recipientId: req.user._id };
    if (unreadOnly === "true") {
      filter.isRead = false;
    }

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(Number(limit));

    const unreadCount = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });
    
    const total = await Notification.countDocuments(filter);

    res.json({
      notifications,
      unreadCount,
      hasMore: total > page * limit
    });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/notifications/:id/read
export const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipientId: req.user._id },
      { isRead: true, readAt: new Date() },
      { returnDocument: "after" }
    );
    
    res.json({ success: true, notification });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// PATCH /api/notifications/read-all
export const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipientId: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ updated: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};

// GET /api/notifications/unread-count
export const getUnreadCount = async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipientId: req.user._id,
      isRead: false
    });
    
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: "Server error", error: error.message });
  }
};
