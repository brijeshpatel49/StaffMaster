// src/components/Sidebar.jsx

import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import ThemeToggle from "./ThemeToggle";
import {
  LayoutDashboard,
  Building2,
  UserCog,
  Users,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import logo from "../assets/logo.png";

const MENU_BY_ROLE = {
  admin: [
    { path: "/admin/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/admin/departments", icon: Building2, label: "Departments" },
    { path: "/admin/hr", icon: UserCog, label: "HR Management" },
    { path: "/admin/employees", icon: Users, label: "Employees" },
  ],
  hr: [
    { path: "/hr/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { path: "/hr/departments", icon: Building2, label: "Departments" },
    { path: "/hr/employees", icon: Users, label: "Employees" },
  ],
  manager: [
    { path: "/manager/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  ],
  employee: [
    { path: "/employee/dashboard", icon: LayoutDashboard, label: "My Profile" },
  ],
};

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
  const { logout, user } = useAuth();
  const { mode } = useTheme();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const active = (path) => location.pathname === path;
  const menuItems = MENU_BY_ROLE[user?.role] || MENU_BY_ROLE.admin;

  return (
    <div
      className="fixed left-0 top-0 h-screen z-20 flex flex-col transition-all duration-300 overflow-visible"
      style={{
        width: isCollapsed ? "80px" : "240px",
        backgroundColor: "var(--color-surface)",
        /* No border — seamless background with page bg */
      }}
    >
      {/* ── Logo ── */}
      <div
        className={`flex items-center gap-3 p-4 mt-2 ${isCollapsed ? "justify-center" : "justify-start"}`}
      >
        <Link to="/" className="shrink-0">
          <div className="w-12 h-12 rounded-2xl overflow-hidden flex items-center justify-center">
            <img
              src={logo}
              alt="StaffMaster"
              className="w-full h-full object-contain"
            />
          </div>
        </Link>
        {!isCollapsed && (
          <span
            className="font-bold text-[15px] whitespace-nowrap"
            style={{ color: "var(--color-text-primary)" }}
          >
            StaffMaster
          </span>
        )}
      </div>

      {/* ── Navigation ── */}
      <nav
        className={`flex-1 flex flex-col justify-center gap-1 ${isCollapsed ? "items-center px-4" : "items-stretch px-3"}`}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = active(item.path);
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
                <Icon size={22} className="shrink-0" />
                {!isCollapsed && (
                  <span className="font-semibold text-sm whitespace-nowrap">
                    {item.label}
                  </span>
                )}
              </Link>
              {isCollapsed && hoveredItem === item.path && (
                <Tooltip label={item.label} />
              )}
            </div>
          );
        })}
      </nav>

      {/* ── Theme Toggle ── */}
      <div
        className={`flex items-center gap-3 py-3 relative ${isCollapsed ? "justify-center" : "px-4"}`}
        onMouseEnter={() => setHoveredItem("theme")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <ThemeToggle size={38} />
        {!isCollapsed && (
          <span
            className="text-[13px] font-semibold"
            style={{ color: "var(--color-text-muted)" }}
          >
            {mode === "dark" ? "Light Mode" : "Dark Mode"}
          </span>
        )}
        {isCollapsed && hoveredItem === "theme" && (
          <Tooltip label={mode === "dark" ? "Light Mode" : "Dark Mode"} />
        )}
      </div>

      {/* ── User Profile ── */}
      <div
        className="px-4 py-3 relative"
        style={{ borderTop: "1px solid var(--color-border)" }}
        onMouseEnter={() => setHoveredItem("profile")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <Link
          to="/profile"
          className="flex items-center rounded-2xl gap-2.5 no-underline transition-all duration-200"
          style={{
            width: isCollapsed ? "48px" : "100%",
            height: isCollapsed ? "48px" : "auto",
            justifyContent: isCollapsed ? "center" : "flex-start",
            padding: isCollapsed ? "0" : "6px",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "var(--color-border-light)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
          }}
        >
          <div
            className="w-[38px] h-[38px] rounded-full overflow-hidden shrink-0"
            style={{ border: "2px solid var(--color-accent-border)" }}
          >
            <img
              src={`https://ui-avatars.com/api/?name=${encodeURIComponent(user?.fullName || "Employee")}&background=fbbf24&color=fff&length=1`}
              alt={user?.fullName || "Employee"}
              className="w-full h-full object-cover"
            />
          </div>
          {!isCollapsed && (
            <div className="flex flex-col flex-1 min-w-0">
              <span
                className="font-semibold text-[13px] truncate"
                style={{ color: "var(--color-text-primary)" }}
              >
                {user?.fullName || "Employee"}
              </span>
              <span
                className="text-[11px] capitalize truncate"
                style={{ color: "var(--color-text-muted)" }}
              >
                {user?.role || "Employee"}
              </span>
            </div>
          )}
        </Link>
        {isCollapsed && hoveredItem === "profile" && (
          <Tooltip label={user?.fullName || "My Profile"} />
        )}
      </div>

      {/* ── Logout ── */}
      <div
        className="px-4 py-2 mb-3 relative"
        onMouseEnter={() => setHoveredItem("logout")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <button
          onClick={logout}
          className="flex items-center h-12 rounded-2xl border-none bg-transparent gap-3 transition-all duration-200 cursor-pointer"
          style={{
            width: isCollapsed ? "48px" : "100%",
            justifyContent: isCollapsed ? "center" : "flex-start",
            padding: isCollapsed ? "0" : "0 14px",
            color: "var(--color-text-muted)",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.10)";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "var(--color-text-muted)";
          }}
        >
          <LogOut size={22} className="shrink-0" />
          {!isCollapsed && (
            <span className="font-semibold text-sm whitespace-nowrap">
              Sign Out
            </span>
          )}
        </button>
        {isCollapsed && hoveredItem === "logout" && (
          <Tooltip label="Sign Out" />
        )}
      </div>

      {/* ── Collapse button ── */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="absolute -right-3.5 top-[76px] w-7 h-7 rounded-full flex items-center justify-center cursor-pointer shadow-md z-30 transition-all duration-200"
        style={{
          backgroundColor: "var(--color-surface)",
          border: "1px solid var(--color-border)",
          color: "var(--color-text-muted)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-border-light)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-surface)";
        }}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </div>
  );
};

export default Sidebar;
