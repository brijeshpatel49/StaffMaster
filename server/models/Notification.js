import mongoose from "mongoose";

const notificationSchema = new mongoose.Schema(
  {
    recipientId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    senderId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    type: {
      type: String,
      required: true,
      enum: [
        "leave_approved",
        "leave_rejected",
        "leave_request",
        "task_assigned",
        "task_completed",
        "performance_reviewed",
        "payroll_approved",
        "payroll_paid",
        "announcement_posted",
      ],
    },
    title: { type: String, required: true, maxlength: 200 },
    message: { type: String, required: true, maxlength: 500 },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    metadata: { type: Object, default: {} },
  },
  { timestamps: true }
);

notificationSchema.index({ recipientId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 2592000 });

export default mongoose.model("Notification", notificationSchema);
