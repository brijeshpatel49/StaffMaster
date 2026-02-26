import { useState, useEffect } from "react";
import HRLayout from "../../layouts/HRLayout";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../utils/api";
import { Loader } from "../../components/Loader";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import {
  Users,
  UserCheck,
  UserMinus,
  UserX,
  TrendingUp,
  Clock,
  Building2,
} from "lucide-react";

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
  const { API } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const result = await apiFetch(`${API}/hr/dashboard/stats`);
        if (result?.data?.success) {
          setData(result.data.data);
        }
      } catch (err) {
        console.error("HR Dashboard fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

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

      {/* ── Bottom Grid ── */}
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
                      (e.currentTarget.style.backgroundColor = "#f9fafb")
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
