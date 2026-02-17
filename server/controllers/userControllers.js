import User from "../models/User.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

// @desc    Get all managers (for department assignment dropdown)
// @route   GET /api/users/managers
// @access  Private/Admin/HR
const getManagers = async (req, res) => {
  try {
    const managers = await User.find({
      role: "manager",
      isActive: true,
    }).select("_id fullName email");
    res.status(200).json({ success: true, managers });
  } catch (error) {
    console.error("Get Managers Error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Create HR user
// @route   POST /api/users/hr
// @access  Private/Admin
const createHR = async (req, res) => {
  try {
    const { fullName, email } = req.body;

    // Validate required fields
    if (!fullName || !email) {
      return res
        .status(400)
        .json({ success: false, message: "Full name and email are required" });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res
        .status(400)
        .json({ success: false, message: "Email already exists" });
    }

    // Generate temporary password
    const tempPassword = `HR@${Date.now().toString().slice(-6)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    const hrUser = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role: "hr",
      mustChangePassword: true,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "HR created successfully",
      data: {
        _id: hrUser._id,
        fullName: hrUser.fullName,
        email: hrUser.email,
        role: hrUser.role,
        isActive: hrUser.isActive,
        createdAt: hrUser.createdAt,
        tempPassword, // Send temporary password so admin can share it
      },
    });
  } catch (error) {
    console.error("Create HR Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all HR users
// @route   GET /api/users/hr
// @access  Private/Admin
const getAllHR = async (req, res) => {
  try {
    const hrUsers = await User.find({ role: "hr" })
      .select("-password -__v")
      .populate("createdBy", "fullName")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: hrUsers.length,
      data: hrUsers,
    });
  } catch (error) {
    console.error("Get All HR Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all employees (for manager assignment dropdown)
// @route   GET /api/users/employees
// @access  Private/Admin/HR
const getEmployees = async (req, res) => {
  try {
    const employees = await User.find({
      role: "employee",
      isActive: true,
    }).select("_id fullName email");
    res.status(200).json({ success: true, employees });
  } catch (error) {
    console.error("Get Employees Error:", error);
    res.status(500).json({ success: false, error: "Server Error" });
  }
};

// @desc    Toggle user status (Active/Inactive)
// @route   PATCH /api/users/:id/status
// @access  Private/Admin
const toggleUserStatus = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    // Prevent admin from deactivating themselves
    if (id === req.user._id.toString()) {
      return res
        .status(400)
        .json({ success: false, message: "You cannot deactivate yourself" });
    }

    const user = await User.findById(id).select("-password");

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      success: true,
      message: `User ${user.isActive ? "activated" : "deactivated"} successfully`,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error) {
    console.error("Toggle User Status Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  getManagers,
  getEmployees,
  createHR,
  getAllHR,
  toggleUserStatus,
};
