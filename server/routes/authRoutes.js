import express from "express";
import authController from "../controllers/authControllers.js";
const router = express.Router();
router.post("/login", authController.login);

export default router;
