import express from "express";
import { getDashboardStats, getAdminAnalytics, getAttendanceOverview } from "../controllers/dashboardController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

// Admin dashboard stats
router.get("/stats", verifyToken, authorizeRoles("admin"), getDashboardStats);

// Admin analytics — charts data
router.get("/analytics", verifyToken, authorizeRoles("admin"), getAdminAnalytics);

// Attendance overview with period filter
router.get("/attendance-overview", verifyToken, authorizeRoles("admin"), getAttendanceOverview);

export default router;
