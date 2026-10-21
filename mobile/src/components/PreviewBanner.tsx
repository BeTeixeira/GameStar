import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";

// Aviso das telas que ainda são só a "casca" (navegação e layout, sem backend).
// Quando a tela for ligada à API, apague o <PreviewBanner /> dela.
export default function PreviewBanner({ text = "Prévia: layout com dados de exemplo, ainda sem servidor." }: { text?: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.box, { borderColor: colors.star }]}>
      <Ionicons name="construct-outline" size={14} color={colors.star} />
      <Text style={{ color: colors.textSecondary, fontSize: 11, flex: 1 }}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flexDirection: "row", alignItems: "center", gap: 8, borderWidth: 1, borderRadius: 8, padding: 8, marginBottom: 10 },
});
