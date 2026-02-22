// src/components/ThemeToggle.jsx

import { Sun, Moon } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

const ThemeToggle = ({ size = 36 }) => {
  const { mode, toggleTheme } = useTheme();
  const isDark = mode === "dark";

  return (
    <button
      onClick={toggleTheme}
      aria-label="Toggle theme"
      title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
      className="flex items-center justify-center rounded-xl transition-all duration-200 cursor-pointer"
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        border: "1px solid var(--color-border)",
        backgroundColor: "var(--color-accent-bg)",
        color: "var(--color-accent)",
      }}
      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "var(--color-accent-border)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--color-accent-bg)"; }}
    >
      {isDark ? <Sun size={size * 0.45} /> : <Moon size={size * 0.45} />}
    </button>
  );
};

export default ThemeToggle;