import { useState, useEffect, useCallback } from "react";
import EmployeeLayout from "../../../layouts/EmployeeLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";
import {
  Clock,
  LogIn,
  LogOut,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  TrendingUp,
  Timer,
  Coffee,
  Palmtree,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  present: {
    bg: "var(--color-positive-bg)",
    text: "var(--color-positive)",
    border: "var(--color-positive)",
  },
  late: {
    bg: "var(--color-icon-yellow-bg)",
    text: "var(--color-icon-yellow)",
    border: "var(--color-icon-yellow)",
  },
  "half-day": {
    bg: "var(--color-icon-purple-bg)",
    text: "var(--color-icon-purple)",
    border: "var(--color-icon-purple)",
  },
  absent: {
    bg: "var(--color-negative-bg)",
    text: "var(--color-negative)",
    border: "var(--color-negative)",
  },
  "on-leave": {
    bg: "var(--color-icon-blue-bg)",
    text: "var(--color-icon-blue)",
    border: "var(--color-icon-blue)",
  },
};

const formatTime = (dateStr) => {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const formatDateFull = (d) =>
  d.toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getDayName = (dateStr) => {
  return new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short" });
};

const StatusBadge = ({ status }) => {
  const c = STATUS_COLORS[status] || STATUS_COLORS.absent;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
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
      <p
        style={{
          fontSize: "22px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: 0,
          lineHeight: 1.2,
        }}
      >
        {value}
      </p>
      <p
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          margin: "2px 0 0",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </p>
    </div>
  </div>
);



// ── Month Selector ───────────────────────────────────────────────────────────

const MonthSelector = ({ month, year, onChange }) => {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({
      value: `${d.getMonth() + 1}-${d.getFullYear()}`,
      label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    });
  }

  return (
    <CustomDropdown
      value={`${month}-${year}`}
      onChange={(val) => {
        const [m, y] = val.split("-").map(Number);
        onChange(m, y);
      }}
      options={options}
      minWidth={180}
    />
  );
};

// ── Main Component ───────────────────────────────────────────────────────────

const EmployeeAttendance = () => {
  const { API } = useAuth();

  // Live clock
  const [currentTime, setCurrentTime] = useState(new Date());

  // Today status
  const [todayData, setTodayData] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");

  // Active approved leave for today
  const [activeLeave, setActiveLeave] = useState(null);

  // Monthly data
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [monthData, setMonthData] = useState(null);
  const [monthLoading, setMonthLoading] = useState(true);

  // Confirm dialog
  const [showConfirm, setShowConfirm] = useState(false);

  // Live clock tick
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Fetch today status + active approved leaves in parallel
  const fetchToday = useCallback(async () => {
    setTodayLoading(true);
    try {
      const [attendanceResult, leaveResult] = await Promise.all([
        apiFetch(`${API}/attendance/today`),
        apiFetch(`${API}/leave/my?status=approved&limit=50`),
      ]);

      if (attendanceResult?.data?.success) {
        setTodayData(attendanceResult.data.data);
      }

      // Find active approved leave covering today
      if (leaveResult?.data?.success && leaveResult.data.data?.leaves) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);
        const todayEnd = new Date();
        todayEnd.setHours(23, 59, 59, 999);

        const todayLeave = leaveResult.data.data.leaves.find((l) => {
          const from = new Date(l.fromDate);
          const to = new Date(l.toDate);
          return (
            l.status === "approved" && from <= todayEnd && to >= todayStart
          );
        });
        setActiveLeave(todayLeave || null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setTodayLoading(false);
    }
  }, [API]);

  // Fetch monthly
  const fetchMonthly = useCallback(async () => {
    setMonthLoading(true);
    try {
      const result = await apiFetch(
        `${API}/attendance/my?month=${month}&year=${year}`,
      );
      if (result?.data?.success) setMonthData(result.data.data);
    } catch (err) {
      console.error(err);
    } finally {
      setMonthLoading(false);
    }
  }, [API, month, year]);

  useEffect(() => {
    fetchToday();
  }, [fetchToday]);
  useEffect(() => {
    fetchMonthly();
  }, [fetchMonthly]);

  // Actions
  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const result = await apiFetch(`${API}/attendance/checkin`, {
        method: "POST",
      });
      if (result?.data?.success) {
        await fetchToday();
        fetchMonthly();
      } else {
        const msg = result?.data?.message || "Check-in failed";
        setActionError(msg);
        // If backend returns approved leave error, refresh to show leave card
        if (msg.toLowerCase().includes("approved leave")) {
          await fetchToday();
        }
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setShowConfirm(false);
    setActionLoading(true);
    setActionError("");
    try {
      const result = await apiFetch(`${API}/attendance/checkout`, {
        method: "POST",
      });
      if (result?.data?.success) {
        await fetchToday();
        fetchMonthly();
      } else {
        setActionError(result?.data?.message || "Check-out failed");
      }
    } catch {
      setActionError("Network error. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  // Work duration (live counter)
  const getWorkDuration = () => {
    if (!todayData?.checkIn) return null;
    const end = todayData.checkOut
      ? new Date(todayData.checkOut)
      : currentTime;
    const diffMs = end.getTime() - new Date(todayData.checkIn).getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return { hours, minutes, total: diffMs };
  };

  const workDur = getWorkDuration();
  const summary = monthData?.summary;
  const records = monthData?.records || [];

  // Determine check-in/out state
  const hasCheckedIn = todayData && todayData.checkIn;
  const hasCheckedOut = todayData && todayData.checkOut;

  // Determine if employee is on leave today (via attendance status or active leave)
  const isOnLeaveToday =
    (todayData && todayData.status === "on-leave") ||
    (activeLeave && !hasCheckedIn);

  // Format leave dates for display
  const formatLeaveDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Date(dateStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <EmployeeLayout
      title="Attendance"
      subtitle="Track your daily attendance and work hours."
    >
      {/* ── On-Leave Card (shown instead of check-in when on approved leave) ── */}
      {!todayLoading && isOnLeaveToday && (
          <div
            style={{
              backgroundColor: "var(--color-card)",
              borderRadius: "20px",
              padding: "32px",
              border: "2px solid var(--color-icon-blue)",
              marginBottom: "24px",
              textAlign: "center",
              background:
                "linear-gradient(135deg, var(--color-icon-blue-bg) 0%, var(--color-card) 100%)",
            }}
          >
            <div
              style={{
                width: "64px",
                height: "64px",
                borderRadius: "50%",
                backgroundColor: "var(--color-icon-blue-bg)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                margin: "0 auto 16px",
                border: "2px solid var(--color-icon-blue)",
              }}
            >
              <Palmtree size={32} color="var(--color-icon-blue)" />
            </div>
            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              You're on approved leave today
            </h2>
            <p
              style={{
                margin: "0 0 20px",
                fontSize: "15px",
                color: "var(--color-text-secondary)",
                fontWeight: 500,
              }}
            >
              Enjoy your time off! No check-in required.
            </p>
            {activeLeave && (
              <div
                style={{
                  display: "inline-flex",
                  gap: "24px",
                  padding: "16px 28px",
                  borderRadius: "14px",
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  flexWrap: "wrap",
                  justifyContent: "center",
                }}
              >
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    Leave Type
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "15px",
                      fontWeight: 700,
                      color: "var(--color-icon-blue)",
                      textTransform: "capitalize",
                    }}
                  >
                    {activeLeave.leaveType} Leave
                  </p>
                </div>
                <div
                  style={{
                    width: "1px",
                    backgroundColor: "var(--color-border)",
                    alignSelf: "stretch",
                  }}
                />
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    From
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {formatLeaveDate(activeLeave.fromDate)}
                  </p>
                </div>
                <div
                  style={{
                    width: "1px",
                    backgroundColor: "var(--color-border)",
                    alignSelf: "stretch",
                  }}
                />
                <div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      fontWeight: 700,
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                    }}
                  >
                    To
                  </p>
                  <p
                    style={{
                      margin: "4px 0 0",
                      fontSize: "15px",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {formatLeaveDate(activeLeave.toDate)}
                  </p>
                </div>
                {activeLeave.isHalfDay && (
                  <>
                    <div
                      style={{
                        width: "1px",
                        backgroundColor: "var(--color-border)",
                        alignSelf: "stretch",
                      }}
                    />
                    <div>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "11px",
                          fontWeight: 700,
                          color: "var(--color-text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        }}
                      >
                        Type
                      </p>
                      <p
                        style={{
                          margin: "4px 0 0",
                          fontSize: "15px",
                          fontWeight: 600,
                          color: "var(--color-icon-yellow)",
                        }}
                      >
                        Half Day
                      </p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}

        {/* ── Check-in/out Card (hidden when on leave with no check-in) ── */}
        {!(isOnLeaveToday && !hasCheckedIn) && (
          <div
            style={{
              backgroundColor: "var(--color-card)",
              borderRadius: "20px",
              padding: "24px 32px",
              border: "1px solid var(--color-border)",
              marginBottom: "24px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "24px",
              flexWrap: "wrap",
            }}
          >
            {/* ── Left: Clock + Date + Check-in info ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
              }}
            >
              {/* Live Clock */}
              <div>
                <p
                  style={{
                    fontSize: "32px",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    margin: 0,
                    fontVariantNumeric: "tabular-nums",
                    lineHeight: 1.2,
                  }}
                >
                  {currentTime.toLocaleTimeString("en-IN", {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    hour12: true,
                  })}
                </p>
                <p
                  style={{
                    fontSize: "13px",
                    color: "var(--color-text-muted)",
                    margin: "4px 0 0",
                    fontWeight: 500,
                  }}
                >
                  {formatDateFull(currentTime)}
                </p>
              </div>

              {/* Divider */}
              <div
                style={{
                  width: "1px",
                  height: "48px",
                  backgroundColor: "var(--color-border)",
                  flexShrink: 0,
                }}
              />

              {/* Status info */}
              {todayLoading ? (
                <Loader variant="inline" />
              ) : !hasCheckedIn ? (
                <p
                  style={{
                    color: "var(--color-text-muted)",
                    margin: 0,
                    fontSize: "14px",
                    fontWeight: 500,
                  }}
                >
                  You haven't checked in yet
                </p>
              ) : (
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "6px",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "10px",
                    }}
                  >
                    <LogIn
                      size={15}
                      style={{ color: "var(--color-positive)", flexShrink: 0 }}
                    />
                    <span
                      style={{
                        color: "var(--color-text-secondary)",
                        fontSize: "14px",
                      }}
                    >
                      Checked in at{" "}
                      <strong style={{ color: "var(--color-text-primary)" }}>
                        {formatTime(todayData.checkIn)}
                      </strong>
                    </span>
                    <StatusBadge status={todayData.status} />
                  </div>
                  {hasCheckedOut && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "10px",
                      }}
                    >
                      <LogOut
                        size={15}
                        style={{
                          color: "var(--color-negative)",
                          flexShrink: 0,
                        }}
                      />
                      <span
                        style={{
                          color: "var(--color-text-secondary)",
                          fontSize: "14px",
                        }}
                      >
                        Checked out at{" "}
                        <strong style={{ color: "var(--color-text-primary)" }}>
                          {formatTime(todayData.checkOut)}
                        </strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: Working time + Action button ── */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "20px",
                flexShrink: 0,
              }}
            >
              {todayLoading ? null : !hasCheckedIn ? (
                <button
                  onClick={handleCheckIn}
                  disabled={actionLoading}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "8px",
                    padding: "12px 32px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "var(--color-accent)",
                    color: "#fff",
                    fontSize: "15px",
                    fontWeight: 700,
                    cursor: actionLoading ? "not-allowed" : "pointer",
                    opacity: actionLoading ? 0.6 : 1,
                  }}
                >
                  {actionLoading ? (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "8px",
                      }}
                    >
                      <Loader variant="button" />
                      Checking in…
                    </span>
                  ) : (
                    <>
                      <LogIn size={18} />
                      Check In
                    </>
                  )}
                </button>
              ) : !hasCheckedOut ? (
                <>
                  {workDur && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        color: "var(--color-accent)",
                        fontWeight: 600,
                        fontSize: "16px",
                      }}
                    >
                      <Timer size={16} />
                      <span>
                        Working for {workDur.hours}h {workDur.minutes}m
                      </span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={actionLoading}
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "8px",
                      padding: "12px 32px",
                      borderRadius: "12px",
                      border: "1px solid var(--color-border)",
                      backgroundColor: "var(--color-card)",
                      color: "var(--color-text-primary)",
                      fontSize: "15px",
                      fontWeight: 700,
                      cursor: actionLoading ? "not-allowed" : "pointer",
                      opacity: actionLoading ? 0.6 : 1,
                      transition: "all 0.2s ease",
                    }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow =
                          "0 4px 12px rgba(0,0,0,0.1)";
                        e.currentTarget.style.borderColor =
                          "var(--color-accent)";
                        e.currentTarget.style.color = "var(--color-accent)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = "translateY(0)";
                      e.currentTarget.style.boxShadow = "none";
                      e.currentTarget.style.borderColor = "var(--color-border)";
                      e.currentTarget.style.color = "var(--color-text-primary)";
                    }}
                  >
                    {actionLoading ? (
                      <span
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "8px",
                        }}
                      >
                        <Loader variant="button" />
                        Checking out…
                      </span>
                    ) : (
                      <>
                        <LogOut size={18} />
                        Check Out
                      </>
                    )}
                  </button>
                </>
              ) : (
                <div
                  style={{ display: "flex", alignItems: "center", gap: "16px" }}
                >
                  <p
                    style={{
                      fontSize: "16px",
                      fontWeight: 700,
                      color: "var(--color-text-primary)",
                      margin: 0,
                    }}
                  >
                    Total: {todayData.workHours?.toFixed(2)}h
                  </p>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      color:
                        todayData.workHours >= 4
                          ? "var(--color-positive)"
                          : "var(--color-icon-yellow)",
                      fontWeight: 600,
                      fontSize: "13px",
                    }}
                  >
                    {todayData.workHours >= 4 ? (
                      <>
                        <CheckCircle2 size={15} />
                      <span>Great work today!</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle size={15} />
                        <span>Short session — checked out early</span>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Error message */}
            {actionError && (
              <div
                style={{
                  width: "100%",
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  color: "var(--color-negative)",
                  fontSize: "14px",
                  fontWeight: 500,
                }}
              >
                <AlertTriangle size={14} />
                {actionError}
              </div>
            )}
          </div>
        )}

        {/* ── Confirm Dialog ── */}
        {showConfirm && (
          <div
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              zIndex: 9999,
            }}
            onClick={() => setShowConfirm(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: "var(--color-card)",
                borderRadius: "20px",
                padding: "28px",
                maxWidth: "400px",
                width: "90%",
                border: "1px solid var(--color-border)",
              }}
            >
              <h3
                style={{
                  margin: "0 0 8px",
                  color: "var(--color-text-primary)",
                  fontSize: "18px",
                }}
              >
                Ready to check out?
              </h3>
              <p
                style={{
                  color: "var(--color-text-secondary)",
                  margin: "0 0 24px",
                  fontSize: "14px",
                }}
              >
                You've worked {workDur?.hours}h {workDur?.minutes}m today.
              </p>
              <div
                style={{
                  display: "flex",
                  gap: "12px",
                  justifyContent: "flex-end",
                }}
              >
                <button
                  onClick={() => setShowConfirm(false)}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "1px solid var(--color-border)",
                    backgroundColor: "transparent",
                    color: "var(--color-text-secondary)",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleCheckOut}
                  style={{
                    padding: "10px 20px",
                    borderRadius: "10px",
                    border: "none",
                    backgroundColor: "var(--color-accent)",
                    color: "#fff",
                    fontWeight: 600,
                    cursor: "pointer",
                  }}
                >
                  Confirm Check Out
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── Summary Cards ── */}
        {summary && (
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "16px",
              marginBottom: "24px",
            }}
          >
            <StatCard
              icon={CheckCircle2}
              label="Present"
              value={summary.totalPresent}
              iconBg="var(--color-icon-green-bg)"
              iconColor="var(--color-icon-green)"
            />
            <StatCard
              icon={AlertTriangle}
              label="Late"
              value={summary.totalLate}
              iconBg="var(--color-icon-yellow-bg)"
              iconColor="var(--color-icon-yellow)"
            />
            <StatCard
              icon={Coffee}
              label="Half-day"
              value={summary.totalHalfDay}
              iconBg="var(--color-icon-purple-bg)"
              iconColor="var(--color-icon-purple)"
            />
            <StatCard
              icon={TrendingUp}
              label="Total Hours"
              value={`${summary.totalWorkHours}h`}
              iconBg="var(--color-icon-blue-bg)"
              iconColor="var(--color-icon-blue)"
            />
          </div>
        )}

        {/* ── Month Selector ── */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "16px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
              display: "flex",
              alignItems: "center",
              gap: "8px",
            }}
          >
            <Calendar size={18} style={{ flexShrink: 0 }} />
            Attendance History
          </h2>
          <MonthSelector
            month={month}
            year={year}
            onChange={(m, y) => {
              setMonth(m);
              setYear(y);
            }}
          />
        </div>

        {/* ── Attendance Table ── */}
        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "16px",
            border: "1px solid var(--color-border)",
            overflow: "hidden",
          }}
        >
          {monthLoading ? (
            <Loader variant="section" />
          ) : records.length === 0 ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <Calendar
                size={40}
                style={{
                  color: "var(--color-text-muted)",
                  marginBottom: "12px",
                }}
              />
              <p
                style={{
                  color: "var(--color-text-muted)",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                No attendance records for this month
              </p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    {[
                      "Date",
                      "Day",
                      "Check In",
                      "Check Out",
                      "Hours",
                      "Status",
                    ].map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "14px 16px",
                          textAlign: "left",
                          fontSize: "12px",
                          fontWeight: 700,
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          color: "var(--color-text-muted)",
                          borderBottom: "1px solid var(--color-border)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {records.map((r) => {
                    const isToday =
                      new Date(r.date).toDateString() ===
                      new Date().toDateString();
                    return (
                      <tr
                        key={r._id}
                        style={{
                          backgroundColor: isToday
                            ? "var(--color-accent-bg)"
                            : "transparent",
                          transition: "background-color 0.15s",
                        }}
                        onMouseEnter={(e) => {
                          if (!isToday)
                            e.currentTarget.style.backgroundColor =
                              "var(--color-border-light)";
                        }}
                        onMouseLeave={(e) => {
                          if (!isToday)
                            e.currentTarget.style.backgroundColor =
                              "transparent";
                        }}
                      >
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            borderBottom: "1px solid var(--color-border)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {formatDateShort(r.date)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          {getDayName(r.date)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          {formatTime(r.checkIn)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            color: "var(--color-text-secondary)",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          {formatTime(r.checkOut)}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            fontSize: "14px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          {r.workHours ? `${r.workHours.toFixed(2)}h` : "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px 16px",
                            borderBottom: "1px solid var(--color-border)",
                          }}
                        >
                          <StatusBadge status={r.status} />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </EmployeeLayout>
    );
  };
export default EmployeeAttendance;
