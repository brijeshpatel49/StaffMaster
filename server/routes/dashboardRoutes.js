import express from "express";
import { getDashboardStats } from "../controllers/dashboardController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
const router = express.Router();

// Admin dashboard stats
router.get("/stats", verifyToken, authorizeRoles("admin"), getDashboardStats);

export default router;
