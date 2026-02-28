import mongoose from "mongoose";

const holidaySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
      minlength: 2,
      maxlength: 100,
    },
    date: {
      type: Date,
      required: true,
    },
    type: {
      type: String,
      enum: ["national", "regional", "company"],
      default: "national",
    },
    description: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    isRecurring: {
      type: Boolean,
      default: false,
    },
    year: {
      type: Number,
      required: true,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Indexes
holidaySchema.index({ date: 1 }, { unique: true });
holidaySchema.index({ year: 1 });
holidaySchema.index({ isActive: 1 });
holidaySchema.index({ type: 1 });

/**
 * Static method: check if a given date is a holiday
 * @param {Date} date
 * @returns {Object|null} holiday document or null
 */
holidaySchema.statics.isHoliday = async function (date) {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return this.findOne({ date: d, isActive: true });
};

export default mongoose.model("Holiday", holidaySchema);
