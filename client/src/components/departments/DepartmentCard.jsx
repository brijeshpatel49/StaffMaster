import { Building2, Users, ChevronRight, Edit2, Power } from "lucide-react";

const DepartmentCard = ({
  dept,
  onViewEmployees,
  onEdit,
  onToggleStatus,
  isAdmin,
}) => {
  const statusLabel = dept.isActive ? "Active" : "Inactive";
  const managerName = dept.manager?.fullName || "No manager assigned";
  const managerInitials = dept.manager?.fullName
    ?.split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="group bg-[var(--color-card)] rounded-2xl border border-[var(--color-border)] px-4 py-4 md:px-5 md:py-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-accent-border)] hover:shadow-[0_10px_26px_rgba(0,0,0,0.08)] dark:hover:shadow-[0_10px_26px_rgba(0,0,0,0.34)]">
      <div className="flex flex-col md:flex-row md:items-center gap-4 md:gap-5">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-11 h-11 rounded-xl bg-[var(--color-accent-bg)] border border-[var(--color-accent-border)] flex items-center justify-center shrink-0">
            <Building2 size={20} className="text-[var(--color-accent)]" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="m-0 text-[17px] leading-tight font-bold text-[var(--color-text-primary)] truncate">
                {dept.name}
              </h3>
              <span className="text-[11px] font-semibold text-[var(--color-text-muted)] bg-[var(--color-surface)] border border-[var(--color-border-light)] px-2.5 py-1 rounded-md">
                {dept.code}
              </span>
            </div>
            <p className="m-0 mt-2 text-[13px] leading-5 text-[var(--color-text-muted)] line-clamp-2">
              {dept.description || "No description added for this department yet."}
            </p>
          </div>
        </div>

        <div className="md:w-[250px] w-full rounded-xl bg-[var(--color-surface)] border border-[var(--color-border-light)] px-3.5 py-2.5">
          <p className="m-0 text-[11px] font-semibold text-[var(--color-text-muted)] uppercase tracking-wide">Manager</p>
          <div className="mt-1.5 flex items-center gap-2.5 min-w-0">
            {dept.manager ? (
              <div className="w-8 h-8 rounded-full bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-[11px] font-bold text-indigo-500 shrink-0">
                {managerInitials}
              </div>
            ) : (
              <div className="w-8 h-8 rounded-full border border-dashed border-[var(--color-border)] flex items-center justify-center text-[var(--color-text-muted)] text-[10px] font-semibold shrink-0">
                --
              </div>
            )}
            <p className="m-0 text-[13px] font-semibold text-[var(--color-text-secondary)] truncate">{managerName}</p>
          </div>
        </div>

        <div className="flex items-center justify-between md:justify-end gap-3 md:gap-2.5 md:min-w-fit">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${dept.isActive ? "bg-green-500/10 text-green-500" : "bg-red-500/10 text-red-500"}`}>
            {statusLabel}
          </span>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => onEdit(dept)}
                title="Edit Department"
                className="w-8 h-8 rounded-lg border border-[var(--color-border-light)] bg-[var(--color-surface)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] flex items-center justify-center text-[var(--color-text-muted)] transition-colors"
              >
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => onToggleStatus(dept._id)}
                title={dept.isActive ? "Deactivate" : "Activate"}
                className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors ${
                  dept.isActive
                    ? "border-green-500/20 bg-green-500/5 text-green-500 hover:bg-green-500/10"
                    : "border-red-500/20 bg-red-500/5 text-red-500 hover:bg-red-500/10"
                }`}
              >
                <Power size={15} />
              </button>
            </div>
          )}

          <button
            onClick={() => onViewEmployees(dept)}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl border border-[var(--color-accent-border)] bg-[var(--color-accent)] text-[var(--color-btn-text)] font-bold text-[12px] cursor-pointer hover:bg-[var(--color-accent-hover)] transition-colors"
          >
            <Users size={15} />
            View Employees
            <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
};

export default DepartmentCard;
