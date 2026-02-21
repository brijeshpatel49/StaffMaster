import EmployeeProfile from "../models/EmployeeProfile.js";
import User from "../models/User.js";

export const getEmployeeMe = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    const user = await User.findById(userId).select("-password");
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const profile = await EmployeeProfile.findOne({ userId }).populate(
      "departmentId",
      "name code",
    );

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        fullName: user.fullName,
        email: user.email,
        department: {
          name: profile.departmentId?.name,
          code: profile.departmentId?.code,
        },
        designation: profile.designation,
        employmentType: profile.employmentType,
        joiningDate: profile.joiningDate,
        status: profile.status,
      },
    });
  } catch (error) {
    console.error("Error in getEmployeeMe:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
