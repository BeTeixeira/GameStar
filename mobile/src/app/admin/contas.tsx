import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import FilterPills from "../../components/FilterPills";
import UsersAdmin, { AccountFilter } from "../../components/admin/UsersAdmin";
import { useAppTheme } from "../../theme/ThemeContext";

// ABA CONTAS do admin — rota "/admin/contas". Junta usuários e especialistas numa lista só.
// Tocar numa conta abre o detalhe (src/app/admin/conta/[id].tsx).
// "Promover por ID" abre o fluxo antigo (src/app/admin/especialistas.tsx).

// TEXTO EDITÁVEL — filtros
const FILTERS: { value: AccountFilter; label: string }[] = [
  { value: "todas", label: "TODAS" },
  { value: "normais", label: "NORMAIS" },
  { value: "especialistas", label: "ESPECIALISTAS" },
  { value: "desativadas", label: "DESATIVADAS" },
  { value: "admins", label: "ADMINS" },
];

export default function AdminContas() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<AccountFilter>("todas");

  return (
    <Screen>
      <TopBar />
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>Contas</Text>
          <TouchableOpacity onPress={() => router.push("/admin/especialistas")} hitSlop={8} style={styles.link}>
            <Ionicons name="ribbon-outline" size={14} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 11 }}>Promover por ID</Text>
          </TouchableOpacity>
        </View>
        <FilterPills<AccountFilter> options={FILTERS} selected={filter} onSelect={setFilter} />
        <View style={{ flex: 1 }}>
          <UsersAdmin filter={filter} />
        </View>
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  title: { fontSize: 17, fontWeight: "700" },
  link: { flexDirection: "row", alignItems: "center", gap: 4 },
});
