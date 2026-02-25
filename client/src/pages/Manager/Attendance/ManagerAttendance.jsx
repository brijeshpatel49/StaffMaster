import { useState, useEffect, useCallback } from "react";
import ManagerLayout from "../../../layouts/ManagerLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
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
  Users,
  Search,
  ChevronLeft,
  ChevronRight,
  XCircle,
  Info,
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

const formatDateFull = (d) =>
  d.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const formatDateShort = (dateStr) => {
  const d = new Date(dateStr);
  return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getDayName = (dateStr) => new Date(dateStr).toLocaleDateString("en-IN", { weekday: "short" });

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

const MonthSelector = ({ month, year, onChange }) => {
  const now = new Date();
  const options = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    options.push({ month: d.getMonth() + 1, year: d.getFullYear(), label: d.toLocaleDateString("en-IN", { month: "long", year: "numeric" }) });
  }
  return (
    <select
      value={`${month}-${year}`}
      onChange={(e) => { const [m, y] = e.target.value.split("-").map(Number); onChange(m, y); }}
      style={{
        padding: "8px 14px",
        borderRadius: "10px",
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-card)",
        color: "var(--color-text-primary)",
        fontSize: "14px",
        fontWeight: 600,
        cursor: "pointer",
        outline: "none",
      }}
    >
      {options.map((o) => (
        <option key={`${o.month}-${o.year}`} value={`${o.month}-${o.year}`}>{o.label}</option>
      ))}
    </select>
  );
};



const inputStyle = {
  padding: "8px 14px",
  borderRadius: "10px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  color: "var(--color-text-primary)",
  fontSize: "14px",
  outline: "none",
};

// ── Tab Button ───────────────────────────────────────────────────────────────

const TabButton = ({ active, label, icon: Icon, onClick }) => (
  <button
    onClick={onClick}
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: "6px",
      padding: "10px 20px",
      borderRadius: "12px",
      border: "none",
      fontWeight: 600,
      fontSize: "14px",
      cursor: "pointer",
      transition: "all 0.2s",
      backgroundColor: active ? "var(--color-accent-bg)" : "transparent",
      color: active ? "var(--color-accent)" : "var(--color-text-muted)",
    }}
  >
    <Icon size={18} />
    {label}
  </button>
);

// ═════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═════════════════════════════════════════════════════════════════════════════

const ManagerAttendance = () => {
  const { API, user } = useAuth();
  const [tab, setTab] = useState("my"); // "my" | "team"

  // ── My Attendance state ────────────────────────────────────────────────────
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayData, setTodayData] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState("");
  const now = new Date();
  const [myMonth, setMyMonth] = useState(now.getMonth() + 1);
  const [myYear, setMyYear] = useState(now.getFullYear());
  const [myData, setMyData] = useState(null);
  const [myLoading, setMyLoading] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);

  // ── Team Attendance state ──────────────────────────────────────────────────
  const [teamDate, setTeamDate] = useState(new Date().toISOString().split("T")[0]);
  const [teamStatus, setTeamStatus] = useState("");
  const [teamSearch, setTeamSearch] = useState("");
  const [teamData, setTeamData] = useState(null);
  const [teamLoading, setTeamLoading] = useState(false);
  const [teamPage, setTeamPage] = useState(1);
  const [teamError, setTeamError] = useState("");

  // Live clock
  useEffect(() => {
    const id = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // ── My Attendance fetchers ─────────────────────────────────────────────────
  const fetchToday = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/attendance/today`);
      if (result?.data?.success) setTodayData(result.data.data);
    } catch (err) { console.error(err); }
    finally { setTodayLoading(false); }
  }, [API]);

  const fetchMy = useCallback(async () => {
    setMyLoading(true);
    try {
      const result = await apiFetch(`${API}/attendance/my?month=${myMonth}&year=${myYear}`);
      if (result?.data?.success) setMyData(result.data.data);
    } catch (err) { console.error(err); }
    finally { setMyLoading(false); }
  }, [API, myMonth, myYear]);

  useEffect(() => { fetchToday(); }, [fetchToday]);
  useEffect(() => { fetchMy(); }, [fetchMy]);

  // ── Team fetcher ───────────────────────────────────────────────────────────
  const fetchTeam = useCallback(async () => {
    setTeamLoading(true);
    setTeamError("");
    try {
      let url = `${API}/attendance/team?date=${teamDate}&page=${teamPage}&limit=20`;
      if (teamStatus) url += `&status=${teamStatus}`;
      const result = await apiFetch(url);
      if (result?.data?.success) {
        setTeamData(result.data);
      } else {
        setTeamError(result?.data?.message || "Failed to load team data");
        setTeamData(null);
      }
    } catch {
      setTeamError("Network error");
      setTeamData(null);
    } finally {
      setTeamLoading(false);
    }
  }, [API, teamDate, teamStatus, teamPage]);

  useEffect(() => {
    if (tab === "team") fetchTeam();
  }, [tab, fetchTeam]);

  // Actions
  const handleCheckIn = async () => {
    setActionLoading(true);
    setActionError("");
    try {
      const result = await apiFetch(`${API}/attendance/checkin`, { method: "POST" });
      if (result?.data?.success) { await fetchToday(); fetchMy(); }
      else setActionError(result?.data?.message || "Check-in failed");
    } catch { setActionError("Network error"); }
    finally { setActionLoading(false); }
  };

  const handleCheckOut = async () => {
    setShowConfirm(false);
    setActionLoading(true);
    setActionError("");
    try {
      const result = await apiFetch(`${API}/attendance/checkout`, { method: "POST" });
      if (result?.data?.success) { await fetchToday(); fetchMy(); }
      else setActionError(result?.data?.message || "Check-out failed");
    } catch { setActionError("Network error"); }
    finally { setActionLoading(false); }
  };

  const getWorkDuration = () => {
    if (!todayData?.checkIn) return null;
    const end = todayData.checkOut ? new Date(todayData.checkOut) : currentTime;
    const diffMs = end.getTime() - new Date(todayData.checkIn).getTime();
    return { hours: Math.floor(diffMs / 3600000), minutes: Math.floor((diffMs % 3600000) / 60000) };
  };

  const workDur = getWorkDuration();
  const hasCheckedIn = todayData && todayData.checkIn;
  const hasCheckedOut = todayData && todayData.checkOut;
  const mySummary = myData?.summary;
  const myRecords = myData?.records || [];

  // Team table with client-side name filter + pin manager's own row first
  const filteredTeamRecords = (teamData?.data || []).filter((r) => {
    if (!teamSearch) return true;
    return r.employeeId?.fullName?.toLowerCase().includes(teamSearch.toLowerCase());
  });

  const isOwnRecord = (r) => {
    const empId = r.employeeId?._id || r.employeeId;
    return empId === user?.id || empId === user?._id;
  };

  const teamRecords = [
    ...filteredTeamRecords.filter((r) => isOwnRecord(r)),
    ...filteredTeamRecords.filter((r) => !isOwnRecord(r)),
  ];
  const teamSummary = teamData?.summary;

  return (
    <ManagerLayout title="Attendance" subtitle="Your attendance and team overview.">
      {/* ── Tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "4px",
          marginBottom: "24px",
          backgroundColor: "var(--color-card)",
          borderRadius: "14px",
          padding: "4px",
          border: "1px solid var(--color-border)",
          width: "fit-content",
        }}
      >
        <TabButton active={tab === "my"} label="My Attendance" icon={Clock} onClick={() => setTab("my")} />
        <TabButton active={tab === "team"} label="Team Attendance" icon={Users} onClick={() => setTab("team")} />
      </div>

      {/* ═══════════════════ MY ATTENDANCE TAB ═══════════════════ */}
      {tab === "my" && (
        <>
          {/* Check-in/out card */}
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
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexWrap: "wrap" }}>
              <div>
                <p style={{ fontSize: "32px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, fontVariantNumeric: "tabular-nums", lineHeight: 1.2 }}>
                  {currentTime.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: true })}
                </p>
                <p style={{ fontSize: "13px", color: "var(--color-text-muted)", margin: "4px 0 0", fontWeight: 500 }}>
                  {formatDateFull(currentTime)}
                </p>
              </div>

              <div style={{ width: "1px", height: "48px", backgroundColor: "var(--color-border)", flexShrink: 0 }} />

              {todayLoading ? <Loader variant="inline" /> : !hasCheckedIn ? (
                <p style={{ color: "var(--color-text-muted)", margin: 0, fontSize: "14px", fontWeight: 500 }}>You haven't checked in yet</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <LogIn size={15} style={{ color: "var(--color-positive)", flexShrink: 0 }} />
                    <span style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                      Checked in at <strong style={{ color: "var(--color-text-primary)" }}>{formatTime(todayData.checkIn)}</strong>
                    </span>
                    <StatusBadge status={todayData.status} />
                  </div>
                  {hasCheckedOut && (
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <LogOut size={15} style={{ color: "var(--color-negative)", flexShrink: 0 }} />
                      <span style={{ color: "var(--color-text-secondary)", fontSize: "14px" }}>
                        Checked out at <strong style={{ color: "var(--color-text-primary)" }}>{formatTime(todayData.checkOut)}</strong>
                      </span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Right: Working time + Action button ── */}
            <div style={{ display: "flex", alignItems: "center", gap: "20px", flexShrink: 0 }}>
              {todayLoading ? null : !hasCheckedIn ? (
                <button onClick={handleCheckIn} disabled={actionLoading} style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 32px", borderRadius: "12px", border: "none", backgroundColor: "var(--color-accent)", color: "#fff", fontSize: "15px", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1 }}>
                  {actionLoading ? "Checking in…" : <><LogIn size={18} /> Check In</>}
                </button>
              ) : !hasCheckedOut ? (
                <>
                  {workDur && (
                    <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-accent)", fontWeight: 600, fontSize: "16px" }}>
                      <Timer size={16} />
                      <span>Working for {workDur.hours}h {workDur.minutes}m</span>
                    </div>
                  )}
                  <button
                    onClick={() => setShowConfirm(true)}
                    disabled={actionLoading}
                    style={{ display: "inline-flex", alignItems: "center", gap: "8px", padding: "12px 32px", borderRadius: "12px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "15px", fontWeight: 700, cursor: actionLoading ? "not-allowed" : "pointer", opacity: actionLoading ? 0.6 : 1, transition: "all 0.2s ease" }}
                    onMouseEnter={(e) => {
                      if (!actionLoading) {
                        e.currentTarget.style.transform = "translateY(-1px)";
                        e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.1)";
                        e.currentTarget.style.borderColor = "var(--color-accent)";
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
                    {actionLoading ? "Checking out…" : <><LogOut size={18} /> Check Out</>}
                  </button>
                </>
              ) : (
                <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                  <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0 }}>
                    Total: {todayData.workHours?.toFixed(2)}h
                  </p>
                  <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-positive)", fontWeight: 600, fontSize: "13px" }}>
                    <CheckCircle2 size={15} />
                    <span>Great work today!</span>
                  </div>
                </div>
              )}
            </div>

            {actionError && (
              <div style={{ width: "100%", display: "flex", alignItems: "center", gap: "6px", color: "var(--color-negative)", fontSize: "14px", fontWeight: 500 }}>
                <AlertTriangle size={14} />
                {actionError}
              </div>
            )}
          </div>

          {/* Confirm Dialog */}
          {showConfirm && (
            <div style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 }} onClick={() => setShowConfirm(false)}>
              <div onClick={(e) => e.stopPropagation()} style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", padding: "28px", maxWidth: "400px", width: "90%", border: "1px solid var(--color-border)" }}>
                <h3 style={{ margin: "0 0 8px", color: "var(--color-text-primary)", fontSize: "18px" }}>Ready to check out?</h3>
                <p style={{ color: "var(--color-text-secondary)", margin: "0 0 24px", fontSize: "14px" }}>You've worked {workDur?.hours}h {workDur?.minutes}m today.</p>
                <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
                  <button onClick={() => setShowConfirm(false)} style={{ padding: "10px 20px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "transparent", color: "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer" }}>Cancel</button>
                  <button onClick={handleCheckOut} style={{ padding: "10px 20px", borderRadius: "10px", border: "none", backgroundColor: "var(--color-accent)", color: "#fff", fontWeight: 600, cursor: "pointer" }}>Confirm</button>
                </div>
              </div>
            </div>
          )}

          {/* Summary */}
          {mySummary && (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
              <StatCard icon={CheckCircle2} label="Present" value={mySummary.totalPresent} iconBg="var(--color-icon-green-bg)" iconColor="var(--color-icon-green)" />
              <StatCard icon={AlertTriangle} label="Late" value={mySummary.totalLate} iconBg="var(--color-icon-yellow-bg)" iconColor="var(--color-icon-yellow)" />
              <StatCard icon={Coffee} label="Half-day" value={mySummary.totalHalfDay} iconBg="var(--color-icon-purple-bg)" iconColor="var(--color-icon-purple)" />
              <StatCard icon={TrendingUp} label="Total Hours" value={`${mySummary.totalWorkHours}h`} iconBg="var(--color-icon-blue-bg)" iconColor="var(--color-icon-blue)" />
            </div>
          )}

          {/* Month selector + table */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
            <h2 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
              <Calendar size={18} style={{ flexShrink: 0 }} />
              Attendance History
            </h2>
            <MonthSelector month={myMonth} year={myYear} onChange={(m, y) => { setMyMonth(m); setMyYear(y); }} />
          </div>

          <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
            {myLoading ? <Loader variant="section" /> : myRecords.length === 0 ? (
              <div style={{ padding: "48px 24px", textAlign: "center" }}>
                <Calendar size={40} style={{ color: "var(--color-text-muted)", marginBottom: "12px" }} />
                <p style={{ color: "var(--color-text-muted)", fontWeight: 600, margin: 0 }}>No records for this month</p>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr>
                      {["Date", "Day", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                        <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {myRecords.map((r) => {
                      const isToday = new Date(r.date).toDateString() === new Date().toDateString();
                      return (
                        <tr key={r._id} style={{ backgroundColor: isToday ? "var(--color-accent-bg)" : "transparent" }}
                          onMouseEnter={(e) => { if (!isToday) e.currentTarget.style.backgroundColor = "var(--color-border-light)"; }}
                          onMouseLeave={(e) => { if (!isToday) e.currentTarget.style.backgroundColor = "transparent"; }}
                        >
                          <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{formatDateShort(r.date)}</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{getDayName(r.date)}</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{formatTime(r.checkIn)}</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{formatTime(r.checkOut)}</td>
                          <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>{r.workHours ? `${r.workHours.toFixed(2)}h` : "—"}</td>
                          <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}><StatusBadge status={r.status} /></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════ TEAM ATTENDANCE TAB ═══════════════════ */}
      {tab === "team" && (
        <>
          {/* Controls */}
          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <input
              type="date"
              value={teamDate}
              max={new Date().toISOString().split("T")[0]}
              onChange={(e) => { setTeamDate(e.target.value); setTeamPage(1); }}
              style={inputStyle}
            />
            <select
              value={teamStatus}
              onChange={(e) => { setTeamStatus(e.target.value); setTeamPage(1); }}
              style={{ ...inputStyle, cursor: "pointer" }}
            >
              <option value="">All Status</option>
              <option value="present">Present</option>
              <option value="late">Late</option>
              <option value="half-day">Half-day</option>
              <option value="absent">Absent</option>
            </select>
            <div style={{ position: "relative", flex: 1, minWidth: "200px" }}>
              <Search size={16} style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "var(--color-text-muted)" }} />
              <input
                type="text"
                placeholder="Search by name…"
                value={teamSearch}
                onChange={(e) => setTeamSearch(e.target.value)}
                style={{ ...inputStyle, paddingLeft: "36px", width: "100%" }}
              />
            </div>
          </div>

          {teamError && teamError.includes("not assigned") ? (
            <div style={{ padding: "40px", textAlign: "center", backgroundColor: "var(--color-card)", borderRadius: "16px", border: "1px solid var(--color-border)" }}>
              <Info size={40} style={{ color: "var(--color-icon-blue)", marginBottom: "12px" }} />
              <p style={{ color: "var(--color-text-secondary)", fontWeight: 600, margin: 0 }}>You are not assigned to any department yet</p>
            </div>
          ) : teamError ? (
            <div style={{ padding: "20px", backgroundColor: "var(--color-negative-bg)", borderRadius: "12px", border: "1px solid var(--color-negative)" }}>
              <p style={{ color: "var(--color-negative)", fontWeight: 600, margin: 0 }}>{teamError}</p>
            </div>
          ) : (
            <>
              {/* Summary strip */}
              {teamSummary && (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "12px", marginBottom: "20px" }}>
                  <StatCard icon={Users} label="Total" value={teamSummary.total} iconBg="var(--color-icon-blue-bg)" iconColor="var(--color-icon-blue)" />
                  <StatCard icon={CheckCircle2} label="Present" value={teamSummary.presentCount} iconBg="var(--color-icon-green-bg)" iconColor="var(--color-icon-green)" />
                  <StatCard icon={AlertTriangle} label="Late" value={teamSummary.lateCount} iconBg="var(--color-icon-yellow-bg)" iconColor="var(--color-icon-yellow)" />
                  <StatCard icon={XCircle} label="Absent" value={teamSummary.absentCount} iconBg="var(--color-icon-red-bg)" iconColor="var(--color-icon-red)" />
                  <StatCard icon={TrendingUp} label="Avg Hours" value={`${teamSummary.avgHours}h`} iconBg="var(--color-icon-purple-bg)" iconColor="var(--color-icon-purple)" />
                </div>
              )}

              {/* Team table */}
              <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                {teamLoading ? <Loader variant="section" /> : teamRecords.length === 0 ? (
                  <div style={{ padding: "48px 24px", textAlign: "center" }}>
                    <Users size={40} style={{ color: "var(--color-text-muted)", marginBottom: "12px" }} />
                    <p style={{ color: "var(--color-text-muted)", fontWeight: 600, margin: 0 }}>No records found</p>
                  </div>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr>
                          {["Employee", "Check In", "Check Out", "Hours", "Status"].map((h) => (
                            <th key={h} style={{ padding: "14px 16px", textAlign: "left", fontSize: "12px", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--color-text-muted)", borderBottom: "1px solid var(--color-border)", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {teamRecords.map((r) => {
                          const isSelf = isOwnRecord(r);
                          return (
                            <tr
                              key={r._id}
                              style={{
                                transition: "background-color 0.15s",
                                borderLeft: isSelf ? "3px solid var(--color-accent)" : "3px solid transparent",
                                backgroundColor: isSelf ? "var(--color-accent-bg)" : "transparent",
                              }}
                              onMouseEnter={(e) => {
                                if (!isSelf) e.currentTarget.style.backgroundColor = "var(--color-border-light)";
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = isSelf ? "var(--color-accent-bg)" : "transparent";
                              }}
                            >
                              <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                                  {r.employeeId?.fullName || "—"}
                                  {isSelf && (
                                    <span
                                      title="This is your attendance record"
                                      style={{
                                        display: "inline-flex",
                                        alignItems: "center",
                                        padding: "1px 8px",
                                        borderRadius: "9999px",
                                        fontSize: "11px",
                                        fontWeight: 600,
                                        backgroundColor: "var(--color-accent-bg)",
                                        color: "var(--color-accent)",
                                        border: "1px solid var(--color-accent-border)",
                                        cursor: "default",
                                      }}
                                    >
                                      You
                                    </span>
                                  )}
                                </div>
                                <div style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 400 }}>{r.employeeId?.email}</div>
                              </td>
                              <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{formatTime(r.checkIn)}</td>
                              <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", borderBottom: "1px solid var(--color-border)" }}>{formatTime(r.checkOut)}</td>
                              <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", borderBottom: "1px solid var(--color-border)" }}>{r.workHours ? `${r.workHours.toFixed(2)}h` : "—"}</td>
                              <td style={{ padding: "12px 16px", borderBottom: "1px solid var(--color-border)" }}><StatusBadge status={r.status} /></td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {teamData && teamData.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "12px", marginTop: "16px", alignItems: "center" }}>
                  <button
                    disabled={teamPage <= 1}
                    onClick={() => setTeamPage((p) => p - 1)}
                    style={{ ...inputStyle, cursor: teamPage <= 1 ? "not-allowed" : "pointer", opacity: teamPage <= 1 ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    <ChevronLeft size={16} /> Prev
                  </button>
                  <span style={{ fontSize: "14px", fontWeight: 600, color: "var(--color-text-secondary)" }}>
                    Page {teamData.currentPage} of {teamData.totalPages}
                  </span>
                  <button
                    disabled={teamPage >= teamData.totalPages}
                    onClick={() => setTeamPage((p) => p + 1)}
                    style={{ ...inputStyle, cursor: teamPage >= teamData.totalPages ? "not-allowed" : "pointer", opacity: teamPage >= teamData.totalPages ? 0.5 : 1, display: "inline-flex", alignItems: "center", gap: "4px" }}
                  >
                    Next <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </>
          )}
        </>
      )}
    </ManagerLayout>
  );
};

export default ManagerAttendance;
