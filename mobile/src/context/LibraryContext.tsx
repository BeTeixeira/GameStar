import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { ApiLibraryEntry, ApiReview, LibraryStatus, Review, mapApiReview } from "../types";
import { useAuth } from "./AuthContext";

// ============================================================
// "MINHA LISTA" do usuário logado.
//
// - Status do jogo (completo, jogando...): GET/PUT/DELETE /api/v1/library
// - Avaliações (myReviews): GET /api/v1/reviews/user/{id}
// ============================================================

export type { LibraryStatus };

// TEXTO EDITÁVEL — rótulos dos status
export const STATUS_LABELS: Record<LibraryStatus, string> = {
  completed: "COMPLETO",
  playing: "JOGANDO",
  plan_to_play: "JOGAR DEPOIS",
  disliked: "NÃO GOSTEI",
};

type LibraryContextValue = {
  statuses: Record<string, LibraryStatus>;
  // null tira o jogo da lista. Rejeita a Promise se a API falhar (a tela volta ao estado anterior).
  setStatus: (gameId: string, status: LibraryStatus | null) => Promise<void>;
  myReviews: Review[];
  myReviewFor: (gameId: string) => Review | undefined;
  refreshMyReviews: () => Promise<void>;
};

const LibraryContext = createContext<LibraryContextValue | undefined>(undefined);

export function LibraryProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<Record<string, LibraryStatus>>({});
  const [myReviews, setMyReviews] = useState<Review[]>([]);

  const refreshMyReviews = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<ApiReview[]>(`/api/v1/reviews/user/${user.id}?limit=100`);
      setMyReviews(data.map(mapApiReview));
    } catch {
      // mantém a lista anterior; as telas mostram o erro ao tentar avaliar
    }
  }, [user]);

  const refreshStatuses = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<ApiLibraryEntry[]>("/api/v1/library");
      setStatuses(Object.fromEntries(data.map((e) => [e.game_id, e.status])));
    } catch {
      // idem: a lista fica como estava
    }
  }, [user]);

  // Troca de usuário (login/logout) zera e recarrega a lista
  useEffect(() => {
    setStatuses({});
    setMyReviews([]);
    refreshMyReviews();
    refreshStatuses();
  }, [refreshMyReviews, refreshStatuses]);

  const setStatus = useCallback(
    async (gameId: string, status: LibraryStatus | null) => {
      const apply = (s: LibraryStatus | null | undefined) =>
        setStatuses((prev) => {
          const next = { ...prev };
          if (s) next[gameId] = s;
          else delete next[gameId];
          return next;
        });

      const previous = statuses[gameId];
      apply(status); // atualiza a tela na hora; desfaz se a API recusar
      try {
        if (status) await api.put(`/api/v1/library/${gameId}`, { status });
        else await api.delete(`/api/v1/library/${gameId}`);
      } catch (e) {
        apply(previous);
        throw e;
      }
    },
    [statuses]
  );

  const myReviewFor = useCallback(
    (gameId: string) => myReviews.find((r) => r.gameId === gameId),
    [myReviews]
  );

  const value = useMemo(
    () => ({ statuses, setStatus, myReviews, myReviewFor, refreshMyReviews }),
    [statuses, setStatus, myReviews, myReviewFor, refreshMyReviews]
  );

  return <LibraryContext.Provider value={value}>{children}</LibraryContext.Provider>;
}

export function useLibrary() {
  const ctx = useContext(LibraryContext);
  if (!ctx) throw new Error("useLibrary precisa estar dentro de <LibraryProvider>");
  return ctx;
}
