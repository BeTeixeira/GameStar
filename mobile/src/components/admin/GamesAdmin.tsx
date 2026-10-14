import React, { useState } from "react";
import { View, Text, Image, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../theme/ThemeContext";
import { useGames } from "../../context/GamesContext";
import { api } from "../../services/api";
import { Game } from "../../types";
import { confirmAction } from "../../utils/confirm";

// Aba "Jogos" do painel do admin: lista o catálogo, abre o formulário
// (src/app/admin/jogo.tsx) para criar/editar e exclui jogos.
export default function GamesAdmin() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { games, isLoading, refresh } = useGames();
  const [error, setError] = useState<string | null>(null);

  const deleteGame = (game: Game) =>
    confirmAction(`Excluir "${game.title}"? As avaliações desse jogo também serão apagadas.`, async () => {
      setError(null);
      try {
        await api.delete(`/api/v1/games/${game.id}`);
        await refresh();
      } catch (e: any) {
        setError(e.message ?? "Não foi possível excluir o jogo.");
      }
    });

  return (
    <FlatList
      data={games}
      keyExtractor={(g) => g.id}
      refreshing={isLoading}
      onRefresh={refresh}
      ListHeaderComponent={
        <View>
          <TouchableOpacity
            onPress={() => router.push("/admin/jogo")}
            style={[styles.newButton, { backgroundColor: colors.accent }]}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            {/* TEXTO EDITÁVEL */}
            <Text style={styles.newButtonText}>Novo jogo</Text>
          </TouchableOpacity>
          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={
        isLoading ? null : (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhum jogo cadastrado.</Text>
        )
      }
      renderItem={({ item }) => (
        <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          {item.image ? (
            <Image source={item.image} style={styles.cover} />
          ) : (
            <View style={[styles.cover, { backgroundColor: colors.inputBackground }]} />
          )}
          <View style={{ flex: 1 }}>
            <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
              {item.title}
            </Text>
            <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
              {[item.genre, item.year].filter(Boolean).join(" · ") || "Sem dados"}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => router.push({ pathname: "/admin/jogo", params: { id: item.id } })}
            hitSlop={8}
            style={styles.action}
          >
            <Ionicons name="create-outline" size={18} color={colors.accent} />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => deleteGame(item)} hitSlop={8} style={styles.action}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  newButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 10,
  },
  newButtonText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  error: { fontSize: 11, marginBottom: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 8,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  cover: { width: 40, height: 40, borderRadius: 6 },
  title: { fontSize: 13, fontWeight: "600" },
  action: { paddingHorizontal: 4 },
});
