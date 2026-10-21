import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, useRouter } from "expo-router";
import { useAppTheme } from "../theme/ThemeContext";

// Barra superior das telas de detalhe: seta de voltar + título.
// "fallback" é para onde voltar quando não há tela anterior (ex: abriu direto).
export default function BackBar({ title, fallback = "/" }: { title: string; fallback?: string }) {
  const { colors } = useAppTheme();
  const router = useRouter();
  return (
    <View style={[styles.bar, { backgroundColor: colors.headerBackground, borderColor: colors.cardBorder }]}>
      <TouchableOpacity
        onPress={() => (router.canGoBack() ? router.back() : router.replace(fallback as Href))}
        hitSlop={10}
        style={styles.side}
      >
        <Ionicons name="chevron-back" size={22} color={colors.textPrimary} />
      </TouchableOpacity>
      <Text style={[styles.title, { color: colors.textPrimary }]} numberOfLines={1}>
        {title}
      </Text>
      <View style={styles.side} />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: 1 },
  side: { width: 44 },
  title: { fontSize: 15, fontWeight: "700", flex: 1, textAlign: "center" },
});
