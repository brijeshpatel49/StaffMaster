import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  Award,
  BarChart3,
  Calendar,
  ChevronDown,
  X,
  Star,
  Target,
  Clock,
  CheckCircle2,
  AlertCircle,
  User,
} from "lucide-react";
import EmployeeLayout from "../../../layouts/EmployeeLayout";
import { useAuth } from "../../../hooks/useAuth";
import { apiFetch } from "../../../utils/api";
import { Loader } from "../../../components/Loader";

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
  D: { bg: "#ffedd5", text: "#ea580c", border: "#fdba74", label: "Below Average" },
  F: { bg: "#fecaca", text: "#dc2626", border: "#fca5a5", label: "Needs Improvement" },
};

export default function EmployeePerformance() {
  const { API } = useAuth();
  const [reviews, setReviews] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());
  const [selectedReview, setSelectedReview] = useState(null);

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const fetchPerformance = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ year: yearFilter });
      const result = await apiFetch(`${API}/performance/my?${params}`);
      if (result?.data?.success) {
        setReviews(result.data.data);
        setSummary(result.data.summary);
      }
    } catch (err) {
      console.error("Failed to fetch performance:", err);
    } finally {
      setLoading(false);
    }
  }, [API, yearFilter]);

  useEffect(() => {
    fetchPerformance();
  }, [fetchPerformance]);

  const latestCompleted = reviews.find((r) => r.status === "completed");

  return (
    <EmployeeLayout
      title="My Performance"
      subtitle="View your performance reviews and scores"
    >
      {loading ? (
        <Loader />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* ── Year Filter ── */}
          <div style={{ display: "flex", justifyContent: "flex-end" }}>
            <div style={{ position: "relative" }}>
              <select
                value={yearFilter}
                onChange={(e) => setYearFilter(Number(e.target.value))}
                style={{
                  padding: "8px 32px 8px 12px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-primary)",
                  fontSize: "14px",
                  fontWeight: 500,
                  cursor: "pointer",
                  appearance: "none",
                }}
              >
                {years.map((y) => (
                  <option key={y} value={y}>
                    {y}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={16}
                style={{
                  position: "absolute",
                  right: "10px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  pointerEvents: "none",
                  color: "var(--color-text-muted)",
                }}
              />
            </div>
          </div>

          {/* ── Summary Cards ── */}
          {summary && (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "16px",
              }}
            >
              <SummaryCard
                icon={<BarChart3 size={20} />}
                label="Reviews"
                value={summary.totalReviews}
                color="var(--color-icon-blue)"
                bg="var(--color-icon-blue-bg)"
              />
              <SummaryCard
                icon={<CheckCircle2 size={20} />}
                label="Completed"
                value={summary.completedReviews}
                color="var(--color-positive)"
                bg="var(--color-positive-bg)"
              />
              <SummaryCard
                icon={<Star size={20} />}
                label="Avg Score"
                value={summary.avgFinalScore || "—"}
                color="var(--color-accent)"
                bg="var(--color-accent-bg)"
              />
              <SummaryCard
                icon={<Award size={20} />}
                label="Latest Grade"
                value={summary.latestGrade || "—"}
                color={
                  summary.latestGrade
                    ? GRADE_STYLES[summary.latestGrade]?.text
                    : "var(--color-text-muted)"
                }
                bg={
                  summary.latestGrade
                    ? GRADE_STYLES[summary.latestGrade]?.bg
                    : "var(--color-surface)"
                }
              />
            </div>
          )}

          {/* ── Current Status Card ── */}
          {latestCompleted && (
            <div
              style={{
                backgroundColor: "var(--color-card)",
                borderRadius: "16px",
                border: "1px solid var(--color-border)",
                padding: "24px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: "20px",
                }}
              >
                <h3
                  style={{
                    margin: 0,
                    fontSize: "16px",
                    fontWeight: 700,
                    color: "var(--color-text-primary)",
                  }}
                >
                  Latest Review — {MONTH_NAMES[latestCompleted.period.month]}{" "}
                  {latestCompleted.period.year}
                </h3>
                <GradeBadge grade={latestCompleted.grade} size="lg" />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
                  gap: "12px",
                }}
              >
                <ScoreChip
                  label="Attendance"
                  score={latestCompleted.attendanceScore?.score}
                  detail={`${latestCompleted.attendanceScore?.attendancePercentage}%`}
                  color="var(--color-icon-blue)"
                />
                <ScoreChip
                  label="Tasks"
                  score={latestCompleted.taskScore?.score}
                  detail={`${latestCompleted.taskScore?.completionRate}% done`}
                  color="var(--color-icon-purple)"
                />
                <ScoreChip
                  label="Manager Rating"
                  score={latestCompleted.managerRating}
                  detail={`${latestCompleted.managerRating}/5 stars`}
                  color="var(--color-accent)"
                />
                <ScoreChip
                  label="Final Score"
                  score={latestCompleted.finalScore}
                  detail={`Grade: ${latestCompleted.grade}`}
                  color="var(--color-positive)"
                />
              </div>
            </div>
          )}

          {/* ── History Table ── */}
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
                  fontSize: "16px",
                  fontWeight: 700,
                  color: "var(--color-text-primary)",
                }}
              >
                Performance History
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
                <TrendingUp
                  size={40}
                  style={{ marginBottom: "12px", opacity: 0.4 }}
                />
                <p>No performance reviews found for {yearFilter}.</p>
              </div>
            ) : (
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
                        "Period",
                        "Attendance",
                        "Tasks",
                        "Manager",
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
                          borderBottom: "1px solid var(--color-border-light)",
                        }}
                      >
                        <td
                          style={{
                            padding: "12px",
                            fontWeight: 600,
                            color: "var(--color-text-primary)",
                            whiteSpace: "nowrap",
                          }}
                        >
                          {MONTH_NAMES[r.period.month]} {r.period.year}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {r.attendanceScore?.score?.toFixed(1) || "—"}
                        </td>
                        <td
                          style={{
                            padding: "12px",
                            color: "var(--color-text-secondary)",
                          }}
                        >
                          {r.taskScore?.score?.toFixed(1) || "—"}
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
                            <span style={{ color: "var(--color-text-muted)" }}>
                              —
                            </span>
                          )}
                        </td>
                        <td style={{ padding: "12px" }}>
                          <StatusBadge status={r.status} />
                        </td>
                        <td style={{ padding: "12px" }}>
                          {r.status === "completed" && (
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
                          )}
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

      {/* ── Detail Modal ── */}
      {selectedReview && (
        <ReviewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </EmployeeLayout>
  );
}

/* ── Sub Components ───────────────────────────────────────────────────────── */

function SummaryCard({ icon, label, value, color, bg }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        borderRadius: "14px",
        border: "1px solid var(--color-border)",
        padding: "20px",
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
            fontSize: "12px",
            color: "var(--color-text-muted)",
            fontWeight: 500,
            marginBottom: "2px",
          }}
        >
          {label}
        </div>
        <div
          style={{
            fontSize: "22px",
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

function ScoreChip({ label, score, detail, color }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "12px",
        padding: "14px 16px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: "24px", fontWeight: 800, color }}>
        {score?.toFixed(1) ?? "—"}
      </div>
      <div
        style={{
          fontSize: "12px",
          color: "var(--color-text-muted)",
          marginTop: "4px",
        }}
      >
        {detail}
      </div>
    </div>
  );
}

function GradeBadge({ grade, size = "sm" }) {
  const style = GRADE_STYLES[grade] || GRADE_STYLES.C;
  const px = size === "lg" ? "14px 20px" : "4px 12px";
  const fs = size === "lg" ? "18px" : "12px";
  return (
    <span
      style={{
        display: "inline-block",
        padding: px,
        borderRadius: "8px",
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontWeight: 700,
        fontSize: fs,
      }}
    >
      {grade}
      {size === "lg" && (
        <span style={{ fontWeight: 500, fontSize: "12px", marginLeft: "6px" }}>
          {style.label}
        </span>
      )}
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

function ReviewDetailModal({ review, onClose }) {
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
        className="no-scrollbar"
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
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
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
              Performance Review
            </h3>
            <p
              style={{
                margin: "4px 0 0",
                fontSize: "13px",
                color: "var(--color-text-muted)",
              }}
            >
              {MONTH_NAMES[review.period.month]} {review.period.year}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <GradeBadge grade={review.grade} size="lg" />
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

        {/* Body */}
        <div
          style={{
            padding: "20px 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "20px",
          }}
        >
          {/* Score Breakdown */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))",
              gap: "10px",
            }}
          >
            <ScoreChip
              label="Attendance"
              score={review.attendanceScore?.score}
              detail={`${review.attendanceScore?.attendancePercentage}%`}
              color="var(--color-icon-blue)"
            />
            <ScoreChip
              label="Tasks"
              score={review.taskScore?.score}
              detail={`${review.taskScore?.completionRate}% done`}
              color="var(--color-icon-purple)"
            />
            <ScoreChip
              label="Manager"
              score={review.managerRating}
              detail={`${review.managerRating}/5`}
              color="var(--color-accent)"
            />
            <ScoreChip
              label="Final"
              score={review.finalScore}
              detail={`Grade ${review.grade}`}
              color="var(--color-positive)"
            />
          </div>

          {/* Attendance Details */}
          <DetailSection title="Attendance Breakdown" icon={<Clock size={16} />}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: "8px",
              }}
            >
              {[
                { l: "Present", v: review.attendanceScore?.present, c: "var(--color-positive)" },
                { l: "Late", v: review.attendanceScore?.late, c: "var(--color-icon-yellow)" },
                { l: "Absent", v: review.attendanceScore?.absent, c: "var(--color-negative)" },
                { l: "Half Day", v: review.attendanceScore?.halfDay, c: "var(--color-accent)" },
                { l: "On Leave", v: review.attendanceScore?.onLeave, c: "var(--color-icon-blue)" },
                { l: "Working Days", v: review.attendanceScore?.totalWorkingDays, c: "var(--color-text-primary)" },
              ].map((item) => (
                <div
                  key={item.l}
                  style={{
                    textAlign: "center",
                    padding: "8px",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: 700, color: item.c }}>
                    {item.v ?? 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {item.l}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>

          {/* Task Details */}
          <DetailSection title="Task Breakdown" icon={<Target size={16} />}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(100px, 1fr))",
                gap: "8px",
              }}
            >
              {[
                { l: "Total", v: review.taskScore?.totalAssigned, c: "var(--color-text-primary)" },
                { l: "Completed", v: review.taskScore?.completed, c: "var(--color-positive)" },
                { l: "In Progress", v: review.taskScore?.inProgress, c: "var(--color-icon-blue)" },
                { l: "Overdue", v: review.taskScore?.overdue, c: "var(--color-negative)" },
                { l: "On-Time Rate", v: `${review.taskScore?.onTimeRate ?? 0}%`, c: "var(--color-icon-purple)" },
              ].map((item) => (
                <div
                  key={item.l}
                  style={{
                    textAlign: "center",
                    padding: "8px",
                    borderRadius: "8px",
                    backgroundColor: "var(--color-surface)",
                  }}
                >
                  <div style={{ fontSize: "18px", fontWeight: 700, color: item.c }}>
                    {item.v ?? 0}
                  </div>
                  <div style={{ fontSize: "11px", color: "var(--color-text-muted)" }}>
                    {item.l}
                  </div>
                </div>
              ))}
            </div>
          </DetailSection>

          {/* Manager Feedback */}
          <DetailSection title="Manager Feedback" icon={<User size={16} />}>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {review.managerId && (
                <div style={{ fontSize: "13px", color: "var(--color-text-muted)" }}>
                  Reviewed by{" "}
                  <strong style={{ color: "var(--color-text-primary)" }}>
                    {review.managerId.fullName}
                  </strong>
                  {review.reviewedAt && (
                    <>
                      {" "}on{" "}
                      {new Date(review.reviewedAt).toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </>
                  )}
                </div>
              )}
              <FeedbackItem label="Strengths" value={review.strengths} />
              <FeedbackItem label="Areas of Improvement" value={review.areasOfImprovement} />
              <FeedbackItem label="Goals" value={review.goals} />
              {review.additionalComments && (
                <FeedbackItem label="Additional Comments" value={review.additionalComments} />
              )}
            </div>
          </DetailSection>
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
        padding: "16px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "12px",
          color: "var(--color-text-primary)",
          fontWeight: 600,
          fontSize: "14px",
        }}
      >
        {icon}
        {title}
      </div>
      {children}
    </div>
  );
}

function FeedbackItem({ label, value }) {
  return (
    <div>
      <div
        style={{
          fontSize: "12px",
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
          fontSize: "14px",
          color: "var(--color-text-primary)",
          lineHeight: 1.6,
          backgroundColor: "var(--color-card)",
          borderRadius: "8px",
          padding: "10px 12px",
        }}
      >
        {value}
      </div>
    </div>
  );
}
