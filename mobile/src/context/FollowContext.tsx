import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { ApiFollowStatus, ApiUser } from "../types";
import { useAuth } from "./AuthContext";

// ============================================================
// ESPECIALISTAS QUE O USUÁRIO LOGADO SEGUE.
//
// - Lista: GET /api/v1/users/me/following
// - Seguir / deixar de seguir: POST / DELETE /api/v1/users/{id}/follow
// Só contas especialistas podem ser seguidas (a API recusa as outras).
// ============================================================

type FollowContextValue = {
  isFollowing: (userId: string) => boolean;
  // Seguir ou deixar de seguir. Rejeita a Promise se a API falhar (a tela volta ao estado anterior).
  toggleFollow: (userId: string) => Promise<void>;
};

const FollowContext = createContext<FollowContextValue | undefined>(undefined);

export function FollowProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const [following, setFollowing] = useState<Set<string>>(new Set());

  // Troca de usuário (login/logout) zera e recarrega a lista
  useEffect(() => {
    setFollowing(new Set());
    if (!userId) return;
    api
      .get<ApiUser[]>("/api/v1/users/me/following")
      .then((data) => setFollowing(new Set(data.map((u) => u.id))))
      .catch(() => {
        // sem a lista, os botões aparecem como "Seguir"; tocar neles corrige o estado
      });
  }, [userId]);

  const isFollowing = useCallback((id: string) => following.has(id), [following]);

  const toggleFollow = useCallback(
    async (id: string) => {
      const wasFollowing = following.has(id);
      const apply = (follow: boolean) =>
        setFollowing((prev) => {
          const next = new Set(prev);
          if (follow) next.add(id);
          else next.delete(id);
          return next;
        });

      apply(!wasFollowing); // atualiza a tela na hora; desfaz se a API recusar
      try {
        const path = `/api/v1/users/${id}/follow`;
        if (wasFollowing) await api.delete(path);
        else await api.post<ApiFollowStatus>(path, {});
      } catch (e) {
        apply(wasFollowing);
        throw e;
      }
    },
    [following]
  );

  const value = useMemo(() => ({ isFollowing, toggleFollow }), [isFollowing, toggleFollow]);

  return <FollowContext.Provider value={value}>{children}</FollowContext.Provider>;
}

export function useFollow() {
  const ctx = useContext(FollowContext);
  if (!ctx) throw new Error("useFollow precisa estar dentro de <FollowProvider>");
  return ctx;
}
