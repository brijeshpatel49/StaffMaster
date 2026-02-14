import express from "express";
import { getEmployees } from "../controllers/userControllers.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Protected routes
router.use(verifyToken);

// Get all employees (for dropdowns etc.) - Admin/HR only
router.get("/employees", authorizeRoles("admin", "hr"), getEmployees);

export default router;
