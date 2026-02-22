import { Building2, Users, ChevronRight, Edit2, Power } from "lucide-react";

const DepartmentCard = ({
  dept,
  onViewEmployees,
  onEdit,
  onToggleStatus,
  isAdmin,
}) => (
  <div className="bg-[var(--color-card)] rounded-2xl p-6 border border-[var(--color-border)]  hover: transition-all flex flex-col gap-4">
    {/* Icon + name */}
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-yellow-500/10 flex items-center justify-center shrink-0">
        <Building2 size={24} className="text-yellow-500" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="m-0 text-base font-bold text-[var(--color-text-primary)] truncate">
          {dept.name}
        </h3>
        <span className="text-xs font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface)] px-2 py-1 rounded-md inline-block mt-1">
          {dept.code}
        </span>
      </div>

      {/* Actions (Admin Only) */}
      {isAdmin && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(dept)}
            title="Edit Department"
            className="w-8 h-8 rounded-lg bg-[var(--color-surface)] hover:bg-[var(--color-surface)] flex items-center justify-center text-[var(--color-text-muted)] transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onToggleStatus(dept._id)}
            title={dept.isActive ? "Deactivate" : "Activate"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              dept.isActive
                ? "bg-green-500/5 text-green-500 hover:bg-green-500/10"
                : "bg-red-500/5 text-red-500 hover:bg-red-500/10"
            }`}
          >
            <Power size={16} />
          </button>
        </div>
      )}

      {/* Status Badge (If HR or just viewing) */}
      {!isAdmin && (
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full shrink-0 ${
            dept.isActive
              ? "bg-green-500/10 text-green-500"
              : "bg-red-500/10 text-red-500"
          }`}
        >
          {dept.isActive ? "Active" : "Inactive"}
        </span>
      )}
    </div>

    {/* Description */}
    {dept.description && (
      <p className="m-0 text-[13px] text-[var(--color-text-muted)] line-clamp-2">
        {dept.description}
      </p>
    )}

    {/* Manager */}
    {dept.manager ? (
      <div className="flex items-center gap-2.5 mt-auto pt-2">
        <div className="w-8 h-8 rounded-full bg-indigo-500/5 flex items-center justify-center text-[11px] font-bold text-indigo-500">
          {dept.manager.fullName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <p className="m-0 text-[13px] font-semibold text-[var(--color-text-secondary)]">
            {dept.manager.fullName}
          </p>
          <p className="m-0 text-[11px] text-[var(--color-text-muted)]">Manager</p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 mt-auto pt-2">
        <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-[var(--color-text-muted)]">
          ?
        </div>
        <p className="m-0 text-[13px] font-medium text-[var(--color-text-muted)]">
          No manager assigned
        </p>
      </div>
    )}

    {/* View Employees button */}
    <button
      onClick={() => onViewEmployees(dept)}
      className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border-none bg-yellow-400 text-[var(--color-text-primary)] font-bold text-[13px] cursor-pointer hover:bg-yellow-500 transition-colors mt-2"
    >
      <Users size={16} />
      View Employees
      <ChevronRight size={14} />
    </button>
  </div>
);

export default DepartmentCard;
