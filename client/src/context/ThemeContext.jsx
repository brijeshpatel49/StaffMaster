// src/context/ThemeContext.jsx

import { createContext, useContext, useEffect, useState } from "react";

const ThemeContext = createContext(null);

export const ThemeProvider = ({ children }) => {
  // Dark is primary — default to dark
  const [mode, setMode] = useState(() => {
    return localStorage.getItem("theme") || "dark";
  });

  // Same as before — toggle "dark" class on <html>
  useEffect(() => {
    const root = document.documentElement;
    if (mode === "dark") {
      root.classList.add("dark");
    } else {
      root.classList.remove("dark");
    }
    localStorage.setItem("theme", mode);
  }, [mode]);

  const toggleTheme = () =>
    setMode((prev) => (prev === "dark" ? "light" : "dark"));

  return (
    <ThemeContext.Provider value={{ mode, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used inside <ThemeProvider>");
  return ctx;
};