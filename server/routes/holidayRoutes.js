import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import authorizeRoles from "../middlewares/authorizeRoles.js";
import {
  createHoliday,
  getAllHolidays,
  getUpcomingHolidays,
  updateHoliday,
  deleteHoliday,
  bulkCreateHolidays,
} from "../controllers/holidayController.js";

const router = express.Router();

// Order matters — specific routes before :id
router.get("/upcoming", verifyToken, getUpcomingHolidays);
router.get("/", verifyToken, getAllHolidays);
router.post("/bulk", verifyToken, authorizeRoles("admin"), bulkCreateHolidays);
router.post("/", verifyToken, authorizeRoles("admin"), createHoliday);
router.get("/:id", verifyToken, async (req, res) => {
  try {
    const { default: Holiday } = await import("../models/Holiday.js");
    const holiday = await Holiday.findById(req.params.id).populate("createdBy", "fullName");
    if (!holiday) return res.status(404).json({ success: false, message: "Holiday not found" });
    return res.json({ success: true, data: holiday });
  } catch (err) {
    return res.status(500).json({ success: false, message: "Server error" });
  }
});
router.put("/:id", verifyToken, authorizeRoles("admin"), updateHoliday);
router.delete("/:id", verifyToken, authorizeRoles("admin"), deleteHoliday);

export default router;
