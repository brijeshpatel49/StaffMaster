import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";
import {
  AlertCircle,
  Clock,
  CheckCircle2,
  ListTodo,
  ChevronDown,
  Send,
  X,
  User,
  Calendar,
  Timer,
  Tag,
  MessageSquare,
} from "lucide-react";

/* ── Constants ── */
const STATUS_LABELS = {
  todo: "Todo",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

const PRIORITY_BADGE = {
  urgent: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
  high: { bg: "var(--color-accent-bg)", color: "var(--color-accent)" },
  medium: { bg: "var(--color-border)", color: "var(--color-text-secondary)" },
  low: { bg: "var(--color-surface)", color: "var(--color-text-muted)" },
};

const STATUS_BADGE = {
  todo: { bg: "var(--color-border)", color: "var(--color-text-secondary)" },
  in_progress: { bg: "var(--color-accent-bg)", color: "var(--color-accent)" },
  completed: { bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
  cancelled: { bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
};

// Employee allowed transitions (subset)
const EMPLOYEE_TRANSITIONS = {
  todo: ["in_progress"],
  in_progress: ["completed", "todo"],
  completed: [],
  cancelled: [],
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const isOverdue = (task) =>
  ["todo", "in_progress"].includes(task.status) && new Date(task.deadline) < new Date();

/* ── Summary Card ── */
const SummaryCard = ({ label, value, icon: Icon, iconBg, iconColor }) => (
  <div
    style={{
      backgroundColor: "var(--color-card)",
      borderRadius: "16px",
      padding: "20px",
      border: "1px solid var(--color-border)",
      display: "flex",
      alignItems: "center",
      gap: "14px",
    }}
  >
    <div
      style={{
        width: "44px",
        height: "44px",
        borderRadius: "12px",
        backgroundColor: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={22} color={iconColor} />
    </div>
    <div>
      <p style={{ fontSize: "12px", color: "var(--color-text-muted)", fontWeight: 600, margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{label}</p>
      <p style={{ fontSize: "26px", fontWeight: 800, color: "var(--color-text-primary)", margin: 0 }}>{value}</p>
    </div>
  </div>
);

/* ── Task Detail Modal ── */
const TaskDetailModal = ({ task, onClose }) => {
  if (!task) return null;
  const updates = [...(task.updates || [])].sort(
    (a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)
  );
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
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "20px",
          width: "100%",
          maxWidth: "600px",
          maxHeight: "80vh",
          overflow: "auto",
          border: "1px solid var(--color-border)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 0", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: PRIORITY_BADGE[task.priority]?.bg, color: PRIORITY_BADGE[task.priority]?.color }}>{task.priority}</span>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: STATUS_BADGE[task.status]?.bg, color: STATUS_BADGE[task.status]?.color }}>{STATUS_LABELS[task.status]}</span>
              {isOverdue(task) && (
                <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>OVERDUE</span>
              )}
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>{task.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px", flexShrink: 0 }}><X size={20} /></button>
        </div>

        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {task.description && (
            <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>{task.description}</p>
          )}

          {/* Meta grid */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><User size={13} /> Assigned By</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{task.assignedBy?.fullName || "Unknown"}</span>
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><Calendar size={13} /> Deadline</span>
              <span style={{ fontWeight: 600, color: isOverdue(task) ? "var(--color-negative)" : "var(--color-text-primary)" }}>{formatDate(task.deadline)}</span>
            </div>
            {task.estimatedHours && (
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><Timer size={13} /> Estimated</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{task.estimatedHours} hrs</span>
              </div>
            )}
            {task.actualHours !== null && task.actualHours !== undefined && (
              <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><Timer size={13} /> Actual</span>
                <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{task.actualHours} hrs</span>
              </div>
            )}
          </div>

          {task.tags && task.tags.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {task.tags.map((tag, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
                  <Tag size={11} /> {tag}
                </span>
              ))}
            </div>
          )}

          {task.cancelReason && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", backgroundColor: "var(--color-negative-bg)", fontSize: "13px" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--color-negative)" }}>Cancellation Reason</p>
              <p style={{ margin: 0, color: "var(--color-negative)" }}>{task.cancelReason}</p>
            </div>
          )}

          {/* Activity Log */}
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}>
              <MessageSquare size={15} /> Activity Log ({updates.length})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto" }}>
              {updates.map((u, i) => (
                <div key={i} style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{u.updatedBy?.fullName || "System"}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{formatDateTime(u.updatedAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>{u.message}</p>
                  {u.statusChange && (
                    <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-accent)", marginTop: "4px", display: "inline-block" }}>{u.statusChange}</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Status Change Dialog ── */
const StatusChangeDialog = ({ open, onClose, onConfirm, newStatus, saving }) => {
  const [hours, setHours] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    setHours("");
    setError("");
  }, [open, newStatus]);

  if (!open) return null;

  const handleConfirm = () => {
    if (newStatus === "completed") {
      const h = parseFloat(hours);
      if (!hours || isNaN(h) || h < 0) {
        setError("Please enter valid hours (0 or more)");
        return;
      }
      onConfirm(h);
    } else {
      onConfirm();
    }
  };

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
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", padding: "28px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-border)", textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>
          Change status to "{STATUS_LABELS[newStatus]}"?
        </p>

        {newStatus === "completed" && (
          <div style={{ margin: "16px 0", textAlign: "left" }}>
            <label style={{ fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", display: "block", marginBottom: "6px" }}>
              Actual Hours Spent *
            </label>
            <input
              type="number"
              min="0"
              step="0.5"
              value={hours}
              onChange={(e) => { setHours(e.target.value); setError(""); }}
              placeholder="e.g. 4.5"
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
            {error && <p style={{ color: "var(--color-negative)", fontSize: "12px", margin: "6px 0 0" }}>{error}</p>}
          </div>
        )}

        <div style={{ display: "flex", gap: "10px", justifyContent: "center", marginTop: "20px" }}>
          <button
            onClick={onClose}
            disabled={saving}
            style={{ padding: "10px 24px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            style={{ padding: "10px 24px", borderRadius: "10px", border: "none", backgroundColor: "var(--color-accent)", color: "#fff", fontWeight: 600, cursor: saving ? "not-allowed" : "pointer", fontSize: "13px", opacity: saving ? 0.6 : 1 }}
          >
            {saving ? "Updating..." : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const EmployeeTasks = () => {
  const { API } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0 });
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [page, setPage] = useState(1);

  // UI state
  const [detailTask, setDetailTask] = useState(null);
  const [statusChangeTarget, setStatusChangeTarget] = useState(null);
  const [statusChangeTo, setStatusChangeTo] = useState("");
  const [saving, setSaving] = useState(false);
  const [expandedUpdate, setExpandedUpdate] = useState(null);
  const [updateText, setUpdateText] = useState("");
  const [addingUpdate, setAddingUpdate] = useState(false);

  const fetchTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      params.set("sortBy", sortBy);
      params.set("page", page);
      params.set("limit", "10");
      const result = await apiFetch(`${API}/tasks/my?${params}`);
      if (result?.data?.success) {
        setTasks(result.data.data.tasks);
        setSummary(result.data.data.summary);
        setPagination(result.data.data.pagination);
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [API, statusFilter, priorityFilter, sortBy, page]);

  useEffect(() => {
    setLoading(true);
    fetchTasks();
  }, [fetchTasks]);

  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [statusFilter, priorityFilter, sortBy]);

  const handleStatusChange = async (actualHours) => {
    if (!statusChangeTarget || !statusChangeTo) return;
    setSaving(true);
    try {
      const body = { status: statusChangeTo };
      if (statusChangeTo === "completed") body.actualHours = actualHours;
      if (statusChangeTo === "todo") body.message = "Moved back to todo";
      const result = await apiFetch(`${API}/tasks/${statusChangeTarget._id}/status`, {
        method: "PATCH",
        body: JSON.stringify(body),
      });
      if (result?.data?.success) {
        fetchTasks();
      }
    } catch {
      // silent
    } finally {
      setSaving(false);
      setStatusChangeTarget(null);
      setStatusChangeTo("");
    }
  };

  const handleAddUpdate = async (taskId) => {
    if (!updateText.trim() || updateText.trim().length < 3) return;
    setAddingUpdate(true);
    try {
      const result = await apiFetch(`${API}/tasks/${taskId}/updates`, {
        method: "POST",
        body: JSON.stringify({ message: updateText.trim() }),
      });
      if (result?.data?.success) {
        setUpdateText("");
        setExpandedUpdate(null);
        fetchTasks();
      }
    } catch {
      // silent
    } finally {
      setAddingUpdate(false);
    }
  };

  const fetchTaskDetail = async (taskId) => {
    try {
      const result = await apiFetch(`${API}/tasks/${taskId}`);
      if (result?.data?.success) {
        setDetailTask(result.data.data);
      }
    } catch {
      // silent
    }
  };

  const STATUS_TABS = [
    { key: "", label: "All" },
    { key: "todo", label: "Todo" },
    { key: "in_progress", label: "In Progress" },
    { key: "completed", label: "Completed" },
    { key: "cancelled", label: "Cancelled" },
  ];

  return (
    <DashboardLayout title="My Tasks" subtitle="Track and manage your assigned tasks">
      {/* Summary Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <SummaryCard label="Todo" value={summary.todo} icon={ListTodo} iconBg="var(--color-border)" iconColor="var(--color-text-secondary)" />
        <SummaryCard label="In Progress" value={summary.in_progress} icon={Clock} iconBg="var(--color-accent-bg)" iconColor="var(--color-accent)" />
        <SummaryCard label="Completed" value={summary.completed} icon={CheckCircle2} iconBg="var(--color-positive-bg)" iconColor="var(--color-positive)" />
        <SummaryCard label="Overdue" value={summary.overdue} icon={AlertCircle} iconBg="var(--color-negative-bg)" iconColor="var(--color-negative)" />
      </div>

      {/* Filter Bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "24px" }}>
        {/* Status Tabs */}
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {STATUS_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStatusFilter(tab.key)}
              style={{
                padding: "8px 16px",
                borderRadius: "10px",
                border: statusFilter === tab.key ? "none" : "1px solid var(--color-border)",
                backgroundColor: statusFilter === tab.key ? "var(--color-accent)" : "var(--color-card)",
                color: statusFilter === tab.key ? "#fff" : "var(--color-text-secondary)",
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

        {/* Priority filter + Sort */}
        <div style={{ display: "flex", gap: "10px" }}>
          <CustomDropdown
            value={priorityFilter}
            onChange={setPriorityFilter}
            placeholder="All Priorities"
            options={[
              { value: "", label: "All Priorities" },
              { value: "urgent", label: "Urgent" },
              { value: "high", label: "High" },
              { value: "medium", label: "Medium" },
              { value: "low", label: "Low" },
            ]}
          />
          <CustomDropdown
            value={sortBy}
            onChange={setSortBy}
            options={[
              { value: "deadline", label: "Sort: Deadline" },
              { value: "createdAt", label: "Sort: Created" },
              { value: "priority", label: "Sort: Priority" },
            ]}
          />
        </div>
      </div>

      {/* Task Cards */}
      {loading ? (
        <Loader variant="section" />
      ) : tasks.length === 0 ? (
        <div style={{ textAlign: "center", padding: "80px 20px" }}>
          <ListTodo size={56} style={{ color: "var(--color-text-muted)", marginBottom: "16px", opacity: 0.4 }} />
          <p style={{ fontSize: "18px", fontWeight: 600, color: "var(--color-text-secondary)", margin: "0 0 6px" }}>
            {statusFilter ? `No ${STATUS_LABELS[statusFilter] || statusFilter} tasks found.` : "No tasks assigned yet."}
          </p>
          {!statusFilter && (
            <p style={{ fontSize: "14px", color: "var(--color-text-muted)", margin: 0 }}>Check back later! 💪</p>
          )}
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {tasks.map((task) => {
            const overdue = isOverdue(task);
            const pBadge = PRIORITY_BADGE[task.priority];
            const sBadge = STATUS_BADGE[task.status];
            const nextStatuses = EMPLOYEE_TRANSITIONS[task.status] || [];
            const lastUpdates = [...(task.updates || [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)).slice(0, 2);

            return (
              <div
                key={task._id}
                style={{
                  backgroundColor: "var(--color-card)",
                  border: "1px solid var(--color-border)",
                  borderLeft: overdue ? "3px solid var(--color-negative)" : "3px solid " + (PRIORITY_BADGE[task.priority]?.color || "var(--color-border)"),
                  borderRadius: "16px",
                  padding: "22px 24px",
                }}
              >
                {/* Top row: badges + deadline */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "10px", flexWrap: "wrap", gap: "8px" }}>
                  <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                    <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", letterSpacing: "0.5px", backgroundColor: pBadge.bg, color: pBadge.color }}>{task.priority}</span>
                    {overdue && (
                      <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)", display: "flex", alignItems: "center", gap: "4px" }}>
                        <AlertCircle size={11} /> OVERDUE
                      </span>
                    )}
                  </div>
                  <span style={{ fontSize: "12px", color: overdue ? "var(--color-negative)" : "var(--color-text-muted)", fontWeight: 600, display: "flex", alignItems: "center", gap: "4px" }}>
                    <Calendar size={13} /> Due: {formatDate(task.deadline)}
                  </span>
                </div>

                {/* Title — clickable */}
                <h3
                  onClick={() => fetchTaskDetail(task._id)}
                  style={{ margin: "0 0 6px", fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", cursor: "pointer", lineHeight: "1.4" }}
                >
                  {task.title}
                </h3>

                {/* Description */}
                {task.description && (
                  <p style={{ margin: "0 0 12px", fontSize: "13px", color: "var(--color-text-secondary)", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden", lineHeight: "1.6" }}>
                    {task.description}
                  </p>
                )}

                {/* Meta */}
                <div style={{ display: "flex", gap: "16px", fontSize: "12px", color: "var(--color-text-muted)", marginBottom: "14px", flexWrap: "wrap" }}>
                  <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><User size={12} /> {task.assignedBy?.fullName || "Manager"}</span>
                  {task.estimatedHours && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}><Timer size={12} /> Est: {task.estimatedHours} hrs</span>
                  )}
                  {task.tags && task.tags.length > 0 && (
                    <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                      <Tag size={12} /> {task.tags.join(", ")}
                    </span>
                  )}
                </div>

                {/* Status actions row */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  {/* Current status badge */}
                  <span style={{ fontSize: "11px", fontWeight: 700, padding: "4px 12px", borderRadius: "8px", textTransform: "uppercase", backgroundColor: sBadge.bg, color: sBadge.color }}>
                    {STATUS_LABELS[task.status]}
                  </span>

                  {/* Status change dropdown */}
                  {nextStatuses.length > 0 && (
                    <CustomDropdown
                      value=""
                      placeholder="Move to..."
                      onChange={(val) => {
                        if (val) {
                          setStatusChangeTarget(task);
                          setStatusChangeTo(val);
                        }
                      }}
                      options={nextStatuses.map((s) => ({ value: s, label: STATUS_LABELS[s] }))}
                      minWidth={110}
                    />
                  )}

                  {/* Add update button */}
                  {task.status !== "cancelled" && (
                    <button
                      onClick={() => {
                        setExpandedUpdate(expandedUpdate === task._id ? null : task._id);
                        setUpdateText("");
                      }}
                      style={{
                        padding: "6px 14px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: expandedUpdate === task._id ? "var(--color-accent-bg)" : "var(--color-surface)",
                        color: expandedUpdate === task._id ? "var(--color-accent)" : "var(--color-text-muted)",
                        fontSize: "12px",
                        fontWeight: 600,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      <MessageSquare size={12} /> {expandedUpdate === task._id ? "Close" : "+ Update"}
                    </button>
                  )}
                </div>

                {/* Inline update textarea */}
                {expandedUpdate === task._id && (
                  <div style={{ marginTop: "12px", display: "flex", gap: "8px" }}>
                    <textarea
                      value={updateText}
                      onChange={(e) => setUpdateText(e.target.value)}
                      placeholder="Add a progress update..."
                      maxLength={500}
                      rows={2}
                      style={{
                        flex: 1,
                        padding: "10px 14px",
                        borderRadius: "10px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        fontSize: "13px",
                        resize: "vertical",
                        outline: "none",
                        fontFamily: "inherit",
                      }}
                    />
                    <button
                      onClick={() => handleAddUpdate(task._id)}
                      disabled={addingUpdate || updateText.trim().length < 3}
                      style={{
                        padding: "10px 16px",
                        borderRadius: "10px",
                        border: "none",
                        backgroundColor: "var(--color-accent)",
                        color: "#fff",
                        fontWeight: 600,
                        cursor: addingUpdate || updateText.trim().length < 3 ? "not-allowed" : "pointer",
                        opacity: addingUpdate || updateText.trim().length < 3 ? 0.5 : 1,
                        alignSelf: "flex-end",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                        fontSize: "12px",
                      }}
                    >
                      <Send size={13} /> Send
                    </button>
                  </div>
                )}

                {/* Last 2 updates */}
                {lastUpdates.length > 0 && (
                  <div style={{ marginTop: "12px" }}>
                    {lastUpdates.map((u, i) => (
                      <div key={i} style={{ padding: "8px 12px", borderRadius: "8px", backgroundColor: "var(--color-surface)", marginBottom: "6px", border: "1px solid var(--color-border-light)" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "2px" }}>
                          <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-primary)" }}>{u.updatedBy?.fullName || "System"}</span>
                          <span style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>{formatDateTime(u.updatedAt)}</span>
                        </div>
                        <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-secondary)" }}>{u.message}</p>
                        {u.statusChange && (
                          <span style={{ fontSize: "10px", fontWeight: 600, color: "var(--color-accent)" }}>{u.statusChange}</span>
                        )}
                      </div>
                    ))}
                    {(task.updates || []).length > 2 && (
                      <button
                        onClick={() => fetchTaskDetail(task._id)}
                        style={{ background: "none", border: "none", color: "var(--color-accent)", fontSize: "12px", fontWeight: 600, cursor: "pointer", padding: "4px 0" }}
                      >
                        View all {task.updates.length} updates →
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "24px" }}>
          {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
            <button
              key={p}
              onClick={() => setPage(p)}
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                border: page === p ? "none" : "1px solid var(--color-border)",
                backgroundColor: page === p ? "var(--color-accent)" : "var(--color-card)",
                color: page === p ? "#fff" : "var(--color-text-secondary)",
                fontWeight: 600,
                fontSize: "13px",
                cursor: "pointer",
              }}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {/* Modals */}
      <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />
      <StatusChangeDialog
        open={!!statusChangeTarget}
        onClose={() => { setStatusChangeTarget(null); setStatusChangeTo(""); }}
        onConfirm={handleStatusChange}
        newStatus={statusChangeTo}
        saving={saving}
      />
    </DashboardLayout>
  );
};

export default EmployeeTasks;
