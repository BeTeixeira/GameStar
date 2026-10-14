import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../services/api";
import { ApiGame, Game, mapApiGame } from "../types";

type GamesContextValue = {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  getGame: (id: string) => Game | undefined;
};

const GamesContext = createContext<GamesContextValue | undefined>(undefined);

// Catálogo de jogos vindo de GET /api/v1/games.
export function GamesProvider({ children }: { children: React.ReactNode }) {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ApiGame[]>("/api/v1/games?limit=100");
      setGames(data.map(mapApiGame));
    } catch (e: any) {
      setError(e.message ?? "Erro ao carregar jogos");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const getGame = useCallback((id: string) => games.find((g) => g.id === id), [games]);

  const value = useMemo(
    () => ({ games, isLoading, error, refresh, getGame }),
    [games, isLoading, error, refresh, getGame]
  );

  return <GamesContext.Provider value={value}>{children}</GamesContext.Provider>;
}

export function useGames() {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error("useGames precisa estar dentro de <GamesProvider>");
  return ctx;
}
