import { createContext, useState, useEffect, useCallback } from "react";
import { jwtDecode } from "jwt-decode";
import { useNavigate } from "react-router-dom";
import { setLogoutCallback } from "../utils/api";

export const AuthContext = createContext();

const USER_PATCH_KEY = "auth_user_patch_v1";

const getUserIdentity = (u) => u?._id || u?.id || null;

const readUserPatch = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_PATCH_KEY) || "null");
  } catch {
    return null;
  }
};

const clearUserPatch = () => {
  localStorage.removeItem(USER_PATCH_KEY);
};

const saveUserPatch = (userId, patch) => {
  const current = readUserPatch();
  const mergedPatch = current?.userId === userId ? { ...current.patch, ...patch } : patch;
  localStorage.setItem(USER_PATCH_KEY, JSON.stringify({ userId, patch: mergedPatch }));
};

const withPatchedUser = (decoded) => {
  const userId = getUserIdentity(decoded);
  const patchState = readUserPatch();
  if (!patchState || !userId || patchState.userId !== userId) return decoded;
  return { ...decoded, ...patchState.patch };
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL;
  const navigate = useNavigate();

  const logout = useCallback(() => {
    localStorage.removeItem("token");
    clearUserPatch();
    setUser(null);
    setToken(null);
    navigate("/login", { replace: true });
  }, [navigate]);

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

        setUser(withPatchedUser(decoded));
        setToken(storedToken);
      } catch (err) {
        console.error("Token decode error:", err);
        localStorage.removeItem("token");
        clearUserPatch();
        setUser(null);
        setToken(null);
      }
    }
    setLoading(false);
  }, [logout]);

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
  }, [token, logout]);

  const login = (tokenFromServer) => {
    const decoded = jwtDecode(tokenFromServer);
    const decodedUserId = getUserIdentity(decoded);
    const patchState = readUserPatch();
    if (patchState?.userId && patchState.userId !== decodedUserId) {
      clearUserPatch();
    }
    localStorage.setItem("token", tokenFromServer);
    setToken(tokenFromServer);
    setUser(withPatchedUser(decoded));
  };

  const updateUser = (patch) => {
    setUser((prev) => {
      if (!prev) return prev;
      const merged = { ...prev, ...patch };
      const mergedUserId = getUserIdentity(merged);
      if (mergedUserId) {
        saveUserPatch(mergedUserId, patch);
      }
      return merged;
    });
  };

  // Used after password change to swap in a fresh token
  const updateToken = (newToken) => {
    const decoded = jwtDecode(newToken);
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setUser(withPatchedUser(decoded));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        login,
        logout,
        updateToken,
        updateUser,
        isAuthenticated: !!token,
        loading,
        API,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
