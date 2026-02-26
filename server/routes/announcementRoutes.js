import express from "express";
import {
  createAnnouncement,
  getAllAnnouncements,
  getActiveAnnouncements,
  getUnreadCount,
  getAnnouncementById,
  updateAnnouncement,
  deleteAnnouncement,
  togglePin,
  toggleActive,
} from "../controllers/announcementController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ── Specific routes BEFORE parameterized routes ─────────────────────────────

// Active announcements — all authenticated users
router.get("/active", getActiveAnnouncements);

// Unread count — lightweight for sidebar badge
router.get("/unread-count", getUnreadCount);

// All announcements (admin, hr, manager — manager sees own dept only)
router.get("/", authorizeRoles("admin", "hr", "manager"), getAllAnnouncements);

// Create announcement (admin, hr, manager)
router.post("/", authorizeRoles("admin", "hr", "manager"), createAnnouncement);

// ── Parameterized routes ────────────────────────────────────────────────────

// Get single announcement — all authenticated
router.get("/:id", getAnnouncementById);

// Update announcement (admin, hr, manager)
router.put("/:id", authorizeRoles("admin", "hr", "manager"), updateAnnouncement);

// Delete announcement (admin, hr, manager)
router.delete("/:id", authorizeRoles("admin", "hr", "manager"), deleteAnnouncement);

// Toggle pin (admin only)
router.patch("/:id/pin", authorizeRoles("admin"), togglePin);

// Toggle active (admin, hr)
router.patch("/:id/toggle", authorizeRoles("admin", "hr"), toggleActive);

export default router;
