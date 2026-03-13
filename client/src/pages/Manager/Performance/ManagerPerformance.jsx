import { useState, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  TrendingUp,
  Award,
  Clock,
  CheckCircle2,
  Star,
  X,
  ChevronDown,
  Target,
  User,
  Send,
  AlertCircle,
} from "lucide-react";
import ManagerLayout from "../../../layouts/ManagerLayout";
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

export default function ManagerPerformance() {
  const { API } = useAuth();
  const [tab, setTab] = useState("pending");
  const [pendingReviews, setPendingReviews] = useState([]);
  const [teamData, setTeamData] = useState([]);
  const [teamSummary, setTeamSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedReview, setSelectedReview] = useState(null);
  const [reviewModal, setReviewModal] = useState(null);
  const [yearFilter, setYearFilter] = useState(new Date().getFullYear());

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 3 }, (_, i) => currentYear - i);

  const fetchPending = useCallback(async () => {
    try {
      const result = await apiFetch(`${API}/performance/pending`);
      if (result?.data?.success) setPendingReviews(result.data.data);
    } catch (err) {
      console.error(err);
    }
  }, [API]);

  const fetchTeam = useCallback(async () => {
    try {
      const params = new URLSearchParams({ year: yearFilter, status: "completed" });
      const result = await apiFetch(`${API}/performance/team?${params}`);
      if (result?.data?.success) {
        setTeamData(result.data.data);
        setTeamSummary(result.data.summary);
      }
    } catch (err) {
      console.error(err);
    }
  }, [API, yearFilter]);

  const fetchAll = useCallback(async () => {
    setLoading(true);
    await Promise.all([fetchPending(), fetchTeam()]);
    setLoading(false);
  }, [fetchPending, fetchTeam]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const handleReviewSubmitted = () => {
    setReviewModal(null);
    fetchAll();
  };

  return (
    <ManagerLayout
      title="Performance Reviews"
      subtitle="Review your team's monthly performance"
    >
      {loading ? (
        <Loader />
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {/* ── Tabs ── */}
          <div
            style={{
              display: "flex",
              gap: "4px",
              backgroundColor: "var(--color-surface)",
              borderRadius: "12px",
              padding: "4px",
              width: "fit-content",
            }}
          >
            {[
              { key: "pending", label: `Pending (${pendingReviews.length})` },
              { key: "completed", label: "Completed" },
            ].map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                style={{
                  padding: "8px 20px",
                  borderRadius: "8px",
                  border: "none",
                  fontWeight: 600,
                  fontSize: "13px",
                  cursor: "pointer",
                  backgroundColor:
                    tab === t.key ? "var(--color-card)" : "transparent",
                  color:
                    tab === t.key
                      ? "var(--color-text-primary)"
                      : "var(--color-text-muted)",
                  boxShadow:
                    tab === t.key ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
                  transition: "all 0.2s",
                }}
              >
                {t.label}
              </button>
            ))}
          </div>

          {tab === "pending" ? (
            /* ── Pending Reviews ── */
            pendingReviews.length === 0 ? (
              <EmptyState
                icon={<CheckCircle2 size={40} />}
                message="No pending reviews. All caught up!"
              />
            ) : (
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
                  gap: "16px",
                }}
              >
                {pendingReviews.map((r) => (
                  <PendingCard
                    key={r._id}
                    review={r}
                    onReview={() => setReviewModal(r)}
                    onView={() => setSelectedReview(r)}
                  />
                ))}
              </div>
            )
          ) : (
            /* ── Completed Tab ── */
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              {/* Year filter + summary */}
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  flexWrap: "wrap",
                  gap: "12px",
                }}
              >
                {teamSummary && (
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
                    <MiniStat label="Team Size" value={teamSummary.total} />
                    <MiniStat label="Completed" value={teamSummary.completed} />
                    <MiniStat label="Avg Score" value={teamSummary.avgFinalScore} />
                  </div>
                )}
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

              {teamData.length === 0 ? (
                <EmptyState
                  icon={<TrendingUp size={40} />}
                  message={`No completed reviews found for ${yearFilter}.`}
                />
              ) : (
                <div
                  style={{
                    backgroundColor: "var(--color-card)",
                    borderRadius: "16px",
                    border: "1px solid var(--color-border)",
                    overflow: "hidden",
                  }}
                >
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
                            "Employee",
                            "Period",
                            "Attendance",
                            "Tasks",
                            "Manager",
                            "Final",
                            "Grade",
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
                        {teamData.map((r) => (
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
                              {r.managerRating}
                            </td>
                            <td
                              style={{
                                padding: "12px",
                                fontWeight: 600,
                                color: "var(--color-text-primary)",
                              }}
                            >
                              {r.finalScore?.toFixed(2)}
                            </td>
                            <td style={{ padding: "12px" }}>
                              <GradeBadge grade={r.grade} />
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
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ── Review Modal (submit review) ── */}
      {reviewModal && (
        <ReviewSubmitModal
          review={reviewModal}
          API={API}
          onClose={() => setReviewModal(null)}
          onSuccess={handleReviewSubmitted}
        />
      )}

      {/* ── Detail Modal ── */}
      {selectedReview && (
        <ViewDetailModal
          review={selectedReview}
          onClose={() => setSelectedReview(null)}
        />
      )}
    </ManagerLayout>
  );
}

/* ── Sub Components ───────────────────────────────────────────────────────── */

function PendingCard({ review, onReview, onView }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        borderRadius: "16px",
        border: "1px solid var(--color-border)",
        padding: "20px",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <div>
          <div
            style={{
              fontSize: "15px",
              fontWeight: 700,
              color: "var(--color-text-primary)",
            }}
          >
            {review.employeeId?.fullName}
          </div>
          <div style={{ fontSize: "12px", color: "var(--color-text-muted)" }}>
            {review.departmentId?.name} ·{" "}
            {MONTH_NAMES[review.period.month]} {review.period.year}
          </div>
        </div>
        <span
          style={{
            padding: "4px 10px",
            borderRadius: "6px",
            backgroundColor: "var(--color-icon-yellow-bg)",
            color: "var(--color-icon-yellow)",
            fontWeight: 600,
            fontSize: "11px",
          }}
        >
          Pending
        </span>
      </div>

      {/* Auto scores preview */}
      <div style={{ display: "flex", gap: "8px" }}>
        <MiniScore label="Attendance" value={review.attendanceScore?.score} />
        <MiniScore label="Tasks" value={review.taskScore?.score} />
        <MiniScore label="Auto" value={review.autoScore} />
      </div>

      <div style={{ display: "flex", gap: "8px" }}>
        <button
          onClick={onReview}
          style={{
            flex: 1,
            padding: "10px",
            borderRadius: "10px",
            border: "none",
            backgroundColor: "var(--color-accent)",
            color: "#fff",
            fontWeight: 600,
            fontSize: "13px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "6px",
          }}
        >
          <Star size={14} />
          Submit Review
        </button>
        <button
          onClick={onView}
          style={{
            padding: "10px 16px",
            borderRadius: "10px",
            border: "1px solid var(--color-border)",
            backgroundColor: "var(--color-surface)",
            color: "var(--color-text-primary)",
            fontWeight: 500,
            fontSize: "13px",
            cursor: "pointer",
          }}
        >
          Details
        </button>
      </div>
    </div>
  );
}

function MiniScore({ label, value }) {
  return (
    <div
      style={{
        flex: 1,
        textAlign: "center",
        padding: "8px",
        borderRadius: "8px",
        backgroundColor: "var(--color-surface)",
      }}
    >
      <div
        style={{
          fontSize: "16px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        {value?.toFixed(1) ?? "—"}
      </div>
      <div
        style={{
          fontSize: "10px",
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {label}
      </div>
    </div>
  );
}

function MiniStat({ label, value }) {
  return (
    <div
      style={{
        padding: "8px 16px",
        borderRadius: "10px",
        backgroundColor: "var(--color-card)",
        border: "1px solid var(--color-border)",
      }}
    >
      <span
        style={{
          fontSize: "12px",
          color: "var(--color-text-muted)",
          marginRight: "6px",
        }}
      >
        {label}:
      </span>
      <span
        style={{
          fontSize: "14px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
        }}
      >
        {value}
      </span>
    </div>
  );
}

function GradeBadge({ grade }) {
  const style = GRADE_STYLES[grade] || GRADE_STYLES.C;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "4px 12px",
        borderRadius: "8px",
        backgroundColor: style.bg,
        color: style.text,
        border: `1px solid ${style.border}`,
        fontWeight: 700,
        fontSize: "12px",
      }}
    >
      {grade}
    </span>
  );
}

function EmptyState({ icon, message }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        borderRadius: "16px",
        border: "1px solid var(--color-border)",
        padding: "48px 24px",
        textAlign: "center",
        color: "var(--color-text-muted)",
      }}
    >
      <div style={{ marginBottom: "12px", opacity: 0.4 }}>{icon}</div>
      <p style={{ fontSize: "14px", margin: 0 }}>{message}</p>
    </div>
  );
}

/* ── Review Submit Modal ──────────────────────────────────────────────────── */

function ReviewSubmitModal({ review, API, onClose, onSuccess }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [strengths, setStrengths] = useState("");
  const [areas, setAreas] = useState("");
  const [goals, setGoals] = useState("");
  const [comments, setComments] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async () => {
    if (!rating) return setError("Please provide a rating (1-5 stars).");
    if (strengths.trim().length < 10)
      return setError("Strengths must be at least 10 characters.");
    if (areas.trim().length < 10)
      return setError("Areas of improvement must be at least 10 characters.");
    if (goals.trim().length < 10)
      return setError("Goals must be at least 10 characters.");

    setSubmitting(true);
    setError("");
    try {
      const result = await apiFetch(`${API}/performance/${review._id}/review`, {
        method: "PATCH",
        body: JSON.stringify({
          managerRating: rating,
          strengths: strengths.trim(),
          areasOfImprovement: areas.trim(),
          goals: goals.trim(),
          additionalComments: comments.trim(),
        }),
      });
      if (result?.data?.success) {
        onSuccess();
      } else {
        setError(result?.data?.message || "Failed to submit review.");
      }
    } catch (err) {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
          maxHeight: "90vh",
          overflow: "auto",
          border: "1px solid var(--color-border)",
        }}
        className="no-scrollbar"
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
              Review: {review.employeeId?.fullName}
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

        {/* Auto Scores */}
        <div
          style={{
            display: "flex",
            gap: "8px",
            padding: "16px 24px",
          }}
        >
          <MiniScore label="Attendance" value={review.attendanceScore?.score} />
          <MiniScore label="Tasks" value={review.taskScore?.score} />
          <MiniScore label="Auto Score" value={review.autoScore} />
        </div>

        {/* Form */}
        <div
          style={{
            padding: "0 24px 24px",
            display: "flex",
            flexDirection: "column",
            gap: "16px",
          }}
        >
          {/* Star Rating */}
          <div>
            <label
              style={{
                fontSize: "13px",
                fontWeight: 600,
                color: "var(--color-text-secondary)",
                marginBottom: "8px",
                display: "block",
              }}
            >
              Manager Rating *
            </label>
            <div style={{ display: "flex", gap: "4px" }}>
              {[1, 2, 3, 4, 5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setRating(s)}
                  onMouseEnter={() => setHoverRating(s)}
                  onMouseLeave={() => setHoverRating(0)}
                  style={{
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px",
                    transition: "transform 0.15s",
                    transform:
                      (hoverRating || rating) >= s ? "scale(1.15)" : "scale(1)",
                  }}
                >
                  <Star
                    size={32}
                    fill={
                      (hoverRating || rating) >= s ? "#f59e0b" : "transparent"
                    }
                    color={
                      (hoverRating || rating) >= s
                        ? "#f59e0b"
                        : "var(--color-border)"
                    }
                  />
                </button>
              ))}
              {rating > 0 && (
                <span
                  style={{
                    marginLeft: "8px",
                    fontSize: "14px",
                    fontWeight: 600,
                    color: "var(--color-accent)",
                    alignSelf: "center",
                  }}
                >
                  {rating}/5
                </span>
              )}
            </div>
          </div>

          <TextArea
            label="Strengths *"
            value={strengths}
            onChange={setStrengths}
            placeholder="What did the employee excel at? (min 10 chars)"
          />
          <TextArea
            label="Areas of Improvement *"
            value={areas}
            onChange={setAreas}
            placeholder="Where can the employee improve? (min 10 chars)"
          />
          <TextArea
            label="Goals for Next Period *"
            value={goals}
            onChange={setGoals}
            placeholder="Set goals for the upcoming period (min 10 chars)"
          />
          <TextArea
            label="Additional Comments"
            value={comments}
            onChange={setComments}
            placeholder="Any additional feedback (optional)"
            rows={2}
          />

          {error && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                padding: "10px 14px",
                borderRadius: "10px",
                backgroundColor: "var(--color-negative-bg)",
                color: "var(--color-negative)",
                fontSize: "13px",
                fontWeight: 500,
              }}
            >
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          <button
            onClick={handleSubmit}
            disabled={submitting}
            style={{
              padding: "12px",
              borderRadius: "12px",
              border: "none",
              backgroundColor: "var(--color-accent)",
              color: "#fff",
              fontWeight: 600,
              fontSize: "14px",
              cursor: submitting ? "not-allowed" : "pointer",
              opacity: submitting ? 0.7 : 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
            }}
          >
            <Send size={16} />
            {submitting ? "Submitting..." : "Submit Review"}
          </button>
        </div>
      </div>
    </div>
  );
}

function TextArea({ label, value, onChange, placeholder, rows = 3 }) {
  return (
    <div>
      <label
        style={{
          fontSize: "13px",
          fontWeight: 600,
          color: "var(--color-text-secondary)",
          marginBottom: "6px",
          display: "block",
        }}
      >
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        style={{
          width: "100%",
          padding: "10px 14px",
          borderRadius: "10px",
          border: "1px solid var(--color-border)",
          backgroundColor: "var(--color-surface)",
          color: "var(--color-text-primary)",
          fontSize: "14px",
          resize: "vertical",
          fontFamily: "inherit",
          boxSizing: "border-box",
        }}
      />
      <div
        style={{
          textAlign: "right",
          fontSize: "11px",
          color:
            value.trim().length > 0 && value.trim().length < 10
              ? "var(--color-negative)"
              : "var(--color-text-muted)",
          marginTop: "2px",
        }}
      >
        {value.trim().length} chars
      </div>
    </div>
  );
}

/* ── View Detail Modal (for completed reviews) ────────────────────────────── */

function ViewDetailModal({ review, onClose }) {
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
              {MONTH_NAMES[review.period.month]} {review.period.year}
            </p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <GradeBadge grade={review.grade} />
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
          <div style={{ display: "flex", gap: "8px" }}>
            <MiniScore label="Attendance" value={review.attendanceScore?.score} />
            <MiniScore label="Tasks" value={review.taskScore?.score} />
            <MiniScore label="Rating" value={review.managerRating} />
            <MiniScore label="Final" value={review.finalScore} />
          </div>

          {review.strengths && (
            <FeedbackBlock label="Strengths" value={review.strengths} />
          )}
          {review.areasOfImprovement && (
            <FeedbackBlock label="Areas of Improvement" value={review.areasOfImprovement} />
          )}
          {review.goals && (
            <FeedbackBlock label="Goals" value={review.goals} />
          )}
          {review.additionalComments && (
            <FeedbackBlock label="Comments" value={review.additionalComments} />
          )}
        </div>
      </div>
    </div>
  ), document.body);
}

function FeedbackBlock({ label, value }) {
  return (
    <div
      style={{
        backgroundColor: "var(--color-surface)",
        borderRadius: "12px",
        padding: "14px 16px",
      }}
    >
      <div
        style={{
          fontSize: "12px",
          fontWeight: 600,
          color: "var(--color-text-muted)",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
          marginBottom: "6px",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: "14px",
          color: "var(--color-text-primary)",
          lineHeight: 1.6,
        }}
      >
        {value}
      </div>
    </div>
  );
}
