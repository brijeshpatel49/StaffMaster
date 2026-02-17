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

  useEffect(() => {
    // Register logout callback with API utility (centralized handling)
    setLogoutCallback(logout);

    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);

        // Check if token is expired on load
        const currentTime = Date.now() / 1000;
        if (decoded.exp && decoded.exp < currentTime) {
          console.log("Token expired on load, logging out...");
          logout();
        } else {
          setUser(decoded);
          setToken(storedToken);
        }
      } catch (err) {
        console.error("Token decode error:", err);
        localStorage.removeItem("token");
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, []);

  const login = (tokenFromServer) => {
    const decoded = jwtDecode(tokenFromServer);
    localStorage.setItem("token", tokenFromServer);
    setToken(tokenFromServer);
    setUser(decoded);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        isAuthenticated: !!token,
        loading,
        API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
