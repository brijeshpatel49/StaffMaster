import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import LeaveBalance from "../models/LeaveBalance.js";
import Attendance from "../models/Attendance.js";
import cloudinary from "../config/cloudinary.js";
import bcrypt from "bcrypt";

// Helper to extract public_id
const getPublicId = (url) => {
  const parts = url.split("/");
  const filename = parts[parts.length - 1].split(".")[0];
  return `staffmaster/profiles/${filename}`;
};

export const getMyProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select("-password").lean();
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    const employeeProfile = await EmployeeProfile.findOne({ userId: req.user._id })
      .populate("departmentId", "name code manager")
      .lean();

    let department = null;
    let reportingTo = null;

    if (employeeProfile && employeeProfile.departmentId) {
      department = {
        name: employeeProfile.departmentId.name,
        code: employeeProfile.departmentId.code,
      };

      if (employeeProfile.departmentId.manager) {
        const manager = await User.findById(employeeProfile.departmentId.manager).select("fullName").lean();
        if (manager) reportingTo = manager.fullName;
      }
    }

    const currentYear = new Date().getFullYear();
    const leaveBalance = await LeaveBalance.findOne({
      userId: req.user._id,
      year: currentYear,
    }).lean();

    // Attendance summary for this month
    const startOfMonth = new Date();
    startOfMonth.setDate(1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(startOfMonth);
    endOfMonth.setMonth(startOfMonth.getMonth() + 1);

    const attendances = await Attendance.find({
      userId: req.user._id,
      date: { $gte: startOfMonth, $lt: endOfMonth },
    }).lean();

    const attendanceSummary = {
      present: 0,
      late: 0,
      absent: 0,
      halfDay: 0,
      onLeave: 0,
    };

    attendances.forEach((record) => {
      if (record.status === "Present" && !record.isHalfDay) attendanceSummary.present++;
      if (record.status === "Present" && record.isHalfDay) attendanceSummary.halfDay++;
      if (record.status === "Absent") attendanceSummary.absent++;
      if (record.status === "On Leave") attendanceSummary.onLeave++;
      if (record.isLate) attendanceSummary.late++;
    });

    res.status(200).json({
      success: true,
      data: {
        user,
        employeeProfile: employeeProfile
          ? {
              designation: employeeProfile.designation,
              joiningDate: employeeProfile.joiningDate,
              employmentType: employeeProfile.employmentType,
              status: employeeProfile.status,
            }
          : null,
        department,
        reportingTo,
        leaveBalance: leaveBalance
          ? {
              casual: leaveBalance.casual,
              sick: leaveBalance.sick,
              annual: leaveBalance.annual,
              unpaid: leaveBalance.unpaid,
            }
          : null,
        attendanceSummary,
      },
    });
  } catch (error) {
    console.error("getMyProfile Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { phone, dateOfBirth, gender, address } = req.body;

    const updates = {};

    if (phone !== undefined) {
      const strippedPhone = phone.replace(/[\s-]/g, "");
      if (strippedPhone.length > 0 && strippedPhone.length !== 10) {
        return res.status(400).json({ success: false, message: "Phone number must be 10 digits" });
      }
      updates.phone = strippedPhone;
    }

    if (dateOfBirth !== undefined) {
      if (dateOfBirth) {
        const dob = new Date(dateOfBirth);
        const age = (Date.now() - dob.getTime()) / (365 * 24 * 60 * 60 * 1000);
        if (age < 18) return res.status(400).json({ success: false, message: "Must be 18 or older" });
        if (age > 70) return res.status(400).json({ success: false, message: "Please verify date of birth" });
        updates.dateOfBirth = dob;
      } else {
        updates.dateOfBirth = null;
      }
    }

    if (gender !== undefined) {
      if (gender && !["male", "female", "other"].includes(gender)) {
        return res.status(400).json({ success: false, message: "Invalid gender" });
      }
      updates.gender = gender;
    }

    if (address !== undefined) {
      updates.address = {
        city: address.city || null,
        state: address.state || null,
      };
    }

    const user = await User.findByIdAndUpdate(req.user._id, { $set: updates }, { new: true }).select("-password");

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error("updateMyProfile Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const uploadPhoto = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded" });
    }

    const user = await User.findById(req.user._id);

    // Delete old profile photo if it exists
    if (user.profilePhoto) {
      try {
        const public_id = getPublicId(user.profilePhoto);
        await cloudinary.uploader.destroy(public_id);
      } catch (err) {
        console.error("Failed to delete old photo from Cloudinary:", err);
      }
    }

    user.profilePhoto = req.file.path;
    await user.save();

    res.status(200).json({ success: true, profilePhoto: user.profilePhoto });
  } catch (error) {
    console.error("uploadPhoto Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const deletePhoto = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user.profilePhoto) {
      return res.status(400).json({ success: false, message: "No photo to delete" });
    }

    const public_id = getPublicId(user.profilePhoto);
    await cloudinary.uploader.destroy(public_id);

    user.profilePhoto = null;
    await user.save();

    res.status(200).json({ success: true });
  } catch (error) {
    console.error("deletePhoto Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, message: "Passwords don't match" });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ success: false, message: "Min 8 characters required" });
    }

    const passwordRegex = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/;
    if (!passwordRegex.test(newPassword)) {
      return res.status(400).json({ success: false, message: "Must contain letters and numbers" });
    }

    const user = await User.findById(req.user._id).select("+password");

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect" });
    }

    const isSame = await bcrypt.compare(newPassword, user.password);
    if (isSame) {
      return res.status(400).json({ success: false, message: "New password must be different" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    user.password = hashedPassword;
    user.passwordChangedAt = new Date();
    user.mustChangePassword = false;
    await user.save();

    res.status(200).json({ success: true, message: "Password updated! Please login again on other devices." });
  } catch (error) {
    console.error("changePassword Error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
