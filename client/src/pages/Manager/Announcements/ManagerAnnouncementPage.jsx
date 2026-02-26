import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import {
  Pin,
  User,
  Calendar,
  Megaphone,
  Plus,
  X,
  Pencil,
  Trash2,
} from "lucide-react";

/* ── Helpers ── */
const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const isExpired = (d) => new Date(d) < new Date();

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

/* ── Create / Edit Modal ── */
const AnnouncementModal = ({ open, onClose, onSaved, API, editing }) => {
  const [form, setForm] = useState({
    title: "",
    body: "",
    priority: "normal",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (editing) {
      setForm({
        title: editing.title,
        body: editing.body,
        priority: editing.priority,
        expiresAt: editing.expiresAt?.slice(0, 16) || "",
      });
    } else {
      setForm({ title: "", body: "", priority: "normal", expiresAt: "" });
    }
    setError("");
  }, [editing, open]);

  const handleSubmit = async () => {
    if (!form.title || !form.body || !form.expiresAt) {
      setError("Title, body, and expiry date are required");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const url = editing
        ? `${API}/announcements/${editing._id}`
        : `${API}/announcements`;
      const method = editing ? "PUT" : "POST";

      const result = await apiFetch(url, {
        method,
        body: JSON.stringify({
          title: form.title,
          body: form.body,
          priority: form.priority,
          expiresAt: form.expiresAt,
        }),
      });

      if (result?.data?.success) {
        onSaved();
        onClose();
      } else {
        setError(result?.data?.message || "Something went wrong");
      }
    } catch {
      setError("Failed to save announcement");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
        padding: "16px",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "520px",
          border: "1px solid var(--color-border)",
          overflow: "hidden",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "20px 24px",
            borderBottom: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: "18px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {editing ? "Edit Announcement" : "New Department Announcement"}
          </h3>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--color-text-muted)",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && (
            <div
              style={{
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "var(--color-negative-bg)",
                color: "var(--color-negative)",
                fontSize: "13px",
                fontWeight: 600,
              }}
            >
              {error}
            </div>
          )}

          {/* Title */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "6px",
              }}
            >
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              maxLength={100}
              placeholder="Announcement title"
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-primary)",
                fontSize: "14px",
                outline: "none",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Body */}
          <div>
            <label
              style={{
                display: "block",
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "6px",
              }}
            >
              Message
            </label>
            <textarea
              value={form.body}
              onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
              maxLength={2000}
              rows={4}
              placeholder="Write announcement details..."
              style={{
                width: "100%",
                padding: "10px 14px",
                borderRadius: "10px",
                border: "1px solid var(--color-border)",
                backgroundColor: "var(--color-surface)",
                color: "var(--color-text-primary)",
                fontSize: "14px",
                outline: "none",
                resize: "vertical",
                boxSizing: "border-box",
              }}
            />
          </div>

          {/* Priority & Expiry row */}
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Priority
              </label>
              <div style={{ display: "flex", gap: "6px" }}>
                {["normal", "important", "urgent"].map((p) => {
                  const pb = PRIORITY_BADGE[p];
                  const isActive = form.priority === p;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setForm((f) => ({ ...f, priority: p }))}
                      style={{
                        padding: "6px 12px",
                        borderRadius: "8px",
                        border: isActive
                          ? `2px solid ${pb.color}`
                          : "1px solid var(--color-border)",
                        backgroundColor: isActive ? pb.bg : "transparent",
                        color: isActive ? pb.color : "var(--color-text-muted)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>
            <div style={{ width: "220px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: "13px",
                  fontWeight: 600,
                  color: "var(--color-text-secondary)",
                  marginBottom: "6px",
                }}
              >
                Expires
              </label>
              <input
                type="datetime-local"
                value={form.expiresAt}
                onChange={(e) =>
                  setForm((f) => ({ ...f, expiresAt: e.target.value }))
                }
                style={{
                  width: "100%",
                  padding: "8px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  fontSize: "13px",
                  outline: "none",
                  boxSizing: "border-box",
                }}
              />
            </div>
          </div>

          {/* Info */}
          <p
            style={{
              margin: 0,
              fontSize: "12px",
              color: "var(--color-text-muted)",
              fontStyle: "italic",
            }}
          >
            This announcement will be visible to employees and managers in your
            department only.
          </p>

          {/* Submit */}
          <button
            onClick={handleSubmit}
            disabled={saving}
            style={{
              width: "100%",
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "#FCD34D",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              fontWeight: 700,
              cursor: saving ? "not-allowed" : "pointer",
              opacity: saving ? 0.7 : 1,
            }}
          >
            {saving
              ? "Saving..."
              : editing
                ? "Update Announcement"
                : "Post Announcement"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Delete Confirmation Dialog ── */
const DeleteDialog = ({ open, onClose, onConfirm, title }) => {
  if (!open) return null;
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 60,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.3)",
        backdropFilter: "blur(4px)",
      }}
    >
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "16px",
          padding: "28px",
          maxWidth: "400px",
          width: "100%",
          border: "1px solid var(--color-border)",
          textAlign: "center",
        }}
      >
        <p
          style={{
            fontSize: "16px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            marginBottom: "8px",
          }}
        >
          Delete Announcement?
        </p>
        <p
          style={{
            fontSize: "13px",
            color: "var(--color-text-muted)",
            marginBottom: "20px",
          }}
        >
          "{title}" — this action cannot be undone.
        </p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button
            onClick={onClose}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "1px solid var(--color-border)",
              backgroundColor: "var(--color-surface)",
              color: "var(--color-text-secondary)",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: "10px 24px",
              borderRadius: "10px",
              border: "none",
              backgroundColor: "var(--color-negative)",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "13px",
            }}
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const ManagerAnnouncementPage = () => {
  const { API, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("all");

  // Modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAnnouncements = async () => {
    try {
      const result = await apiFetch(`${API}/announcements`);
      if (result?.data?.success) {
        setAnnouncements(result.data.data);
      }
    } catch (err) {
      console.error("Fetch announcements error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, [API]);

  const filtered = useMemo(() => {
    let list = announcements;
    if (activeTab === "active")
      list = list.filter((a) => a.isActive && !isExpired(a.expiresAt));
    if (activeTab === "expired")
      list = list.filter((a) => isExpired(a.expiresAt));
    return list;
  }, [announcements, activeTab]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await apiFetch(`${API}/announcements/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (result?.data?.success) {
        fetchAnnouncements();
      }
    } catch {
      // silent
    }
    setDeleteTarget(null);
  };

  const TABS = [
    { key: "all", label: "All" },
    { key: "active", label: "Active" },
    { key: "expired", label: "Expired" },
  ];

  return (
    <DashboardLayout
      title="Department Announcements"
      subtitle="Create and manage announcements for your team"
    >
      {/* Top bar: tabs + create button */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "24px",
          flexWrap: "wrap",
          gap: "12px",
        }}
      >
        <div style={{ display: "flex", gap: "8px" }}>
          {TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                padding: "8px 18px",
                borderRadius: "10px",
                border:
                  activeTab === tab.key
                    ? "none"
                    : "1px solid var(--color-border)",
                backgroundColor:
                  activeTab === tab.key
                    ? "var(--color-accent)"
                    : "var(--color-card)",
                color:
                  activeTab === tab.key
                    ? "#fff"
                    : "var(--color-text-secondary)",
                fontSize: "13px",
                fontWeight: 600,
                cursor: "pointer",
                transition: "all 0.2s",
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={() => {
            setEditing(null);
            setModalOpen(true);
          }}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "#FCD34D",
            color: "var(--color-text-primary)",
            fontSize: "13px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* Content */}
      {loading ? (
        <Loader variant="section" />
      ) : filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
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
            No announcements yet.
          </p>
          <p
            style={{
              fontSize: "14px",
              color: "var(--color-text-muted)",
              margin: 0,
            }}
          >
            Create an announcement for your team!
          </p>
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {filtered.map((a) => {
            const border =
              PRIORITY_BORDER[a.priority] || PRIORITY_BORDER.normal;
            const badge = PRIORITY_BADGE[a.priority];
            const expired = isExpired(a.expiresAt);
            const isOwner =
              a.postedBy?._id === user?.id ||
              a.postedBy === user?.id;

            return (
              <div
                key={a._id}
                style={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderLeft: `3px solid ${border}`,
                  borderRadius: "16px",
                  padding: "22px 24px",
                  opacity: expired ? 0.6 : 1,
                  position: "relative",
                }}
              >
                {/* Actions — top right */}
                {isOwner && (
                  <div
                    style={{
                      position: "absolute",
                      top: "14px",
                      right: "16px",
                      display: "flex",
                      gap: "6px",
                    }}
                  >
                    <button
                      onClick={() => {
                        setEditing(a);
                        setModalOpen(true);
                      }}
                      title="Edit"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        color: "var(--color-text-muted)",
                        borderRadius: "6px",
                      }}
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteTarget(a)}
                      title="Delete"
                      style={{
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        padding: "4px",
                        color: "var(--color-negative)",
                        borderRadius: "6px",
                      }}
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                )}

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
                  {expired && (
                    <span
                      style={{
                        fontSize: "10px",
                        fontWeight: 700,
                        padding: "2px 8px",
                        borderRadius: "6px",
                        backgroundColor: "var(--color-negative-bg)",
                        color: "var(--color-negative)",
                        textTransform: "uppercase",
                      }}
                    >
                      Expired
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
                    paddingRight: isOwner ? "70px" : 0,
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
                      gap: "4px",
                      fontSize: "11px",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "6px",
                      backgroundColor: "var(--color-accent-bg)",
                      color: "var(--color-accent)",
                    }}
                  >
                    🏬{" "}
                    {a.departmentId?.name || "Department"}
                  </span>
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: "5px",
                    }}
                  >
                    <User size={13} /> {a.postedBy?.fullName || "Unknown"}
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

      {/* Modals */}
      <AnnouncementModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditing(null);
        }}
        onSaved={fetchAnnouncements}
        API={API}
        editing={editing}
      />

      <DeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title={deleteTarget?.title || ""}
      />
    </DashboardLayout>
  );
};

export default ManagerAnnouncementPage;
