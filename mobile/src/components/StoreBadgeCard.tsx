import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { Badge } from "../data/badges";
import BadgeImage from "./BadgeImage";

type Props = {
  badge: Badge;
  owned: boolean;
  equipped: boolean;
  onPress: () => void;
};

// Card de uma badge na Loja. Estados: "Resgatar" (fase de testes, grátis),
// "Você tem" (já resgatada) e "Equipada" (está no perfil).
export default function StoreBadgeCard({ badge, owned, equipped, onPress }: Props) {
  const { colors } = useAppTheme();
  const action = equipped ? "Equipada" : owned ? "Você tem" : "Resgatar";

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.name}, ${action}`}
      style={[styles.card, { backgroundColor: colors.card, borderColor: equipped ? colors.star : colors.cardBorder }]}
    >
      <View style={[styles.imageBox, { backgroundColor: colors.inputBackground }]}>
        <BadgeImage id={badge.id} size={84} />
      </View>
      <Text numberOfLines={2} style={[styles.name, { color: colors.textPrimary }]}>
        {badge.name}
      </Text>
      <Text numberOfLines={1} style={[styles.category, { color: colors.textSecondary }]}>
        {badge.category}
      </Text>
      <View
        style={[
          styles.action,
          { backgroundColor: owned ? colors.cardBorder : colors.star },
        ]}
      >
        {equipped && <Ionicons name="checkmark-circle" size={14} color={colors.star} style={{ marginRight: 4 }} />}
        {!owned && <Ionicons name="gift-outline" size={14} color="#1A1230" style={{ marginRight: 4 }} />}
        <Text style={[styles.actionText, { color: owned ? colors.textPrimary : "#1A1230" }]}>{action}</Text>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { flex: 1, borderRadius: 18, borderWidth: 1, padding: 10 },
  imageBox: { borderRadius: 14, height: 112, alignItems: "center", justifyContent: "center", marginBottom: 10 },
  name: { fontSize: 13, fontWeight: "700", lineHeight: 17, minHeight: 34 },
  category: { fontSize: 11, marginTop: 2, marginBottom: 10 },
  action: { flexDirection: "row", height: 36, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  actionText: { fontSize: 13, fontWeight: "700" },
});
