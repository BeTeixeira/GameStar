import Constants from "expo-constants";
import { Platform } from "react-native";

// ============================================================
// CLIENTE DA API (backend FastAPI em backend/).
//
// Endereço da API, em ordem de prioridade:
//   1) variável EXPO_PUBLIC_API_URL (ex: EXPO_PUBLIC_API_URL=http://192.168.0.10:8000)
//   2) APK / EAS Update (modo produção): "extra.apiUrl" do app.json (túnel ngrok).
//      Fica no app.json, e não no eas.json, porque o EAS Update não lê as
//      variáveis de ambiente do build — o mesmo endereço vale para os dois.
//   3) no celular (Expo Go / dev build): mesmo IP do servidor do Expo, porta 8000
//   4) no navegador: http://localhost:8000
//   5) emulador Android sem Expo Go: http://10.0.2.2:8000
// ============================================================

const API_PORT = 8000;

function resolveBaseUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_API_URL;
  if (fromEnv) return fromEnv.replace(/\/$/, "");

  const fromConfig = Constants.expoConfig?.extra?.apiUrl as string | undefined;
  if (!__DEV__ && fromConfig) return fromConfig.replace(/\/$/, "");

  if (Platform.OS === "web") return `http://localhost:${API_PORT}`;

  // hostUri é o endereço do servidor de desenvolvimento, ex: "192.168.0.10:8081".
  // Extraímos só o IP e trocamos a porta pela da API.
  // (expoGoConfig.hostUri saiu dos tipos do expo-manifests, mas versões do Expo Go ainda o enviam)
  const hostUri =
    Constants.expoConfig?.hostUri ?? (Constants.expoGoConfig as { hostUri?: string } | null)?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(":")[0];
    return `http://${ip}:${API_PORT}`;
  }
  return `http://10.0.2.2:${API_PORT}`;
}

export const BASE_URL = resolveBaseUrl();

let _token: string | null = null;

export function setAuthToken(token: string | null): void {
  _token = token;
}

// Erro HTTP da API; `status` permite tratar casos específicos (ex: 404, 409) na tela.
export class ApiError extends Error {
  constructor(message: string, public status: number) {
    super(message);
  }
}

// FastAPI devolve erros como { detail: "..." } ou, em validação, { detail: [{ msg }] }
function errorMessage(err: any, status: number): string {
  const detail = err?.detail;
  if (typeof detail === "string") return detail;
  if (Array.isArray(detail) && detail[0]?.msg) return detail[0].msg;
  return `Erro HTTP ${status}`;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    // ngrok grátis mostra uma página de aviso para navegadores; este cabeçalho pula o aviso
    "ngrok-skip-browser-warning": "1",
  };
  if (_token) headers["Authorization"] = `Bearer ${_token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${BASE_URL}. O backend está rodando?`);
  }

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new ApiError(errorMessage(err, res.status), res.status);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  let res: Response;
  try {
    res = await fetch(`${BASE_URL}/api/v1/auth/token`, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "ngrok-skip-browser-warning": "1",
      },
      body: body.toString(),
    });
  } catch {
    throw new Error(`Não foi possível conectar à API em ${BASE_URL}. O backend está rodando?`);
  }
  if (!res.ok) {
    if (res.status === 401) throw new Error("Email ou senha incorretos.");
    const err = await res.json().catch(() => null);
    throw new ApiError(errorMessage(err, res.status), res.status);
  }
  const data = await res.json();
  return data.access_token as string;
}

export const api = {
  get: <T>(path: string) => request<T>("GET", path),
  post: <T>(path: string, body: unknown) => request<T>("POST", path, body),
  put: <T>(path: string, body: unknown) => request<T>("PUT", path, body),
  patch: <T>(path: string, body: unknown) => request<T>("PATCH", path, body),
  delete: (path: string) => request<void>("DELETE", path),
};
