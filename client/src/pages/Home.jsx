// src/pages/Home.jsx

import { Link } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

const VALID_ROLES = ["admin", "hr", "manager", "employee"];

const Home = () => {
  const { user, isAuthenticated } = useAuth();
  const dashboardPath =
    isAuthenticated && user?.role && VALID_ROLES.includes(user.role)
      ? `/${user.role}/dashboard`
      : "/login";

  return (
    <div
      className="min-h-screen flex flex-col items-center relative overflow-hidden font-sans transition-colors duration-300"
      style={{ backgroundColor: "var(--color-page-bg)" }}
    >
      {/* ── Blobs ── */}
      <div className="absolute inset-0 overflow-hidden -z-10 pointer-events-none">
        <div
          className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob"
          style={{ backgroundColor: "var(--color-blob-1)" }}
        />
        <div
          className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-2000"
          style={{ backgroundColor: "var(--color-blob-2)" }}
        />
        <div
          className="absolute top-[20%] left-[20%] w-[400px] h-[400px] rounded-full mix-blend-multiply filter blur-3xl opacity-70 animate-blob animation-delay-4000"
          style={{ backgroundColor: "var(--color-blob-3)" }}
        />
      </div>

      {/* ── Hero ── */}
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-16 text-center z-10">
        <div className="flex flex-col items-center gap-6">
          {/* Badge */}
          <span
            className="px-4 py-1.5 rounded-full text-sm font-bold tracking-widest uppercase transition-colors duration-300"
            style={{
              backgroundColor: "var(--color-badge-bg)",
              color: "var(--color-badge-text)",
              border: "1px solid var(--color-badge-border)",
            }}
          >
            v1.0 Enterprise Edition
          </span>

          {/* Headline */}
          <h1
            className="text-6xl md:text-7xl font-bold tracking-tight leading-tight transition-colors duration-300"
            style={{ color: "var(--color-text-primary)" }}
          >
            Effortless <br />
            <span
              style={{
                backgroundImage: `linear-gradient(to right, var(--color-gradient-from), var(--color-gradient-to))`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              Employee Management
            </span>
          </h1>

          {/* Subheading */}
          <p
            className="text-xl max-w-2xl font-medium leading-relaxed transition-colors duration-300"
            style={{ color: "var(--color-text-secondary)" }}
          >
            Streamline your workforce operations with our intuitive platform.
            Manage schedules, track performance, and empower your team—all in
            one place.
          </p>

          {/* CTA */}
          <div className="mt-4">
            <Link
              to={dashboardPath}
              className="inline-block px-10 py-4 font-bold rounded-2xl text-lg transition-all duration-300"
              style={{
                backgroundColor: "var(--color-btn-bg)",
                color: "var(--color-btn-text)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor =
                  "var(--color-btn-hover)";
                e.currentTarget.style.transform = "translateY(-2px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "var(--color-btn-bg)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Access Portal
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;
