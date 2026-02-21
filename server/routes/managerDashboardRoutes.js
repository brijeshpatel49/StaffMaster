import express from "express";
import { getManagerTeam } from "../controllers/managerDashboardController.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Route: GET /api/manager/team
// Access: verifyToken, authorizeRoles("manager")
router.get("/team", verifyToken, authorizeRoles("manager"), getManagerTeam);

export default router;
