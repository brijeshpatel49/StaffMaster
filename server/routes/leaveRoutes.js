import express from "express";
import {
  applyLeave,
  getMyLeaves,
  getLeaveById,
  cancelLeave,
  getPendingLeaves,
  getAllLeaves,
  reviewLeave,
  getLeaveBalance,
  getLeaveStats,
  updateLeaveBalance,
} from "../controllers/leaveController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ── Specific routes BEFORE parameterized routes ─────────────────────────────

// Employee & Manager (self)
router.get("/my", authorizeRoles("employee", "manager"), getMyLeaves);

// Pending leaves (HR, Admin, Manager)
router.get(
  "/pending",
  authorizeRoles("hr", "admin", "manager"),
  getPendingLeaves
);

// Leave balance
router.get(
  "/balance",
  authorizeRoles("employee", "manager", "hr", "admin"),
  getLeaveBalance
);

// Leave stats (HR, Admin only)
router.get("/stats", authorizeRoles("hr", "admin"), getLeaveStats);

// All leaves (HR, Admin only)
router.get("/", authorizeRoles("hr", "admin"), getAllLeaves);

// Apply leave
router.post("/apply", authorizeRoles("employee", "manager"), applyLeave);

// Review leave (approve/reject)
router.patch(
  "/:id/review",
  authorizeRoles("hr", "admin", "manager"),
  reviewLeave
);

// Cancel leave
router.patch(
  "/:id/cancel",
  authorizeRoles("employee", "manager"),
  cancelLeave
);

// Update leave balance (HR, Admin)
router.patch(
  "/balance/:userId",
  authorizeRoles("hr", "admin"),
  updateLeaveBalance
);

// Get leave by ID (all authenticated — access control inside handler)
router.get(
  "/:id",
  authorizeRoles("employee", "manager", "hr", "admin"),
  getLeaveById
);

export default router;
