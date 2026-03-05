import bcrypt from "bcrypt";
import User from "../models/User.js";
import OTP from "../models/OTP.js";
import { sendOTPEmail } from "../utils/emailService.js";

// POST /api/auth/forgot-password
export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ success: false, message: "Email is required." });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "No account found with this email address.",
      });
    }

    if (user.isActive === false) {
      return res.status(400).json({
        success: false,
        message: "Account is disabled. Contact HR.",
      });
    }

    // Rate limit: check if OTP was sent in last 60 seconds
    const recentOTP = await OTP.findOne({
      email: normalizedEmail,
      createdAt: { $gt: new Date(Date.now() - 60 * 1000) },
    });

    if (recentOTP) {
      return res.status(429).json({
        success: false,
        message: "Please wait before requesting another OTP.",
      });
    }

    // Generate 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOTP = await bcrypt.hash(otp, 10);

    // Delete any existing OTPs for this email
    await OTP.deleteMany({ email: normalizedEmail });

    // Save new OTP
    await OTP.create({
      email: normalizedEmail,
      otp: hashedOTP,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      isUsed: false,
      attempts: 0,
    });

    // Send OTP email — if it fails, delete the record and return 500
    try {
      await sendOTPEmail({ fullName: user.fullName, email: normalizedEmail, otp });
    } catch (emailErr) {
      console.error("OTP email send failed:", emailErr.message);
      await OTP.deleteMany({ email: normalizedEmail });
      return res.status(500).json({
        success: false,
        message: "Failed to send OTP email. Please try again.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "If this email exists, OTP has been sent.",
    });
  } catch (error) {
    console.error("sendOTP error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// POST /api/auth/check-otp  — just verifies the OTP, does NOT reset password
export const checkOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: "Email and OTP are required." });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    const record = await OTP.findOne({
      email: normalizedEmail,
      isUsed: false,
      expiresAt: { $gt: now },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "OTP expired or invalid. Please request a new one.",
      });
    }

    if (record.attempts >= 3) {
      await OTP.deleteOne({ _id: record._id });
      return res.status(400).json({
        success: false,
        message: "Too many wrong attempts. Please request a new OTP.",
      });
    }

    const isValid = await bcrypt.compare(otp, record.otp);
    if (!isValid) {
      record.attempts += 1;
      await record.save();
      const remaining = 3 - record.attempts;
      if (remaining <= 0) {
        await OTP.deleteOne({ _id: record._id });
        return res.status(400).json({
          success: false,
          message: "Too many wrong attempts. Please request a new OTP.",
        });
      }
      return res.status(400).json({
        success: false,
        message: `Wrong OTP. ${remaining} attempt${remaining === 1 ? "" : "s"} remaining.`,
      });
    }

    // Mark as verified so the reset step can proceed
    record.isVerified = true;
    await record.save();

    return res.status(200).json({ success: true, message: "OTP verified." });
  } catch (error) {
    console.error("checkOTP error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};

// POST /api/auth/verify-otp  — resets password after OTP already verified
export const verifyOTP = async (req, res) => {
  try {
    const { email, newPassword } = req.body;

    if (!email || !newPassword) {
      return res.status(400).json({ success: false, message: "All fields are required." });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters.",
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const now = new Date();

    // Find a verified OTP record
    const record = await OTP.findOne({
      email: normalizedEmail,
      isVerified: true,
      isUsed: false,
      expiresAt: { $gt: now },
    });

    if (!record) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please verify your OTP again.",
      });
    }

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        success: false,
        message: "New password must be different from current password.",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await User.findByIdAndUpdate(user._id, {
      password: hashedPassword,
      mustChangePassword: false,
      passwordChangedAt: new Date(),
    });

    await OTP.deleteOne({ _id: record._id });

    return res.status(200).json({
      success: true,
      message: "Password reset successful. Please login.",
    });
  } catch (error) {
    console.error("verifyOTP error:", error);
    return res.status(500).json({ success: false, message: "Server error." });
  }
};
