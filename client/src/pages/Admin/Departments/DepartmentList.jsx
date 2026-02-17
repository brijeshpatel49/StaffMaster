import { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import AdminLayout from "../../../components/Admin/AdminLayout";
import { apiFetch } from "../../../utils/api";

const DepartmentList = () => {
  const { API } = useAuth();
  const [departments, setDepartments] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentDeptId, setCurrentDeptId] = useState(null);

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

  // Fetch employees for manager assignment dropdown
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

      // Build payload - send manager as null if empty
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
        fetchEmployees(); // Refresh employees list
        alert(result.data.message || "Operation successful");
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
      {/* Actions Bar */}
      <div className="flex justify-between items-center mb-6">
        <div className="relative">
          <input
            type="text"
            placeholder="Search departments..."
            className="pl-10 pr-4 py-2.5 bg-white border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent w-64 md:w-80 shadow-sm"
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
            ></path>
          </svg>
        </div>
        <button
          onClick={handleAddNew}
          className="bg-[#FCD34D] hover:bg-[#fbbf24] text-gray-900 font-bold py-2.5 px-5 rounded-xl transition-all duration-200 shadow-sm hover:shadow-md flex items-center gap-2"
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
            ></path>
          </svg>
          Add New Department
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-[0_2px_12px_rgba(0,0,0,0.03)] border border-gray-100 overflow-hidden">
        <table className="min-w-full divide-y divide-gray-100">
          <thead className="bg-gray-50/50">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Manager
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-500 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-100">
            {loading ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-500">
                  Loading...
                </td>
              </tr>
            ) : departments.length === 0 ? (
              <tr>
                <td colSpan="4" className="text-center py-10 text-gray-500">
                  No departments found.
                </td>
              </tr>
            ) : (
              departments.map((dept) => (
                <tr
                  key={dept._id}
                  className="hover:bg-gray-50/50 transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-orange-100 flex items-center justify-center text-orange-600 font-bold text-sm mr-4">
                        {dept.code}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-gray-900">
                          {dept.name}
                        </div>
                        <div className="text-xs text-gray-500 overflow-hidden text-ellipsis whitespace-nowrap w-48">
                          {dept.description}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">
                      {dept.manager ? dept.manager.fullName : "Not Assigned"}
                    </div>
                    {dept.manager && (
                      <div className="text-xs text-gray-500">
                        {dept.manager.email}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleStatus(dept._id)}
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full cursor-pointer ${
                        dept.isActive
                          ? "bg-green-100 text-green-800 border border-green-200"
                          : "bg-red-100 text-red-800 border border-red-200"
                      }`}
                    >
                      {dept.isActive ? "Active" : "Inactive"}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => handleEdit(dept)}
                      className="text-gray-400 hover:text-yellow-600 transition-colors mx-2"
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
                          d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        ></path>
                      </svg>
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-white">
            <div className="bg-gray-50 px-8 py-6 border-b border-gray-100 flex justify-between items-center">
              <h3 className="text-xl font-bold text-gray-900">
                {isEditing ? "Edit Department" : "Add New Department"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
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
                  ></path>
                </svg>
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-8 space-y-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                  Department Name
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all"
                  placeholder="e.g. Engineering"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                  Department Code
                </label>
                <input
                  type="text"
                  name="code"
                  value={formData.code}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all uppercase"
                  placeholder="e.g. ENG"
                  required
                  disabled={isEditing}
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                  Assign Manager
                </label>
                <select
                  name="manager"
                  value={formData.manager}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all appearance-none cursor-pointer"
                >
                  <option value="">-- Select Employee --</option>
                  {employees.map((emp) => (
                    <option key={emp._id} value={emp._id}>
                      {emp.fullName} ({emp.email})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2 ml-1">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-transparent focus:bg-white focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-gray-900 text-sm font-medium transition-all"
                  rows="3"
                  placeholder="Brief description of the department..."
                ></textarea>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#FCD34D] hover:bg-[#fbbf24] text-gray-900 font-bold rounded-xl transition-all shadow-sm hover:translate-y-[-1px]"
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
