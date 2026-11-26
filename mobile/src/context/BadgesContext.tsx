import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useAuth } from "./AuthContext";

// ============================================================
// BADGES DO USUÁRIO (front-end, sem API por enquanto).
//
// - "owned": quais badges a conta já desbloqueou. HOJE É DEMONSTRAÇÃO:
//   a lista fixa abaixo. Quando o backend tiver badges, troque o
//   `OWNED_DEMO` por uma chamada à API (ex: GET /api/v1/users/me/badges).
// - "slots": as 3 badges exibidas no perfil (null = espaço livre).
//   São salvas no aparelho (AsyncStorage), uma chave por usuário.
// ============================================================

export const MAX_SLOTS = 3;

// DEMONSTRAÇÃO — ids das badges (src/data/badges.ts) que a conta "já tem".
const OWNED_DEMO = [
  "16_fundador",
  "15_beta_tester",
  "01_conta_1mes",
  "02_conta_3meses",
  "30_primeira_avaliacao",
  "31_primeiro_amigo",
  "09_avaliacoes_25",
  "27_sequencia_7",
];

export type Slots = (string | null)[];
const EMPTY: Slots = Array(MAX_SLOTS).fill(null);

type BadgesContextValue = {
  owned: Set<string>;
  slots: Slots; // as badges salvas no perfil
  loaded: boolean;
  saveSlots: (slots: Slots) => Promise<void>;
};

const BadgesContext = createContext<BadgesContextValue | null>(null);

const keyFor = (userId: string) => `gamestar:badges:slots:${userId}`;

// Garante exatamente 3 posições e só badges que a conta realmente tem.
function normalize(raw: unknown, owned: Set<string>): Slots {
  const arr = Array.isArray(raw) ? raw : [];
  return Array.from({ length: MAX_SLOTS }, (_, i) => {
    const id = arr[i];
    return typeof id === "string" && owned.has(id) ? id : null;
  });
}

export function BadgesProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id ?? null;
  const owned = useMemo(() => new Set(OWNED_DEMO), []);
  const [slots, setSlots] = useState<Slots>(EMPTY);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let alive = true;
    setLoaded(false);
    if (!userId) {
      setSlots(EMPTY);
      return;
    }
    AsyncStorage.getItem(keyFor(userId))
      .then((json) => (json ? JSON.parse(json) : []))
      .catch(() => [])
      .then((raw) => {
        if (!alive) return;
        setSlots(normalize(raw, owned));
        setLoaded(true);
      });
    return () => {
      alive = false;
    };
  }, [userId, owned]);

  const saveSlots = useCallback(
    async (next: Slots) => {
      if (!userId) return;
      const clean = normalize(next, owned);
      await AsyncStorage.setItem(keyFor(userId), JSON.stringify(clean));
      setSlots(clean);
    },
    [userId, owned]
  );

  const value = useMemo(() => ({ owned, slots, loaded, saveSlots }), [owned, slots, loaded, saveSlots]);
  return <BadgesContext.Provider value={value}>{children}</BadgesContext.Provider>;
}

export function useBadges(): BadgesContextValue {
  const ctx = useContext(BadgesContext);
  if (!ctx) throw new Error("useBadges precisa estar dentro de <BadgesProvider>");
  return ctx;
}
