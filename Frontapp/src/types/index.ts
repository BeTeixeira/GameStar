// ============================================================
// TIPOS DO APP + formatos de resposta da API e funções de conversão.
// ============================================================

export type UserRole = "admin" | "user";

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
};

export type Game = {
  id: string;
  title: string;
  genre: string;
  developer: string;
  year: number | null;
  description: string;
  image: { uri: string } | null; // capa vinda de cover_image_url
};

export type Review = {
  id: string;
  userId: string;
  gameId: string;
  author: string;
  rating: number; // 1–5 estrelas
  body: string;
  date: string; // AAAA-MM-DD
};

// ── Formatos de resposta da API ────────────────────────

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
};

export type ApiGame = {
  id: string;
  title: string;
  genre: string | null;
  developer: string | null;
  release_date: string | null;
  description: string | null;
  cover_image_url: string | null;
  created_at: string;
};

export type ApiReview = {
  id: string;
  user_id: string;
  game_id: string;
  rating: number; // 1–10 no backend
  body: string | null;
  username: string | null;
  created_at: string;
  updated_at: string;
};

// Status de um jogo na "Minha lista" (mesmos valores do backend)
export type LibraryStatus = "completed" | "playing" | "plan_to_play" | "disliked";

export type ApiLibraryEntry = {
  game_id: string;
  status: LibraryStatus;
  created_at: string;
  updated_at: string;
};

export type ApiFriendUser = { id: string; username: string };

export type ApiFriend = {
  friendship_id: string;
  user: ApiFriendUser;
  since: string;
};

export type ApiFriendRequest = {
  id: string;
  direction: "incoming" | "outgoing"; // incoming = recebido (pode aceitar)
  user: ApiFriendUser;
  created_at: string;
};

export type ApiFriendRequestResult = {
  id: string;
  status: "pending" | "accepted"; // accepted: o outro já tinha pedido, virou amizade na hora
  user: ApiFriendUser;
};

// ── Conversões ─────────────────────────────────────────

export function mapApiGame(g: ApiGame): Game {
  return {
    id: g.id,
    title: g.title,
    genre: g.genre ?? "",
    developer: g.developer ?? "Desconhecido",
    year: g.release_date ? parseInt(g.release_date.split("-")[0], 10) : null,
    description: g.description ?? "",
    image: g.cover_image_url ? { uri: g.cover_image_url } : null,
  };
}

export function mapApiReview(r: ApiReview): Review {
  return {
    id: r.id,
    userId: r.user_id,
    gameId: r.game_id,
    author: r.username ?? "Usuário",
    // backend usa escala 1–10, o app exibe 1–5 estrelas
    rating: Math.max(1, Math.round(r.rating / 2)),
    body: r.body ?? "",
    date: r.created_at.split("T")[0],
  };
}

// estrelas (1–5) → escala do backend (1–10)
export function starsToApiRating(stars: number): number {
  return stars * 2;
}
