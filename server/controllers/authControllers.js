import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";

// @desc    Login user
// @route   POST /api/auth/login
// @access  Public
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    if (!user.isActive) {
      return res
        .status(403)
        .json({ success: false, error: "Account is disabled. Contact HR." });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res
        .status(401)
        .json({ success: false, error: "Invalid credentials" });
    }

    // Include mustChangePassword and fullName in JWT payload
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        fullName: user.fullName,
        mustChangePassword: user.mustChangePassword,
      },

      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    user.lastLogin = new Date();
    await user.save();

    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        mustChangePassword: user.mustChangePassword,
      },
      message: "Login successful",
    });
  } catch (error) {
    console.error("Login Error:", error);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// @desc    Force change password
// @route   PATCH /api/auth/change-password
// @access  Private (any logged-in user)
const changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current password and new password are required",
      });
    }

    // Password strength validation
    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 8 characters long",
      });
    }

    // Prevent reusing same password
    if (currentPassword === newPassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password",
      });
    }

    // Find user with password field
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    user.password = hashedPassword;
    user.mustChangePassword = false;
    user.passwordChangedAt = new Date();
    await user.save();

    // Issue a fresh token with updated mustChangePassword
    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
        fullName: user.fullName,
        mustChangePassword: false,
      },
      process.env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    res.status(200).json({
      success: true,
      message: "Password updated successfully",
      token,
    });
  } catch (error) {
    console.error("Change Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get user profile data (common)
// @route   GET /api/auth/profile
// @access  Private
const getProfile = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    // Base user fetch
    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    let profileData = {
      fullName: user.fullName,
      email: user.email,
      role: user.role,
      status: user.isActive ? "Active" : "Inactive",
    };

    // Only attach joining/employee data for employees and managers
    if (user.role === "employee" || user.role === "manager") {
      const empProfile = await EmployeeProfile.findOne({ userId });
      if (empProfile) {
        profileData.joiningDate = empProfile.joiningDate;
        profileData.designation = empProfile.designation;
      }
    }

    return res.status(200).json({
      success: true,
      data: profileData,
    });
  } catch (error) {
    console.error("Get Profile Error:", error);
    res.status(500).json({ success: false, message: "Internal server error" });
  }
};

export default { login, changePassword, getProfile };
