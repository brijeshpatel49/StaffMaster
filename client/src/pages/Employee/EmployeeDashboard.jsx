import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import EmployeeLayout from "../../layouts/EmployeeLayout";
import { useAuth } from "../../hooks/useAuth";
import { apiFetch } from "../../utils/api";
import { Loader } from "../../components/Loader";
import AnnouncementBanner from "../../components/AnnouncementBanner";
import UpcomingHolidaysWidget from "../../components/UpcomingHolidaysWidget";
import {
  Building2,
  Briefcase,
  FileBadge,
  CalendarDays,
  CheckSquare,
  ChevronRight,
  Clock,
  TrendingUp,
  Star,
  LogIn,
  LogOut,
  Timer,
} from "lucide-react";

const InfoCard = ({ title, value, icon: Icon, iconBg, iconColor }) => (
  <div
    style={{
      backgroundColor: "var(--color-card)",
      borderRadius: "20px",
      padding: "24px",
      border: "1px solid var(--color-border)",
      
      display: "flex",
      alignItems: "center",
      gap: "16px",
      transition: "box-shadow 0.2s, transform 0.2s",
    }}
    onMouseOver={(e) => {
            e.currentTarget.style.transform = "translateY(-2px)";
    }}
    onMouseOut={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
    }}
  >
    <div
      style={{
        width: "56px",
        height: "56px",
        borderRadius: "16px",
        backgroundColor: iconBg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      <Icon size={28} color={iconColor} />
    </div>
    <div>
      <p
        style={{
          fontSize: "13px",
          color: "var(--color-text-muted)",
          fontWeight: 600,
          margin: "0 0 6px",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {title}
      </p>
      <p
        style={{
          fontSize: "18px",
          fontWeight: 700,
          color: "var(--color-text-primary)",
          margin: 0,
        }}
      >
        {value}
      </p>
    </div>
  </div>
);

const formatDate = (dateString) => {
  if (!dateString) return "N/A";
  const date = new Date(dateString);
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
};

const formatTime = (dateString) => {
  if (!dateString) return "--";
  return new Date(dateString).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
};

const EmployeeDashboard = () => {
  const { API } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pendingTasks, setPendingTasks] = useState([]);
  const [taskSummary, setTaskSummary] = useState({ todo: 0, in_progress: 0, overdue: 0 });
  const [latestPerformance, setLatestPerformance] = useState(null);
  const [todayData, setTodayData] = useState(null);
  const [todayLoading, setTodayLoading] = useState(true);
  const [attendanceActionLoading, setAttendanceActionLoading] = useState(false);
  const [attendanceActionError, setAttendanceActionError] = useState("");

  const fetchTodayStatus = async () => {
    try {
      const result = await apiFetch(`${API}/attendance/today`);
      if (result?.data?.success) setTodayData(result.data.data);
    } catch {
      // silent
    } finally {
      setTodayLoading(false);
    }
  };

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const result = await apiFetch(`${API}/employee/me`);
        if (result?.data?.success) {
          setData(result.data.data);
          setError(null);
        } else {
          setError(result?.data?.message || "Failed to load profile data");
        }
      } catch (err) {
        console.error("Employee Dashboard fetch error:", err);
        setError("Error fetching profile data. Please try again.");
      } finally {
        setLoading(false);
      }
    };
    const fetchTasks = async () => {
      try {
        const result = await apiFetch(`${API}/tasks/my?status=todo&limit=3&sortBy=deadline`);
        if (result?.data?.success) {
          setPendingTasks(result.data.data.tasks);
          setTaskSummary(result.data.data.summary);
        }
      } catch { /* silent */ }
    };
    fetchProfile();
    fetchTasks();
    fetchTodayStatus();
    const fetchPerformance = async () => {
      try {
        const result = await apiFetch(`${API}/performance/my`);
        if (result?.data?.success && result.data.data.reviews?.length > 0) {
          const completed = result.data.data.reviews.filter(r => r.status === "completed");
          if (completed.length > 0) setLatestPerformance(completed[0]);
        }
      } catch { /* silent */ }
    };
    fetchPerformance();
  }, [API]);

  const handleCheckIn = async () => {
    setAttendanceActionLoading(true);
    setAttendanceActionError("");
    try {
      const result = await apiFetch(`${API}/attendance/checkin`, { method: "POST" });
      if (result?.data?.success) {
        await fetchTodayStatus();
      } else {
        setAttendanceActionError(result?.data?.message || "Check-in failed");
      }
    } catch {
      setAttendanceActionError("Network error. Please try again.");
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setAttendanceActionLoading(true);
    setAttendanceActionError("");
    try {
      const result = await apiFetch(`${API}/attendance/checkout`, { method: "POST" });
      if (result?.data?.success) {
        await fetchTodayStatus();
      } else {
        setAttendanceActionError(result?.data?.message || "Check-out failed");
      }
    } catch {
      setAttendanceActionError("Network error. Please try again.");
    } finally {
      setAttendanceActionLoading(false);
    }
  };

  if (loading) {
    return (
      <EmployeeLayout
        title="My Dashboard"
        subtitle="Welcome to your employee portal."
      >
        <Loader variant="section" />
      </EmployeeLayout>
    );
  }

  if (error) {
    return (
      <EmployeeLayout
        title="My Dashboard"
        subtitle="Welcome to your employee portal."
      >
        <div
          style={{
            padding: "24px",
            color: "#dc2626",
            background: "#fee2e2",
            borderRadius: "12px",
          }}
        >
          <p style={{ margin: 0, fontWeight: 600 }}>{error}</p>
        </div>
      </EmployeeLayout>
    );
  }

  const {
    fullName,
    email,
    department,
    designation,
    employmentType,
    joiningDate,
  } = data || {};

  const hasCheckedIn = Boolean(todayData?.checkIn);
  const hasCheckedOut = Boolean(todayData?.checkOut);
  const isOnLeaveToday = todayData?.status === "on-leave";
  const attendanceLabel = todayLoading
    ? "Loading status..."
    : isOnLeaveToday
      ? "On Leave"
      : hasCheckedOut
        ? "Checked Out"
        : hasCheckedIn
          ? "Working"
          : "Not Checked In";

  return (
    <EmployeeLayout
      title="My Dashboard"
      subtitle="Overview of your profile information."
    >
      <AnnouncementBanner />
      <div style={{ marginTop: "20px" }}>
        <UpcomingHolidaysWidget />
      </div>

      {/* ── Quick Attendance Action ── */}
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "20px",
          padding: "22px 24px",
          border: "1px solid var(--color-border)",
          marginBottom: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: "14px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                fontSize: "12px",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                color: "var(--color-text-muted)",
                fontWeight: 600,
              }}
            >
              Today's Attendance
            </p>
            <h3 style={{ margin: "6px 0 0", fontSize: "20px", color: "var(--color-text-primary)" }}>
              {attendanceLabel}
            </h3>
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {isOnLeaveToday ? (
              <button
                onClick={() => navigate("/employee/attendance")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View Attendance
              </button>
            ) : !hasCheckedIn ? (
              <button
                onClick={handleCheckIn}
                disabled={attendanceActionLoading || todayLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "var(--color-accent)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: attendanceActionLoading || todayLoading ? "not-allowed" : "pointer",
                  opacity: attendanceActionLoading || todayLoading ? 0.7 : 1,
                }}
              >
                <LogIn size={14} />
                {attendanceActionLoading ? "Checking..." : "Check In"}
              </button>
            ) : !hasCheckedOut ? (
              <button
                onClick={handleCheckOut}
                disabled={attendanceActionLoading || todayLoading}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "6px",
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "none",
                  backgroundColor: "var(--color-negative)",
                  color: "#fff",
                  fontSize: "13px",
                  fontWeight: 700,
                  cursor: attendanceActionLoading || todayLoading ? "not-allowed" : "pointer",
                  opacity: attendanceActionLoading || todayLoading ? 0.7 : 1,
                }}
              >
                <LogOut size={14} />
                {attendanceActionLoading ? "Saving..." : "Check Out"}
              </button>
            ) : (
              <button
                onClick={() => navigate("/employee/attendance")}
                style={{
                  padding: "10px 14px",
                  borderRadius: "10px",
                  border: "1px solid var(--color-border)",
                  backgroundColor: "var(--color-surface)",
                  color: "var(--color-text-secondary)",
                  fontSize: "13px",
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                View Log
              </button>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginTop: "14px" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px", backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Clock size={12} /> In: {formatTime(todayData?.checkIn)}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px", backgroundColor: "var(--color-surface)", color: "var(--color-text-secondary)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Clock size={12} /> Out: {formatTime(todayData?.checkOut)}
          </span>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 10px", borderRadius: "8px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)", display: "inline-flex", alignItems: "center", gap: "5px" }}>
            <Timer size={12} /> Hours: {todayData?.workHours ? `${todayData.workHours.toFixed(1)}h` : hasCheckedIn && !hasCheckedOut ? "In Progress" : "0h"}
          </span>
        </div>

        {attendanceActionError && (
          <p style={{ margin: "10px 0 0", color: "var(--color-negative)", fontSize: "12px", fontWeight: 600 }}>
            {attendanceActionError}
          </p>
        )}
      </div>

      {/* ── Profile Snapshot Cards ── */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "18px",
          marginBottom: "28px",
        }}
      >
        <InfoCard
          title="Department"
          value={department?.name || "N/A"}
          icon={Building2}
          iconBg="#fef9c3"
          iconColor="#ca8a04"
        />
        <InfoCard
          title="Designation"
          value={designation || "N/A"}
          icon={Briefcase}
          iconBg="#dbeafe"
          iconColor="#2563eb"
        />
        <InfoCard
          title="Employment Type"
          value={
            <span style={{ textTransform: "capitalize" }}>
              {employmentType || "N/A"}
            </span>
          }
          icon={FileBadge}
          iconBg="#f3e8ff"
          iconColor="#9333ea"
        />
        <InfoCard
          title="Joining Date"
          value={formatDate(joiningDate)}
          icon={CalendarDays}
          iconBg="#dcfce7"
          iconColor="#16a34a"
        />
      </div>

      {/* ── Pending Tasks Widget ── */}
      <div
        style={{
          backgroundColor: "var(--color-card)",
          borderRadius: "20px",
          padding: "24px",
          border: "1px solid var(--color-border)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckSquare size={20} /> My Pending Tasks
          </h2>
          <button onClick={() => navigate("/employee/tasks")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "13px", fontWeight: 600 }}>
            View All <ChevronRight size={14} />
          </button>
        </div>
        {/* Mini summary */}
        <div style={{ display: "flex", gap: "12px", marginBottom: "16px", flexWrap: "wrap" }}>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-border)", color: "var(--color-text-secondary)" }}>Todo: {taskSummary.todo}</span>
          <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>In Progress: {taskSummary.in_progress}</span>
          {taskSummary.overdue > 0 && <span style={{ fontSize: "12px", fontWeight: 600, padding: "4px 12px", borderRadius: "8px", backgroundColor: "var(--color-negative-bg)", color: "var(--color-negative)" }}>Overdue: {taskSummary.overdue}</span>}
        </div>
        {pendingTasks.length === 0 ? (
          <p style={{ color: "var(--color-text-muted)", fontSize: "14px", margin: 0 }}>No pending tasks. You're all caught up!</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {pendingTasks.map((task) => {
              const overdue = ["todo", "in_progress"].includes(task.status) && new Date(task.deadline) < new Date();
              return (
                <div key={task._id} onClick={() => navigate("/employee/tasks")} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderRadius: "12px", backgroundColor: overdue ? "rgba(239,68,68,0.04)" : "var(--color-surface)", border: "1px solid var(--color-border-light)", cursor: "pointer", transition: "background 0.2s" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ margin: 0, fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{task.title}</p>
                    <div style={{ display: "flex", gap: "8px", marginTop: "4px", alignItems: "center" }}>
                      <span style={{ fontSize: "11px", color: overdue ? "var(--color-negative)" : "var(--color-text-muted)", display: "flex", alignItems: "center", gap: "3px" }}>
                        <Clock size={11} /> {new Date(task.deadline).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                      </span>
                      {overdue && <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--color-negative)" }}>OVERDUE</span>}
                    </div>
                  </div>
                  <span style={{ fontSize: "10px", fontWeight: 700, padding: "3px 10px", borderRadius: "6px", textTransform: "uppercase", backgroundColor: task.priority === "urgent" ? "var(--color-negative-bg)" : task.priority === "high" ? "var(--color-accent-bg)" : "var(--color-border)", color: task.priority === "urgent" ? "var(--color-negative)" : task.priority === "high" ? "var(--color-accent)" : "var(--color-text-secondary)" }}>{task.priority}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Performance Widget ── */}
      {latestPerformance && (
        <div
          style={{
            backgroundColor: "var(--color-card)",
            borderRadius: "20px",
            padding: "24px",
            border: "1px solid var(--color-border)",
            marginTop: "24px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
            <h2 style={{ fontSize: "18px", fontWeight: 700, color: "var(--color-text-primary)", margin: 0, display: "flex", alignItems: "center", gap: "8px" }}>
              <TrendingUp size={20} /> Latest Performance Review
            </h2>
            <button onClick={() => navigate("/employee/performance")} style={{ display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", fontSize: "13px", fontWeight: 600 }}>
              View All <ChevronRight size={14} />
            </button>
          </div>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", alignItems: "center" }}>
            <div style={{
              width: "64px", height: "64px", borderRadius: "16px",
              backgroundColor: latestPerformance.grade === "A" ? "#dcfce7" : latestPerformance.grade === "B" ? "#dbeafe" : latestPerformance.grade === "C" ? "#fef9c3" : "#fee2e2",
              display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
            }}>
              <span style={{
                fontSize: "28px", fontWeight: 800,
                color: latestPerformance.grade === "A" ? "#16a34a" : latestPerformance.grade === "B" ? "#2563eb" : latestPerformance.grade === "C" ? "#ca8a04" : "#dc2626",
              }}>{latestPerformance.grade}</span>
            </div>
            <div style={{ flex: 1, minWidth: "200px" }}>
              <p style={{ margin: "0 0 4px", fontSize: "14px", fontWeight: 600, color: "var(--color-text-primary)" }}>
                {new Date(0, latestPerformance.period.month - 1).toLocaleString("en", { month: "long" })} {latestPerformance.period.year}
              </p>
              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "8px", backgroundColor: "var(--color-accent-bg)", color: "var(--color-accent)" }}>
                  Score: {latestPerformance.finalScore?.toFixed(1) ?? "—"}
                </span>
                <span style={{ fontSize: "12px", fontWeight: 600, padding: "3px 10px", borderRadius: "8px", backgroundColor: "#f3e8ff", color: "#9333ea", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Star size={11} /> Rating: {latestPerformance.managerRating}/5
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </EmployeeLayout>
  );
};

export default EmployeeDashboard;
