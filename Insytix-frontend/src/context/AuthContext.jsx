import { createContext, useContext, useEffect, useState, useCallback } from "react";
import api, { readAuth, writeAuth } from "../lib/api";

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [auth, setAuth] = useState(() => readAuth());
  const [loading, setLoading] = useState(true);

  // On mount, if we have a token, refresh the user/tenant from the server.
  useEffect(() => {
    let active = true;
    (async () => {
      const stored = readAuth();
      if (!stored?.token) { setLoading(false); return; }
      try {
        const me = await api.get("/auth/me");
        if (!active) return;
        const next = { token: stored.token, user: me.user, tenant: me.tenant };
        writeAuth(next);
        setAuth(next);
      } catch {
        writeAuth(null);
        if (active) setAuth(null);
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, []);

  const persist = useCallback((data) => {
    const next = { token: data.token, user: data.user, tenant: data.tenant };
    writeAuth(next);
    setAuth(next);
    return next;
  }, []);

  const login = useCallback(async (email, password) => persist(await api.post("/auth/login", { email, password })), [persist]);
  const signup = useCallback(async (payload) => persist(await api.post("/auth/signup", payload)), [persist]);
  const logout = useCallback(() => { writeAuth(null); setAuth(null); }, []);

  // Let pages (e.g. Store settings) update the cached tenant after a connection change.
  const setTenant = useCallback((tenant) => {
    setAuth((a) => {
      if (!a) return a;
      const next = { ...a, tenant };
      writeAuth(next);
      return next;
    });
  }, []);

  return (
    <AuthContext.Provider value={{ ...auth, isAuthenticated: !!auth?.token, loading, login, signup, logout, setTenant }}>
      {children}
    </AuthContext.Provider>
  );
}
