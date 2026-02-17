import express from "express";
import {
  getManagers,
  getEmployees,
  createHR,
  getAllHR,
  toggleUserStatus,
} from "../controllers/userControllers.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// All routes below require authentication
router.use(verifyToken);

// Manager routes (for department dropdown)
router.get("/managers", authorizeRoles("admin", "hr"), getManagers);

// Employee routes (for manager assignment dropdown)
router.get("/employees", authorizeRoles("admin", "hr"), getEmployees);

// HR Management routes - Admin only
router.post("/hr", authorizeRoles("admin"), createHR);
router.get("/hr", authorizeRoles("admin"), getAllHR);

// Toggle user status - Admin only
router.patch("/:id/status", authorizeRoles("admin"), toggleUserStatus);

export default router;
