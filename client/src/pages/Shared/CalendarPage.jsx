import { useState, useEffect, useCallback, useMemo } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../utils/api";
import { Loader } from "../../components/Loader";
import CustomDropdown from "../../components/CustomDropdown";
import { toast } from "react-hot-toast";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Pencil,
  X,
  Calendar,
  Upload,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Megaphone,
  Users,
  PartyPopper,
} from "lucide-react";

// ── helpers ──────────────────────────────────────────────────────────────────
const toDateStr = (d) => new Date(d).toISOString().split("T")[0];
const fmtDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
const fmtDateLong = (d) =>
  new Date(d).toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const TYPE_OPTIONS = [
  { value: "national", label: "National" },
  { value: "regional", label: "Regional" },
  { value: "company", label: "Company" },
];

// ── Calendar Page ────────────────────────────────────────────────────────────
const CalendarPage = () => {
  const { user, API } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const role = user?.role;

  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [selectedDate, setSelectedDate] = useState(toDateStr(now));

  // Admin holiday management
  const [showAddModal, setShowAddModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editHoliday, setEditHoliday] = useState(null);
  const [holidayForm, setHolidayForm] = useState({ name: "", date: "", type: "national", description: "", isRecurring: false });
  const [bulkText, setBulkText] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(null);

  // Upcoming holidays
  const [upcoming, setUpcoming] = useState([]);

  // ── fetch calendar data ──
  const fetchCalendar = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiFetch(`${API}/calendar?month=${month}&year=${year}`);
      if (res?.data?.success) setData(res.data.data);
    } catch {
      toast.error("Failed to load calendar");
    } finally {
      setLoading(false);
    }
  }, [API, month, year]);

  const fetchUpcoming = useCallback(async () => {
    try {
      const res = await apiFetch(`${API}/holidays/upcoming?limit=5`);
      if (res?.data?.success) setUpcoming(res.data.data);
    } catch { /* silent */ }
  }, [API]);

  useEffect(() => { fetchCalendar(); }, [fetchCalendar]);
  useEffect(() => { fetchUpcoming(); }, [fetchUpcoming]);

  // ── navigation ──
  const goMonth = (dir) => {
    const minYear = now.getFullYear() - 2;
    const maxYear = now.getFullYear() + 1;
    let m = month + dir;
    let y = year;
    if (m < 1) { m = 12; y--; }
    if (m > 12) { m = 1; y++; }
    if (y < minYear || y > maxYear) return;
    setMonth(m);
    setYear(y);
  };

  const goToday = () => {
    setMonth(now.getMonth() + 1);
    setYear(now.getFullYear());
    setSelectedDate(toDateStr(now));
  };

  // ── build calendar grid ──
  const calendarDays = useMemo(() => {
    const first = new Date(Date.UTC(year, month - 1, 1));
    const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
    let startWeekday = first.getUTCDay(); // 0=Sun
    startWeekday = startWeekday === 0 ? 7 : startWeekday; // Mon=1

    const days = [];
    // leading blanks
    for (let i = 1; i < startWeekday; i++) days.push(null);
    for (let d = 1; d <= lastDay; d++) {
      const dateStr = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      days.push({ day: d, dateStr });
    }
    return days;
  }, [month, year]);

  // ── build events lookup per date ──
  const eventsByDate = useMemo(() => {
    if (!data) return {};
    const map = {};
    const ensure = (ds) => { if (!map[ds]) map[ds] = { holidays: [], leaves: [], tasks: [], announcements: [], teamLeaves: [], attendance: null }; };

    // holidays
    (data.holidays || []).forEach((h) => {
      const ds = toDateStr(h.date);
      ensure(ds);
      map[ds].holidays.push(h);
    });
    // leaves
    (data.myLeaves || []).forEach((l) => {
      const from = new Date(l.fromDate);
      const to = new Date(l.toDate);
      const cur = new Date(from);
      while (cur <= to) {
        const ds = toDateStr(cur);
        ensure(ds);
        map[ds].leaves.push(l);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    });
    // tasks
    (data.myTasks || []).forEach((t) => {
      const ds = toDateStr(t.deadline);
      ensure(ds);
      map[ds].tasks.push(t);
    });
    // announcements — pin to createdAt date
    (data.announcements || []).forEach((a) => {
      const ds = toDateStr(a.createdAt);
      ensure(ds);
      map[ds].announcements.push(a);
    });
    // team leaves
    (data.teamLeaves || []).forEach((l) => {
      const from = new Date(l.fromDate);
      const to = new Date(l.toDate);
      const cur = new Date(from);
      while (cur <= to) {
        const ds = toDateStr(cur);
        ensure(ds);
        map[ds].teamLeaves.push(l);
        cur.setUTCDate(cur.getUTCDate() + 1);
      }
    });
    // attendance
    (data.myAttendance || []).forEach((a) => {
      const ds = toDateStr(a.date);
      ensure(ds);
      map[ds].attendance = a;
    });
    return map;
  }, [data]);

  // ── selected date events ──
  const selEvents = eventsByDate[selectedDate] || { holidays: [], leaves: [], tasks: [], announcements: [], teamLeaves: [], attendance: null };

  // ── dots for a cell ──
  const getDots = (dateStr) => {
    const ev = eventsByDate[dateStr];
    if (!ev) return [];
    const dots = [];
    if (ev.holidays.length) dots.push({ color: "var(--color-negative)", key: "holiday" });
    if (ev.leaves.some((l) => l.status === "approved")) dots.push({ color: "#f97316", key: "leave-approved" });
    if (ev.leaves.some((l) => l.status === "pending")) dots.push({ color: "#fbbf24", key: "leave-pending", dashed: true });
    if (ev.tasks.some((t) => new Date(t.deadline) < new Date() && t.status !== "completed")) dots.push({ color: "var(--color-negative)", key: "task-overdue" });
    else if (ev.tasks.length) dots.push({ color: "var(--color-accent)", key: "task" });
    if (ev.announcements.length) dots.push({ color: "#818cf8", key: "announcement" });
    if (ev.attendance && ev.attendance.status === "present") dots.push({ color: "var(--color-positive)", key: "present" });
    if (ev.teamLeaves.length) dots.push({ color: "#38bdf8", key: "team" });
    return dots;
  };

  // ── admin: add/edit holiday ──
  const openAddModal = (dateStr) => {
    setEditHoliday(null);
    setHolidayForm({ name: "", date: dateStr || "", type: "national", description: "", isRecurring: false });
    setShowAddModal(true);
  };
  const openEditModal = (h) => {
    setEditHoliday(h);
    setHolidayForm({ name: h.name, date: toDateStr(h.date), type: h.type, description: h.description || "", isRecurring: h.isRecurring });
    setShowAddModal(true);
  };
  const closeModal = () => { setShowAddModal(false); setEditHoliday(null); };

  const saveHoliday = async () => {
    if (!holidayForm.name.trim() || !holidayForm.date) {
      toast.error("Name and date are required");
      return;
    }
    setSaving(true);
    try {
      const url = editHoliday ? `${API}/holidays/${editHoliday._id}` : `${API}/holidays`;
      const method = editHoliday ? "PUT" : "POST";
      const res = await apiFetch(url, { method, body: JSON.stringify(holidayForm), headers: { "Content-Type": "application/json" } });
      if (res?.data?.success) {
        toast.success(editHoliday ? "Holiday updated" : "Holiday created");
        closeModal();
        fetchCalendar();
        fetchUpcoming();
      } else {
        toast.error(res?.data?.message || "Failed");
      }
    } catch (err) {
      toast.error(err?.message || "Error saving holiday");
    } finally {
      setSaving(false);
    }
  };

  const deleteHol = async (id) => {
    try {
      const res = await apiFetch(`${API}/holidays/${id}`, { method: "DELETE" });
      if (res?.data?.success) {
        toast.success("Holiday deleted");
        setConfirmDelete(null);
        fetchCalendar();
        fetchUpcoming();
      } else {
        toast.error(res?.data?.message || "Failed");
      }
    } catch { toast.error("Error deleting holiday"); }
  };

  // ── admin: bulk add ──
  const handleBulkAdd = async () => {
    const lines = bulkText.trim().split("\n").filter(Boolean);
    if (!lines.length) { toast.error("No holidays to add"); return; }
    const holidays = [];
    for (const line of lines) {
      const parts = line.split(",").map((s) => s.trim());
      if (parts.length < 2) continue;
      const [name, dateRaw, type] = parts;
      // Parse DD/MM/YYYY
      const dParts = dateRaw.split("/");
      let isoDate = dateRaw;
      if (dParts.length === 3) {
        isoDate = `${dParts[2]}-${dParts[1].padStart(2, "0")}-${dParts[0].padStart(2, "0")}`;
      }
      holidays.push({ name, date: isoDate, type: type || "national" });
    }
    if (!holidays.length) { toast.error("Could not parse any holidays"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(`${API}/holidays/bulk`, {
        method: "POST",
        body: JSON.stringify({ holidays }),
        headers: { "Content-Type": "application/json" },
      });
      if (res?.data?.success) {
        toast.success(`Created ${res.data.created}, skipped ${res.data.skipped}`);
        setShowBulkModal(false);
        setBulkText("");
        fetchCalendar();
        fetchUpcoming();
      } else {
        toast.error(res?.data?.message || "Failed");
      }
    } catch { toast.error("Error in bulk add"); }
    finally { setSaving(false); }
  };

  // ── cell styling helpers ──
  const todayStr = toDateStr(now);
  const isToday = (ds) => ds === todayStr;
  const isWeekend = (ds) => {
    const d = new Date(ds + "T00:00:00Z");
    const day = d.getUTCDay();
    return day === 0 || day === 6;
  };
  const hasHoliday = (ds) => eventsByDate[ds]?.holidays?.length > 0;
  const hasApprovedLeave = (ds) => eventsByDate[ds]?.leaves?.some((l) => l.status === "approved");

  const getCellBg = (ds) => {
    if (hasHoliday(ds)) return isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.06)";
    if (hasApprovedLeave(ds)) return isDark ? "rgba(249,115,22,0.08)" : "rgba(249,115,22,0.06)";
    if (isWeekend(ds)) return "var(--color-border-light)";
    return "transparent";
  };

  // ── attendance status badge ──
  const AttBadge = ({ status }) => {
    const cfg = {
      present: { icon: CheckCircle2, label: "Present", color: "var(--color-positive)", bg: "var(--color-positive-bg)" },
      late: { icon: Clock, label: "Late", color: "#f59e0b", bg: isDark ? "rgba(245,158,11,0.1)" : "#fffbeb" },
      "half-day": { icon: Clock, label: "Half-day", color: "#3b82f6", bg: isDark ? "rgba(59,130,246,0.1)" : "#eff6ff" },
      "on-leave": { icon: Calendar, label: "On Leave", color: "#f97316", bg: isDark ? "rgba(249,115,22,0.1)" : "#fff7ed" },
      holiday: { icon: PartyPopper, label: "Holiday", color: "var(--color-negative)", bg: "var(--color-negative-bg)" },
      absent: { icon: X, label: "Absent", color: "var(--color-negative)", bg: "var(--color-negative-bg)" },
    };
    const c = cfg[status] || cfg.absent;
    const Icon = c.icon;
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "8px", padding: "10px 14px", borderRadius: "12px", backgroundColor: c.bg, border: `1px solid ${c.color}20` }}>
        <Icon size={18} color={c.color} />
        <span style={{ color: c.color, fontWeight: 600, fontSize: "14px" }}>{c.label}</span>
      </div>
    );
  };

  // ── render ──
  return (
    <DashboardLayout title="Calendar" subtitle={`${MONTHS[month - 1]} ${year}`}>
      {loading && !data ? (
        <Loader variant="section" />
      ) : (
        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap" }}>

          {/* ── LEFT: Calendar Grid ──────────────────── */}
          <div style={{ flex: "1 1 62%", minWidth: "320px" }}>
            {/* Header */}
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              marginBottom: "20px", flexWrap: "wrap", gap: "12px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <button onClick={() => goMonth(-1)} style={navBtn(isDark)}><ChevronLeft size={18} /></button>
                <h2 style={{ margin: 0, fontSize: "20px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {MONTHS[month - 1]} {year}
                </h2>
                <button onClick={() => goMonth(1)} style={navBtn(isDark)}><ChevronRight size={18} /></button>
                <button onClick={goToday} style={{ ...navBtn(isDark), fontSize: "12px", padding: "6px 34px", fontWeight: 600 }}>Today</button>
              </div>
              {role === "admin" && (
                <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                  <button onClick={() => setShowBulkModal(true)} style={actionBtn(isDark, false)}>
                    <Upload size={14} /> Bulk Add
                  </button>
                  <button onClick={() => openAddModal(selectedDate)} style={actionBtn(isDark, true)}>
                    <Plus size={14} /> Add Holiday
                  </button>
                </div>  
              )}
            </div>

            {/* Legend */}
            <div style={{
              display: "flex", flexWrap: "wrap", gap: "16px", marginBottom: "16px",
              padding: "10px 16px", borderRadius: "12px",
              backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)",
            }}>
              {[
                { color: "var(--color-negative)", label: "Holiday" },
                { color: "#f97316", label: "Leave" },
                { color: "var(--color-accent)", label: "Task" },
                { color: "#818cf8", label: "Announcement" },
                { color: "var(--color-positive)", label: "Present" },
                { color: "#38bdf8", label: "Team Leave" },
              ].map((l) => (
                <div key={l.label} style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                  <span style={{ width: "8px", height: "8px", borderRadius: "50%", backgroundColor: l.color, display: "inline-block" }} />
                  {l.label}
                </div>
              ))}
            </div>

            {/* Weekday header */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px", marginBottom: "2px" }}>
              {WEEKDAYS.map((w) => (
                <div key={w} style={{
                  textAlign: "center", padding: "8px 0", fontSize: "12px", fontWeight: 700,
                  color: w === "Sun" || w === "Sat" ? "var(--color-text-muted)" : "var(--color-text-secondary)",
                  textTransform: "uppercase", letterSpacing: "0.5px",
                }}>
                  {w}
                </div>
              ))}
            </div>

            {/* Day cells */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: "2px" }}>
              {calendarDays.map((cell, i) => {
                if (!cell) return <div key={`blank-${i}`} style={{ minHeight: "80px" }} />;
                const { day, dateStr } = cell;
                const dots = getDots(dateStr);
                const sel = dateStr === selectedDate;
                const today = isToday(dateStr);

                return (
                  <div
                    key={dateStr}
                    onClick={() => setSelectedDate(dateStr)}
                    style={{
                      minHeight: "80px",
                      padding: "6px 8px",
                      borderRadius: "10px",
                      cursor: "pointer",
                      backgroundColor: sel
                        ? isDark ? "rgba(245,158,11,0.10)" : "rgba(245,158,11,0.08)"
                        : getCellBg(dateStr),
                      border: today
                        ? "2px solid var(--color-accent)"
                        : sel
                          ? `2px solid var(--color-accent-border)`
                          : "2px solid transparent",
                      transition: "all 0.15s ease",
                      position: "relative",
                    }}
                    onMouseOver={(e) => { if (!sel && !today) e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.02)"; }}
                    onMouseOut={(e) => { if (!sel && !today) e.currentTarget.style.backgroundColor = getCellBg(dateStr); }}
                  >
                    <span style={{
                      fontSize: "13px",
                      fontWeight: today ? 800 : 600,
                      color: today ? "var(--color-accent)" : isWeekend(dateStr) ? "var(--color-text-muted)" : "var(--color-text-primary)",
                    }}>
                      {day}
                    </span>

                    {/* Event dots */}
                    {dots.length > 0 && (
                      <div style={{ display: "flex", gap: "3px", marginTop: "6px", flexWrap: "wrap" }}>
                        {dots.slice(0, 3).map((dot) => (
                          <span key={dot.key} style={{
                            width: "7px", height: "7px", borderRadius: "50%",
                            backgroundColor: dot.dashed ? "transparent" : dot.color,
                            border: dot.dashed ? `1.5px dashed ${dot.color}` : "none",
                            display: "inline-block",
                          }} />
                        ))}
                        {dots.length > 3 && (
                          <span style={{ fontSize: "9px", color: "var(--color-text-muted)", fontWeight: 600 }}>+{dots.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* ── RIGHT: Side Panel ──────────────────── */}
          <div style={{ flex: "1 1 33%", minWidth: "280px", maxWidth: "400px" }}>
            {/* Selected date */}
            <div style={{
              backgroundColor: "var(--color-card)", borderRadius: "16px",
              border: "1px solid var(--color-border)", padding: "20px", marginBottom: "16px",
            }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <Calendar size={18} color="var(--color-accent)" />
                <h3 style={{ margin: 0, fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {fmtDateLong(selectedDate + "T00:00:00Z")}
                </h3>
              </div>

              <div style={{ borderTop: "1px solid var(--color-border)", paddingTop: "14px", display: "flex", flexDirection: "column", gap: "12px" }}>
                {/* Holidays */}
                {selEvents.holidays.map((h) => (
                  <div key={h._id} style={{
                    padding: "12px 14px", borderRadius: "12px",
                    backgroundColor: isDark ? "rgba(239,68,68,0.08)" : "#fef2f2",
                    border: "1px solid rgba(239,68,68,0.2)",
                  }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "var(--color-negative)" }}>🔴 {h.name}</p>
                        <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
                          {h.type.charAt(0).toUpperCase() + h.type.slice(1)} Holiday
                        </p>
                        {h.description && <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>{h.description}</p>}
                      </div>
                      {role === "admin" && (
                        <div style={{ display: "flex", gap: "6px" }}>
                          <button onClick={() => openEditModal(h)} style={iconBtn()}><Pencil size={13} /></button>
                          <button onClick={() => setConfirmDelete(h)} style={iconBtn()}><Trash2 size={13} color="var(--color-negative)" /></button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {/* My Leaves */}
                {selEvents.leaves.map((l, i) => (
                  <div key={`leave-${i}`} style={{
                    padding: "12px 14px", borderRadius: "12px",
                    backgroundColor: l.status === "approved"
                      ? isDark ? "rgba(34,197,94,0.08)" : "#f0fdf4"
                      : isDark ? "rgba(245,158,11,0.08)" : "#fffbeb",
                    border: `1px solid ${l.status === "approved" ? "rgba(34,197,94,0.2)" : "rgba(245,158,11,0.2)"}`,
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: l.status === "approved" ? "var(--color-positive)" : "#f59e0b" }}>
                      🟠 On {l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)} Leave
                    </p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
                      {l.status === "approved" ? "Approved" : "Pending Approval"} • {fmtDate(l.fromDate)} – {fmtDate(l.toDate)}
                    </p>
                  </div>
                ))}

                {/* Tasks */}
                {selEvents.tasks.map((t) => {
                  const overdue = new Date(t.deadline) < new Date() && t.status !== "completed";
                  return (
                    <div key={t._id} style={{
                      padding: "12px 14px", borderRadius: "12px",
                      backgroundColor: overdue
                        ? isDark ? "rgba(239,68,68,0.06)" : "#fef2f2"
                        : isDark ? "rgba(245,158,11,0.06)" : "#fffbeb",
                      border: `1px solid ${overdue ? "rgba(239,68,68,0.2)" : "rgba(245,158,11,0.2)"}`,
                    }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: overdue ? "var(--color-negative)" : "var(--color-accent)" }}>
                        🎯 {t.title}
                      </p>
                      <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
                        Priority: {t.priority} • Status: {t.status.replace("_", " ")}
                        {overdue && <span style={{ color: "var(--color-negative)", fontWeight: 700 }}> • OVERDUE</span>}
                      </p>
                    </div>
                  );
                })}

                {/* Announcements */}
                {selEvents.announcements.map((a) => (
                  <div key={a._id} style={{
                    padding: "12px 14px", borderRadius: "12px",
                    backgroundColor: isDark ? "rgba(129,140,248,0.08)" : "#eef2ff",
                    border: "1px solid rgba(129,140,248,0.2)",
                  }}>
                    <p style={{ margin: 0, fontWeight: 700, fontSize: "14px", color: "#818cf8" }}>📢 {a.title}</p>
                    <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
                      Priority: {a.priority} • Expires: {fmtDate(a.expiresAt)}
                    </p>
                  </div>
                ))}

                {/* Team Leaves (manager) */}
                {selEvents.teamLeaves.length > 0 && (
                  <div style={{
                    padding: "12px 14px", borderRadius: "12px",
                    backgroundColor: isDark ? "rgba(56,189,248,0.08)" : "#f0f9ff",
                    border: "1px solid rgba(56,189,248,0.2)",
                  }}>
                    <p style={{ margin: "0 0 6px", fontWeight: 700, fontSize: "14px", color: "#38bdf8" }}>
                      <Users size={14} style={{ verticalAlign: "middle", marginRight: "6px" }} />
                      Team on Leave ({selEvents.teamLeaves.length})
                    </p>
                    {selEvents.teamLeaves.map((l, i) => (
                      <p key={i} style={{ margin: "2px 0", fontSize: "12px", color: "var(--color-text-secondary)" }}>
                        • {l.employeeId?.fullName || "Employee"} — {l.leaveType.charAt(0).toUpperCase() + l.leaveType.slice(1)} Leave
                      </p>
                    ))}
                  </div>
                )}

                {/* Attendance */}
                {(role === "employee" || role === "manager") && selEvents.attendance && (
                  <div>
                    <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", textTransform: "uppercase" }}>My Attendance</p>
                    <AttBadge status={selEvents.attendance.status} />
                    {selEvents.attendance.checkIn && (
                      <p style={{ margin: "6px 0 0", fontSize: "12px", color: "var(--color-text-muted)" }}>
                        Check-in: {new Date(selEvents.attendance.checkIn).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                        {selEvents.attendance.checkOut && ` — Out: ${new Date(selEvents.attendance.checkOut).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}`}
                      </p>
                    )}
                  </div>
                )}

                {/* Empty state */}
                {!selEvents.holidays.length && !selEvents.leaves.length && !selEvents.tasks.length &&
                 !selEvents.announcements.length && !selEvents.teamLeaves.length && !selEvents.attendance && (
                  <div style={{ textAlign: "center", padding: "24px 0" }}>
                    <Calendar size={36} color="var(--color-text-muted)" style={{ opacity: 0.4, marginBottom: "8px" }} />
                    <p style={{ color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>No events on this day</p>
                  </div>
                )}
              </div>
            </div>

            {/* ── Upcoming Holidays ── */}
            <div style={{
              backgroundColor: "var(--color-card)", borderRadius: "16px",
              border: "1px solid var(--color-border)", padding: "20px",
            }}>
              <h3 style={{ margin: "0 0 14px", fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <PartyPopper size={18} color="var(--color-accent)" /> Upcoming Holidays
              </h3>
              {upcoming.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>No upcoming holidays 🎉</p>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {upcoming.map((h) => (
                    <div key={h._id} style={{
                      display: "flex", alignItems: "center", gap: "12px",
                      padding: "10px 12px", borderRadius: "10px",
                      backgroundColor: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2",
                      border: "1px solid rgba(239,68,68,0.12)",
                    }}>
                      <div style={{
                        width: "40px", height: "40px", borderRadius: "10px",
                        backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#fee2e2",
                        display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                      }}>
                        <span style={{ fontSize: "16px" }}>🔴</span>
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ margin: 0, fontWeight: 700, fontSize: "13px", color: "var(--color-text-primary)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{h.name}</p>
                        <p style={{ margin: "2px 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>
                          {fmtDate(h.date)} — {h.type.charAt(0).toUpperCase() + h.type.slice(1)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Add/Edit Holiday Modal ── */}
      {showAddModal && (
        <ModalOverlay onClose={closeModal}>
          <div style={{ maxWidth: "460px", width: "100%" }}>
            <div style={{
              backgroundColor: "var(--color-card)", borderRadius: "20px",
              border: "1px solid var(--color-border)", padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                  {editHoliday ? "Edit Holiday" : "Add Holiday"}
                </h3>
                <button onClick={closeModal} style={iconBtn()}><X size={18} /></button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <FormField label="Holiday Name">
                  <input
                    type="text"
                    value={holidayForm.name}
                    onChange={(e) => setHolidayForm({ ...holidayForm, name: e.target.value })}
                    placeholder="e.g. Republic Day"
                    maxLength={100}
                    style={inputStyle(isDark)}
                  />
                </FormField>
                <FormField label="Date">
                  <input
                    type="date"
                    value={holidayForm.date}
                    onChange={(e) => setHolidayForm({ ...holidayForm, date: e.target.value })}
                    style={inputStyle(isDark)}
                  />
                </FormField>
                <FormField label="Type">
                  <CustomDropdown
                    value={holidayForm.type}
                    onChange={(val) => setHolidayForm({ ...holidayForm, type: val })}
                    options={TYPE_OPTIONS}
                    fullWidth
                    size="md"
                  />
                </FormField>
                <FormField label="Description (optional)">
                  <textarea
                    value={holidayForm.description}
                    onChange={(e) => setHolidayForm({ ...holidayForm, description: e.target.value })}
                    placeholder="Brief description..."
                    maxLength={300}
                    rows={2}
                    style={{ ...inputStyle(isDark), resize: "vertical", fontFamily: "inherit" }}
                  />
                </FormField>
                {!editHoliday && (
                  <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontSize: "13px", color: "var(--color-text-secondary)" }}>
                    <input
                      type="checkbox"
                      checked={holidayForm.isRecurring}
                      onChange={(e) => setHolidayForm({ ...holidayForm, isRecurring: e.target.checked })}
                      style={{ accentColor: "var(--color-accent)" }}
                    />
                    Recurring yearly (auto-adds for next 2 years)
                  </label>
                )}

                <button
                  onClick={saveHoliday}
                  disabled={saving}
                  style={{
                    marginTop: "6px", padding: "12px 0", borderRadius: "12px", border: "none",
                    backgroundColor: "var(--color-accent)", color: "#000", fontWeight: 700,
                    fontSize: "14px", cursor: saving ? "wait" : "pointer",
                    opacity: saving ? 0.6 : 1, transition: "opacity 0.2s",
                  }}
                >
                  {saving ? "Saving..." : editHoliday ? "Update Holiday" : "Add Holiday"}
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Bulk Add Modal ── */}
      {showBulkModal && (
        <ModalOverlay onClose={() => setShowBulkModal(false)}>
          <div style={{ maxWidth: "520px", width: "100%" }}>
            <div style={{
              backgroundColor: "var(--color-card)", borderRadius: "20px",
              border: "1px solid var(--color-border)", padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
                <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>Bulk Add Holidays</h3>
                <button onClick={() => setShowBulkModal(false)} style={iconBtn()}><X size={18} /></button>
              </div>
              <p style={{ fontSize: "12px", color: "var(--color-text-muted)", margin: "0 0 12px" }}>
                Format: <strong>Name, DD/MM/YYYY, type</strong> (one per line). Type is optional (defaults to national).
              </p>
              <textarea
                value={bulkText}
                onChange={(e) => setBulkText(e.target.value)}
                placeholder={`Republic Day, 26/01/2026, national\nHoli, 14/03/2026, national\nCompany Day, 01/04/2026, company`}
                rows={8}
                style={{ ...inputStyle(isDark), resize: "vertical", fontFamily: "monospace", fontSize: "12px", width: "100%", boxSizing: "border-box" }}
              />
              <button
                onClick={handleBulkAdd}
                disabled={saving}
                style={{
                  marginTop: "14px", padding: "12px 0", width: "100%", borderRadius: "12px", border: "none",
                  backgroundColor: "var(--color-accent)", color: "#000", fontWeight: 700,
                  fontSize: "14px", cursor: saving ? "wait" : "pointer",
                  opacity: saving ? 0.6 : 1,
                }}
              >
                {saving ? "Adding..." : "Add Holidays"}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── Delete Confirm ── */}
      {confirmDelete && (
        <ModalOverlay onClose={() => setConfirmDelete(null)}>
          <div style={{ maxWidth: "400px", width: "100%" }}>
            <div style={{
              backgroundColor: "var(--color-card)", borderRadius: "20px",
              border: "1px solid var(--color-border)", padding: "28px",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)", textAlign: "center",
            }}>
              <AlertTriangle size={40} color="var(--color-negative)" style={{ marginBottom: "12px" }} />
              <h3 style={{ margin: "0 0 8px", fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>Delete Holiday?</h3>
              <p style={{ fontSize: "14px", color: "var(--color-text-secondary)", marginBottom: "20px" }}>
                Are you sure you want to delete <strong>{confirmDelete.name}</strong> ({fmtDate(confirmDelete.date)})?
              </p>
              <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
                <button onClick={() => setConfirmDelete(null)} style={{ padding: "10px 24px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                  Cancel
                </button>
                <button onClick={() => deleteHol(confirmDelete._id)} style={{ padding: "10px 24px", borderRadius: "10px", border: "none", backgroundColor: "var(--color-negative)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>
                  Delete
                </button>
              </div>
            </div>
          </div>
        </ModalOverlay>
      )}
    </DashboardLayout>
  );
};

// ── MODAL OVERLAY ────────────────────────────────────────────────────────────
const ModalOverlay = ({ children, onClose }) => (
  <div
    onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    style={{
      position: "fixed", inset: 0, zIndex: 9999,
      backgroundColor: "rgba(0,0,0,0.5)", backdropFilter: "blur(4px)",
      display: "flex", alignItems: "center", justifyContent: "center",
      padding: "20px",
    }}
  >
    {children}
  </div>
);

// ── FORM FIELD ────────────────────────────────────────────────────────────────
const FormField = ({ label, children }) => (
  <div>
    <label style={{ display: "block", fontSize: "12px", fontWeight: 700, color: "var(--color-text-muted)", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.3px" }}>
      {label}
    </label>
    {children}
  </div>
);

// ── style helpers ────────────────────────────────────────────────────────────
const navBtn = (isDark) => ({
  width: "34px", height: "34px", borderRadius: "10px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-card)",
  color: "var(--color-text-primary)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", transition: "all 0.15s",
});

const actionBtn = (isDark, primary) => ({
  display: "flex", alignItems: "center", gap: "6px",
  padding: "8px 16px", borderRadius: "10px", border: "none",
  backgroundColor: primary ? "var(--color-accent)" : "var(--color-surface)",
  color: primary ? "#000" : "var(--color-text-primary)",
  fontWeight: 600, fontSize: "13px", cursor: "pointer",
  transition: "all 0.15s",
});

const iconBtn = () => ({
  width: "30px", height: "30px", borderRadius: "8px",
  border: "1px solid var(--color-border)",
  backgroundColor: "transparent",
  color: "var(--color-text-muted)",
  display: "flex", alignItems: "center", justifyContent: "center",
  cursor: "pointer", transition: "all 0.15s",
});

const inputStyle = (isDark) => ({
  width: "100%", boxSizing: "border-box",
  padding: "10px 14px", borderRadius: "10px",
  border: "1px solid var(--color-border)",
  backgroundColor: "var(--color-surface)",
  color: "var(--color-text-primary)",
  fontSize: "14px", outline: "none",
});

export default CalendarPage;
