// src/pages/Admin/AdminDashboard.jsx

import { useState, useEffect, useMemo } from "react";
import AdminLayout from "../../layouts/AdminLayout";
import {
  Users,
  Building2,
  UserCog,
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
  Legend,
  AreaChart,
  Area,
  Line,
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
const GAUGE_COLORS = { onTime: "#22c55e", late: "#f59e0b", onLeave: "#38bdf8", absent: "#ef4444" };
const ATTEND_TREND_COLORS = { present: "#22c55e", absent: "#ef4444", late: "#f59e0b" };

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
      maxWidth: "340px",
      zIndex: 1200,
    }}>
      {label && (
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "13px", color: isDark ? "#f0f2f8" : "#0f1624", letterSpacing: "-0.01em" }}>
          {label}
        </p>
      )}
      {payload.map((p, i) => {
        const item = p.payload || {};
        const isGauge = item.pct !== undefined;
        const names = item.members || [];
        return (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px", padding: "3px 0" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span style={{ width: 10, height: 10, borderRadius: "3px", backgroundColor: p.color, flexShrink: 0 }} />
                <span style={{ fontSize: "12px", color: isDark ? "#a1b0c8" : "#6b7280", fontWeight: 500 }}>{p.name}</span>
              </div>
              <span style={{ fontSize: "13px", fontWeight: 700, color: isDark ? "#f0f2f8" : "#0f1624", fontVariantNumeric: "tabular-nums" }}>
                {isGauge ? `${p.value} (${item.pct}%)` : p.value}
              </span>
            </div>
            {isGauge && names.length > 0 && (
              <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.35, paddingLeft: "18px", whiteSpace: "normal", overflowWrap: "anywhere", maxHeight: "90px", overflowY: "auto" }}>
                {names.length > 5 ? `${names.slice(0, 5).join(", ")} +${names.length - 5} more` : names.join(", ")}
              </p>
            )}
            {isGauge && names.length === 0 && (
              <p style={{ margin: 0, fontSize: "11px", color: "var(--color-text-muted)", lineHeight: 1.35, paddingLeft: "18px" }}>
                Average per working day
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
};

const PerformanceTrendTooltip = ({ active, payload, label, isDark }) => {
  if (!active || !payload?.length) return null;

  const point = payload.find((entry) => entry?.payload)?.payload || {};
  const avgEntry = payload.find((entry) => ["avgScore", "avgScoreMain", "avgScoreProgress"].includes(entry?.dataKey));
  const avgScore = typeof avgEntry?.value === "number" ? avgEntry.value : point.avgScore;
  const completenessPercent = Number(point.completenessPercent ?? 100);
  const partial = Boolean(point.isPartial);
  const projectedPartial = Boolean(point.isProjectedPartial);
  const topPerformer = point.topPerformer;
  const leastPerformer = point.leastPerformer;

  return (
    <div style={{
      backgroundColor: isDark ? "#252628" : "#ffffff",
      border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
      borderRadius: "12px",
      padding: "12px 16px",
      boxShadow: isDark ? "0 12px 40px rgba(0,0,0,0.6)" : "0 12px 32px rgba(0,0,0,0.12)",
      minWidth: "170px",
    }}>
      {label && (
        <p style={{ margin: "0 0 8px", fontWeight: 700, fontSize: "13px", color: isDark ? "#f0f2f8" : "#0f1624", letterSpacing: "-0.01em" }}>
          {label}
        </p>
      )}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
          <span style={{ color: isDark ? "#a1b0c8" : "#6b7280", fontWeight: 500 }}>Avg Score</span>
          <span style={{ color: isDark ? "#f0f2f8" : "#0f1624", fontWeight: 700 }}>
            {typeof avgScore === "number" ? `${projectedPartial ? "~" : ""}${avgScore.toFixed(2)}` : "In progress"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
          <span style={{ color: isDark ? "#a1b0c8" : "#6b7280", fontWeight: 500 }}>Top Performer</span>
          <span style={{ color: "#22c55e", fontWeight: 700, maxWidth: "58%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
            {topPerformer?.name ? `${topPerformer.name} (${Number(topPerformer.score || 0).toFixed(2)})` : "N/A"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
          <span style={{ color: isDark ? "#a1b0c8" : "#6b7280", fontWeight: 500 }}>Least Performer</span>
          <span style={{ color: "#ef4444", fontWeight: 700, maxWidth: "58%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", textAlign: "right" }}>
            {leastPerformer?.name ? `${leastPerformer.name} (${Number(leastPerformer.score || 0).toFixed(2)})` : "N/A"}
          </span>
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", fontSize: "12px" }}>
          <span style={{ color: isDark ? "#a1b0c8" : "#6b7280", fontWeight: 500 }}>Completeness</span>
          <span style={{ color: partial ? "#f59e0b" : (isDark ? "#f0f2f8" : "#0f1624"), fontWeight: 700 }}>
            {completenessPercent}% {partial ? "(In progress)" : "(Complete)"}
          </span>
        </div>
        {partial && (
          <p style={{ margin: "2px 0 0", fontSize: "11px", color: projectedPartial ? "#f59e0b" : "var(--color-text-muted)", fontWeight: projectedPartial ? 600 : 500 }}>
            {projectedPartial ? "Projected from last completed month" : "Month is still in progress"}
          </p>
        )}
      </div>
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
  const onTime = data.present || 0;
  const late = (data.late || 0) + (data["half-day"] || 0);
  const onLeave = data["on-leave"] || 0;
  const absent = data.absent || 0;

  const attended = onTime + late + onLeave;
  const sliceSum = onTime + late + onLeave + absent;
  const total = Math.max(data.total || 1, sliceSum);
  const notMarked = total - sliceSum;

  const totalPct = total > 0 ? Math.round((attended / total) * 100) : 0;
  const onTimePct = total > 0 ? ((onTime / total) * 100).toFixed(1) : "0.0";
  const latePct = total > 0 ? ((late / total) * 100).toFixed(1) : "0.0";
  const onLeavePct = total > 0 ? ((onLeave / total) * 100).toFixed(1) : "0.0";
  const absentPct = total > 0 ? ((absent / total) * 100).toFixed(1) : "0.0";

  // Build gauge data — half-donut uses startAngle=180 endAngle=0
  const gaugeData = [
    { name: "On Time", value: onTime, color: GAUGE_COLORS.onTime, pct: onTimePct, members: data.presentMembers || [] },
    { name: "Late", value: late, color: GAUGE_COLORS.late, pct: latePct, members: data.lateMembers || [] },
    { name: "On Leave", value: onLeave, color: GAUGE_COLORS.onLeave, pct: onLeavePct, members: data.onLeaveMembers || [] },
    { name: "Absent", value: absent, color: GAUGE_COLORS.absent, pct: absentPct, members: data.absentMembers || [] },
  ].filter(d => d.value > 0);

  if (notMarked > 0) {
    gaugeData.push({
      name: "Not Marked",
      value: notMarked,
      color: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)",
      pct: ((notMarked / total) * 100).toFixed(1)
    });
  }

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
            <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} allowEscapeViewBox={{ x: true, y: true }} wrapperStyle={{ zIndex: 1200 }} />
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
      <div className="flex flex-wrap items-center justify-center gap-4 mt-1 px-2">
        {[
          { label: "On Time", pct: onTimePct, color: GAUGE_COLORS.onTime },
          { label: "Delay Time", pct: latePct, color: GAUGE_COLORS.late },
          { label: "On Leave", pct: onLeavePct, color: GAUGE_COLORS.onLeave },
          { label: "Absent", pct: absentPct, color: GAUGE_COLORS.absent },
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
  const [perfTrend, setPerfTrend] = useState([]);

  useEffect(() => {
    Promise.all([fetchDashboardStats(), fetchTaskStats(), fetchAnalytics(), fetchAttendanceOverview("today"), fetchPerfTrend()]).finally(() => setLoading(false));
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

  const fetchPerfTrend = async () => {
    try {
      const result = await apiFetch(`${API}/performance/trend`);
      if (result?.data?.success) {
        setPerfTrend(result.data.data || []);
      }
    } catch { /* silent */ }
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

  const performanceTrendChartData = useMemo(() => {
    const list = perfTrend || [];
    const topStartIndex = list.findIndex((entry) => typeof entry?.topPerformer?.score === "number");
    const leastStartIndex = list.findIndex((entry) => typeof entry?.leastPerformer?.score === "number");

    return list.map((point, idx) => {
      const nextPoint = list[idx + 1];
      const isPartial = Boolean(point?.isPartial);
      const linkToPartial = Boolean(nextPoint?.isPartial);
      const previousCompleteScore = [...list]
        .slice(0, idx)
        .reverse()
        .find((entry) => typeof entry?.avgScore === "number")?.avgScore ?? null;
      const resolvedPartialScore = isPartial
        ? (typeof point.avgScore === "number" ? point.avgScore : previousCompleteScore)
        : point.avgScore;
      const isProjectedPartial = isPartial && point.avgScore == null && previousCompleteScore != null;
      const previousTopScore = [...list]
        .slice(0, idx)
        .reverse()
        .find((entry) => typeof entry?.topPerformer?.score === "number")?.topPerformer?.score ?? null;
      const previousLeastScore = [...list]
        .slice(0, idx)
        .reverse()
        .find((entry) => typeof entry?.leastPerformer?.score === "number")?.leastPerformer?.score ?? null;

      const rawTopScore = typeof point?.topPerformer?.score === "number" ? point.topPerformer.score : null;
      const rawLeastScore = typeof point?.leastPerformer?.score === "number" ? point.leastPerformer.score : null;
      const topPerformerScore = rawTopScore
        ?? (isPartial ? previousTopScore : null)
        ?? (topStartIndex !== -1 && idx < topStartIndex ? 0 : null);
      const leastPerformerScore = rawLeastScore
        ?? (isPartial ? previousLeastScore : null)
        ?? (leastStartIndex !== -1 && idx < leastStartIndex ? 0 : null);

      return {
        ...point,
        avgScoreMain: isPartial ? null : point.avgScore,
        avgScoreProgress: isPartial || linkToPartial ? resolvedPartialScore : null,
        isProjectedPartial,
        topPerformerScore,
        leastPerformerScore,
      };
    });
  }, [perfTrend]);

  const partialPerformancePoint = useMemo(
    () => performanceTrendChartData.find((d) => d?.isPartial),
    [performanceTrendChartData],
  );

  const hasPerformanceData = useMemo(
    () => performanceTrendChartData.some((d) => Number(d?.total || d?.sampleSize || 0) > 0),
    [performanceTrendChartData],
  );

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0";
  const axisColor = isDark ? "#7a8ba8" : "#9ca3af";

  const statsCards = [
    { id: 1, title: "Total Departments", value: stats.totalDepartments, change: "+32.00%", positive: true, changeLabel: "Last month", icon: Building2 },
    { id: 2, title: "Total Managers", value: stats.totalManagers, change: "+16.22%", positive: true, changeLabel: "Last month", icon: UserCog },
    { id: 3, title: "Total Employees", value: stats.totalEmployees, change: "+12.04%", positive: true, changeLabel: "Last month", icon: Users },
    {
      id: 4,
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
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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

      {/* ── Row 1: Performance Trend + Attendance Overview ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <ChartCard
          title="Performance Trend (6 Months)"
          icon={TrendingUp}
          right={partialPerformancePoint ? (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", backgroundColor: isDark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.32)", borderRadius: "999px", padding: "4px 8px" }}>
              {partialPerformancePoint.month}: {partialPerformancePoint.completenessPercent}% in progress
            </span>
          ) : null}
        >
          {performanceTrendChartData.length > 0 && hasPerformanceData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={performanceTrendChartData} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradPerfScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value, index) => performanceTrendChartData[index]?.isPartial ? `${value}*` : value} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="score" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} domain={[0, 5]} />
                <Tooltip content={<PerformanceTrendTooltip isDark={isDark} />} isAnimationActive={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Area
                  type="monotone"
                  dataKey="avgScoreMain"
                  name="Avg Score"
                  yAxisId="score"
                  stroke="#6366f1"
                  fill="url(#gradPerfScore)"
                  strokeWidth={2.5}
                  connectNulls
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload || payload.isPartial || cx == null || cy == null) return null;
                    return <circle cx={cx} cy={cy} r={4} fill="#6366f1" strokeWidth={0} />;
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="avgScoreProgress"
                  name="In Progress"
                  yAxisId="score"
                  stroke="#6366f1"
                  strokeWidth={2.5}
                  strokeDasharray="6 5"
                  connectNulls
                  legendType="none"
                  dot={(props) => {
                    const { cx, cy, payload } = props;
                    if (!payload?.isPartial || cx == null || cy == null || payload.avgScoreProgress == null) return null;
                    return (
                      <circle
                        cx={cx}
                        cy={cy}
                        r={4.5}
                        fill={isDark ? "#252628" : "#ffffff"}
                        stroke={payload.isProjectedPartial ? "#f59e0b" : "#6366f1"}
                        strokeWidth={2}
                        strokeDasharray="3 2"
                      />
                    );
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="topPerformerScore"
                  name="Top Performer"
                  yAxisId="score"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#22c55e", strokeWidth: 0 }}
                  connectNulls
                />
                <Line
                  type="monotone"
                  dataKey="leastPerformerScore"
                  name="Least Performer"
                  yAxisId="score"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444", strokeWidth: 0 }}
                  connectNulls
                />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No performance data</p>
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

      {/* ── Row 2: Task Status + Department Task Performance ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Task Status Overview" icon={CheckSquare}>
          {taskPieData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={taskPieData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none" labelLine={false} label={renderDonutLabel}>
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

        {deptBreakdown.length > 0 ? (
          <ChartCard title="Department Task Performance" icon={BarChart3}>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={deptBreakdown} margin={{ left: 10, right: 10, top: 5, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="department" tick={{ fontSize: 10, fill: axisColor }} axisLine={false} tickLine={false} interval={0} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} cursor={{ fill: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Bar dataKey="completed" name="Completed" stackId="a" fill="#22c55e" maxBarSize={36} />
                <Bar dataKey="in_progress" name="In Progress" stackId="a" fill="#f59e0b" maxBarSize={36} />
                <Bar dataKey="overdue" name="Overdue" stackId="a" fill="#ef4444" radius={[4, 4, 0, 0]} maxBarSize={36} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        ) : (
          <ChartCard title="Department Task Performance" icon={BarChart3}>
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No task data</p>
          </ChartCard>
        )}
      </div>

      {/* ── Row 3: Attendance Trend + Workforce Distribution ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
        <ChartCard title="Attendance Trend (6 Months)" icon={CalendarDays}>
          {analytics.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.attendanceTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="gradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ATTEND_TREND_COLORS.present} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ATTEND_TREND_COLORS.present} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ATTEND_TREND_COLORS.absent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ATTEND_TREND_COLORS.absent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ATTEND_TREND_COLORS.late} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ATTEND_TREND_COLORS.late} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Area type="monotone" dataKey="present" name="Present" stroke={ATTEND_TREND_COLORS.present} fill="url(#gradPresent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke={ATTEND_TREND_COLORS.absent} fill="url(#gradAbsent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="late" name="Late" stroke={ATTEND_TREND_COLORS.late} fill="url(#gradLate)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No attendance data</p>
          )}
        </ChartCard>

        <ChartCard title="Workforce Distribution" icon={PieIcon}>
          {workforceData.length > 0 ? (
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={workforceData} cx="50%" cy="50%" innerRadius={60} outerRadius={95} paddingAngle={3} dataKey="value" stroke="none" labelLine={false} label={renderDonutLabel}>
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
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;
