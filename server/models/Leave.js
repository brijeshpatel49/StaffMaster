import mongoose from "mongoose";

const leaveSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    leaveType: {
      type: String,
      enum: ["casual", "sick", "annual", "unpaid"],
      required: true,
    },
    fromDate: {
      type: Date,
      required: true,
    },
    toDate: {
      type: Date,
      required: true,
    },
    totalDays: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      minlength: 10,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled"],
      default: "pending",
    },
    appliedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    rejectionReason: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    isHalfDay: {
      type: Boolean,
      default: false,
    },
    attendanceMarked: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
leaveSchema.index({ employeeId: 1, status: 1 });
leaveSchema.index({ employeeId: 1, fromDate: 1 });
leaveSchema.index({ fromDate: 1, toDate: 1 });
leaveSchema.index({ status: 1 });

export default mongoose.model("Leave", leaveSchema);

/**
 * Calculate the number of leave days between two dates (inclusive),
 * excluding Sundays and holidays. If isHalfDay is true, returns 0.5.
 * Now async — queries Holiday collection.
 */
export async function calculateLeaveDays(fromDate, toDate, isHalfDay) {
  if (isHalfDay) return 0.5;

  const start = new Date(fromDate);
  const end = new Date(toDate);
  start.setUTCHours(0, 0, 0, 0);
  end.setUTCHours(0, 0, 0, 0);

  // Fetch holidays in the date range once
  let holidayDateSet = new Set();
  try {
    const { default: Holiday } = await import("./Holiday.js");
    const holidays = await Holiday.find({
      date: { $gte: start, $lte: end },
      isActive: true,
    }).select("date").lean();
    holidayDateSet = new Set(holidays.map((h) => h.date.toISOString().split("T")[0]));
  } catch {
    // If Holiday model not available, skip holiday exclusion
  }

  let count = 0;
  const current = new Date(start);

  while (current <= end) {
    // Skip Sundays
    if (current.getUTCDay() !== 0) {
      const dateStr = current.toISOString().split("T")[0];
      // Skip holidays
      if (!holidayDateSet.has(dateStr)) {
        count++;
      }
    }
    current.setUTCDate(current.getUTCDate() + 1);
  }

  return count;
}
