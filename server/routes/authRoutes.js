import express from "express";
import authController from "../controllers/authControllers.js";
import verifyToken from "../middlewares/authMiddleware.js";

const router = express.Router();

router.post("/login", authController.login);
router.patch("/change-password", verifyToken, authController.changePassword);
router.get("/profile", verifyToken, authController.getProfile);

export default router;
