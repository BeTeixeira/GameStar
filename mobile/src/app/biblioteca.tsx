import React, { useMemo, useState } from "react";
import { View, Text, FlatList, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../components/Screen";
import { useAppTheme } from "../theme/ThemeContext";
import { useGames } from "../context/GamesContext";
import { LibraryStatus, STATUS_LABELS, useLibrary } from "../context/LibraryContext";
import { useAuth } from "../context/AuthContext";
import TopBar from "../components/TopBar";
import BottomTabs from "../components/BottomTabs";
import GameCard from "../components/GameCard";
import FilterPills from "../components/FilterPills";

// Tela "Minha lista" — filtros COMPLETO / JOGANDO / JOGAR DEPOIS /
// AVALIADO / NÃO AVALIADO / NÃO GOSTEI.
//
// - COMPLETO, JOGANDO, JOGAR DEPOIS e NÃO GOSTEI: status escolhido na
//   tela do jogo (salvo na API: /api/v1/library).
// - AVALIADO: jogos em que você deixou comentário/nota (vem da API).
// - NÃO AVALIADO: jogos da sua lista que você ainda não avaliou.
//
// CONTA ESPECIALISTA: sem filtros — mostra só os jogos avaliados.

type Filter = LibraryStatus | "avaliado" | "nao_avaliado";

// TEXTO EDITÁVEL — rótulos dos filtros
const FILTERS: { value: Filter; label: string }[] = [
  { value: "completed", label: STATUS_LABELS.completed },
  { value: "playing", label: STATUS_LABELS.playing },
  { value: "plan_to_play", label: STATUS_LABELS.plan_to_play },
  { value: "avaliado", label: "AVALIADO" },
  { value: "nao_avaliado", label: "NÃO AVALIADO" },
  { value: "disliked", label: STATUS_LABELS.disliked },
];

export default function Biblioteca() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { games } = useGames();
  const { isExpert } = useAuth();
  const { statuses, myReviewFor } = useLibrary();
  const [filter, setFilter] = useState<Filter>("completed");

  const filteredGames = useMemo(
    () =>
      games.filter((g) => {
        if (isExpert) return !!myReviewFor(g.id); // especialista: só jogos avaliados
        if (filter === "avaliado") return !!myReviewFor(g.id);
        if (filter === "nao_avaliado") return !!statuses[g.id] && !myReviewFor(g.id);
        return statuses[g.id] === filter;
      }),
    [games, filter, statuses, myReviewFor, isExpert]
  );

  return (
    <Screen>
      <TopBar />

      <View style={styles.content}>
        {!isExpert && <FilterPills<Filter> options={FILTERS} selected={filter} onSelect={setFilter} />}

        <FlatList
          data={filteredGames}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => {
            const review = myReviewFor(item.id);
            const status = statuses[item.id];
            return (
              <GameCard
                game={item}
                subtitle={isExpert ? review?.body ?? "" : review?.body || (status ? STATUS_LABELS[status] : "")}
                rating={review?.rating}
                onPress={() => router.push(`/jogo/${item.id}`)}
              />
            );
          }}
          ListEmptyComponent={
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              {isExpert
                ? "Você ainda não avaliou nenhum jogo. Abra um jogo no catálogo e deixe sua nota para ele aparecer aqui."
                : "Nenhum jogo nesse filtro ainda. Abra um jogo no catálogo para adicioná-lo à sua lista."}
            </Text>
          }
        />
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
});
