import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import FilterPills from "../../components/FilterPills";
import Avatar from "../../components/Avatar";
import Tag from "../../components/Tag";
import { useAppTheme } from "../../theme/ThemeContext";
import { api } from "../../services/api";
import { ApiExpertRequest, EXPERT_AREA_LABELS, ExpertRequestStatus } from "../../types";

// ABA PEDIDOS do admin — rota "/admin/pedidos". Fila de aprovação de quem pediu para virar especialista.
// Tocar num pedido abre src/app/admin/pedido/[id].tsx.
const TONE = { pending: "warn", approved: "ok", rejected: "bad" } as const;
const LABEL: Record<ExpertRequestStatus, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Recusado" };
const PILL: Record<ExpertRequestStatus, string> = { pending: "PENDENTES", approved: "APROVADOS", rejected: "RECUSADOS" };
const STATUSES: ExpertRequestStatus[] = ["pending", "approved", "rejected"];

type Lists = Record<ExpertRequestStatus, ApiExpertRequest[]>;

export default function AdminPedidos() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<ExpertRequestStatus>("pending");
  const [lists, setLists] = useState<Lists | null>(null);

  useFocusEffect(
    useCallback(() => {
      Promise.all(STATUSES.map((s) => api.get<ApiExpertRequest[]>(`/api/v1/expert-requests?status=${s}&limit=100`)))
        .then(([pending, approved, rejected]) => setLists({ pending, approved, rejected }))
        .catch(() => setLists(null));
    }, [])
  );

  const options = STATUSES.map((s) => ({
    value: s,
    label: lists ? `${PILL[s]} · ${lists[s].length}` : PILL[s],
  }));
  const items = lists ? lists[filter] : [];

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Pedidos de especialista</Text>
        <FilterPills<ExpertRequestStatus> options={options} selected={filter} onSelect={setFilter} />
        {items.map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => router.push(`/admin/pedido/${r.id}`)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Avatar avatarUrl={r.avatar_url} name={r.display_name || r.username} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{r.display_name || r.username}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                {EXPERT_AREA_LABELS[r.expertise_area]}
                {r.company ? ` · ${r.company}` : ""}
              </Text>
            </View>
            <Tag label={LABEL[r.status]} tone={TONE[r.status]} />
          </TouchableOpacity>
        ))}
        {lists && items.length === 0 && <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhum pedido aqui.</Text>}
      </ScrollView>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 8 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 2 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1 },
});
