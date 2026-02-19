import express from "express";
import {
  getHRDashboardStats,
  getEmployeesByDepartment,
} from "../controllers/hrDashboardController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// HR dashboard stats
router.get(
  "/stats",
  verifyToken,
  authorizeRoles("admin", "hr"),
  getHRDashboardStats,
);

// Employees in a specific department
router.get(
  "/department/:id/employees",
  verifyToken,
  authorizeRoles("admin", "hr"),
  getEmployeesByDepartment,
);

export default router;
