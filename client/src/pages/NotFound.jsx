import { Link } from "react-router-dom";
import { Home, ArrowLeft } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const NotFound = () => {
  const { user } = useAuth();
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#FDFDF9",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        gap: "24px",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        padding: "32px",
        textAlign: "center",
      }}
    >
      {/* Background blobs */}
      <div
        style={{
          position: "fixed",
          top: "-10%",
          right: "-5%",
          width: "500px",
          height: "500px",
          backgroundColor: "rgba(253, 224, 71, 0.15)",
          borderRadius: "50%",
          filter: "blur(80px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
      <div
        style={{
          position: "fixed",
          bottom: "-10%",
          left: "20%",
          width: "400px",
          height: "400px",
          backgroundColor: "rgba(251, 191, 36, 0.1)",
          borderRadius: "50%",
          filter: "blur(80px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />

      {/* Content */}
      <div style={{ position: "relative", zIndex: 1 }}>
        {/* Big 404 */}
        <h1
          style={{
            fontSize: "160px",
            fontWeight: 800,
            lineHeight: 1,
            background: "linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            margin: 0,
            letterSpacing: "-4px",
          }}
        >
          404
        </h1>

        <h2
          style={{
            fontSize: "28px",
            fontWeight: 700,
            color: "#1f2937",
            margin: "16px 0 8px",
          }}
        >
          Page Not Found
        </h2>

        <p
          style={{
            fontSize: "15px",
            color: "#9ca3af",
            maxWidth: "380px",
            margin: "0 auto 32px",
            lineHeight: 1.6,
          }}
        >
          The page you're looking for doesn't exist or has been moved. Let's get
          you back on track.
        </p>

        {/* Buttons */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            justifyContent: "center",
            flexWrap: "wrap",
          }}
        >
          <Link
            to={user?.role && ["admin", "hr", "manager", "employee"].includes(user.role) ? `/${user.role}/dashboard` : "/login"}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#fbbf24",
              color: "#1f2937",
              fontWeight: 700,
              fontSize: "14px",
              padding: "12px 24px",
              borderRadius: "12px",
              textDecoration: "none",
              
              transition: "all 0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f59e0b")
            }
            onMouseOut={(e) =>
              (e.currentTarget.style.backgroundColor = "#fbbf24")
            }
          >
            <Home size={18} />
            {user ? "Go to Dashboard" : "Go to Login"}
          </Link>

          <button
            onClick={() => window.history.back()}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "8px",
              backgroundColor: "#fff",
              color: "#374151",
              fontWeight: 600,
              fontSize: "14px",
              padding: "12px 24px",
              borderRadius: "12px",
              border: "1.5px solid #e5e7eb",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
            onMouseOver={(e) =>
              (e.currentTarget.style.backgroundColor = "#f9fafb")
            }
            onMouseOut={(e) => (e.currentTarget.style.backgroundColor = "#fff")}
          >
            <ArrowLeft size={18} />
            Go Back
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
