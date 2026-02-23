import { useState, useEffect } from "react";
import ManagerLayout from "../../layouts/ManagerLayout";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../utils/api";
import { Users, UserCheck, Building2 } from "lucide-react";

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
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    fetchTeam();
  }, [API]);

  if (loading) {
    return (
      <ManagerLayout
        title="Manager Dashboard"
        subtitle="Overview of your team."
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "300px",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #fde68a",
              borderTop: "4px solid #f59e0b",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
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

  const { department, totalMembers, activeMembersCount, employees } =
    data || {};

  return (
    <ManagerLayout title="Manager Dashboard" subtitle="Overview of your team.">
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
          title="Active Members"
          value={activeMembersCount ?? 0}
          icon={UserCheck}
          iconBg="#dcfce7"
          iconColor="#16a34a"
        />
      </div>

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
