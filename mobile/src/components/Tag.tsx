import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeContext";

type Props = { label: string; tone?: "accent" | "ok" | "warn" | "bad" };

// Selo pequeno (ex: "Analisado", "Pendente", "Admin").
export default function Tag({ label, tone = "accent" }: Props) {
  const { colors } = useAppTheme();
  const map = {
    accent: { bg: colors.accent, fg: "#FFFFFF", border: colors.accent },
    ok: { bg: "transparent", fg: colors.success, border: colors.success },
    warn: { bg: "transparent", fg: colors.star, border: colors.star },
    bad: { bg: "transparent", fg: colors.danger, border: colors.danger },
  }[tone];
  return (
    <View style={[styles.tag, { backgroundColor: map.bg, borderColor: map.border }]}>
      <Text style={{ fontSize: 9, fontWeight: "700", color: map.fg }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tag: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 7, paddingVertical: 1.5, alignSelf: "flex-start" },
});
