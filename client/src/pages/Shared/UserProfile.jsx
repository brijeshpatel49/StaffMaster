import { useState, useEffect } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../utils/api";
import { User, Mail, Calendar, ShieldCheck } from "lucide-react";

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const UserProfile = () => {
  const { API, user } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // If user acts as HR/Admin, we might get different profile data
    // Usually they just have User collection data (no employee profile)
    // But for "employee" or "manager" proper profile exists

    const fetchProfile = async () => {
      try {
        const endpoint = `${API}/auth/profile`;
        const result = await apiFetch(endpoint);

        if (result?.data?.success) {
          setProfileData(result.data.data);
        } else {
          setError(result?.data?.message || "Failed to load profile data");
        }
      } catch (err) {
        setError("Error fetching profile details");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [API, user]);

  if (loading) {
    return (
      <DashboardLayout
        title="My Profile"
        subtitle="Managing your account details"
      >
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "100px 0",
          }}
        >
          <div
            style={{
              width: "48px",
              height: "48px",
              border: "4px solid #e0e7ff",
              borderTop: "4px solid #4f46e5",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title="My Profile"
      subtitle="Managing your account details"
    >
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "24px",
          padding: "48px 32px",
          border: "1px solid var(--color-border)",
          
          maxWidth: "700px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            textAlign: "center",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              width: "120px",
              height: "120px",
              borderRadius: "50%",
              background: "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              marginBottom: "20px",
              
              border: "4px solid var(--color-page-bg)",
            }}
          >
            <span
              style={{
                fontSize: "40px",
                fontWeight: 700,
                color: "#4338ca",
                textTransform: "uppercase",
              }}
            >
              {profileData?.fullName?.charAt(0) || "U"}
            </span>
          </div>

          <h2
            style={{
              fontSize: "28px",
              fontWeight: 800,
              color: "var(--color-text-primary)",
              margin: "0 0 8px 0",
            }}
          >
            {profileData?.fullName}
          </h2>
          <span
            style={{
              display: "inline-block",
              padding: "6px 16px",
              backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-light)",
              color: "var(--color-text-primary)",
              borderRadius: "99px",
              fontSize: "13px",
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.5px",
            }}
          >
            {profileData?.designation || user?.role || "Member"}
          </span>
        </div>

        <div style={{ display: "grid", gap: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "20px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#e0e7ff",
                color: "#4f46e5",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Mail size={22} />
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                }}
              >
                Email Address
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                }}
              >
                {profileData?.email}
              </p>
            </div>
          </div>

          {(profileData?.role === "employee" ||
            profileData?.role === "manager") &&
            profileData?.joiningDate && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "16px",
                  padding: "20px",
                  backgroundColor: "var(--color-surface)",
                  borderRadius: "16px",
                }}
              >
                <div
                  style={{
                    width: "48px",
                    height: "48px",
                    borderRadius: "12px",
                    background: "#dcfce7",
                    color: "#16a34a",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Calendar size={22} />
                </div>
                <div>
                  <p
                    style={{
                      margin: "0 0 4px 0",
                      fontSize: "13px",
                      fontWeight: 600,
                      color: "var(--color-text-muted)",
                      textTransform: "uppercase",
                    }}
                  >
                    Joining Date
                  </p>
                  <p
                    style={{
                      margin: 0,
                      fontSize: "16px",
                      fontWeight: 600,
                      color: "var(--color-text-primary)",
                    }}
                  >
                    {formatDate(profileData?.joiningDate)}
                  </p>
                </div>
              </div>
            )}

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "16px",
              padding: "20px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "16px",
            }}
          >
            <div
              style={{
                width: "48px",
                height: "48px",
                borderRadius: "12px",
                background: "#fef9c3",
                color: "#ca8a04",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <ShieldCheck size={22} />
            </div>
            <div>
              <p
                style={{
                  margin: "0 0 4px 0",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-muted)",
                  textTransform: "uppercase",
                }}
              >
                System Role
              </p>
              <p
                style={{
                  margin: 0,
                  fontSize: "16px",
                  fontWeight: 600,
                  color: "var(--color-text-primary)",
                  textTransform: "capitalize",
                }}
              >
                {user?.role}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default UserProfile;
