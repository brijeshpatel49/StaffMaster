import { useState } from "react";
import Sidebar from "../Sidebar";

/**
 * Shared layout for all role-based dashboards (Admin, HR, etc.)
 * Renders the common Sidebar + a responsive content area.
 */
const DashboardLayout = ({ children, title, subtitle }) => {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <div className="min-h-screen bg-[#FDFDF9]">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      {/* Main content — shifts with sidebar */}
      <div
        className="transition-all duration-300 p-8"
        style={{ marginLeft: isCollapsed ? "80px" : "240px" }}
      >
        <header className="mb-8 flex justify-between items-end">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-gray-500 mt-2 font-medium">{subtitle}</p>
            )}
          </div>
        </header>
        <main>{children}</main>
      </div>

      {/* Subtle background blobs */}
      <div className="fixed top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
        <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-200/20 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[400px] h-[400px] bg-orange-100/30 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
      </div>
    </div>
  );
};

export default DashboardLayout;
