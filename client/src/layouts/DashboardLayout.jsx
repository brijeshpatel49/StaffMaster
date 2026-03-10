// src/layouts/DashboardLayout.jsx

import { useState, useEffect, useRef } from "react";
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

  const [mobileOpen, setMobileOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Content margin: snaps instantly on collapse, delays on expand
  // translateX bridges the visual gap during animation
  const [contentMargin, setContentMargin] = useState(
    () => (typeof window !== "undefined" && window.innerWidth <= 767) ? 0 : (isCollapsed ? "80px" : "240px")
  );
  const [slideX, setSlideX] = useState(0);
  const marginTimer = useRef(null);

  useEffect(() => {
    if (isMobile) { setContentMargin(0); setSlideX(0); return; }
    clearTimeout(marginTimer.current);
    if (isCollapsed) {
      // Collapse: set translateX to cover the 160px gap, then snap margin + remove translate
      setSlideX(-160);
      requestAnimationFrame(() => {
        setContentMargin("80px");
        setSlideX(0);
      });
    } else {
      // Expand: set translateX to push content right during sidebar grow, then snap
      setSlideX(160);
      requestAnimationFrame(() => {
        setContentMargin("240px");
        setSlideX(0);
      });
    }
    return () => clearTimeout(marginTimer.current);
  }, [isCollapsed, isMobile]);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const handler = (e) => {
      setIsMobile(e.matches);
      if (!e.matches) setMobileOpen(false);
    };
    setIsMobile(mq.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

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
      {/* ── Mobile hamburger button ── */}
      {isMobile && (
        <button
          onClick={() => setMobileOpen((v) => !v)}
          style={{
            position: "fixed",
            top: 14,
            left: 14,
            zIndex: 60,
            width: 40,
            height: 40,
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            alignItems: "center",
            gap: 5,
            border: "none",
            borderRadius: 10,
            cursor: "pointer",
            backgroundColor: "var(--color-surface)",
            boxShadow: "0 2px 8px rgba(0,0,0,0.18)",
          }}
        >
          <span style={{
            display: "block", width: 20, height: 2, borderRadius: 2,
            backgroundColor: "var(--color-text-primary)",
            transition: "transform 0.3s ease",
            transform: mobileOpen ? "translateY(7px) rotate(45deg)" : "none",
          }} />
          <span style={{
            display: "block", width: 20, height: 2, borderRadius: 2,
            backgroundColor: "var(--color-text-primary)",
            transition: "opacity 0.3s ease",
            opacity: mobileOpen ? 0 : 1,
          }} />
          <span style={{
            display: "block", width: 20, height: 2, borderRadius: 2,
            backgroundColor: "var(--color-text-primary)",
            transition: "transform 0.3s ease",
            transform: mobileOpen ? "translateY(-7px) rotate(-45deg)" : "none",
          }} />
        </button>
      )}

      {/* ── Mobile backdrop ── */}
      {isMobile && mobileOpen && (
        <div
          onClick={() => setMobileOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            backgroundColor: "rgba(0,0,0,0.5)",
          }}
        />
      )}

      <Sidebar
        isCollapsed={isMobile ? false : isCollapsed}
        setIsCollapsed={handleSetIsCollapsed}
        mobileOpen={mobileOpen}
        setMobileOpen={setMobileOpen}
        isMobile={isMobile}
      />

      {/* ── Main content panel ── */}
      <div
        className="p-3"
        style={{
          marginLeft: contentMargin,
          paddingTop: isMobile ? "68px" : "12px",
          transform: isMobile ? "none" : `translateX(${slideX}px)`,
          transition: isMobile ? "none" : "transform 300ms cubic-bezier(0.4,0,0.2,1)",
          willChange: "transform",
        }}
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
