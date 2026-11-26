import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { Badge } from "../data/badges";
import BadgeImage from "./BadgeImage";

type Props = {
  badge: Badge;
  owned: boolean;
  selected: boolean; // está em um dos 3 espaços do perfil
  onPress: () => void;
};

// Uma badge na grade: colorida se a conta tem, cinza + cadeado se não tem.
// Borda de destaque quando já está escolhida para o perfil.
export default function BadgeTile({ badge, owned, selected, onPress }: Props) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${badge.name}, ${owned ? "desbloqueada" : "bloqueada"}${selected ? ", no perfil" : ""}`}
      style={styles.wrap}
    >
      <View
        style={[
          styles.box,
          { backgroundColor: colors.card, borderColor: selected ? colors.star : colors.cardBorder, borderWidth: selected ? 2 : 1 },
        ]}
      >
        <BadgeImage id={badge.id} size={64} locked={!owned} />
        {!owned && (
          <View style={[styles.lock, { backgroundColor: colors.cardBorder, borderColor: colors.background }]}>
            <Ionicons name="lock-closed" size={11} color={colors.textSecondary} />
          </View>
        )}
        {selected && (
          <View style={[styles.check, { backgroundColor: colors.star }]}>
            <Ionicons name="checkmark" size={12} color="#1A1230" />
          </View>
        )}
      </View>
      <Text numberOfLines={2} style={[styles.name, { color: owned ? colors.textPrimary : colors.textSecondary }]}>
        {badge.name}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrap: { width: "33.33%", alignItems: "center", paddingHorizontal: 4, marginBottom: 14 },
  box: { width: 84, height: 84, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  lock: { position: "absolute", right: -4, bottom: -4, width: 22, height: 22, borderRadius: 11, borderWidth: 2, alignItems: "center", justifyContent: "center" },
  check: { position: "absolute", left: -4, top: -4, width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 11, lineHeight: 14, textAlign: "center", marginTop: 6, minHeight: 28 },
});
