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
  active: { bg: "#dcfce7", text: "#15803d" },
  resigned: { bg: "#fef9c3", text: "#a16207" },
  terminated: { bg: "#fee2e2", text: "#b91c1c" },
};

const EMP_TYPE_STYLE = {
  "full-time": { bg: "#dbeafe", text: "#1d4ed8" },
  "part-time": { bg: "#f3e8ff", text: "#7e22ce" },
  contract: { bg: "#ffedd5", text: "#c2410c" },
};

const Badge = ({ label, styleMap }) => {
  const s = styleMap[label] || { bg: "#f3f4f6", text: "#374151" };
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
      className="w-[min(520px,92vw)] h-screen bg-white overflow-y-auto shadow-[-8px_0_40px_rgba(0,0,0,0.12)] flex flex-col"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Header */}
      <div className="p-6 border-b border-gray-100 flex items-center justify-between gap-3 sticky top-0 bg-white z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="bg-transparent border-none cursor-pointer text-gray-500 flex items-center focus:outline-none hover:text-gray-800 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="m-0 text-[17px] font-bold text-gray-900 leading-tight">
              {dept?.name}
            </h2>
            <p className="m-0 text-xs text-gray-400 mt-1">
              {loading
                ? "Loading…"
                : `${employees.length} employee${employees.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="bg-gray-100 border-none rounded-lg w-8 h-8 flex items-center justify-center cursor-pointer text-gray-500 hover:bg-gray-200 transition-colors focus:outline-none"
        >
          <X size={16} />
        </button>
      </div>

      {/* Content */}
      <div className="p-4 sm:p-6 flex-1 bg-gray-50/30">
        {loading ? (
          <div className="flex justify-center p-16">
            <div className="w-9 h-9 border-4 border-yellow-200 border-t-yellow-500 rounded-full animate-spin" />
          </div>
        ) : employees.length === 0 ? (
          <div className="text-center p-16 text-gray-400">
            <div className="mx-auto bg-gray-100 w-16 h-16 rounded-full flex items-center justify-center mb-4 text-gray-300">
              <Users size={32} />
            </div>
            <p className="text-sm font-medium">
              No employees in this department.
            </p>
            <p className="text-xs mt-2 text-gray-400">
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
                  className="p-4 rounded-xl border border-gray-200/60 bg-white flex items-center gap-4 hover:shadow-sm hover:border-gray-300 transition-all"
                >
                  <div className="w-12 h-12 rounded-[10px] bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold text-sm shrink-0">
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0 pr-2">
                    <p className="m-0 text-[14px] font-bold text-gray-900 truncate">
                      {emp.fullName}
                    </p>
                    <p className="m-0 text-xs text-gray-500 truncate mt-1">
                      {emp.designation} · {formatDate(emp.joiningDate)}
                    </p>
                    <p className="m-0 text-xs text-gray-400 truncate mt-0.5">
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
