import mongoose from "mongoose";

const employeeProfileSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    departmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    designation: {
      type: String,
      required: true,
      trim: true,
    },
    joiningDate: {
      type: Date,
      required: true,
    },
    employmentType: {
      type: String,
      enum: ["full-time", "part-time", "contract"],
      default: "full-time",
    },
    status: {
      type: String,
      enum: ["active", "resigned", "terminated"],
      default: "active",
    },
  },
  {
    timestamps: true,
  },
);

// Indexes for faster queries (userId already indexed via unique: true)
employeeProfileSchema.index({ departmentId: 1 });
employeeProfileSchema.index({ status: 1 });

const EmployeeProfile = mongoose.model(
  "EmployeeProfile",
  employeeProfileSchema,
);

export default EmployeeProfile;
