import express from "express";
import {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
} from "../controllers/EmployeeControllers.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Create employee - Admin & HR only
router.post("/", authorizeRoles("admin", "hr"), createEmployee);

// Get all employees - Admin, HR, Manager
router.get("/", authorizeRoles("admin", "hr", "manager"), getAllEmployees);

// Get single employee - Admin, HR, Manager
router.get("/:id", authorizeRoles("admin", "hr", "manager"), getEmployeeById);

// Update employee - Admin & HR only
router.put("/:id", authorizeRoles("admin", "hr"), updateEmployee);

// Delete employee (soft delete) - Admin only
router.delete("/:id", authorizeRoles("admin"), deleteEmployee);

export default router;
