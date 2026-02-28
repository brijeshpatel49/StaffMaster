// src/pages/Admin/AdminDashboard.jsx

import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Users,
  Building2,
  UserCog,
  Briefcase,
  TrendingUp,
  TrendingDown,
  CheckSquare,
  PieChart as PieIcon,
  BarChart3,
  CalendarDays,
  Clock,
} from "lucide-react";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import UpcomingHolidaysWidget from "../../components/UpcomingHolidaysWidget";
import CustomDropdown from "../../components/CustomDropdown";
import { apiFetch } from "../../utils/api";
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
  AreaChart,
  Area,
  Legend,
} from "recharts";

/* ── Colors ── */
const PIE_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const TASK_STATUS_COLORS = {
  todo: "#94a3b8",
  in_progress: "#f59e0b",
  completed: "#22c55e",
  cancelled: "#ef4444",
  overdue: "#dc2626",
};
const GAUGE_COLORS = { onTime: "#22c55e", late: "#f59e0b", onLeave: "#38bdf8" };

/* ── Better Tooltip ── */
const ChartTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      backgroundColor: isDark ? "#252628" : "#ffffff",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
      borderRadius: "12px",
      padding: "12px 16px",
      boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 32px rgba(0,0,0,0.12)",
      minWidth: "140px",
    }}>
      {label && (
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "13px", color: isDark ? "#f0f2f8" : "#0f1624", letterSpacing: "-0.01em" }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", padding: "3px 0" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: p.color, flexShrink: 0 }} />
            <span style={{ fontSize: "12px", color: isDark ? "#a1b0c8" : "#6b7280", fontWeight: 500 }}>{p.name}</span>
          </div>
          <span style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#f0f2f8" : "#0f1624", fontVariantNumeric: "tabular-nums" }}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

/* ── Donut Label ── */
const renderDonutLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }) => {
  if (percent < 0.05) return null;
  const RADIAN = Math.PI / 180;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  return (
    <text x={x} y={y} fill="#fff" textAnchor="middle" dominantBaseline="central" fontSize={11} fontWeight={700}>
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

/* ── Chart Card ── */
const ChartCard = ({ title, icon: Icon, right, children }) => (
  <div className="rounded-2xl p-5 transition-all duration-200" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}>
    <div className="flex items-center justify-between mb-4">
      <div className="flex items-center gap-2">
        {Icon && <Icon size={16} style={{ color: "var(--color-accent)" }} />}
        <h3 className="text-sm font-semibold" style={{ color: "var(--color-text-primary)" }}>{title}</h3>
      </div>
      {right}
    </div>
    {children}
  </div>
);

/* ── Attendance Gauge (half-donut like the reference image) ── */
const AttendanceGauge = ({ data, isDark }) => {
  const total = data.total || 1;
  const onTime = data.present || 0;
  const late = data.late + (data["half-day"] || 0);
  const onLeave = data["on-leave"] || 0;
  const attended = onTime + late + onLeave;
  const totalPct = total > 0 ? Math.round((attended / total) * 100) : 0;
  const onTimePct = total > 0 ? ((onTime / total) * 100).toFixed(1) : "0.0";
  const latePct = total > 0 ? ((late / total) * 100).toFixed(1) : "0.0";
  const onLeavePct = total > 0 ? ((onLeave / total) * 100).toFixed(1) : "0.0";

  // Build gauge data — half-donut uses startAngle=180 endAngle=0
  const gaugeData = [
    { name: "On Time", value: onTime, color: GAUGE_COLORS.onTime },
    { name: "Late", value: late, color: GAUGE_COLORS.late },
    { name: "On Leave", value: onLeave, color: GAUGE_COLORS.onLeave },
  ].filter(d => d.value > 0);

  // If nobody attended, show a gray empty arc
  if (gaugeData.length === 0) gaugeData.push({ name: "None", value: 1, color: isDark ? "#333" : "#e5e7eb" });

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
              {gaugeData.map((d, i) => <Cell key={i} fill={d.color} />)}
            </Pie>
            <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
          </PieChart>
        </ResponsiveContainer>
        {/* Center text overlay */}
        <div style={{
          position: "absolute",
          bottom: "8px",
          left: "50%",
          transform: "translateX(-50%)",
          textAlign: "center",
          pointerEvents: "none",
        }}>
          <div style={{ fontSize: "28px", fontWeight: 800, color: "var(--color-text-primary)", lineHeight: 1 }}>{totalPct}%</div>
          <div style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", marginTop: "2px" }}>Total Attendance</div>
        </div>
      </div>
      {/* Legend */}
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
    </div>
  );
};

const AdminDashboard = () => {
  const { API, token } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [stats, setStats] = useState({ totalEmployees: 0, totalDepartments: 0, totalManagers: 0, totalHR: 0 });
  const [taskStats, setTaskStats] = useState({ total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0 });
  const [deptBreakdown, setDeptBreakdown] = useState([]);
  const [analytics, setAnalytics] = useState({ departmentEmployees: [], attendanceTrend: [], leaveByType: [], leaveByStatus: [] });
  const [attendanceData, setAttendanceData] = useState({ total: 0, present: 0, late: 0, absent: 0, "half-day": 0, "on-leave": 0, notMarked: 0 });
  const [attendancePeriod, setAttendancePeriod] = useState("today");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchTaskStats(), fetchAnalytics(), fetchAttendanceOverview("today")]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAttendanceOverview(attendancePeriod);
  }, [attendancePeriod]);

  const fetchDashboardStats = async () => {
    try {
      const response = await fetch(`${API}/admin/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.success) setStats(result.data);
    } catch (error) {
      console.error("Error fetching dashboard stats:", error);
    }
  };

  const fetchTaskStats = async () => {
    try {
      const result = await apiFetch(`${API}/tasks?limit=1`);
      if (result?.data?.success) {
        setTaskStats(result.data.data.summary);
        if (result.data.data.departmentBreakdown) setDeptBreakdown(result.data.data.departmentBreakdown);
      }
    } catch { /* silent */ }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API}/admin/dashboard/analytics`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.success) setAnalytics(result.data);
    } catch (error) {
      console.error("Error fetching analytics:", error);
    }
  };

  const fetchAttendanceOverview = async (period) => {
    try {
      const response = await fetch(`${API}/admin/dashboard/attendance-overview?period=${period}`, {
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
      const result = await response.json();
      if (result.success) setAttendanceData(result.data);
    } catch (error) {
      console.error("Error fetching attendance overview:", error);
    }
  };

  /* ── Derived data ── */
  const workforceData = useMemo(() => [
    { name: "Employees", value: stats.totalEmployees },
    { name: "Managers", value: stats.totalManagers },
    { name: "HR", value: stats.totalHR },
  ].filter((d) => d.value > 0), [stats]);

  const taskPieData = useMemo(() => [
    { name: "To Do", value: taskStats.todo, color: TASK_STATUS_COLORS.todo },
    { name: "In Progress", value: taskStats.in_progress, color: TASK_STATUS_COLORS.in_progress },
    { name: "Completed", value: taskStats.completed, color: TASK_STATUS_COLORS.completed },
    { name: "Cancelled", value: taskStats.cancelled, color: TASK_STATUS_COLORS.cancelled },
    { name: "Overdue", value: taskStats.overdue, color: TASK_STATUS_COLORS.overdue },
  ].filter((d) => d.value > 0), [taskStats]);

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0";
  const axisColor = isDark ? "#7a8ba8" : "#9ca3af";

  const statsCards = [
    { id: 1, title: "Total Employees", value: stats.totalEmployees, change: "+12.04%", positive: true, changeLabel: "Last month", icon: Users },
    { id: 2, title: "Total Departments", value: stats.totalDepartments, change: "+32.00%", positive: true, changeLabel: "Last month", icon: Building2 },
    { id: 3, title: "Total Managers", value: stats.totalManagers, change: "+16.22%", positive: true, changeLabel: "Last month", icon: UserCog },
    { id: 4, title: "Total HR", value: stats.totalHR, change: "-8.06%", positive: false, changeLabel: "Last month", icon: Briefcase },
    {
      id: 5,
      title: "Pending Tasks",
      value: (taskStats.total - taskStats.completed - taskStats.cancelled) || 0,
      change: taskStats.overdue > 0 ? `${taskStats.overdue} overdue` : "0 overdue",
      positive: taskStats.overdue === 0,
      changeLabel: `of ${taskStats.total} total`,
      icon: CheckSquare,
    },
  ];

  if (loading) {
    return (
      <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
        <div className="flex items-center justify-center h-64">
          <div className="w-10 h-10 rounded-full border-[3px] animate-spin" style={{ borderColor: "var(--color-border)", borderTopColor: "var(--color-accent)" }} />
        </div>
      </AdminLayout>
    );
  }

  const todayLabel = new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

  return (
    <AdminLayout title="Dashboard" subtitle="Overview of your organization.">
      <AnnouncementBanner />
      <div style={{ marginTop: "20px" }}>
        <UpcomingHolidaysWidget />
      </div>

      {/* ── Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {statsCards.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.id} className="rounded-2xl p-5 transition-all duration-200 cursor-default" style={{ backgroundColor: "var(--color-card)", border: "1px solid var(--color-border)" }}>
              <p className="text-xs font-medium mb-3" style={{ color: "var(--color-text-secondary)" }}>{stat.title}</p>
              <p className="text-4xl font-bold tracking-tight leading-none mb-2" style={{ color: "var(--color-text-primary)" }}>{stat.value}</p>
              <div className="flex items-center gap-1.5">
                <span className="flex items-center gap-0.5 text-xs font-semibold" style={{ color: stat.positive ? "var(--color-positive)" : "var(--color-negative)" }}>
                  {stat.positive ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                  {stat.change}
                </span>
                <span className="text-xs" style={{ color: "var(--color-text-muted)" }}>{stat.changeLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* ── Row 1: Task Status + Attendance Gauge ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <ChartCard title="Task Status Overview" icon={CheckSquare}>
          {taskPieData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none" labelLine={false} label={renderDonutLabel}>
                    {taskPieData.map((d, i) => <Cell key={i} fill={d.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {taskPieData.map((d) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: "3px", backgroundColor: d.color }} />
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {d.name} <strong style={{ color: "var(--color-text-primary)" }}>{d.value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No tasks yet</p>
          )}
        </ChartCard>

        <ChartCard
          title="Attendance Overview"
          icon={Clock}
          right={
            <CustomDropdown
              value={attendancePeriod}
              onChange={setAttendancePeriod}
              options={[
                { value: "today", label: "Today" },
                { value: "yesterday", label: "Yesterday" },
                { value: "this_week", label: "This Week" },
                { value: "this_month", label: "This Month" },
              ]}
            />
          }
        >
          <AttendanceGauge data={attendanceData} isDark={isDark} />
        </ChartCard>
      </div>

      {/* ── Row 2: Workforce Distribution + Department Staffing ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Workforce Distribution" icon={PieIcon}>
          {workforceData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={workforceData} cx="50%" cy="50%" innerRadius={55} outerRadius={85} paddingAngle={3} dataKey="value" stroke="none" labelLine={false} label={renderDonutLabel}>
                    {workforceData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex flex-wrap justify-center gap-x-4 gap-y-1 mt-2">
                {workforceData.map((d, i) => (
                  <div key={d.name} className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: "3px", backgroundColor: PIE_COLORS[i] }} />
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {d.name} <strong style={{ color: "var(--color-text-primary)" }}>{d.value}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No data</p>
          )}
        </ChartCard>

        <ChartCard title="Department Staffing" icon={Building2}>
          {analytics.departmentEmployees?.length > 0 ? (
            <div>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={analytics.departmentEmployees} margin={{ left: 0, right: 8, top: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                  <XAxis dataKey="department" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} interval={0} />
                  <YAxis tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                  <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", radius: 4 }} />
                  <defs>
                    {analytics.departmentEmployees.map((_, i) => (
                      <linearGradient key={i} id={`deptGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {analytics.departmentEmployees.map((_, i) => <Cell key={i} fill={`url(#deptGrad${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
              {/* Inline legend */}
              <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-3">
                {analytics.departmentEmployees.map((d, i) => (
                  <div key={d.department} className="flex items-center gap-1.5">
                    <span style={{ width: 8, height: 8, borderRadius: "3px", backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                    <span className="text-xs" style={{ color: "var(--color-text-secondary)" }}>
                      {d.department} <strong style={{ color: "var(--color-text-primary)" }}>{d.count}</strong>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No department data</p>
          )}
        </ChartCard>
      </div>

      {/* ── Row 3: Attendance Trend + Leave Stats ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Attendance Trend (6 Months)" icon={CalendarDays}>
          {analytics.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.attendanceTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#22c55e" strokeWidth={2} fill="url(#gPresent)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} fill="url(#gLate)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} fill="url(#gAbsent)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No attendance data</p>
          )}
        </ChartCard>

        <ChartCard title="Leave Statistics by Type" icon={CalendarDays}>
          {analytics.leaveByType?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={analytics.leaveByType} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="type" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Bar dataKey="approved" name="Approved" fill="#22c55e" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="pending" name="Pending" fill="#f59e0b" radius={[4, 4, 0, 0]} maxBarSize={24} />
                <Bar dataKey="rejected" name="Rejected" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={24} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No leave data</p>
          )}
        </ChartCard>
      </div>

      {/* ── Row 4: Department Task Performance ── */}
      {deptBreakdown.length > 0 && (
        <div className="mt-4">
          <ChartCard title="Department Task Performance" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptBreakdown} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#f59e0b" maxBarSize={36} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" maxBarSize={36} />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </AdminLayout>
  );
};

export default AdminDashboard;
