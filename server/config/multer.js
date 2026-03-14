import multer from "multer";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import cloudinary from "./cloudinary.js";

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "StaffMaster-Profiles",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation: [
      { width: 400, height: 400, crop: "fill", gravity: "face" }
    ],
  },
});

export const uploadProfilePhoto = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});
