// ============================================================
// TIPOS DO APP + formatos de resposta da API e funções de conversão.
// ============================================================

export type UserRole = "admin" | "moderator" | "user";

// Tipo de conta escolhido no cadastro: normal ou especialista
export type AccountType = "normal" | "especialista";

// TEXTO EDITÁVEL — opções da "Área de atuação" (caixa de seleção do cadastro e do perfil).
// Para adicionar uma área, inclua mais um item aqui e acrescente o valor em ExpertArea.
export type ExpertArea = "influencer" | "jornalista" | "dev" | "empresa";
export const EXPERT_AREAS: { value: ExpertArea; label: string }[] = [
  { value: "influencer", label: "Influencer" },
  { value: "jornalista", label: "Jornalista" },
  { value: "dev", label: "Dev" },
  { value: "empresa", label: "Empresa" },
];
export const EXPERT_AREA_LABELS = Object.fromEntries(EXPERT_AREAS.map((a) => [a.value, a.label])) as Record<
  ExpertArea,
  string
>;

export type AuthUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  displayName: string | null;
  bio: string | null;
  avatarUrl: string | null; // caminho relativo na API; use mediaUrl() para exibir
  bannerUrl: string | null;
  notifyFriendRequests: boolean;
  notifyComments: boolean;
  notifyRecommendations: boolean;
  privateProfile: boolean;
  // Conta especialista (company e expertiseArea só existem para ela)
  accountType: AccountType;
  company: string | null;
  expertiseArea: ExpertArea | null;
  followersCount: number;
  isMuted: boolean;
};

// Resposta de GET/PATCH /api/v1/users/me
export type ApiMe = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  notify_friend_requests: boolean;
  notify_comments: boolean;
  notify_recommendations: boolean;
  private_profile: boolean;
  account_type: AccountType;
  company: string | null;
  expertise_area: ExpertArea | null;
  followers_count: number;
  is_muted?: boolean;
};

export function mapApiMe(u: ApiMe): AuthUser {
  return {
    id: u.id,
    username: u.username,
    email: u.email,
    role: u.role,
    displayName: u.display_name,
    bio: u.bio,
    avatarUrl: u.avatar_url,
    bannerUrl: u.banner_url,
    notifyFriendRequests: u.notify_friend_requests,
    notifyComments: u.notify_comments,
    notifyRecommendations: u.notify_recommendations,
    privateProfile: u.private_profile,
    accountType: u.account_type ?? "normal",
    company: u.company,
    expertiseArea: u.expertise_area,
    followersCount: u.followers_count ?? 0,
    isMuted: u.is_muted ?? false,
  };
}

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
  author: string; // nome de exibição, ou @username se não tiver
  isExpert: boolean; // autor é conta especialista (selo + entra na "Nota especialista")
  expertiseArea: ExpertArea | null;
  rating: number; // 1–5 estrelas
  body: string;
  date: string; // AAAA-MM-DD
  title: string | null;
  pros: string | null;
  cons: string | null;
  pinned: boolean;
  gameTitle: string | null;
  gameCover: string | null;
};

// ── Formatos de resposta da API ────────────────────────

export type ApiUser = {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  created_at: string;
  display_name: string | null;
  account_type: AccountType;
  expertise_area: ExpertArea | null;
  followers_count: number;
  avatar_url: string | null;
  bio: string | null;
  company: string | null;
  is_muted: boolean;
  deactivated_by_role: string | null;
};

// Resposta de GET /api/v1/users/{id}: campos de moderação só vêm para quem modera
export type ApiPublicProfile = {
  id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  account_type: AccountType;
  expertise_area: ExpertArea | null;
  company: string | null;
  followers_count: number;
  role: UserRole;
  is_active: boolean | null;
  is_muted: boolean | null;
  deactivated_by_role: string | null;
};

// Resposta de POST/DELETE /api/v1/users/{id}/follow
export type ApiFollowStatus = {
  user_id: string;
  following: boolean;
  followers_count: number;
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
  display_name: string | null;
  is_expert: boolean;
  expertise_area: ExpertArea | null;
  title: string | null;
  pros: string | null;
  cons: string | null;
  pinned: boolean;
  game_title: string | null;
  game_cover_url: string | null;
  created_at: string;
  updated_at: string;
};

// TEXTO EDITÁVEL — motivos de denúncia de comentário (value = valor da API).
export type ReportReason = "ofensivo" | "spam" | "spoiler" | "outro";
export const REPORT_REASONS: { value: ReportReason; label: string }[] = [
  { value: "ofensivo", label: "Ofensivo" },
  { value: "spam", label: "Spam" },
  { value: "spoiler", label: "Spoiler" },
  { value: "outro", label: "Outro" },
];

export type ReportStatus = "pending" | "kept" | "removed";

// Item de GET /api/v1/moderation/reports (denúncias de um comentário com o mesmo status)
export type ApiReportGroup = {
  review_id: string;
  review_exists: boolean;
  current_body: string | null;
  review_body: string;
  review_rating: number;
  author_id: string | null;
  author_name: string;
  author_is_muted: boolean | null;
  author_is_active: boolean | null;
  author_deactivated_by_role: string | null;
  game_id: string | null;
  game_title: string;
  reasons: ReportReason[];
  reporters_count: number;
  last_reported_at: string;
  status: ReportStatus;
};

export type ExpertRequestStatus = "pending" | "approved" | "rejected";

export type ApiExpertRequest = {
  id: string;
  user_id: string;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  expertise_area: ExpertArea;
  company: string | null;
  link: string | null;
  message: string;
  status: ExpertRequestStatus;
  rejection_reason: string | null;
  created_at: string;
  decided_at: string | null;
};

export type NotificationType =
  | "new_follower"
  | "friend_request"
  | "expert_request_approved"
  | "expert_request_rejected"
  | "review_removed"
  | "muted"
  | "unmuted";

export type ApiNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  data: Record<string, unknown> | null;
  read_at: string | null;
  created_at: string;
};

export type ApiActivityItem = {
  kind: "expert_request" | "report";
  title: string;
  created_at: string;
  route: string;
};

// Resposta de GET /api/v1/admin/stats
export type ApiAdminStats = {
  users: number;
  experts: number;
  moderators: number;
  banned: number;
  muted: number;
  games: number;
  reviews: number;
  pending_expert_requests: number;
  pending_reports: number;
  recent_activity: ApiActivityItem[];
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
    author: r.display_name || r.username || "Usuário",
    isExpert: r.is_expert,
    expertiseArea: r.expertise_area,
    // backend usa escala 1–10, o app exibe 1–5 estrelas
    rating: Math.max(1, Math.round(r.rating / 2)),
    body: r.body ?? "",
    date: r.created_at.split("T")[0],
    title: r.title,
    pros: r.pros,
    cons: r.cons,
    pinned: r.pinned,
    gameTitle: r.game_title,
    gameCover: r.game_cover_url,
  };
}

// estrelas (1–5) → escala do backend (1–10)
export function starsToApiRating(stars: number): number {
  return stars * 2;
}
