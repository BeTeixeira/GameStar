import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import FilterPills from "../../components/FilterPills";
import PreviewBanner from "../../components/PreviewBanner";
import Avatar from "../../components/Avatar";
import Tag from "../../components/Tag";
import { useAppTheme } from "../../theme/ThemeContext";
import { PREVIEW_REQUESTS, RequestStatus } from "../../data/adminPreview";

// ABA PEDIDOS do admin — rota "/admin/pedidos". Fila de aprovação de quem pediu para virar especialista.
// PRÉVIA: dados de exemplo (src/data/adminPreview.ts). Tocar num pedido abre src/app/admin/pedido/[id].tsx.
// Falta no backend: tabela de pedidos e as ações criar / aprovar / recusar.
const TONE = { pendente: "warn", aprovado: "ok", recusado: "bad" } as const;
const LABEL: Record<RequestStatus, string> = { pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado" };

export default function AdminPedidos() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [filter, setFilter] = useState<RequestStatus>("pendente");
  const count = (s: RequestStatus) => PREVIEW_REQUESTS.filter((r) => r.status === s).length;

  const options: { value: RequestStatus; label: string }[] = [
    { value: "pendente", label: `PENDENTES · ${count("pendente")}` },
    { value: "aprovado", label: "APROVADOS" },
    { value: "recusado", label: "RECUSADOS" },
  ];

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Pedidos de especialista</Text>
        <PreviewBanner />
        <FilterPills<RequestStatus> options={options} selected={filter} onSelect={setFilter} />
        {PREVIEW_REQUESTS.filter((r) => r.status === filter).map((r) => (
          <TouchableOpacity
            key={r.id}
            onPress={() => router.push(`/admin/pedido/${r.id}`)}
            style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
          >
            <Avatar avatarUrl={null} name={r.name} size={36} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{r.name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                {r.area} · {r.company}
              </Text>
            </View>
            <Tag label={LABEL[r.status]} tone={TONE[r.status]} />
          </TouchableOpacity>
        ))}
        {PREVIEW_REQUESTS.filter((r) => r.status === filter).length === 0 && (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhum pedido aqui.</Text>
        )}
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
