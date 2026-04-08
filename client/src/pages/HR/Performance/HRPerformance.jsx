import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  Award,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  X,
  RefreshCw,
  Zap,
  Users,
  Building2,
  Star,
  Target,
  Clock,
  User,
  AlertCircle,
} from "lucide-react";
import HRLayout from "../../../layouts/HRLayout";
import AdminLayout from "../../../layouts/AdminLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";
import CustomDropdown from "../../../components/CustomDropdown";

const MONTH_NAMES = [
  "",
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const GRADE_STYLES = {
  A: { bg: "#dcfce7", text: "#16a34a", border: "#86efac", label: "Excellent" },
  B: { bg: "#dbeafe", text: "#2563eb", border: "#93c5fd", label: "Good" },
  C: { bg: "#fef3c7", text: "#d97706", border: "#fcd34d", label: "Average" },
  D: { bg: "#ffedd5", text: "#ea580c", border: "#fdba74", label: "Below Avg" },
  F: { bg: "#fecaca", text: "#dc2626", border: "#fca5a5", label: "Poor" },
};

export default function HRPerformance() {
  const { API, user } = useAuth();
  const isAdmin = user?.role === "admin";
  const Layout = isAdmin ? AdminLayoutWrapper : HRLayout;

  const [loading, setLoading] = useState(true);
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [performanceSummary, setPerformanceSummary] = useState(null);
  const [departments, setDepartments] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const currentDate = new Date();
  const [monthFilter, setMonthFilter] = useState(currentDate.getMonth() + 1);
  const [yearFilter, setYearFilter] = useState(currentDate.getFullYear());
  const [deptFilter, setDeptFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [gradeFilter, setGradeFilter] = useState("");
  const [page, setPage] = useState(1);

  // Action state
  const [generating, setGenerating] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [actionMsg, setActionMsg] = useState(null);
  const [selectedReview, setSelectedReview] = useState(null);

  const currentYear = currentDate.getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);


  // Fetch departments
  useEffect(() => {
    (async () => {
      try {
        const res = await apiFetch(`${API}/departments`);
        if (res?.data?.success) setDepartments(res.data.departments || res.data.data || []);
      } catch { /* ignore */ }
    })();
  }, [API]);

  // Fetch performance data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (monthFilter) params.set("month", monthFilter);
      if (yearFilter) params.set("year", yearFilter);
      if (deptFilter) params.set("departmentId", deptFilter);
      if (statusFilter) params.set("status", statusFilter);
      if (gradeFilter) params.set("grade", gradeFilter);

      const [listRes, sumRes] = await Promise.all([
        apiFetch(`${API}/performance?${params}`),
        apiFetch(`${API}/performance/summary?month=${monthFilter}&year=${yearFilter}`),
      ]);


      if (listRes?.data?.success) {
        setReviews(listRes.data.data);
        setSummary(listRes.data.summary);
        setPagination({
          page: listRes.data.page,
          totalPages: listRes.data.totalPages,
          total: listRes.data.total,
        });
      }
      if (sumRes?.data?.success) {
        setPerformanceSummary(sumRes.data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [API, page, monthFilter, yearFilter, deptFilter, statusFilter, gradeFilter]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);


  // Reset page on filter change
  useEffect(() => {
    setPage(1);
  }, [monthFilter, yearFilter, deptFilter, statusFilter, gradeFilter]);

  // Generate reviews
  const handleGenerate = async () => {
    setGenerating(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`${API}/performance/generate`, {
        method: "POST",
        body: JSON.stringify({ month: monthFilter, year: yearFilter }),
      });
      if (res?.data?.success) {
        setActionMsg({ type: "success", text: res.data.message + ` (${res.data.data.generated} generated)` });
        fetchData();
      } else {
        setActionMsg({ type: "error", text: res?.data?.message || "Failed to generate." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Server error." });
    } finally {
      setGenerating(false);
    }
  };

  // Regenerate scores

  const handleRegenerate = async () => {
    setRegenerating(true);
    setActionMsg(null);
    try {
      const res = await apiFetch(`${API}/performance/regenerate`, {
        method: "PATCH",
        body: JSON.stringify({ month: monthFilter, year: yearFilter }),
      });
      if (res?.data?.success) {
        setActionMsg({ type: "success", text: res.data.message });
        fetchData();
      } else {
        setActionMsg({ type: "error", text: res?.data?.message || "Failed to regenerate." });
      }
    } catch {
      setActionMsg({ type: "error", text: "Server error." });
    } finally {
      setRegenerating(false);
    }
  };

  const layoutTitle = isAdmin ? "Performance Management" : "Performance Management";
  const layoutSubtitle = "Generate, review, and analyze employee performance";

  
  return (
    <Layout title={layoutTitle} subtitle={layoutSubtitle}>
      {loading ? (
        <Loader />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* ── Action Bar ── */}
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "10px",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
              <CustomDropdown
                value={monthFilter}
                onChange={(v) => setMonthFilter(Number(v))}
                options={MONTH_NAMES.slice(1).map((m, i) => ({
                  value: i + 1,
                  label: m,
                }))}
              />
              <CustomDropdown
                value={yearFilter}
                onChange={(v) => setYearFilter(Number(v))}
                options={years.map((y) => ({ value: y, label: String(y) }))}
              />
              <CustomDropdown
                value={deptFilter}
                onChange={setDeptFilter}
                placeholder="All Departments"
                options={[
                  { value: "", label: "All Departments" },
                  ...departments.map((d) => ({ value: d._id, label: d.name })),
                ]}
              />
              <CustomDropdown
                value={statusFilter}
                onChange={setStatusFilter}
                placeholder="All Status"
                options={[
                  { value: "", label: "All Status" },
                  { value: "pending", label: "Pending" },
                  { value: "completed", label: "Completed" },
                ]}
              />
              <CustomDropdown
                value={gradeFilter}
                onChange={setGradeFilter}
                placeholder="All Grades"
                options={[
                  { value: "", label: "All Grades" },
                  ...["A", "B", "C", "D", "F"].map((g) => ({
                    value: g,
                    label: `Grade ${g}`,
                  })),
                ]}
              />
            </div>

            <div style={{ display: "flex", gap: "8px" }}>
              <ActionButton
                icon={<Zap size={14} />}
                label="Generate"
                loading={generating}
                onClick={handleGenerate}
                primary
              />
              <ActionButton
                icon={<RefreshCw size={14} />}
                label="Regenerate"
                loading={regenerating}
                onClick={handleRegenerate}
              />
            </div>
          </div>

          {/* Action message */}
          {actionMsg && (
            <div
              style={{
                padding: "10px 16px",
                borderRadius: "10px",
                backgroundColor:
                  actionMsg.type === "success"
                    ? "var(--color-positive-bg)"
                    : "var(--color-negative-bg)",
                color:
                  actionMsg.type === "success"
                    ? "var(--color-positive)"
                    : "var(--color-negative)",
                fontSize: "13px",
                fontWeight: 500,
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {actionMsg.type === "success" ? (
                <Award size={16} />
              ) : (
                <AlertCircle size={16} />
              )}
              {actionMsg.text}
            </div>
          )}

          {/* ── Summary Cards ── */}
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
                gap: "14px",
              }}
            >
              <SummaryCard
                icon={<Users size={18} />}
                label="Total Reviews"
                value={summary.completedCount + summary.pendingCount}
                color="var(--color-icon-blue)"
                bg="var(--color-icon-blue-bg)"
              />
              <SummaryCard
                icon={<Clock size={18} />}
                label="Pending"
                value={summary.pendingCount}
                color="var(--color-icon-yellow)"
                bg="var(--color-icon-yellow-bg)"
              />
              <SummaryCard
                icon={<Award size={18} />}
                label="Completed"
                value={summary.completedCount}
                color="var(--color-positive)"
                bg="var(--color-positive-bg)"
              />
              <SummaryCard
                icon={<Star size={18} />}
                label="Avg Score"
                value={summary.avgScore || "—"}
                color="var(--color-accent)"
                bg="var(--color-accent-bg)"
              />
            </div>
          )}

          {/* ── Grade Distribution ── */}
          {summary?.gradeDistribution && (
            <div
              style={{
                backgroundColor: "var(--color-card)",
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                padding: "20px 24px",
              }}
            >
              <h3
                style={{
                  margin: "0 0 14px",
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                Grade Distribution
              </h3>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                {Object.entries(summary.gradeDistribution).map(
                  ([grade, count]) => (
                    <GradeChip key={grade} grade={grade} count={count} />
                  )
                )}
              </div>
            </div>
          )}

          {/* ── Department Breakdown ── */}
          {performanceSummary?.departmentBreakdown?.length > 0 && (
            <div
              style={{
                backgroundColor: "var(--color-card)",
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                overflow: "hidden",
              }}
            >
              <div style={{ padding: "20px 24px 0" }}>
                <h3
                  style={{
                    margin: 0,
                    fontSize: "15px",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                  }}
                >
                  <Building2 size={16} />
                  Department Performance
                </h3>
              </div>
              <div style={{ overflowX: "auto", padding: "16px 24px 24px" }}>
                <table
                  style={{
                    width: "100%",
                    borderCollapse: "collapse",
                    fontSize: "13px",
                  }}
                >
                  <thead>
                    <tr>
                      {[
                        "Department",
                        "Employees",
                        "Completed",
                        "Pending",
                        "Avg Score",
                        "Grades",
                      ].map((h) => (
                        <th
                          key={h}
                          style={{
                            textAlign: "left",
                            padding: "10px 12px",
                            fontWeight: 600,
                            color: "var(--color-text-muted)",
                            borderBottom: "1px solid var(--color-border)",
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
                    {performanceSummary.departmentBreakdown.map((dept) => (
                      <tr
                        key={dept.departmentId}
                        style={{
                          borderBottom: "1px solid var(--color-border-light)",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {dept.department}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {dept.totalEmployees}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-positive)",
                            fontWeight: 600,
                          }}
                        >
                          {dept.completedCount}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-icon-yellow)",
                            fontWeight: 600,
                          }}
                        >
                          {dept.pendingCount}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: 700,
                            color: "var(--color-text-primary)",
                          }}
                        >
                          {dept.avgScore || "—"}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <div style={{ display: "flex", gap: "4px" }}>
                            {Object.entries(dept.gradeDistribution || {}).map(
                              ([g, c]) =>
                                c > 0 && (
                                  <GradeChip
                                    key={g}
                                    grade={g}
                                    count={c}
                                    small
                                  />
                                )
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Top / Bottom Performers ── */}
          {performanceSummary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
                gap: "16px",
              }}
            >
              <PerformerList
                title="Top Performers"
                icon={<TrendingUp size={16} color="var(--color-positive)" />}
                performers={performanceSummary.topPerformers}
              />
              <PerformerList
                title="Needs Improvement"
                icon={<AlertCircle size={16} color="var(--color-negative)" />}
                performers={performanceSummary.bottomPerformers}
              />
            </div>
          )}

          {/* ── All Reviews Table ── */}
          <div
            style={{
              backgroundColor: "var(--color-card)",
              borderRadius: "16px",
              border: "1px solid var(--color-border)",
              overflow: "hidden",
            }}
          >
            <div style={{ padding: "20px 24px 0" }}>
              <h3
                style={{
                  margin: 0,
                  fontSize: "15px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                All Reviews ({pagination.total})
              </h3>
            </div>

            {reviews.length === 0 ? (
              <div
                style={{
                  padding: "48px 24px",
                  textAlign: "center",
                  color: "var(--color-text-muted)",
                  fontSize: "14px",
                }}
              >
                <BarChart3
                  size={40}
                  style={{ marginBottom: "12px", opacity: 0.4 }}
                />
                <p>
                  No reviews found for {MONTH_NAMES[monthFilter]} {yearFilter}.
                  Click "Generate" to create reviews.
                </p>
              </div>
            ) : (
              <>
                <div style={{ overflowX: "auto", padding: "16px 24px" }}>
                  <table
                    style={{
                      width: "100%",
                      borderCollapse: "collapse",
                      fontSize: "13px",
                    }}
                  >
                    <thead>
                      <tr>
                        {[
                          "Employee",
                          "Department",
                          "Manager",
                          "Attendance",
                          "Tasks",
                          "Rating",
                          "Final",
                          "Grade",
                          "Status",
                          "",
                        ].map((h) => (
                          <th
                            key={h}
                            style={{
                              textAlign: "left",
                              padding: "10px 12px",
                              fontWeight: 600,
                              color: "var(--color-text-muted)",
                              borderBottom: "1px solid var(--color-border)",
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
                      {reviews.map((r) => (
                        <tr
                          key={r._id}
                          style={{
                            borderBottom:
                              "1px solid var(--color-border-light)",
                          }}
                        >
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: 600,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {r.employeeId?.fullName}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {r.departmentId?.name}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {r.managerId?.fullName}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {r.attendanceScore?.score?.toFixed(1)}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {r.taskScore?.score?.toFixed(1)}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              color: "var(--color-text-secondary)",
                            }}
                          >
                            {r.managerRating || "—"}
                          </td>
                          <td
                            style={{
                              padding: "12px",
                              fontWeight: 600,
                              color: "var(--color-text-primary)",
                            }}
                          >
                            {r.finalScore?.toFixed(2) || "—"}
                          </td>
                          <td style={{ padding: "12px" }}>
                            {r.grade ? (
                              <GradeBadge grade={r.grade} />
                            ) : (
                              <span
                                style={{ color: "var(--color-text-muted)" }}
                              >
                                —
                              </span>
                            )}
                          </td>
                          <td style={{ padding: "12px" }}>
                            <StatusBadge status={r.status} />
                          </td>
                          <td style={{ padding: "12px" }}>
                            <button
                              onClick={() => setSelectedReview(r)}
                              style={{
                                padding: "6px 14px",
                                borderRadius: "8px",
                                border: "1px solid var(--color-border)",
                                backgroundColor: "var(--color-surface)",
                                color: "var(--color-text-primary)",
                                fontSize: "12px",
                                fontWeight: 500,
                                cursor: "pointer",
                              }}
                            >
                              View
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                {pagination.totalPages > 1 && (
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "12px",
                      padding: "16px 24px 24px",
                    }}
                  >
                    <button
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        cursor: page <= 1 ? "not-allowed" : "pointer",
                        opacity: page <= 1 ? 0.5 : 1,
                      }}
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <span
                      style={{
                        fontSize: "13px",
                        color: "var(--color-text-secondary)",
                      }}
                    >
                      Page {pagination.page} of {pagination.totalPages}
                    </span>
                    <button
                      onClick={() =>
                        setPage((p) =>
                          Math.min(pagination.totalPages, p + 1)
                        )
                      }
                      disabled={page >= pagination.totalPages}
                      style={{
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid var(--color-border)",
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-primary)",
                        cursor:
                          page >= pagination.totalPages
                            ? "not-allowed"
                            : "pointer",
                        opacity: page >= pagination.totalPages ? 0.5 : 1,
                      }}
                    >
                      <ChevronRight size={16} />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ── Detail Modal ── */}
      {selectedReview && (
        <DetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </Layout>
  );
}

/* ── Wrapper for Admin using this same page ────────────────────────────────── */
function AdminLayoutWrapper({ title, subtitle, children }) {
  return (
    <AdminLayout title={title} subtitle={subtitle}>
      {children}
    </AdminLayout>
  );
}

/* ── Sub Components ───────────────────────────────────────────────────────── */

function ActionButton({ icon, label, loading: isLoading, onClick, primary }) {
  return (
    <button
      onClick={onClick}
      disabled={isLoading}
      style={{
        padding: "8px 18px",
        borderRadius: "10px",
        border: primary ? "none" : "1px solid var(--color-border)",
        backgroundColor: primary
          ? "var(--color-accent)"
          : "var(--color-surface)",
        color: primary ? "#fff" : "var(--color-text-primary)",
        fontWeight: 600,
        fontSize: "13px",
        cursor: isLoading ? "not-allowed" : "pointer",
        opacity: isLoading ? 0.7 : 1,
        display: "flex",
        alignItems: "center",
        gap: "6px",
      }}
    >
      {isLoading ? (
        <RefreshCw size={14} style={{ animation: "spin 1s linear infinite" }} />
      ) : (
        icon
      )}
      {label}
    </button>
  );
}

function SummaryCard({ icon, label, value, color, bg }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        borderRadius: "14px",
        border: "1px solid var(--color-border)",
        padding: "18px",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      }}
    >
      <div
        style={{
          width: "40px",
          height: "40px",
          borderRadius: "10px",
          backgroundColor: bg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color,
          flexShrink: 0,
        }}
      >
        {icon}
      </div>
      <div>
        <div
          style={{
            fontSize: "11px",
            color: "var(--color-text-muted)",
            fontWeight: 500,
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "20px",
            fontWeight: 800,
            color: "var(--color-text-primary)",
          }}
        >
          {value}
        </div>
      </div>
    </div>
  );
}

function GradeChip({ grade, count, small }) {
  const s = GRADE_STYLES[grade] || GRADE_STYLES.C;
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: small ? "4px" : "6px",
        padding: small ? "3px 8px" : "6px 12px",
        borderRadius: "8px",
        backgroundColor: s.bg,
        border: `1px solid ${s.border}`,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: small ? "11px" : "13px",
          color: s.text,
        }}
      >
        {grade}
      </span>
      <span
        style={{
          fontWeight: 600,
          fontSize: small ? "10px" : "12px",
          color: s.text,
          opacity: 0.8,
        }}
      >
        {count}
      </span>
    </div>
  );
}

function GradeBadge({ grade }) {
  const s = GRADE_STYLES[grade] || GRADE_STYLES.C;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "8px",
        backgroundColor: s.bg,
        color: s.text,
        border: `1px solid ${s.border}`,
        fontWeight: 700,
        fontSize: "12px",
      }}
    >
      {grade}
    </span>
  );
}

function StatusBadge({ status }) {
  const styles = {
    pending: {
      bg: "var(--color-icon-yellow-bg)",
      text: "var(--color-icon-yellow)",
    },
    completed: { bg: "var(--color-positive-bg)", text: "var(--color-positive)" },
  };
  const s = styles[status] || styles.pending;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 10px",
        borderRadius: "6px",
        backgroundColor: s.bg,
        color: s.text,
        fontWeight: 600,
        fontSize: "11px",
        textTransform: "capitalize",
      }}
    >
      {status}
    </span>
  );
}

function PerformerList({ title, icon, performers }) {
  if (!performers || performers.length === 0) return null;
  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        borderRadius: "16px",
        border: "1px solid var(--color-border)",
        padding: "20px",
      }}
    >
      <h4
        style={{
          margin: "0 0 14px",
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          display: "flex",
          alignItems: "center",
          gap: "8px",
        }}
      >
        {icon}
        {title}
      </h4>
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {performers.map((p, i) => (
          <div
            key={p._id}
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "8px 12px",
              borderRadius: "10px",
              backgroundColor: "var(--color-surface)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span
                style={{
                  width: "24px",
                  height: "24px",
                  borderRadius: "6px",
                  backgroundColor: "var(--color-border-light)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "11px",
                  fontWeight: 700,
                  color: "var(--color-text-muted)",
                }}
              >
                {i + 1}
              </span>
              <div>
                <div
                  style={{
                    fontSize: "13px",
                    fontWeight: 600,
                    color: "var(--color-text-primary)",
                  }}
                >
                  {p.employeeId?.fullName}
                </div>
                <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                  {p.departmentId?.name}
                </div>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <span
                style={{
                  fontSize: "13px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                {p.finalScore?.toFixed(2)}
              </span>
              <GradeBadge grade={p.grade} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Detail Modal ─────────────────────────────────────────────────────────── */

function DetailModal({ review, onClose }) {
  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    const prevHtmlOverflow = document.documentElement.style.overflow;
    const rootEl = document.getElementById("root");
    const prevRootOverflow = rootEl ? rootEl.style.overflow : "";

    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";
    if (rootEl) rootEl.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prevOverflow;
      document.documentElement.style.overflow = prevHtmlOverflow;
      if (rootEl) rootEl.style.overflow = prevRootOverflow;
    };
  }, []);

  return createPortal((
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
          maxWidth: "640px",
          maxHeight: "85vh",
          overflow: "auto",
          overscrollBehavior: "contain",
          border: "1px solid var(--color-border)",
        }}
        className="no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "24px 24px 0",
          }}
        >
          <div>
            <h3
              style={{
                margin: 0,
                fontSize: "18px",
                fontWeight: 700,
                color: "var(--color-text-primary)",
              }}
            >
              {review.employeeId?.fullName}
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              {review.departmentId?.name} ·{" "}
              {MONTH_NAMES[review.period.month]} {review.period.year}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {review.grade && <GradeBadge grade={review.grade} />}
            <StatusBadge status={review.status} />
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
        </div>

        <div
          style={{
            padding: "20px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Scores */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
              gap: "8px",
            }}
          >
            {[
              { l: "Attendance", v: review.attendanceScore?.score, c: "var(--color-icon-blue)" },
              { l: "Tasks", v: review.taskScore?.score, c: "var(--color-icon-purple)" },
              { l: "Auto Score", v: review.autoScore, c: "var(--color-accent)" },
              { l: "Manager", v: review.managerRating, c: "var(--color-icon-yellow)" },
              { l: "Final", v: review.finalScore, c: "var(--color-positive)" },
            ].map((item) => (
              <div
                key={item.l}
                style={{
                  textAlign: "center",
                  padding: "10px",
                  borderRadius: "10px",
                  backgroundColor: "var(--color-surface)",
                }}
              >
                <div
                  style={{
                    fontSize: "20px",
                    fontWeight: 700,
                    color: item.c,
                  }}
                >
                  {item.v?.toFixed(1) ?? "—"}
                </div>
                <div
                  style={{
                    fontSize: "10px",
                    color: "var(--color-text-muted)",
                    textTransform: "uppercase",
                  }}
                >
                  {item.l}
                </div>
              </div>
            ))}
          </div>

          {/* Attendance breakdown */}
          <DetailSection title="Attendance" icon={<Clock size={16} />}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { l: "Present", v: review.attendanceScore?.present },
                { l: "Late", v: review.attendanceScore?.late },
                { l: "Absent", v: review.attendanceScore?.absent },
                { l: "Half Day", v: review.attendanceScore?.halfDay },
                { l: "On Leave", v: review.attendanceScore?.onLeave },
                { l: "Working Days", v: review.attendanceScore?.totalWorkingDays },
                {
                  l: "Percentage",
                  v: `${review.attendanceScore?.attendancePercentage ?? 0}%`,
                },
              ].map((item) => (
                <MiniStat key={item.l} label={item.l} value={item.v ?? 0} />
              ))}
            </div>
          </DetailSection>

          {/* Task breakdown */}
          <DetailSection title="Tasks" icon={<Target size={16} />}>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {[
                { l: "Total", v: review.taskScore?.totalAssigned },
                { l: "Completed", v: review.taskScore?.completed },
                { l: "In Progress", v: review.taskScore?.inProgress },
                { l: "Overdue", v: review.taskScore?.overdue },
                { l: "Cancelled", v: review.taskScore?.cancelled },
                {
                  l: "Completion",
                  v: `${review.taskScore?.completionRate ?? 0}%`,
                },
                {
                  l: "On-time",
                  v: `${review.taskScore?.onTimeRate ?? 0}%`,
                },
              ].map((item) => (
                <MiniStat key={item.l} label={item.l} value={item.v ?? 0} />
              ))}
            </div>
            {review.taskScore?.note && (
              <p
                style={{
                  margin: "8px 0 0",
                  fontSize: "12px",
                  color: "var(--color-text-muted)",
                  fontStyle: "italic",
                }}
              >
                {review.taskScore.note}
              </p>
            )}
          </DetailSection>

          {/* Manager feedback */}
          {review.status === "completed" && (
            <DetailSection title="Manager Feedback" icon={<User size={16} />}>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {review.managerId && (
                  <p style={{ margin: 0, fontSize: "12px", color: "var(--color-text-muted)" }}>
                    Reviewed by <strong style={{ color: "var(--color-text-primary)" }}>{review.managerId.fullName}</strong>
                    {review.reviewedAt && <> on {new Date(review.reviewedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}</>}
                  </p>
                )}
                {review.strengths && <FeedbackItem label="Strengths" value={review.strengths} />}
                {review.areasOfImprovement && <FeedbackItem label="Areas of Improvement" value={review.areasOfImprovement} />}
                {review.goals && <FeedbackItem label="Goals" value={review.goals} />}
                {review.additionalComments && <FeedbackItem label="Comments" value={review.additionalComments} />}
              </div>
            </DetailSection>
          )}
        </div>
      </div>
    </div>
  ), document.body);
}

function DetailSection({ title, icon, children }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "14px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "10px",
          color: "var(--color-text-primary)",
          fontWeight: 600,
          fontSize: "13px",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        padding: "6px 12px",
        borderRadius: "8px",
        backgroundColor: "var(--color-card)",
        textAlign: "center",
      }}
    >
      <div style={{ fontSize: "14px", fontWeight: 700, color: "var(--color-text-primary)" }}>
        {value}
      </div>
      <div style={{ fontSize: "10px", color: "var(--color-text-muted)" }}>
        {label}
      </div>
    </div>
  );
}

function FeedbackItem({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: "11px",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "4px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "13px",
          color: "var(--color-text-primary)",
          lineHeight: 1.6,
          backgroundColor: "var(--color-card)",
          borderRadius: "8px",
          padding: "8px 12px",
        }}
      >
        {value}
      </div>
    </div>
  );
}
