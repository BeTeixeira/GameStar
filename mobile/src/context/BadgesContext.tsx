import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api, ApiError } from "../services/api";
import { useAuth } from "./AuthContext";

// ============================================================
// BADGES DA CONTA — tudo fica salvo na API (backend/app/api/v1/endpoints/badges.py).
//
// - "owned": badges que a conta já resgatou na Loja (GET /api/v1/badges/me).
// - "slots": as 6 posições de badges equipadas no perfil (null = espaço livre).
// - redeem(id): resgata uma badge. FASE DE TESTES: todo resgate é gratuito.
// - saveSlots(slots): salva as badges equipadas (PUT /api/v1/badges/me/equipped).
// ============================================================

export const MAX_SLOTS = 6;

export type Slots = (string | null)[];
const EMPTY: Slots = Array(MAX_SLOTS).fill(null);

type ApiBadgeCollection = {
  owned: { badge_id: string; redeemed_at: string }[];
  equipped: (string | null)[];
  max_equipped: number;
};

type BadgesContextValue = {
  owned: Set<string>;
  slots: Slots;
  loaded: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  redeem: (badgeId: string) => Promise<void>;
  saveSlots: (slots: Slots) => Promise<void>;
};

const BadgesContext = createContext<BadgesContextValue | null>(null);

function toSlots(equipped: (string | null)[]): Slots {
  return Array.from({ length: MAX_SLOTS }, (_, i) => equipped[i] ?? null);
}

export function BadgesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const [owned, setOwned] = useState<Set<string>>(new Set());
  const [slots, setSlots] = useState<Slots>(EMPTY);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((collection: ApiBadgeCollection) => {
    setOwned(new Set(collection.owned.map((badge) => badge.badge_id)));
    setSlots(toSlots(collection.equipped));
  }, []);

  const refresh = useCallback(async () => {
    try {
      apply(await api.get<ApiBadgeCollection>("/api/v1/badges/me"));
      setError(null);
    } catch {
      setError("Não foi possível carregar suas badges.");
    } finally {
      setLoaded(true);
    }
  }, [apply]);

  useEffect(() => {
    setOwned(new Set());
    setSlots(EMPTY);
    setLoaded(false);
    if (userId) refresh();
  }, [userId, refresh]);

  const redeem = useCallback(async (badgeId: string) => {
    try {
      await api.post(`/api/v1/badges/${encodeURIComponent(badgeId)}/redeem`, {});
    } catch (err) {
      // 409 = a conta já tinha a badge (ex.: resgatada em outro aparelho): só sincroniza
      if (!(err instanceof ApiError && err.status === 409)) {
        throw new Error(
          err instanceof ApiError && err.status === 404
            ? "Esta badge não existe mais na loja."
            : "Não foi possível resgatar a badge. Tente de novo."
        );
      }
    }
    setOwned((current) => new Set(current).add(badgeId));
  }, []);

  const saveSlots = useCallback(
    async (next: Slots) => {
      try {
        apply(await api.put<ApiBadgeCollection>("/api/v1/badges/me/equipped", { slots: toSlots(next) }));
      } catch {
        await refresh();
        throw new Error("Não foi possível salvar as badges equipadas. Tente de novo.");
      }
    },
    [apply, refresh]
  );

  const value = useMemo(
    () => ({ owned, slots, loaded, error, refresh, redeem, saveSlots }),
    [owned, slots, loaded, error, refresh, redeem, saveSlots]
  );
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export function useBadges(): BadgesContextValue {
  const ctx = useContext(BadgesContext);
  if (!ctx) throw new Error("useBadges precisa estar dentro de <BadgesProvider>");
  return ctx;
}
