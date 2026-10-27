import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, Linking, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../../components/Screen";
import BackBar from "../../../components/BackBar";
import BottomTabs from "../../../components/BottomTabs";
import Avatar from "../../../components/Avatar";
import Tag from "../../../components/Tag";
import ProfileField from "../../../components/ProfileField";
import { useAppTheme } from "../../../theme/ThemeContext";
import { ApiError, api } from "../../../services/api";
import { formatDate } from "../../../utils/confirm";
import { ApiExpertRequest, EXPERT_AREA_LABELS, ExpertRequestStatus } from "../../../types";

// DETALHE DO PEDIDO — rota "/admin/pedido/{id}". O admin confere dados e link e aprova ou recusa
// (o motivo é obrigatório ao recusar). Depois da decisão volta para a lista.
const TONE = { pending: "warn", approved: "ok", rejected: "bad" } as const;
const LABEL: Record<ExpertRequestStatus, string> = { pending: "Pendente", approved: "Aprovado", rejected: "Recusado" };
const MIN_REASON = 3;

function withProtocol(link: string): string {
  return /^https?:\/\//i.test(link) ? link : `https://${link}`;
}

export default function AdminPedido() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [req, setReq] = useState<ApiExpertRequest | null>(null);
  const [missing, setMissing] = useState(false);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<ApiExpertRequest>(`/api/v1/expert-requests/${id}`)
      .then(setReq)
      .catch(() => setMissing(true));
  }, [id]);

  async function decide(action: "approve" | "reject") {
    if (action === "reject" && reason.trim().length < MIN_REASON) {
      return setError("Escreva o motivo para recusar.");
    }
    setBusy(true);
    setError(null);
    try {
      await api.post(`/api/v1/expert-requests/${id}/${action}`, action === "reject" ? { reason: reason.trim() } : {});
      router.replace("/admin/pedidos");
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível registrar a decisão.");
      setBusy(false);
    }
  }

  if (!req)
    return (
      <Screen>
        <BackBar title="Pedido" fallback="/admin/pedidos" />
        <Text style={{ color: colors.textSecondary, fontSize: 12, padding: 14 }}>
          {missing ? "Pedido não encontrado." : "Carregando…"}
        </Text>
        <BottomTabs />
      </Screen>
    );

  const name = req.display_name || req.username;

  return (
    <Screen>
      <BackBar title="Pedido" fallback="/admin/pedidos" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Avatar avatarUrl={req.avatar_url} name={name} size={54} />
          <View style={{ flex: 1, gap: 3 }}>
            <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "700" }}>{name}</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              @{req.username} · {formatDate(req.created_at)}
            </Text>
            <Tag label={LABEL[req.status]} tone={TONE[req.status]} />
          </View>
        </View>

        <Row label="Área" value={EXPERT_AREA_LABELS[req.expertise_area]} />
        <Row label="Empresa" value={req.company || "–"} />

        <Text style={[styles.section, { color: colors.textPrimary }]}>Link enviado</Text>
        {req.link ? (
          <TouchableOpacity
            onPress={() => Linking.openURL(withProtocol(req.link as string)).catch(() => setError("Não foi possível abrir o link."))}
            style={[styles.link, { borderColor: colors.accent, backgroundColor: colors.card }]}
          >
            <Text style={{ color: colors.accent, fontSize: 12 }} numberOfLines={1}>
              {req.link}
            </Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhum link.</Text>
        )}

        <Text style={[styles.section, { color: colors.textPrimary }]}>Mensagem do usuário</Text>
        <View style={[styles.quote, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}>
          <Text style={{ color: colors.textPrimary, fontSize: 12, lineHeight: 17 }}>{req.message}</Text>
        </View>

        {req.status === "rejected" && req.rejection_reason && (
          <Row label="Motivo da recusa" value={req.rejection_reason} />
        )}

        {req.status === "pending" && (
          <>
            <ProfileField
              label="Motivo (obrigatório ao recusar)"
              value={reason}
              onChangeText={setReason}
              placeholder="Escreva o motivo…"
              autoCapitalize="sentences"
            />
            <View style={styles.actions}>
              <TouchableOpacity
                disabled={busy}
                onPress={() => decide("approve")}
                style={[styles.action, { backgroundColor: colors.success, borderColor: colors.success, opacity: busy ? 0.6 : 1 }]}
              >
                <Text style={styles.actionText}>Aprovar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={busy}
                onPress={() => decide("reject")}
                style={[styles.action, { borderColor: colors.danger, opacity: busy ? 0.6 : 1 }]}
              >
                <Text style={[styles.actionText, { color: colors.danger }]}>Recusar</Text>
              </TouchableOpacity>
            </View>
          </>
        )}
        {/* erro da decisão ou do link: aparece em qualquer status do pedido */}
        {error && <Text style={{ color: colors.danger, fontSize: 11, textAlign: "center" }}>{error}</Text>}
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
      <Text style={{ color: colors.textPrimary, fontSize: 12, flexShrink: 1, textAlign: "right" }}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 10 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderBottomWidth: 1 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  link: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 8 },
  quote: { borderWidth: 1, borderRadius: 8, padding: 10 },
  actions: { flexDirection: "row", gap: 10 },
  action: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
  actionText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
});
