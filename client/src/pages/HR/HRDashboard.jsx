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
  UserMinus,
  UserX,
  TrendingUp,
  Clock,
  Building2,
  PieChart as PieIcon,
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
  AreaChart,
  Area,
  Legend,
} from "recharts";

/* ── Colors ── */
const PIE_COLORS = ["#6366f1", "#f59e0b", "#22c55e", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#14b8a6"];
const GAUGE_COLORS = { onTime: "#22c55e", late: "#f59e0b", onLeave: "#38bdf8" };

/* ── Chart Tooltip ── */
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

/* ── Attendance Gauge (half-donut) ── */
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

  const gaugeData = [
    { name: "On Time", value: onTime, color: GAUGE_COLORS.onTime },
    { name: "Late", value: late, color: GAUGE_COLORS.late },
    { name: "On Leave", value: onLeave, color: GAUGE_COLORS.onLeave },
  ].filter(d => d.value > 0);

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

  useEffect(() => {
    Promise.all([fetchStats(), fetchAnalytics(), fetchAttendanceOverview("today")]).finally(() => setLoading(false));
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

  /* ── Derived data ── */
  const workforceData = useMemo(() => {
    if (!data) return [];
    return [
      { name: "Active", value: data.activeCount || 0 },
      { name: "Resigned", value: data.resignedCount || 0 },
      { name: "Terminated", value: data.terminatedCount || 0 },
    ].filter((d) => d.value > 0);
  }, [data]);

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
          title="Active"
          value={data?.activeCount ?? 0}
          icon={UserCheck}
          iconBg="#dcfce7"
          iconColor="#16a34a"
          badge={`${data?.totalEmployees ? Math.round((data.activeCount / data.totalEmployees) * 100) : 0}%`}
          badgeColor="#16a34a"
        />
        <StatCard
          title="Resigned"
          value={data?.resignedCount ?? 0}
          icon={UserMinus}
          iconBg="#fef9c3"
          iconColor="#ca8a04"
        />
        <StatCard
          title="Terminated"
          value={data?.terminatedCount ?? 0}
          icon={UserX}
          iconBg="#fee2e2"
          iconColor="#dc2626"
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

      {/* ── Chart Row 2: Workforce Distribution | Department Staffing ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
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
                      <linearGradient key={i} id={`hrDeptGrad${i}`} x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={1} />
                        <stop offset="100%" stopColor={PIE_COLORS[i % PIE_COLORS.length]} stopOpacity={0.5} />
                      </linearGradient>
                    ))}
                  </defs>
                  <Bar dataKey="count" name="Employees" radius={[6, 6, 0, 0]} maxBarSize={36}>
                    {analytics.departmentEmployees.map((_, i) => <Cell key={i} fill={`url(#hrDeptGrad${i})`} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
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

      {/* ── Chart Row 3: Attendance Trend (full width) ── */}
      <div className="mb-4">
        <ChartCard title="Attendance Trend (6 Months)" icon={CalendarDays}>
          {analytics.attendanceTrend?.length > 0 ? (
            <ResponsiveContainer width="100%" height={280}>
              <AreaChart data={analytics.attendanceTrend} margin={{ left: 0, right: 10, top: 5, bottom: 5 }}>
                <defs>
                  <linearGradient id="hrGPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#22c55e" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hrGLate" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="hrGAbsent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ef4444" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke={gridColor} />
                <XAxis dataKey="month" tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 11, fill: axisColor }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip content={<ChartTooltip isDark={isDark} />} isAnimationActive={false} />
                <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: "11px", color: axisColor }} />
                <Area type="monotone" dataKey="present" name="Present" stroke="#22c55e" strokeWidth={2} fill="url(#hrGPresent)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="late" name="Late" stroke="#f59e0b" strokeWidth={2} fill="url(#hrGLate)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
                <Area type="monotone" dataKey="absent" name="Absent" stroke="#ef4444" strokeWidth={2} fill="url(#hrGAbsent)" dot={false} activeDot={{ r: 4, strokeWidth: 0 }} />
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