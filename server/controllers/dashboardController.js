import User from "../models/User.js";
import Department from "../models/Department.js";

export const getDashboardStats = async (req, res) => {
  try {
    // Get total employees (role: employee)
    const totalEmployees = await User.countDocuments({ role: "employee" });

    // Get total departments
    const totalDepartments = await Department.countDocuments();

    // Get total managers (role: manager)
    const totalManagers = await User.countDocuments({ role: "manager" });

    // Get total HR (role: hr)
    const totalHR = await User.countDocuments({ role: "hr" });

    // Get active users
    const activeUsers = await User.countDocuments({ isActive: true });

    // Get inactive users
    const inactiveUsers = await User.countDocuments({ isActive: false });

    res.json({
      success: true,
      data: {
        totalEmployees,
        totalDepartments,
        totalManagers,
        totalHR,
        activeUsers,
        inactiveUsers,
      },
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch dashboard statistics",
    });
  }
};
