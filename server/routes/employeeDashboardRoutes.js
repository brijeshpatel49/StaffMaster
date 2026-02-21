import express from "express";
import { getEmployeeMe } from "../controllers/employeeDashboardController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Route: GET /api/employee/me
// Access: verifyToken, authorizeRoles("employee")
router.get("/me", verifyToken, authorizeRoles("employee"), getEmployeeMe);

export default router;
