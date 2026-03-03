// src/pages/Home.jsx

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { useState, useEffect } from "react";
import {
  Sun,
  Moon,
  ArrowRight,
  Sparkles,
  Play,
  Users,
  CalendarCheck,
  BarChart3,
  Building2,
  ClipboardList,
  Shield,
} from "lucide-react";

const VALID_ROLES = ["admin", "hr", "manager", "employee"];

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";
  const [mounted, setMounted] = useState(false);

  const dashboardPath =
    isAuthenticated && user?.role && VALID_ROLES.includes(user.role)
      ? `/${user.role}/dashboard`
      : "/login";

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className="relative overflow-x-hidden transition-colors duration-500"
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--color-page-bg)",
        color: "var(--color-text-primary)",
      }}
    >
      {/* ═══════════ BACKGROUND EFFECTS ═══════════ */}

      {/* Dot grid */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          opacity: isDark ? 0.03 : 0.07,
          backgroundImage:
            "radial-gradient(circle, currentColor 1px, transparent 1px)",
          backgroundSize: "24px 24px",
        }}
      />

      {/* Gradient orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div
          className="absolute w-[700px] h-[700px] rounded-full animate-blob"
          style={{
            top: "-18%",
            right: "-8%",
            background: isDark
              ? "radial-gradient(circle, rgba(245,158,11,0.07) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(245,158,11,0.14) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute w-[600px] h-[600px] rounded-full animate-blob animation-delay-2000"
          style={{
            bottom: "-12%",
            left: "-8%",
            background: isDark
              ? "radial-gradient(circle, rgba(99,102,241,0.05) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
        <div
          className="absolute w-[500px] h-[500px] rounded-full animate-blob animation-delay-4000"
          style={{
            top: "25%",
            left: "35%",
            background: isDark
              ? "radial-gradient(circle, rgba(16,185,129,0.03) 0%, transparent 70%)"
              : "radial-gradient(circle, rgba(16,185,129,0.07) 0%, transparent 70%)",
            filter: "blur(60px)",
          }}
        />
      </div>

      {/* Center radial spotlight */}
      <div
        className="fixed pointer-events-none left-1/2 -translate-x-1/2"
        style={{
          top: "8%",
          width: "900px",
          height: "600px",
          background: isDark
            ? "radial-gradient(ellipse, rgba(245,158,11,0.05) 0%, transparent 55%)"
            : "radial-gradient(ellipse, rgba(245,158,11,0.07) 0%, transparent 55%)",
        }}
      />

      {/* ═══════════ NAVBAR ═══════════ */}
      <nav
        className="relative z-30 flex items-center justify-between px-6 md:px-12 lg:px-20 py-5"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? "translateY(0)" : "translateY(-20px)",
          transition: "all 0.6s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Logo */}
        <Link to="/" className="shrink-0 flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden flex items-center justify-center">
            <img
              src="/logo-bg.png"
              alt="StaffMaster"
              className="w-full h-full object-contain transition-all duration-300"
              style={mode === "dark" ? { filter: "invert(1)" } : {}}
            />
          </div>
          <span
            className="font-bold text-[15px] whitespace-nowrap"
            style={{ color: "var(--color-text-primary)" }}
          >
            StaffMaster
          </span>
        </Link>
        {/* Right actions */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="relative w-16 h-8 rounded-full p-1 cursor-pointer transition-colors duration-500 border-none"
            style={{
              backgroundColor: isDark
                ? "var(--color-card)"
                : "var(--color-border)",
            }}
            aria-label="Toggle theme"
          >
            <div
              className="absolute top-1 w-6 h-6 rounded-full flex items-center justify-center transition-all duration-500"
              style={{
                left: isDark ? "calc(100% - 28px)" : "4px",
                backgroundColor: "var(--color-accent)",
                boxShadow: "0 2px 10px rgba(245,158,11,0.4)",
              }}
            >
              {isDark ? (
                <Moon size={14} color="#0f0f0f" />
              ) : (
                <Sun size={14} color="#0f0f0f" />
              )}
            </div>
          </button>

          <Link
            to="/login"
            className="hidden sm:flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all duration-300 hover:scale-105"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#0f0f0f",
              boxShadow: "0 4px 20px rgba(245,158,11,0.2)",
            }}
          >
            Get Started
            <ArrowRight size={16} />
          </Link>
        </div>
      </nav>

      {/* ═══════════ HERO SECTION ═══════════ */}
      <section className="relative z-10 flex flex-col items-center px-6 pt-[6vh] sm:pt-[8vh] md:pt-[10vh]">
        {/* Accent badge */}
        <div
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted
              ? "translateY(0) scale(1)"
              : "translateY(20px) scale(0.95)",
            transition: "all 0.7s cubic-bezier(0.16, 1, 0.3, 1) 0.15s",
          }}
        ></div>

        {/* Main headline */}
        <div
          className="mt-8"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(30px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.25s",
          }}
        >
          <h1 className="text-center text-4xl sm:text-5xl md:text-6xl lg:text-[5.5rem] font-black leading-[1.08] tracking-tight">
            Manage, track & grow
            <br />
            <span
              className="landing-shimmer"
              style={{
                backgroundImage:
                  "linear-gradient(135deg, var(--color-gradient-from), var(--color-gradient-to), var(--color-gradient-from))",
                backgroundSize: "200% auto",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              your workforce
            </span>
          </h1>
        </div>

        {/* Subtitle */}
        <p
          className="text-center text-base sm:text-lg md:text-xl max-w-xl font-medium leading-relaxed mt-6 mb-10"
          style={{
            color: "var(--color-text-secondary)",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.4s",
          }}
        >
          Efficiently manage your team and boost productivity.
          <br className="hidden sm:inline" /> Attendance, leaves, departments,
          tasks & performance — all in one place.
        </p>

        {/* CTA buttons */}
        <div
          className="flex flex-col sm:flex-row items-center gap-4"
          style={{
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(20px)",
            transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1) 0.5s",
          }}
        >
          <Link
            to={dashboardPath}
            className="group flex items-center gap-2 px-8 py-4 rounded-2xl text-lg font-bold transition-all duration-300 hover:scale-105 active:scale-[0.98]"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "#0f0f0f",
              boxShadow: isDark
                ? "0 20px 60px rgba(245,158,11,0.25), 0 0 0 1px rgba(245,158,11,0.1)"
                : "0 20px 60px rgba(245,158,11,0.2)",
            }}
          >
            {isAuthenticated ? "Go to Dashboard" : "Get Started Free"}
            <ArrowRight
              size={20}
              className="transition-transform duration-300 group-hover:translate-x-1"
            />
          </Link>
        </div>

        {/* ═══════════ DASHBOARD MOCKUP ═══════════ */}
        <div
          className="relative mt-16 sm:mt-20 w-full max-w-5xl mx-auto"
          style={{
            perspective: "1200px",
            opacity: mounted ? 1 : 0,
            transform: mounted ? "translateY(0)" : "translateY(60px)",
            transition: "all 1.2s cubic-bezier(0.16, 1, 0.3, 1) 0.65s",
          }}
        >
          {/* Glow behind mockup */}
          <div
            className="absolute inset-0 rounded-3xl"
            style={{
              background: isDark
                ? "radial-gradient(ellipse at center top, rgba(245,158,11,0.15) 0%, transparent 55%)"
                : "radial-gradient(ellipse at center top, rgba(245,158,11,0.1) 0%, transparent 55%)",
              transform: "translateY(-30px) scaleX(0.85)",
              filter: "blur(40px)",
            }}
          />

          {/* The tilted dashboard card */}
          <div
            className="relative rounded-2xl overflow-hidden landing-mockup-hover"
            style={{
              transform: "rotateX(8deg)",
              transformOrigin: "center top",
              backgroundColor: isDark
                ? "rgba(30,31,32,0.95)"
                : "rgba(255,255,255,0.98)",
              border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`,
              boxShadow: isDark
                ? "0 50px 100px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.05)"
                : "0 50px 100px -20px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.03), inset 0 1px 0 rgba(255,255,255,0.9)",
            }}
          >
            {/* Window chrome bar */}
            <div
              className="flex items-center gap-2 px-5 py-3.5"
              style={{
                borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"}`,
                backgroundColor: isDark
                  ? "rgba(23,24,24,0.6)"
                  : "rgba(248,249,251,0.8)",
              }}
            >
              <div className="flex items-center gap-1.5">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#ff5f57" }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#febc2e" }}
                />
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: "#28c840" }}
                />
              </div>
              <div className="flex-1 flex justify-center">
                <div
                  className="px-8 py-1.5 rounded-lg text-[11px] font-medium"
                  style={{
                    backgroundColor: isDark
                      ? "rgba(255,255,255,0.04)"
                      : "rgba(0,0,0,0.03)",
                    color: "var(--color-text-muted)",
                  }}
                >
                  staffmaster.app/dashboard
                </div>
              </div>
              <div className="w-[52px]" />
            </div>

            {/* Dashboard content */}
            <div className="flex" style={{ height: "340px" }}>
              {/* Sidebar */}
              <div
                className="w-16 hidden sm:flex flex-col items-center gap-3 pt-5 flex-shrink-0"
                style={{
                  borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}`,
                  backgroundColor: isDark
                    ? "rgba(23,24,24,0.4)"
                    : "rgba(248,249,251,0.5)",
                }}
              >
                <div className="w-8 h-8 rounded-lg overflow-hidden flex items-center justify-center mb-3">
                  <img
                    src="/logo-bg.png"
                    alt="StaffMaster"
                    className="w-full h-full object-contain"
                    style={isDark ? { filter: "invert(1)" } : {}}
                  />
                </div>
                {[
                  Users,
                  CalendarCheck,
                  ClipboardList,
                  Building2,
                  BarChart3,
                  Shield,
                ].map((Icon, i) => (
                  <div
                    key={i}
                    className="w-9 h-9 rounded-lg flex items-center justify-center"
                    style={{
                      backgroundColor:
                        i === 0 ? "var(--color-accent-bg)" : "transparent",
                      color:
                        i === 0
                          ? "var(--color-accent)"
                          : "var(--color-text-muted)",
                    }}
                  >
                    <Icon size={16} />
                  </div>
                ))}
              </div>

              {/* Main area */}
              <div className="flex-1 p-4 sm:p-5 flex flex-col gap-4 overflow-hidden">
                {/* Metric cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3">
                  {[
                    {
                      label: "Total Employees",
                      val: "1,248",
                      color: "var(--color-icon-blue)",
                    },
                    {
                      label: "Attendance",
                      val: "96.2%",
                      color: "var(--color-icon-green)",
                    },
                    {
                      label: "Active Tasks",
                      val: "342",
                      color: "var(--color-accent)",
                    },
                    {
                      label: "Departments",
                      val: "12",
                      color: "var(--color-icon-purple)",
                    },
                  ].map((m, i) => (
                    <div
                      key={i}
                      className="rounded-xl p-3"
                      style={{
                        backgroundColor: isDark
                          ? "rgba(255,255,255,0.03)"
                          : "rgba(0,0,0,0.015)",
                        border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                      }}
                    >
                      <p
                        className="text-[9px] font-semibold"
                        style={{ color: "var(--color-text-muted)" }}
                      >
                        {m.label}
                      </p>
                      <p
                        className="text-sm sm:text-base font-bold mt-1"
                        style={{ color: m.color }}
                      >
                        {m.val}
                      </p>
                    </div>
                  ))}
                </div>

                {/* Charts row */}
                <div className="flex-1 flex gap-3 min-h-0">
                  {/* Bar chart */}
                  <div
                    className="flex-1 rounded-xl p-4"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(0,0,0,0.01)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                    }}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <p
                        className="text-[10px] font-bold"
                        style={{ color: "var(--color-text-secondary)" }}
                      >
                        Weekly Overview
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: "var(--color-accent)",
                            }}
                          />
                          <span
                            className="text-[8px] font-medium"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            This week
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div
                            className="w-2 h-2 rounded-full"
                            style={{
                              backgroundColor: isDark
                                ? "rgba(255,255,255,0.08)"
                                : "rgba(0,0,0,0.08)",
                            }}
                          />
                          <span
                            className="text-[8px] font-medium"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            Last week
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-end gap-[6px] h-[calc(100%-32px)]">
                      {[65, 42, 78, 52, 92, 68, 38].map((h, i) => (
                        <div
                          key={i}
                          className="flex-1 flex flex-col items-center gap-1 h-full justify-end"
                        >
                          <div
                            className="w-full rounded-md transition-all ease-out"
                            style={{
                              height: mounted ? `${h}%` : "0%",
                              backgroundColor:
                                i === 4
                                  ? "var(--color-accent)"
                                  : isDark
                                    ? "rgba(255,255,255,0.06)"
                                    : "rgba(0,0,0,0.06)",
                              transitionDuration: "1.2s",
                              transitionDelay: `${1 + i * 0.08}s`,
                            }}
                          />
                          <span
                            className="text-[7px] font-semibold"
                            style={{ color: "var(--color-text-muted)" }}
                          >
                            {
                              ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"][
                                i
                              ]
                            }
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Activity feed */}
                  <div
                    className="w-44 hidden md:flex rounded-xl p-4 flex-col flex-shrink-0"
                    style={{
                      backgroundColor: isDark
                        ? "rgba(255,255,255,0.02)"
                        : "rgba(0,0,0,0.01)",
                      border: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}`,
                    }}
                  >
                    <p
                      className="text-[10px] font-bold mb-3"
                      style={{ color: "var(--color-text-secondary)" }}
                    >
                      Recent Activity
                    </p>
                    <div className="flex flex-col gap-3">
                      {[
                        {
                          color: "var(--color-icon-green)",
                          text: "John checked in",
                          time: "9:02 AM",
                        },
                        {
                          color: "var(--color-icon-blue)",
                          text: "Task completed",
                          time: "9:15 AM",
                        },
                        {
                          color: "var(--color-accent)",
                          text: "Leave approved",
                          time: "9:30 AM",
                        },
                        {
                          color: "var(--color-icon-purple)",
                          text: "New hire onboarded",
                          time: "10:00 AM",
                        },
                        {
                          color: "var(--color-icon-red)",
                          text: "Report generated",
                          time: "10:30 AM",
                        },
                      ].map((a, i) => (
                        <div key={i} className="flex items-start gap-2">
                          <div
                            className="w-1.5 h-1.5 rounded-full flex-shrink-0 mt-[5px]"
                            style={{ backgroundColor: a.color }}
                          />
                          <div>
                            <span
                              className="text-[9px] font-semibold block leading-tight"
                              style={{
                                color: "var(--color-text-secondary)",
                              }}
                            >
                              {a.text}
                            </span>
                            <span
                              className="text-[7px] font-medium"
                              style={{ color: "var(--color-text-muted)" }}
                            >
                              {a.time}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Gradient fade overlay at bottom of mockup */}
          <div
            className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10"
            style={{
              background: isDark
                ? "linear-gradient(to top, var(--color-page-bg) 0%, transparent 100%)"
                : "linear-gradient(to top, var(--color-page-bg) 0%, transparent 100%)",
            }}
          />
        </div>
      </section>

      {/* ── Bottom credit ── */}
      <p
        className="relative text-center text-[11px] font-medium py-6 z-10 transition-colors duration-500"
        style={{ color: "var(--color-text-muted)" }}
      >
        © 2026 StaffMaster · Built for Modern Teams
      </p>
    </div>
  );
};

export default Home;
