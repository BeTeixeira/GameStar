import * as Sentry from "@sentry/react-native";

// ============================================================
// RELATÓRIO DE ERROS (Sentry) — opcional.
//
// Só liga com EXPO_PUBLIC_SENTRY_DSN definido (no .env do mobile ou no ambiente
// do EAS). Sem DSN, nada é enviado. Fica desligado no desenvolvimento.
// Para stack traces legíveis (source maps), falta configurar o plugin
// "@sentry/react-native/expo" com org/projeto e SENTRY_AUTH_TOKEN no EAS.
// ============================================================

const dsn = process.env.EXPO_PUBLIC_SENTRY_DSN;

export const monitoringEnabled = !!dsn && !__DEV__;

export function initMonitoring(): void {
  if (!monitoringEnabled) return;
  Sentry.init({
    dsn,
    sendDefaultPii: false,
    tracesSampleRate: 0,
  });
}

export function identifyUser(id: string | null): void {
  if (!monitoringEnabled) return;
  Sentry.setUser(id ? { id } : null);
}

export const wrapRoot = Sentry.wrap;
