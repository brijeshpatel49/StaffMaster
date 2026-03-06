import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import {
  generateMonthlyReviews,
  regenerateScores,
  getPendingReviews,
  getTeamPerformance,
  getPerformanceById,
  submitReview,
  getMyPerformance,
  getAllPerformance,
  getPerformanceSummary,
  getPerformanceTrend,
} from "../controllers/performanceController.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Specific routes BEFORE parameterized routes
router.get("/my", authorizeRoles("employee", "manager"), getMyPerformance);
router.get("/pending", authorizeRoles("manager"), getPendingReviews);
router.get("/team", authorizeRoles("manager"), getTeamPerformance);
router.get("/summary", authorizeRoles("admin", "hr"), getPerformanceSummary);
router.get("/trend", authorizeRoles("admin", "hr"), getPerformanceTrend);
router.get("/", authorizeRoles("admin", "hr"), getAllPerformance);
router.post("/generate", authorizeRoles("admin", "hr"), generateMonthlyReviews);
router.patch("/regenerate", authorizeRoles("admin", "hr"), regenerateScores);

// Parameterized routes
router.get("/:id", getPerformanceById);
router.patch("/:id/review", authorizeRoles("manager"), submitReview);

export default router;
