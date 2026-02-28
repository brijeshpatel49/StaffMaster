import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import {
  createTask,
  getMyTasks,
  getTeamTasks,
  getAllTasks,
  getTaskById,
  updateTask,
  updateTaskStatus,
  addTaskUpdate,
  deleteTask,
  getDepartmentEmployees,
} from "../controllers/taskController.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// Specific routes BEFORE parameterized routes
router.get("/my", authorizeRoles("employee"), getMyTasks);
router.get("/team", authorizeRoles("manager"), getTeamTasks);
router.get("/department/employees", authorizeRoles("manager"), getDepartmentEmployees);
router.get("/", authorizeRoles("admin", "hr"), getAllTasks);
router.post("/", authorizeRoles("manager"), createTask);

// Parameterized routes
router.get("/:id", getTaskById);
router.put("/:id", authorizeRoles("manager"), updateTask);
router.delete("/:id", authorizeRoles("manager"), deleteTask);
router.patch("/:id/status", authorizeRoles("employee", "manager"), updateTaskStatus);
router.post("/:id/updates", authorizeRoles("employee", "manager"), addTaskUpdate);

export default router;
