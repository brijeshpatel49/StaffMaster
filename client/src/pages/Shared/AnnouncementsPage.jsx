import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../layouts/DashboardLayout";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../utils/api";
import { Loader } from "../../components/Loader";
import { Pin, User, Calendar, Megaphone } from "lucide-react";

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const PRIORITY_BORDER = {
  urgent: "var(--color-negative)",
  important: "var(--color-accent)",
  normal: "#22c55e",
};

const PRIORITY_BADGE = {
  urgent: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  important: { bg: "var(--color-accent-bg)", color: "var(--color-accent)" },
  normal: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
};

const TABS = ["all", "urgent", "important", "normal"];

const AnnouncementsPage = () => {
  const { API } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    const fetch = async () => {
      try {
        const result = await apiFetch(`${API}/announcements/active`);
        if (result?.data?.success) {
          setAnnouncements(result.data.data);
        }
      } catch (err) {
        console.error("Fetch announcements error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetch();
  }, [API]);

  const filtered = useMemo(() => {
    if (activeTab === "all") return announcements;
    return announcements.filter((a) => a.priority === activeTab);
  }, [announcements, activeTab]);

  return (
    <DashboardLayout
      title="Company Announcements"
      subtitle="Stay updated with latest news"
    >
      {/* ── Filter tabs ── */}
      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "24px",
          flexWrap: "wrap",
        }}
      >
        {TABS.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            style={{
              padding: "8px 18px",
              borderRadius: "10px",
              border:
                activeTab === tab
                  ? "none"
                  : "1px solid var(--color-border)",
              backgroundColor:
                activeTab === tab
                  ? "var(--color-accent)"
                  : "var(--color-card)",
              color:
                activeTab === tab ? "#fff" : "var(--color-text-secondary)",
              fontSize: "13px",
              fontWeight: 600,
              cursor: "pointer",
              textTransform: "capitalize",
              transition: "all 0.2s",
            }}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {loading ? (
        <Loader variant="section" />
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "80px 20px",
          }}
        >
          <Megaphone
            size={56}
            style={{
              color: "var(--color-text-muted)",
              marginBottom: "16px",
              opacity: 0.4,
            }}
          />
          <p
            style={{
              fontSize: "18px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              margin: "0 0 6px",
            }}
          >
            No announcements at the moment.
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Check back later! 🎉
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtered.map((a) => {
            const border = PRIORITY_BORDER[a.priority] || PRIORITY_BORDER.normal;
            const badge = PRIORITY_BADGE[a.priority];

            return (
              <div
                key={a._id}
                style={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${border}`,
                  borderRadius: "16px",
                  padding: "22px 24px",
                  transition: "box-shadow 0.2s",
                }}
              >
                {/* Top: badge + pinned */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    marginBottom: "10px",
                  }}
                >
                  {badge && (
                    <span
                      style={{
                        fontSize: "11px",
                        fontWeight: 700,
                        padding: "3px 10px",
                        borderRadius: "6px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        backgroundColor: badge.bg,
                        color: badge.color,
                      }}
                    >
                      {a.priority}
                    </span>
                  )}
                  {a.pinned && (
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "11px",
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                      }}
                    >
                      <Pin size={12} /> Pinned
                    </span>
                  )}
                </div>

                {/* Title */}
                <h3
                  style={{
                    margin: "0 0 10px",
                    fontSize: "17px",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    lineHeight: "1.4",
                  }}
                >
                  {a.title}
                </h3>

                {/* Full body */}
                <p
                  style={{
                    margin: "0 0 16px",
                    fontSize: "14px",
                    lineHeight: "1.7",
                    color: "var(--color-text-secondary)",
                    whiteSpace: "pre-wrap",
                  }}
                >
                  {a.body}
                </p>

                {/* Divider */}
                <div
                  style={{
                    height: "1px",
                    backgroundColor: "var(--color-border-light)",
                    margin: "0 0 12px",
                  }}
                />

                {/* Footer */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "16px",
                    fontSize: "12px",
                    color: "var(--color-text-muted)",
                    flexWrap: "wrap",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <User size={13} /> Posted by{" "}
                    {a.postedBy?.fullName || "Unknown"}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <Calendar size={13} /> Expires {formatDate(a.expiresAt)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
};

export default AnnouncementsPage;
