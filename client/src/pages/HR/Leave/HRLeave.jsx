import { useState, useEffect, useCallback } from "react";
import HRLayout from "../../../layouts/HRLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Clock,
  ChevronLeft,
  ChevronRight,
  Users,
  X,
  Check,
  FileText,
  Search,
  Download,
  Edit3,
  Eye,
  ChevronDown,
  ChevronUp,
  BarChart3,
} from "lucide-react";

// ── Constants ────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "casual", label: "Casual" },
  { value: "sick", label: "Sick" },
  { value: "annual", label: "Annual" },
  { value: "unpaid", label: "Unpaid" },
];

const STATUS_COLORS = {
  pending: { bg: "var(--color-icon-yellow-bg)", text: "var(--color-icon-yellow)", border: "var(--color-icon-yellow)" },
  approved: { bg: "var(--color-positive-bg)", text: "var(--color-positive)", border: "var(--color-positive)" },
  rejected: { bg: "var(--color-negative-bg)", text: "var(--color-negative)", border: "var(--color-negative)" },
  cancelled: { bg: "var(--color-border-light)", text: "var(--color-text-muted)", border: "var(--color-text-muted)" },
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.cancelled;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", padding: "4px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 600, textTransform: "capitalize", backgroundColor: c.bg, color: c.text, border: `1px solid ${c.border}` }}>
      {status}
    </span>
  );
};



const StatCard = ({ label, value, color }) => (
  <div style={{ backgroundColor: "var(--color-card)", borderRadius: "14px", padding: "18px 20px", border: "1px solid var(--color-border)", flex: "1", minWidth: "160px" }}>
    <p style={{ fontSize: "28px", fontWeight: 800, color: color || "var(--color-text-primary)", margin: "0 0 4px", lineHeight: 1 }}>{value}</p>
    <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", margin: 0, textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────

const HRLeave = () => {
  const { API, user } = useAuth();

  // ── Filters ──
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");
  const [yearFilter, setYearFilter] = useState(String(new Date().getFullYear()));

  // ── Data ──
  const [departments, setDepartments] = useState([]);
  const [stats, setStats] = useState(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // Pending leaves
  const [pendingLeaves, setPendingLeaves] = useState([]);
  const [pendingLoading, setPendingLoading] = useState(true);
  const [pendingCollapsed, setPendingCollapsed] = useState(false);

  // All leaves
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Review states
  const [rejectingId, setRejectingId] = useState(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewingId, setReviewingId] = useState(null);

  // Detail drawer
  const [selectedLeave, setSelectedLeave] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Balance modal
  const [balanceModalOpen, setBalanceModalOpen] = useState(false);
  const [balanceSearch, setBalanceSearch] = useState("");
  const [balanceSearchResults, setBalanceSearchResults] = useState([]);
  const [selectedBalanceUser, setSelectedBalanceUser] = useState(null);
  const [userBalance, setUserBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceYear, setBalanceYear] = useState(String(new Date().getFullYear()));
  const [balanceSaving, setBalanceSaving] = useState(false);
  const [editedBalances, setEditedBalances] = useState({});

  // ── Fetch Departments ──
  const fetchDepartments = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/departments`);
      if (result?.data) {
        const depts = Array.isArray(result.data) ? result.data : result.data.data || result.data.departments || [];
        setDepartments(depts);
      }
    } catch (err) {
      console.error(err);
    }
  }, [API]);

  // ── Fetch Stats ──
  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const params = new URLSearchParams();
      if (yearFilter) params.set("year", yearFilter);
      if (monthFilter) params.set("month", monthFilter);
      if (departmentFilter) params.set("departmentId", departmentFilter);
      const result = await apiFetch(`${API}/leave/stats?${params}`);
      if (result?.data?.success) setStats(result.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setStatsLoading(false);
    }
  }, [API, yearFilter, monthFilter, departmentFilter]);

  // ── Fetch Pending ──
  const fetchPending = useCallback(async () => {
    setPendingLoading(true);
    try {
      const params = new URLSearchParams({ limit: 50 });
      if (departmentFilter) params.set("departmentId", departmentFilter);
      const result = await apiFetch(`${API}/leave/pending?${params}`);
      if (result?.data?.success) setPendingLeaves(result.data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setPendingLoading(false);
    }
  }, [API, departmentFilter]);

  // ── Fetch All Leaves ──
  const fetchLeaves = useCallback(async (page = 1) => {
    setLeavesLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (typeFilter !== "all") params.set("leaveType", typeFilter);
      if (departmentFilter) params.set("departmentId", departmentFilter);
      if (yearFilter) params.set("year", yearFilter);
      if (monthFilter) params.set("month", monthFilter);
      const result = await apiFetch(`${API}/leave?${params}`);
      if (result?.data?.success) {
        setLeaves(result.data.data || []);
        setPagination({
          page: result.data.currentPage || 1,
          totalPages: result.data.totalPages || 1,
          total: result.data.count || 0,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLeavesLoading(false);
    }
  }, [API, statusFilter, typeFilter, departmentFilter, yearFilter, monthFilter]);

  // ── Initial Load ──
  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPending(); }, [fetchPending]);
  useEffect(() => { fetchLeaves(1); }, [fetchLeaves]);

  // ── Review Leave ──
  const handleReview = async (leaveId, action) => {
    if (action === "reject" && (!rejectReason || rejectReason.trim().length === 0)) {
      toast.error("Please provide a rejection reason");
      return;
    }
    setReviewingId(leaveId);
    try {
      const body = { action };
      if (action === "reject") body.rejectionReason = rejectReason.trim();
      const result = await apiFetch(`${API}/leave/${leaveId}/review`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (result?.data?.success) {
        toast.success(`Leave ${action === "approve" ? "approved" : "rejected"} successfully`);
        setRejectingId(null);
        setRejectReason("");
        fetchPending();
        fetchLeaves(pagination.page);
        fetchStats();
      } else {
        toast.error(result?.data?.message || `Failed to ${action} leave`);
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setReviewingId(null);
    }
  };

  // ── View Leave Detail ──
  const handleViewDetail = async (leaveId) => {
    try {
      const result = await apiFetch(`${API}/leave/${leaveId}`);
      if (result?.data?.success) {
        setSelectedLeave(result.data.data);
        setDrawerOpen(true);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // ── Balance Modal: Search Users ──
  const searchUsers = useCallback(async (query) => {
    if (!query || query.length < 2) { setBalanceSearchResults([]); return; }
    try {
      const result = await apiFetch(`${API}/users?search=${encodeURIComponent(query)}&limit=10`);
      if (result?.data) {
        const users = Array.isArray(result.data) ? result.data : result.data.data || result.data.users || [];
        setBalanceSearchResults(users);
      }
    } catch (err) {
      console.error(err);
    }
  }, [API]);

  useEffect(() => {
    const timer = setTimeout(() => searchUsers(balanceSearch), 300);
    return () => clearTimeout(timer);
  }, [balanceSearch, searchUsers]);

  // ── Balance Modal: Fetch User Balance ──
  const fetchUserBalance = useCallback(async (userId) => {
    setBalanceLoading(true);
    try {
      const result = await apiFetch(`${API}/leave/balance?userId=${userId}&year=${balanceYear}`);
      if (result?.data?.success) {
        setUserBalance(result.data.data);
        setEditedBalances({
          casual: result.data.data.casual.total,
          sick: result.data.data.sick.total,
          annual: result.data.data.annual.total,
          unpaid: result.data.data.unpaid.total,
        });
      }
    } catch (err) {
      console.error(err);
    } finally {
      setBalanceLoading(false);
    }
  }, [API, balanceYear]);

  useEffect(() => {
    if (selectedBalanceUser) fetchUserBalance(selectedBalanceUser._id || selectedBalanceUser.id);
  }, [selectedBalanceUser, fetchUserBalance]);

  // ── Balance Modal: Save ──
  const handleSaveBalance = async (leaveType) => {
    if (!selectedBalanceUser || !userBalance) return;
    setBalanceSaving(true);
    try {
      const userId = selectedBalanceUser._id || selectedBalanceUser.id;
      const result = await apiFetch(`${API}/leave/balance/${userId}`, {
        method: "PATCH",
        body: JSON.stringify({
          year: parseInt(balanceYear),
          leaveType,
          total: parseInt(editedBalances[leaveType]),
        }),
      });
      if (result?.data?.success) {
        toast.success(`${leaveType} balance updated`);
        setUserBalance(result.data.data);
      } else {
        toast.error(result?.data?.message || "Failed to update balance");
      }
    } catch (err) {
      toast.error("Something went wrong");
    } finally {
      setBalanceSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const monthOptions = [
    { value: "", label: "All Months" },
    { value: "1", label: "January" }, { value: "2", label: "February" }, { value: "3", label: "March" },
    { value: "4", label: "April" }, { value: "5", label: "May" }, { value: "6", label: "June" },
    { value: "7", label: "July" }, { value: "8", label: "August" }, { value: "9", label: "September" },
    { value: "10", label: "October" }, { value: "11", label: "November" }, { value: "12", label: "December" },
  ];

  const selectStyle = {
    padding: "8px 12px",
    borderRadius: "8px",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontSize: "13px",
    fontWeight: 500,
    outline: "none",
    minWidth: "130px",
  };

  return (
    <HRLayout title="Leave Management" subtitle="Manage employee leaves, balances, and approvals">
      {/* ── Top Controls ── */}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginBottom: "20px", alignItems: "center" }}>
        <CustomDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { value: "all", label: "All Status" },
            { value: "pending", label: "Pending" },
            { value: "approved", label: "Approved" },
            { value: "rejected", label: "Rejected" },
            { value: "cancelled", label: "Cancelled" },
          ]}
          minWidth={130}
        />
        <CustomDropdown
          value={typeFilter}
          onChange={setTypeFilter}
          options={[
            { value: "all", label: "All Types" },
            ...LEAVE_TYPES,
          ]}
          minWidth={130}
        />
        <CustomDropdown
          value={departmentFilter}
          onChange={setDepartmentFilter}
          placeholder="All Departments"
          options={[
            { value: "", label: "All Departments" },
            ...departments.map((d) => ({ value: d._id, label: d.name })),
          ]}
          minWidth={130}
        />
        <CustomDropdown
          value={monthFilter}
          onChange={setMonthFilter}
          options={monthOptions}
          minWidth={130}
        />
        <CustomDropdown
          value={yearFilter}
          onChange={setYearFilter}
          options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
          minWidth={100}
        />
        <div style={{ marginLeft: "auto", display: "flex", gap: "8px" }}>
          <button onClick={() => { setBalanceModalOpen(true); setSelectedBalanceUser(null); setUserBalance(null); setBalanceSearch(""); }} style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-accent-border)", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Edit3 size={14} /> Update Balance
          </button>
          <button style={{ padding: "8px 16px", borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
            <Download size={14} /> Export
          </button>
        </div>
      </div>

      {/* ── Stats Strip ── */}
      <div style={{ display: "flex", gap: "14px", marginBottom: "24px", flexWrap: "wrap" }}>
        {statsLoading ? (
          [1, 2, 3, 4].map((i) => (
            <div key={i} style={{ flex: 1, minWidth: "160px", height: "80px", backgroundColor: "var(--color-card)", borderRadius: "14px", border: "1px solid var(--color-border)", animation: "pulse 1.5s ease-in-out infinite" }}>
              <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
            </div>
          ))
        ) : (
          <>
            <StatCard label="Total Applications" value={stats?.total ?? 0} />
            <StatCard label="Pending" value={stats?.byStatus?.pending ?? 0} color="var(--color-icon-yellow)" />
            <StatCard label="Approved" value={stats?.byStatus?.approved ?? 0} color="var(--color-positive)" />
            <StatCard label="Rejected" value={stats?.byStatus?.rejected ?? 0} color="var(--color-negative)" />
          </>
        )}
      </div>

      {/* ── Pending Section (Collapsible) ── */}
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", padding: "20px 24px", border: "1px solid var(--color-accent-border)", marginBottom: "24px" }}>
        <button onClick={() => setPendingCollapsed(!pendingCollapsed)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%", border: "none", backgroundColor: "transparent", cursor: "pointer", padding: 0 }}>
          <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <Clock size={18} style={{ color: "var(--color-accent)" }} />
            Pending Requests
            <span style={{ fontSize: "12px", fontWeight: 700, backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)", padding: "2px 8px", borderRadius: "10px", border: "1px solid var(--color-accent-border)" }}>
              {pendingLeaves.length}
            </span>
          </h2>
          {pendingCollapsed ? <ChevronDown size={20} style={{ color: "var(--color-text-muted)" }} /> : <ChevronUp size={20} style={{ color: "var(--color-text-muted)" }} />}
        </button>

        {!pendingCollapsed && (
          <div style={{ marginTop: "16px" }}>
            {pendingLoading ? <Loader variant="section" /> : pendingLeaves.length === 0 ? (
              <div style={{ textAlign: "center", padding: "30px 20px", color: "var(--color-text-muted)" }}>
                <Check size={32} style={{ margin: "0 auto 8px", opacity: 0.4 }} />
                <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>All caught up!</p>
                <p style={{ fontSize: "13px", margin: 0 }}>No pending leave requests.</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                  <thead>
                    <tr>
                      {["Employee", "Department", "Type", "From", "To", "Days", "Applied", "Actions"].map((h) => (
                        <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {pendingLeaves.map((leave) => (
                      <tr key={leave._id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                          {leave.employeeId?.fullName || "—"}
                        </td>
                        <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>{leave.department?.name || "—"}</td>
                        <td style={{ padding: "12px", fontWeight: 600, color: "var(--color-text-primary)", textTransform: "capitalize" }}>
                          {leave.leaveType}
                          {leave.isHalfDay && <span style={{ fontSize: "10px", fontWeight: 600, backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>Half</span>}
                        </td>
                        <td style={{ padding: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatDate(leave.fromDate)}</td>
                        <td style={{ padding: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatDate(leave.toDate)}</td>
                        <td style={{ padding: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{leave.totalDays}</td>
                        <td style={{ padding: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{formatDate(leave.appliedAt)}</td>
                        <td style={{ padding: "12px" }}>
                          {rejectingId === leave._id ? (
                            <div style={{ display: "flex", flexDirection: "column", gap: "6px", minWidth: "200px" }}>
                              <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Rejection reason..." style={{ padding: "6px 10px", borderRadius: "6px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "12px", outline: "none" }} />
                              <div style={{ display: "flex", gap: "6px" }}>
                                <button onClick={() => handleReview(leave._id, "reject")} disabled={reviewingId === leave._id} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--color-negative)", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)", fontSize: "12px", fontWeight: 600, cursor: "pointer", whiteSpace: "nowrap" }}>
                                  {reviewingId === leave._id ? "..." : "Confirm"}
                                </button>
                                <button onClick={() => { setRejectingId(null); setRejectReason(""); }} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                  <X size={14} />
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div style={{ display: "flex", gap: "6px" }}>
                              <button onClick={() => handleReview(leave._id, "approve")} disabled={reviewingId === leave._id} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--color-positive)", backgroundColor: "transparent", color: "var(--color-positive)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                Approve
                              </button>
                              <button onClick={() => setRejectingId(leave._id)} style={{ padding: "4px 10px", borderRadius: "6px", border: "1px solid var(--color-negative)", backgroundColor: "transparent", color: "var(--color-negative)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                Reject
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Main Leave Table ── */}
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", padding: "24px", border: "1px solid var(--color-border)" }}>
        <h2 style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 16px", display: "flex", alignItems: "center", gap: "8px" }}>
          <FileText size={18} style={{ color: "var(--color-accent)" }} />
          All Leave Applications
        </h2>

        {leavesLoading ? <Loader variant="section" /> : leaves.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px 20px", color: "var(--color-text-muted)" }}>
            <Calendar size={40} style={{ margin: "0 auto 12px", opacity: 0.4 }} />
            <p style={{ fontSize: "14px", fontWeight: 600, margin: "0 0 4px", color: "var(--color-text-secondary)" }}>No leave applications found</p>
            <p style={{ fontSize: "13px", margin: 0 }}>Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                <thead>
                  <tr>
                    {["Employee", "Department", "Type", "From", "To", "Days", "Status", "Applied", "Reviewed By", "Actions"].map((h) => (
                      <th key={h} style={{ textAlign: "left", padding: "10px 12px", fontWeight: 600, color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", fontSize: "12px", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => (
                    <tr key={leave._id} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                      <td style={{ padding: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{leave.employeeId?.fullName || "—"}</td>
                      <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>{leave.department?.name || "—"}</td>
                      <td style={{ padding: "12px", fontWeight: 600, color: "var(--color-text-primary)", textTransform: "capitalize" }}>
                        {leave.leaveType}
                        {leave.isHalfDay && <span style={{ fontSize: "10px", fontWeight: 600, backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)", padding: "2px 6px", borderRadius: "4px", marginLeft: "6px" }}>Half</span>}
                      </td>
                      <td style={{ padding: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatDate(leave.fromDate)}</td>
                      <td style={{ padding: "12px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{formatDate(leave.toDate)}</td>
                      <td style={{ padding: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{leave.totalDays}</td>
                      <td style={{ padding: "12px" }}><StatusBadge status={leave.status} /></td>
                      <td style={{ padding: "12px", color: "var(--color-text-muted)", whiteSpace: "nowrap" }}>{formatDate(leave.appliedAt)}</td>
                      <td style={{ padding: "12px", color: "var(--color-text-secondary)" }}>{leave.reviewedBy?.fullName || "—"}</td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                          <button onClick={() => handleViewDetail(leave._id)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", cursor: "pointer", display: "flex", alignItems: "center" }} title="View Details">
                            <Eye size={14} />
                          </button>
                          {leave.status === "pending" && (
                            <>
                              {rejectingId === `main-${leave._id}` ? (
                                <div style={{ display: "flex", flexDirection: "column", gap: "4px", minWidth: "180px" }}>
                                  <input type="text" value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder="Reason..." style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "12px", outline: "none" }} />
                                  <div style={{ display: "flex", gap: "4px" }}>
                                    <button onClick={() => handleReview(leave._id, "reject")} disabled={reviewingId === leave._id} style={{ padding: "3px 8px", borderRadius: "4px", border: "1px solid var(--color-negative)", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)", fontSize: "11px", fontWeight: 600, cursor: "pointer" }}>
                                      {reviewingId === leave._id ? "..." : "Reject"}
                                    </button>
                                    <button onClick={() => { setRejectingId(null); setRejectReason(""); }} style={{ padding: "3px 6px", borderRadius: "4px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", fontSize: "11px", cursor: "pointer" }}>
                                      <X size={12} />
                                    </button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <button onClick={() => handleReview(leave._id, "approve")} disabled={reviewingId === leave._id} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-positive)", backgroundColor: "transparent", color: "var(--color-positive)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                    <Check size={14} />
                                  </button>
                                  <button onClick={() => setRejectingId(`main-${leave._id}`)} style={{ padding: "4px 8px", borderRadius: "6px", border: "1px solid var(--color-negative)", backgroundColor: "transparent", color: "var(--color-negative)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}>
                                    <X size={14} />
                                  </button>
                                </>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "16px", paddingTop: "12px", borderTop: "1px solid var(--color-border-light)" }}>
                <span style={{ fontSize: "13px", color: "var(--color-text-muted)", fontWeight: 500 }}>
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button onClick={() => fetchLeaves(pagination.page - 1)} disabled={pagination.page <= 1} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: pagination.page <= 1 ? "var(--color-text-muted)" : "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: pagination.page <= 1 ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px", opacity: pagination.page <= 1 ? 0.5 : 1 }}>
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button onClick={() => fetchLeaves(pagination.page + 1)} disabled={pagination.page >= pagination.totalPages} style={{ padding: "6px 12px", borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: pagination.page >= pagination.totalPages ? "var(--color-text-muted)" : "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: pagination.page >= pagination.totalPages ? "not-allowed" : "pointer", display: "flex", alignItems: "center", gap: "4px", opacity: pagination.page >= pagination.totalPages ? 0.5 : 1 }}>
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* ── Detail Drawer ── */}
      {drawerOpen && selectedLeave && (
        <div style={{ position: "fixed", top: 0, right: 0, bottom: 0, width: "420px", backgroundColor: "var(--color-card)", borderLeft: "1px solid var(--color-border)", boxShadow: "-4px 0 24px rgba(0,0,0,0.1)", zIndex: 50, overflowY: "auto", padding: "24px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Leave Details</h3>
            <button onClick={() => setDrawerOpen(false)} style={{ padding: "6px", borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
              <X size={18} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[
              { label: "Employee", value: selectedLeave.employeeId?.fullName },
              { label: "Email", value: selectedLeave.employeeId?.email },
              { label: "Leave Type", value: selectedLeave.leaveType, capitalize: true },
              { label: "Half Day", value: selectedLeave.isHalfDay ? "Yes" : "No" },
              { label: "From", value: formatDate(selectedLeave.fromDate) },
              { label: "To", value: formatDate(selectedLeave.toDate) },
              { label: "Total Days", value: selectedLeave.totalDays },
              { label: "Reason", value: selectedLeave.reason },
              { label: "Applied On", value: formatDate(selectedLeave.appliedAt) },
              { label: "Reviewed By", value: selectedLeave.reviewedBy?.fullName || "—" },
              { label: "Reviewed At", value: selectedLeave.reviewedAt ? formatDate(selectedLeave.reviewedAt) : "—" },
              { label: "Rejection Reason", value: selectedLeave.rejectionReason || "—" },
            ].map((item) => (
              <div key={item.label}>
                <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{item.label}</p>
                <p style={{ fontSize: "14px", fontWeight: 500, color: "var(--color-text-primary)", margin: 0, textTransform: item.capitalize ? "capitalize" : "none" }}>{item.value}</p>
              </div>
            ))}
            <div>
              <p style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>Status</p>
              <StatusBadge status={selectedLeave.status} />
            </div>
          </div>
        </div>
      )}

      {/* Drawer backdrop */}
      {drawerOpen && (
        <div onClick={() => setDrawerOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.3)", zIndex: 49 }} />
      )}

      {/* ── Balance Modal ── */}
      {balanceModalOpen && (
        <>
          <div onClick={() => setBalanceModalOpen(false)} style={{ position: "fixed", top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", zIndex: 60 }} />
          <div style={{ position: "fixed", top: "50%", left: "50%", transform: "translate(-50%, -50%)", width: "520px", maxHeight: "80vh", backgroundColor: "var(--color-card)", borderRadius: "20px", border: "1px solid var(--color-border)", boxShadow: "0 8px 32px rgba(0,0,0,0.15)", zIndex: 61, overflowY: "auto", padding: "28px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
              <h3 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>Update Leave Balance</h3>
              <button onClick={() => setBalanceModalOpen(false)} style={{ padding: "6px", borderRadius: "8px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-muted)", cursor: "pointer" }}>
                <X size={18} />
              </button>
            </div>

            {/* Year selection */}
            <div style={{ marginBottom: "16px" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Year</label>
              <CustomDropdown
                value={balanceYear}
                onChange={setBalanceYear}
                options={yearOptions.map((y) => ({ value: String(y), label: String(y) }))}
                minWidth={130}
              />
            </div>

            {/* Search */}
            <div style={{ marginBottom: "16px", position: "relative" }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Search Employee</label>
              <div style={{ position: "relative" }}>
                <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
                <input
                  type="text"
                  value={balanceSearch}
                  onChange={(e) => setBalanceSearch(e.target.value)}
                  placeholder="Type employee name..."
                  style={{ width: "100%", padding: "10px 12px 10px 36px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 500, outline: "none" }}
                />
              </div>
              {balanceSearchResults.length > 0 && !selectedBalanceUser && (
                <div style={{ position: "absolute", top: "100%", left: 0, right: 0, backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)", borderRadius: "10px", maxHeight: "200px", overflowY: "auto", zIndex: 10, boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                  {balanceSearchResults.map((u) => (
                    <button key={u._id} onClick={() => { setSelectedBalanceUser(u); setBalanceSearch(u.fullName); setBalanceSearchResults([]); }} style={{ width: "100%", padding: "10px 14px", border: "none", backgroundColor: "transparent", color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 500, cursor: "pointer", textAlign: "left", borderBottom: "1px solid var(--color-border-light)" }}>
                      {u.fullName} <span style={{ color: "var(--color-text-muted)", fontSize: "12px" }}>({u.email})</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Balance editing */}
            {selectedBalanceUser && (
              <div>
                <p style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", marginBottom: "12px" }}>
                  Balance for {selectedBalanceUser.fullName} — {balanceYear}
                </p>
                {balanceLoading ? <Loader variant="section" /> : userBalance ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                    {["casual", "sick", "annual", "unpaid"].map((type) => (
                      <div key={type} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", borderRadius: "10px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary)", margin: "0 0 2px", textTransform: "capitalize" }}>{type}</p>
                          <p style={{ fontSize: "11px", color: "var(--color-text-muted)", margin: 0 }}>
                            Used: {userBalance[type].used} | Remaining: {userBalance[type].remaining}
                          </p>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          <label style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600 }}>Total:</label>
                          <input
                            type="number"
                            min={userBalance[type].used}
                            value={editedBalances[type] ?? userBalance[type].total}
                            onChange={(e) => setEditedBalances((prev) => ({ ...prev, [type]: e.target.value }))}
                            style={{ width: "70px", padding: "6px 8px", borderRadius: "6px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "14px", fontWeight: 600, textAlign: "center", outline: "none" }}
                          />
                          <button
                            onClick={() => handleSaveBalance(type)}
                            disabled={balanceSaving}
                            style={{ padding: "6px 12px", borderRadius: "6px", border: "none", backgroundColor: "var(--color-btn-bg)", color: "var(--color-btn-text)", fontSize: "12px", fontWeight: 600, cursor: "pointer" }}
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </div>
        </>
      )}
    </HRLayout>
  );
};

export default HRLeave;
