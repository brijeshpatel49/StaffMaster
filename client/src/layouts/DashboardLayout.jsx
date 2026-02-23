// src/layouts/DashboardLayout.jsx

import { useState } from "react";
import Sidebar from "../components/Sidebar";

const SIDEBAR_KEY = "sidebar_collapsed";

const DashboardLayout = ({ children, title, subtitle }) => {
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem(SIDEBAR_KEY);
      return saved === null ? true : JSON.parse(saved);
    } catch {
      return true;
    }
  });

  const handleSetIsCollapsed = (value) => {
    const next = typeof value === "function" ? value(isCollapsed) : value;
    try { localStorage.setItem(SIDEBAR_KEY, JSON.stringify(next)); } catch {}
    setIsCollapsed(next);
  };

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--color-page-bg)" }}
    >
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={handleSetIsCollapsed} />

      {/* ── Main content panel ── */}
      <div
        className="transition-all duration-300 p-3"
        style={{ marginLeft: isCollapsed ? "80px" : "240px" }}
      >
        <div
          className="min-h-[calc(100vh-24px)] rounded-3xl p-8 transition-colors duration-300"
          style={{
            backgroundColor: "var(--color-content-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <header className="mb-8">
            <h1
              className="text-3xl font-bold tracking-tight"
              style={{ color: "var(--color-text-primary)" }}
            >
              {title}
            </h1>
            {subtitle && (
              <p className="mt-1.5 font-medium" style={{ color: "var(--color-text-secondary)" }}>
                {subtitle}
              </p>
            )}
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
