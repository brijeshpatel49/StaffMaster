import express from "express";
import authController from "../controllers/authControllers.js";
import { sendOTP, checkOTP, verifyOTP } from "../controllers/otpController.js";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", authController.login);
router.patch("/change-password", verifyToken, authController.changePassword);
router.get("/profile", verifyToken, authController.getProfile);
router.post("/forgot-password", sendOTP);
router.post("/check-otp", checkOTP);
router.post("/verify-otp", verifyOTP);

export default router;
