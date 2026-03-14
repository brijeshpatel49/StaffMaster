// src/layouts/DashboardLayout.jsx

import { useState, useEffect, useLayoutEffect, useRef } from "react";
import Sidebar from "../components/Sidebar";
import NotificationBell from "../components/NotificationBell";
import useNotifications from "../hooks/useNotifications";

const SIDEBAR_KEY = "sidebar_collapsed";
const SIDEBAR_DIFF = 172; // 240 - 68

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
  const notificationProps = useNotifications();

  const contentMargin = isMobile ? 0 : (isCollapsed ? "68px" : "240px");

  // ── Mounted gate: no animations until after first paint ──
  const contentRef = useRef(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      requestAnimationFrame(() => setMounted(true));
    });
    return () => cancelAnimationFrame(id);
  }, []);

  const prevCollapsed = useRef(isCollapsed);

  // ── FLIP animation: GPU-accelerated transform instead of laggy margin transition ──
  useLayoutEffect(() => {
    if (isMobile || !mounted) return;
    
    // Skip if collapsed value hasn't actually changed
    // (this handles the mounted=true trigger)
    if (prevCollapsed.current === isCollapsed) return;
    prevCollapsed.current = isCollapsed;

    const el = contentRef.current;
    if (!el) return;

    // margin-left just snapped to the new value.
    // Apply a counter-transform so it LOOKS like nothing moved yet.
    const counterShift = isCollapsed ? SIDEBAR_DIFF : -SIDEBAR_DIFF;
    el.style.transition = "none";
    el.style.transform = `translateX(${counterShift}px)`;

    // Force the browser to register the above state before animating
    el.getBoundingClientRect();

    // Now smoothly animate the transform back to 0 (GPU-only, no layout cost)
    el.style.transition = "transform 300ms cubic-bezier(0.4,0,0.2,1)";
    el.style.transform = "translateX(0)";
  }, [isCollapsed, isMobile, mounted]);

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
      className="min-h-screen"
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
        ref={contentRef}
        className="p-3"
        style={{
          marginLeft: contentMargin,
          paddingTop: isMobile ? "68px" : "12px",
          ...(mounted && { willChange: "transform" }),
        }}
      >
        <div
          className="min-h-[calc(100vh-24px)] rounded-3xl p-8 transition-colors duration-300"
          style={{
            backgroundColor: "var(--color-content-bg)",
            border: "1px solid var(--color-border)",
          }}
        >
          <header className="mb-8 flex justify-between items-start md:items-center">
            <div className="mb-4 md:mb-0">
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
            </div>
            {/* Notification Bell inside Header */}
            <div className="relative z-50 flex-shrink-0 ml-4">
              <NotificationBell {...notificationProps} />
            </div>
          </header>
          <main>{children}</main>
        </div>
      </div>
    </div>
  );
};

export default DashboardLayout;
