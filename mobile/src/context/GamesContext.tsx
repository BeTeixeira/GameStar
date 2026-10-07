import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { api } from '../services/api';
import { ApiGame, Game, mapApiGame } from '../types';

interface GamesContextValue {
  games: Game[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const GamesContext = createContext<GamesContextValue | null>(null);

export const GamesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.get<ApiGame[]>('/api/v1/games?limit=100');
      setGames(data.map(mapApiGame));
    } catch (e: any) {
      setError(e.message ?? 'Erro ao carregar jogos');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  return (
    <GamesContext.Provider value={{ games, isLoading, error, refresh }}>
      {children}
    </GamesContext.Provider>
  );
};

export const useGames = (): GamesContextValue => {
  const ctx = useContext(GamesContext);
  if (!ctx) throw new Error('useGames must be used inside GamesProvider');
  return ctx;
};
