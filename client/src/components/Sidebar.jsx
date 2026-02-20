import { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
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

// Menu items per role
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
};

const Sidebar = ({ isCollapsed, setIsCollapsed }) => {
  const { logout, user } = useAuth();
  const location = useLocation();
  const [hoveredItem, setHoveredItem] = useState(null);

  const isActive = (path) => location.pathname === path;
  const menuItems = MENU_BY_ROLE[user?.role] || MENU_BY_ROLE.admin;

  return (
    <div
      style={{
        width: isCollapsed ? "80px" : "240px",
        position: "fixed",
        left: 0,
        top: 0,
        height: "100vh",
        zIndex: 20,
        background: "transparent",
        display: "flex",
        flexDirection: "column",
        transition: "width 0.3s ease",
        overflow: "visible",
      }}
    >
      {/* Logo */}
      <div
        style={{
          padding: "16px",
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          gap: "10px",
          marginTop: "8px",
        }}
      >
        <Link to="/" style={{ flexShrink: 0 }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "16px",
              overflow: "hidden",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <img
              src={logo}
              alt="StaffMaster"
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </Link>
        {!isCollapsed && (
          <span
            style={{
              fontWeight: 700,
              fontSize: "15px",
              color: "#1f2937",
              whiteSpace: "nowrap",
            }}
          >
            StaffMaster
          </span>
        )}
      </div>

      {/* Navigation */}
      <nav
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: isCollapsed ? "center" : "stretch",
          justifyContent: "center",
          padding: isCollapsed ? "0 16px" : "0 12px",
          gap: "4px",
        }}
      >
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <div
              key={item.path}
              style={{ position: "relative" }}
              onMouseEnter={() => setHoveredItem(item.path)}
              onMouseLeave={() => setHoveredItem(null)}
            >
              <Link
                to={item.path}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: isCollapsed ? "center" : "flex-start",
                  width: isCollapsed ? "48px" : "100%",
                  height: "48px",
                  borderRadius: "14px",
                  textDecoration: "none",
                  gap: "12px",
                  padding: isCollapsed ? "0" : "0 14px",
                  backgroundColor: active ? "#fef08a" : "transparent",
                  color: active ? "#b45309" : "#9ca3af",
                  boxShadow: active
                    ? "0 2px 8px rgba(250,204,21,0.35)"
                    : "none",
                  transition: "all 0.2s",
                  marginBottom: "4px",
                }}
                onMouseOver={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "#f3f4f6";
                    e.currentTarget.style.color = "#374151";
                  }
                }}
                onMouseOut={(e) => {
                  if (!active) {
                    e.currentTarget.style.backgroundColor = "transparent";
                    e.currentTarget.style.color = "#9ca3af";
                  }
                }}
              >
                <Icon size={22} style={{ flexShrink: 0 }} />
                {!isCollapsed && (
                  <span
                    style={{
                      fontWeight: 600,
                      fontSize: "14px",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {item.label}
                  </span>
                )}
              </Link>

              {/* Tooltip (collapsed mode only) */}
              {isCollapsed && hoveredItem === item.path && (
                <div
                  style={{
                    position: "absolute",
                    left: "calc(100% + 12px)",
                    top: "50%",
                    transform: "translateY(-50%)",
                    backgroundColor: "#111827",
                    color: "#fff",
                    padding: "6px 12px",
                    borderRadius: "8px",
                    fontSize: "13px",
                    fontWeight: 500,
                    whiteSpace: "nowrap",
                    pointerEvents: "none",
                    zIndex: 9999,
                    boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      right: "100%",
                      top: "50%",
                      transform: "translateY(-50%)",
                      borderTop: "5px solid transparent",
                      borderBottom: "5px solid transparent",
                      borderRight: "5px solid #111827",
                    }}
                  />
                  {item.label}
                </div>
              )}
            </div>
          );
        })}
      </nav>

      {/* User Avatar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: isCollapsed ? "center" : "flex-start",
          padding: "12px 16px",
          gap: "10px",
          marginBottom: "4px",
        }}
      >
        <div
          style={{
            width: "38px",
            height: "38px",
            borderRadius: "50%",
            overflow: "hidden",
            flexShrink: 0,
          }}
        >
          <img
            src="https://ui-avatars.com/api/?name=Admin&background=fbbf24&color=fff"
            alt="Admin"
            style={{ width: "100%", height: "100%", objectFit: "cover" }}
          />
        </div>
        {!isCollapsed && (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span
              style={{ fontWeight: 600, fontSize: "13px", color: "#1f2937" }}
            >
              Admin
            </span>
            <span style={{ fontSize: "11px", color: "#9ca3af" }}>
              Administrator
            </span>
          </div>
        )}
      </div>

      {/* Logout */}
      <div
        style={{
          padding: "8px 16px",
          marginBottom: "12px",
          position: "relative",
        }}
        onMouseEnter={() => setHoveredItem("logout")}
        onMouseLeave={() => setHoveredItem(null)}
      >
        <button
          onClick={logout}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: isCollapsed ? "center" : "flex-start",
            width: isCollapsed ? "48px" : "100%",
            height: "48px",
            borderRadius: "14px",
            border: "none",
            background: "transparent",
            gap: "12px",
            padding: isCollapsed ? "0" : "0 14px",
            color: "#9ca3af",
            cursor: "pointer",
            transition: "all 0.2s",
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.backgroundColor = "#fef2f2";
            e.currentTarget.style.color = "#ef4444";
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.backgroundColor = "transparent";
            e.currentTarget.style.color = "#9ca3af";
          }}
        >
          <LogOut size={22} style={{ flexShrink: 0 }} />
          {!isCollapsed && (
            <span
              style={{
                fontWeight: 600,
                fontSize: "14px",
                whiteSpace: "nowrap",
              }}
            >
              Sign Out
            </span>
          )}
        </button>

        {/* Logout tooltip */}
        {isCollapsed && hoveredItem === "logout" && (
          <div
            style={{
              position: "absolute",
              left: "calc(100% + 12px)",
              top: "50%",
              transform: "translateY(-50%)",
              backgroundColor: "#111827",
              color: "#fff",
              padding: "6px 12px",
              borderRadius: "8px",
              fontSize: "13px",
              fontWeight: 500,
              whiteSpace: "nowrap",
              pointerEvents: "none",
              zIndex: 9999,
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            <div
              style={{
                position: "absolute",
                right: "100%",
                top: "50%",
                transform: "translateY(-50%)",
                borderTop: "5px solid transparent",
                borderBottom: "5px solid transparent",
                borderRight: "5px solid #111827",
              }}
            />
            Sign Out
          </div>
        )}
      </div>

      {/* Expand / Collapse Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        style={{
          position: "absolute",
          right: "-14px",
          top: "76px",
          width: "28px",
          height: "28px",
          borderRadius: "50%",
          backgroundColor: "#fff",
          border: "1.5px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          cursor: "pointer",
          boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
          zIndex: 30,
          color: "#6b7280",
        }}
        onMouseOver={(e) => (e.currentTarget.style.backgroundColor = "#f9fafb")}
        onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
        title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {isCollapsed ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
      </button>
    </div>
  );
};

export default Sidebar;
