import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import {
  getAllSalaryStructures,
  bulkSetSalaryStructure,
  setSalaryStructure,
  getSalaryStructure,
  generatePayroll,
  regeneratePayroll,
  approvePayroll,
  bulkApprove,
  markPaid,
  bulkPay,
  getMyPayroll,
  getMyLatestPayroll,
  getTeamPayroll,
  getAllPayroll,
  getPayrollSummary,
  getPayrollById,
  downloadPayslip,
} from "../controllers/payrollController.js";

const router = express.Router();

// All routes require authentication
router.use(verifyToken);

// ── Employee routes ──
router.get("/my", getMyPayroll);
router.get("/my/latest", getMyLatestPayroll);

// ── Manager routes ──
router.get("/team", authorizeRoles("manager"), getTeamPayroll);

// ── HR / Admin routes ──
router.get(
  "/salary-structures",
  authorizeRoles("admin", "hr"),
  getAllSalaryStructures
);
router.post(
  "/salary-structures/bulk",
  authorizeRoles("admin", "hr"),
  bulkSetSalaryStructure
);
router.post(
  "/salary-structure",
  authorizeRoles("admin", "hr"),
  setSalaryStructure
);
router.get(
  "/salary-structure/:employeeId",
  authorizeRoles("admin", "hr"),
  getSalaryStructure
);
router.post("/generate", authorizeRoles("admin", "hr"), generatePayroll);
router.post("/regenerate", authorizeRoles("admin", "hr"), regeneratePayroll);
router.patch("/bulk-approve", authorizeRoles("admin", "hr"), bulkApprove);
router.patch("/bulk-pay", authorizeRoles("admin", "hr"), bulkPay);
router.get("/all", authorizeRoles("admin", "hr"), getAllPayroll);
router.get("/summary", authorizeRoles("admin", "hr"), getPayrollSummary);

// ── Parameterized routes (must come AFTER specific routes) ──
router.get("/:id", getPayrollById);
router.get("/:id/download", downloadPayslip);
router.patch("/:id/approve", authorizeRoles("admin", "hr"), approvePayroll);
router.patch("/:id/mark-paid", authorizeRoles("admin", "hr"), markPaid);

export default router;
