import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeContext";

// Quadrado com um número grande e um rótulo (painéis do especialista e do admin).
export default function StatTile({ value, label }: { value: string | number; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.tile, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={{ color: colors.textPrimary, fontSize: 20, fontWeight: "700" }}>{value}</Text>
      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: { flex: 1, borderWidth: 1, borderRadius: 11, paddingVertical: 10, paddingHorizontal: 12 },
});
