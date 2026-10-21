import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import BackBar from "../../components/BackBar";
import Avatar from "../../components/Avatar";
import StarRating from "../../components/StarRating";
import StatTile from "../../components/StatTile";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useFollow } from "../../context/FollowContext";
import { useGames } from "../../context/GamesContext";
import { api } from "../../services/api";
import { ApiReview, ApiUser, EXPERT_AREA_LABELS, Review, mapApiReview } from "../../types";

// PERFIL PÚBLICO (VITRINE) — rota "/perfil-publico/{id}".
// O que qualquer usuário vê ao tocar no nome de um especialista (e o que o próprio
// especialista vê em "Ver como meus seguidores me veem").
// Dados reais: GET /users/{id} e GET /reviews/user/{id}. Ainda não existem no backend:
// bio, empresa, links externos e análise fixada (aparecerão aqui quando existirem).
export default function PerfilPublico() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const { isFollowing, toggleFollow } = useFollow();
  const { games } = useGames();

  const [profile, setProfile] = useState<ApiUser | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    setLoading(true);
    Promise.all([
      api.get<ApiUser>(`/api/v1/users/${id}`),
      api.get<ApiReview[]>(`/api/v1/reviews/user/${id}?limit=100`),
    ])
      .then(([p, r]) => {
        setProfile(p);
        setReviews(r.map(mapApiReview).sort((a, b) => b.date.localeCompare(a.date)));
        setError(null);
      })
      .catch((e) => setError(e.message ?? "Não foi possível carregar o perfil."))
      .finally(() => setLoading(false));
  }, [id]);

  const isMe = me?.id === id;
  const name = profile ? profile.display_name || profile.username : "";
  const avg = reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1).replace(".", ",") : "–";
  const followers = profile ? profile.followers_count : 0;

  return (
    <Screen>
      <BackBar title={name || "Perfil"} fallback={me?.accountType === "especialista" ? "/especialista" : "/"} />
      {loading ? (
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
      ) : error || !profile ? (
        <Text style={{ color: colors.danger, fontSize: 12, padding: 14 }}>{error ?? "Perfil não encontrado."}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <Avatar avatarUrl={isMe ? me?.avatarUrl ?? null : null} name={name} size={64} />
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 16, fontWeight: "700" }}>{name}</Text>
              {profile.account_type === "especialista" && (
                <View style={[styles.tag, { backgroundColor: colors.accent }]}>
                  <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.tagText}>
                    Especialista{profile.expertise_area ? ` · ${EXPERT_AREA_LABELS[profile.expertise_area]}` : ""}
                  </Text>
                </View>
              )}
              {isMe && !!me?.company && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{me.company}</Text>}
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>@{profile.username}</Text>
            </View>
          </View>

          <View style={styles.row}>
            <StatTile value={followers} label="Seguidores" />
            <StatTile value={reviews.length} label="Análises" />
            <StatTile value={avg === "–" ? "–" : `${avg} ★`} label="Média" />
          </View>

          {/* SEGUIR — não aparece na própria vitrine */}
          {!isMe && profile.account_type === "especialista" && (
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

          <Text style={[styles.section, { color: colors.textPrimary }]}>Análises recentes</Text>
          {reviews.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhuma análise publicada ainda.</Text>
          ) : (
            reviews.slice(0, 10).map((r) => {
              const game = games.find((g) => g.id === r.gameId);
              return (
                <TouchableOpacity
                  key={r.id}
                  onPress={() => router.push(`/jogo/${r.gameId}`)}
                  style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                >
                  <View style={{ flex: 1, gap: 2 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                      {game?.title ?? "Jogo"}
                    </Text>
                    <StarRating rating={r.rating} />
                    {!!r.body && (
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={2}>
                        {r.body}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              );
            })
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
  card: { flexDirection: "row", padding: 10, borderRadius: 10, borderWidth: 1 },
});
