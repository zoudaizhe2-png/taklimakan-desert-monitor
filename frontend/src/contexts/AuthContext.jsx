import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { loginUser, registerUser, fetchMe, updatePreferences } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (!token) {
      setLoading(false);
      return;
    }
    fetchMe()
      .then(setUser)
      .catch(() => localStorage.removeItem("auth_token"))
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (email, password) => {
    const res = await loginUser(email, password);
    localStorage.setItem("auth_token", res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const register = useCallback(async (email, displayName, password) => {
    const res = await registerUser(email, displayName, password);
    localStorage.setItem("auth_token", res.token);
    setUser(res.user);
    return res.user;
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem("auth_token");
    setUser(null);
  }, []);

  const savePreferences = useCallback(async (prefs) => {
    if (!user) return;
    const res = await updatePreferences(prefs);
    setUser((prev) => ({ ...prev, preferences: res.preferences }));
  }, [user]);

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, savePreferences }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
