import mongoose from "mongoose";

const announcementSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 5,
      maxlength: 100,
    },

    body: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 2000,
    },

    postedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    targetRoles: {
      type: [String],
      enum: ["admin", "hr", "manager", "employee", "all"],
      default: ["all"],
    },

    priority: {
      type: String,
      enum: ["normal", "important", "urgent"],
      default: "normal",
    },

    expiresAt: {
      type: Date,
      required: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },

    pinned: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
announcementSchema.index({ expiresAt: 1 });
announcementSchema.index({ targetRoles: 1 });
announcementSchema.index({ isActive: 1 });
announcementSchema.index({ pinned: -1, createdAt: -1 });

export default mongoose.model("Announcement", announcementSchema);
