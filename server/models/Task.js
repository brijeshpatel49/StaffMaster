import mongoose from "mongoose";

const updateSchema = new mongoose.Schema(
  {
    message: { type: String, required: true, trim: true },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    updatedAt: { type: Date, default: Date.now },
    statusChange: { type: String }, // "todo → in_progress"
  },
  { _id: true }
);

const taskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
      minlength: 3,
      maxlength: 150,
    },

    description: {
      type: String,
      trim: true,
      maxlength: 2000,
    },

    assignedTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },

    priority: {
      type: String,
      enum: ["low", "medium", "high", "urgent"],
      default: "medium",
    },

    status: {
      type: String,
      enum: ["todo", "in_progress", "completed", "cancelled"],
      default: "todo",
    },

    deadline: {
      type: Date,
      required: true,
    },

    completedAt: {
      type: Date,
      default: null,
    },

    cancelledAt: {
      type: Date,
      default: null,
    },

    cancelledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    cancelReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },

    updates: [updateSchema],

    estimatedHours: {
      type: Number,
      min: 0.5,
      max: 999,
    },

    actualHours: {
      type: Number,
      min: 0,
      default: null,
    },

    tags: {
      type: [String],
      validate: {
        validator: (v) => v.length <= 5,
        message: "Maximum 5 tags allowed",
      },
    },
  },
  { timestamps: true }
);

// Indexes
taskSchema.index({ assignedTo: 1, status: 1 });
taskSchema.index({ assignedBy: 1, status: 1 });
taskSchema.index({ departmentId: 1, status: 1 });
taskSchema.index({ deadline: 1 });
taskSchema.index({ assignedTo: 1, deadline: 1 });

export default mongoose.model("Task", taskSchema);
