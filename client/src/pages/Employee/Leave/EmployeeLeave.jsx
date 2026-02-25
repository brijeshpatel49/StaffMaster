import { useState, useEffect, useCallback } from "react";
import EmployeeLayout from "../../../layouts/EmployeeLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Clock,
  Send,
  X,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const LEAVE_TYPES = [
  { value: "casual", label: "Casual Leave" },
  { value: "sick", label: "Sick Leave" },
  { value: "annual", label: "Annual Leave" },
  { value: "unpaid", label: "Unpaid Leave" },
];

const STATUS_COLORS = {
  pending: {
    bg: "var(--color-icon-yellow-bg)",
    text: "var(--color-icon-yellow)",
    border: "var(--color-icon-yellow)",
  },
  approved: {
    bg: "var(--color-positive-bg)",
    text: "var(--color-positive)",
    border: "var(--color-positive)",
  },
  rejected: {
    bg: "var(--color-negative-bg)",
    text: "var(--color-negative)",
    border: "var(--color-negative)",
  },
  cancelled: {
    bg: "var(--color-border-light)",
    text: "var(--color-text-muted)",
    border: "var(--color-text-muted)",
  },
};

const BALANCE_COLORS = {
  casual: {
    border: "var(--color-icon-blue)",
    bg: "var(--color-icon-blue-bg)",
    text: "var(--color-icon-blue)",
  },
  sick: {
    border: "var(--color-negative)",
    bg: "var(--color-negative-bg)",
    text: "var(--color-negative)",
  },
  annual: {
    border: "var(--color-positive)",
    bg: "var(--color-positive-bg)",
    text: "var(--color-positive)",
  },
  unpaid: {
    border: "var(--color-text-muted)",
    bg: "var(--color-border-light)",
    text: "var(--color-text-muted)",
  },
};

const formatDate = (d) => {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const toInputDate = (d) => {
  if (!d) return "";
  const date = new Date(d);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

const getTodayStr = () => toInputDate(new Date());

/**
 * Count working days between two date strings (inclusive), excluding Sundays.
 */
const calculateWorkingDays = (from, to, isHalfDay) => {
  if (isHalfDay) return 0.5;
  if (!from || !to) return 0;

  const start = new Date(from);
  const end = new Date(to);
  if (end < start) return 0;

  let count = 0;
  const current = new Date(start);
  while (current <= end) {
    if (current.getDay() !== 0) count++;
    current.setDate(current.getDate() + 1);
  }
  return count;
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.cancelled;
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



const SkeletonCard = () => (
  <div
    style={{
      backgroundColor: "var(--color-card)",
      borderRadius: "16px",
      padding: "20px",
      border: "1px solid var(--color-border)",
      height: "100px",
      animation: "pulse 1.5s ease-in-out infinite",
    }}
  >
    <style>{`@keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.5; } }`}</style>
  </div>
);

// ── Main Component ───────────────────────────────────────────────────────────

const EmployeeLeave = () => {
  const { API, user } = useAuth();

  // Balance state
  const [balance, setBalance] = useState(null);
  const [balanceLoading, setBalanceLoading] = useState(true);

  // Today's attendance check (for half-day enforcement)
  const [alreadyCheckedIn, setAlreadyCheckedIn] = useState(false);

  // Apply leave form state
  const [form, setForm] = useState({
    leaveType: "casual",
    fromDate: "",
    toDate: "",
    reason: "",
    isHalfDay: false,
  });
  const [applyLoading, setApplyLoading] = useState(false);

  // Leave history state
  const [leaves, setLeaves] = useState([]);
  const [leavesLoading, setLeavesLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("all");
  const [pagination, setPagination] = useState({
    page: 1,
    totalPages: 1,
    total: 0,
  });
  const [cancellingId, setCancellingId] = useState(null);
  const [confirmCancel, setConfirmCancel] = useState(null);

  // ── Fetch Balance ──
  const fetchBalance = useCallback(async () => {
    setBalanceLoading(true);
    try {
      const result = await apiFetch(`${API}/leave/balance`);
      if (result?.data?.success) {
        setBalance(result.data.data);
      }
    } catch (err) {
      console.error("Failed to fetch balance:", err);
    } finally {
      setBalanceLoading(false);
    }
  }, [API]);

  // ── Fetch today's attendance to check if already checked in ──
  const fetchTodayAttendance = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/attendance/today`);
      if (result?.data?.success && result.data.data?.checkIn != null) {
        setAlreadyCheckedIn(true);
      } else {
        setAlreadyCheckedIn(false);
      }
    } catch (err) {
      // Silently fail — don't break leave form
      console.error("Failed to fetch today attendance:", err);
      setAlreadyCheckedIn(false);
    }
  }, [API]);

  // ── Fetch Leaves ──
  const fetchLeaves = useCallback(
    async (page = 1) => {
      setLeavesLoading(true);
      try {
        const params = new URLSearchParams({ page, limit: 10 });
        if (statusFilter !== "all") params.set("status", statusFilter);

        const result = await apiFetch(`${API}/leave/my?${params}`);
        if (result?.data?.success) {
          setLeaves(result.data.data.leaves);
          setPagination({
            page: result.data.data.pagination.page,
            totalPages: result.data.data.pagination.totalPages,
            total: result.data.data.pagination.total,
          });
          if (result.data.data.balance) {
            setBalance(result.data.data.balance);
          }
        }
      } catch (err) {
        console.error("Failed to fetch leaves:", err);
      } finally {
        setLeavesLoading(false);
      }
    },
    [API, statusFilter]
  );

  useEffect(() => {
    fetchBalance();
    fetchTodayAttendance();
  }, [fetchBalance, fetchTodayAttendance]);

  useEffect(() => {
    fetchLeaves(1);
  }, [fetchLeaves]);

  // ── Checked-in today + fromDate is today → force half-day ──
  const fromDateIsToday = form.fromDate === getTodayStr();
  const forceHalfDay = alreadyCheckedIn && fromDateIsToday;

  // ── Form Calculations ──
  const effectiveIsHalfDay = forceHalfDay ? true : form.isHalfDay;
  const calculatedDays = calculateWorkingDays(
    form.fromDate,
    form.toDate,
    effectiveIsHalfDay
  );
  const selectedBalance = balance ? balance[form.leaveType] : null;
  const exceedsBalance =
    selectedBalance &&
    form.leaveType !== "unpaid" &&
    calculatedDays > selectedBalance.remaining;

  const reasonTooShort = form.reason.trim().length > 0 && form.reason.trim().length < 10;
  const dateInPast = form.fromDate && form.fromDate < getTodayStr();
  const toBeforeFrom = form.fromDate && form.toDate && form.toDate < form.fromDate;

  const canSubmit =
    form.leaveType &&
    form.fromDate &&
    form.toDate &&
    form.reason.trim().length >= 10 &&
    calculatedDays > 0 &&
    !exceedsBalance &&
    !dateInPast &&
    !toBeforeFrom &&
    !applyLoading;

  // ── Handle Form Changes ──
  const handleFormChange = (field, value) => {
    setForm((prev) => {
      const updated = { ...prev, [field]: value };

      // When fromDate changes to today and employee already checked in, force half-day
      if (field === "fromDate") {
        const isToday = value === getTodayStr();
        if (alreadyCheckedIn && isToday) {
          updated.isHalfDay = true;
          updated.toDate = value;
        }
      }

      if (field === "isHalfDay" && value) {
        updated.toDate = updated.fromDate;
      }
      if (field === "fromDate" && (prev.isHalfDay || updated.isHalfDay)) {
        updated.toDate = value;
      }
      return updated;
    });
  };

  // ── Apply Leave ──
  const handleApply = async (e) => {
    e.preventDefault();
    if (!canSubmit) return;

    setApplyLoading(true);
    try {
      const result = await apiFetch(`${API}/leave/apply`, {
        method: "POST",
        body: JSON.stringify({
          leaveType: form.leaveType,
          fromDate: form.fromDate,
          toDate: form.toDate,
          reason: form.reason.trim(),
          isHalfDay: effectiveIsHalfDay,
        }),
      });

      if (result?.data?.success) {
        toast.success("Leave application submitted successfully!");
        setForm({
          leaveType: "casual",
          fromDate: "",
          toDate: "",
          reason: "",
          isHalfDay: false,
        });
        fetchLeaves(1);
        fetchBalance();
      } else {
        toast.error(result?.data?.message || "Failed to apply for leave");
      }
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setApplyLoading(false);
    }
  };

  // ── Cancel Leave ──
  const handleCancel = async (leaveId) => {
    setCancellingId(leaveId);
    try {
      const result = await apiFetch(`${API}/leave/${leaveId}/cancel`, {
        method: "PATCH",
      });

      if (result?.data?.success) {
        toast.success("Leave cancelled successfully");
        setConfirmCancel(null);
        fetchLeaves(pagination.page);
        fetchBalance();
      } else {
        toast.error(result?.data?.message || "Failed to cancel leave");
      }
    } catch (err) {
      toast.error("Something went wrong");
      console.error(err);
    } finally {
      setCancellingId(null);
    }
  };

  const today = getTodayStr();

  return (
    <EmployeeLayout title="Leave Management" subtitle="Apply for leave and track your leave history">
      {/* ── A. Balance Cards ── */}
      <div style={{ marginBottom: "24px" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "12px",
          }}
        >
          <h2
            style={{
              fontSize: "16px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              margin: 0,
            }}
          >
            Leave Balance
          </h2>
          <span
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-muted)",
            }}
          >
            {new Date().getFullYear()}
          </span>
        </div>

        {balanceLoading ? (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            {[1, 2, 3, 4].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        ) : (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: "14px",
            }}
          >
            {LEAVE_TYPES.map((type) => {
              const b = balance?.[type.value];
              const c = BALANCE_COLORS[type.value];
              return (
                <div
                  key={type.value}
                  style={{
                    backgroundColor: "var(--color-card)",
                    borderRadius: "20px",
                    padding: "20px",
                    border: "1px solid var(--color-border)",
                    transition: "all 0.2s",
                  }}
                >
                  <p
                    style={{
                      fontSize: "13px",
                      fontWeight: 700,
                      color: c.text,
                      margin: "0 0 8px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    {type.label}
                  </p>
                  <p
                    style={{
                      fontSize: "32px",
                      fontWeight: 800,
                      color: "var(--color-text-primary)",
                      margin: "0 0 4px",
                      lineHeight: 1,
                    }}
                  >
                    {b?.remaining ?? "—"}
                  </p>
                  <p
                    style={{
                      fontSize: "12px",
                      fontWeight: 500,
                      color: "var(--color-text-muted)",
                      margin: 0,
                    }}
                  >
                    {b?.used ?? 0} used / {b?.total ?? 0} total
                  </p>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── B. Apply Leave Form ── */}
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid var(--color-border)",
          marginBottom: "24px",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 20px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Send size={18} style={{ color: "var(--color-accent)" }} />
          Apply for Leave
        </h2>

        <form onSubmit={handleApply}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              gap: "16px",
              marginBottom: "16px",
            }}
          >
            {/* Leave Type */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Leave Type
              </label>
              <select
                value={form.leaveType}
                onChange={(e) => handleFormChange("leaveType", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-card)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                }}
              >
                {LEAVE_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                From Date
              </label>
              <input
                type="date"
                value={form.fromDate}
                min={today}
                onChange={(e) => handleFormChange("fromDate", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: `1px solid ${dateInPast ? "var(--color-negative)" : "var(--color-border)"}`,
                  backgroundColor: "var(--color-card)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  outline: "none",
                }}
              />
              {dateInPast && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--color-negative)",
                    marginTop: "4px",
                    fontWeight: 500,
                  }}
                >
                  Cannot select past date
                </p>
              )}
            </div>

            {/* To Date */}
            <div>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                To Date
              </label>
              <input
                type="date"
                value={form.toDate}
                min={form.fromDate || today}
                disabled={effectiveIsHalfDay}
                onChange={(e) => handleFormChange("toDate", e.target.value)}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  borderRadius: "10px",
                  border: `1px solid ${toBeforeFrom ? "var(--color-negative)" : "var(--color-border)"}`,
                  backgroundColor: effectiveIsHalfDay
                    ? "var(--color-border-light)"
                    : "var(--color-card)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  outline: "none",
                  opacity: effectiveIsHalfDay ? 0.6 : 1,
                }}
              />
              {toBeforeFrom && (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--color-negative)",
                    marginTop: "4px",
                    fontWeight: 500,
                  }}
                >
                  End date must be after start date
                </p>
              )}
            </div>

            {/* Half Day */}
            <div style={{ display: "flex", flexDirection: "column" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Half Day
              </label>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "10px 0",
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    if (!forceHalfDay) {
                      handleFormChange("isHalfDay", !form.isHalfDay);
                    }
                  }}
                  disabled={forceHalfDay}
                  style={{
                    width: "44px",
                    height: "24px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: effectiveIsHalfDay
                      ? "var(--color-accent)"
                      : "var(--color-border)",
                    position: "relative",
                    cursor: forceHalfDay ? "not-allowed" : "pointer",
                    transition: "background-color 0.2s",
                    opacity: forceHalfDay ? 0.7 : 1,
                  }}
                >
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      backgroundColor: "#fff",
                      position: "absolute",
                      top: "3px",
                      left: effectiveIsHalfDay ? "23px" : "3px",
                      transition: "left 0.2s",
                    }}
                  />
                </button>
                <span
                  style={{
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text-secondary)",
                  }}
                >
                  {effectiveIsHalfDay ? "Yes" : "No"}
                </span>
              </div>
              {forceHalfDay && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "6px",
                    marginTop: "6px",
                    padding: "8px 12px",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-icon-yellow-bg)",
                    border: "1px solid var(--color-icon-yellow)",
                  }}
                >
                  <AlertCircle
                    size={14}
                    style={{
                      color: "var(--color-icon-yellow)",
                      flexShrink: 0,
                      marginTop: "1px",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "12px",
                      fontWeight: 600,
                      color: "var(--color-icon-yellow)",
                      lineHeight: 1.4,
                    }}
                  >
                    You have already checked-in today. Only half-day leave is available.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Days Count */}
          {form.fromDate && form.toDate && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: exceedsBalance
                  ? "var(--color-negative-bg)"
                  : "var(--color-icon-blue-bg)",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <Calendar
                size={16}
                style={{
                  color: exceedsBalance
                    ? "var(--color-negative)"
                    : "var(--color-icon-blue)",
                }}
              />
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 600,
                  color: exceedsBalance
                    ? "var(--color-negative)"
                    : "var(--color-icon-blue)",
                }}
              >
                {calculatedDays} working day{calculatedDays !== 1 ? "s" : ""}{" "}
                {forceHalfDay
                  ? "(0.5 days will be deducted)"
                  : "(excluding Sundays)"}
              </span>
              {exceedsBalance && (
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: 500,
                    color: "var(--color-negative)",
                    marginLeft: "auto",
                  }}
                >
                  Insufficient balance ({selectedBalance?.remaining} days
                  available)
                </span>
              )}
            </div>
          )}

          {/* Reason */}
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "6px",
              }}
            >
              Reason
            </label>
            <textarea
              value={form.reason}
              onChange={(e) => handleFormChange("reason", e.target.value)}
              placeholder="Please provide a reason for your leave (min 10 characters)..."
              rows={3}
              maxLength={500}
              style={{
                width: "100%",
                padding: "10px 12px",
                borderRadius: "10px",
                border: `1px solid ${reasonTooShort ? "var(--color-negative)" : "var(--color-border)"}`,
                backgroundColor: "var(--color-card)",
                color: "var(--color-text-primary)",
                fontSize: "14px",
                fontWeight: 500,
                outline: "none",
                resize: "vertical",
                fontFamily: "inherit",
              }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: "4px",
              }}
            >
              {reasonTooShort ? (
                <p
                  style={{
                    fontSize: "12px",
                    color: "var(--color-negative)",
                    fontWeight: 500,
                    margin: 0,
                  }}
                >
                  Minimum 10 characters required
                </p>
              ) : (
                <span />
              )}
              <p
                style={{
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  fontWeight: 500,
                  margin: 0,
                }}
              >
                {form.reason.length}/500
              </p>
            </div>
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={!canSubmit}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: canSubmit
                ? "var(--color-btn-bg)"
                : "var(--color-border)",
              color: canSubmit
                ? "var(--color-btn-text)"
                : "var(--color-text-muted)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: canSubmit ? "pointer" : "not-allowed",
              display: "flex",
              alignItems: "center",
              gap: "8px",
              transition: "all 0.2s",
            }}
          >
            <Send size={16} />
            {applyLoading ? "Submitting..." : "Apply for Leave"}
          </button>
        </form>
      </div>

      {/* ── C. Leave History ── */}
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "16px",
          padding: "24px",
          border: "1px solid var(--color-border)",
        }}
      >
        <h2
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            margin: "0 0 16px",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Clock size={18} style={{ color: "var(--color-accent)" }} />
          Leave History
        </h2>

        {/* Status Tabs */}
        <div
          style={{
            display: "flex",
            gap: "4px",
            marginBottom: "16px",
            backgroundColor: "var(--color-surface)",
            borderRadius: "10px",
            padding: "4px",
            flexWrap: "wrap",
          }}
        >
          {["all", "pending", "approved", "rejected", "cancelled"].map(
            (tab) => (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                style={{
                  padding: "8px 16px",
                  borderRadius: "8px",
                  border: "none",
                  backgroundColor:
                    statusFilter === tab
                      ? "var(--color-card)"
                      : "transparent",
                  color:
                    statusFilter === tab
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                  textTransform: "capitalize",
                  transition: "all 0.2s",
                  boxShadow:
                    statusFilter === tab
                      ? "0 1px 3px rgba(0,0,0,0.08)"
                      : "none",
                }}
              >
                {tab === "all" ? "All" : tab}
              </button>
            )
          )}
        </div>

        {/* Table */}
        {leavesLoading ? (
          <Loader variant="section" />
        ) : leaves.length === 0 ? (
          <div
            style={{
              textAlign: "center",
              padding: "40px 20px",
              color: "var(--color-text-muted)",
            }}
          >
            <Calendar
              size={40}
              style={{
                margin: "0 auto 12px",
                opacity: 0.4,
                color: "var(--color-text-muted)",
              }}
            />
            <p
              style={{
                fontSize: "14px",
                fontWeight: 600,
                margin: "0 0 4px",
                color: "var(--color-text-secondary)",
              }}
            >
              No leave applications found
            </p>
            <p style={{ fontSize: "13px", margin: 0 }}>
              {statusFilter === "all"
                ? "You haven't applied for any leaves yet."
                : `No ${statusFilter} leaves.`}
            </p>
          </div>
        ) : (
          <>
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: "13px",
                }}
              >
                <thead>
                  <tr>
                    {[
                      "Type",
                      "From",
                      "To",
                      "Days",
                      "Reason",
                      "Applied On",
                      "Status",
                      "Action",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: "left",
                          padding: "10px 12px",
                          fontWeight: 600,
                          color: "var(--color-text-muted)",
                          borderBottom: "1px solid var(--color-border)",
                          fontSize: "12px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {leaves.map((leave) => {
                    const canCancelLeave =
                      leave.status === "pending" ||
                      (leave.status === "approved" &&
                        new Date(leave.fromDate) > new Date());

                    return (
                      <tr
                        key={leave._id}
                        style={{
                          borderBottom: "1px solid var(--color-border-light)",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            textTransform: "capitalize",
                          }}
                        >
                          {leave.leaveType}
                          {leave.isHalfDay && (
                            <span
                              style={{
                                fontSize: "10px",
                                fontWeight: 600,
                                backgroundColor: "var(--color-accent-bg)",
                                color: "var(--color-accent)",
                                padding: "2px 6px",
                                borderRadius: "4px",
                                marginLeft: "6px",
                              }}
                            >
                              Half
                            </span>
                          )}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(leave.fromDate)}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-secondary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(leave.toDate)}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {leave.totalDays}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-secondary)",
                            maxWidth: "200px",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            whiteSpace: "nowrap",
                          }}
                          title={leave.reason}
                        >
                          {leave.reason}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-muted)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDate(leave.appliedAt)}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <StatusBadge status={leave.status} />
                        </td>
                        <td style={{ padding: "12px" }}>
                          {canCancelLeave ? (
                            confirmCancel === leave._id ? (
                              <div
                                style={{
                                  display: "flex",
                                  gap: "6px",
                                  alignItems: "center",
                                }}
                              >
                                <button
                                  onClick={() => handleCancel(leave._id)}
                                  disabled={cancellingId === leave._id}
                                  style={{
                                    padding: "4px 10px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--color-negative)",
                                    backgroundColor: "var(--color-negative-bg)",
                                    color: "var(--color-negative)",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    whiteSpace: "nowrap",
                                  }}
                                >
                                  {cancellingId === leave._id
                                    ? "..."
                                    : "Confirm"}
                                </button>
                                <button
                                  onClick={() => setConfirmCancel(null)}
                                  style={{
                                    padding: "4px 8px",
                                    borderRadius: "6px",
                                    border: "1px solid var(--color-border)",
                                    backgroundColor: "transparent",
                                    color: "var(--color-text-muted)",
                                    fontSize: "12px",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                  }}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => setConfirmCancel(leave._id)}
                                style={{
                                  padding: "4px 10px",
                                  borderRadius: "6px",
                                  border: "1px solid var(--color-negative)",
                                  backgroundColor: "transparent",
                                  color: "var(--color-negative)",
                                  fontSize: "12px",
                                  fontWeight: 600,
                                  cursor: "pointer",
                                }}
                              >
                                Cancel
                              </button>
                            )
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: "16px",
                  paddingTop: "12px",
                  borderTop: "1px solid var(--color-border-light)",
                }}
              >
                <span
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                    fontWeight: 500,
                  }}
                >
                  Page {pagination.page} of {pagination.totalPages} ({pagination.total} total)
                </span>
                <div style={{ display: "flex", gap: "6px" }}>
                  <button
                    onClick={() => fetchLeaves(pagination.page - 1)}
                    disabled={pagination.page <= 1}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "transparent",
                      color:
                        pagination.page <= 1
                          ? "var(--color-text-muted)"
                          : "var(--color-text-primary)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor: pagination.page <= 1 ? "not-allowed" : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      opacity: pagination.page <= 1 ? 0.5 : 1,
                    }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <button
                    onClick={() => fetchLeaves(pagination.page + 1)}
                    disabled={pagination.page >= pagination.totalPages}
                    style={{
                      padding: "6px 12px",
                      borderRadius: "8px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "transparent",
                      color:
                        pagination.page >= pagination.totalPages
                          ? "var(--color-text-muted)"
                          : "var(--color-text-primary)",
                      fontSize: "13px",
                      fontWeight: 600,
                      cursor:
                        pagination.page >= pagination.totalPages
                          ? "not-allowed"
                          : "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      opacity:
                        pagination.page >= pagination.totalPages ? 0.5 : 1,
                    }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeLeave;
