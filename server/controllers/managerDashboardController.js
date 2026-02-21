import Department from "../models/Department.js";
import EmployeeProfile from "../models/EmployeeProfile.js";

export const getManagerTeam = async (req, res) => {
  try {
    const managerId = req.user._id || req.user.id; // handle based on how req.user is set

    const department = await Department.findOne({
      manager: managerId,
      isActive: true,
    });

    if (!department) {
      return res.status(404).json({
        success: false,
        message: "Manager not assigned to any department",
      });
    }

    const employees = await EmployeeProfile.find({
      departmentId: department._id,
      userId: { $ne: managerId },
    })
      .populate("userId", "fullName email isActive")
      .populate("departmentId", "name code");

    const totalMembers = employees.length;
    let activeMembersCount = 0;

    const formattedEmployees = employees.map((emp) => {
      const user = emp.userId || {};

      if (emp.status === "active") {
        activeMembersCount++;
      }

      return {
        fullName: user.fullName || "Unknown",
        email: user.email || "Unknown",
        designation: emp.designation,
        joiningDate: emp.joiningDate,
        status: emp.status,
        _id: emp._id, // might be useful on frontend
      };
    });

    res.status(200).json({
      success: true,
      data: {
        department: {
          id: department._id,
          name: department.name,
          code: department.code,
        },
        totalMembers,
        activeMembersCount,
        employees: formattedEmployees,
      },
    });
  } catch (error) {
    console.error("Error in getManagerTeam:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
      error: error.message,
    });
  }
};
