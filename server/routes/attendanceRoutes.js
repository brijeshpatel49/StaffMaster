import express from "express";
import {
  checkIn,
  checkOut,
  getTodayStatus,
  getMyAttendance,
  getTeamAttendance,
  getAllAttendance,
  getAttendanceByEmployee,
  markAttendanceManual,
  getAttendanceSummary,
} from "../controllers/attendanceController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ── Employee & Manager (self) ────────────────────────────────────────────────
router.post("/checkin", authorizeRoles("employee", "manager"), checkIn);
router.post("/checkout", authorizeRoles("employee", "manager"), checkOut);
router.get("/today", authorizeRoles("employee", "manager"), getTodayStatus);
router.get("/my", authorizeRoles("employee", "manager"), getMyAttendance);

// ── Manager (team) ──────────────────────────────────────────────────────────
router.get("/team", authorizeRoles("manager"), getTeamAttendance);

// ── Admin & HR ──────────────────────────────────────────────────────────────
router.get("/summary", authorizeRoles("admin", "hr"), getAttendanceSummary);
router.post("/manual", authorizeRoles("admin", "hr"), markAttendanceManual);

// ── Parameterized (must come after specific routes) ─────────────────────────
router.get(
  "/employee/:employeeId",
  authorizeRoles("admin", "hr", "manager"),
  getAttendanceByEmployee
);

// ── All attendance (admin, hr) ──────────────────────────────────────────────
router.get("/", authorizeRoles("admin", "hr"), getAllAttendance);

export default router;
