import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useLocalSearchParams } from "expo-router";
import Screen from "../../../components/Screen";
import BackBar from "../../../components/BackBar";
import BottomTabs from "../../../components/BottomTabs";
import PreviewBanner from "../../../components/PreviewBanner";
import Avatar from "../../../components/Avatar";
import Tag from "../../../components/Tag";
import ProfileField from "../../../components/ProfileField";
import { useAppTheme } from "../../../theme/ThemeContext";
import { PREVIEW_REQUESTS } from "../../../data/adminPreview";

// DETALHE DO PEDIDO — rota "/admin/pedido/{id}". O admin confere dados e links e aprova ou recusa
// (o motivo é obrigatório ao recusar). PRÉVIA: dados de exemplo e botões ainda sem servidor.
export default function AdminPedido() {
  const { colors } = useAppTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const req = PREVIEW_REQUESTS.find((r) => r.id === id);
  const [reason, setReason] = useState("");
  const [note, setNote] = useState<string | null>(null);

  if (!req)
    return (
      <Screen>
        <BackBar title="Pedido" fallback="/admin/pedidos" />
        <Text style={{ color: colors.textSecondary, fontSize: 12, padding: 14 }}>Pedido não encontrado.</Text>
        <BottomTabs />
      </Screen>
    );

  const tone = req.status === "pendente" ? "warn" : req.status === "aprovado" ? "ok" : "bad";

  return (
    <Screen>
      <BackBar title="Pedido" fallback="/admin/pedidos" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PreviewBanner />
        <View style={styles.identity}>
          <Avatar avatarUrl={null} name={req.name} size={54} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "700" }}>{req.name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              @{req.username} · {req.when}
            </Text>
            <Tag label={req.status[0].toUpperCase() + req.status.slice(1)} tone={tone} />
          </View>
        </View>

        <Row label="Área" value={req.area} />
        <Row label="Empresa" value={req.company} />

        <Text style={[styles.section, { color: colors.textPrimary }]}>Links enviados</Text>
        <View style={styles.links}>
          {req.links.length === 0 ? (
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhum link.</Text>
          ) : (
            req.links.map((l) => (
              <View key={l} style={[styles.link, { borderColor: colors.cardBorder, backgroundColor: colors.card }]}>
                <Text style={{ color: colors.textPrimary, fontSize: 11 }}>{l}</Text>
              </View>
            ))
          )}
        </View>

        <Text style={[styles.section, { color: colors.textPrimary }]}>Mensagem do usuário</Text>
        <View style={[styles.quote, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}>
          <Text style={{ color: colors.textPrimary, fontSize: 12, lineHeight: 17 }}>{req.message}</Text>
        </View>

        {req.status === "pendente" && (
          <>
            <ProfileField
              label="Motivo (obrigatório ao recusar)"
              value={reason}
              onChangeText={setReason}
              placeholder="Escreva o motivo…"
              autoCapitalize="sentences"
            />
            <View style={styles.actions}>
              <TouchableOpacity onPress={() => setNote("aprovar")} style={[styles.action, { backgroundColor: "#2F9E6E", borderColor: "#2F9E6E" }]}>
                <Text style={styles.actionText}>Aprovar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setNote(reason.trim() ? "recusar" : "motivo")}
                style={[styles.action, { borderColor: colors.danger }]}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>Recusar</Text>
              </TouchableOpacity>
            </View>
            {note && (
              <Text style={{ color: note === "motivo" ? colors.danger : colors.textSecondary, fontSize: 11, textAlign: "center" }}>
                {note === "motivo" ? "Escreva o motivo para recusar." : "Em breve: a decisão será enviada ao servidor."}
              </Text>
            )}
          </>
        )}
      </ScrollView>
      <BottomTabs />
    </Screen>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.kv, { borderColor: colors.cardBorder }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text style={{ color: colors.textPrimary, fontSize: 12 }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  kv: { flexDirection: "row", justifyContent: "space-between", paddingVertical: 7, borderBottomWidth: 1 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  links: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  link: { borderWidth: 1, borderRadius: 14, paddingHorizontal: 10, paddingVertical: 4 },
  quote: { borderWidth: 1, borderRadius: 8, padding: 10 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
