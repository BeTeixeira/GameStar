import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";

// ============================================================
// SESSÃO SALVA NO APARELHO
//
// O token de login fica guardado para o app abrir já logado.
// - Celular: expo-secure-store (Keychain no iOS, Keystore no Android).
// - Navegador: localStorage (o secure-store não existe na web).
// Falhas aqui nunca travam o app: no pior caso, pede login de novo.
// ============================================================

const TOKEN_KEY = "gamestar.session.token";

export async function loadSessionToken(): Promise<string | null> {
  try {
    if (Platform.OS === "web") return globalThis.localStorage?.getItem(TOKEN_KEY) ?? null;
    return await SecureStore.getItemAsync(TOKEN_KEY);
  } catch {
    return null;
  }
}

export async function saveSessionToken(token: string): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.setItem(TOKEN_KEY, token);
    else await SecureStore.setItemAsync(TOKEN_KEY, token);
  } catch {
    // sem armazenamento: a sessão vale só enquanto o app estiver aberto
  }
}

export async function clearSessionToken(): Promise<void> {
  try {
    if (Platform.OS === "web") globalThis.localStorage?.removeItem(TOKEN_KEY);
    else await SecureStore.deleteItemAsync(TOKEN_KEY);
  } catch {
    // nada a fazer
  }
}
