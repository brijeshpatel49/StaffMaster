import { Building2, Users, ChevronRight, Edit2, Power } from "lucide-react";

const DepartmentCard = ({
  dept,
  onViewEmployees,
  onEdit,
  onToggleStatus,
  isAdmin,
}) => (
  <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.08)] transition-all flex flex-col gap-4">
    {/* Icon + name */}
    <div className="flex items-start gap-4">
      <div className="w-12 h-12 rounded-xl bg-yellow-100 flex items-center justify-center shrink-0">
        <Building2 size={24} className="text-yellow-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="m-0 text-base font-bold text-gray-900 truncate">
          {dept.name}
        </h3>
        <span className="text-xs font-semibold text-gray-500 bg-gray-50 px-2 py-1 rounded-md inline-block mt-1">
          {dept.code}
        </span>
      </div>

      {/* Actions (Admin Only) */}
      {isAdmin && (
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(dept)}
            title="Edit Department"
            className="w-8 h-8 rounded-lg bg-gray-50 hover:bg-gray-100 flex items-center justify-center text-gray-500 transition-colors"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={() => onToggleStatus(dept._id)}
            title={dept.isActive ? "Deactivate" : "Activate"}
            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${
              dept.isActive
                ? "bg-green-50 text-green-600 hover:bg-green-100"
                : "bg-red-50 text-red-600 hover:bg-red-100"
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
              ? "bg-green-100 text-green-700"
              : "bg-red-100 text-red-700"
          }`}
        >
          {dept.isActive ? "Active" : "Inactive"}
        </span>
      )}
    </div>

    {/* Description */}
    {dept.description && (
      <p className="m-0 text-[13px] text-gray-500 line-clamp-2">
        {dept.description}
      </p>
    )}

    {/* Manager */}
    {dept.manager ? (
      <div className="flex items-center gap-2.5 mt-auto pt-2">
        <div className="w-8 h-8 rounded-full bg-indigo-50 flex items-center justify-center text-[11px] font-bold text-indigo-700">
          {dept.manager.fullName
            ?.split(" ")
            .map((n) => n[0])
            .join("")
            .slice(0, 2)
            .toUpperCase()}
        </div>
        <div>
          <p className="m-0 text-[13px] font-semibold text-gray-700">
            {dept.manager.fullName}
          </p>
          <p className="m-0 text-[11px] text-gray-400">Manager</p>
        </div>
      </div>
    ) : (
      <div className="flex items-center gap-2.5 mt-auto pt-2">
        <div className="w-8 h-8 rounded-full border border-dashed border-gray-300 flex items-center justify-center text-gray-400">
          ?
        </div>
        <p className="m-0 text-[13px] font-medium text-gray-400">
          No manager assigned
        </p>
      </div>
    )}

    {/* View Employees button */}
    <button
      onClick={() => onViewEmployees(dept)}
      className="flex items-center justify-center gap-1.5 w-full py-2.5 rounded-xl border-none bg-yellow-400 text-gray-900 font-bold text-[13px] cursor-pointer hover:bg-yellow-500 transition-colors mt-2"
    >
      <Users size={16} />
      View Employees
      <ChevronRight size={14} />
    </button>
  </div>
);

export default DepartmentCard;
