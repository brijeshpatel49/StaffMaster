import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ManagerLayout from "../../layouts/ManagerLayout";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../utils/api";
import { Loader } from "../../components/Loader";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import UpcomingHolidaysWidget from "../../components/UpcomingHolidaysWidget";
import { Users, UserCheck, Building2, CheckSquare, ChevronRight, AlertCircle, Clock, TrendingUp, Star } from "lucide-react";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

const GAUGE_COLORS = {
  onTime: "#22c55e",
  late: "#f59e0b",
  onLeave: "#38bdf8",
};

const AttendanceGauge = ({ data, isDark }) => {
  const total = data.total || 1;
  const onTime = data.present || 0;
  const late = (data.late || 0) + (data["half-day"] || 0);
  const onLeave = data["on-leave"] || 0;
  const absent = data.absent || 0;
  const attended = onTime + late + onLeave;

  const totalPct = total > 0 ? Math.round((attended / total) * 100) : 0;
  const onTimePct = total > 0 ? ((onTime / total) * 100).toFixed(1) : "0.0";
  const latePct = total > 0 ? ((late / total) * 100).toFixed(1) : "0.0";
  const onLeavePct = total > 0 ? ((onLeave / total) * 100).toFixed(1) : "0.0";

  const gaugeData = [
    { name: "On Time", value: onTime, color: GAUGE_COLORS.onTime, members: data.presentMembers || [] },
    { name: "Delay Time", value: late, color: GAUGE_COLORS.late, members: data.lateMembers || [] },
    { name: "On Leave", value: onLeave, color: GAUGE_COLORS.onLeave, members: data.onLeaveMembers || [] },
  ].filter((d) => d.value > 0);

  if (gaugeData.length === 0) {
    gaugeData.push({
      name: "No data",
      value: 1,
      color: isDark ? "rgba(255,255,255,0.12)" : "#e5e7eb",
      members: [],
      isPlaceholder: true,
    });
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <div style={{ width: "100%", height: 180, position: "relative" }}>
        <ResponsiveContainer width="100%" height={180}>
          <PieChart>
            <Pie
              data={gaugeData}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius={80}
              outerRadius={110}
              paddingAngle={2}
              dataKey="value"
              stroke="none"
              cornerRadius={4}
            >
              {gaugeData.map((d) => (
                <Cell key={d.name} fill={d.color} />
              ))}
            </Pie>
            <Tooltip
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const item = payload[0].payload;
                if (item.isPlaceholder) return null;
                const names = item.members || [];
                return (
                  <div
                    style={{
                      backgroundColor: isDark ? "#252628" : "#ffffff",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
                      borderRadius: "12px",
                      padding: "10px 12px",
                      boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 32px rgba(0,0,0,0.12)",
                      maxWidth: "260px",
                    }}
                  >
                    <p style={{ margin: "0 0 6px", fontSize: "12px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                      {item.name}: {item.value}
                    </p>
                    <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)", lineHeight: 1.35 }}>
                      {names.length > 0 ? `${names.slice(0, 8).join(", ")}${names.length > 8 ? ` +${names.length - 8} more` : ""}` : "No members"}
                    </p>
                  </div>
                );
              }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div
          style={{
            position: "absolute",
            bottom: "8px",
            left: "50%",
            transform: "translateX(-50%)",
            textAlign: "center",
            pointerEvents: "none",
          }}
        >
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>{totalPct}%</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", marginTop: "2px" }}>Total Attendance</div>
        </div>
      </div>

      <div className="flex items-center justify-center gap-6 mt-1">
        {[
          { label: "On Time", pct: onTimePct, color: GAUGE_COLORS.onTime },
          { label: "Delay Time", pct: latePct, color: GAUGE_COLORS.late },
          { label: "On Leave", pct: onLeavePct, color: GAUGE_COLORS.onLeave },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center gap-0.5">
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: item.color }} />
              <span style={{ fontSize: "11px", color: "var(--color-text-muted)", fontWeight: 500 }}>{item.label}</span>
            </div>
            <span style={{ fontSize: "15px", fontWeight: 700, color: "var(--color-text-primary)" }}>{item.pct}%</span>
          </div>
        ))}
      </div>

      <p style={{ margin: "10px 0 0", fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600 }}>
        Absent: {absent}
      </p>
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, iconBg, iconColor }) => (
  <div
    style={{
      backgroundColor: "var(--color-card)",
      borderRadius: "20px",
      padding: "24px",
      border: "1px solid var(--color-border)",
      
      display: "flex",
      flexDirection: "column",
      gap: "16px",
      transition: "box-shadow 0.2s",
    }}
    
    
  >
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
      }}
    >
      <div
        style={{
          width: "48px",
          height: "48px",
          borderRadius: "14px",
          backgroundColor: iconBg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Icon size={24} color={iconColor} />
      </div>
    </div>
    <div>
      <p
        style={{
          fontSize: "13px",
          color: "var(--color-text-muted)",
          fontWeight: 500,
          margin: "0 0 4px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "32px",
          fontWeight: 800,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  </div>
);

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const ManagerDashboard = () => {
  const { API } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [taskSummary, setTaskSummary] = useState({ total: 0, todo: 0, in_progress: 0, completed: 0, overdue: 0 });
  const [recentTasks, setRecentTasks] = useState([]);
  const [pendingReviews, setPendingReviews] = useState([]);
  const [attendanceSnapshot, setAttendanceSnapshot] = useState([]);

  useEffect(() => {
    const fetchTeam = async () => {
      try {
        const result = await apiFetch(`${API}/manager/team`);
        if (result?.data?.success) {
          setData(result.data.data);
          setError(null);
        } else {
          setError(result?.data?.message || "Failed to load team data");
        }
      } catch (err) {
        console.error("Manager Dashboard fetch error:", err);
        setError("Error fetching team data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    const fetchTasks = async () => {
      try {
        const result = await apiFetch(`${API}/tasks/team?limit=5&sortBy=deadline`);
        if (result?.data?.success) {
          setTaskSummary(result.data.data.summary);
          setRecentTasks(result.data.data.tasks.slice(0, 5));
        }
      } catch { /* silent */ }
    };
    const fetchAttendanceSnapshot = async () => {
      try {
        const today = new Date().toISOString().split("T")[0];
        const result = await apiFetch(`${API}/attendance/team?date=${today}&page=1&limit=300`);
        if (result?.data?.success) {
          setAttendanceSnapshot(result.data.data || []);
        }
      } catch {
        // silent
      }
    };
    fetchTeam();
    fetchTasks();
    fetchAttendanceSnapshot();
    const fetchPendingReviews = async () => {
      try {
        const result = await apiFetch(`${API}/performance/pending`);
        if (result?.data?.success) setPendingReviews(result.data.data);
      } catch { /* silent */ }
    };
    fetchPendingReviews();
  }, [API]);

  if (loading) {
    return (
      <ManagerLayout
        title="Manager Dashboard"
        subtitle="Overview of your team."
      >
        <Loader variant="section" />
      </ManagerLayout>
    );
  }

  if (error) {
    return (
      <ManagerLayout
        title="Manager Dashboard"
        subtitle="Overview of your team."
      >
        <div
          style={{
            padding: "24px",
            color: "#dc2626",
            background: "#fee2e2",
            borderRadius: "12px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      </ManagerLayout>
    );
  }

  const { department, totalMembers, activeMembersCount, presentTeamCount, employees } =
    data || {};

  const presentMembers = attendanceSnapshot
    .filter((r) => r.status === "present")
    .map((r) => r.employeeId?.fullName)
    .filter(Boolean);
  const lateMembers = attendanceSnapshot
    .filter((r) => r.status === "late" || r.status === "half-day")
    .map((r) => r.employeeId?.fullName)
    .filter(Boolean);
  const absentMembers = attendanceSnapshot
    .filter((r) => r.status === "absent")
    .map((r) => r.employeeId?.fullName)
    .filter(Boolean);
  const onLeaveMembers = attendanceSnapshot
    .filter((r) => r.status === "on-leave")
    .map((r) => r.employeeId?.fullName)
    .filter(Boolean);

  const attendanceOverview = {
    total: attendanceSnapshot.length,
    present: presentMembers.length,
    late: lateMembers.length,
    "half-day": 0,
    absent: absentMembers.length,
    "on-leave": onLeaveMembers.length,
    presentMembers,
    lateMembers,
    onLeaveMembers,
  };

  const taskChartData = [
    { name: "To Do", value: taskSummary.todo, color: "#94a3b8" },
    { name: "In Progress", value: taskSummary.in_progress, color: "#3b82f6" },
    { name: "Completed", value: taskSummary.completed, color: "#22c55e" },
    { name: "Overdue", value: taskSummary.overdue, color: "#ef4444" },
  ];

  return (
    <ManagerLayout title="Manager Dashboard" subtitle="Overview of your team.">
      <AnnouncementBanner />
      <div style={{ marginTop: "20px" }}>
        <UpcomingHolidaysWidget />
      </div>
      {/* ── Stat Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: "20px",
          marginBottom: "32px",
        }}
      >
        <StatCard
          title="Department Name"
          value={department?.name || "N/A"}
          icon={Building2}
          iconBg="#fef9c3"
          iconColor="#ca8a04"
        />
        <StatCard
          title="Total Team Members"
          value={totalMembers ?? 0}
          icon={Users}
          iconBg="#dbeafe"
          iconColor="#2563eb"
        />
        <StatCard
          title="Present Team"
          value={presentTeamCount ?? activeMembersCount ?? 0}
          icon={UserCheck}
          iconBg="#dcfce7"
          iconColor="#16a34a"
        />
        {pendingReviews.length > 0 && (
          <StatCard
            title="Pending Reviews"
            value={pendingReviews.length}
            icon={TrendingUp}
            iconBg="#f3e8ff"
            iconColor="#9333ea"
          />
        )}
      </div>

      {/* ── Meaningful Analytics ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "20px",
          marginBottom: "24px",
        }}
      >
        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "20px",
            padding: "20px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)" }}>
            Team Attendance Today
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--color-text-muted)" }}>
            Same half gauge style as admin attendance.
          </p>
          <AttendanceGauge data={attendanceOverview} isDark={isDark} />
          {attendanceOverview.absent > 0 && (
            <p
              title={absentMembers.join(", ")}
              style={{ margin: "8px 0 0", fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center" }}
            >
              Absent Members: {absentMembers.slice(0, 5).join(", ")}
              {absentMembers.length > 5 ? ` +${absentMembers.length - 5} more` : ""}
            </p>
          )}
        </div>

        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "20px",
            padding: "20px",
            border: "1px solid var(--color-border)",
          }}
        >
          <h3 style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)" }}>
            Department Task Status
          </h3>
          <p style={{ margin: "0 0 12px", fontSize: "12px", color: "var(--color-text-muted)" }}>
            Tasks from your department by current status.
          </p>

          <div style={{ height: "220px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={taskChartData} margin={{ top: 8, right: 8, left: -12, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
                <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--color-text-muted)" }} axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: "rgba(148,163,184,0.12)" }}
                  content={({ active, payload, label }) => {
                    if (!active || !payload || !payload.length) return null;
                    const item = payload[0];
                    return (
                      <div
                        style={{
                          backgroundColor: isDark ? "#252628" : "#ffffff",
                          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
                          borderRadius: "10px",
                          padding: "8px 10px",
                          boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 32px rgba(0,0,0,0.12)",
                        }}
                      >
                        <p style={{ margin: "0 0 4px", fontSize: "12px", fontWeight: 700, color: "var(--color-text-primary)" }}>
                          {label}
                        </p>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)", fontWeight: 600 }}>
                          Tasks: {item.value}
                        </p>
                      </div>
                    );
                  }}
                />
                <Bar dataKey="value" radius={[8, 8, 0, 0]}>
                  {taskChartData.map((entry) => (
                    <Cell key={entry.name} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ── Team Tasks Widget ── */}
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "20px",
          padding: "24px",
          border: "1px solid var(--color-border)",
          marginBottom: "24px",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckSquare size={20} /> Team Tasks
          </h2>
          <button onClick={() => navigate("/manager/tasks")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "13px", fontWeight: 600 }}>
            Manage Tasks <ChevronRight size={14} />
          </button>
        </div>
        {/* Summary strip */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Total: {taskSummary.total}</span>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>In Progress: {taskSummary.in_progress}</span>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-positive-bg)", color: "var(--color-positive)" }}>Completed: {taskSummary.completed}</span>
          {taskSummary.overdue > 0 && (
            <span style={{ fontSize: "12px", fontWeight: 700, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)", display: "flex", alignItems: "center", gap: "4px" }}>
              <AlertCircle size={12} /> Overdue: {taskSummary.overdue}
            </span>
          )}
        </div>
        {recentTasks.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>No tasks yet. Create tasks from the Tasks page.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {recentTasks.map((task) => {
              const overdue = ["todo", "in_progress"].includes(task.status) && new Date(task.deadline) < new Date();
              const sBadge = { todo: { bg: "var(--color-border)", c: "var(--color-text-secondary)" }, in_progress: { bg: "var(--color-accent-bg)", c: "var(--color-accent)" }, completed: { bg: "var(--color-positive-bg)", c: "var(--color-positive)" }, cancelled: { bg: "var(--color-negative-bg)", c: "var(--color-negative)" } };
              const sb = sBadge[task.status] || sBadge.todo;
              return (
                <div key={task._id} onClick={() => navigate("/manager/tasks")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", backgroundColor: overdue ? "rgba(239,68,68,0.04)" : "var(--color-surface)", border: "1px solid var(--color-border-light)", cursor: "pointer" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{task.assignedTo?.fullName || "—"} · {new Date(task.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}</span>
                  </div>
                  <div style={{ display: "flex", gap: "6px", alignItems: "center", flexShrink: 0 }}>
                    {overdue && <span style={{ fontSize: "9px", fontWeight: 700, padding: "2px 6px", borderRadius: "4px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>OVERDUE</span>}
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: sb.bg, color: sb.c }}>{task.status === "in_progress" ? "In Progress" : task.status}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Pending Performance Reviews Widget ── */}
      {pendingReviews.length > 0 && (
        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "20px",
            padding: "24px",
            border: "1px solid var(--color-border)",
            marginBottom: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={20} /> Pending Performance Reviews
            </h2>
            <button onClick={() => navigate("/manager/performance")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "13px", fontWeight: 600 }}>
              Review All <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
            {pendingReviews.slice(0, 5).map((review) => (
              <div key={review._id} onClick={() => navigate("/manager/performance")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 14px", borderRadius: "10px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-light)", cursor: "pointer" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{review.employeeId?.fullName || "—"}</p>
                  <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {new Date(0, review.period.month - 1).toLocaleString("en", { month: "long" })} {review.period.year}
                  </span>
                </div>
                <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
                  <span style={{ fontSize: "11px", fontWeight: 600, padding: "3px 8px", borderRadius: "6px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
                    Auto: {review.autoScore?.toFixed(1)}
                  </span>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 8px", borderRadius: "6px", backgroundColor: "#fef9c3", color: "#ca8a04" }}>PENDING</span>
                </div>
              </div>
            ))}
            {pendingReviews.length > 5 && (
              <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)", textAlign: "center" }}>+{pendingReviews.length - 5} more pending reviews</p>
            )}
          </div>
        </div>
      )}

      {/* ── Team Table ── */}
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "20px",
          padding: "24px",
          border: "1px solid var(--color-border)",
        }}
      >
        <h2
          style={{
            fontSize: "18px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            marginTop: 0,
            marginBottom: "20px",
          }}
        >
          Team Directory
        </h2>

        {!employees || employees.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
            No members found in your team.
          </p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                textAlign: "left",
              }}
            >
              <thead>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-text-secondary)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Name
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-text-secondary)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Email
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-text-secondary)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Designation
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-text-secondary)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Status
                  </th>
                  <th
                    style={{
                      padding: "12px 16px",
                      color: "var(--color-text-secondary)",
                      fontSize: "13px",
                      fontWeight: 600,
                    }}
                  >
                    Joining Date
                  </th>
                </tr>
              </thead>
              <tbody>
                {employees.map((emp, idx) => (
                  <tr
                    key={idx}
                    style={{
                      borderBottom:
                        idx === employees.length - 1
                          ? "none"
                          : "1px solid #f3f4f6",
                      transition: "background 0.2s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = "#f9fafb")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        fontWeight: 500,
                        color: "var(--color-text-primary)",
                      }}
                    >
                      {emp.fullName}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {emp.email}
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {emp.designation}
                    </td>
                    <td style={{ padding: "12px 16px" }}>
                      <span
                        style={{
                          fontSize: "12px",
                          fontWeight: 600,
                          padding: "4px 10px",
                          borderRadius: "99px",
                          backgroundColor:
                            emp.status === "active"
                              ? "#dcfce7"
                              : emp.status === "resigned"
                                ? "#fef9c3"
                                : "#fee2e2",
                          color:
                            emp.status === "active"
                              ? "#16a34a"
                              : emp.status === "resigned"
                                ? "#ca8a04"
                                : "#dc2626",
                          textTransform: "capitalize",
                        }}
                      >
                        {emp.status}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "12px 16px",
                        fontSize: "14px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      {formatDate(emp.joiningDate)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </ManagerLayout>
  );
};

export default ManagerDashboard;
