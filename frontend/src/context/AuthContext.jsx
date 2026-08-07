import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api from "../lib/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH
    if (window.location.hash?.includes("session_id=")) {
      setLoading(false);
      return;
    }
    if (!document.cookie.includes("sh_auth=")) {
      setLoading(false);
      return;
    }
    api.get("/auth/me")
      .then((res) => setUser(res.data))
      .catch(() => setUser(null))
      .finally(() => setLoading(false));
  }, []);

  const logout = useCallback(async () => {
    try { await api.post("/auth/logout"); } catch {}
    setUser(null);
  }, []);

  const homeFor = (u) => {
    if (!u) return "/login";
    if (u.role === "admin" || u.role === "super_admin") return "/admin";
    if (u.role === "provider") return "/pro";
    return "/dashboard";
  };

  return (
    <AuthContext.Provider value={{ user, setUser, loading, logout, homeFor }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
