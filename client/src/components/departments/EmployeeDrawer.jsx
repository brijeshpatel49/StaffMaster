import { X, ArrowLeft, Users } from "lucide-react";

const formatDate = (d) =>
  d
    ? new Date(d).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_STYLE = {
  active: { bg: "rgba(34, 197, 94, 0.1)", text: "#22c55e" },
  resigned: { bg: "rgba(234, 179, 8, 0.1)", text: "#eab308" },
  terminated: { bg: "rgba(239, 68, 68, 0.1)", text: "#ef4444" },
};

const EMP_TYPE_STYLE = {
  "full-time": { bg: "rgba(59, 130, 246, 0.1)", text: "#3b82f6" },
  "part-time": { bg: "rgba(168, 85, 247, 0.1)", text: "#a855f7" },
  contract: { bg: "rgba(249, 115, 22, 0.1)", text: "#f97316" },
};

const Badge = ({ label, styleMap }) => {
  const s = styleMap[label] || {
    bg: "rgba(107, 114, 128, 0.1)",
    text: "#6b7280",
  };
  return (
    <span
      className="text-[11px] font-semibold px-2.5 py-1 rounded-full whitespace-nowrap capitalize"
      style={{ backgroundColor: s.bg, color: s.text }}
    >
      {label}
    </span>
  );
};

const EmployeeDrawer = ({ dept, employees, loading, onClose }) => (
  <div
    className="fixed inset-0 z-50 flex items-stretch justify-end bg-black/25 backdrop-blur-[2px]"
    onClick={onClose}
  >
    <div
      className="w-[min(520px,92vw)] h-screen bg-[var(--color-card)] overflow-y-auto  flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-6 border-b border-[var(--color-border)] flex items-center justify-between gap-3 sticky top-0 bg-[var(--color-card)] z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-[var(--color-text-muted)] flex items-center focus:outline-none hover:text-[var(--color-text-primary)] transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="m-0 text-[17px] font-bold text-[var(--color-text-primary)] leading-tight">
              {dept?.name}
            </h2>
            <p className="m-0 text-xs text-[var(--color-text-muted)] mt-1">
              {loading
                ? "Loading…"
                : `${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-[var(--color-surface)] border-none rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-[var(--color-text-muted)] hover:bg-gray-200 transition-colors focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 flex-1 bg-[var(--color-surface)]">
        {loading ? (
          <div className="flex justify-center p-16">
            <div className="w-9 h-9 border-4 border-yellow-500/20 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center p-16 text-[var(--color-text-muted)]">
            <div className="mx-auto bg-[var(--color-surface)] w-16 h-16 rounded-full flex items-center justify-center mb-4 text-[var(--color-text-muted)]">
              <Users size={32} />
            </div>
            <p className="text-sm font-medium">
              No employees in this department.
            </p>
            <p className="text-xs mt-2 text-[var(--color-text-muted)]">
              Add employees to see them list here.
            </p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {employees.map((emp, i) => {
              const initials = emp.fullName
                .split(" ")
                .map((n) => n[0])
                .join("")
                .toUpperCase()
                .slice(0, 2);
              return (
                <div
                  key={emp._id || i}
                  className="p-4 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] flex items-center gap-4 hover: hover:border-gray-300 transition-all"
                >
                  <div className="w-12 h-12 rounded-[10px] bg-indigo-500/5 text-indigo-500 flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="m-0 text-[14px] font-bold text-[var(--color-text-primary)] truncate">
                      {emp.fullName}
                    </p>
                    <p className="m-0 text-xs text-[var(--color-text-muted)] truncate mt-1">
                      {emp.designation} · {formatDate(emp.joiningDate)}
                    </p>
                    <p className="m-0 text-xs text-[var(--color-text-muted)] truncate mt-0.5">
                      {emp.email}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <Badge label={emp.status} styleMap={STATUS_STYLE} />
                    <Badge
                      label={emp.employmentType}
                      styleMap={EMP_TYPE_STYLE}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  </div>
);

export default EmployeeDrawer;
