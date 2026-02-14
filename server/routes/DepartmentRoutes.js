import express from "express";
import {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
} from "../controllers/DepartmentControllers.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// Protected routes
router.use(verifyToken);

router.post("/", authorizeRoles("admin"), createDepartment);
router.get("/", authorizeRoles("admin", "hr"), getDepartments);
router.get("/:id", authorizeRoles("admin", "hr"), getDepartmentById);
router.put("/:id", authorizeRoles("admin"), updateDepartment);
router.patch("/:id/status", authorizeRoles("admin"), toggleDepartmentStatus);

export default router;
