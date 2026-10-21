import React from "react";
import { View, Text, ScrollView, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import StatTile from "../../components/StatTile";
import StarRating from "../../components/StarRating";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { useGames } from "../../context/GamesContext";
import { useLibrary } from "../../context/LibraryContext";
import { EXPERT_AREA_LABELS } from "../../types";

// PAINEL DO ESPECIALISTA — home da conta especialista (rota "/especialista").
// Números, fila de jogos "Para analisar" e últimas análises.
// Seguidores, análises e nota média vêm da API; "Comentários" ainda não tem endpoint.
export default function PainelEspecialista() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const { games } = useGames();
  const { myReviews, myReviewFor } = useLibrary();

  const toAnalyze = games.filter((g) => !myReviewFor(g.id)).slice(0, 10);
  const avg = myReviews.length ? (myReviews.reduce((s, r) => s + r.rating, 0) / myReviews.length).toFixed(1).replace(".", ",") : "–";
  const latest = [...myReviews].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 3);

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* TEXTO EDITÁVEL — saudação */}
        <Text style={[styles.hello, { color: colors.textPrimary }]}>Olá, {user?.displayName || user?.username}</Text>
        <View style={[styles.tag, { backgroundColor: colors.accent }]}>
          <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
          <Text style={styles.tagText}>
            Especialista{user?.expertiseArea ? ` · ${EXPERT_AREA_LABELS[user.expertiseArea]}` : ""}
          </Text>
        </View>

        {/* NÚMEROS — TEXTO EDITÁVEL nos rótulos */}
        <View style={styles.row}>
          <StatTile value={user?.followersCount ?? 0} label="Seguidores" />
          <StatTile value={myReviews.length} label="Análises" />
        </View>
        <View style={styles.row}>
          <StatTile value={avg === "–" ? "–" : `${avg} ★`} label="Nota média" />
          <StatTile value="–" label="Comentários recebidos" />
        </View>

        {/* PARA ANALISAR — jogos que você ainda não avaliou */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: colors.textPrimary }]}>Para analisar</Text>
          <TouchableOpacity onPress={() => router.replace("/especialista/catalogo")} hitSlop={8}>
            <Text style={{ color: colors.accent, fontSize: 11 }}>Ver catálogo</Text>
          </TouchableOpacity>
        </View>
        {toAnalyze.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Você já analisou todos os jogos do catálogo.</Text>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
            {toAnalyze.map((g) => (
              <TouchableOpacity key={g.id} style={styles.cover} onPress={() => router.push(`/jogo/${g.id}`)}>
                {g.image ? (
                  <Image source={g.image} style={styles.coverImg} />
                ) : (
                  <View style={[styles.coverImg, styles.coverEmpty, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                    <Ionicons name="image-outline" size={22} color={colors.textSecondary} />
                  </View>
                )}
                <Text style={{ color: colors.textPrimary, fontSize: 11, marginTop: 4 }} numberOfLines={1}>
                  {g.title}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* ÚLTIMAS ANÁLISES */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.section, { color: colors.textPrimary }]}>Suas últimas análises</Text>
          <TouchableOpacity onPress={() => router.replace("/especialista/analises")} hitSlop={8}>
            <Text style={{ color: colors.accent, fontSize: 11 }}>Ver todas</Text>
          </TouchableOpacity>
        </View>
        {latest.length === 0 ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Nenhuma análise ainda. Escolha um jogo em "Para analisar".
          </Text>
        ) : (
          latest.map((r) => {
            const game = games.find((g) => g.id === r.gameId);
            return (
              <TouchableOpacity
                key={r.id}
                onPress={() => router.push(`/jogo/${r.gameId}`)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                    {game?.title ?? "Jogo"}
                  </Text>
                  <StarRating rating={r.rating} />
                </View>
                <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10 },
  hello: { fontSize: 17, fontWeight: "700" },
  tag: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  tagText: { color: "#FFFFFF", fontSize: 10, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginTop: 6 },
  section: { fontSize: 13, fontWeight: "700" },
  cover: { width: 84 },
  coverImg: { width: 84, height: 112, borderRadius: 8 },
  coverEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
});
