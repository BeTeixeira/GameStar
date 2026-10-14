import React, { useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import FilterPills from "../../components/FilterPills";
import GamesAdmin from "../../components/admin/GamesAdmin";
import UsersAdmin from "../../components/admin/UsersAdmin";
import ExpertsAdmin from "../../components/admin/ExpertsAdmin";
import { useAppTheme } from "../../theme/ThemeContext";

// Painel do admin — rota "/admin". Só abre para contas admin (regra no _layout.tsx).
// Cada aba é um componente em src/components/admin/.

type Tab = "jogos" | "usuarios" | "especialistas";

// TEXTO EDITÁVEL — nomes das abas
const TABS: { value: Tab; label: string }[] = [
  { value: "jogos", label: "JOGOS" },
  { value: "usuarios", label: "USUÁRIOS" },
  { value: "especialistas", label: "ESPECIALISTAS" },
];

export default function AdminPanel() {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<Tab>("jogos");

  return (
    <Screen>
      <TopBar />
      <View style={styles.content}>
        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Painel do admin</Text>
        <FilterPills<Tab> options={TABS} selected={tab} onSelect={setTab} />
        <View style={styles.body}>
          {tab === "jogos" && <GamesAdmin />}
          {tab === "usuarios" && <UsersAdmin />}
          {tab === "especialistas" && <ExpertsAdmin />}
        </View>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 8 },
  body: { flex: 1, marginTop: 8 },
});
