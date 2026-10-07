import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { api, loginWithPassword, setAuthToken } from "../services/api";
import { ApiUser, AuthUser } from "../types";

type AuthContextValue = {
  user: AuthUser | null;
  isAdmin: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// O token JWT do backend traz { sub: <id do usuário>, role, exp }.
function decodeTokenSubject(token: string): string {
  const payload = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
  const padded = payload + "=".repeat((4 - (payload.length % 4)) % 4);
  return JSON.parse(atob(padded)).sub;
}

// Sessão fica só em memória: fechar o app pede login de novo.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const login = useCallback(async (email: string, password: string) => {
    const token = await loginWithPassword(email.trim(), password);
    setAuthToken(token);
    try {
      const me = await api.get<ApiUser>(`/api/v1/users/${decodeTokenSubject(token)}`);
      setUser({ id: me.id, username: me.username, email: me.email, role: me.role });
    } catch (e) {
      setAuthToken(null);
      throw e;
    }
  }, []);

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await api.post<ApiUser>("/api/v1/users", { username: username.trim(), email: email.trim(), password });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setUser(null);
  }, []);

  const value = useMemo(
    () => ({ user, isAdmin: user?.role === "admin", login, register, logout }),
    [user, login, register, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
