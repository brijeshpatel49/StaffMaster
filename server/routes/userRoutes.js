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

// All routes require authentication
router.use(verifyToken);

// ── Admin & HR ──────────────────────────────────────────────────────────────
router.get("/managers", authorizeRoles("admin", "hr"), getManagers);
router.get("/employees", authorizeRoles("admin", "hr"), getEmployees);

// ── Admin only ──────────────────────────────────────────────────────────────
router.post("/hr", authorizeRoles("admin"), createHR);
router.get("/hr", authorizeRoles("admin"), getAllHR);
router.patch("/:id/status", authorizeRoles("admin"), toggleUserStatus);

export default router;
