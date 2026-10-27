import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { mediaUrl } from "../services/api";
import { Review } from "../types";
import { formatDate } from "../utils/confirm";
import StarRating from "./StarRating";

type Props = {
  review: Review;
  showExpertDetails: boolean; // título, prós e contras (análise de especialista)
  onOpenGame: () => void;
  onDelete?: () => void; // lixeira de moderação
};

// SEÇÃO DE UM JOGO NO PERFIL — capa, título (abre o jogo) e o comentário da pessoa.
export default function ProfileGameSection({ review, showExpertDetails, onOpenGame, onDelete }: Props) {
  const { colors } = useAppTheme();
  const cover = mediaUrl(review.gameCover);

  return (
    <View
      style={[styles.card, { backgroundColor: colors.card, borderColor: review.pinned ? colors.accent : colors.cardBorder }]}
    >
      <View style={styles.header}>
        <TouchableOpacity onPress={onOpenGame} style={styles.game}>
          <View style={[styles.cover, { backgroundColor: colors.inputBackground }]}>
            {cover && <Image source={{ uri: cover }} style={StyleSheet.absoluteFill} contentFit="cover" />}
          </View>
          <Text style={{ flex: 1, color: colors.textPrimary, fontSize: 13, fontWeight: "700" }} numberOfLines={2}>
            {review.gameTitle ?? "Jogo"}
          </Text>
        </TouchableOpacity>
        {onDelete && (
          <TouchableOpacity onPress={onDelete} hitSlop={8}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        )}
      </View>

      {review.pinned && <Text style={{ color: colors.accent, fontSize: 10, fontWeight: "700" }}>ANÁLISE FIXADA</Text>}
      <View style={styles.rating}>
        <StarRating rating={review.rating} size={12} />
        <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{formatDate(review.date)}</Text>
      </View>
      {showExpertDetails && !!review.title && (
        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "700" }}>{review.title}</Text>
      )}
      {!!review.body && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{review.body}</Text>}
      {showExpertDetails && !!review.pros && <Text style={{ color: colors.success, fontSize: 11 }}>+ {review.pros}</Text>}
      {showExpertDetails && !!review.cons && <Text style={{ color: colors.danger, fontSize: 11 }}>- {review.cons}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 6 },
  header: { flexDirection: "row", alignItems: "center", gap: 8 },
  game: { flex: 1, flexDirection: "row", alignItems: "center", gap: 10 },
  cover: { width: 40, height: 54, borderRadius: 6, overflow: "hidden" },
  rating: { flexDirection: "row", alignItems: "center", gap: 8 },
});
