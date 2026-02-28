import { useState, useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { useTheme } from "../context/ThemeContext";
import { apiFetch } from "../utils/api";
import { PartyPopper } from "lucide-react";

const UpcomingHolidaysWidget = () => {
  const { API } = useAuth();
  const { mode } = useTheme();
  const isDark = mode === "dark";
  const [holidays, setHolidays] = useState([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await apiFetch(`${API}/holidays/upcoming?limit=3`);
        if (!cancelled && res?.data?.success) setHolidays(res.data.data);
      } catch { /* silent */ }
      finally { if (!cancelled) setLoaded(true); }
    })();
    return () => { cancelled = true; };
  }, [API]);

  if (!loaded || holidays.length === 0) return null;

  const fmtDate = (d) =>
    new Date(d).toLocaleDateString("en-IN", { day: "2-digit", month: "short" });

  return (
    <div
      style={{
        backgroundColor: "var(--color-card)",
        borderRadius: "16px",
        border: "1px solid var(--color-border)",
        padding: "18px 20px",
        marginBottom: "20px",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "8px",
          marginBottom: "14px",
        }}
      >
        <PartyPopper size={18} color="var(--color-accent)" />
        <h3
          style={{
            margin: 0,
            fontSize: "14px",
            fontWeight: 700,
            color: "var(--color-text-primary)",
          }}
        >
          Upcoming Holidays
        </h3>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        {holidays.map((h) => (
          <div
            key={h._id}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "12px",
              padding: "10px 12px",
              borderRadius: "10px",
              backgroundColor: isDark ? "rgba(239,68,68,0.06)" : "#fef2f2",
              border: "1px solid rgba(239,68,68,0.10)",
            }}
          >
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: isDark ? "rgba(239,68,68,0.12)" : "#fee2e2",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
                fontSize: "14px",
              }}
            >
              🔴
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                style={{
                  margin: 0,
                  fontWeight: 700,
                  fontSize: "13px",
                  color: "var(--color-text-primary)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {h.name}
              </p>
              <p
                style={{
                  margin: "2px 0 0",
                  fontSize: "11px",
                  color: "var(--color-text-muted)",
                }}
              >
                {fmtDate(h.date)} —{" "}
                {h.type.charAt(0).toUpperCase() + h.type.slice(1)}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UpcomingHolidaysWidget;
