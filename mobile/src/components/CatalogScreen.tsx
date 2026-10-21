import React, { useMemo, useState } from "react";
import { View, Text, FlatList, ActivityIndicator, RefreshControl, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Screen from "./Screen";
import { useAppTheme } from "../theme/ThemeContext";
import { useGames } from "../context/GamesContext";
import { Game } from "../types";
import TopBar from "./TopBar";
import GameCard from "./GameCard";
import SearchBar from "./SearchBar";
import FilterPills from "./FilterPills";
import BottomTabs from "./BottomTabs";
import { useLibrary } from "../context/LibraryContext";

type ExpertFilter = "todos" | "nao_analisados";

// TEXTO EDITÁVEL — filtros do catálogo do especialista
const EXPERT_FILTERS: { value: ExpertFilter; label: string }[] = [
  { value: "todos", label: "TODOS" },
  { value: "nao_analisados", label: "NÃO ANALISADOS" },
];

// Catálogo — jogos vindos da API, com busca por título, desenvolvedora ou gênero.
// Usado na tela inicial (conta normal) e na aba Catálogo do especialista (expert),
// que mostra o selo "Analisado" e o filtro "Não analisados" em vez de recomendações.
export default function CatalogScreen({ expert = false }: { expert?: boolean }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { games, isLoading, error, refresh } = useGames();
  const { myReviewFor } = useLibrary();
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ExpertFilter>("todos");

  const filteredGames = useMemo(() => {
    const q = query.trim().toLowerCase();
    const base = expert && filter === "nao_analisados" ? games.filter((g) => !myReviewFor(g.id)) : games;
    if (!q) return base;
    return base.filter(
      (g) =>
        g.title.toLowerCase().includes(q) ||
        g.developer.toLowerCase().includes(q) ||
        g.genre.toLowerCase().includes(q)
    );
  }, [games, query, expert, filter, myReviewFor]);

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

        {expert && <FilterPills<ExpertFilter> options={EXPERT_FILTERS} selected={filter} onSelect={setFilter} />}

        {/* TEXTO EDITÁVEL — título da lista */}
        <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
          {query ? "Resultados da busca" : expert ? "Catálogo" : "Jogos recomendados"}
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
          renderItem={({ item }) => {
            const mine = expert ? myReviewFor(item.id) : undefined;
            return (
            <GameCard
              game={item}
              subtitle={subtitle(item)}
              rating={mine?.rating}
              badge={mine ? "Analisado" : undefined}
              // CAMINHO DE NAVEGAÇÃO: leva para app/jogo/[id].tsx passando o id do jogo
              onPress={() => router.push(`/jogo/${item.id}`)}
            />
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
  sectionTitle: { fontSize: 13, fontWeight: "600", marginBottom: 8 },
  empty: { alignItems: "center", gap: 10, marginTop: 16 },
  emptyText: { fontSize: 12, textAlign: "center", marginTop: 16 },
  retry: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6 },
});
