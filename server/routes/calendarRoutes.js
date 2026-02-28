import express from "express";
import verifyToken from "../middlewares/authMiddleware.js";
import { getCalendarData } from "../controllers/calendarController.js";

const router = express.Router();

router.get("/", verifyToken, getCalendarData);

export default router;
