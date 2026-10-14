import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LocalFile, api, loginWithPassword, setAuthToken, uploadFile } from "../services/api";
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

type AuthContextValue = {
  user: AuthUser | null;
  isAdmin: boolean;
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

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// Sessão fica só em memória: fechar o app pede login de novo.
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  const applyMe = useCallback((me: ApiMe) => setUser(mapApiMe(me)), []);

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
    setAuthToken(null);
    setUser(null);
  }, []);

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

  const value = useMemo(
    () => ({
      user,
      isAdmin: user?.role === "admin",
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
    [user, login, register, logout, updateProfile, changePassword, deleteAccount, setImage, removeImage]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth precisa estar dentro de <AuthProvider>");
  return ctx;
}
