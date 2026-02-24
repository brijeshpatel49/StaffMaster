import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";
import { setLogoutCallback } from "../utils/api";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL;

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
    window.location.href = "/login";
  };

  // Helper: check if a decoded token is expired
  const isTokenExpired = (decoded) => {
    if (!decoded?.exp) return false;
    return decoded.exp < Date.now() / 1000;
  };

  useEffect(() => {
    // Register logout callback with API utility (centralized handling)
    setLogoutCallback(logout);

    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);

        if (isTokenExpired(decoded)) {
          console.log("Token expired on load, logging out...");
          logout();
          return;
        }

        setUser(decoded);
        setToken(storedToken);
      } catch (err) {
        console.error("Token decode error:", err);
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  // Periodic expiry check — runs every 60 seconds while logged in
  useEffect(() => {
    if (!token) return;

    const interval = setInterval(() => {
      try {
        const decoded = jwtDecode(token);
        if (isTokenExpired(decoded)) {
          console.log("Token expired (periodic check), logging out...");
          logout();
        }
      } catch {
        logout();
      }
    }, 60 * 1000); // every 60 seconds

    return () => clearInterval(interval);
  }, [token]);

  const login = (tokenFromServer) => {
    const decoded = jwtDecode(tokenFromServer);
    localStorage.setItem("token", tokenFromServer);
    setToken(tokenFromServer);
    setUser(decoded);
  };

  // Used after password change to swap in a fresh token
  const updateToken = (newToken) => {
    const decoded = jwtDecode(newToken);
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(decoded);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateToken,
        isAuthenticated: !!token,
        loading,
        API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
