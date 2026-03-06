import { useState, useEffect, useCallback, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../utils/api";
import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard,
  Building2,
  UserCog,
  Users,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  Clock,
  FileText,
  Megaphone,
  CheckSquare,
  CalendarDays,
  TrendingUp,
} from "lucide-react";

const MENU_BY_ROLE = {
  admin: [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/calendar", icon: CalendarDays, label: "Calendar" },
    { path: "/admin/departments", icon: Building2, label: "Departments" },
    { path: "/admin/hr", icon: UserCog, label: "HR Management" },
    { path: "/admin/employees", icon: Users, label: "Employees" },
    { path: "/admin/attendance", icon: Clock, label: "Attendance" },
    { path: "/admin/leave", icon: FileText, label: "Leave" },
    { path: "/admin/announcements", icon: Megaphone, label: "Announcements", badge: "announcements" },
    { path: "/admin/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/admin/performance", icon: TrendingUp, label: "Performance" },
  ],
  hr: [
    { path: "/hr/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/hr/calendar", icon: CalendarDays, label: "Calendar" },
    { path: "/hr/departments", icon: Building2, label: "Departments" },
    { path: "/hr/employees", icon: Users, label: "Employees" },
    { path: "/hr/attendance", icon: Clock, label: "Attendance" },
    { path: "/hr/leave", icon: FileText, label: "Leave" },
    { path: "/hr/announcements", icon: Megaphone, label: "Announcements", badge: "announcements" },
    { path: "/hr/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/hr/performance", icon: TrendingUp, label: "Performance" },
  ],
  manager: [
    { path: "/manager/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/manager/calendar", icon: CalendarDays, label: "Calendar" },
    { path: "/manager/attendance", icon: Clock, label: "Attendance" },
    { path: "/manager/leave", icon: FileText, label: "Leave" },
    { path: "/manager/announcements", icon: Megaphone, label: "Announcements", badge: "announcements" },
    { path: "/manager/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/manager/performance", icon: TrendingUp, label: "Performance" },
  ],
  employee: [
    { path: "/employee/dashboard", icon: LayoutDashboard, label: "My Profile" },
    { path: "/employee/calendar", icon: CalendarDays, label: "Calendar" },
    { path: "/employee/attendance", icon: Clock, label: "Attendance" },
    { path: "/employee/leave", icon: FileText, label: "Leave" },
    { path: "/employee/announcements", icon: Megaphone, label: "Announcements", badge: "announcements" },
    { path: "/employee/tasks", icon: CheckSquare, label: "Tasks" },
    { path: "/employee/performance", icon: TrendingUp, label: "Performance" },
  ],
};

const LAST_SEEN_KEY = "announcements_last_seen";

const Tooltip = ({ label }) => (
  <div
    className="absolute left-[calc(100%+12px)] top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-lg text-[13px] font-medium whitespace-nowrap pointer-events-none z-[9999] shadow-lg"
    style={{
      backgroundColor: "var(--color-text-primary)",
      color: "var(--color-page-bg)",
    }}
  >
    <div
      className="absolute right-full top-1/2 -translate-y-1/2 border-t-[5px] border-b-[5px] border-r-[5px] border-t-transparent border-b-transparent"
      style={{ borderRightColor: "var(--color-text-primary)" }}
    />
    {label}
  </div>
);

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { logout, user, API } = useAuth();
  const { mode } = useTheme();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);
  const [unreadCount, setUnreadCount] = useState(0);
  const [sidebarHovered, setSidebarHovered] = useState(false);
  const profileLeaveTimer = useRef(null);

  const openProfileMenu = () => {
    clearTimeout(profileLeaveTimer.current);
    setHoveredItem("profile");
  };
  const closeProfileMenu = () => {
    profileLeaveTimer.current = setTimeout(() => setHoveredItem(null), 250);
  };

  const active = (path) => location.pathname === path;
  const menuItems = MENU_BY_ROLE[user?.role] || MENU_BY_ROLE.admin;

  // Check if current page is the announcements page
  const isOnAnnouncementsPage = location.pathname.endsWith("/announcements");

  // Fetch unread announcement count
  const fetchUnreadCount = useCallback(async () => {
    try {
      const lastSeen = localStorage.getItem(`${LAST_SEEN_KEY}_${user?._id}`) || "";
      const url = lastSeen
        ? `${API}/announcements/unread-count?since=${encodeURIComponent(lastSeen)}`
        : `${API}/announcements/unread-count`;
      const result = await apiFetch(url);
      if (result?.data?.success) {
        setUnreadCount(result.data.count);
      }
    } catch {
      // Silently fail
    }
  }, [API, user?._id]);

  // Mark as seen when visiting announcements page
  useEffect(() => {
    if (isOnAnnouncementsPage) {
      localStorage.setItem(`${LAST_SEEN_KEY}_${user?._id}`, new Date().toISOString());
      setUnreadCount(0);
    }
  }, [isOnAnnouncementsPage, user?._id]);

  // Fetch count on mount and every 60s
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  return (
    <div
      className="fixed left-0 top-0 h-screen z-20 flex flex-col transition-all duration-300 overflow-visible"
      style={{
        width: isCollapsed ? "80px" : "240px",
        backgroundColor: "var(--color-surface)",
      }}
      onMouseEnter={() => setSidebarHovered(true)}
      onMouseLeave={() => setSidebarHovered(false)}
    >
      {/* ── Logo & Collapse/Expand Toggle ── */}
      <div className="flex flex-col p-4 mt-2 gap-2">
        <div className={`flex items-center w-full ${isCollapsed ? "justify-center" : "justify-between"}`}>
          {isCollapsed ? (
            /* Collapsed: logo fades into expand icon when sidebar is hovered */
            <div
              className="relative w-11 h-11 flex items-center justify-center cursor-pointer"
              onClick={() => setIsCollapsed(false)}
            >
              {/* Logo — fades out when sidebar hovered */}
              <div
                className="absolute inset-0 rounded-2xl overflow-hidden flex items-center justify-center transition-all duration-300"
                style={{ opacity: sidebarHovered ? 0 : 1 }}
              >
                <img
                  src="/logo-bg.png"
                  alt="StaffMaster"
                  className="w-full h-full object-contain"
                  style={mode === "dark" ? { filter: "invert(1)" } : {}}
                />
              </div>
              {/* Expand icon — fades in when sidebar hovered */}
              <div
                className="absolute inset-0 rounded-2xl flex items-center justify-center transition-all duration-300"
                style={{
                  opacity: sidebarHovered ? 1 : 0,
                  backgroundColor: sidebarHovered ? "var(--color-border-light)" : "transparent",
                  color: "var(--color-text-primary)",
                }}
              >
                <PanelLeftOpen size={18} />
              </div>
            </div>
          ) : (
            /* Expanded: logo + name + collapse button */
            <>
              <div className="flex items-center gap-3">
                <Link to="/" className="shrink-0" onClick={(e) => e.stopPropagation()}>
                  <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center">
                    <img
                      src="/logo-bg.png"
                      alt="StaffMaster"
                      className="w-full h-full object-contain transition-all duration-300"
                      style={mode === "dark" ? { filter: "invert(1)" } : {}}
                    />
                  </div>
                </Link>
                <span
                  className="font-bold text-[15px] whitespace-nowrap"
                  style={{ color: "var(--color-text-primary)" }}
                >
                  StaffMaster
                </span>
              </div>
              <button
                onClick={() => setIsCollapsed(true)}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 border-none"
                style={{
                  backgroundColor: "transparent",
                  color: "var(--color-text-muted)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = "var(--color-border-light)";
                  e.currentTarget.style.color = "var(--color-text-primary)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = "transparent";
                  e.currentTarget.style.color = "var(--color-text-muted)";
                }}
                title="Collapse sidebar"
              >
                <PanelLeftClose size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <nav
        className={`flex-1 flex flex-col justify-center gap-1 ${isCollapsed ? "items-center px-4" : "items-stretch px-3"}`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = active(item.path);
          const badgeCount = item.badge === "announcements" ? unreadCount : 0;
          return (
            <div
              key={item.path}
              className="relative"
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                to={item.path}
                className="flex items-center h-12 rounded-2xl mb-1 transition-all duration-200 no-underline gap-3"
                style={{
                  width: isCollapsed ? "48px" : "100%",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  padding: isCollapsed ? "0" : "0 14px",
                  backgroundColor: isActive
                    ? "var(--color-accent-bg)"
                    : "transparent",
                  color: isActive
                    ? "var(--color-accent)"
                    : "var(--color-text-muted)",
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor =
                      "var(--color-border-light)";
                    e.currentTarget.style.color = "var(--color-text-primary)";
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "var(--color-text-muted)";
                  }
                }}
              >
                <div className="relative shrink-0">
                  <Icon size={22} />
                  {/* Dot badge on icon when collapsed */}
                  {isCollapsed && badgeCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-[8px] h-[8px] rounded-full"
                      style={{ backgroundColor: "#ef4444" }}
                    />
                  )}
                </div>
                {!isCollapsed && (
                  <>
                    <span className="font-semibold text-sm whitespace-nowrap flex-1">
                      {item.label}
                    </span>
                    {badgeCount > 0 && (
                      <span
                        className="ml-auto px-[7px] py-[1px] rounded-full text-[11px] font-bold min-w-[20px] text-center leading-[18px]"
                        style={{
                          backgroundColor: "#ef4444",
                          color: "#fff",
                        }}
                      >
                        {badgeCount > 99 ? "99+" : badgeCount}
                      </span>
                    )}
                  </>
                )}
              </Link>
              {isCollapsed && hoveredItem === item.path && (
                <Tooltip label={badgeCount > 0 ? `${item.label} (${badgeCount})` : item.label} />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Theme Toggle ── */}
      <div
        className={`py-3 relative ${isCollapsed ? "flex justify-center px-4" : "px-4"}`}
        onMouseEnter={() => setHoveredItem("theme")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <ThemeToggle compact={isCollapsed} />
        {isCollapsed && hoveredItem === "theme" && (
          <Tooltip label={mode === "dark" ? "Light Mode" : "Dark Mode"} />
        )}
      </div>

      {/* ── User Profile + Sign Out ── */}
      <div className={`px-4 ${isCollapsed ? "py-2 mb-3" : "py-3 mb-2"}`}>
        <div
          className="relative"
          onMouseEnter={openProfileMenu}
          onMouseLeave={closeProfileMenu}
        >
          {/* Collapsed: avatar + flyout popup */}
          {isCollapsed ? (
            <>
              <div className="flex justify-center">
                <div
                  className="w-[42px] h-[42px] rounded-full overflow-hidden cursor-pointer transition-all duration-200"
                  style={{ border: "2px solid var(--color-accent-border)" }}
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "Employee")}&background=fbbf24&color=fff&length=1`}
                    alt={user?.fullName || "Employee"}
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
              {/* Flyout popup */}
              {hoveredItem === "profile" && (
                <div
                  className="absolute bottom-0 left-[calc(100%+4px)] rounded-xl shadow-xl overflow-hidden z-[9999] min-w-[160px]"
                  style={{
                    backgroundColor: "var(--color-surface)",
                    border: "1px solid var(--color-border-light)",
                  }}
                  onMouseEnter={openProfileMenu}
                  onMouseLeave={closeProfileMenu}
                >
                  {/* User info header */}
                  <div
                    className="px-4 py-3 border-b"
                    style={{ borderColor: "var(--color-border-light)" }}
                  >
                    <p className="font-semibold text-[13px] truncate" style={{ color: "var(--color-text-primary)" }}>
                      {user?.fullName || "Employee"}
                    </p>
                    <p className="text-[11px] capitalize" style={{ color: "var(--color-text-muted)" }}>
                      {user?.role || "Employee"}
                    </p>
                  </div>
                  {/* My Profile */}
                  <Link
                    to="/profile"
                    className="flex items-center gap-3 px-4 py-2.5 no-underline transition-colors duration-150"
                    style={{ color: "var(--color-text-secondary)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-border-light)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <Users size={15} />
                    <span className="text-[13px] font-medium">My Profile</span>
                  </Link>
                  {/* Sign Out */}
                  <button
                    onClick={logout}
                    className="w-full flex items-center gap-3 px-4 py-2.5 border-none cursor-pointer transition-colors duration-150"
                    style={{ backgroundColor: "transparent", color: "#ef4444" }}
                    onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.08)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; }}
                  >
                    <LogOut size={15} />
                    <span className="text-[13px] font-medium">Sign Out</span>
                  </button>
                </div>
              )}
            </>
          ) : (
            /* Expanded: avatar + name/role + logout icon */
            <div className="flex items-center gap-2.5 rounded-2xl" style={{ padding: "6px" }}>
              <Link
                to="/profile"
                className="flex items-center flex-1 min-w-0 gap-2.5 no-underline"
              >
                <div
                  className="w-[36px] h-[36px] rounded-full overflow-hidden shrink-0"
                  style={{ border: "2px solid var(--color-accent-border)" }}
                >
                  <img
                    src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "Employee")}&background=fbbf24&color=fff&length=1`}
                    alt={user?.fullName || "Employee"}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex flex-col flex-1 min-w-0">
                  <span className="font-semibold text-[13px] truncate" style={{ color: "var(--color-text-primary)" }}>
                    {user?.fullName || "Employee"}
                  </span>
                  <span className="text-[11px] capitalize truncate" style={{ color: "var(--color-text-muted)" }}>
                    {user?.role || "Employee"}
                  </span>
                </div>
              </Link>
              <button
                onClick={logout}
                className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-200 border-none shrink-0"
                style={{ backgroundColor: "transparent", color: "var(--color-text-muted)" }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.10)"; e.currentTarget.style.color = "#ef4444"; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "transparent"; e.currentTarget.style.color = "var(--color-text-muted)"; }}
                title="Sign Out"
              >
                <LogOut size={17} />
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
