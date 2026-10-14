import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { LocalFile, api, loginWithPassword, setAuthToken, uploadFile } from "../services/api";
import { AccountType, ApiMe, ApiUser, AuthUser, ExpertArea, mapApiMe } from "../types";

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
  // Campos da conta especialista. O backend ainda não tem esses campos, então ficam só
  // em memória (veja `localExtra` abaixo). TODO API: enviar no PATCH quando existirem.
  company: string;
  expertise_area: ExpertArea | null;
}>;

// Dados extras informados no cadastro (tela login.tsx)
export type RegisterExtra = {
  accountType: AccountType;
  displayName?: string; // nome (conta especialista)
  expertiseArea?: ExpertArea | null; // área de atuação (conta especialista)
};

// Campos que ainda só existem no app (não vêm da API)
type LocalExtra = Partial<Pick<AuthUser, "accountType" | "company" | "expertiseArea">>;

// "avatar" = foto de perfil; "banner" = fundo do perfil (os dois aceitam GIF animado)
export type ProfileImage = "avatar" | "banner";

type AuthContextValue = {
  user: AuthUser | null;
  isAdmin: boolean;
  isExpert: boolean; // true = conta especialista (as telas mudam só para ela)
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, extra?: RegisterExtra) => Promise<void>;
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
  const [baseUser, setBaseUser] = useState<AuthUser | null>(null);
  // Tipo de conta, empresa e área de atuação: guardados aqui até o backend ter esses campos.
  // Se a API passar a enviar o valor, o da API vence (veja o useMemo abaixo).
  const [localExtra, setLocalExtra] = useState<LocalExtra>({});

  const user = useMemo<AuthUser | null>(
    () =>
      baseUser && {
        ...baseUser,
        accountType: baseUser.accountType ?? localExtra.accountType ?? "normal",
        company: baseUser.company ?? localExtra.company ?? null,
        expertiseArea: baseUser.expertiseArea ?? localExtra.expertiseArea ?? null,
      },
    [baseUser, localExtra]
  );

  const applyMe = useCallback((me: ApiMe) => setBaseUser(mapApiMe(me)), []);

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
    async (username: string, email: string, password: string, extra?: RegisterExtra) => {
      await api.post<ApiUser>("/api/v1/users", { username: username.trim(), email: email.trim(), password });
      // TODO API: enviar account_type e expertise_area junto do cadastro quando o backend aceitar.
      setLocalExtra({
        accountType: extra?.accountType ?? "normal",
        expertiseArea: extra?.expertiseArea ?? null,
      });
      await login(email, password);
      // O nome da conta especialista vai para o "Nome de exibição" (campo que a API já tem)
      const name = extra?.displayName?.trim();
      if (name) {
        try {
          applyMe(await api.patch<ApiMe>("/api/v1/users/me", { display_name: name }));
        } catch {
          // a conta já foi criada; o nome pode ser ajustado depois no perfil
        }
      }
    },
    [login, applyMe]
  );

  const logout = useCallback(() => {
    setAuthToken(null);
    setBaseUser(null);
    setLocalExtra({});
  }, []);

  const updateProfile = useCallback(
    async (data: ProfileUpdate) => {
      // empresa e área de atuação ainda não existem na API: ficam só no app
      const { company, expertise_area, ...apiData } = data;
      if (Object.keys(apiData).length > 0) {
        applyMe(await api.patch<ApiMe>("/api/v1/users/me", apiData));
      }
      setLocalExtra((prev) => ({
        ...prev,
        ...(company !== undefined ? { company } : {}),
        ...(expertise_area !== undefined ? { expertiseArea: expertise_area } : {}),
      }));
    },
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
