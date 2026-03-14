import { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const getIcon = (type) => {
  switch (type) {
    case "leave_approved": return "✅";
    case "leave_rejected": return "❌";
    case "leave_request": return "📋";
    case "task_assigned": return "📌";
    case "task_completed": return "✅";
    case "performance_reviewed": return "📊";
    case "payroll_approved": return "📄";
    case "payroll_paid": return "💰";
    case "announcement_posted": return "📢";
    default: return "🔔";
  }
};

const getLink = (type, role) => {
  const p = `/${role}`;
  switch (type) {
    case "leave_approved":
    case "leave_rejected": return `${p}/leave`;
    case "leave_request": return `${p}/leave`;
    case "task_assigned": 
    case "task_completed": return `${p}/tasks`;
    case "performance_reviewed": return `${p}/performance`;
    case "payroll_approved":
    case "payroll_paid": return `${p}/payroll`;
    case "announcement_posted": return `${p}/announcements`;
    default: return `${p}/dashboard`;
  }
};

const timeAgo = (date) => {
  const diff = Date.now() - new Date(date).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  return `${days}d ago`;
};

const NotificationBell = ({ notifications, unreadCount, markAsRead, markAllAsRead }) => {
  const [open, setOpen] = useState(false);
  const [bellPulse, setBellPulse] = useState(false);
  const navigate = useNavigate();
  const { user } = useAuth();
  const bellRef = useRef(null);
  const panelRef = useRef(null);

  useEffect(() => {
    if (unreadCount > 0) {
      setBellPulse(true);
      const t = setTimeout(() => setBellPulse(false), 600);
      return () => clearTimeout(t);
    }
  }, [unreadCount]);

  // Handle click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        bellRef.current &&
        !bellRef.current.contains(event.target) &&
        panelRef.current &&
        !panelRef.current.contains(event.target)
      ) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const handleClick = (notification) => {
    if (!notification.isRead) {
      markAsRead(notification._id);
    }
    const link = getLink(notification.type, user.role);
    navigate(link);
    setOpen(false);
  };

  return (
    <div style={{ position: "relative", display: "inline-flex" }}>
      <style>
        {`
          @keyframes nb-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(245,158,11,0.4); }
            70%  { box-shadow: 0 0 0 8px rgba(245,158,11,0); }
            100% { box-shadow: 0 0 0 0 rgba(245,158,11,0); }
          }
          .nb-pulse {
            animation: nb-pulse 0.6s ease-out;
          }
        `}
      </style>
      <button
        ref={bellRef}
        className={bellPulse ? "nb-pulse" : ""}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: 44,
          height: 44,
          borderRadius: 12,
          backgroundColor: open ? "var(--color-border-light)" : "var(--color-card)",
          border: "1px solid var(--color-border)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          color: unreadCount > 0 ? "var(--color-accent)" : "var(--color-text-muted)",
          position: "relative",
          transition: "background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease",
          boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
        }}
        onMouseEnter={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = "var(--color-border-light)";
            e.currentTarget.style.borderColor = "var(--color-accent-border)";
            e.currentTarget.style.boxShadow = "0 4px 12px rgba(0,0,0,0.12)";
          }
        }}
        onMouseLeave={(e) => {
          if (!open) {
            e.currentTarget.style.backgroundColor = "var(--color-card)";
            e.currentTarget.style.borderColor = "var(--color-border)";
            e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.08)";
          }
        }}
      >
        <Bell size={22} strokeWidth={1.75} />

        {unreadCount > 0 && (
          <span
            style={{
              position: "absolute",
              top: -2,
              right: -2,
              backgroundColor: "#ef4444",
              color: "#fff",
              borderRadius: "999px",
              fontSize: "10px",
              fontWeight: 800,
              minWidth: "18px",
              height: "18px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              padding: "0 5px",
              border: "2px solid var(--color-page-bg)",
              boxShadow: "0 1px 4px rgba(239,68,68,0.4)",
            }}
          >
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            ref={panelRef}
            style={{
              position: "absolute",
              top: "calc(100% + 12px)",
              right: 0,
              width: 380,
              maxHeight: 480,
              overflowY: "auto",
              backgroundColor: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
              zIndex: 9999,
              scrollbarWidth: "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "14px 16px",
                borderBottom: "1px solid var(--color-border)",
                position: "sticky",
                top: 0,
                backgroundColor: "var(--color-surface)",
                zIndex: 1,
              }}
            >
              <span
                style={{
                  fontWeight: 700,
                  fontSize: 15,
                  color: "var(--color-text-primary)",
                }}
              >
                Notifications
                {unreadCount > 0 && (
                  <span
                    style={{
                      marginLeft: 8,
                      backgroundColor: "var(--color-accent-bg)",
                      color: "var(--color-accent)",
                      borderRadius: 999,
                      fontSize: 11,
                      fontWeight: 700,
                      padding: "2px 8px",
                    }}
                  >
                    {unreadCount}
                  </span>
                )}
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    fontSize: 12,
                    color: "var(--color-accent)",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    fontWeight: 600,
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {notifications.length === 0 ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                }}
              >
                <div style={{ fontSize: 32, marginBottom: 8 }}>🔔</div>
                <div style={{ fontWeight: 600, fontSize: 14 }}>
                  All caught up!
                </div>
                <div style={{ fontSize: 13, marginTop: 4 }}>
                  No new notifications
                </div>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n._id}
                  onClick={() => handleClick(n)}
                  style={{
                    padding: "12px 16px",
                    borderBottom: "1px solid var(--color-border-light)",
                    cursor: "pointer",
                    display: "flex",
                    gap: 12,
                    alignItems: "flex-start",
                    backgroundColor: "var(--color-accent-bg)",
                    borderLeft: "3px solid var(--color-accent)",
                    transition: "background-color 0.15s ease",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-border-light)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-accent-bg)";
                  }}
                >
                  <span style={{ fontSize: 20, flexShrink: 0 }}>
                    {getIcon(n.type)}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 600,
                        fontSize: 13,
                        color: "var(--color-text-primary)",
                        marginBottom: 3,
                      }}
                    >
                      {n.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--color-text-secondary)",
                        lineHeight: 1.5,
                        overflow: "hidden",
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                      }}
                    >
                      {n.message}
                    </div>
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--color-text-muted)",
                        marginTop: 4,
                      }}
                    >
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default NotificationBell;
