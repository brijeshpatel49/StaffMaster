import { useState, useEffect, useMemo } from "react";
import HRLayout from "../../layouts/HRLayout";
import { useAuth } from "../../hooks/useAuth";
import { useTheme } from "../../context/ThemeContext";
import { apiFetch } from "../../utils/api";
import { Loader } from "../../components/Loader";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import UpcomingHolidaysWidget from "../../components/UpcomingHolidaysWidget";
import CustomDropdown from "../../components/CustomDropdown";
import {
  Users,
  UserCheck,
  TrendingUp,
  Clock,
  Building2,
  CalendarDays,
} from "lucide-react";
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
  ReferenceDot,
} from "recharts";

/* ── Colors ── */
const GAUGE_COLORS = { onTime: "#22c55e", late: "#f59e0b", onLeave: "#38bdf8", absent: "#ef4444" };
const ATTEND_TREND_COLORS = { present: "#22c55e", absent: "#ef4444", late: "#f59e0b" };
const PERF_DEPT_COLORS = ["#0ea5e9", "#22c55e", "#f59e0b", "#ef4444", "#14b8a6", "#f97316", "#8b5cf6", "#e11d48"];

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

/* ── Attendance Gauge (half-donut) ── */
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

// ─── small helpers ────────────────────────────────────────────────────────────
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const EMPLOYMENT_COLORS = {
  "full-time": { bg: "#dbeafe", text: "#1d4ed8" },
  "part-time": { bg: "#f3e8ff", text: "#7e22ce" },
  contract: { bg: "#ffedd5", text: "#c2410c" },
};

const withNoDataTags = (rows = [], keys = []) => {
  const list = Array.isArray(rows) ? rows : [];
  const firstDataIndex = list.findIndex((row) =>
    keys.some((key) => Number(row?.[key] || 0) > 0),
  );

  if (firstDataIndex <= 0) {
    return list.map((row) => ({ ...row, noDataBeforeStart: false }));
  }

  return list.map((row, idx) => ({
    ...row,
    noDataBeforeStart:
      idx < firstDataIndex &&
      keys.every((key) => Number(row?.[key] || 0) === 0),
  }));
};

// ─── stat card ────────────────────────────────────────────────────────────────
const StatCard = ({
  title,
  value,
  icon: Icon,
  iconBg,
  iconColor,
  badge,
  badgeColor,
}) => (
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
      {badge && (
        <span
          style={{
            fontSize: "12px",
            fontWeight: 600,
            color: badgeColor || "#16a34a",
            display: "flex",
            alignItems: "center",
            gap: "4px",
          }}
        >
          <TrendingUp size={14} />
          {badge}
        </span>
      )}
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

// ─── department bar ───────────────────────────────────────────────────────────
const DeptBar = ({ name, code, count, max }) => {
  const pct = max > 0 ? Math.round((count / max) * 100) : 0;
  return (
    <div style={{ marginBottom: "16px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: "6px",
        }}
      >
        <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-primary)" }}>
          {name}{" "}
          <span style={{ color: "var(--color-text-muted)", fontWeight: 400 }}>({code})</span>
        </span>
        <span style={{ fontSize: "13px", fontWeight: 700, color: "var(--color-text-primary)" }}>
          {count}
        </span>
      </div>
      <div
        style={{
          height: "8px",
          backgroundColor: "var(--color-border)",
          borderRadius: "99px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "99px",
            background: "linear-gradient(90deg, #fbbf24 0%, #f59e0b 100%)",
            transition: "width 0.6s ease",
          }}
        />
      </div>
    </div>
  );
};

// ─── main component ───────────────────────────────────────────────────────────
const HRDashboard = () => {
  const { API, token } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [data, setData] = useState(null);
  const [analytics, setAnalytics] = useState({ departmentEmployees: [], attendanceTrend: [], leaveByType: [], leaveByStatus: [] });
  const [attendanceData, setAttendanceData] = useState({ total: 0, present: 0, late: 0, absent: 0, "half-day": 0, "on-leave": 0, notMarked: 0 });
  const [attendancePeriod, setAttendancePeriod] = useState("today");
  const [loading, setLoading] = useState(true);
  const [perfTrend, setPerfTrend] = useState([]);
  const [perfDepartments, setPerfDepartments] = useState([]);

  useEffect(() => {
    Promise.all([fetchStats(), fetchAnalytics(), fetchAttendanceOverview("today"), fetchPerfTrend()]).finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchAttendanceOverview(attendancePeriod);
  }, [attendancePeriod]);

  const fetchStats = async () => {
    try {
      const result = await apiFetch(`${API}/hr/dashboard/stats`);
      if (result?.data?.success) setData(result.data.data);
    } catch (err) {
      console.error("HR Dashboard fetch error:", err);
    }
  };

  const fetchAnalytics = async () => {
    try {
      const response = await fetch(`${API}/hr/dashboard/analytics`, {
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
      const response = await fetch(`${API}/hr/dashboard/attendance-overview?period=${period}`, {
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
        const departments = Array.isArray(result.data.departments)
          ? result.data.departments
          : [];
        setPerfDepartments(
          departments
            .map((dept) =>
              typeof dept === "string"
                ? { key: dept, name: dept }
                : { key: dept?.key, name: dept?.name }
            )
            .filter((dept) => dept.key && dept.name)
        );
      }
    } catch { /* silent */ }
  };

  /* ── Derived data ── */
  const leaveStatusMap = useMemo(() => {
    const map = {};
    (analytics.leaveByStatus || []).forEach((item) => {
      map[item.status] = item.count;
    });
    return map;
  }, [analytics.leaveByStatus]);

  const attendanceTrendWithTags = useMemo(
    () => withNoDataTags(analytics.attendanceTrend || [], ["present", "absent", "late", "half-day", "on-leave"]),
    [analytics.attendanceTrend],
  );

  const performanceTrendWithTags = useMemo(() => {
    const tagged = withNoDataTags(perfTrend || [], ["total", "avgScore", "completed", "pending"]);
    const topStartIndex = tagged.findIndex((entry) => typeof entry?.topPerformer?.score === "number");
    const leastStartIndex = tagged.findIndex((entry) => typeof entry?.leastPerformer?.score === "number");

    return tagged.map((point, idx, list) => {
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
    () => performanceTrendWithTags.find((d) => d?.isPartial),
    [performanceTrendWithTags],
  );

  const hasPerformanceData = useMemo(
    () => performanceTrendWithTags.some((d) => Number(d.total || d.avgScore || d.completed || d.pending || 0) > 0),
    [performanceTrendWithTags],
  );

  const gridColor = isDark ? "rgba(255,255,255,0.06)" : "#f0f0f0";
  const axisColor = isDark ? "#7a8ba8" : "#9ca3af";

  if (loading) {
    return (
      <HRLayout title="HR Dashboard" subtitle="Your workforce at a glance.">
        <Loader variant="section" />
      </HRLayout>
    );
  }

  const maxDept = Math.max(...(data?.byDepartment?.map((d) => d.count) || [1]));

  return (
    <HRLayout title="HR Dashboard" subtitle="Your workforce at a glance.">
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
          title="Total Employees"
          value={data?.totalEmployees ?? 0}
          icon={Users}
          iconBg="#dbeafe"
          iconColor="#2563eb"
        />
        <StatCard
          title="Present Today"
          value={attendanceData?.present ?? 0}
          icon={UserCheck}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          badge={`${attendanceData?.total ? Math.round((attendanceData.present / attendanceData.total) * 100) : 0}%`}
          badgeColor="#16a34a"
        />
        <StatCard
          title="On Leave Today"
          value={attendanceData?.["on-leave"] ?? 0}
          icon={CalendarDays}
          iconBg="#eff6ff"
          iconColor="#2563eb"
        />
        <StatCard
          title="Pending Leave Requests"
          value={leaveStatusMap.pending ?? 0}
          icon={Clock}
          iconBg="#fffbeb"
          iconColor="#d97706"
        />
      </div>

      {/* ── Chart Row 1: Attendance Overview | Leave Statistics by Type ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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

      {/* ── Chart Row 2: Performance Trend + Attendance Trend ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <ChartCard
          title="Performance Trend (6 Months)"
          icon={TrendingUp}
          right={partialPerformancePoint ? (
            <span style={{ fontSize: "10px", fontWeight: 700, color: "#f59e0b", backgroundColor: isDark ? "rgba(245,158,11,0.14)" : "rgba(245,158,11,0.12)", border: "1px solid rgba(245,158,11,0.32)", borderRadius: "999px", padding: "4px 8px" }}>
              {partialPerformancePoint.month}: {partialPerformancePoint.completenessPercent}% in progress
            </span>
          ) : null}
        >
          {performanceTrendWithTags.length > 0 && hasPerformanceData ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={performanceTrendWithTags} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="hrGradPerfScore" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tickFormatter={(value, index) => performanceTrendWithTags[index]?.isPartial ? `${value}*` : value} tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis yAxisId="score" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} domain={[0, 5]} />
                <Tooltip content={<PerformanceTrendTooltip isDark={isDark} />} isAnimationActive={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                {performanceTrendWithTags
                  .filter((d) => d.noDataBeforeStart)
                  .map((d, idx) => (
                    <ReferenceDot
                      key={`perf-no-data-${d.month}-${idx}`}
                      x={d.month}
                      y={0}
                      r={0}
                      ifOverflow="visible"
                      label={{ value: "No data", position: "top", fill: axisColor, fontSize: 10, fontWeight: 600 }}
                    />
                  ))}
                <Area
                  type="monotone"
                  dataKey="avgScoreMain"
                  name="Avg Score"
                  yAxisId="score"
                  stroke="#6366f1"
                  fill="url(#hrGradPerfScore)"
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
                {perfDepartments.map((dept, idx) => (
                  <Area
                    key={dept.key}
                    type="monotone"
                    dataKey={dept.key}
                    name={dept.name}
                    stroke={PERF_DEPT_COLORS[idx % PERF_DEPT_COLORS.length]}
                    fill="none"
                    strokeWidth={2}
                    dot={false}
                    connectNulls
                  />
                ))}
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No performance data</p>
          )}
        </ChartCard>

        <ChartCard title="Attendance Trend (6 Months)" icon={CalendarDays}>
          {attendanceTrendWithTags.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={attendanceTrendWithTags} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="hrGradPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ATTEND_TREND_COLORS.present} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ATTEND_TREND_COLORS.present} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hrGradAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ATTEND_TREND_COLORS.absent} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ATTEND_TREND_COLORS.absent} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hrGradLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={ATTEND_TREND_COLORS.late} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={ATTEND_TREND_COLORS.late} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                {attendanceTrendWithTags
                  .filter((d) => d.noDataBeforeStart)
                  .map((d, idx) => (
                    <ReferenceDot
                      key={`attendance-no-data-${d.month}-${idx}`}
                      x={d.month}
                      y={0}
                      r={0}
                      ifOverflow="visible"
                      label={{ value: "No data", position: "top", fill: axisColor, fontSize: 10, fontWeight: 600 }}
                    />
                  ))}
                <Area type="monotone" dataKey="present" name="Present" stroke={ATTEND_TREND_COLORS.present} fill="url(#hrGradPresent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke={ATTEND_TREND_COLORS.absent} fill="url(#hrGradAbsent)" strokeWidth={2} dot={false} />
                <Area type="monotone" dataKey="late" name="Late" stroke={ATTEND_TREND_COLORS.late} fill="url(#hrGradLate)" strokeWidth={2} dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <p className="text-center text-xs py-10" style={{ color: "var(--color-text-muted)" }}>No attendance data</p>
          )}
        </ChartCard>
      </div>

      {/* ── Bottom Grid: Employees by Department | Recently Added ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1.4fr",
          gap: "24px",
        }}
      >
        {/* Employees by Department */}
        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "20px",
            padding: "24px",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "#fef9c3",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Building2 size={20} color="#ca8a04" />
            </div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              Employees by Department
            </h2>
          </div>

          {data?.byDepartment?.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
              No department data available.
            </p>
          ) : (
            data?.byDepartment?.map((dept) => (
              <DeptBar
                key={dept.departmentName}
                name={dept.departmentName}
                code={dept.departmentCode}
                count={dept.count}
                max={maxDept}
              />
            ))
          )}
        </div>

        {/* Recently Added Employees */}
        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "20px",
            padding: "24px",
            border: "1px solid var(--color-border)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "10px",
              marginBottom: "20px",
            }}
          >
            <div
              style={{
                width: "38px",
                height: "38px",
                borderRadius: "10px",
                backgroundColor: "#dbeafe",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Clock size={20} color="#2563eb" />
            </div>
            <h2
              style={{
                fontSize: "16px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: 0,
              }}
            >
              Recently Added Employees
            </h2>
          </div>

          {data?.recentEmployees?.length === 0 ? (
            <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>
              No employees yet.
            </p>
          ) : (
            <div
              style={{ display: "flex", flexDirection: "column", gap: "12px" }}
            >
              {data?.recentEmployees?.map((emp, i) => {
                const initials = emp.fullName
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase()
                  .slice(0, 2);
                const empColor =
                  EMPLOYMENT_COLORS[emp.employmentType] ||
                  EMPLOYMENT_COLORS["full-time"];
                return (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "12px",
                      padding: "10px 12px",
                      borderRadius: "12px",
                      transition: "background 0.15s",
                    }}
                    onMouseOver={(e) =>
                      (e.currentTarget.style.backgroundColor = isDark ? "rgba(255,255,255,0.04)" : "#f9fafb")
                    }
                    onMouseOut={(e) =>
                      (e.currentTarget.style.backgroundColor = "transparent")
                    }
                  >
                    {/* Avatar */}
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        backgroundColor: "#e0e7ff",
                        color: "#4338ca",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontWeight: 700,
                        fontSize: "13px",
                        flexShrink: 0,
                      }}
                    >
                      {initials}
                    </div>

                    {/* Info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "13px",
                          fontWeight: 700,
                          color: "var(--color-text-primary)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {emp.fullName}
                      </p>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "12px",
                          color: "var(--color-text-muted)",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {emp.designation} · {emp.department}
                      </p>
                    </div>

                    {/* Right side */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "flex-end",
                        gap: "4px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "11px",
                          fontWeight: 600,
                          backgroundColor: empColor.bg,
                          color: empColor.text,
                          padding: "2px 8px",
                          borderRadius: "99px",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {emp.employmentType}
                      </span>
                      <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                        {formatDate(emp.joiningDate)}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

    </HRLayout>
  );
};

export default HRDashboard;