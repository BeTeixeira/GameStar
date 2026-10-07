import Constants from 'expo-constants';

function resolveBaseUrl(): string {
  // No Expo Go, hostUri é o endereço do servidor de desenvolvimento, ex: "192.168.0.10:8081"
  // Extraímos só o IP e trocamos a porta pela da API.
  const hostUri = Constants.expoGoConfig?.hostUri;
  if (hostUri) {
    const ip = hostUri.split(':')[0];
    return `http://${ip}:8000`;
  }
  // Fallback para emulador Android
  return 'http://10.0.2.2:8000';
}

export const BASE_URL = resolveBaseUrl();

let _token: string | null = null;

export function setAuthToken(token: string | null): void {
  _token = token;
}

async function request<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (_token) headers['Authorization'] = `Bearer ${_token}`;

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: `Erro HTTP ${res.status}` }));
    throw new Error(err.detail ?? `Erro HTTP ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

export async function loginWithPassword(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${BASE_URL}/api/v1/auth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: 'Email ou senha incorretos' }));
    throw new Error(err.detail ?? 'Email ou senha incorretos');
  }
  const data = await res.json();
  return data.access_token as string;
}

export const api = {
  get:    <T>(path: string)                => request<T>('GET', path),
  post:   <T>(path: string, body: unknown) => request<T>('POST', path, body),
  patch:  <T>(path: string, body: unknown) => request<T>('PATCH', path, body),
  delete: (path: string)                   => request<void>('DELETE', path),
};
