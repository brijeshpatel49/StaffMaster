import { useState, useEffect, useMemo, useCallback } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import {
  Users,
  ListTodo,
  Plus,
  Eye,
  Pencil,
  XCircle,
  Trash2,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Timer,
  Tag,
  MessageSquare,
  Send,
  BarChart3,
  ChevronRight,
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

const MANAGER_TRANSITIONS = {
  todo: ["in_progress", "cancelled"],
  in_progress: ["completed", "todo", "cancelled"],
  completed: ["in_progress"],
  cancelled: ["todo"],
};

const formatDate = (d) =>
  new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

const formatDateTime = (d) =>
  new Date(d).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });

const isOverdue = (task) =>
  ["todo", "in_progress"].includes(task.status) && new Date(task.deadline) < new Date();

/* ── Task Detail Modal ── */
const TaskDetailModal = ({ task, onClose }) => {
  if (!task) return null;
  const updates = [...(task.updates || [])].sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", padding: "16px" }} onClick={onClose}>
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", width: "100%", maxWidth: "600px", maxHeight: "80vh", overflow: "auto", border: "1px solid var(--color-border)" }} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", padding: "24px 24px 0", gap: "12px" }}>
          <div>
            <div style={{ display: "flex", gap: "8px", marginBottom: "8px", flexWrap: "wrap" }}>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: PRIORITY_BADGE[task.priority]?.bg, color: PRIORITY_BADGE[task.priority]?.color }}>{task.priority}</span>
              <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: STATUS_BADGE[task.status]?.bg, color: STATUS_BADGE[task.status]?.color }}>{STATUS_LABELS[task.status]}</span>
              {isOverdue(task) && <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>OVERDUE</span>}
            </div>
            <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>{task.title}</h3>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px", flexShrink: 0 }}><X size={20} /></button>
        </div>
        <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "20px" }}>
          {task.description && <p style={{ fontSize: "14px", lineHeight: "1.7", color: "var(--color-text-secondary)", margin: 0, whiteSpace: "pre-wrap" }}>{task.description}</p>}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><User size={13} /> Assigned To</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{task.assignedTo?.fullName || "Unknown"}</span>
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
          {task.tags?.length > 0 && (
            <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
              {task.tags.map((tag, i) => (
                <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "11px", fontWeight: 600, padding: "3px 10px", borderRadius: "6px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}><Tag size={11} /> {tag}</span>
              ))}
            </div>
          )}
          {task.cancelReason && (
            <div style={{ padding: "12px 16px", borderRadius: "10px", backgroundColor: "var(--color-negative-bg)", fontSize: "13px" }}>
              <p style={{ margin: "0 0 4px", fontWeight: 700, color: "var(--color-negative)" }}>Cancellation Reason</p>
              <p style={{ margin: 0, color: "var(--color-negative)" }}>{task.cancelReason}</p>
            </div>
          )}
          <div>
            <h4 style={{ margin: "0 0 12px", fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "6px" }}><MessageSquare size={15} /> Activity Log ({updates.length})</h4>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px", maxHeight: "250px", overflowY: "auto" }}>
              {updates.map((u, i) => (
                <div key={i} style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "var(--color-surface)", border: "1px solid var(--color-border-light)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--color-text-primary)" }}>{u.updatedBy?.fullName || "System"}</span>
                    <span style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>{formatDateTime(u.updatedAt)}</span>
                  </div>
                  <p style={{ margin: 0, fontSize: "13px", color: "var(--color-text-secondary)" }}>{u.message}</p>
                  {u.statusChange && <span style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-accent)", marginTop: "4px", display: "inline-block" }}>{u.statusChange}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

/* ── Edit Task Modal ── */
const EditTaskModal = ({ task, onClose, onSaved, API }) => {
  const [form, setForm] = useState({ title: "", description: "", priority: "medium", deadline: "", estimatedHours: "", tags: [] });
  const [tagInput, setTagInput] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (task) {
      setForm({
        title: task.title || "",
        description: task.description || "",
        priority: task.priority || "medium",
        deadline: task.deadline ? new Date(task.deadline).toISOString().split("T")[0] : "",
        estimatedHours: task.estimatedHours || "",
        tags: task.tags || [],
      });
    }
    setError("");
  }, [task]);

  if (!task) return null;

  const handleSubmit = async () => {
    if (!form.title || form.title.length < 3) { setError("Title must be at least 3 characters"); return; }
    if (!form.deadline) { setError("Deadline is required"); return; }
    setSaving(true);
    setError("");
    try {
      const body = { ...form };
      if (body.estimatedHours === "") delete body.estimatedHours;
      else body.estimatedHours = parseFloat(body.estimatedHours);
      const result = await apiFetch(`${API}/tasks/${task._id}`, { method: "PUT", body: JSON.stringify(body) });
      if (result?.data?.success) { onSaved(); onClose(); }
      else setError(result?.data?.message || "Failed to update");
    } catch { setError("Failed to update task"); }
    finally { setSaving(false); }
  };

  const addTag = () => {
    const t = tagInput.trim();
    if (t && t.length <= 20 && form.tags.length < 5 && !form.tags.includes(t)) {
      setForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setTagInput("");
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)", padding: "16px" }}>
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", width: "100%", maxWidth: "520px", maxHeight: "85vh", overflow: "auto", border: "1px solid var(--color-border)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)" }}>
          <h3 style={{ margin: 0, fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>Edit Task</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-text-muted)", padding: "4px" }}><X size={20} /></button>
        </div>
        <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
          {error && <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)", fontSize: "13px", fontWeight: 600 }}>{error}</div>}

          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Title *</label>
            <input type="text" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} maxLength={150} style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Description</label>
            <textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} rows={3} style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", outline: "none", resize: "vertical", fontFamily: "inherit", boxSizing: "border-box" }} />
            <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-muted)", textAlign: "right" }}>{form.description.length}/2000</p>
          </div>
          <div style={{ display: "flex", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Priority</label>
              <select value={form.priority} onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", cursor: "pointer", outline: "none" }}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="urgent">Urgent</option>
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Deadline *</label>
              <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
            </div>
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Estimated Hours</label>
            <input type="number" min="0.5" step="0.5" value={form.estimatedHours} onChange={(e) => setForm((f) => ({ ...f, estimatedHours: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", outline: "none", boxSizing: "border-box" }} />
          </div>
          <div>
            <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Tags ({form.tags.length}/5)</label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input type="text" value={tagInput} onChange={(e) => setTagInput(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTag(); } }} maxLength={20} placeholder="Type + Enter" style={{ flex: 1, padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "14px", outline: "none" }} />
            </div>
            {form.tags.length > 0 && (
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                {form.tags.map((t, i) => (
                  <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
                    {t}
                    <button onClick={() => setForm((f) => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", padding: 0, display: "flex" }}><X size={12} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <button onClick={handleSubmit} disabled={saving} style={{ padding: "12px", borderRadius: "12px", border: "none", backgroundColor: "var(--color-accent)", color: "#fff", fontSize: "14px", fontWeight: 700, cursor: saving ? "not-allowed" : "pointer", opacity: saving ? 0.6 : 1 }}>
            {saving ? "Saving..." : "Update Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Cancel Dialog ── */
const CancelDialog = ({ open, onClose, onConfirm, title, saving }) => {
  const [reason, setReason] = useState("");
  useEffect(() => { setReason(""); }, [open]);
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", padding: "28px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-border)" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px", textAlign: "center" }}>Cancel Task?</p>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "16px", textAlign: "center" }}>"{title}"</p>
        <label style={{ display: "block", fontSize: "13px", fontWeight: 600, color: "var(--color-text-secondary)", marginBottom: "6px" }}>Cancellation Reason *</label>
        <textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={3} maxLength={300} placeholder="Why is this task being cancelled?" style={{ width: "100%", padding: "10px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "13px", resize: "vertical", outline: "none", fontFamily: "inherit", boxSizing: "border-box", marginBottom: "16px" }} />
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={onClose} disabled={saving} style={{ padding: "10px 24px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>Back</button>
          <button onClick={() => { if (reason.trim()) onConfirm(reason.trim()); }} disabled={saving || !reason.trim()} style={{ padding: "10px 24px", borderRadius: "10px", border: "none", backgroundColor: "var(--color-negative)", color: "#fff", fontWeight: 600, cursor: saving || !reason.trim() ? "not-allowed" : "pointer", fontSize: "13px", opacity: saving || !reason.trim() ? 0.5 : 1 }}>
            {saving ? "Cancelling..." : "Cancel Task"}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ── Delete Dialog ── */
const DeleteDialog = ({ open, onClose, onConfirm, title }) => {
  if (!open) return null;
  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "rgba(0,0,0,0.3)", backdropFilter: "blur(4px)" }}>
      <div style={{ backgroundColor: "var(--color-card)", borderRadius: "16px", padding: "28px", maxWidth: "400px", width: "100%", border: "1px solid var(--color-border)", textAlign: "center" }}>
        <p style={{ fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", marginBottom: "8px" }}>Delete Task?</p>
        <p style={{ fontSize: "13px", color: "var(--color-text-muted)", marginBottom: "20px" }}>"{title}" — this action cannot be undone.</p>
        <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
          <button onClick={onClose} style={{ padding: "10px 24px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>Cancel</button>
          <button onClick={onConfirm} style={{ padding: "10px 24px", borderRadius: "10px", border: "none", backgroundColor: "var(--color-negative)", color: "#fff", fontWeight: 600, cursor: "pointer", fontSize: "13px" }}>Delete</button>
        </div>
      </div>
    </div>
  );
};

/* ── Main Page ── */
const ManagerTasks = () => {
  const { API, user } = useAuth();
  const [activeTab, setActiveTab] = useState("overview");
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0 });
  const [employeeBreakdown, setEmployeeBreakdown] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [employees, setEmployees] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [employeeFilter, setEmployeeFilter] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [page, setPage] = useState(1);

  // Modals
  const [detailTask, setDetailTask] = useState(null);
  const [editTask, setEditTask] = useState(null);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [saving, setSaving] = useState(false);

  // Create form
  const [createForm, setCreateForm] = useState({ assignedTo: "", title: "", description: "", priority: "medium", deadline: "", estimatedHours: "", tags: [] });
  const [createTagInput, setCreateTagInput] = useState("");
  const [createError, setCreateError] = useState("");
  const [createSuccess, setCreateSuccess] = useState("");
  const [creating, setCreating] = useState(false);

  const fetchTeamTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (employeeFilter) params.set("assignedTo", employeeFilter);
      params.set("sortBy", sortBy);
      params.set("page", page);
      params.set("limit", "10");
      const result = await apiFetch(`${API}/tasks/team?${params}`);
      if (result?.data?.success) {
        setTasks(result.data.data.tasks);
        setSummary(result.data.data.summary);
        setEmployeeBreakdown(result.data.data.employeeBreakdown);
        setPagination(result.data.data.pagination);
      }
    } catch (err) {
      console.error("Fetch team tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [API, statusFilter, priorityFilter, employeeFilter, sortBy, page]);

  const fetchEmployees = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/tasks/department/employees`);
      if (result?.data?.success) setEmployees(result.data.data);
    } catch { /* silent */ }
  }, [API]);

  useEffect(() => { fetchTeamTasks(); }, [fetchTeamTasks]);
  useEffect(() => { fetchEmployees(); }, [fetchEmployees]);
  useEffect(() => { setPage(1); }, [statusFilter, priorityFilter, employeeFilter, sortBy]);

  const fetchTaskDetail = async (taskId) => {
    try {
      const result = await apiFetch(`${API}/tasks/${taskId}`);
      if (result?.data?.success) setDetailTask(result.data.data);
    } catch { /* silent */ }
  };

  const handleCancel = async (reason) => {
    if (!cancelTarget) return;
    setSaving(true);
    try {
      const result = await apiFetch(`${API}/tasks/${cancelTarget._id}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: "cancelled", message: reason }),
      });
      if (result?.data?.success) fetchTeamTasks();
    } catch { /* silent */ }
    finally { setSaving(false); setCancelTarget(null); }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await apiFetch(`${API}/tasks/${deleteTarget._id}`, { method: "DELETE" });
      if (result?.data?.success) fetchTeamTasks();
    } catch { /* silent */ }
    setDeleteTarget(null);
  };

  const handleStatusChange = async (task, newStatus) => {
    if (newStatus === "cancelled") { setCancelTarget(task); return; }
    setSaving(true);
    try {
      const body = { status: newStatus, message: `Status changed to ${newStatus} by manager` };
      if (newStatus === "completed") body.actualHours = 0;
      const result = await apiFetch(`${API}/tasks/${task._id}/status`, { method: "PATCH", body: JSON.stringify(body) });
      if (result?.data?.success) fetchTeamTasks();
    } catch { /* silent */ }
    finally { setSaving(false); }
  };

  const handleCreate = async () => {
    setCreateError("");
    setCreateSuccess("");
    if (!createForm.assignedTo) { setCreateError("Please select an employee"); return; }
    if (!createForm.title || createForm.title.length < 3) { setCreateError("Title must be at least 3 characters"); return; }
    if (!createForm.deadline) { setCreateError("Deadline is required"); return; }
    const deadlineDate = new Date(createForm.deadline);
    const today = new Date(); today.setHours(0, 0, 0, 0);
    if (deadlineDate < today) { setCreateError("Deadline cannot be in the past"); return; }

    setCreating(true);
    try {
      const body = {
        title: createForm.title,
        description: createForm.description,
        assignedTo: createForm.assignedTo,
        priority: createForm.priority,
        deadline: createForm.deadline,
        tags: createForm.tags,
      };
      if (createForm.estimatedHours) body.estimatedHours = parseFloat(createForm.estimatedHours);
      const result = await apiFetch(`${API}/tasks`, { method: "POST", body: JSON.stringify(body) });
      if (result?.data?.success) {
        setCreateSuccess("Task created successfully!");
        setCreateForm({ assignedTo: "", title: "", description: "", priority: "medium", deadline: "", estimatedHours: "", tags: [] });
        setCreateTagInput("");
        fetchTeamTasks();
        setTimeout(() => { setCreateSuccess(""); setActiveTab("tasks"); }, 1500);
      } else {
        setCreateError(result?.data?.message || "Failed to create task");
      }
    } catch { setCreateError("Failed to create task"); }
    finally { setCreating(false); }
  };

  const addCreateTag = () => {
    const t = createTagInput.trim();
    if (t && t.length <= 20 && createForm.tags.length < 5 && !createForm.tags.includes(t)) {
      setCreateForm((f) => ({ ...f, tags: [...f.tags, t] }));
    }
    setCreateTagInput("");
  };

  const deadlineDaysRemaining = useMemo(() => {
    if (!createForm.deadline) return null;
    const diff = Math.ceil((new Date(createForm.deadline) - new Date()) / (1000 * 60 * 60 * 24));
    if (diff < 0) return "Past deadline";
    if (diff === 0) return "Due today";
    return `${diff} day${diff > 1 ? "s" : ""} from now`;
  }, [createForm.deadline]);

  const completionPct = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  const TABS = [
    { key: "overview", label: "Team Overview", icon: BarChart3 },
    { key: "tasks", label: "All Tasks", icon: ListTodo },
    { key: "create", label: "Create Task", icon: Plus },
  ];

  const inputStyle = {
    width: "100%",
    padding: "10px 14px",
    borderRadius: "10px",
    border: "1px solid var(--color-border)",
    backgroundColor: "var(--color-surface)",
    color: "var(--color-text-primary)",
    fontSize: "14px",
    outline: "none",
    boxSizing: "border-box",
  };

  const labelStyle = {
    display: "block",
    fontSize: "13px",
    fontWeight: 600,
    color: "var(--color-text-secondary)",
    marginBottom: "6px",
  };

  return (
    <DashboardLayout title="Team Tasks" subtitle="Manage and assign tasks to your team">
      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "24px", flexWrap: "wrap" }}>
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: "flex", alignItems: "center", gap: "6px",
                padding: "10px 20px", borderRadius: "12px",
                border: activeTab === tab.key ? "none" : "1px solid var(--color-border)",
                backgroundColor: activeTab === tab.key ? "var(--color-accent)" : "var(--color-card)",
                color: activeTab === tab.key ? "#fff" : "var(--color-text-secondary)",
                fontSize: "13px", fontWeight: 600, cursor: "pointer", transition: "all 0.2s",
              }}
            >
              <Icon size={15} /> {tab.label}
            </button>
          );
        })}
      </div>

      {loading ? <Loader variant="section" /> : (
        <>
          {/* ═══ TAB 1: TEAM OVERVIEW ═══ */}
          {activeTab === "overview" && (
            <div>
              {/* Summary strip */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "14px", marginBottom: "28px" }}>
                {[
                  { label: "Total Tasks", value: summary.total, bg: "var(--color-border)", color: "var(--color-text-secondary)" },
                  { label: "Completed", value: summary.completed, bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
                  { label: "In Progress", value: summary.in_progress, bg: "var(--color-accent-bg)", color: "var(--color-accent)" },
                  { label: "Overdue", value: summary.overdue, bg: "var(--color-negative-bg)", color: "var(--color-negative)" },
                  { label: "Completion %", value: `${completionPct}%`, bg: "var(--color-positive-bg)", color: "var(--color-positive)" },
                ].map((s, i) => (
                  <div key={i} style={{ backgroundColor: "var(--color-card)", borderRadius: "14px", padding: "18px", border: "1px solid var(--color-border)", textAlign: "center" }}>
                    <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
                    <p style={{ fontSize: "28px", fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
                  </div>
                ))}
              </div>

              {/* Employee breakdown */}
              <div style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", padding: "24px", border: "1px solid var(--color-border)" }}>
                <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Users size={18} /> Per-Employee Breakdown
                </h3>
                {employeeBreakdown.length === 0 ? (
                  <p style={{ color: "var(--color-text-muted)", fontSize: "14px" }}>No tasks assigned yet.</p>
                ) : (
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                          {["Employee", "Total", "Completed", "Overdue", ""].map((h, i) => (
                            <th key={i} style={{ padding: "10px 16px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textAlign: i === 0 ? "left" : "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {employeeBreakdown.map((emp, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                            <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{emp.employee}</td>
                            <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", textAlign: "center" }}>{emp.total}</td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: "6px", backgroundColor: "var(--color-positive-bg)", color: "var(--color-positive)" }}>{emp.completed}</span>
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              {emp.overdue > 0 ? (
                                <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: "6px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>{emp.overdue}</span>
                              ) : (
                                <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>0</span>
                              )}
                            </td>
                            <td style={{ padding: "12px 16px", textAlign: "center" }}>
                              <button
                                onClick={() => { setEmployeeFilter(emp.employeeId); setActiveTab("tasks"); }}
                                style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, margin: "0 auto" }}
                              >
                                View <ChevronRight size={14} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ═══ TAB 2: ALL TASKS ═══ */}
          {activeTab === "tasks" && (
            <div>
              {/* Filters */}
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
                <select value={employeeFilter} onChange={(e) => setEmployeeFilter(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none" }}>
                  <option value="">All Employees</option>
                  {employees.map((e) => (
                    <option key={e._id} value={e._id}>{e.fullName}</option>
                  ))}
                </select>
                <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none" }}>
                  <option value="">All Status</option>
                  <option value="todo">Todo</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select value={priorityFilter} onChange={(e) => setPriorityFilter(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none" }}>
                  <option value="">All Priorities</option>
                  <option value="urgent">Urgent</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none" }}>
                  <option value="deadline">Sort: Deadline</option>
                  <option value="createdAt">Sort: Created</option>
                  <option value="priority">Sort: Priority</option>
                </select>
              </div>

              {/* Tasks table */}
              {tasks.length === 0 ? (
                <div style={{ textAlign: "center", padding: "60px 20px" }}>
                  <ListTodo size={48} style={{ color: "var(--color-text-muted)", marginBottom: "12px", opacity: 0.4 }} />
                  <p style={{ fontSize: "16px", fontWeight: 600, color: "var(--color-text-secondary)", margin: 0 }}>No tasks found.</p>
                </div>
              ) : (
                <div style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", border: "1px solid var(--color-border)", overflow: "hidden" }}>
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse" }}>
                      <thead>
                        <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                          {["Title", "Assigned To", "Priority", "Deadline", "Status", "Actions"].map((h) => (
                            <th key={h} style={{ padding: "14px 16px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textAlign: "left", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {tasks.map((task) => {
                          const overdue = isOverdue(task);
                          const pBadge = PRIORITY_BADGE[task.priority];
                          const sBadge = STATUS_BADGE[task.status];
                          return (
                            <tr key={task._id} style={{ borderBottom: "1px solid var(--color-border-light)", backgroundColor: overdue ? "rgba(239,68,68,0.04)" : "transparent" }}>
                              <td style={{ padding: "14px 16px", maxWidth: "250px" }}>
                                <p onClick={() => fetchTaskDetail(task._id)} style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                                {task.tags?.length > 0 && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>{task.tags.join(", ")}</p>}
                              </td>
                              <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{task.assignedTo?.fullName || "—"}</td>
                              <td style={{ padding: "14px 16px" }}>
                                <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: pBadge.bg, color: pBadge.color }}>{task.priority}</span>
                              </td>
                              <td style={{ padding: "14px 16px", fontSize: "13px", color: overdue ? "var(--color-negative)" : "var(--color-text-secondary)", fontWeight: overdue ? 600 : 400, whiteSpace: "nowrap" }}>
                                {formatDate(task.deadline)}
                                {overdue && <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--color-negative)" }}>OVERDUE</span>}
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: sBadge.bg, color: sBadge.color, whiteSpace: "nowrap" }}>{STATUS_LABELS[task.status]}</span>
                                  {(MANAGER_TRANSITIONS[task.status] || []).length > 0 && (
                                    <select
                                      value=""
                                      onChange={(e) => { if (e.target.value) handleStatusChange(task, e.target.value); }}
                                      style={{ padding: "2px 4px", borderRadius: "6px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-surface)", color: "var(--color-text-primary)", fontSize: "10px", cursor: "pointer", outline: "none" }}
                                    >
                                      <option value="">▼</option>
                                      {(MANAGER_TRANSITIONS[task.status] || []).map((s) => (
                                        <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                                      ))}
                                    </select>
                                  )}
                                </div>
                              </td>
                              <td style={{ padding: "14px 16px" }}>
                                <div style={{ display: "flex", gap: "4px" }}>
                                  <button onClick={() => fetchTaskDetail(task._id)} title="View" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)", borderRadius: "6px" }}><Eye size={15} /></button>
                                  {!["completed", "cancelled"].includes(task.status) && (
                                    <button onClick={() => setEditTask(task)} title="Edit" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)", borderRadius: "6px" }}><Pencil size={15} /></button>
                                  )}
                                  {!["cancelled"].includes(task.status) && task.status !== "completed" && (
                                    <button onClick={() => setCancelTarget(task)} title="Cancel" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-accent)", borderRadius: "6px" }}><XCircle size={15} /></button>
                                  )}
                                  {task.status === "todo" && (
                                    <button onClick={() => setDeleteTarget(task)} title="Delete" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-negative)", borderRadius: "6px" }}><Trash2 size={15} /></button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Pagination */}
              {pagination.totalPages > 1 && (
                <div style={{ display: "flex", justifyContent: "center", gap: "8px", marginTop: "20px" }}>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                    <button key={p} onClick={() => setPage(p)} style={{ width: "36px", height: "36px", borderRadius: "10px", border: page === p ? "none" : "1px solid var(--color-border)", backgroundColor: page === p ? "var(--color-accent)" : "var(--color-card)", color: page === p ? "#fff" : "var(--color-text-secondary)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>{p}</button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══ TAB 3: CREATE TASK ═══ */}
          {activeTab === "create" && (
            <div style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", padding: "28px", border: "1px solid var(--color-border)", maxWidth: "600px" }}>
              <h3 style={{ margin: "0 0 24px", fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)" }}>Assign New Task</h3>

              {createError && <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>{createError}</div>}
              {createSuccess && <div style={{ padding: "10px 14px", borderRadius: "10px", backgroundColor: "var(--color-positive-bg)", color: "var(--color-positive)", fontSize: "13px", fontWeight: 600, marginBottom: "16px" }}>{createSuccess}</div>}

              <div style={{ display: "flex", flexDirection: "column", gap: "18px" }}>
                {/* Employee */}
                <div>
                  <label style={labelStyle}>Employee *</label>
                  {employees.length === 0 ? (
                    <p style={{ color: "var(--color-text-muted)", fontSize: "13px", margin: 0 }}>No active employees in your department</p>
                  ) : (
                    <select value={createForm.assignedTo} onChange={(e) => setCreateForm((f) => ({ ...f, assignedTo: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="">Select employee...</option>
                      {employees.map((e) => (
                        <option key={e._id} value={e._id}>{e.fullName} — {e.email}</option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label style={labelStyle}>Title *</label>
                  <input type="text" value={createForm.title} onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))} maxLength={150} placeholder="Task title" style={inputStyle} />
                  {createForm.title.length > 0 && createForm.title.length < 3 && (
                    <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-negative)" }}>Min 3 characters</p>
                  )}
                </div>

                {/* Description */}
                <div>
                  <label style={labelStyle}>Description</label>
                  <textarea value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} maxLength={2000} rows={4} placeholder="Task description (optional)" style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }} />
                  <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-muted)", textAlign: "right" }}>{createForm.description.length}/2000</p>
                </div>

                {/* Priority + Deadline row */}
                <div style={{ display: "flex", gap: "14px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Priority</label>
                    <select value={createForm.priority} onChange={(e) => setCreateForm((f) => ({ ...f, priority: e.target.value }))} style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Deadline *</label>
                    <input type="date" value={createForm.deadline} onChange={(e) => setCreateForm((f) => ({ ...f, deadline: e.target.value }))} min={new Date().toISOString().split("T")[0]} style={inputStyle} />
                    {deadlineDaysRemaining && (
                      <p style={{ margin: "4px 0 0", fontSize: "11px", color: deadlineDaysRemaining === "Past deadline" ? "var(--color-negative)" : "var(--color-text-muted)" }}>{deadlineDaysRemaining}</p>
                    )}
                  </div>
                </div>

                {/* Estimated Hours */}
                <div>
                  <label style={labelStyle}>Estimated Hours</label>
                  <input type="number" min="0.5" step="0.5" value={createForm.estimatedHours} onChange={(e) => setCreateForm((f) => ({ ...f, estimatedHours: e.target.value }))} placeholder="e.g. 4" style={inputStyle} />
                </div>

                {/* Tags */}
                <div>
                  <label style={labelStyle}>Tags ({createForm.tags.length}/5)</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <input
                      type="text"
                      value={createTagInput}
                      onChange={(e) => setCreateTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCreateTag(); } }}
                      maxLength={20}
                      placeholder="Type + Enter"
                      disabled={createForm.tags.length >= 5}
                      style={{ ...inputStyle, flex: 1, opacity: createForm.tags.length >= 5 ? 0.5 : 1 }}
                    />
                  </div>
                  {createForm.tags.length > 0 && (
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", marginTop: "8px" }}>
                      {createForm.tags.map((t, i) => (
                        <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
                          {t}
                          <button onClick={() => setCreateForm((f) => ({ ...f, tags: f.tags.filter((_, idx) => idx !== i) }))} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", padding: 0, display: "flex" }}><X size={12} /></button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit */}
                <button
                  onClick={handleCreate}
                  disabled={creating}
                  style={{
                    padding: "14px",
                    borderRadius: "12px",
                    border: "none",
                    backgroundColor: "#FCD34D",
                    color: "var(--color-text-primary)",
                    fontSize: "14px",
                    fontWeight: 700,
                    cursor: creating ? "not-allowed" : "pointer",
                    opacity: creating ? 0.6 : 1,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "8px",
                  }}
                >
                  <Send size={16} /> {creating ? "Assigning..." : "Assign Task"}
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* Modals */}
      <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />
      <EditTaskModal task={editTask} onClose={() => setEditTask(null)} onSaved={() => fetchTeamTasks()} API={API} />
      <CancelDialog open={!!cancelTarget} onClose={() => setCancelTarget(null)} onConfirm={handleCancel} title={cancelTarget?.title || ""} saving={saving} />
      <DeleteDialog open={!!deleteTarget} onClose={() => setDeleteTarget(null)} onConfirm={handleDelete} title={deleteTarget?.title || ""} />
    </DashboardLayout>
  );
};

export default ManagerTasks;
