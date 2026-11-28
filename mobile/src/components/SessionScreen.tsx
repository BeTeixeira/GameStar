import React from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";

// Tela mostrada ao abrir o app enquanto a sessão salva é conferida na API
// ("restoring") ou quando a API não respondeu ("offline", com botão de tentar de novo).
export default function SessionScreen() {
  const { colors } = useAppTheme();
  const { session, retrySession, logout } = useAuth();

  if (session === "restoring") {
    return (
      <View style={[styles.root, { backgroundColor: colors.background }]}>
        <Text style={[styles.brand, { color: colors.textPrimary }]}>GameStar</Text>
        <ActivityIndicator color={colors.accent} style={{ marginTop: 20 }} />
      </View>
    );
  }

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <Ionicons name="cloud-offline-outline" size={48} color={colors.accent} />
      <Text style={[styles.title, { color: colors.textPrimary }]}>Sem conexão com o servidor</Text>
      <Text style={[styles.text, { color: colors.textSecondary }]}>
        Confira sua internet. Se ela estiver ok, o servidor pode estar fora do ar por alguns minutos.
      </Text>
      <TouchableOpacity onPress={retrySession} style={[styles.button, { backgroundColor: colors.accent }]}>
        <Text style={styles.buttonText}>Tentar de novo</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={logout} style={styles.link}>
        <Text style={{ fontSize: 13, color: colors.textSecondary }}>Entrar com outra conta</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 10 },
  brand: { fontSize: 28, fontWeight: "800", letterSpacing: 0.5 },
  title: { fontSize: 18, fontWeight: "700", textAlign: "center", marginTop: 6 },
  text: { fontSize: 13, lineHeight: 19, textAlign: "center", maxWidth: 320 },
  button: { height: 46, borderRadius: 12, paddingHorizontal: 28, alignItems: "center", justifyContent: "center", marginTop: 12 },
  buttonText: { fontSize: 15, fontWeight: "700", color: "#FFFFFF" },
  link: { paddingVertical: 12 },
});
