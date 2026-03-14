import express from "express";
import {
  sseStream,
  getNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount
} from "../controllers/notificationController.js";
import authMiddleware from "../middlewares/authMiddleware.js";

const router = express.Router();

router.get("/stream", sseStream);
router.get("/unread-count", authMiddleware, getUnreadCount);
router.patch("/read-all", authMiddleware, markAllAsRead);
router.get("/", authMiddleware, getNotifications);
router.patch("/:id/read", authMiddleware, markAsRead);

export default router;