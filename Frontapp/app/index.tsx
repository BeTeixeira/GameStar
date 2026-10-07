import React, { useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../src/components/Screen";
import { useAppTheme } from "../src/theme/ThemeContext";
import { useGames } from "../src/context/GamesContext";
import { Game } from "../src/types";
import TopBar from "../src/components/TopBar";
import GameCard from "../src/components/GameCard";
import SearchBar from "../src/components/SearchBar";

// Tela inicial / Catálogo — jogos vindos da API, com busca por título,
// desenvolvedora ou gênero.
export default function Home() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { games, isLoading, error, refresh } = useGames();
  const [query, setQuery] = useState("");

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return games;
    return games.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q)
    );
  }, [games, query]);

  const subtitle = (g: Game) => [g.genre, g.year].filter(Boolean).join(" · ") || g.developer;

  const renderEmpty = () => {
    if (isLoading) return <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />;
    if (error)
      return (
        <View style={styles.empty}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>{error}</Text>
          <TouchableOpacity onPress={refresh} style={[styles.retry, { borderColor: colors.accent }]}>
            <Text style={{ color: colors.accent, fontSize: 12 }}>Tentar de novo</Text>
          </TouchableOpacity>
        </View>
      );
    return (
      <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
        {query ? `Nenhum jogo encontrado para "${query}".` : "Nenhum jogo cadastrado ainda."}
      </Text>
    );
  };

  return (
    <Screen>
      <TopBar />

      <View style={styles.content}>
        {/* TEXTO EDITÁVEL — placeholder do campo de busca */}
        <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar jogos..." />

        {/* TEXTO EDITÁVEL — título da lista */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {query ? "Resultados da busca" : "Jogos recomendados"}
        </Text>

        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
          refreshControl={
            <RefreshControl refreshing={isLoading && games.length > 0} onRefresh={refresh} tintColor={colors.accent} />
          }
          ListEmptyComponent={renderEmpty}
          renderItem={({ item }) => (
            <GameCard
              game={item}
              subtitle={subtitle(item)}
              // CAMINHO DE NAVEGAÇÃO: leva para app/jogo/[id].tsx passando o id do jogo
              onPress={() => router.push(`/jogo/${item.id}`)}
            />
          )}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  sectionTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  empty: { alignItems: "center", gap: 10, marginTop: 16 },
  emptyText: { fontSize: 12, textAlign: "center", marginTop: 16 },
  retry: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
