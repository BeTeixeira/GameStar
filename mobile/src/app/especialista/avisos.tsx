import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import { useAppTheme } from "../../theme/ThemeContext";

// AVISOS — destino do sino da barra superior do especialista (rota "/especialista/avisos").
// Por enquanto é só a tela vazia; depois vai listar novo seguidor, resposta a uma análise, etc.
export default function AvisosEspecialista() {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <TopBar />
      <View style={styles.center}>
        <Ionicons name="notifications-outline" size={40} color={colors.textSecondary} />
        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Avisos</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, textAlign: "center" }}>
          Em breve: novos seguidores e respostas às suas análises aparecem aqui.
        </Text>
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  title: { fontSize: 17, fontWeight: "700" },
});
