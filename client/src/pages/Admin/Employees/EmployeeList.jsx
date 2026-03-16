import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { useAuth } from "../../../hooks/useAuth";
import AdminLayout from "../../../layouts/AdminLayout";
import { apiFetch } from "../../../utils/api";
import { Users, UserCog, Building2, ArrowLeft } from "lucide-react";
import CustomDropdown from "../../../components/CustomDropdown";
import { toast } from "react-hot-toast";

const STATUS_COLORS = {
  present: "#22c55e",
  late: "#f59e0b",
  absent: "#ef4444",
  "half-day": "#3b82f6",
  "on-leave": "#8b5cf6",
  holiday: "#6b7280",
};

const EmployeeList = () => {
  const { API } = useAuth();
  const [employees, setEmployees] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [tempPassword, setTempPassword] = useState("");
  const [emailSentTo, setEmailSentTo] = useState({ sent: false, address: "" });
  const [formLoading, setFormLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEmployeeId, setCurrentEmployeeId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");
  const [roleCounts, setRoleCounts] = useState({ employee: 0, manager: 0 });

  const [selectedEmp, setSelectedEmp] = useState(null);
  const [empDetail, setEmpDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedAttendanceMonth, setSelectedAttendanceMonth] = useState("");

  const [filters, setFilters] = useState({
    departmentId: "",
    status: "",
    employmentType: "",
  });

  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    departmentId: "",
    designation: "",
    joiningDate: "",
    employmentType: "full-time",
  });

  const fetchEmployees = async () => {
    try {
      const queryParams = new URLSearchParams();
      if (filters.departmentId) queryParams.append("departmentId", filters.departmentId);
      if (filters.status) queryParams.append("status", filters.status);
      if (filters.employmentType) queryParams.append("employmentType", filters.employmentType);
      if (activeTab !== "all") queryParams.append("role", activeTab);

      const url = `${API}/employees${queryParams.toString() ? `?${queryParams.toString()}` : ""}`;
      const result = await apiFetch(url);

      if (result?.data?.success) {
        setEmployees(result.data.data || []);
        if (result.data.roleCounts) setRoleCounts(result.data.roleCounts);
      }
    } catch (err) {
      console.error("Failed to fetch employees:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchDepartments = async () => {
    try {
      const result = await apiFetch(`${API}/departments`);
      if (result?.data?.success) {
        setDepartments(result.data.departments || []);
      }
    } catch (err) {
      console.error("Failed to fetch departments:", err);
    }
  };

  useEffect(() => {
    fetchEmployees();
    fetchDepartments();
  }, [filters, activeTab]);

  useEffect(() => {
    if (!showModal) return;

    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [showModal]);

  const formatDate = (dateString) => {
    if (!dateString) return "-";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const formatCurrencyINR = (amount) => {
    const value = Number(amount || 0);
    return `Rs. ${value.toLocaleString("en-IN")}`;
  };

  const getEmploymentTypeBadge = (type) => {
    const styles = {
      "full-time": "bg-blue-500/10 text-blue-500 border-blue-500/20",
      "part-time": "bg-purple-500/10 text-purple-500 border-purple-500/20",
      contract: "bg-orange-500/10 text-orange-500 border-orange-500/20",
    };
    return styles[type] || styles["full-time"];
  };

  const getStatusBadge = (status) => {
    const styles = {
      active: "bg-green-500/10 text-green-500 border-green-500/20",
      resigned: "bg-yellow-500/10 text-yellow-500 border-yellow-500/20",
      terminated: "bg-red-500/10 text-red-500 border-red-500/20",
    };
    return styles[status] || styles.active;
  };

  const normalizeAttendanceStatus = (status) => {
    if (!status) return "absent";
    const s = String(status).trim().toLowerCase();
    if (s === "on leave") return "on-leave";
    if (s === "half day") return "half-day";
    return s;
  };

  const getMonthLabel = (month, year) => {
    return new Date(year, month - 1, 1).toLocaleDateString("en-IN", {
      month: "short",
      year: "numeric",
    });
  };

  const getMonthKey = (dateLike) => {
    const d = new Date(dateLike);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  };

  const fetchPayrollHistoryForEmployee = async (empId) => {
    const now = new Date();
    const tasks = [];
    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      tasks.push(apiFetch(`${API}/payroll/all?month=${month}&year=${year}`));
    }

    const responses = await Promise.all(tasks);
    const merged = [];

    responses.forEach((r) => {
      const list = r?.data?.data || [];
      list.forEach((p) => {
        const id = p?.employeeId?._id || p?.employeeId;
        if (String(id) === String(empId)) {
          merged.push(p);
        }
      });
    });

    merged.sort((a, b) => {
      if (b.year !== a.year) return b.year - a.year;
      return b.month - a.month;
    });

    return merged.slice(0, 6);
  };

  const fetchAttendanceHistoryForEmployee = async (empId) => {
    const now = new Date();
    const tasks = [];

    for (let i = 0; i < 6; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const month = d.getMonth() + 1;
      const year = d.getFullYear();
      tasks.push(apiFetch(`${API}/attendance?employeeId=${empId}&month=${month}&year=${year}&limit=200`));
    }

    const responses = await Promise.all(tasks);
    const map = new Map();

    responses.forEach((r) => {
      const list = r?.data?.data || [];
      list.forEach((item) => {
        const key = item?._id || `${item?.employeeId}-${item?.date}`;
        if (!map.has(key)) {
          map.set(key, item);
        }
      });
    });

    return Array.from(map.values());
  };

  const fetchEmployeeDetail = async (emp, options = { silent: false }) => {
    if (!options.silent) setDetailLoading(true);

    const safeFetch = async (runner, fallback = null) => {
      try {
        const result = await runner();
        return { data: result?.data || null, error: null };
      } catch (error) {
        if (fallback) {
          try {
            const fallbackResult = await fallback();
            return { data: fallbackResult?.data || null, error: null };
          } catch (fallbackError) {
            return { data: null, error: fallbackError?.message || error?.message || "Failed" };
          }
        }
        return { data: null, error: error?.message || "Failed" };
      }
    };

    try {
      const [profile, attendance, leaves, performance, payroll] = await Promise.all([
        safeFetch(() => apiFetch(`${API}/employees/${emp._id}`)),
        safeFetch(async () => ({
          data: {
            data: await fetchAttendanceHistoryForEmployee(emp._id),
          },
        })),
        safeFetch(
          () => apiFetch(`${API}/leave/balance/${emp._id}`),
          () => apiFetch(`${API}/leave/balance?userId=${emp._id}`)
        ),
        safeFetch(() => apiFetch(`${API}/performance?employeeId=${emp._id}&limit=6`)),
        safeFetch(
          () => apiFetch(`${API}/payroll?employeeId=${emp._id}&limit=6`),
          async () => ({
            data: await fetchPayrollHistoryForEmployee(emp._id),
          })
        ),
      ]);

      const attendanceRaw = attendance?.data?.data || [];
      const attendanceRecords = Array.isArray(attendanceRaw)
        ? attendanceRaw
            .filter((r) => String(r?.employeeId?._id || r?.employeeId) === String(emp._id))
        : [];

      const attendanceChart = attendanceRecords
        .map((a) => ({
          day: new Date(a.date).getDate(),
          status: normalizeAttendanceStatus(a.status),
          fullDate: a.date,
          monthKey: getMonthKey(a.date),
          dateLabel: new Date(a.date).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
          }),
        }))
        .sort((a, b) => new Date(a.fullDate) - new Date(b.fullDate));

      const monthMap = new Map();
      attendanceChart.forEach((row) => {
        const [year, month] = row.monthKey.split("-").map(Number);
        monthMap.set(row.monthKey, {
          value: row.monthKey,
          label: getMonthLabel(month, year),
        });
      });

      if (monthMap.size === 0) {
        const now = new Date();
        const key = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
        monthMap.set(key, {
          value: key,
          label: getMonthLabel(now.getMonth() + 1, now.getFullYear()),
        });
      }

      const attendanceMonthOptions = Array.from(monthMap.values()).sort((a, b) => (a.value < b.value ? 1 : -1));

      const performanceRows = (performance?.data?.data || [])
        .filter((r) => String(r?.employeeId?._id || r?.employeeId) === String(emp._id))
        .slice(0, 6);

      const payrollRows = Array.isArray(payroll?.data?.data)
        ? payroll.data.data
        : Array.isArray(payroll?.data)
        ? payroll.data
        : [];

      setEmpDetail({
        profile: profile?.data?.data || null,
        attendance: attendanceChart,
        attendanceMonthOptions,
        leaveBalance: leaves?.data?.data || null,
        performance: performanceRows,
        payroll: payrollRows,
        errors: {
          profile: profile.error,
          attendance: attendance.error,
          leaves: leaves.error,
          performance: performance.error,
          payroll: payroll.error,
        },
      });

      setSelectedAttendanceMonth((prev) => {
        if (prev && attendanceMonthOptions.some((opt) => opt.value === prev)) return prev;
        return attendanceMonthOptions[0]?.value || "";
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const openEmployeeDetail = async (employee) => {
    setSelectedEmp(employee);
    setEmpDetail(null);
    setSelectedAttendanceMonth("");
    await fetchEmployeeDetail(employee);
  };

  const handleBackToList = () => {
    setSelectedEmp(null);
    setEmpDetail(null);
    setSelectedAttendanceMonth("");
  };

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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
    setEmailSentTo({ sent: false, address: "" });
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
    setFormLoading(true);

    if (isEditing) {
      try {
        const result = await apiFetch(`${API}/employees/${currentEmployeeId}`, {
          method: "PUT",
          body: JSON.stringify({
            departmentId: formData.departmentId,
            designation: formData.designation,
            employmentType: formData.employmentType,
          }),
        });

        if (result?.data?.success) {
          setShowModal(false);
          fetchEmployees();
          if (selectedEmp && String(selectedEmp._id) === String(currentEmployeeId)) {
            const merged = {
              ...selectedEmp,
              designation: formData.designation,
              employmentType: formData.employmentType,
              department: departments.find((d) => d._id === formData.departmentId) || selectedEmp.department,
            };
            setSelectedEmp(merged);
            fetchEmployeeDetail(merged, { silent: true });
          }
          toast.success(result.data.message || "Employee updated successfully");
        } else if (result) {
          toast.error(result.data.message || "Failed to update employee");
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
      } finally {
        setFormLoading(false);
      }
    } else {
      try {
        const result = await apiFetch(`${API}/employees`, {
          method: "POST",
          body: JSON.stringify(formData),
        });

        if (result?.data?.success) {
          setTempPassword(result.data.data.tempPassword);
          setEmailSentTo({ sent: !!result.data.data.emailSent, address: result.data.data.email });
          setShowPassword(true);
          fetchEmployees();
        } else if (result) {
          toast.error(result.data.message || "Failed to create employee");
        }
      } catch (err) {
        console.error(err);
        toast.error("Something went wrong");
      } finally {
        setFormLoading(false);
      }
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to deactivate this employee?")) return;

    try {
      const result = await apiFetch(`${API}/employees/${id}`, { method: "DELETE" });

      if (result?.data?.success) {
        fetchEmployees();
        toast.success(result.data.message || "Employee deactivated successfully");
      } else if (result) {
        toast.error(result.data.message || "Failed to deactivate employee");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  if (selectedEmp) {
    return (
      <AdminLayout
        title={selectedEmp.fullName}
        subtitle="Employee details"
      >
        <EmployeeDetailView
          API={API}
          selectedEmp={selectedEmp}
          empDetail={empDetail}
          detailLoading={detailLoading}
          selectedAttendanceMonth={selectedAttendanceMonth}
          onAttendanceMonthChange={setSelectedAttendanceMonth}
          onBack={handleBackToList}
          onEdit={() => handleEdit(selectedEmp)}
          onRetry={() => fetchEmployeeDetail(selectedEmp)}
          formatDate={formatDate}
          formatCurrencyINR={formatCurrencyINR}
          getMonthLabel={getMonthLabel}
        />

        {showModal && createPortal(
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4"
            style={{ overscrollBehavior: "contain" }}
          >
            <div
              className="bg-[var(--color-card)] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--color-border)]"
              style={{ overscrollBehavior: "contain" }}
            >
              <div className="bg-[var(--color-surface)] px-8 py-6 border-b border-[var(--color-border)] flex justify-between items-center">
                <h3 className="text-xl font-bold text-[var(--color-text-primary)]">Edit Employee</h3>
                <button
                  onClick={() => setShowModal(false)}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                  </svg>
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Full Name</label>
                      <input type="text" name="fullName" value={formData.fullName} className="w-full px-4 py-3 bg-[var(--color-surface)] rounded-xl text-[var(--color-text-primary)] text-sm font-medium" disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Email Address</label>
                      <input type="email" name="email" value={formData.email} className="w-full px-4 py-3 bg-[var(--color-surface)] rounded-xl text-[var(--color-text-primary)] text-sm font-medium" disabled />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Department</label>
                      <CustomDropdown
                        value={formData.departmentId}
                        onChange={(val) => setFormData({ ...formData, departmentId: val })}
                        fullWidth
                        size="md"
                        options={departments.map((dept) => ({ value: dept._id, label: `${dept.name} (${dept.code})` }))}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] rounded-xl text-[var(--color-text-primary)] text-sm font-medium"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Employment Type</label>
                      <CustomDropdown
                        value={formData.employmentType}
                        onChange={(val) => setFormData({ ...formData, employmentType: val })}
                        fullWidth
                        size="md"
                        options={[
                          { value: "full-time", label: "Full-Time" },
                          { value: "part-time", label: "Part-Time" },
                          { value: "contract", label: "Contract" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover)] text-[var(--color-btn-text)] font-bold rounded-xl transition-all disabled:opacity-60"
                >
                  {formLoading ? "Updating..." : "Update Employee"}
                </button>
              </form>
            </div>
          </div>,
          document.body
        )}
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Employees"
      subtitle="Manage your organization's workforce."
    >
      <div className="mb-6 space-y-4">
        <div className="flex flex-wrap gap-4">
          <CustomDropdown
            value={filters.departmentId}
            onChange={(val) => setFilters({ ...filters, departmentId: val })}
            placeholder="All Departments"
            options={[
              { value: "", label: "All Departments" },
              ...departments.map((dept) => ({ value: dept._id, label: dept.name })),
            ]}
            minWidth={160}
          />

          <CustomDropdown
            value={filters.status}
            onChange={(val) => setFilters({ ...filters, status: val })}
            placeholder="All Status"
            options={[
              { value: "", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "resigned", label: "Resigned" },
              { value: "terminated", label: "Terminated" },
            ]}
            minWidth={140}
          />

          <CustomDropdown
            value={filters.employmentType}
            onChange={(val) => setFilters({ ...filters, employmentType: val })}
            placeholder="All Types"
            options={[
              { value: "", label: "All Types" },
              { value: "full-time", label: "Full-Time" },
              { value: "part-time", label: "Part-Time" },
              { value: "contract", label: "Contract" },
            ]}
            minWidth={140}
          />

          <button
            onClick={() => setFilters({ departmentId: "", status: "", employmentType: "" })}
            className="px-4 py-2.5 bg-[var(--color-surface)] hover:bg-[var(--color-card)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] font-medium rounded-xl transition-all text-sm"
          >
            Clear Filters
          </button>
        </div>

        <div className="flex items-center justify-between">
          <div className="inline-flex gap-0.5 bg-[var(--color-card)] rounded-[10px] p-[3px] border border-[var(--color-border)]">
            {[
              { key: "all", label: "All", count: (roleCounts.employee || 0) + (roleCounts.manager || 0), icon: Users },
              { key: "employee", label: "Employees", count: roleCounts.employee || 0, icon: UserCog },
              { key: "manager", label: "Managers", count: roleCounts.manager || 0, icon: Building2 },
            ].map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key)}
                className={`inline-flex items-center gap-1.5 px-3.5 py-[7px] rounded-lg border-none font-semibold text-[13px] cursor-pointer transition-colors ${
                  activeTab === key
                    ? "bg-[var(--color-accent-bg)] text-[var(--color-accent)]"
                    : "bg-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]"
                }`}
              >
                <Icon size={15} />
                {label}
                <span
                  className={`px-2 py-[1px] rounded-full text-[11px] font-semibold min-w-[18px] text-center ${
                    activeTab === key
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-border)] text-[var(--color-text-muted)]"
                  }`}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          <button
            onClick={handleAddNew}
            className="bg-[#FCD34D] hover:bg-[#fbbf24] text-[var(--color-text-primary)] font-bold py-2.5 px-5 rounded-xl transition-all duration-200 flex items-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4"></path>
            </svg>
            Add New Employee
          </button>
        </div>
      </div>

      <div className="bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] overflow-hidden">
        <table className="min-w-full divide-y divide-[var(--color-border)]">
          <thead className="bg-[var(--color-surface)]">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Employee</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Department</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Designation</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Joining Date</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Type</th>
              <th className="px-6 py-4 text-left text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Status</th>
              <th className="px-6 py-4 text-right text-xs font-bold text-[var(--color-text-muted)] uppercase tracking-wider">Actions</th>
            </tr>
          </thead>

          <tbody className="bg-[var(--color-card)] divide-y divide-[var(--color-border)]">
            {loading ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-[var(--color-text-muted)]">Loading...</td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan="7" className="text-center py-10 text-[var(--color-text-muted)]">No employees found.</td>
              </tr>
            ) : (
              employees.map((employee) => (
                <tr
                  key={employee._id}
                  className="hover:bg-[var(--color-surface)] transition-colors cursor-pointer"
                  onClick={() => openEmployeeDetail(employee)}
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
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-[var(--color-text-primary)]">{employee.fullName}</span>
                          {employee.role === "manager" && (
                            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/20">Manager</span>
                          )}
                        </div>
                        <div className="text-xs text-[var(--color-text-muted)]">{employee.email}</div>
                      </div>
                    </div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-[var(--color-text-primary)]">{employee.department?.name || "N/A"}</div>
                    <div className="text-xs text-[var(--color-text-muted)]">{employee.department?.code || ""}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-primary)]">{employee.designation}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-[var(--color-text-secondary)]">{formatDate(employee.joiningDate)}</div>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getEmploymentTypeBadge(employee.employmentType)}`}>
                      {employee.employmentType}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-3 py-1 inline-flex text-xs leading-5 font-semibold rounded-full border ${getStatusBadge(employee.status)}`}>
                      {employee.status}
                    </span>
                  </td>

                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleEdit(employee);
                        }}
                        className="text-blue-500 hover:text-blue-400 font-medium"
                      >
                        Edit
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(employee._id);
                        }}
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

      {showModal && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm p-4" style={{ overscrollBehavior: "contain" }}>
          <div className="bg-[var(--color-card)] rounded-3xl shadow-xl w-full max-w-lg overflow-hidden border border-[var(--color-border)]" style={{ overscrollBehavior: "contain" }}>
            <div className="bg-[var(--color-surface)] px-8 py-6 border-b border-[var(--color-border)] flex justify-between items-center">
              <h3 className="text-xl font-bold text-[var(--color-text-primary)]">
                {showPassword ? "Employee Created Successfully" : isEditing ? "Edit Employee" : "Add New Employee"}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path>
                </svg>
              </button>
            </div>

            {showPassword ? (
              <div className="p-8 space-y-5">
                <div className="flex flex-col items-center gap-2 pb-2">
                  <div className="w-14 h-14 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-7 h-7 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-[var(--color-text-primary)]">Employee account created!</p>
                </div>

                {emailSentTo.sent ? (
                  <div className="flex items-start gap-3 bg-blue-500/5 border border-blue-500/20 rounded-xl px-4 py-3">
                    <svg className="w-5 h-5 text-blue-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-blue-400">Welcome email sent</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Credentials delivered to <span className="font-medium text-[var(--color-text-secondary)]">{emailSentTo.address}</span></p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-3 bg-red-500/5 border border-red-500/20 rounded-xl px-4 py-3">
                    <svg className="w-5 h-5 text-red-400 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                    </svg>
                    <div>
                      <p className="text-sm font-semibold text-red-400">Email delivery failed</p>
                      <p className="text-xs text-[var(--color-text-muted)] mt-0.5">Share the temporary password manually with the employee.</p>
                    </div>
                  </div>
                )}

                <div className="bg-[var(--color-surface)] rounded-xl p-4">
                  <label className="block text-xs font-semibold text-[var(--color-text-muted)] mb-2 uppercase tracking-wider">Temporary Password</label>
                  <div className="flex items-center gap-3">
                    <code className="text-lg font-mono font-bold text-[var(--color-text-primary)] bg-[var(--color-card)] px-4 py-2 rounded-lg border border-[var(--color-border-light)] flex-1 text-center select-all">
                      {tempPassword}
                    </code>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(tempPassword);
                        toast.success("Password copied!");
                      }}
                      className="px-4 py-2 bg-[var(--color-btn-bg)] text-[var(--color-btn-text)] rounded-lg text-sm font-medium hover:bg-[var(--color-btn-hover)] transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setShowModal(false)}
                  className="w-full py-3.5 bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover)] text-[var(--color-btn-text)] font-bold rounded-xl transition-all hover:translate-y-[-1px]"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-8">
                <div className="grid grid-cols-2 gap-6 mb-6">
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Full Name</label>
                      <input
                        type="text"
                        name="fullName"
                        value={formData.fullName}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent rounded-xl text-[var(--color-text-primary)] text-sm font-medium"
                        placeholder="e.g. John Doe"
                        required
                        disabled={isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Email Address</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent rounded-xl text-[var(--color-text-primary)] text-sm font-medium"
                        placeholder="e.g. john.doe@company.com"
                        required
                        disabled={isEditing}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Department</label>
                      <CustomDropdown
                        value={formData.departmentId}
                        onChange={(val) => setFormData({ ...formData, departmentId: val })}
                        fullWidth
                        size="md"
                        placeholder="-- Select Department --"
                        options={[
                          { value: "", label: "-- Select Department --" },
                          ...departments.map((dept) => ({ value: dept._id, label: `${dept.name} (${dept.code})` })),
                        ]}
                      />
                    </div>
                  </div>

                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Designation</label>
                      <input
                        type="text"
                        name="designation"
                        value={formData.designation}
                        onChange={handleInputChange}
                        className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent rounded-xl text-[var(--color-text-primary)] text-sm font-medium"
                        placeholder="e.g. Software Engineer"
                        required
                      />
                    </div>

                    {!isEditing && (
                      <div>
                        <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Joining Date</label>
                        <input
                          type="date"
                          name="joiningDate"
                          value={formData.joiningDate}
                          onChange={handleInputChange}
                          className="w-full px-4 py-3 bg-[var(--color-surface)] border-transparent rounded-xl text-[var(--color-text-primary)] text-sm font-medium"
                          required
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-sm font-bold text-[var(--color-text-secondary)] mb-2 ml-1">Employment Type</label>
                      <CustomDropdown
                        value={formData.employmentType}
                        onChange={(val) => setFormData({ ...formData, employmentType: val })}
                        fullWidth
                        size="md"
                        options={[
                          { value: "full-time", label: "Full-Time" },
                          { value: "part-time", label: "Part-Time" },
                          { value: "contract", label: "Contract" },
                        ]}
                      />
                    </div>
                  </div>
                </div>

                {!isEditing && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                    <p className="text-xs text-blue-500">
                      <span className="font-bold">Note:</span> A temporary password will be auto-generated. The employee will be required to change it on first login.
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={formLoading}
                  className="w-full py-3.5 bg-[var(--color-btn-bg)] hover:bg-[var(--color-btn-hover)] text-[var(--color-btn-text)] font-bold rounded-xl transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {formLoading ? (isEditing ? "Updating..." : "Creating...") : isEditing ? "Update Employee" : "Create Employee"}
                </button>
              </form>
            )}
          </div>
        </div>,
        document.body,
      )}
    </AdminLayout>
  );
};

const EmployeeDetailView = ({
  selectedEmp,
  empDetail,
  detailLoading,
  selectedAttendanceMonth,
  onAttendanceMonthChange,
  onBack,
  onEdit,
  onRetry,
  formatDate,
  formatCurrencyINR,
  getMonthLabel,
}) => {
  const profile = empDetail?.profile;
  const errors = empDetail?.errors || {};
  const attendanceDataAll = empDetail?.attendance || [];
  const attendanceMonthOptions = empDetail?.attendanceMonthOptions || [];
  const performanceRows = empDetail?.performance || [];
  const leaveBalance = empDetail?.leaveBalance;
  const payrollRows = empDetail?.payroll || [];

  const hero = profile || selectedEmp;
  const fullName = hero?.fullName || "Employee";
  const designation = hero?.designation || "-";
  const departmentName = hero?.department?.name || "-";
  const email = hero?.email || "-";
  const role = hero?.role || "employee";
  const activeState = hero?.isActive ? "Active" : "Inactive";
  const reportingTo = profile?.department?.manager?.fullName || "-";
  const avatar = hero?.profilePhoto
    ? hero.profilePhoto
    : `https://ui-avatars.com/api/?name=${encodeURIComponent(fullName)}&background=f59e0b&color=ffffff&size=160`;

  const effectiveMonth = selectedAttendanceMonth || attendanceMonthOptions[0]?.value || "";
  const attendanceData = attendanceDataAll
    .filter((row) => row.monthKey === effectiveMonth)
    .sort((a, b) => a.day - b.day);
  const attendanceSummary = {
    present: 0,
    late: 0,
    absent: 0,
    "half-day": 0,
    "on-leave": 0,
  };
  attendanceData.forEach((row) => {
    if (attendanceSummary[row.status] !== undefined) attendanceSummary[row.status] += 1;
  });
  const selectedMonthLabel = attendanceMonthOptions.find((opt) => opt.value === effectiveMonth)?.label || "Attendance";
  const formatAttendanceLabel = (value) =>
    String(value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());

  const gradeBadge = (grade) => {
    const map = {
      A: { bg: "var(--color-positive-bg, rgba(34,197,94,0.12))", color: "var(--color-positive)" },
      B: { bg: "var(--color-accent-bg)", color: "var(--color-accent)" },
      C: { bg: "rgba(245,158,11,0.12)", color: "#f59e0b" },
      D: { bg: "rgba(249,115,22,0.12)", color: "#f97316" },
      F: { bg: "var(--color-negative-bg, rgba(239,68,68,0.12))", color: "var(--color-negative)" },
    };
    return map[grade] || { bg: "var(--color-border)", color: "var(--color-text-secondary)" };
  };

  const leaveRows = [
    {
      label: "Casual Leave",
      remaining: leaveBalance?.casual?.remaining ?? leaveBalance?.casual,
      total: leaveBalance?.casual?.total ?? 12,
      color: "#3b82f6",
    },
    {
      label: "Sick Leave",
      remaining: leaveBalance?.sick?.remaining ?? leaveBalance?.sick,
      total: leaveBalance?.sick?.total ?? 10,
      color: "#ef4444",
    },
    {
      label: "Annual Leave",
      remaining: leaveBalance?.annual?.remaining ?? leaveBalance?.annual,
      total: leaveBalance?.annual?.total ?? 15,
      color: "#8b5cf6",
    },
  ];

  if (detailLoading) {
    return (
      <div style={{ display: "grid", gap: 16 }}>
        <div style={skeletonCardStyle} />
        <div style={skeletonCardStyle} />
        <div style={skeletonCardStyle} />
        <div style={skeletonCardStyle} />
      </div>
    );
  }

  return (
    <div style={{ display: "grid", gap: 16 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
        <button type="button" onClick={onBack} style={ghostBtnStyle}>
          <ArrowLeft size={14} />
          Back to Employees
        </button>
        <button type="button" onClick={onEdit} style={ghostBtnStyle}>Edit Employee</button>
      </div>

      <section style={cardStyle}>
        <div style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
          <img
            src={avatar}
            alt={fullName}
            style={{
              width: 80,
              height: 80,
              borderRadius: "50%",
              objectFit: "cover",
              border: "3px solid var(--color-border)",
            }}
          />
          <div style={{ flex: 1, minWidth: 260 }}>
            <div style={{ fontSize: 24, fontWeight: 700, color: "var(--color-text-primary)" }}>{fullName}</div>
            <div style={{ color: "var(--color-text-secondary)", marginTop: 4 }}>{designation} - {departmentName}</div>
            <div style={{ color: "var(--color-text-muted)", marginTop: 2 }}>{email}</div>
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
          <Badge text={String(role).toUpperCase()} />
          <Badge text={activeState} />
          <Badge text={hero?.employmentType || "-"} />
        </div>

        <div style={{ marginTop: 14, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 10, color: "var(--color-text-secondary)" }}>
          <div>Joined: <strong style={{ color: "var(--color-text-primary)" }}>{formatDate(hero?.joiningDate)}</strong></div>
          <div>Reporting to: <strong style={{ color: "var(--color-text-primary)" }}>{reportingTo}</strong></div>
        </div>
      </section>

      {errors.profile && (
        <CardShell title="Profile">
          <RetryState label="profile" onRetry={onRetry} />
        </CardShell>
      )}

      <div style={{ display: "grid", gap: 16, gridTemplateColumns: "minmax(0, 3fr) minmax(0, 2fr)" }} className="detail-grid">
        <div style={{ display: "grid", gap: 16 }}>
          <CardShell
            title={`Attendance - ${selectedMonthLabel}`}
            headerRight={(
              <div style={{ minWidth: 140 }}>
                <CustomDropdown
                  value={effectiveMonth}
                  onChange={onAttendanceMonthChange}
                  options={attendanceMonthOptions}
                  size="sm"
                  fullWidth
                />
              </div>
            )}
          >
            {errors.attendance ? (
              <RetryState label="attendance" onRetry={onRetry} />
            ) : attendanceData.length === 0 ? (
              <EmptyState text="No attendance data" />
            ) : (
              <>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 8, marginBottom: 12 }}>
                  <StatBox label="Present" value={attendanceSummary.present} color={STATUS_COLORS.present} />
                  <StatBox label="Late" value={attendanceSummary.late} color={STATUS_COLORS.late} />
                  <StatBox label="Absent" value={attendanceSummary.absent} color={STATUS_COLORS.absent} />
                  <StatBox label="Hlf Day" value={attendanceSummary["half-day"]} color={STATUS_COLORS["half-day"]} />
                  <StatBox label="Leave" value={attendanceSummary["on-leave"]} color={STATUS_COLORS["on-leave"]} />
                </div>

                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
                  {[
                    ["Present", "present"],
                    ["Late", "late"],
                    ["Absent", "absent"],
                    ["Half Day", "half-day"],
                    ["On Leave", "on-leave"],
                  ].map(([label, key]) => (
                    <span key={key} style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--color-text-secondary)" }}>
                      <span style={{ width: 9, height: 9, borderRadius: 999, backgroundColor: STATUS_COLORS[key] }} />
                      {label}
                    </span>
                  ))}
                </div>

                <div style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(86px, 1fr))",
                  gap: 8,
                }}>
                  {attendanceData.map((entry) => (
                    <div
                      key={entry.fullDate}
                      style={{
                        border: "1px solid var(--color-border)",
                        borderRadius: 10,
                        padding: "8px 6px",
                        backgroundColor: "var(--color-surface)",
                        textAlign: "center",
                      }}
                    >
                      <div style={{ fontSize: 11, color: "var(--color-text-muted)" }}>{entry.dateLabel}</div>
                      <div style={{ fontSize: 12, fontWeight: 700, marginTop: 4, color: STATUS_COLORS[entry.status] || STATUS_COLORS.absent }}>
                        {formatAttendanceLabel(entry.status)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardShell>

          <CardShell title="Performance Reviews">
            {errors.performance ? (
              <RetryState label="performance" onRetry={onRetry} />
            ) : performanceRows.length === 0 ? (
              <EmptyState text="No performance reviews yet" />
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 760 }}>
                  <thead>
                    <tr>
                      {[
                        "Period",
                        "Attend%",
                        "Task%",
                        "Mgr Rating",
                        "Final",
                        "Grade",
                        "Status",
                      ].map((h) => (
                        <th key={h} style={thStyle}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {performanceRows.map((r) => {
                      const badge = gradeBadge(r.grade);
                      return (
                        <tr key={r._id}>
                          <td style={tdStyle}>{new Date(r.period.year, r.period.month - 1, 1).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}</td>
                          <td style={tdStyle}>{r.attendanceScore?.attendancePercentage ?? 0}%</td>
                          <td style={tdStyle}>{r.taskScore?.completionRate ?? 0}%</td>
                          <td style={tdStyle}>{r.managerRating ?? "-"}</td>
                          <td style={tdStyle}>{r.finalScore ?? "-"}</td>
                          <td style={tdStyle}>
                            {r.grade ? (
                              <span style={{ backgroundColor: badge.bg, color: badge.color, borderRadius: 999, padding: "3px 8px", fontSize: 12, fontWeight: 700 }}>
                                {r.grade}
                              </span>
                            ) : (
                              "-"
                            )}
                          </td>
                          <td style={tdStyle}>
                            {r.status === "pending" ? (
                              <span style={{ color: "var(--color-text-muted)" }}>Pending Review</span>
                            ) : (
                              <span style={{ color: "var(--color-text-secondary)", textTransform: "capitalize" }}>{r.status}</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardShell>
        </div>

        <div style={{ display: "grid", gap: 16 }}>
          <CardShell title={`Leave Balance ${new Date().getFullYear()}`}>
            {errors.leaves ? (
              <RetryState label="leave balance" onRetry={onRetry} />
            ) : !leaveBalance ? (
              <EmptyState text="No leave balance available" />
            ) : (
              <div style={{ display: "grid", gap: 12 }}>
                {leaveRows.map((row) => {
                  const total = Number(row.total || 0);
                  const remaining = Number(row.remaining || 0);
                  const used = Math.max(0, total - remaining);
                  const percent = total > 0 ? Math.min(100, Math.round((used / total) * 100)) : 0;

                  return (
                    <div key={row.label} style={{ display: "grid", gap: 6 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                        <span style={{ color: "var(--color-text-secondary)", fontWeight: 600 }}>{row.label}</span>
                        <span style={{ color: "var(--color-text-primary)", fontWeight: 600 }}>{remaining} / {total} rem</span>
                      </div>
                      <div style={{ height: 8, borderRadius: 999, backgroundColor: "var(--color-border)", overflow: "hidden" }}>
                        <div style={{ width: `${percent}%`, height: "100%", backgroundColor: row.color }} />
                      </div>
                    </div>
                  );
                })}

                <div style={{ marginTop: 4, fontSize: 13, color: "var(--color-text-secondary)" }}>
                  <strong style={{ color: "var(--color-text-primary)" }}>Unpaid Leave:</strong> {leaveBalance?.unpaid?.used ?? leaveBalance?.unpaid ?? 0} days used
                </div>
              </div>
            )}
          </CardShell>

          <CardShell title="Recent Payroll">
            {errors.payroll ? (
              <RetryState label="payroll" onRetry={onRetry} />
            ) : payrollRows.length === 0 ? (
              <EmptyState text="No payroll records yet" />
            ) : (
              <div style={{ display: "grid", gap: 10 }}>
                {payrollRows.map((p) => (
                  <div key={`${p._id}-${p.month}-${p.year}`} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", border: "1px solid var(--color-border)", borderRadius: 10, padding: "10px 12px", backgroundColor: "var(--color-surface)" }}>
                    <div>
                      <div style={{ color: "var(--color-text-primary)", fontWeight: 600, fontSize: 14 }}>{getMonthLabel(p.month, p.year)}</div>
                      <div style={{ color: "var(--color-text-secondary)", fontSize: 13 }}>Net: {formatCurrencyINR(p.netSalary)}</div>
                    </div>
                    <PayrollBadge status={p.status} />
                  </div>
                ))}
              </div>
            )}
          </CardShell>
        </div>
      </div>

      <style>{`
        @media (max-width: 1024px) {
          .detail-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
};

const CardShell = ({ title, headerRight, children }) => (
  <section style={cardStyle}>
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, marginBottom: 12 }}>
      <div style={{ fontSize: 11, letterSpacing: 1, textTransform: "uppercase", color: "var(--color-text-muted)", fontWeight: 700 }}>
        {title}
      </div>
      {headerRight || null}
    </div>
    {children}
  </section>
);

const StatBox = ({ label, value, color }) => (
  <div style={{ border: "1px solid var(--color-border)", borderRadius: 10, padding: "8px 10px", backgroundColor: "var(--color-surface)", textAlign: "center" }}>
    <div style={{ fontSize: 18, fontWeight: 700, color }}>{value}</div>
    <div style={{ fontSize: 11, color: "var(--color-text-muted)", marginTop: 2 }}>{label}</div>
  </div>
);

const Badge = ({ text }) => (
  <span style={{
    padding: "4px 10px",
    borderRadius: 999,
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-secondary)",
    fontSize: 12,
    fontWeight: 600,
  }}>
    {text}
  </span>
);

const PayrollBadge = ({ status }) => {
  const normalized = String(status || "").toLowerCase();
  if (normalized === "paid") {
    return <span style={pill("rgba(34,197,94,0.12)", "#22c55e")}>Paid</span>;
  }
  if (normalized === "approved") {
    return <span style={pill("rgba(245,158,11,0.12)", "#f59e0b")}>Approved</span>;
  }
  return <span style={pill("var(--color-border)", "var(--color-text-muted)")}>Processing</span>;
};

const pill = (bg, color) => ({
  backgroundColor: bg,
  color,
  borderRadius: 999,
  padding: "4px 10px",
  fontSize: 12,
  fontWeight: 700,
});

const EmptyState = ({ text }) => (
  <div style={{ color: "var(--color-text-muted)", fontSize: 13, padding: "6px 0" }}>{text}</div>
);

const RetryState = ({ label, onRetry }) => (
  <div style={{ display: "grid", gap: 8 }}>
    <div style={{ color: "var(--color-text-muted)", fontSize: 13 }}>Could not load {label}</div>
    <button type="button" onClick={onRetry} style={ghostBtnStyle}>Retry</button>
  </div>
);

const cardStyle = {
  backgroundColor: "var(--color-card)",
  border: "1px solid var(--color-border)",
  borderRadius: 16,
  padding: "20px 24px",
};

const ghostBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text-primary)",
  borderRadius: 10,
  padding: "8px 12px",
  fontSize: 13,
  fontWeight: 600,
  cursor: "pointer",
};

const thStyle = {
  textAlign: "left",
  fontSize: 11,
  textTransform: "uppercase",
  letterSpacing: 0.8,
  color: "var(--color-text-muted)",
  padding: "8px 8px",
  borderBottom: "1px solid var(--color-border)",
};

const tdStyle = {
  fontSize: 13,
  color: "var(--color-text-secondary)",
  padding: "8px 8px",
  borderBottom: "1px solid var(--color-border)",
};

const skeletonCardStyle = {
  height: 150,
  borderRadius: 16,
  border: "1px solid var(--color-border)",
  background:
    "linear-gradient(90deg, var(--color-card) 25%, var(--color-surface) 37%, var(--color-card) 63%)",
  backgroundSize: "400% 100%",
  animation: "pulse 1.4s ease infinite",
};

export default EmployeeList;
