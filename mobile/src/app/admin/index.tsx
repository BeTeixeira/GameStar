import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import StatTile from "../../components/StatTile";
import Tag from "../../components/Tag";
import { useAppTheme } from "../../theme/ThemeContext";
import { api } from "../../services/api";
import { formatDate } from "../../utils/confirm";
import { ApiAdminStats } from "../../types";

// VISÃO GERAL (home do admin) — rota "/admin". A navegação entre as telas do admin é
// a barra de abas de baixo (src/components/BottomTabs.tsx).
// Tudo vem de GET /api/v1/admin/stats (contagens, alertas e atividade recente).
const ACTIVITY_TAG = {
  expert_request: { label: "Pedido", tone: "warn" },
  report: { label: "Denúncia", tone: "bad" },
} as const;

export default function AdminGeral() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [stats, setStats] = useState<ApiAdminStats | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<ApiAdminStats>("/api/v1/admin/stats")
        .then(setStats)
        .catch(() => setStats(null));
    }, [])
  );

  const value = (n: number | undefined) => (stats ? (n as number) : "–");

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Painel do admin</Text>

        {/* ALERTAS — levam para as abas Pedidos e Moderação */}
        {stats && stats.pending_expert_requests > 0 && (
          <Alert
            text={`${stats.pending_expert_requests} pedidos de especialista aguardando`}
            onPress={() => router.replace("/admin/pedidos")}
          />
        )}
        {stats && stats.pending_reports > 0 && (
          <Alert
            text={`${stats.pending_reports} denúncias de comentários pendentes`}
            onPress={() => router.replace("/admin/moderacao")}
          />
        )}

        <View style={styles.row}>
          <StatTile value={value(stats?.users)} label="Usuários" />
          <StatTile value={value(stats?.experts)} label="Especialistas" />
        </View>
        <View style={styles.row}>
          <StatTile value={value(stats?.moderators)} label="Moderadores" />
          <StatTile value={value(stats?.banned)} label="Banidas" />
        </View>
        <View style={styles.row}>
          <StatTile value={value(stats?.games)} label="Jogos" />
          <StatTile value={value(stats?.reviews)} label="Comentários" />
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
        {stats?.recent_activity.length === 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nada por aqui ainda.</Text>
        )}
        {stats?.recent_activity.map((item, index) => (
          <Activity
            key={`${item.kind}-${item.created_at}-${index}`}
            title={item.title}
            when={formatDate(item.created_at)}
            tag={<Tag label={ACTIVITY_TAG[item.kind].label} tone={ACTIVITY_TAG[item.kind].tone} />}
            onPress={() => router.push(item.route as never)}
          />
        ))}
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
