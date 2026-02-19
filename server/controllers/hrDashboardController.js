import EmployeeProfile from "../models/EmployeeProfile.js";
import User from "../models/User.js";
import Department from "../models/Department.js";

export const getHRDashboardStats = async (req, res) => {
  try {
    // 1. Total Employees
    const totalEmployees = await EmployeeProfile.countDocuments();

    // 2. Active vs Resigned count
    const activeCount = await EmployeeProfile.countDocuments({
      status: "active",
    });
    const resignedCount = await EmployeeProfile.countDocuments({
      status: "resigned",
    });
    const terminatedCount = await EmployeeProfile.countDocuments({
      status: "terminated",
    });

    // 3. Employees by Department (aggregation)
    const byDepartment = await EmployeeProfile.aggregate([
      {
        $group: {
          _id: "$departmentId",
          count: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "departments",
          localField: "_id",
          foreignField: "_id",
          as: "department",
        },
      },
      {
        $unwind: { path: "$department", preserveNullAndEmptyArrays: true },
      },
      {
        $project: {
          _id: 0,
          departmentName: { $ifNull: ["$department.name", "Unassigned"] },
          departmentCode: { $ifNull: ["$department.code", "N/A"] },
          count: 1,
        },
      },
      { $sort: { count: -1 } },
    ]);

    // 4. Recently Added Employees (last 6)
    const recentEmployees = await EmployeeProfile.find()
      .sort({ createdAt: -1 })
      .limit(6)
      .populate("userId", "fullName email")
      .populate("departmentId", "name code");

    const recentList = recentEmployees.map((emp) => ({
      fullName: emp.userId?.fullName || "Unknown",
      email: emp.userId?.email || "",
      department: emp.departmentId?.name || "N/A",
      designation: emp.designation,
      employmentType: emp.employmentType,
      joiningDate: emp.joiningDate,
    }));

    res.json({
      success: true,
      data: {
        totalEmployees,
        activeCount,
        resignedCount,
        terminatedCount,
        byDepartment,
        recentEmployees: recentList,
      },
    });
  } catch (error) {
    console.error("HR Dashboard error:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch HR dashboard stats",
    });
  }
};

// GET /api/hr/dashboard/department/:id/employees
export const getEmployeesByDepartment = async (req, res) => {
  try {
    const { id } = req.params;

    const department = await Department.findById(id).select(
      "name code description",
    );
    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    const employees = await EmployeeProfile.find({ departmentId: id })
      .populate("userId", "fullName email isActive")
      .sort({ createdAt: -1 });

    const list = employees.map((emp) => ({
      _id: emp._id,
      fullName: emp.userId?.fullName || "Unknown",
      email: emp.userId?.email || "",
      isActive: emp.userId?.isActive ?? true,
      designation: emp.designation,
      employmentType: emp.employmentType,
      status: emp.status,
      joiningDate: emp.joiningDate,
    }));

    res.json({
      success: true,
      department: {
        _id: department._id,
        name: department.name,
        code: department.code,
        description: department.description,
      },
      employees: list,
      total: list.length,
    });
  } catch (error) {
    console.error("getEmployeesByDepartment error:", error);
    res.status(500).json({ success: false, message: "Server error" });
  }
};
