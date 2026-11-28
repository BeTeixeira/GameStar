import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  ApiError,
  LocalFile,
  api,
  loginWithPassword,
  setAuthToken,
  setUnauthorizedHandler,
  uploadFile,
} from "../services/api";
import { clearSessionToken, loadSessionToken, saveSessionToken } from "../services/session";
import { ApiMe, ApiUser, AuthUser, ExpertArea, mapApiMe } from "../types";

// Campos editáveis do perfil (nomes como a API espera, em PATCH /users/me)
export type ProfileUpdate = Partial<{
  username: string;
  email: string;
  display_name: string;
  bio: string;
  notify_friend_requests: boolean;
  notify_comments: boolean;
  notify_recommendations: boolean;
  private_profile: boolean;
  // Só conta especialista (a API recusa para conta normal)
  company: string;
  expertise_area: ExpertArea;
}>;

// "avatar" = foto de perfil; "banner" = fundo do perfil (os dois aceitam GIF animado)
export type ProfileImage = "avatar" | "banner";

// Estado da sessão salva ao abrir o app:
// "restoring" = lendo o token e buscando a conta; "offline" = tem sessão salva, mas a API não respondeu.
export type SessionState = "restoring" | "ready" | "offline";

type AuthContextValue = {
  user: AuthUser | null;
  session: SessionState;
  retrySession: () => void;
  // Aviso para a tela de login (ex.: "Sua sessão expirou"); some ao entrar de novo
  sessionNotice: string | null;
  isAdmin: boolean;
  isModerator: boolean; // true = moderador (admin não entra aqui)
  canModerate: boolean; // true = admin ou moderador
  refreshMe: () => Promise<void>;
  isExpert: boolean; // true = conta especialista (as telas mudam só para ela)
  login: (email: string, password: string) => Promise<void>;
  // Cadastro público cria sempre conta normal (conta especialista terá um fluxo próprio, com confirmação)
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: ProfileUpdate) => Promise<void>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string) => Promise<void>;
  setImage: (kind: ProfileImage, file: LocalFile) => Promise<void>;
  removeImage: (kind: ProfileImage) => Promise<void>;
};

// Tarefas "antes de sair" (ex.: desregistrar o push). Rodam com o token ainda válido e nunca travam o logout.
const logoutHooks = new Set<() => void>();
export function registerLogoutHook(hook: () => void): () => void {
  logoutHooks.add(hook);
  return () => {
    logoutHooks.delete(hook);
  };
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// A sessão fica salva no aparelho (src/services/session.ts): o app abre já logado.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [session, setSession] = useState<SessionState>("restoring");
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);

  const applyMe = useCallback((me: ApiMe) => setUser(mapApiMe(me)), []);

  const restore = useCallback(async () => {
    setSession("restoring");
    const token = await loadSessionToken();
    if (!token) {
      setSession("ready");
      return;
    }
    setAuthToken(token);
    try {
      applyMe(await api.get<ApiMe>("/api/v1/users/me"));
      setSession("ready");
    } catch (e) {
      if (e instanceof ApiError) {
        // token vencido ou conta removida: volta para o login
        setAuthToken(null);
        await clearSessionToken();
        setSession("ready");
      } else {
        // sem conexão: mantém a sessão salva e deixa tentar de novo
        setSession("offline");
      }
    }
  }, [applyMe]);

  useEffect(() => {
    restore();
  }, [restore]);

  const login = useCallback(
    async (email: string, password: string) => {
      const token = await loginWithPassword(email.trim(), password);
      setAuthToken(token);
      try {
        applyMe(await api.get<ApiMe>("/api/v1/users/me"));
      } catch (e) {
        setAuthToken(null);
        throw e;
      }
      setSessionNotice(null);
      await saveSessionToken(token);
    },
    [applyMe]
  );

  const register = useCallback(
    async (username: string, email: string, password: string) => {
      await api.post<ApiUser>("/api/v1/users", { username: username.trim(), email: email.trim(), password });
      await login(email, password);
    },
    [login]
  );

  const logout = useCallback(() => {
    logoutHooks.forEach((hook) => {
      try {
        hook();
      } catch {
        // melhor esforço: não impede a saída
      }
    });
    setAuthToken(null);
    setUser(null);
    setSession("ready");
    clearSessionToken();
  }, []);

  // A API recusou o token no meio do uso (sessão vencida): sai e avisa na tela de login
  useEffect(() => {
    setUnauthorizedHandler(() => {
      setSessionNotice("Sua sessão expirou. Entre de novo para continuar.");
      logout();
    });
    return () => setUnauthorizedHandler(null);
  }, [logout]);

  const updateProfile = useCallback(
    async (data: ProfileUpdate) => applyMe(await api.patch<ApiMe>("/api/v1/users/me", data)),
    [applyMe]
  );

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await api.post("/api/v1/users/me/password", {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }, []);

  const deleteAccount = useCallback(
    async (password: string) => {
      await api.delete("/api/v1/users/me", { password });
      logout();
    },
    [logout]
  );

  const setImage = useCallback(
    async (kind: ProfileImage, file: LocalFile) =>
      applyMe(await uploadFile<ApiMe>("PUT", `/api/v1/users/me/${kind}`, file)),
    [applyMe]
  );

  const removeImage = useCallback(
    async (kind: ProfileImage) => {
      await api.delete(`/api/v1/users/me/${kind}`);
      applyMe(await api.get<ApiMe>("/api/v1/users/me"));
    },
    [applyMe]
  );

  const refreshMe = useCallback(async () => applyMe(await api.get<ApiMe>("/api/v1/users/me")), [applyMe]);

  const value = useMemo(
    () => ({
      user,
      session,
      retrySession: restore,
      sessionNotice,
      isAdmin: user?.role === "admin",
      isModerator: user?.role === "moderator",
      canModerate: user?.role === "admin" || user?.role === "moderator",
      refreshMe,
      isExpert: user?.accountType === "especialista",
      login,
      register,
      logout,
      updateProfile,
      changePassword,
      deleteAccount,
      setImage,
      removeImage,
    }),
    [user, session, restore, sessionNotice, login, register, logout, updateProfile, changePassword, deleteAccount, setImage, removeImage, refreshMe]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
