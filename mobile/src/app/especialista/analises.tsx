import React, { useMemo, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import FilterPills from "../../components/FilterPills";
import StarRating from "../../components/StarRating";
import { useAppTheme } from "../../theme/ThemeContext";
import { useGames } from "../../context/GamesContext";
import { useLibrary } from "../../context/LibraryContext";
import { formatDate } from "../../utils/confirm";

// ANÁLISES — substitui "Minha lista" para o especialista (rota "/especialista/analises").
// Lista as análises que ele já publicou. Tocar leva ao jogo (onde a análise é editada hoje);
// o "+" abre a tela Nova análise.
type Sort = "recentes" | "nota";

// TEXTO EDITÁVEL — ordenação
const SORTS: { value: Sort; label: string }[] = [
  { value: "recentes", label: "RECENTES" },
  { value: "nota", label: "MAIOR NOTA" },
];

export default function AnalisesEspecialista() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { games } = useGames();
  const { myReviews } = useLibrary();
  const [sort, setSort] = useState<Sort>("recentes");

  const data = useMemo(
    () =>
      [...myReviews].sort((a, b) =>
        sort === "nota" ? b.rating - a.rating || b.date.localeCompare(a.date) : b.date.localeCompare(a.date)
      ),
    [myReviews, sort]
  );

  return (
    <Screen>
      <TopBar />
      <View style={styles.content}>
        <View style={styles.header}>
          {/* TEXTO EDITÁVEL */}
          <Text style={[styles.title, { color: colors.textPrimary }]}>Minhas análises</Text>
          {/* CAMINHO — abre src/app/especialista/nova-analise.tsx */}
          <TouchableOpacity
            onPress={() => router.push("/especialista/nova-analise")}
            style={[styles.add, { backgroundColor: colors.accent }]}
            hitSlop={8}
          >
            <Ionicons name="add" size={18} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
        <FilterPills<Sort> options={SORTS} selected={sort} onSelect={setSort} />

        <FlatList
          data={data}
          keyExtractor={(r) => r.id}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Você ainda não publicou análises. Toque no "+" ou escolha um jogo no Painel.
            </Text>
          }
          renderItem={({ item }) => {
            const game = games.find((g) => g.id === item.gameId);
            return (
              <TouchableOpacity
                onPress={() => router.push(`/jogo/${item.gameId}`)}
                style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
              >
                <View style={styles.cardTop}>
                  {game?.image ? (
                    <Image source={game.image} style={styles.thumb} />
                  ) : (
                    <View style={[styles.thumb, styles.thumbEmpty, { borderColor: colors.cardBorder }]}>
                      <Ionicons name="image-outline" size={16} color={colors.textSecondary} />
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                      {game?.title ?? "Jogo"}
                    </Text>
                    <StarRating rating={item.rating} />
                  </View>
                  <Ionicons name="create-outline" size={16} color={colors.textSecondary} />
                </View>
                {!!item.body && (
                  <Text style={{ color: colors.textSecondary, fontSize: 11 }} numberOfLines={2}>
                    {item.body}
                  </Text>
                )}
                <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{formatDate(item.date)}</Text>
              </TouchableOpacity>
            );
          }}
        />
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  add: { width: 30, height: 30, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  card: { padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8, gap: 6 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 10 },
  thumb: { width: 38, height: 48, borderRadius: 6 },
  thumbEmpty: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
});
