import { useState, useEffect } from "react";
import { useAuth } from "../../../hooks/useAuth";
import AdminLayout from "../../../layouts/AdminLayout";
import { apiFetch } from "../../../utils/api";

const EmployeeList = () => {
  const { API } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);

  // Filters
  const [filters, setFilters] = useState({
    departmentId: "",
    status: "",
    employmentType: "",
  });

  // Form State
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    departmentId: "",
    designation: "",
    joiningDate: "",
    employmentType: "full-time",
  });

  // Fetch employees
  const fetchEmployees = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.departmentId)
        queryParams.append("departmentId", filters.departmentId);
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.employmentType)
        queryParams.append("employmentType", filters.employmentType);

      const url = `${API}/employees${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const result = await apiFetch(url);

      if (result && result.data.success) {
        setEmployees(result.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  // Fetch departments
  const fetchDepartments = async () => {
    try {
      const result = await apiFetch(`${API}/departments`);
      if (result && result.data.success) {
        setDepartments(result.data.departments);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [filters]);

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleFilterChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleAddNew = () => {
    setIsEditing(false);
    setCurrentEmployeeId(null);
    setFormData({
      fullName: "",
      email: "",
      departmentId: "",
      designation: "",
      joiningDate: "",
      employmentType: "full-time",
    });
    setTempPassword("");
    setShowPassword(false);
    setShowModal(true);
  };

  const handleEdit = (employee) => {
    setIsEditing(true);
    setCurrentEmployeeId(employee._id);
    setFormData({
      fullName: employee.fullName,
      email: employee.email,
      departmentId: employee.department?._id || "",
      designation: employee.designation,
      joiningDate: employee.joiningDate?.split("T")[0] || "",
      employmentType: employee.employmentType,
    });
    setShowPassword(false);
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (isEditing) {
      // Update employee
      try {
        const result = await apiFetch(`${API}/employees/${currentEmployeeId}`, {
          method: "PUT",
          body: JSON.stringify({
            departmentId: formData.departmentId,
            designation: formData.designation,
            employmentType: formData.employmentType,
          }),
        });

        if (result && result.data.success) {
          setShowModal(false);
          fetchEmployees();
          alert(result.data.message || "Employee updated successfully");
        } else if (result) {
          alert(result.data.message || "Failed to update employee");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      }
    } else {
      // Create employee
      try {
        const result = await apiFetch(`${API}/employees`, {
          method: "POST",
          body: JSON.stringify(formData),
        });

        if (result && result.data.success) {
          setTempPassword(result.data.data.tempPassword);
          setShowPassword(true);
          fetchEmployees();
        } else if (result) {
          alert(result.data.message || "Failed to create employee");
        }
      } catch (err) {
        console.error(err);
        alert("Something went wrong");
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this employee?"))
      return;

    try {
      const result = await apiFetch(`${API}/employees/${id}`, {
        method: "DELETE",
      });

      if (result && result.data.success) {
        fetchEmployees();
        alert(result.data.message || "Employee deactivated successfully");
      } else if (result) {
        alert(result.data.message || "Failed to deactivate employee");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      resigned: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      terminated: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return styles[status] || styles.active;
  };

  const getEmploymentTypeBadge = (type) => {
    const styles = {
      "full-time": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "part-time": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      contract: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    return styles[type] || styles["full-time"];
  };

  return (
    <AdminLayout
      title="Employee Management"
      subtitle="Manage your organization's workforce."
    >
      {/* Filters & Actions Bar */}
      <div className="mb-6 space-y-4">
        {/* Filters */}
        <div className="flex flex-wrap gap-4">
          <select
            name="departmentId"
            value={filters.departmentId}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer"
          >
            <option value="">All Departments</option>
            {departments.map((dept) => (
              <option key={dept._id} value={dept._id}>
                {dept.name}
              </option>
            ))}
          </select>

          <select
            name="status"
            value={filters.status}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer"
          >
            <option value="">All Status</option>
            <option value="active">Active</option>
            <option value="resigned">Resigned</option>
            <option value="terminated">Terminated</option>
          </select>

          <select
            name="employmentType"
            value={filters.employmentType}
            onChange={handleFilterChange}
            className="px-4 py-2.5 bg-[var(--color-surface)] text-[var(--color-text-primary)] border border-[var(--color-border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-accent)] focus:border-transparent cursor-pointer"
          >
            <option value="">All Types</option>
            <option value="full-time">Full-Time</option>
            <option value="part-time">Part-Time</option>
            <option value="contract">Contract</option>
          </select>

          <button
            onClick={() =>
              setFilters({ departmentId: "", status: "", employmentType: "" })
            }
            className="px-4 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium rounded-xl transition-all text-sm"
          >
            Clear Filters
          </button>
        </div>

        {/* Add Button */}
        <div className="flex justify-end">
          <button
            onClick={handleAddNew}
            className="bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold py-2.5 px-5 rounded-xl transition-all duration-200   flex items-center gap-2"
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
            Add New Employee
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="bg-[var(--color-card)] rounded-2xl  border border-[var(--color-border)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--color-border)]">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Employee
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Department
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Designation
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Joining Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Type
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Status
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-10 text-[var(--color-text-muted)]"
                >
                  Loading...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td
                  colSpan="7"
                  className="text-center py-10 text-[var(--color-text-muted)]"
                >
                  No employees found.
                </td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee._id}
                  className="hover:bg-[var(--color-surface)] transition-colors"
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-500 font-bold text-sm mr-4 border border-indigo-500/20">
                        {employee.fullName
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                          .slice(0, 2)}
                      </div>
                      <div>
                        <div className="text-sm font-bold text-[var(--color-text-primary)]">
                          {employee.fullName}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">
                          {employee.email}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">
                      {employee.department?.name || "N/A"}
                    </div>
                    <div className="text-xs text-[var(--color-text-muted)]">
                      {employee.department?.code || ""}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-primary)]">
                      {employee.designation}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-secondary)]">
                      {formatDate(employee.joiningDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getEmploymentTypeBadge(employee.employmentType)}`}
                    >
                      {employee.employmentType}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(employee.status)}`}
                    >
                      {employee.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEdit(employee)}
                        className="text-blue-500 hover:text-blue-400 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(employee._id)}
                        className="text-red-500 hover:text-red-400 font-medium"
                      >
                        Delete
                      </button>
                    </div>
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
          <div className="bg-[var(--color-card)] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-white">
            <div className="bg-[var(--color-surface)] px-8 py-6 border-b border-[var(--color-border)] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                {showPassword
                  ? "Employee Created Successfully"
                  : isEditing
                    ? "Edit Employee"
                    : "Add New Employee"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
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

            {showPassword ? (
              /* Success State - Show Temp Password */
              <div className="p-8 space-y-6">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <svg
                      className="w-5 h-5 text-green-500"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth="2"
                        d="M5 13l4 4L19 7"
                      ></path>
                    </svg>
                    <p className="text-sm font-bold text-green-500">
                      Employee account created!
                    </p>
                  </div>
                  <p className="text-xs text-green-500">
                    Share the temporary password below with the employee. They
                    will be required to change it on first login.
                  </p>
                </div>

                <div className="bg-[var(--color-surface)] rounded-xl p-4">
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">
                    Temporary Password
                  </label>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold text-[var(--color-text-primary)] bg-[var(--color-card)] px-4 py-2 rounded-lg border border-[var(--color-border-light)] flex-1 text-center select-all">
                      {tempPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        alert("Password copied to clipboard!");
                      }}
                      className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium hover:bg-gray-800 transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3.5 bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold rounded-xl transition-all  hover:translate-y-[-1px]"
                >
                  Done
                </button>
              </div>
            ) : (
              /* Form State */
              <form onSubmit={handleSubmit} className="p-8">
                {/* Two Column Grid */}
                <div className="grid grid-cols-2 gap-6 mb-6">
                  {/* Left Column */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all"
                        placeholder="e.g. John Doe"
                        required
                        disabled={isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all"
                        placeholder="e.g. john.doe@company.com"
                        required
                        disabled={isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                        Department
                      </label>
                      <select
                        name="departmentId"
                        value={formData.departmentId}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all appearance-none cursor-pointer"
                        required
                      >
                        <option value="">-- Select Department --</option>
                        {departments.map((dept) => (
                          <option key={dept._id} value={dept._id}>
                            {dept.name} ({dept.code})
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Right Column */}
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                        Designation
                      </label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all"
                        placeholder="e.g. Software Engineer"
                        required
                      />
                    </div>

                    {!isEditing && (
                      <div>
                        <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                          Joining Date
                        </label>
                        <input
                          type="date"
                          name="joiningDate"
                          value={formData.joiningDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">
                        Employment Type
                      </label>
                      <select
                        name="employmentType"
                        value={formData.employmentType}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent focus:bg-[var(--color-card)] focus:border-yellow-400 focus:ring-2 focus:ring-yellow-100 rounded-xl text-[var(--color-text-primary)] text-sm font-medium transition-all appearance-none cursor-pointer"
                        required
                      >
                        <option value="full-time">Full-Time</option>
                        <option value="part-time">Part-Time</option>
                        <option value="contract">Contract</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Note */}
                {!isEditing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-xs text-blue-500">
                      <span className="font-bold">Note:</span> A temporary
                      password will be auto-generated. The employee will be
                      required to change it on first login.
                    </p>
                  </div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  className="w-full py-3.5 bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold rounded-xl transition-all  hover:translate-y-[-1px]"
                >
                  {isEditing ? "Update Employee" : "Create Employee"}
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
};

export default EmployeeList;
