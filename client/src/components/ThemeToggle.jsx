// src/components/ThemeToggle.jsx

import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Pill-shaped Light / Dark toggle (Brainwave-style).
 * compact = true  → small icon-only button for collapsed sidebar.
 */
const ThemeToggle = ({ compact = false }) => {
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";

  /* ── Compact (collapsed sidebar) ── */
  if (compact) {
    return (
      <button
        onClick={toggleTheme}
        aria-label="Toggle theme"
        title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
        className="w-10 h-10 rounded-xl flex items-center justify-center cursor-pointer transition-all duration-200 border-none"
        style={{
          backgroundColor: "var(--color-accent-bg)",
          color: "var(--color-accent)",
          flexShrink: 0,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-accent-border)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.backgroundColor = "var(--color-accent-bg)";
        }}
      >
        {isDark ? <Sun size={17} /> : <Moon size={17} />}
      </button>
    );
  }

  /* ── Full pill toggle ── */
  return (
    <div
      className="flex items-center w-full rounded-xl p-1 transition-colors duration-200"
      style={{ backgroundColor: "var(--color-border-light)" }}
    >
      {/* Light button */}
      <button
        onClick={() => isDark && toggleTheme()}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-200 border-none"
        style={{
          backgroundColor: !isDark ? "var(--color-card)" : "transparent",
          color: !isDark ? "var(--color-text-primary)" : "var(--color-text-muted)",
          boxShadow: !isDark ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
        }}
      >
        <Sun size={14} />
        Light
      </button>

      {/* Dark button */}
      <button
        onClick={() => !isDark && toggleTheme()}
        className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-[12px] font-semibold cursor-pointer transition-all duration-200 border-none"
        style={{
          backgroundColor: isDark ? "var(--color-card)" : "transparent",
          color: isDark ? "var(--color-text-primary)" : "var(--color-text-muted)",
          boxShadow: isDark ? "0 1px 3px rgba(0,0,0,0.25)" : "none",
        }}
      >
        <Moon size={14} />
        Dark
      </button>
    </div>
  );
};

export default ThemeToggle;