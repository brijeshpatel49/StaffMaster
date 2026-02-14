import { createContext, useState, useEffect } from "react";
import { jwtDecode } from "jwt-decode";

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const API = import.meta.env.VITE_API_URL;

  useEffect(() => {
    const storedToken = localStorage.getItem("token");

    if (storedToken) {
      try {
        const decoded = jwtDecode(storedToken);
        setUser(decoded);
        setToken(storedToken);
      } catch (err) {
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

  const logout = () => {
    localStorage.removeItem("token");
    setUser(null);
    setToken(null);
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
