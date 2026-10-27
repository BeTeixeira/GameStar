import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import BackBar from "../../components/BackBar";
import Avatar from "../../components/Avatar";
import StatTile from "../../components/StatTile";
import ProfileGameSection from "../../components/ProfileGameSection";
import ModerationActions from "../../components/moderation/ModerationActions";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { api } from "../../services/api";
import { ApiPublicProfile, ApiReview, EXPERT_AREA_LABELS, Review, mapApiReview } from "../../types";
import { confirmAction } from "../../utils/confirm";

// PERFIL PÚBLICO — rota "/perfil-publico/{id}".
// Aberta ao tocar no nome de qualquer usuário (comentários, amigos, seguindo, moderação).
// Dados reais: GET /users/{id}/profile (sem e-mail) e GET /reviews/user/{id}.
// Moderador/admin também vê o bloco de moderação e a lixeira em cada seção.
export default function PerfilPublico() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me, isModerator, canModerate } = useAuth();
  const { isFollowing, toggleFollow } = useFollow();

  const [profile, setProfile] = useState<ApiPublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<ApiPublicProfile>(`/api/v1/users/${id}/profile`),
      api.get<ApiReview[]>(`/api/v1/reviews/user/${id}?limit=100`),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setReviews(
          r.map(mapApiReview).sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.date.localeCompare(a.date))
        );
        setError(null);
      })
      .catch((e) => setError(e.message ?? "Não foi possível carregar o perfil."))
      .finally(() => setLoading(false));
  }, [id]);

  const deleteReview = (review: Review) =>
    confirmAction(`Excluir o comentário sobre ${review.gameTitle ?? "este jogo"}?`, async () => {
      try {
        await api.delete(`/api/v1/moderation/reviews/${review.id}`);
        setReviews((list) => list.filter((r) => r.id !== review.id));
      } catch (e: any) {
        setError(e.message ?? "Não foi possível excluir.");
      }
    });

  const isMe = me?.id === id;
  const isExpert = profile?.account_type === "especialista";
  const name = profile ? profile.display_name || profile.username : "";
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1).replace(".", ",") : "–";
  const protectedTarget = profile?.role === "admin" || profile?.role === "moderator";
  const canDeleteReviews = canModerate && !(isModerator && protectedTarget);

  return (
    <Screen>
      <BackBar title={name || "Perfil"} fallback={me?.accountType === "especialista" ? "/especialista" : "/"} />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : !profile ? (
        <Text style={{ color: colors.danger, fontSize: 12, padding: 14 }}>{error ?? "Perfil não encontrado."}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          {!!error && <Text style={{ color: colors.danger, fontSize: 12 }}>{error}</Text>}
          <View style={styles.identity}>
            <Avatar avatarUrl={profile.avatar_url} name={name} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>{name}</Text>
              {isExpert && (
                <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                  <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.tagText}>
                    Especialista{profile.expertise_area ? ` · ${EXPERT_AREA_LABELS[profile.expertise_area]}` : ""}
                  </Text>
                </View>
              )}
              {isExpert && !!profile.company && (
                <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{profile.company}</Text>
              )}
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>@{profile.username}</Text>
            </View>
          </View>

          {!!profile.bio && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{profile.bio}</Text>}

          {isExpert && (
            <View style={styles.row}>
              <StatTile value={profile.followers_count} label="Seguidores" />
              <StatTile value={reviews.length} label="Análises" />
              <StatTile value={avg === "–" ? "–" : `${avg} ★`} label="Média" />
            </View>
          )}

          {/* SEGUIR — não aparece na própria vitrine */}
          {!isMe && isExpert && (
            <TouchableOpacity
              onPress={() => toggleFollow(profile.id).catch((e) => setError(e.message ?? "Não foi possível seguir."))}
              style={[
                styles.followButton,
                { backgroundColor: isFollowing(profile.id) ? "transparent" : colors.accent, borderColor: colors.accent },
              ]}
            >
              <Text style={{ color: "#FFFFFF", fontSize: 13, fontWeight: "700" }}>
                {isFollowing(profile.id) ? "Seguindo" : "Seguir"}
              </Text>
            </TouchableOpacity>
          )}

          <ModerationActions profile={profile} onChange={setProfile} />

          <Text style={[styles.section, { color: colors.textPrimary }]}>{isExpert ? "Análises" : "Comentários"}</Text>
          {reviews.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhum comentário publicado ainda.</Text>
          ) : (
            reviews.map((r) => (
              <ProfileGameSection
                key={r.id}
                review={r}
                showExpertDetails={isExpert}
                onOpenGame={() => router.push(`/jogo/${r.gameId}`)}
                onDelete={canDeleteReviews && !isMe ? () => deleteReview(r) : undefined}
              />
            ))
          )}
        </ScrollView>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  followButton: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  section: { fontSize: 13, fontWeight: "700", marginTop: 4 },
});
