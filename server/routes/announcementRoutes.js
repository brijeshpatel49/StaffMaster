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

// All announcements (admin, hr only — includes expired)
router.get("/", authorizeRoles("admin", "hr"), getAllAnnouncements);

// Create announcement (admin, hr)
router.post("/", authorizeRoles("admin", "hr"), createAnnouncement);

// ── Parameterized routes ────────────────────────────────────────────────────

// Get single announcement — all authenticated
router.get("/:id", getAnnouncementById);

// Update announcement (admin, hr)
router.put("/:id", authorizeRoles("admin", "hr"), updateAnnouncement);

// Delete announcement (admin, hr)
router.delete("/:id", authorizeRoles("admin", "hr"), deleteAnnouncement);

// Toggle pin (admin only)
router.patch("/:id/pin", authorizeRoles("admin"), togglePin);

// Toggle active (admin, hr)
router.patch("/:id/toggle", authorizeRoles("admin", "hr"), toggleActive);

export default router;
