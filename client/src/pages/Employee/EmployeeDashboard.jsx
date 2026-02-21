import { useState, useEffect } from "react";
import EmployeeLayout from "../../components/Employee/EmployeeLayout";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../utils/api";
import { Building2, Briefcase, FileBadge, Activity, User } from "lucide-react";

const InfoCard = ({ title, value, icon: Icon, iconBg, iconColor }) => (
  <div
    style={{
      background: "#fff",
      borderRadius: "20px",
      padding: "24px",
      border: "1px solid #f3f4f6",
      boxShadow: "0 2px 12px rgba(0,0,0,0.04)",
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.boxShadow = "0 8px 24px rgba(0,0,0,0.08)";
      e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.boxShadow = "0 2px 12px rgba(0,0,0,0.04)";
      e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    <div
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        backgroundColor: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={28} color={iconColor} />
    </div>
    <div>
      <p
        style={{
          fontSize: "13px",
          color: "#9ca3af",
          fontWeight: 600,
          margin: "0 0 6px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "#111827",
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
    month: "long",
    year: "numeric",
  });
};

const EmployeeDashboard = () => {
  const { API } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await apiFetch(`${API}/employee/me`);
        if (result?.data?.success) {
          setData(result.data.data);
          setError(null);
        } else {
          setError(result?.data?.message || "Failed to load profile data");
        }
      } catch (err) {
        console.error("Employee Dashboard fetch error:", err);
        setError("Error fetching profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [API]);

  if (loading) {
    return (
      <EmployeeLayout
        title="My Dashboard"
        subtitle="Welcome to your employee portal."
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
              border: "4px solid #dbeafe",
              borderTop: "4px solid #3b82f6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
      </EmployeeLayout>
    );
  }

  if (error) {
    return (
      <EmployeeLayout
        title="My Dashboard"
        subtitle="Welcome to your employee portal."
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
      </EmployeeLayout>
    );
  }

  const {
    fullName,
    email,
    department,
    designation,
    employmentType,
    joiningDate,
    status,
  } = data || {};

  return (
    <EmployeeLayout
      title="My Dashboard"
      subtitle="Overview of your profile information."
    >
      {/* ── Top Info Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "24px",
          marginBottom: "36px",
        }}
      >
        <InfoCard
          title="Department"
          value={department?.name || "N/A"}
          icon={Building2}
          iconBg="#fef9c3"
          iconColor="#ca8a04"
        />
        <InfoCard
          title="Designation"
          value={designation || "N/A"}
          icon={Briefcase}
          iconBg="#dbeafe"
          iconColor="#2563eb"
        />
        <InfoCard
          title="Employment Type"
          value={
            <span style={{ textTransform: "capitalize" }}>
              {employmentType || "N/A"}
            </span>
          }
          icon={FileBadge}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
        />
        <InfoCard
          title="Account Status"
          value={
            <span style={{ textTransform: "capitalize" }}>
              {status || "N/A"}
            </span>
          }
          icon={Activity}
          iconBg={status === "active" ? "#dcfce7" : "#fee2e2"}
          iconColor={status === "active" ? "#16a34a" : "#dc2626"}
        />
      </div>
    </EmployeeLayout>
  );
};

export default EmployeeDashboard;
