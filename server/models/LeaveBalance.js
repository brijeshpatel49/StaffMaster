import mongoose from "mongoose";

const leaveTypeSchema = {
  total: { type: Number, default: 0 },
  used: { type: Number, default: 0 },
  remaining: { type: Number, default: 0 },
};

const leaveBalanceSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year: {
      type: Number,
      required: true,
    },
    casual: {
      total: { type: Number, default: 12 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 12 },
    },
    sick: {
      total: { type: Number, default: 10 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 10 },
    },
    annual: {
      total: { type: Number, default: 15 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 15 },
    },
    unpaid: {
      total: { type: Number, default: 999 },
      used: { type: Number, default: 0 },
      remaining: { type: Number, default: 999 },
    },
  },
  {
    timestamps: true,
  }
);

// Composite unique index
leaveBalanceSchema.index({ userId: 1, year: 1 }, { unique: true });

/**
 * Find existing balance or create with defaults for the given user+year.
 * Uses findOneAndUpdate with upsert for atomicity.
 */
leaveBalanceSchema.statics.getOrCreate = async function (userId, year) {
  const balance = await this.findOneAndUpdate(
    { userId, year },
    {
      $setOnInsert: {
        userId,
        year,
        casual: { total: 12, used: 0, remaining: 12 },
        sick: { total: 10, used: 0, remaining: 10 },
        annual: { total: 15, used: 0, remaining: 15 },
        unpaid: { total: 999, used: 0, remaining: 999 },
      },
    },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  );
  return balance;
};

export default mongoose.model("LeaveBalance", leaveBalanceSchema);
