import User from "../models/User.js";
import EmployeeProfile from "../models/EmployeeProfile.js";
import Department from "../models/Department.js";
import bcrypt from "bcrypt";
import mongoose from "mongoose";

// @desc    Create employee with profile
// @route   POST /api/employees
// @access  Private/Admin/HR
const createEmployee = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const {
      fullName,
      email,
      departmentId,
      designation,
      joiningDate,
      employmentType,
    } = req.body;

    // Validate required fields
    if (!fullName || !email || !departmentId || !designation || !joiningDate) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "All required fields must be provided",
      });
    }

    // Validate department ObjectId
    if (!mongoose.Types.ObjectId.isValid(departmentId)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Invalid department ID",
      });
    }

    // Check if department exists
    const department = await Department.findById(departmentId);
    if (!department) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        message: "Department not found",
      });
    }

    // Check email uniqueness
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    // Generate temporary password
    const tempPassword = `EMP@${Date.now().toString().slice(-6)}`;
    const hashedPassword = await bcrypt.hash(tempPassword, 10);

    // Create user
    const [user] = await User.create(
      [
        {
          fullName,
          email,
          password: hashedPassword,
          role: "employee",
          mustChangePassword: true,
          createdBy: req.user._id,
        },
      ],
      { session },
    );

    // Create employee profile
    const [employeeProfile] = await EmployeeProfile.create(
      [
        {
          userId: user._id,
          departmentId,
          designation,
          joiningDate: new Date(joiningDate),
          employmentType: employmentType || "full-time",
          status: "active",
        },
      ],
      { session },
    );

    await session.commitTransaction();

    res.status(201).json({
      success: true,
      message: "Employee created successfully",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        role: user.role,
        department: department.name,
        designation: employeeProfile.designation,
        joiningDate: employeeProfile.joiningDate,
        employmentType: employeeProfile.employmentType,
        tempPassword, // Send temp password for admin to share
      },
    });
  } catch (error) {
    await session.abortTransaction();
    console.error("Create Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  } finally {
    session.endSession();
  }
};

// @desc    Get all employees with profiles (includes managers)
// @route   GET /api/employees
// @access  Private/Admin/HR/Manager
const getAllEmployees = async (req, res) => {
  try {
    const { departmentId, status, employmentType, role } = req.query;

    // Build user role filter — "all" or empty returns both employee + manager
    let userFilter = {};
    if (role === "employee") {
      userFilter.role = "employee";
    } else if (role === "manager") {
      userFilter.role = "manager";
    } else {
      userFilter.role = { $in: ["employee", "manager"] };
    }

    const profileFilter = {};

    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID",
        });
      }
      profileFilter.departmentId = departmentId;
    }

    if (status) {
      profileFilter.status = status;
    }

    if (employmentType) {
      profileFilter.employmentType = employmentType;
    }

    // Get employee profiles with filters
    const employeeProfiles = await EmployeeProfile.find(profileFilter)
      .populate({
        path: "userId",
        match: userFilter,
        select: "-password -__v",
      })
      .populate("departmentId", "name code")
      .sort({ createdAt: -1 });

    // Filter out null userId (in case user was deleted or role didn't match)
    const employees = employeeProfiles
      .filter((profile) => profile.userId !== null)
      .map((profile) => ({
        _id: profile.userId._id,
        fullName: profile.userId.fullName,
        email: profile.userId.email,
        role: profile.userId.role,
        isActive: profile.userId.isActive,
        department: profile.departmentId,
        designation: profile.designation,
        joiningDate: profile.joiningDate,
        employmentType: profile.employmentType,
        status: profile.status,
        createdAt: profile.createdAt,
      }));

    // Role counts for tabs (always based on current base filters, ignoring role filter)
    const allProfiles = role
      ? await EmployeeProfile.find(profileFilter)
          .populate({
            path: "userId",
            match: { role: { $in: ["employee", "manager"] } },
            select: "role",
          })
      : employeeProfiles;

    const roleCounts = { employee: 0, manager: 0 };
    (role ? allProfiles : employeeProfiles).forEach((p) => {
      if (p.userId && roleCounts[p.userId.role] !== undefined) {
        roleCounts[p.userId.role]++;
      }
    });

    res.status(200).json({
      success: true,
      count: employees.length,
      roleCounts,
      data: employees,
    });
  } catch (error) {
    console.error("Get All Employees Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Get single employee with profile
// @route   GET /api/employees/:id
// @access  Private/Admin/HR/Manager
const getEmployeeById = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const user = await User.findOne({ _id: id, role: "employee" }).select(
      "-password -__v",
    );

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    const profile = await EmployeeProfile.findOne({ userId: id })
      .populate("departmentId", "name code manager")
      .populate({
        path: "departmentId",
        populate: {
          path: "manager",
          select: "fullName email",
        },
      });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    res.status(200).json({
      success: true,
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isActive: user.isActive,
        role: user.role,
        lastLogin: user.lastLogin,
        department: profile.departmentId,
        designation: profile.designation,
        joiningDate: profile.joiningDate,
        employmentType: profile.employmentType,
        status: profile.status,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error("Get Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Update employee profile
// @route   PUT /api/employees/:id
// @access  Private/Admin/HR
const updateEmployee = async (req, res) => {
  try {
    const { id } = req.params;
    const { departmentId, designation, employmentType, status } = req.body;

    // Validate employee ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    // Check if user exists and is employee
    const user = await User.findOne({ _id: id, role: "employee" });
    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Find employee profile
    const profile = await EmployeeProfile.findOne({ userId: id });
    if (!profile) {
      return res.status(404).json({
        success: false,
        message: "Employee profile not found",
      });
    }

    // Validate department if provided
    if (departmentId) {
      if (!mongoose.Types.ObjectId.isValid(departmentId)) {
        return res.status(400).json({
          success: false,
          message: "Invalid department ID",
        });
      }

      const department = await Department.findById(departmentId);
      if (!department) {
        return res.status(404).json({
          success: false,
          message: "Department not found",
        });
      }

      profile.departmentId = departmentId;
    }

    // Update profile fields
    if (designation) profile.designation = designation;
    if (employmentType) profile.employmentType = employmentType;
    if (status) profile.status = status;

    await profile.save();

    // Populate for response
    await profile.populate("departmentId", "name code");

    res.status(200).json({
      success: true,
      message: "Employee updated successfully",
      data: {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        department: profile.departmentId,
        designation: profile.designation,
        employmentType: profile.employmentType,
        status: profile.status,
      },
    });
  } catch (error) {
    console.error("Update Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

// @desc    Delete employee (soft delete - deactivate user)
// @route   DELETE /api/employees/:id
// @access  Private/Admin
const deleteEmployee = async (req, res) => {
  try {
    const { id } = req.params;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: "Invalid employee ID",
      });
    }

    const user = await User.findOne({ _id: id, role: "employee" });

    if (!user) {
      return res.status(404).json({
        success: false,
        message: "Employee not found",
      });
    }

    // Soft delete - deactivate user
    user.isActive = false;
    await user.save();

    // Update profile status
    await EmployeeProfile.findOneAndUpdate(
      { userId: id },
      { status: "terminated" },
    );

    res.status(200).json({
      success: true,
      message: "Employee deactivated successfully",
    });
  } catch (error) {
    console.error("Delete Employee Error:", error);
    res.status(500).json({
      success: false,
      message: "Server Error",
    });
  }
};

export {
  createEmployee,
  getAllEmployees,
  getEmployeeById,
  updateEmployee,
  deleteEmployee,
};
