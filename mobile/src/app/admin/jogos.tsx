import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import GamesAdmin from "../../components/admin/GamesAdmin";
import { useAppTheme } from "../../theme/ThemeContext";

// ABA JOGOS do admin — rota "/admin/jogos". Lista, cria, edita e exclui jogos (GamesAdmin).
export default function AdminJogos() {
  const { colors } = useAppTheme();
  return (
    <Screen>
      <TopBar />
      <View style={styles.content}>
        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Jogos</Text>
        <GamesAdmin />
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
});
