import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import FilterPills from "../../components/FilterPills";
import PreviewBanner from "../../components/PreviewBanner";
import Tag from "../../components/Tag";
import { useAppTheme } from "../../theme/ThemeContext";
import { PREVIEW_REPORTS } from "../../data/adminPreview";

// ABA MODERAÇÃO do admin — rota "/admin/moderacao".
// Fila de comentários denunciados. PRÉVIA: usa dados de exemplo (src/data/adminPreview.ts) e os
// botões ainda não chamam o servidor. Falta no backend: tabela de denúncias, o botão "denunciar"
// para o usuário e as ações manter / apagar comentário / desativar autor.
type Tab = "denuncias" | "recentes";

const TABS: { value: Tab; label: string }[] = [
  { value: "denuncias", label: `DENÚNCIAS · ${PREVIEW_REPORTS.length}` },
  { value: "recentes", label: "RECENTES" },
];

export default function AdminModeracao() {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<Tab>("denuncias");
  const [note, setNote] = useState(false);

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Moderação</Text>
        <PreviewBanner />
        <FilterPills<Tab> options={TABS} selected={tab} onSelect={setTab} />

        {tab === "recentes" ? (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            Em breve: os últimos comentários do app, para o admin apagar sem esperar uma denúncia.
          </Text>
        ) : (
          PREVIEW_REPORTS.map((r) => (
            <View key={r.id} style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
              <View style={styles.cardTop}>
                <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600", flex: 1 }}>
                  {r.author} · {r.game}
                </Text>
                <Tag label={r.reason} tone="bad" />
              </View>
              <View style={[styles.quote, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}>
                <Text style={{ color: colors.textPrimary, fontSize: 11, lineHeight: 16 }}>{r.text}</Text>
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                Denunciado por {r.reporters} usuário(s) · {r.when}
              </Text>
              <View style={styles.actions}>
                <Btn label="Manter" onPress={() => setNote(true)} />
                <Btn label="Apagar" danger onPress={() => setNote(true)} />
                <Btn label="Desativar autor" onPress={() => setNote(true)} />
              </View>
            </View>
          ))
        )}
        {note && (
          <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "center" }}>
            Em breve: estas ações serão ligadas ao servidor.
          </Text>
        )}
      </ScrollView>
      <BottomTabs />
    </Screen>
  );
}

function Btn({ label, onPress, danger }: { label: string; onPress: () => void; danger?: boolean }) {
  const { colors } = useAppTheme();
  const c = danger ? colors.danger : colors.accent;
  return (
    <TouchableOpacity onPress={onPress} style={[styles.btn, { borderColor: c }]}>
      <Text style={{ color: danger ? colors.danger : colors.textPrimary, fontSize: 11, fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, gap: 10 },
  title: { fontSize: 17, fontWeight: "700" },
  card: { borderWidth: 1, borderRadius: 11, padding: 10, gap: 8 },
  cardTop: { flexDirection: "row", alignItems: "center", gap: 8 },
  quote: { borderWidth: 1, borderRadius: 8, padding: 8 },
  actions: { flexDirection: "row", gap: 6 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
});
