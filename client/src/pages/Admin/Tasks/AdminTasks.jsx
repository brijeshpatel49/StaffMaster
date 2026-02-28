import { useState, useEffect, useCallback } from "react";
import DashboardLayout from "../../../layouts/DashboardLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import {
  ListTodo,
  Eye,
  X,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
  Calendar,
  Timer,
  Tag,
  MessageSquare,
  Building2,
  Filter,
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
              {isOverdue(task) && <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>OVERDUE</span>}
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
              <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><User size={13} /> Assigned By</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{task.assignedBy?.fullName || "Unknown"}</span>
            </div>
            <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
              <span style={{ display: "flex", alignItems: "center", gap: "5px", marginBottom: "2px" }}><Building2 size={13} /> Department</span>
              <span style={{ fontWeight: 600, color: "var(--color-text-primary)" }}>{task.departmentId?.name || "—"}</span>
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
              {updates.length === 0 ? (
                <p style={{ color: "var(--color-text-muted)", fontSize: "13px" }}>No updates yet.</p>
              ) : updates.map((u, i) => (
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

/* ── Main Page ── */
const AdminTasks = () => {
  const { API } = useAuth();
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState([]);
  const [summary, setSummary] = useState({ total: 0, todo: 0, in_progress: 0, completed: 0, cancelled: 0, overdue: 0 });
  const [departmentBreakdown, setDepartmentBreakdown] = useState([]);
  const [pagination, setPagination] = useState({ currentPage: 1, totalPages: 1, total: 0 });
  const [departments, setDepartments] = useState([]);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("");
  const [sortBy, setSortBy] = useState("deadline");
  const [page, setPage] = useState(1);

  // Modal
  const [detailTask, setDetailTask] = useState(null);

  const fetchAllTasks = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (priorityFilter) params.set("priority", priorityFilter);
      if (departmentFilter) params.set("departmentId", departmentFilter);
      params.set("sortBy", sortBy);
      params.set("page", page);
      params.set("limit", "10");
      const result = await apiFetch(`${API}/tasks?${params}`);
      if (result?.data?.success) {
        setTasks(result.data.data.tasks);
        setSummary(result.data.data.summary);
        setDepartmentBreakdown(result.data.data.departmentBreakdown || []);
        setPagination(result.data.data.pagination);
      }
    } catch (err) {
      console.error("Fetch tasks error:", err);
    } finally {
      setLoading(false);
    }
  }, [API, statusFilter, priorityFilter, departmentFilter, sortBy, page]);

  const fetchDepartments = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/departments`);
      if (result?.data?.success) setDepartments(result.data.data || result.data.departments || []);
      else if (Array.isArray(result?.data)) setDepartments(result.data);
    } catch { /* silent */ }
  }, [API]);

  useEffect(() => { fetchAllTasks(); }, [fetchAllTasks]);
  useEffect(() => { fetchDepartments(); }, [fetchDepartments]);
  useEffect(() => { setPage(1); }, [statusFilter, priorityFilter, departmentFilter, sortBy]);

  const fetchTaskDetail = async (taskId) => {
    try {
      const result = await apiFetch(`${API}/tasks/${taskId}`);
      if (result?.data?.success) setDetailTask(result.data.data);
    } catch { /* silent */ }
  };

  const completionPct = summary.total > 0 ? Math.round((summary.completed / summary.total) * 100) : 0;

  return (
    <DashboardLayout title="Task Overview" subtitle="Organization-wide task monitoring (read-only)">
      {loading ? <Loader variant="section" /> : (
        <>
          {/* Summary cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))", gap: "14px", marginBottom: "28px" }}>
            {[
              { label: "Total Tasks", value: summary.total, color: "var(--color-text-secondary)" },
              { label: "Todo", value: summary.todo, color: "var(--color-text-secondary)" },
              { label: "In Progress", value: summary.in_progress, color: "var(--color-accent)" },
              { label: "Completed", value: summary.completed, color: "var(--color-positive)" },
              { label: "Overdue", value: summary.overdue, color: "var(--color-negative)" },
              { label: "Completion %", value: `${completionPct}%`, color: "var(--color-positive)" },
            ].map((s, i) => (
              <div key={i} style={{ backgroundColor: "var(--color-card)", borderRadius: "14px", padding: "18px", border: "1px solid var(--color-border)", textAlign: "center" }}>
                <p style={{ fontSize: "11px", fontWeight: 600, color: "var(--color-text-muted)", margin: "0 0 6px", textTransform: "uppercase", letterSpacing: "0.5px" }}>{s.label}</p>
                <p style={{ fontSize: "28px", fontWeight: 800, color: s.color, margin: 0 }}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Department breakdown */}
          {departmentBreakdown.length > 0 && (
            <div style={{ backgroundColor: "var(--color-card)", borderRadius: "20px", padding: "24px", border: "1px solid var(--color-border)", marginBottom: "24px" }}>
              <h3 style={{ margin: "0 0 16px", fontSize: "16px", fontWeight: 700, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: "8px" }}>
                <Building2 size={18} /> Department Breakdown
              </h3>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                      {["Department", "Total", "In Progress", "Completed", "Overdue"].map((h, i) => (
                        <th key={i} style={{ padding: "10px 16px", fontSize: "12px", fontWeight: 600, color: "var(--color-text-muted)", textAlign: i === 0 ? "left" : "center", textTransform: "uppercase", letterSpacing: "0.5px" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {departmentBreakdown.map((dept, i) => (
                      <tr key={i} style={{ borderBottom: "1px solid var(--color-border-light)" }}>
                        <td style={{ padding: "12px 16px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>{dept.department}</td>
                        <td style={{ padding: "12px 16px", fontSize: "14px", color: "var(--color-text-secondary)", textAlign: "center" }}>{dept.total}</td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: "6px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>{dept.in_progress || 0}</span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: "6px", backgroundColor: "var(--color-positive-bg)", color: "var(--color-positive)" }}>{dept.completed || 0}</span>
                        </td>
                        <td style={{ padding: "12px 16px", textAlign: "center" }}>
                          {dept.overdue > 0 ? (
                            <span style={{ fontSize: "12px", fontWeight: 600, padding: "2px 10px", borderRadius: "6px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>{dept.overdue}</span>
                          ) : (
                            <span style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>0</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Filters */}
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "var(--color-text-muted)", fontSize: "13px", fontWeight: 600 }}>
              <Filter size={14} /> Filters:
            </div>
            <select value={departmentFilter} onChange={(e) => setDepartmentFilter(e.target.value)} style={{ padding: "8px 14px", borderRadius: "10px", border: "1px solid var(--color-border)", backgroundColor: "var(--color-card)", color: "var(--color-text-primary)", fontSize: "13px", fontWeight: 600, cursor: "pointer", outline: "none" }}>
              <option value="">All Departments</option>
              {departments.map((d) => (
                <option key={d._id} value={d._id}>{d.name}</option>
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
                      {["Title", "Department", "Assigned To", "Priority", "Deadline", "Status", ""].map((h) => (
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
                          <td style={{ padding: "14px 16px", maxWidth: "220px" }}>
                            <p onClick={() => fetchTaskDetail(task._id)} style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", cursor: "pointer", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                            {task.tags?.length > 0 && <p style={{ margin: "4px 0 0", fontSize: "11px", color: "var(--color-text-muted)" }}>{task.tags.join(", ")}</p>}
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{task.departmentId?.name || "—"}</td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: "var(--color-text-secondary)", whiteSpace: "nowrap" }}>{task.assignedTo?.fullName || "—"}</td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: pBadge.bg, color: pBadge.color }}>{task.priority}</span>
                          </td>
                          <td style={{ padding: "14px 16px", fontSize: "13px", color: overdue ? "var(--color-negative)" : "var(--color-text-secondary)", fontWeight: overdue ? 600 : 400, whiteSpace: "nowrap" }}>
                            {formatDate(task.deadline)}
                            {overdue && <span style={{ display: "block", fontSize: "10px", fontWeight: 700, color: "var(--color-negative)" }}>OVERDUE</span>}
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: sBadge.bg, color: sBadge.color, whiteSpace: "nowrap" }}>{STATUS_LABELS[task.status]}</span>
                          </td>
                          <td style={{ padding: "14px 16px" }}>
                            <button onClick={() => fetchTaskDetail(task._id)} title="View Details" style={{ background: "none", border: "none", cursor: "pointer", padding: "4px", color: "var(--color-text-muted)", borderRadius: "6px" }}><Eye size={15} /></button>
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
        </>
      )}

      <TaskDetailModal task={detailTask} onClose={() => setDetailTask(null)} />
    </DashboardLayout>
  );
};

export default AdminTasks;
