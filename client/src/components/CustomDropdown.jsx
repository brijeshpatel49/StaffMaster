import { useState, useRef, useEffect, useLayoutEffect } from "react";
import { ChevronDown } from "lucide-react";
import { useTheme } from "../context/ThemeContext";

/**
 * Reusable custom dropdown.
 *
 * Props:
 *  value        – current value
 *  onChange(val) – called when an option is selected
 *  options       – [{ value, label }]
 *  placeholder   – text when value is "" / undefined (action‑trigger mode)
 *  fullWidth     – stretch to 100%
 *  size          – "sm" (filters / chart cards) | "md" (form fields)
 *  minWidth      – fallback min‑width in px (default 120)
 */
const SIZE = {
  sm: { padding: "6px 10px", fontSize: "13px", radius: "10px", itemPad: "8px 14px", itemFs: "12px" },
  md: { padding: "10px 14px", fontSize: "14px", radius: "10px", itemPad: "10px 14px", itemFs: "13px" },
};

const CustomDropdown = ({
  value,
  onChange,
  options = [],
  placeholder,
  fullWidth = false,
  size = "sm",
  minWidth = 120,
}) => {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const ref = useRef(null);
  const menuRef = useRef(null);
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const s = SIZE[size] || SIZE.sm;

  const selected = options.find((o) => String(o.value) === String(value));
  const displayText = selected?.label || placeholder || value || "";

  /* close on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  /* detect if menu would overflow viewport bottom → open upward */
  useLayoutEffect(() => {
    if (open && ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const menuH = Math.min((options.length || 1) * 36 + 12, 260);
      setDropUp(rect.bottom + menuH + 8 > window.innerHeight);
    }
  }, [open, options.length]);

  return (
    <div
      ref={ref}
      style={{
        position: "relative",
        minWidth: fullWidth ? undefined : minWidth,
        width: fullWidth ? "100%" : undefined,
        userSelect: "none",
      }}
    >
      {/* ── Trigger ── */}
      <button
        type="button"
        onClick={() => setOpen((p) => !p)}
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "8px",
          width: "100%",
          padding: s.padding,
          fontSize: s.fontSize,
          fontWeight: 600,
          borderRadius: s.radius,
          backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#f3f4f6",
          color: selected ? "var(--color-text-primary)" : "var(--color-text-muted)",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "#e5e7eb"}`,
          outline: "none",
          cursor: "pointer",
          transition: "border-color 0.15s ease",
          boxSizing: "border-box",
          textAlign: "left",
          fontFamily: "inherit",
        }}
      >
        <span
          style={{
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {displayText}
        </span>
        <ChevronDown
          size={size === "sm" ? 14 : 16}
          style={{
            color: "var(--color-text-muted)",
            transition: "transform 0.2s ease",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
            flexShrink: 0,
          }}
        />
      </button>

      {/* ── Menu ── */}
      <div
        ref={menuRef}
        style={{
          position: "absolute",
          [dropUp ? "bottom" : "top"]: "calc(100% + 6px)",
          left: 0,
          right: 0,
          zIndex: 9999,
          borderRadius: "12px",
          overflow: "hidden",
          backgroundColor: isDark ? "#1e2028" : "#ffffff",
          border: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "#e5e7eb"}`,
          boxShadow: isDark
            ? "0 12px 40px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)"
            : "0 12px 32px rgba(0,0,0,0.12)",
          opacity: open ? 1 : 0,
          transform: open
            ? "translateY(0)"
            : `translateY(${dropUp ? "6px" : "-6px"})`,
          pointerEvents: open ? "auto" : "none",
          transition: "opacity 0.18s ease, transform 0.18s ease",
          maxHeight: "260px",
          overflowY: "auto",
        }}
      >
        {options.map((opt) => {
          const isActive = String(opt.value) === String(value);
          return (
            <div
              key={opt.value}
              onClick={() => {
                onChange(opt.value);
                setOpen(false);
              }}
              style={{
                padding: s.itemPad,
                fontSize: s.itemFs,
                fontWeight: 500,
                cursor: "pointer",
                transition: "background-color 0.1s ease",
                color: isActive
                  ? "#fff"
                  : isDark
                  ? "var(--color-text-secondary)"
                  : "var(--color-text-primary)",
                backgroundColor: isActive ? "var(--color-accent)" : "transparent",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = isDark
                    ? "rgba(255,255,255,0.06)"
                    : "#f3f4f6";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.backgroundColor = "transparent";
                }
              }}
            >
              {opt.label}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CustomDropdown;
