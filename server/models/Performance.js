import mongoose from "mongoose";

const performanceSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    managerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    period: {
      month: { type: Number, required: true, min: 1, max: 12 },
      year: { type: Number, required: true, min: 2024 },
    },
    status: {
      type: String,
      enum: ["pending", "completed"],
      default: "pending",
    },

    // ── Auto-calculated scores ──
    attendanceScore: {
      present: { type: Number, default: 0 },
      late: { type: Number, default: 0 },
      absent: { type: Number, default: 0 },
      halfDay: { type: Number, default: 0 },
      onLeave: { type: Number, default: 0 },
      totalWorkingDays: { type: Number, default: 0 },
      attendancePercentage: { type: Number, default: 0 },
      score: { type: Number, default: 1, min: 1, max: 5 },
    },
    taskScore: {
      totalAssigned: { type: Number, default: 0 },
      completed: { type: Number, default: 0 },
      inProgress: { type: Number, default: 0 },
      overdue: { type: Number, default: 0 },
      cancelled: { type: Number, default: 0 },
      completionRate: { type: Number, default: 0 },
      onTimeRate: { type: Number, default: 0 },
      score: { type: Number, default: 3, min: 1, max: 5 },
      note: { type: String, default: "" },
    },
    autoScore: { type: Number, default: 0 },

    // ── Manager review ──
    managerRating: { type: Number, min: 1, max: 5, default: null },
    strengths: { type: String, trim: true, maxlength: 1000 },
    areasOfImprovement: { type: String, trim: true, maxlength: 1000 },
    goals: { type: String, trim: true, maxlength: 1000 },
    additionalComments: { type: String, trim: true, maxlength: 500 },
    reviewedAt: { type: Date, default: null },

    // ── Final ──
    finalScore: { type: Number, default: null },
    grade: {
      type: String,
      enum: ["A", "B", "C", "D", "F"],
      default: null,
    },
  },
  { timestamps: true }
);

// Indexes
performanceSchema.index(
  { employeeId: 1, "period.month": 1, "period.year": 1 },
  { unique: true }
);
performanceSchema.index({ managerId: 1, status: 1 });
performanceSchema.index({ departmentId: 1, "period.year": 1 });
performanceSchema.index({ status: 1 });

// ── Static methods ──

performanceSchema.statics.calculateAttendanceScore = function (percentage) {
  if (percentage >= 95) return 5;
  if (percentage >= 85) return 4;
  if (percentage >= 75) return 3;
  if (percentage >= 65) return 2;
  return 1;
};

performanceSchema.statics.calculateTaskScore = function (
  completionRate,
  onTimeRate
) {
  const combined = completionRate * 0.6 + onTimeRate * 0.4;
  if (combined >= 90) return 5;
  if (combined >= 75) return 4;
  if (combined >= 60) return 3;
  if (combined >= 45) return 2;
  return 1;
};

performanceSchema.statics.calculateGrade = function (finalScore) {
  if (finalScore >= 4.5) return "A";
  if (finalScore >= 3.5) return "B";
  if (finalScore >= 2.5) return "C";
  if (finalScore >= 1.5) return "D";
  return "F";
};

export default mongoose.model("Performance", performanceSchema);
