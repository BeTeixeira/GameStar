import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import StatTile from "../../components/StatTile";
import Tag from "../../components/Tag";
import PreviewBanner from "../../components/PreviewBanner";
import { useAppTheme } from "../../theme/ThemeContext";
import { useGames } from "../../context/GamesContext";
import { api } from "../../services/api";
import { ApiUser } from "../../types";
import { PREVIEW_REPORTS, PREVIEW_REQUESTS } from "../../data/adminPreview";

// VISÃO GERAL (home do admin) — rota "/admin". A navegação entre as telas do admin é
// a barra de abas de baixo (src/components/BottomTabs.tsx).
//   Reais: usuários, especialistas e jogos.
//   Exemplo (sem backend ainda): comentários, alertas de pedidos/denúncias e atividade recente.
export default function AdminGeral() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { games } = useGames();
  const [users, setUsers] = useState<ApiUser[] | null>(null);

  useEffect(() => {
    api
      .get<ApiUser[]>("/api/v1/users?limit=200")
      .then(setUsers)
      .catch(() => setUsers(null));
  }, []);

  const pending = PREVIEW_REQUESTS.filter((r) => r.status === "pendente").length;
  const experts = users ? users.filter((u) => u.account_type === "especialista").length : "–";

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Painel do admin</Text>
        <PreviewBanner text="Prévia: alertas, comentários e atividade são exemplos; usuários, especialistas e jogos são reais." />

        {/* ALERTAS — levam para as abas Pedidos e Moderação */}
        <Alert
          text={`${pending} pedidos de especialista aguardando`}
          onPress={() => router.replace("/admin/pedidos")}
        />
        <Alert
          text={`${PREVIEW_REPORTS.length} denúncias de comentários pendentes`}
          onPress={() => router.replace("/admin/moderacao")}
        />

        <View style={styles.row}>
          <StatTile value={users ? (users.length >= 200 ? "200+" : users.length) : "–"} label="Usuários" />
          <StatTile value={experts} label="Especialistas" />
        </View>
        <View style={styles.row}>
          <StatTile value={games.length} label="Jogos" />
          <StatTile value="–" label="Comentários" />
        </View>

        <Text style={[styles.section, { color: colors.textPrimary }]}>Atalhos</Text>
        <View style={styles.row}>
          {/* CAMINHOS — abrem o formulário de jogo e a lista de contas */}
          <TouchableOpacity
            onPress={() => router.push("/admin/jogo")}
            style={[styles.shortcut, { backgroundColor: colors.accent, borderColor: colors.accent }]}
          >
            <Ionicons name="add" size={16} color="#FFFFFF" />
            <Text style={styles.shortcutText}>Novo jogo</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.replace("/admin/contas")}
            style={[styles.shortcut, { borderColor: colors.accent }]}
          >
            <Ionicons name="search" size={15} color={colors.accent} />
            <Text style={[styles.shortcutText, { color: colors.textPrimary }]}>Buscar conta</Text>
          </TouchableOpacity>
        </View>

        <Text style={[styles.section, { color: colors.textPrimary }]}>Atividade recente</Text>
        <Activity
          title={`Pedido de "${PREVIEW_REQUESTS[0].name}"`}
          when={PREVIEW_REQUESTS[0].when}
          tag={<Tag label="Pendente" tone="warn" />}
          onPress={() => router.push(`/admin/pedido/${PREVIEW_REQUESTS[0].id}`)}
        />
        <Activity
          title={`Denúncia em ${PREVIEW_REPORTS[0].game}`}
          when={PREVIEW_REPORTS[0].when}
          tag={<Tag label="Denúncia" tone="bad" />}
          onPress={() => router.replace("/admin/moderacao")}
        />
      </ScrollView>
      <BottomTabs />
    </Screen>
  );
}

function Alert({ text, onPress }: { text: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.alert, { borderColor: colors.star }]}>
      <Text style={{ color: colors.textPrimary, fontSize: 12, flex: 1 }}>{text}</Text>
      <Text style={{ color: colors.star, fontSize: 12, fontWeight: "700" }}>Ver</Text>
    </TouchableOpacity>
  );
}

function Activity({ title, when, tag, onPress }: { title: string; when: string; tag: React.ReactNode; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.activity, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={{ flex: 1 }}>
        <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>{title}</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{when}</Text>
      </View>
      {tag}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  row: { flexDirection: "row", gap: 10 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 6 },
  alert: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 11, padding: 10 },
  shortcut: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderWidth: 1, borderRadius: 8, paddingVertical: 10 },
  shortcutText: { color: "#FFFFFF", fontSize: 12, fontWeight: "700" },
  activity: { flexDirection: "row", alignItems: "center", borderWidth: 1, borderRadius: 10, padding: 10 },
});
