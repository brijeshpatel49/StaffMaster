import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";
import {
  Plus,
  Edit3,
  Trash2,
  Pin,
  PinOff,
  ToggleLeft,
  ToggleRight,
  X,
  Search,
  Megaphone,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTimeLocal = (d) => {
  const dt = new Date(d);
  const pad = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}T${pad(dt.getHours())}:${pad(dt.getMinutes())}`;
};

const getMinDateTime = () => {
  const d = new Date(Date.now() + 60 * 60 * 1000);
  return formatDateTimeLocal(d);
};

const isExpired = (d) => new Date(d) < new Date();
const isExpiringSoon = (d) =>
  !isExpired(d) && new Date(d) - new Date() < 24 * 60 * 60 * 1000;

const PRIORITY_BADGE = {
  urgent: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  important: { bg: "var(--color-accent-bg)", color: "var(--color-accent)" },
  normal: { bg: "rgba(34,197,94,0.1)", color: "#22c55e" },
};

const ROLE_OPTIONS = ["all", "employee", "manager", "hr", "admin"];

const getStatus = (a) => {
  if (!a.isActive) return "inactive";
  if (isExpired(a.expiresAt)) return "expired";
  return "active";
};

// ── Modal Component ──────────────────────────────────────────────────────────

const AnnouncementModal = ({ announcement, onClose, onSave }) => {
  const isEdit = !!announcement;

  const [form, setForm] = useState({
    title: announcement?.title || "",
    body: announcement?.body || "",
    targetRoles: announcement?.targetRoles || ["all"],
    priority: announcement?.priority || "normal",
    expiresAt: announcement?.expiresAt
      ? formatDateTimeLocal(announcement.expiresAt)
      : "",
    pinned: announcement?.pinned || false,
  });
  const [errors, setErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const validate = () => {
    const e = {};
    if (!form.title || form.title.trim().length < 5)
      e.title = "Title must be at least 5 characters";
    if (form.title.trim().length > 100)
      e.title = "Title must be at most 100 characters";
    if (!form.body || form.body.trim().length < 10)
      e.body = "Body must be at least 10 characters";
    if (!form.expiresAt) e.expiresAt = "Expiry date is required";
    else if (new Date(form.expiresAt) <= new Date())
      e.expiresAt = "Expiry must be in the future";
    if (!form.targetRoles || form.targetRoles.length === 0)
      e.targetRoles = "Select at least one target role";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleRoleToggle = (role) => {
    if (role === "all") {
      // Toggle: if already "all", stay (need at least one); if not, switch to all
      setForm((f) => ({ ...f, targetRoles: ["all"] }));
    } else {
      setForm((f) => {
        // If "all" was selected, uncheck it and start with just this role
        if (f.targetRoles.includes("all")) {
          return { ...f, targetRoles: [role] };
        }
        let roles = [...f.targetRoles];
        if (roles.includes(role)) {
          roles = roles.filter((r) => r !== role);
        } else {
          roles.push(role);
        }
        // If all 4 individual roles selected, switch to "all"
        const individualRoles = ["employee", "manager", "hr", "admin"];
        if (individualRoles.every((r) => roles.includes(r))) {
          return { ...f, targetRoles: ["all"] };
        }
        if (roles.length === 0) roles = ["all"];
        return { ...f, targetRoles: roles };
      });
    }
  };

  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    await onSave({
      ...form,
      title: form.title.trim(),
      body: form.body.trim(),
      expiresAt: new Date(form.expiresAt).toISOString(),
    });
    setSubmitting(false);
  };

  const isAllChecked = form.targetRoles.includes("all");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 50,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "rgba(0,0,0,0.5)",
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--color-surface)",
          borderRadius: "20px",
          padding: "28px",
          width: "100%",
          maxWidth: "560px",
          maxHeight: "90vh",
          overflowY: "auto",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "24px",
          }}
        >
          <h2
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {isEdit ? "Update Announcement" : "New Announcement"}
          </h2>
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

        {/* Title */}
        <div style={{ marginBottom: "16px" }}>
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
            placeholder="Announcement title..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: errors.title
                ? "1px solid var(--color-negative)"
                : "1px solid var(--color-border)",
              backgroundColor: "var(--color-card)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {errors.title && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-negative)",
                margin: "4px 0 0",
              }}
            >
              {errors.title}
            </p>
          )}
        </div>

        {/* Body */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "6px",
            }}
          >
            Body
          </label>
          <textarea
            value={form.body}
            onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
            maxLength={2000}
            rows={5}
            placeholder="Announcement details..."
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: errors.body
                ? "1px solid var(--color-negative)"
                : "1px solid var(--color-border)",
              backgroundColor: "var(--color-card)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              resize: "vertical",
              outline: "none",
              fontFamily: "inherit",
              boxSizing: "border-box",
            }}
          />
          <p
            style={{
              textAlign: "right",
              fontSize: "11px",
              color: "var(--color-text-muted)",
              margin: "4px 0 0",
            }}
          >
            {form.body.length}/2000
          </p>
          {errors.body && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-negative)",
                margin: "4px 0 0",
              }}
            >
              {errors.body}
            </p>
          )}
        </div>

        {/* Target Roles */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "8px",
            }}
          >
            Target Roles
          </label>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {ROLE_OPTIONS.map((role) => {
              const checked =
                role === "all"
                  ? isAllChecked
                  : form.targetRoles.includes(role);
              return (
                <label
                  key={role}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    fontSize: "13px",
                    fontWeight: 500,
                    color: "var(--color-text-primary)",
                    cursor: "pointer",
                    textTransform: "capitalize",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => handleRoleToggle(role)}
                    style={{ accentColor: "var(--color-accent)" }}
                  />
                  {role}
                </label>
              );
            })}
          </div>
          {errors.targetRoles && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-negative)",
                margin: "6px 0 0",
              }}
            >
              {errors.targetRoles}
            </p>
          )}
        </div>

        {/* Priority */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "8px",
            }}
          >
            Priority
          </label>
          <div style={{ display: "flex", gap: "16px" }}>
            {["normal", "important", "urgent"].map((p) => (
              <label
                key={p}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "6px",
                  fontSize: "13px",
                  fontWeight: 500,
                  color: "var(--color-text-primary)",
                  cursor: "pointer",
                  textTransform: "capitalize",
                }}
              >
                <input
                  type="radio"
                  name="priority"
                  checked={form.priority === p}
                  onChange={() => setForm((f) => ({ ...f, priority: p }))}
                  style={{ accentColor: "var(--color-accent)" }}
                />
                {p}
              </label>
            ))}
          </div>
        </div>

        {/* Expiry Date */}
        <div style={{ marginBottom: "16px" }}>
          <label
            style={{
              display: "block",
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
              marginBottom: "6px",
            }}
          >
            Expiry Date & Time
          </label>
          <input
            type="datetime-local"
            value={form.expiresAt}
            min={getMinDateTime()}
            onChange={(e) =>
              setForm((f) => ({ ...f, expiresAt: e.target.value }))
            }
            style={{
              width: "100%",
              padding: "10px 14px",
              borderRadius: "10px",
              border: errors.expiresAt
                ? "1px solid var(--color-negative)"
                : "1px solid var(--color-border)",
              backgroundColor: "var(--color-card)",
              color: "var(--color-text-primary)",
              fontSize: "14px",
              outline: "none",
              boxSizing: "border-box",
            }}
          />
          {errors.expiresAt && (
            <p
              style={{
                fontSize: "12px",
                color: "var(--color-negative)",
                margin: "4px 0 0",
              }}
            >
              {errors.expiresAt}
            </p>
          )}
        </div>

        {/* Pinned Toggle */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            marginBottom: "24px",
          }}
        >
          <label
            style={{
              fontSize: "13px",
              fontWeight: 600,
              color: "var(--color-text-secondary)",
            }}
          >
            Pin this announcement
          </label>
          <button
            type="button"
            onClick={() => setForm((f) => ({ ...f, pinned: !f.pinned }))}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: form.pinned
                ? "var(--color-accent)"
                : "var(--color-text-muted)",
              display: "flex",
              alignItems: "center",
            }}
          >
            {form.pinned ? (
              <ToggleRight size={28} />
            ) : (
              <ToggleLeft size={28} />
            )}
          </button>
        </div>

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitting}
          style={{
            width: "100%",
            padding: "12px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 700,
            cursor: submitting ? "not-allowed" : "pointer",
            opacity: submitting ? 0.7 : 1,
          }}
        >
          {submitting
            ? "Saving..."
            : isEdit
              ? "Update Announcement"
              : "Post Announcement"}
        </button>
      </div>
    </div>
  );
};

// ── Delete Confirm Dialog ────────────────────────────────────────────────────

const DeleteDialog = ({ onConfirm, onCancel }) => (
  <div
    style={{
      position: "fixed",
      inset: 0,
      zIndex: 50,
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: "rgba(0,0,0,0.5)",
    }}
    onClick={onCancel}
  >
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "16px",
        padding: "28px",
        width: "100%",
        maxWidth: "400px",
        border: "1px solid var(--color-border)",
        textAlign: "center",
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <h3
        style={{
          margin: "0 0 8px",
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        Delete Announcement?
      </h3>
      <p
        style={{
          fontSize: "14px",
          color: "var(--color-text-secondary)",
          margin: "0 0 24px",
        }}
      >
        This cannot be undone.
      </p>
      <div style={{ display: "flex", gap: "12px", justifyContent: "center" }}>
        <button
          onClick={onCancel}
          style={{
            padding: "10px 24px",
            borderRadius: "10px",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-card)",
            color: "var(--color-text-primary)",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
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
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

// ── Main Page ────────────────────────────────────────────────────────────────

const HRAnnouncementPage = () => {
  const { API, user } = useAuth();
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Filters
  const [priorityFilter, setPriorityFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  // Modals
  const [showModal, setShowModal] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const fetchAnnouncements = async (p = 1) => {
    try {
      setLoading(true);
      const params = new URLSearchParams({ page: p, limit: 10 });
      if (priorityFilter) params.set("priority", priorityFilter);
      // isActive filter: "active" → true, "inactive" → false, "expired" handled client-side
      if (statusFilter === "active") params.set("isActive", "true");
      else if (statusFilter === "inactive") params.set("isActive", "false");

      const result = await apiFetch(`${API}/announcements?${params}`);
      if (result?.data?.success) {
        setAnnouncements(result.data.data);
        setTotalPages(result.data.totalPages);
        setPage(result.data.currentPage);
      }
    } catch (err) {
      console.error("Fetch announcements error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnnouncements(1);
  }, [priorityFilter, statusFilter]);

  // Client-side filters
  const filtered = useMemo(() => {
    let list = [...announcements];

    // Expired filter (client-side since backend doesn't have this filter)
    if (statusFilter === "expired") {
      list = list.filter((a) => isExpired(a.expiresAt));
    }

    // Search
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter((a) => a.title.toLowerCase().includes(s));
    }

    return list;
  }, [announcements, statusFilter, searchTerm]);

  // Stats
  const stats = useMemo(() => {
    const total = announcements.length;
    const active = announcements.filter(
      (a) => a.isActive && !isExpired(a.expiresAt)
    ).length;
    const expired = announcements.filter((a) => isExpired(a.expiresAt)).length;
    return { total, active, expired };
  }, [announcements]);

  // CRUD handlers
  const handleCreate = async (data) => {
    const result = await apiFetch(`${API}/announcements`, {
      method: "POST",
      body: JSON.stringify(data),
    });
    if (result?.data?.success) {
      setShowModal(false);
      fetchAnnouncements(page);
    }
  };

  const handleUpdate = async (data) => {
    const result = await apiFetch(`${API}/announcements/${editTarget._id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
    if (result?.data?.success) {
      setEditTarget(null);
      setShowModal(false);
      fetchAnnouncements(page);
    }
  };

  const handleDelete = async () => {
    const result = await apiFetch(`${API}/announcements/${deleteTarget._id}`, {
      method: "DELETE",
    });
    if (result?.data?.success) {
      setDeleteTarget(null);
      fetchAnnouncements(page);
    }
  };

  const handleTogglePin = async (a) => {
    const result = await apiFetch(`${API}/announcements/${a._id}/pin`, {
      method: "PATCH",
    });
    if (result?.data?.success) fetchAnnouncements(page);
  };

  const handleToggleActive = async (a) => {
    const result = await apiFetch(`${API}/announcements/${a._id}/toggle`, {
      method: "PATCH",
    });
    if (result?.data?.success) fetchAnnouncements(page);
  };

  const openEdit = (a) => {
    setEditTarget(a);
    setShowModal(true);
  };

  const openCreate = () => {
    setEditTarget(null);
    setShowModal(true);
  };

  return (
    <DashboardLayout
      title="Announcements"
      subtitle="Manage company announcements and notices."
    >
      {/* ── Top bar ── */}
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
        <h2
          style={{
            margin: 0,
            fontSize: "20px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <Megaphone size={22} /> Announcements
        </h2>
        <button
          onClick={openCreate}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            padding: "10px 20px",
            borderRadius: "12px",
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            fontSize: "14px",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          <Plus size={16} /> New Announcement
        </button>
      </div>

      {/* ── Stats strip ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "16px",
          marginBottom: "24px",
        }}
      >
        {[
          {
            label: "Total",
            value: stats.total,
            bg: "var(--color-accent-bg)",
            color: "var(--color-accent)",
          },
          {
            label: "Active",
            value: stats.active,
            bg: "var(--color-positive-bg)",
            color: "var(--color-positive)",
          },
          {
            label: "Expired",
            value: stats.expired,
            bg: "var(--color-negative-bg)",
            color: "var(--color-negative)",
          },
        ].map((s) => (
          <div
            key={s.label}
            style={{
              backgroundColor: "var(--color-card)",
              border: "1px solid var(--color-border)",
              borderRadius: "14px",
              padding: "18px 20px",
            }}
          >
            <p
              style={{
                margin: "0 0 4px",
                fontSize: "12px",
                fontWeight: 600,
                color: "var(--color-text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
              }}
            >
              {s.label}
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "28px",
                fontWeight: 800,
                color: s.color,
              }}
            >
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Filters row ── */}
      <div
        style={{
          display: "flex",
          gap: "12px",
          marginBottom: "20px",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Priority filter */}
        <CustomDropdown
          value={priorityFilter}
          onChange={setPriorityFilter}
          placeholder="All Priorities"
          options={[
            { value: "", label: "All Priorities" },
            { value: "normal", label: "Normal" },
            { value: "important", label: "Important" },
            { value: "urgent", label: "Urgent" },
          ]}
        />

        {/* Status filter */}
        <CustomDropdown
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All Status"
          options={[
            { value: "", label: "All Status" },
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
            { value: "expired", label: "Expired" },
          ]}
        />

        {/* Search */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "8px 14px",
            borderRadius: "10px",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-card)",
            flex: "1",
            minWidth: "200px",
          }}
        >
          <Search size={14} style={{ color: "var(--color-text-muted)" }} />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by title..."
            style={{
              border: "none",
              outline: "none",
              backgroundColor: "transparent",
              color: "var(--color-text-primary)",
              fontSize: "13px",
              width: "100%",
            }}
          />
        </div>
      </div>

      {/* ── Table ── */}
      {loading ? (
        <Loader variant="section" />
      ) : filtered.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "60px 20px",
            color: "var(--color-text-muted)",
          }}
        >
          <Megaphone
            size={48}
            style={{ marginBottom: "12px", opacity: 0.4 }}
          />
          <p style={{ fontSize: "16px", fontWeight: 600 }}>
            No announcements found
          </p>
        </div>
      ) : (
        <div
          style={{
            backgroundColor: "var(--color-card)",
            border: "1px solid var(--color-border)",
            borderRadius: "16px",
            overflow: "hidden",
          }}
        >
          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
                fontSize: "13px",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid var(--color-border)",
                  }}
                >
                  {[
                    "Title",
                    "Scope",
                    "Target",
                    "Priority",
                    "Posted By",
                    "Expires",
                    "Status",
                    "Actions",
                  ].map((h) => (
                    <th
                      key={h}
                      style={{
                        textAlign: "left",
                        padding: "14px 16px",
                        fontWeight: 600,
                        color: "var(--color-text-muted)",
                        fontSize: "12px",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filtered.map((a) => {
                  const status = getStatus(a);
                  const pb = PRIORITY_BADGE[a.priority];
                  return (
                    <tr
                      key={a._id}
                      style={{
                        borderBottom: "1px solid var(--color-border-light)",
                      }}
                    >
                      {/* Title */}
                      <td
                        style={{
                          padding: "12px 16px",
                          fontWeight: 600,
                          color: "var(--color-text-primary)",
                          maxWidth: "220px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.pinned && (
                          <Pin
                            size={12}
                            style={{
                              marginRight: "4px",
                              color: "var(--color-accent)",
                              verticalAlign: "middle",
                            }}
                          />
                        )}
                        {a.title.length > 40
                          ? a.title.slice(0, 40) + "…"
                          : a.title}
                      </td>

                      {/* Scope */}
                      <td style={{ padding: "12px 16px", whiteSpace: "nowrap" }}>
                        {a.departmentId ? (
                          <span
                            style={{
                              fontSize: "11px",
                              fontWeight: 600,
                              padding: "2px 8px",
                              borderRadius: "6px",
                              backgroundColor: "var(--color-accent-bg)",
                              color: "var(--color-accent)",
                            }}
                          >
                            🏬 {a.departmentId.name || "Dept"}
                          </span>
                        ) : (
                          <span
                            style={{
                              fontSize: "11px",
                              color: "var(--color-text-muted)",
                            }}
                          >
                            —
                          </span>
                        )}
                      </td>

                      {/* Target */}
                      <td style={{ padding: "12px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "4px",
                            flexWrap: "wrap",
                          }}
                        >
                          {a.targetRoles.map((r) => (
                            <span
                              key={r}
                              style={{
                                fontSize: "11px",
                                fontWeight: 600,
                                padding: "2px 8px",
                                borderRadius: "6px",
                                backgroundColor: "var(--color-accent-bg)",
                                color: "var(--color-accent)",
                                textTransform: "capitalize",
                              }}
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </td>

                      {/* Priority */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "6px",
                            backgroundColor: pb.bg,
                            color: pb.color,
                            textTransform: "capitalize",
                          }}
                        >
                          {a.priority}
                        </span>
                      </td>

                      {/* Posted By */}
                      <td
                        style={{
                          padding: "12px 16px",
                          color: "var(--color-text-secondary)",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {a.postedBy?.fullName || "Unknown"}
                      </td>

                      {/* Expires */}
                      <td
                        style={{
                          padding: "12px 16px",
                          whiteSpace: "nowrap",
                          color: isExpired(a.expiresAt)
                            ? "var(--color-negative)"
                            : isExpiringSoon(a.expiresAt)
                              ? "var(--color-negative)"
                              : "var(--color-text-secondary)",
                          textDecoration: isExpired(a.expiresAt)
                            ? "line-through"
                            : "none",
                          fontWeight: isExpiringSoon(a.expiresAt) ? 600 : 400,
                        }}
                      >
                        {formatDate(a.expiresAt)}
                      </td>

                      {/* Status */}
                      <td style={{ padding: "12px 16px" }}>
                        <span
                          style={{
                            fontSize: "11px",
                            fontWeight: 700,
                            padding: "3px 10px",
                            borderRadius: "6px",
                            backgroundColor:
                              status === "active"
                                ? "var(--color-positive-bg)"
                                : status === "expired"
                                  ? "var(--color-negative-bg)"
                                  : "var(--color-border-light)",
                            color:
                              status === "active"
                                ? "var(--color-positive)"
                                : status === "expired"
                                  ? "var(--color-negative)"
                                  : "var(--color-text-muted)",
                            textTransform: "capitalize",
                          }}
                        >
                          {status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td style={{ padding: "12px 16px" }}>
                        <div
                          style={{
                            display: "flex",
                            gap: "6px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            onClick={() => openEdit(a)}
                            title="Edit"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-accent)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                          >
                            <Edit3 size={15} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(a)}
                            title="Delete"
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: "var(--color-negative)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                          >
                            <Trash2 size={15} />
                          </button>
                          {user?.role === "admin" && (
                            <button
                              onClick={() => handleTogglePin(a)}
                              title={a.pinned ? "Unpin" : "Pin"}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: a.pinned
                                  ? "var(--color-accent)"
                                  : "var(--color-text-muted)",
                                padding: "4px",
                                borderRadius: "6px",
                              }}
                            >
                              {a.pinned ? (
                                <PinOff size={15} />
                              ) : (
                                <Pin size={15} />
                              )}
                            </button>
                          )}
                          <button
                            onClick={() => handleToggleActive(a)}
                            title={a.isActive ? "Deactivate" : "Activate"}
                            style={{
                              background: "none",
                              border: "none",
                              cursor: "pointer",
                              color: a.isActive
                                ? "var(--color-positive)"
                                : "var(--color-text-muted)",
                              padding: "4px",
                              borderRadius: "6px",
                            }}
                          >
                            {a.isActive ? (
                              <ToggleRight size={17} />
                            ) : (
                              <ToggleLeft size={17} />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                gap: "8px",
                padding: "16px",
                borderTop: "1px solid var(--color-border-light)",
              }}
            >
              <button
                onClick={() => fetchAnnouncements(page - 1)}
                disabled={page <= 1}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-card)",
                  color: "var(--color-text-primary)",
                  fontSize: "13px",
                  cursor: page <= 1 ? "not-allowed" : "pointer",
                  opacity: page <= 1 ? 0.5 : 1,
                }}
              >
                Previous
              </button>
              <span
                style={{
                  fontSize: "13px",
                  color: "var(--color-text-secondary)",
                }}
              >
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => fetchAnnouncements(page + 1)}
                disabled={page >= totalPages}
                style={{
                  padding: "6px 14px",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-card)",
                  color: "var(--color-text-primary)",
                  fontSize: "13px",
                  cursor: page >= totalPages ? "not-allowed" : "pointer",
                  opacity: page >= totalPages ? 0.5 : 1,
                }}
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {showModal && (
        <AnnouncementModal
          announcement={editTarget}
          onClose={() => {
            setShowModal(false);
            setEditTarget(null);
          }}
          onSave={editTarget ? handleUpdate : handleCreate}
        />
      )}
      {deleteTarget && (
        <DeleteDialog
          onConfirm={handleDelete}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </DashboardLayout>
  );
};

export default HRAnnouncementPage;
