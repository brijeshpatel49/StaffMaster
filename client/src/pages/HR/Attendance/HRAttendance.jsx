import { useState, useEffect, useCallback, useMemo } from "react";
import HRLayout from "../../../layouts/HRLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";
import {
  Calendar,
  Search,
  Filter,
  Plus,
  X,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  TrendingUp,
  Users,
  ChevronLeft,
  ChevronRight,
  Eye,
  Edit3,
  BarChart3,
  List,
  Building2,
  FileText,
  UserCog,
} from "lucide-react";

// ── Shared Helpers ───────────────────────────────────────────────────────────

const STATUS_COLORS = {
  present: { bg: "var(--color-positive-bg)", text: "var(--color-positive)", border: "var(--color-positive)" },
  late: { bg: "var(--color-icon-yellow-bg)", text: "var(--color-icon-yellow)", border: "var(--color-icon-yellow)" },
  "half-day": { bg: "var(--color-icon-purple-bg)", text: "var(--color-icon-purple)", border: "var(--color-icon-purple)" },
  absent: { bg: "var(--color-negative-bg)", text: "var(--color-negative)", border: "var(--color-negative)" },
  "on-leave": { bg: "var(--color-icon-blue-bg)", text: "var(--color-icon-blue)", border: "var(--color-icon-blue)" },
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true });
};

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.absent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "4px 10px",
        borderRadius: "8px",
        fontSize: "12px",
        fontWeight: 600,
        textTransform: "capitalize",
        backgroundColor: c.bg,
        color: c.text,
        border: `1px solid ${c.border}`,
      }}
    >
      {status}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, iconBg, iconColor }) => (
  <div
    style={{
      backgroundColor: "var(--color-card)",
      borderRadius: "16px",
      padding: "20px",
      border: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}
  >
    <div
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        backgroundColor: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={22} color={iconColor} />
    </div>
    <div>
      <p style={{ fontSize: "22px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.2 }}>
        {value}
      </p>
      <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", margin: "2px 0 0", textTransform: "uppercase", letterSpacing: "0.5px" }}>
        {label}
      </p>
    </div>
  </div>
);



const inputStyle = {
  padding: "8px 14px",
  borderRadius: "10px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  color: "var(--color-text-primary)",
  fontSize: "14px",
  outline: "none",
};

const btnPrimary = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 20px",
  borderRadius: "12px",
  border: "none",
  backgroundColor: "var(--color-accent)",
  color: "#fff",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const btnSecondary = {
  display: "inline-flex",
  alignItems: "center",
  gap: "6px",
  padding: "10px 20px",
  borderRadius: "12px",
  border: "1px solid var(--color-border)",
  backgroundColor: "transparent",
  color: "var(--color-text-secondary)",
  fontSize: "14px",
  fontWeight: 600,
  cursor: "pointer",
};

const labelStyle = {
  display: "block",
  fontSize: "13px",
  fontWeight: 600,
  color: "var(--color-text-secondary)",
  marginBottom: "6px",
};

// ── Toggle Button ────────────────────────────────────────────────────────────

const ViewToggle = ({ view, onChange }) => (
  <div
    style={{
      display: "inline-flex",
      gap: "2px",
      backgroundColor: "var(--color-card)",
      borderRadius: "10px",
      padding: "3px",
      border: "1px solid var(--color-border)",
    }}
  >
    {[
      { key: "daily", label: "Daily", icon: List },
      { key: "monthly", label: "Monthly", icon: BarChart3 },
    ].map(({ key, label, icon: Icon }) => (
      <button
        key={key}
        onClick={() => onChange(key)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "5px",
          padding: "7px 14px",
          borderRadius: "8px",
          border: "none",
          fontWeight: 600,
          fontSize: "13px",
          cursor: "pointer",
          backgroundColor: view === key ? "var(--color-accent-bg)" : "transparent",
          color: view === key ? "var(--color-accent)" : "var(--color-text-muted)",
        }}
      >
        <Icon size={15} />
        {label}
      </button>
    ))}
  </div>
);

// ═════════════════════════════════════════════════════════════════════════════
// MANUAL MARK MODAL
// ═════════════════════════════════════════════════════════════════════════════

const ManualMarkModal = ({ API, onClose, onSuccess }) => {
  const [employees, setEmployees] = useState([]);
  const [empSearch, setEmpSearch] = useState("");
  const [filteredEmps, setFilteredEmps] = useState([]);
  const [form, setForm] = useState({
    employeeId: "",
    employeeName: "",
    date: new Date().toISOString().split("T")[0],
    status: "present",
    checkIn: "09:30",
    checkOut: "18:30",
    note: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  // Fetch all employees for selection
  useEffect(() => {
    const go = async () => {
      const result = await apiFetch(`${API}/employees?limit=500`);
      if (result?.data?.success || result?.data?.employees) {
        const list = result.data.employees || result.data.data || [];
        setEmployees(list);
      }
    };
    go();
  }, [API]);

  useEffect(() => {
    if (empSearch.length < 1) {
      setFilteredEmps([]);
      return;
    }
    const term = empSearch.toLowerCase();
    setFilteredEmps(
      employees
        .filter((e) => {
          const name = (e.userId?.fullName || e.fullName || "").toLowerCase();
          const email = (e.userId?.email || e.email || "").toLowerCase();
          return name.includes(term) || email.includes(term);
        })
        .slice(0, 8)
    );
  }, [empSearch, employees]);

  const handleSelectEmployee = (emp) => {
    const id = emp.userId?._id || emp._id;
    const name = emp.userId?.fullName || emp.fullName || "";
    setForm((p) => ({ ...p, employeeId: id, employeeName: name }));
    setEmpSearch(name);
    setShowDropdown(false);
    setFilteredEmps([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.employeeId) { setError("Please select an employee"); return; }
    setSubmitting(true);
    setError("");

    const body = {
      employeeId: form.employeeId,
      date: form.date,
      status: form.status,
      note: form.note || "",
    };

    // Only send times for statuses that should have them
    if (!["absent", "on-leave"].includes(form.status)) {
      const day = form.date;
      if (form.checkIn) body.checkIn = `${day}T${form.checkIn}:00`;
      if (form.checkOut) body.checkOut = `${day}T${form.checkOut}:00`;
    }

    try {
      const result = await apiFetch(`${API}/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (result?.data?.success) {
        onSuccess();
      } else {
        setError(result?.data?.message || "Failed to mark attendance");
      }
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const hideTime = ["absent", "on-leave"].includes(form.status);

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", padding: "28px", maxWidth: "480px", width: "90%", border: "1px solid var(--color-border)", maxHeight: "90vh", overflowY: "auto" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>
            <Plus size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} />
            Mark Attendance
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Employee search */}
          <div style={{ marginBottom: "16px", position: "relative" }}>
            <label style={labelStyle}>Employee</label>
            <div style={{ position: "relative" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                value={empSearch}
                placeholder="Search employee by name or email…"
                onChange={(e) => { setEmpSearch(e.target.value); setShowDropdown(true); setForm((p) => ({ ...p, employeeId: "", employeeName: "" })); }}
                onFocus={() => empSearch.length > 0 && setShowDropdown(true)}
                style={{ ...inputStyle, paddingLeft: "36px", width: "100%", boxSizing: "border-box" }}
              />
            </div>
            {showDropdown && filteredEmps.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  right: 0,
                  backgroundColor: "var(--color-card)",
                  borderRadius: "12px",
                  border: "1px solid var(--color-border)",
                  boxShadow: "0 10px 30px rgba(0,0,0,0.2)",
                  zIndex: 100,
                  maxHeight: "200px",
                  overflowY: "auto",
                  marginTop: "4px",
                }}
              >
                {filteredEmps.map((emp) => {
                  const name = emp.userId?.fullName || emp.fullName || "Unknown";
                  const email = emp.userId?.email || emp.email || "";
                  return (
                    <div
                      key={emp._id}
                      onClick={() => handleSelectEmployee(emp)}
                      style={{
                        padding: "10px 14px",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--color-border)",
                        transition: "background-color 0.15s",
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-border-light)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                    >
                      <div style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{name}</div>
                      <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>{email}</div>
                    </div>
                  );
                })}
              </div>
            )}
            {form.employeeId && (
              <p style={{ fontSize: "12px", color: "var(--color-positive)", margin: "4px 0 0", fontWeight: 600 }}>
                <CheckCircle2 size={12} style={{ verticalAlign: "middle", marginRight: "4px" }} />
                Selected: {form.employeeName}
              </p>
            )}
          </div>

          {/* Date */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Date</label>
            <input
              type="date"
              value={form.date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
              required
            />
          </div>

          {/* Status */}
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Status</label>
            <CustomDropdown
              value={form.status}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              fullWidth
              size="md"
              options={[
                { value: "present", label: "Present" },
                { value: "absent", label: "Absent" },
                { value: "late", label: "Late" },
                { value: "half-day", label: "Half-day" },
                { value: "on-leave", label: "On Leave" },
              ]}
            />
          </div>

          {/* Check-in/out times (hidden for absent/on-leave) */}}
          {!hideTime && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Check In</label>
                <input
                  type="time"
                  value={form.checkIn}
                  onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
              <div>
                <label style={labelStyle}>Check Out</label>
                <input
                  type="time"
                  value={form.checkOut}
                  onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))}
                  style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>
          )}

          {/* Note */}
          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Note (optional)</label>
            <textarea
              rows={2}
              value={form.note}
              placeholder="Add a note…"
              onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))}
              style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
            />
          </div>

          {error && <p style={{ color: "var(--color-negative)", fontSize: "14px", fontWeight: 500, margin: "0 0 12px" }}>{error}</p>}

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Saving…" : "Mark Attendance"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// EDIT MODAL (inline status update)
// ═════════════════════════════════════════════════════════════════════════════

const EditModal = ({ record, API, onClose, onSuccess }) => {
  const [form, setForm] = useState({
    status: record.status,
    note: record.note || "",
    checkIn: record.checkIn ? new Date(record.checkIn).toTimeString().slice(0, 5) : "",
    checkOut: record.checkOut ? new Date(record.checkOut).toTimeString().slice(0, 5) : "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const empId = record.employeeId?._id || record.employeeId;
    const dateStr = new Date(record.date).toISOString().split("T")[0];

    const body = {
      employeeId: empId,
      date: dateStr,
      status: form.status,
      note: form.note || "",
    };

    if (!["absent", "on-leave"].includes(form.status)) {
      if (form.checkIn) body.checkIn = `${dateStr}T${form.checkIn}:00`;
      if (form.checkOut) body.checkOut = `${dateStr}T${form.checkOut}:00`;
    }

    try {
      const result = await apiFetch(`${API}/attendance/manual`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (result?.data?.success) onSuccess();
      else setError(result?.data?.message || "Update failed");
    } catch {
      setError("Network error");
    } finally {
      setSubmitting(false);
    }
  };

  const hideTime = ["absent", "on-leave"].includes(form.status);
  const empName = record.employeeId?.fullName || "Employee";

  return (
    <div
      style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", padding: "28px", maxWidth: "440px", width: "90%", border: "1px solid var(--color-border)" }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>
            <Edit3 size={18} style={{ verticalAlign: "middle", marginRight: "8px" }} />
            Edit Attendance
          </h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px" }}>
            <X size={20} />
          </button>
        </div>

        <div style={{ padding: "12px 14px", backgroundColor: "var(--color-accent-bg)", borderRadius: "10px", marginBottom: "16px" }}>
          <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{empName}</p>
          <p style={{ margin: "2px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>{formatDateShort(record.date)}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label style={labelStyle}>Status</label>
            <CustomDropdown
              value={form.status}
              onChange={(val) => setForm((p) => ({ ...p, status: val }))}
              fullWidth
              size="md"
              options={[
                { value: "present", label: "Present" },
                { value: "absent", label: "Absent" },
                { value: "late", label: "Late" },
                { value: "half-day", label: "Half-day" },
                { value: "on-leave", label: "On Leave" },
              ]}
            />
          </div>

          {!hideTime && (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
              <div>
                <label style={labelStyle}>Check In</label>
                <input type="time" value={form.checkIn} onChange={(e) => setForm((p) => ({ ...p, checkIn: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
              <div>
                <label style={labelStyle}>Check Out</label>
                <input type="time" value={form.checkOut} onChange={(e) => setForm((p) => ({ ...p, checkOut: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
          )}

          <div style={{ marginBottom: "20px" }}>
            <label style={labelStyle}>Note</label>
            <textarea rows={2} value={form.note} placeholder="Add a note…" onChange={(e) => setForm((p) => ({ ...p, note: e.target.value }))} style={{ ...inputStyle, width: "100%", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
          </div>

          {error && <p style={{ color: "var(--color-negative)", fontSize: "14px", fontWeight: 500, margin: "0 0 12px" }}>{error}</p>}

          <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
            <button type="button" onClick={onClose} style={btnSecondary}>Cancel</button>
            <button type="submit" disabled={submitting} style={{ ...btnPrimary, opacity: submitting ? 0.6 : 1, cursor: submitting ? "not-allowed" : "pointer" }}>
              {submitting ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const HRAttendance = () => {
  const { API } = useAuth();

  // View mode
  const [view, setView] = useState("daily"); // "daily" | "monthly"

  // Tabs
  const [activeTab, setActiveTab] = useState("all"); // "all" | "employee" | "manager"
  const [roleCounts, setRoleCounts] = useState({});

  // Filters
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [departments, setDepartments] = useState([]);
  const [selectedDept, setSelectedDept] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Daily view
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Monthly view
  const now = new Date();
  const [summaryMonth, setSummaryMonth] = useState(now.getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState(now.getFullYear());
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Modals
  const [showManualModal, setShowManualModal] = useState(false);
  const [editRecord, setEditRecord] = useState(null);

  // ── Fetch departments ──────────────────────────────────────────────────────
  useEffect(() => {
    const go = async () => {
      const result = await apiFetch(`${API}/departments`);
      if (result?.data) {
        const list = result.data.departments || result.data.data || result.data || [];
        if (Array.isArray(list)) setDepartments(list);
      }
    };
    go();
  }, [API]);

  // Manager → Department name map
  const managerDeptMap = useMemo(() => {
    const map = {};
    departments.forEach((d) => {
      if (d.manager) {
        const mgrId = d.manager._id || d.manager;
        map[mgrId] = d.name;
      }
    });
    return map;
  }, [departments]);

  // ── Fetch daily records ────────────────────────────────────────────────────
  const fetchDaily = useCallback(async () => {
    setLoading(true);
    try {
      let url = `${API}/attendance?date=${date}&page=${page}&limit=20`;
      if (selectedDept) url += `&departmentId=${selectedDept}`;
      if (statusFilter) url += `&status=${statusFilter}`;
      if (activeTab !== "all") url += `&role=${activeTab}`;

      const result = await apiFetch(url);
      if (result?.data?.success !== false) {
        setRecords(result?.data?.data || []);
        setTotalPages(result?.data?.totalPages || 1);
        setTotalCount(result?.data?.count || 0);
        if (result?.data?.roleCounts) setRoleCounts(result.data.roleCounts);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API, date, page, selectedDept, statusFilter, activeTab]);

  useEffect(() => {
    if (view === "daily") fetchDaily();
  }, [view, fetchDaily]);

  // ── Fetch monthly summary ─────────────────────────────────────────────────
  const fetchSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await apiFetch(`${API}/attendance/summary?month=${summaryMonth}&year=${summaryYear}`);
      if (result?.data?.success) {
        setSummary(result.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSummaryLoading(false);
    }
  }, [API, summaryMonth, summaryYear]);

  useEffect(() => {
    if (view === "monthly") fetchSummary();
  }, [view, fetchSummary]);

  // Summary stats for daily view header (reflects current tab data)
  const dailyStats = {
    total: totalCount,
    present: records.filter((r) => r.status === "present").length,
    late: records.filter((r) => r.status === "late").length,
    absent: records.filter((r) => r.status === "absent").length,
  };

  // Tab counts from API roleCounts (based on base filters, independent of active tab)
  const allCount = Object.values(roleCounts).reduce((s, c) => s + c, 0);
  const employeeCount = roleCounts.employee || 0;
  const managerCount = roleCounts.manager || 0;

  // Dynamic table headers — show Department column when Managers tab active
  const dailyHeaders = activeTab === "manager"
    ? ["Employee", "Department", "Check In", "Check Out", "Hours", "Status", "Note", "Actions"]
    : ["Employee", "Check In", "Check Out", "Hours", "Status", "Note", "Actions"];

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setPage(1);
  };

  // Month options
  const monthOptions = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    monthOptions.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) });
  }

  const handleManualSuccess = () => {
    setShowManualModal(false);
    if (view === "daily") fetchDaily();
    else fetchSummary();
  };

  const handleEditSuccess = () => {
    setEditRecord(null);
    fetchDaily();
  };

  return (
    <HRLayout title="Attendance Management" subtitle="Track and manage employee attendance across the organization.">
      {/* ── Top Controls ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "12px", alignItems: "center", marginBottom: "20px" }}>
        {view === "daily" && (
          <>
            <input
              type="date"
              value={date}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setDate(e.target.value); setPage(1); }}
              style={inputStyle}
            />
            <CustomDropdown
              value={selectedDept}
              onChange={(val) => { setSelectedDept(val); setPage(1); }}
              placeholder="All Departments"
              options={[
                { value: "", label: "All Departments" },
                ...departments.map((d) => ({ value: d._id, label: d.name })),
              ]}
            />
            <CustomDropdown
              value={statusFilter}
              onChange={(val) => { setStatusFilter(val); setPage(1); }}
              placeholder="All Status"
              options={[
                { value: "", label: "All Status" },
                { value: "present", label: "Present" },
                { value: "late", label: "Late" },
                { value: "half-day", label: "Half-day" },
                { value: "absent", label: "Absent" },
                { value: "on-leave", label: "On Leave" },
              ]}
            />
          </>
        )}

        {view === "monthly" && (
          <CustomDropdown
            value={`${summaryMonth}-${summaryYear}`}
            onChange={(val) => {
              const [m, y] = val.split("-").map(Number);
              setSummaryMonth(m);
              setSummaryYear(y);
            }}
            options={monthOptions.map((o) => ({ value: `${o.month}-${o.year}`, label: o.label }))}
            minWidth={180}
          />
        )}

        <div style={{ flex: 1 }} />

        <ViewToggle view={view} onChange={setView} />

        <button onClick={() => setShowManualModal(true)} style={btnPrimary}>
          <Plus size={18} />
          Mark Manual
        </button>
      </div>

      {/* ═══════════════════ DAILY VIEW ═══════════════════ */}
      {view === "daily" && (
        <>
          {/* ── Role Tabs ── */}
          <div
            style={{
              display: "inline-flex",
              gap: "2px",
              backgroundColor: "var(--color-card)",
              borderRadius: "10px",
              padding: "3px",
              border: "1px solid var(--color-border)",
              marginBottom: "20px",
            }}
          >
            {[
              { key: "all", label: "All", count: allCount, icon: Users },
              { key: "employee", label: "Employees", count: employeeCount, icon: UserCog },
              { key: "manager", label: "Managers", count: managerCount, icon: Building2 },
            ].map(({ key, label, count, icon: Icon }) => (
              <button
                key={key}
                onClick={() => handleTabChange(key)}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "7px 14px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  backgroundColor: activeTab === key ? "var(--color-accent-bg)" : "transparent",
                  color: activeTab === key ? "var(--color-accent)" : "var(--color-text-muted)",
                }}
              >
                <Icon size={15} />
                {label}
                <span
                  style={{
                    padding: "1px 8px",
                    borderRadius: "9999px",
                    fontSize: "11px",
                    fontWeight: 600,
                    backgroundColor: activeTab === key ? "var(--color-accent)" : "var(--color-border)",
                    color: activeTab === key ? "#fff" : "var(--color-text-muted)",
                    minWidth: "18px",
                    textAlign: "center",
                  }}
                >
                  {count}
                </span>
              </button>
            ))}
          </div>

          {/* Summary strip */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "20px" }}>
            <StatCard icon={Users} label="Total Records" value={dailyStats.total} iconBg="var(--color-icon-blue-bg)" iconColor="var(--color-icon-blue)" />
            <StatCard icon={CheckCircle2} label="Present" value={dailyStats.present} iconBg="var(--color-icon-green-bg)" iconColor="var(--color-icon-green)" />
            <StatCard icon={AlertTriangle} label="Late" value={dailyStats.late} iconBg="var(--color-icon-yellow-bg)" iconColor="var(--color-icon-yellow)" />
            <StatCard icon={XCircle} label="Absent" value={dailyStats.absent} iconBg="var(--color-icon-red-bg)" iconColor="var(--color-icon-red)" />
          </div>

          {/* Table */}
          <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
            {loading ? <Loader variant="section" /> : records.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <Calendar size={40} style={{ color: "var(--color-text-muted)", marginBottom: "12px" }} />
                <p style={{ color: "var(--color-text-muted)", fontWeight: 600, margin: 0 }}>No attendance records found</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {dailyHeaders.map((h) => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {records.map((r) => (
                      <tr
                        key={r._id}
                        style={{ transition: "background-color 0.15s" }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-border-light)"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                      >
                        <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>
                          {r.employeeId?.fullName || "—"}
                          {r.employeeId?.role && (
                            <span style={{ marginLeft: "6px", fontSize: "10px", fontWeight: 600, textTransform: "capitalize", color: "var(--color-text-muted)", backgroundColor: "var(--color-border)", padding: "2px 6px", borderRadius: "4px" }}>{r.employeeId.role}</span>
                          )}
                          <div style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 400 }}>{r.employeeId?.email}</div>
                        </td>
                        {activeTab === "manager" && (
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>
                            {managerDeptMap[r.employeeId?._id] || "—"}
                          </td>
                        )}
                        <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{formatTime(r.checkIn)}</td>
                        <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{formatTime(r.checkOut)}</td>
                        <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>{r.workHours ? `${r.workHours.toFixed(2)}h` : "—"}</td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}><StatusBadge status={r.status} /></td>
                        <td style={{ padding: "12px 16px", fontSize: "13px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", maxWidth: "150px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {r.note || "—"}
                          {r.isManual && (
                            <span style={{ display: "inline-block", marginLeft: "6px", fontSize: "10px", color: "var(--color-accent)", fontWeight: 600, backgroundColor: "var(--color-accent-bg)", padding: "2px 6px", borderRadius: "4px" }}>Manual</span>
                          )}
                        </td>
                        <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}>
                          <button
                            onClick={() => setEditRecord(r)}
                            style={{
                              background: "none",
                              border: "1px solid var(--color-border)",
                              borderRadius: "8px",
                              padding: "6px 10px",
                              cursor: "pointer",
                              color: "var(--color-text-muted)",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontSize: "12px",
                              fontWeight: 600,
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; e.currentTarget.style.color = "var(--color-accent)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--color-border)"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                          >
                            <Edit3 size={14} /> Edit
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px", alignItems: "center" }}>
              <button disabled={page <= 1} onClick={() => setPage((p) => p - 1)} style={{ ...inputStyle, cursor: page <= 1 ? "not-allowed" : "pointer", opacity: page <= 1 ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                <ChevronLeft size={16} /> Prev
              </button>
              <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                Page {page} of {totalPages}
              </span>
              <button disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)} style={{ ...inputStyle, cursor: page >= totalPages ? "not-allowed" : "pointer", opacity: page >= totalPages ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}>
                Next <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}

      {/* ═══════════════════ MONTHLY VIEW ═══════════════════ */}
      {view === "monthly" && (
        <>
          {summaryLoading ? <Loader variant="section" /> : !summary ? (
            <div style={{ padding: "48px 24px", textAlign: "center", backgroundColor: "var(--color-card)", borderRadius: "16px", border: "1px solid var(--color-border)" }}>
              <BarChart3 size={40} style={{ color: "var(--color-text-muted)", marginBottom: "12px" }} />
              <p style={{ color: "var(--color-text-muted)", fontWeight: 600, margin: 0 }}>No summary data available</p>
            </div>
          ) : (
            <>
              {/* Overall stats */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
                <StatCard icon={FileText} label="Total Records" value={summary.overall?.totalRecords || 0} iconBg="var(--color-icon-blue-bg)" iconColor="var(--color-icon-blue)" />
                <StatCard icon={CheckCircle2} label="Present" value={summary.overall?.presentCount || 0} iconBg="var(--color-icon-green-bg)" iconColor="var(--color-icon-green)" />
                <StatCard icon={AlertTriangle} label="Late" value={summary.overall?.lateCount || 0} iconBg="var(--color-icon-yellow-bg)" iconColor="var(--color-icon-yellow)" />
                <StatCard icon={XCircle} label="Absent" value={summary.overall?.absentCount || 0} iconBg="var(--color-icon-red-bg)" iconColor="var(--color-icon-red)" />
                <StatCard icon={TrendingUp} label="Total Hours" value={`${Math.round(summary.overall?.totalWorkHours || 0)}h`} iconBg="var(--color-icon-purple-bg)" iconColor="var(--color-icon-purple)" />
              </div>

              {/* Department-wise breakdown */}
              {summary.departmentWise && summary.departmentWise.length > 0 && (
                <div style={{ marginBottom: "24px" }}>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <Building2 size={18} />
                    Department Breakdown
                  </h3>
                  <div style={{ display: "grid", gap: "12px" }}>
                    {summary.departmentWise.map((dept) => (
                      <div
                        key={dept._id}
                        style={{
                          backgroundColor: "var(--color-card)",
                          borderRadius: "14px",
                          padding: "20px",
                          border: "1px solid var(--color-border)",
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                          <h4 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                            {dept.departmentName || "Unknown"}
                          </h4>
                          <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-muted)" }}>
                            {dept.totalRecords} records
                          </span>
                        </div>
                        <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                          {[
                            { label: "Present", val: dept.presentCount, color: "var(--color-positive)" },
                            { label: "Late", val: dept.lateCount, color: "var(--color-icon-yellow)" },
                            { label: "Half-day", val: dept.halfDayCount, color: "var(--color-icon-purple)" },
                            { label: "Absent", val: dept.absentCount, color: "var(--color-negative)" },
                            { label: "Leave", val: dept.onLeaveCount, color: "var(--color-icon-blue)" },
                            { label: "Avg Hours", val: `${Math.round((dept.totalWorkHours || 0) / Math.max(dept.totalRecords, 1) * 100) / 100}h`, color: "var(--color-text-primary)" },
                          ].map((item) => (
                            <div key={item.label}>
                              <span style={{ fontSize: "18px", fontWeight: 700, color: item.color }}>{item.val}</span>
                              <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", marginLeft: "4px", textTransform: "uppercase" }}>{item.label}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Top attendees */}
              {summary.topAttendees && summary.topAttendees.length > 0 && (
                <div>
                  <h3 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
                    <TrendingUp size={18} />
                    Top Attendees
                  </h3>
                  <div style={{ backgroundColor: "var(--color-card)", borderRadius: "14px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                    <div style={{ overflowX: "auto" }}>
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead>
                          <tr>
                            {["#", "Employee", "Days Present", "Work Hours"].map((h) => (
                              <th key={h} style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)" }}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {summary.topAttendees.map((t, i) => (
                            <tr key={t._id}>
                              <td style={{ padding: "10px 16px", fontSize: "14px", fontWeight: 700, color: "var(--color-accent)", borderBottom: "1px solid var(--color-border)" }}>{i + 1}</td>
                              <td style={{ padding: "10px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>{t.fullName || "—"}</td>
                              <td style={{ padding: "10px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-positive)", borderBottom: "1px solid var(--color-border)" }}>{t.daysPresent}</td>
                              <td style={{ padding: "10px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>{Math.round(t.totalHours * 100) / 100}h</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )}

      {/* ── Modals ── */}
      {showManualModal && <ManualMarkModal API={API} onClose={() => setShowManualModal(false)} onSuccess={handleManualSuccess} />}
      {editRecord && <EditModal record={editRecord} API={API} onClose={() => setEditRecord(null)} onSuccess={handleEditSuccess} />}
    </HRLayout>
  );
};

export default HRAttendance;
