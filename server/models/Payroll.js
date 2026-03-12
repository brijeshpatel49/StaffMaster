import mongoose from "mongoose";

const payrollSchema = new mongoose.Schema(
  {
    employeeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    month: {
      type: Number,
      required: true,
      min: 1,
      max: 12,
    },
    year: {
      type: Number,
      required: true,
    },

    // Earnings
    basic: { type: Number, default: 0 },
    hra: { type: Number, default: 0 },
    da: { type: Number, default: 0 },
    special: { type: Number, default: 0 },
    grossEarnings: { type: Number, default: 0 },

    // Deductions
    pf: { type: Number, default: 0 },
    tax: { type: Number, default: 0 },
    lateDeduction: { type: Number, default: 0 },
    leaveDeduction: { type: Number, default: 0 },
    totalDeductions: { type: Number, default: 0 },

    // Net
    netSalary: { type: Number, default: 0 },

    // Attendance summary for payslip
    totalWorkingDays: { type: Number, default: 0 },
    presentDays: { type: Number, default: 0 },
    absentDays: { type: Number, default: 0 },
    lateDays: { type: Number, default: 0 },
    halfDays: { type: Number, default: 0 },
    leaveDays: { type: Number, default: 0 },
    holidays: { type: Number, default: 0 },
    paidDays: { type: Number, default: 0 },

    // Pro-rate info for mid-month joiners
    isProRated: { type: Boolean, default: false },
    proRateDays: { type: Number, default: 0 },

    status: {
      type: String,
      enum: ["draft", "approved", "paid"],
      default: "draft",
    },

    generatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    approvedAt: {
      type: Date,
      default: null,
    },
    paidAt: {
      type: Date,
      default: null,
    },
    paidBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    // If generation was skipped, store the reason
    skippedReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  { timestamps: true }
);

// One payroll record per employee per month
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ month: 1, year: 1 });
payrollSchema.index({ status: 1 });
payrollSchema.index({ employeeId: 1, year: -1, month: -1 });

export default mongoose.model("Payroll", payrollSchema);
