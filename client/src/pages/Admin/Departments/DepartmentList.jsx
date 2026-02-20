import { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import AdminLayout from "../../../components/Admin/AdminLayout";
import { apiFetch } from "../../../utils/api";
import DepartmentCard from "../../../components/departments/DepartmentCard";
import EmployeeDrawer from "../../../components/departments/EmployeeDrawer";

const DepartmentList = () => {
  const { API } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeptId, setCurrentDeptId] = useState(null);

  // Employee Drawer State
  const [selectedDept, setSelectedDept] = useState(null);
  const [deptEmployees, setDeptEmployees] = useState([]);
  const [empLoading, setEmpLoading] = useState(false);

  // Form State
  const [formData, setFormData] = useState({
    name: "",
    code: "",
    description: "",
    manager: "",
  });

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const result = await apiFetch(`${API}/departments`);
      if (result && result.data.success) {
        setDepartments(result.data.departments);
      } else {
        setError("Failed to fetch departments.");
      }
    } catch (err) {
      setError("Server error.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch employees for manager assignment dropdown (admin only)
  const fetchEmployees = async () => {
    try {
      const result = await apiFetch(`${API}/users/employees`);
      if (result && result.data.success) {
        setEmployees(result.data.employees);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    }
  };

  useEffect(() => {
    fetchDepartments();
    fetchEmployees();
  }, []);

  // -- Employee Drawer Handlers
  const handleViewEmployees = async (dept) => {
    setSelectedDept(dept);
    setDeptEmployees([]);
    setEmpLoading(true);
    try {
      // Reusing the hr/dashboard endpoint since it's authorized for admin & hr
      const result = await apiFetch(
        `${API}/hr/dashboard/department/${dept._id}/employees`,
      );
      if (result?.data?.success) {
        setDeptEmployees(result.data.employees);
      }
    } catch (err) {
      console.error("Employees by dept error:", err);
    } finally {
      setEmpLoading(false);
    }
  };

  // -- Form Handlers
  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEdit = (dept) => {
    setIsEditing(true);
    setCurrentDeptId(dept._id);
    setFormData({
      name: dept.name,
      code: dept.code,
      description: dept.description || "",
      manager: dept.manager ? dept.manager._id : "",
    });
    setShowModal(true);
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentDeptId(null);
    setFormData({ name: "", code: "", description: "", manager: "" });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const url = isEditing
        ? `${API}/departments/${currentDeptId}`
        : `${API}/departments`;
      const method = isEditing ? "PUT" : "POST";

      const payload = {
        name: formData.name,
        code: formData.code,
        description: formData.description,
        manager: formData.manager || null,
      };

      const result = await apiFetch(url, {
        method: method,
        body: JSON.stringify(payload),
      });

      if (result && result.data.success) {
        setShowModal(false);
        fetchDepartments();
        fetchEmployees();
      } else if (result) {
        alert(result.data.message || "Operation failed");
      }
    } catch (err) {
      console.error(err);
      alert("Something went wrong");
    }
  };

  const toggleStatus = async (id) => {
    if (
      !window.confirm(
        "Are you sure you want to change the status of this department?",
      )
    )
      return;

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${API}/departments/${id}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const data = await response.json();
      if (data.success) {
        fetchDepartments();
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminLayout
      title="Departments"
      subtitle="Manage your organization's internal structure."
    >
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search departments..."
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-64 md:w-80 shadow-[0_2px_10px_rgba(0,0,0,0.03)]"
          />
          <svg
            className="w-5 h-5 text-gray-400 absolute left-3 top-2.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-[#FCD34D] hover:bg-[#fbbf24] text-gray-900 font-bold py-2.5 px-5 rounded-xl transition-all shadow-sm hover:shadow-md flex items-center gap-2 border-none cursor-pointer"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              d="M12 4v16m8-8H4"
            />
          </svg>
          Add New
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="w-12 h-12 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin"></div>
        </div>
      ) : departments.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          No departments found.
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-5">
          {departments.map((dept) => (
            <DepartmentCard
              key={dept._id}
              dept={dept}
              isAdmin={true}
              onViewEmployees={handleViewEmployees}
              onEdit={handleEdit}
              onToggleStatus={toggleStatus}
            />
          ))}
        </div>
      )}

      {/* Employee Drawer */}
      {selectedDept && (
        <EmployeeDrawer
          dept={selectedDept}
          employees={deptEmployees}
          loading={empLoading}
          onClose={() => setSelectedDept(null)}
        />
      )}

      {/* Admin Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-[2px] p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-white">
            <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900 m-0">
                {isEditing ? "Edit Department" : "Add New Department"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="bg-transparent border-none text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-5">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 ml-1">
                  Department Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all"
                  placeholder="e.g. Engineering"
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 ml-1">
                  Department Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all uppercase"
                  placeholder="e.g. ENG"
                  required
                  disabled={isEditing}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 ml-1">
                  Assign Manager
                </label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all cursor-pointer outline-none"
                >
                  <option value="">-- No Manager --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-bold text-gray-700 ml-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all resize-y"
                  rows="3"
                  placeholder="Brief description of the department..."
                ></textarea>
              </div>

              <div className="pt-4">
                <button
                  type="submit"
                  className="w-full py-3.5 border-none bg-[#FCD34D] hover:bg-[#fbbf24] text-gray-900 font-bold rounded-xl transition-all shadow-sm cursor-pointer hover:-translate-y-0.5"
                >
                  {isEditing ? "Update Department" : "Create Department"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default DepartmentList;
