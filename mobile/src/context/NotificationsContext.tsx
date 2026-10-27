import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { AppState, Platform } from "react-native";
import { useRouter } from "expo-router";
import { api } from "../services/api";
import { ApiNotification } from "../types";
import { registerLogoutHook, useAuth } from "./AuthContext";

// ============================================================
// AVISOS (notificações dentro do app) + PUSH.
//
// - Lista: GET /api/v1/notifications; contador: GET /api/v1/notifications/unread-count
// - Marcar lida: POST /notifications/{id}/read; todas: POST /notifications/read-all
// - Push (melhor esforço): PUT/DELETE /notifications/push-token. Falhou? O app segue normal,
//   só os avisos dentro do app (lista e sino) continuam funcionando.
// ============================================================

type NotificationsContextValue = {
  items: ApiNotification[];
  unread: number;
  refresh: () => Promise<void>;
  markRead: (id: string) => Promise<void>;
  markAllRead: () => Promise<void>;
};

const NotificationsContext = createContext<NotificationsContextValue | undefined>(undefined);

// Push só funciona em build de desenvolvimento/produção num aparelho real (não na web, Expo Go ou simulador).
// Os módulos são carregados sob demanda para não pesar (nem avisar) onde o push não existe.
function loadPushModules() {
  if (Platform.OS === "web") return null;
  try {
    const Device = require("expo-device") as typeof import("expo-device");
    const Constants = require("expo-constants").default as typeof import("expo-constants").default;
    if (!Device.isDevice || Constants.appOwnership === "expo") return null;
    const Notifications = require("expo-notifications") as typeof import("expo-notifications");
    return { Notifications, Constants };
  } catch {
    return null;
  }
}

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const router = useRouter();
  const [items, setItems] = useState<ApiNotification[]>([]);
  const [unread, setUnread] = useState(0);
  const pushToken = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    const [list, count] = await Promise.all([
      api.get<ApiNotification[]>("/api/v1/notifications?limit=50"),
      api.get<{ count: number }>("/api/v1/notifications/unread-count"),
    ]);
    setItems(list);
    setUnread(count.count);
  }, []);

  const markRead = useCallback(async (id: string) => {
    await api.post(`/api/v1/notifications/${id}/read`, {});
    const now = new Date().toISOString();
    let changed = false;
    setItems((prev) =>
      prev.map((n) => {
        if (n.id !== id || n.read_at) return n;
        changed = true;
        return { ...n, read_at: now };
      })
    );
    if (changed) setUnread((c) => Math.max(0, c - 1));
  }, []);

  const markAllRead = useCallback(async () => {
    await api.post("/api/v1/notifications/read-all", {});
    const now = new Date().toISOString();
    setItems((prev) => prev.map((n) => (n.read_at ? n : { ...n, read_at: now })));
    setUnread(0);
  }, []);

  // Login/logout: zera, recarrega os avisos e (melhor esforço) registra o push
  useEffect(() => {
    setItems([]);
    setUnread(0);
    if (!userId) return;
    refresh().catch(() => {
      // sem a lista o sino fica sem contador; abrir a tela de avisos tenta de novo
    });

    let cancelled = false;
    (async () => {
      try {
        const push = loadPushModules();
        if (!push) return;
        const { Notifications, Constants } = push;
        const current = await Notifications.getPermissionsAsync();
        const granted = current.granted || (await Notifications.requestPermissionsAsync()).granted;
        if (!granted || cancelled) return;
        const projectId = Constants.expoConfig?.extra?.eas?.projectId;
        const { data: token } = await Notifications.getExpoPushTokenAsync({ projectId });
        if (cancelled) return;
        await api.put("/api/v1/notifications/push-token", { token, platform: Platform.OS });
        pushToken.current = token;
      } catch {
        // push é opcional: qualquer falha (permissão, FCM, servidor) é ignorada
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [userId, refresh]);

  // Antes de sair da conta (token da API ainda válido): desregistra o push, sem esperar a resposta
  useEffect(() => {
    return registerLogoutHook(() => {
      const token = pushToken.current;
      pushToken.current = null;
      if (token) api.delete("/api/v1/notifications/push-token", { token }).catch(() => {});
    });
  }, []);

  // Ao voltar para o app, atualiza o contador do sino
  useEffect(() => {
    if (!userId) return;
    const sub = AppState.addEventListener("change", (state) => {
      if (state === "active") refresh().catch(() => {});
    });
    return () => sub.remove();
  }, [userId, refresh]);

  // Push: mostra o aviso com o app aberto e abre a tela certa ao tocar nele
  useEffect(() => {
    if (!userId) return;
    const push = loadPushModules();
    if (!push) return;
    try {
      const { Notifications } = push;
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: false,
          shouldSetBadge: false,
        }),
      });
      const received = Notifications.addNotificationReceivedListener(() => {
        refresh().catch(() => {});
      });
      const tapped = Notifications.addNotificationResponseReceivedListener((response) => {
        const route = response.notification.request.content.data?.route;
        if (typeof route === "string" && route.startsWith("/")) router.push(route as never);
      });
      return () => {
        received.remove();
        tapped.remove();
      };
    } catch {
      return;
    }
  }, [userId, refresh, router]);

  const value = useMemo(
    () => ({ items, unread, refresh, markRead, markAllRead }),
    [items, unread, refresh, markRead, markAllRead]
  );

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>;
}

export function useNotifications() {
  const ctx = useContext(NotificationsContext);
  if (!ctx) throw new Error("useNotifications precisa estar dentro de <NotificationsProvider>");
  return ctx;
}
