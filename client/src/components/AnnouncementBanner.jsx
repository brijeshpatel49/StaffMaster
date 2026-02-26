import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { apiFetch } from "../utils/api";
import { X, Pin, ChevronDown, ChevronUp } from "lucide-react";

const DISMISSED_KEY = "dismissed_announcements";

const getDismissed = () => {
  try {
    return JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]");
  } catch {
    return [];
  }
};

const setDismissed = (list) => {
  localStorage.setItem(DISMISSED_KEY, JSON.stringify(list));
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
  });

const PRIORITY_STYLES = {
  urgent: {
    borderLeft: "3px solid var(--color-negative)",
    badgeBg: "var(--color-negative-bg)",
    badgeColor: "var(--color-negative)",
  },
  important: {
    borderLeft: "3px solid var(--color-accent)",
    badgeBg: "var(--color-accent-bg)",
    badgeColor: "var(--color-accent)",
  },
  normal: {
    borderLeft: "3px solid #22c55e",
    badgeBg: "rgba(34,197,94,0.1)",
    badgeColor: "#22c55e",
  },
};

const AnnouncementBanner = () => {
  const { API } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    const fetchAnnouncements = async () => {
      try {
        const result = await apiFetch(`${API}/announcements/active`);
        if (result?.data?.success) {
          const dismissed = getDismissed();
          const filtered = result.data.data.filter((a) => {
            const entry = dismissed.find((d) => d.id === a._id);
            // Show again if announcement was updated after dismissal
            if (entry && new Date(a.updatedAt) > new Date(entry.updatedAt)) {
              return true;
            }
            return !entry;
          });
          setAnnouncements(filtered);
        }
      } catch {
        // Silently fail — never break dashboard
      } finally {
        setLoading(false);
      }
    };
    fetchAnnouncements();
  }, [API]);

  const handleDismiss = (announcement) => {
    const dismissed = getDismissed();
    const updated = [
      ...dismissed.filter((d) => d.id !== announcement._id),
      { id: announcement._id, updatedAt: announcement.updatedAt },
    ];
    setDismissed(updated);
    setAnnouncements((prev) => prev.filter((a) => a._id !== announcement._id));
  };

  if (loading) {
    // Skeleton loader
    return (
      <div style={{ marginBottom: "20px" }}>
        {[1, 2].map((i) => (
          <div
            key={i}
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "14px",
              padding: "16px 20px",
              marginBottom: "10px",
              animation: "pulse 1.5s infinite",
            }}
          >
            <div
              style={{
                height: "14px",
                width: "30%",
                borderRadius: "6px",
                backgroundColor: "var(--color-border)",
                marginBottom: "10px",
              }}
            />
            <div
              style={{
                height: "10px",
                width: "80%",
                borderRadius: "6px",
                backgroundColor: "var(--color-border)",
              }}
            />
          </div>
        ))}
      </div>
    );
  }

  if (announcements.length === 0) return null;

  const visible = expanded ? announcements : announcements.slice(0, 3);
  const hasMore = announcements.length > 3;

  return (
    <div style={{ marginBottom: "20px" }}>
      {visible.map((a) => {
        const ps = PRIORITY_STYLES[a.priority] || PRIORITY_STYLES.normal;
        return (
          <div
            key={a._id}
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderLeft: ps.borderLeft,
              borderRadius: "14px",
              padding: "14px 18px",
              marginBottom: "10px",
              position: "relative",
            }}
          >
            {/* Dismiss button — always top-right */}
            <button
              onClick={() => handleDismiss(a)}
              style={{
                position: "absolute",
                top: "12px",
                right: "14px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "4px",
                borderRadius: "6px",
                color: "var(--color-text-muted)",
                display: "flex",
                alignItems: "center",
              }}
              title="Dismiss"
            >
              <X size={16} />
            </button>

            {/* Tags row — only when there's something to show */}
            {(a.pinned || a.priority !== "normal") && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "8px",
                  marginBottom: "6px",
                }}
              >
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
                    <Pin size={12} /> PINNED
                  </span>
                )}
                {a.priority !== "normal" && (
                  <span
                    style={{
                      display: "inline-block",
                      fontSize: "10px",
                      fontWeight: 700,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      backgroundColor: ps.badgeBg,
                      color: ps.badgeColor,
                    }}
                  >
                    {a.priority}
                  </span>
                )}
              </div>
            )}

            {/* Title */}
            <p
              style={{
                fontSize: "14px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
                margin: "0 0 4px",
              }}
            >
              {a.title}
            </p>

            {/* Body — truncated 2 lines */}
            <p
              style={{
                fontSize: "13px",
                color: "var(--color-text-secondary)",
                margin: "0 0 8px",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
                overflow: "hidden",
                lineHeight: "1.5",
              }}
            >
              {a.body}
            </p>

            {/* Footer: posted by + expires */}
            <p
              style={{
                fontSize: "11px",
                color: "var(--color-text-muted)",
                margin: 0,
              }}
            >
              Posted by: {a.postedBy?.fullName || "Unknown"} &nbsp;•&nbsp;
              Expires: {formatDate(a.expiresAt)}
            </p>
          </div>
        );
      })}

      {/* Show more / less toggle */}
      {hasMore && (
        <button
          onClick={() => setExpanded(!expanded)}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: "13px",
            fontWeight: 600,
            color: "var(--color-accent)",
            display: "flex",
            alignItems: "center",
            gap: "4px",
            padding: "4px 0",
          }}
        >
          {expanded ? (
            <>
              Show less <ChevronUp size={14} />
            </>
          ) : (
            <>
              Show more ({announcements.length - 3} more) <ChevronDown size={14} />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default AnnouncementBanner;
