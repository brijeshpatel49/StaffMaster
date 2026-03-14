import express from "express";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { uploadProfilePhoto } from "../config/multer.js";
import {
  getMyProfile,
  updateMyProfile,
  uploadPhoto,
  deletePhoto,
  changePassword,
} from "../controllers/profileController.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/me", getMyProfile);
router.patch("/me", updateMyProfile);
router.patch("/me/photo", uploadProfilePhoto.single("photo"), uploadPhoto);
router.delete("/me/photo", deletePhoto);
router.patch("/change-password", changePassword);

export default router;
