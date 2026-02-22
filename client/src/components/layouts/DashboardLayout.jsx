// src/components/layouts/DashboardLayout.jsx

import { useState } from "react";
import Sidebar from "../Sidebar";

const DashboardLayout = ({ children, title, subtitle }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div
      className="min-h-screen transition-colors duration-300"
      style={{ backgroundColor: "var(--color-page-bg)" }}
    >
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <div
        className="transition-all duration-300 p-8"
        style={{ marginLeft: isCollapsed ? "80px" : "240px" }}
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
  );
};

export default DashboardLayout;