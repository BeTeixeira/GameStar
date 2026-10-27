import React from "react";
import { Text, View, StyleSheet } from "react-native";
import Screen from "../components/Screen";
import TopBar from "../components/TopBar";
import BottomTabs from "../components/BottomTabs";
import ModerationPanel from "../components/moderation/ModerationPanel";
import { useAppTheme } from "../theme/ThemeContext";

// ABA MODERAÇÃO do moderador — rota "/moderacao" (só admin e moderador entram; ver app/_layout.tsx).
// O painel (denúncias, recentes, histórico) é o mesmo do moderador: src/components/moderation/ModerationPanel.tsx.
export default function Moderacao() {
  const { colors } = useAppTheme();

  return (
    <Screen>
      <TopBar />
      <View style={styles.header}>
        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Moderação</Text>
      </View>
      <ModerationPanel />
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: 12, paddingTop: 12 },
  title: { fontSize: 17, fontWeight: "700" },
});
