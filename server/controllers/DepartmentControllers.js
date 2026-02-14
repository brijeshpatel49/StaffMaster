import Department from "../models/Department.js";
import User from "../models/User.js";

// @desc    Create a new department
// @route   POST /api/departments
// @access  Private/Admin
const createDepartment = async (req, res) => {
  try {
    const { name, code, description, manager } = req.body;

    if (!name || !code) {
      return res
        .status(400)
        .json({ success: false, message: "Name and Code are required" });
    }

    // Check if department code already exists
    const existingDept = await Department.findOne({ code });
    if (existingDept) {
      return res
        .status(400)
        .json({ success: false, message: "Department code already exists" });
    }

    // Validate Manager
    if (manager) {
      const managerUser = await User.findById(manager);
      if (!managerUser) {
        return res
          .status(404)
          .json({ success: false, message: "Manager not found" });
      }
      if (managerUser.role !== "employee") {
        return res.status(400).json({
          success: false,
          message: "Selected manager must have 'employee' role",
        });
      }
    }

    const department = await Department.create({
      name,
      code,
      description,
      manager,
      createdBy: req.user._id,
    });

    res.status(201).json({
      success: true,
      message: "Department created successfully",
      department,
    });
  } catch (error) {
    console.error("Create Department Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get all departments
// @route   GET /api/departments
// @access  Private/Admin/HR
const getDepartments = async (req, res) => {
  try {
    const departments = await Department.find()
      .populate("manager", "fullName email")
      .select("-__v")
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: departments.length,
      departments,
    });
  } catch (error) {
    console.error("Get Departments Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Get single department
// @route   GET /api/departments/:id
// @access  Private/Admin/HR
const getDepartmentById = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id)
      .populate("manager", "fullName email")
      .populate("createdBy", "fullName")
      .select("-__v");

    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    res.status(200).json({
      success: true,
      department,
    });
  } catch (error) {
    console.error("Get Department Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Update department
// @route   PUT /api/departments/:id
// @access  Private/Admin
const updateDepartment = async (req, res) => {
  try {
    const { name, description, manager } = req.body;

    const department = await Department.findById(req.params.id);

    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    // Validate Manager
    if (manager) {
      if (manager !== department.manager?.toString()) {
        const managerUser = await User.findById(manager);
        if (!managerUser) {
          return res
            .status(404)
            .json({ success: false, message: "Manager not found" });
        }
        if (managerUser.role !== "employee") {
          return res.status(400).json({
            success: false,
            message: "Selected manager must have 'employee' role",
          });
        }
      }
      department.manager = manager;
    } else if (manager === null || manager === "") {
      // Allow unassigning manager if explicitly sent as null/empty
      department.manager = null;
    }

    department.name = name || department.name;
    department.description =
      description !== undefined ? description : department.description;

    const updatedDepartment = await department.save();

    res.status(200).json({
      success: true,
      message: "Department updated successfully",
      department: updatedDepartment,
    });
  } catch (error) {
    console.error("Update Department Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

// @desc    Toggle department status (Active/Inactive)
// @route   PATCH /api/departments/:id/status
// @access  Private/Admin
const toggleDepartmentStatus = async (req, res) => {
  try {
    const department = await Department.findById(req.params.id);

    if (!department) {
      return res
        .status(404)
        .json({ success: false, message: "Department not found" });
    }

    department.isActive = !department.isActive;
    await department.save();

    res.status(200).json({
      success: true,
      message: `Department ${department.isActive ? "activated" : "deactivated"} successfully`,
      department,
    });
  } catch (error) {
    console.error("Toggle Status Error:", error);
    res.status(500).json({ success: false, message: "Server Error" });
  }
};

export {
  createDepartment,
  getDepartments,
  getDepartmentById,
  updateDepartment,
  toggleDepartmentStatus,
};
