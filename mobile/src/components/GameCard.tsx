import React from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Game } from "../types";
import { useAppTheme } from "../theme/ThemeContext";
import StarRating from "./StarRating";

type Props = {
  game: Game;
  // Texto abaixo do título (catálogo: gênero/ano; minha lista: seu comentário)
  subtitle: string;
  // Nota em estrelas; se não houver, as estrelas não aparecem
  rating?: number;
  onPress: () => void;
};

export default function GameCard({ game, subtitle, rating, onPress }: Props) {
  const { colors } = useAppTheme();

  return (
    <TouchableOpacity
      onPress={onPress}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
    >
      {game.image ? (
        <Image source={game.image} style={styles.thumb} />
      ) : (
        // Placeholder exibido quando o jogo não tem cover_image_url
        <View style={[styles.thumb, styles.thumbPlaceholder, { borderColor: colors.cardBorder }]}>
          <Ionicons name="image-outline" size={18} color={colors.textSecondary} />
        </View>
      )}

      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
          {game.title}
        </Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1}>
          {subtitle}
        </Text>
        {rating != null && <StarRating rating={rating} />}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  thumb: { width: 42, height: 42, borderRadius: 8 },
  thumbPlaceholder: { alignItems: "center", justifyContent: "center", borderWidth: 1 },
  title: { fontSize: 13, fontWeight: "600" },
  subtitle: { fontSize: 11, marginTop: 2, marginBottom: 4 },
});
