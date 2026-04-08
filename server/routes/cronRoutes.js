import express from "express";
import { runDailyJobs } from "../jobs/autoCheckout.js";
import { generatePreviousMonthReviews } from "../jobs/performanceCron.js";
import { generatePayrollForPreviousMonth } from "../jobs/payrollCron.js";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";

const router = express.Router();

// ── Helper: Validate cron secret from Authorization header ────────────────────
const validateCronSecret = (req) => {
  // Vercel automatically sends this on every cron call
  // No setup needed, no secret needed
  if (req.headers["x-vercel-cron"] === "1") return true;

  // For manual testing via Postman only
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const token = (req.headers.authorization || "").replace("Bearer ", "");
  return token === secret;
};

// ── Manual trigger (Admin only) ───────────────────────────────────────────────
// POST /api/cron/trigger-auto-checkout
// Called manually from the admin panel to run daily attendance jobs immediately.
router.post(
  "/trigger-auto-checkout",
  verifyToken,
  authorizeRoles("admin"),
  async (req, res) => {
    try {
      console.log("[Manual Trigger] Admin triggered daily attendance jobs.");
      const summary = await runDailyJobs();
      return res.json({
        success: true,
        message: "Daily attendance jobs executed successfully",
        data: summary,
      });
    } catch (err) {
      console.error("[Manual Trigger] Error:", err.message);
      return res.status(500).json({
        success: false,
        message: "Failed to run daily attendance jobs",
        error: err.message,
      });
    }
  },
);

// ── Production Cron Endpoints (Secret protected) ──────────────────────────────
// These are meant to be called by an external cron service (e.g. cron-job.org,
// Render cron jobs, GitHub Actions, etc.) in production.
// They are protected by a shared secret passed via: Authorization: Bearer <CRON_SECRET>

// GET /api/cron/internal/daily-attendance
router.get("/internal/daily-attendance", async (req, res) => {
  if (!validateCronSecret(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    const summary = await runDailyJobs();
    return res.json({
      success: true,
      message: "Daily attendance cron executed",
      data: summary,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Daily attendance cron failed",
      error: err.message,
    });
  }
});

// GET /api/cron/internal/payroll
router.get("/internal/payroll", async (req, res) => {
  if (!validateCronSecret(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    await generatePayrollForPreviousMonth();
    return res.json({ success: true, message: "Payroll cron executed" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Payroll cron failed",
      error: err.message,
    });
  }
});

// GET /api/cron/internal/performance
router.get("/internal/performance", async (req, res) => {
  if (!validateCronSecret(req)) {
    return res.status(401).json({ success: false, message: "Unauthorized" });
  }
  try {
    await generatePreviousMonthReviews();
    return res.json({ success: true, message: "Performance cron executed" });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Performance cron failed",
      error: err.message,
    });
  }
});

export default router;

//  Add this lines to vercel.json to enable cronjobs
// ,
//   "crons": [
//     {
//       "path": "/api/cron/internal/daily-attendance",
//       "schedule": "0 13 * * *"
//     },
//     {
//       "path": "/api/cron/internal/payroll",
//       "schedule": "0 2 1 * *"
//     },
//     {
//       "path": "/api/cron/internal/performance",
//       "schedule": "0 3 1 * *"
//     }
//   ]