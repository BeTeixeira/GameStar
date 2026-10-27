import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../theme/ThemeContext";
import { api } from "../../services/api";
import { ApiReportGroup, ApiUser, REPORT_REASONS } from "../../types";
import { confirmAction, formatDate } from "../../utils/confirm";
import Tag from "../Tag";

type Props = {
  group: ApiReportGroup;
  onReviewHandled: () => void;
  onChange: (group: ApiReportGroup) => void;
};

const REASON_LABELS = Object.fromEntries(REPORT_REASONS.map((r) => [r.value, r.label]));

// TEXTO EDITÁVEL — rótulo do resultado de uma denúncia já tratada
const STATUS_LABELS = { pending: "Pendente", kept: "Mantido", removed: "Apagado" } as const;

// CARTÃO DE DENÚNCIA — um comentário denunciado (agrupa todas as denúncias dele).
// Ações: Manter (POST /moderation/reviews/{id}/keep), Apagar (DELETE /moderation/reviews/{id})
// e, sobre o autor, Silenciar/Banir (POST /moderation/users/{id}/mute|ban).
// Se o servidor recusar (ex: moderador agindo em admin), a mensagem aparece no cartão.
export default function ReportCard({ group, onReviewHandled, onChange }: Props) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async (action: () => Promise<void>) => {
    setBusy(true);
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(e.message ?? "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  };

  const keep = () =>
    run(async () => {
      await api.post(`/api/v1/moderation/reviews/${group.review_id}/keep`, {});
      onReviewHandled();
    });

  const remove = () =>
    confirmAction(
      `Apagar o comentário de ${group.author_name}?`,
      () =>
        run(async () => {
          await api.delete(`/api/v1/moderation/reviews/${group.review_id}`);
          onReviewHandled();
        }),
      "Apagar"
    );

  const authorMuted = group.author_is_muted === true;
  const authorBanned = group.author_is_active === false;

  const authorAction = (action: "mute" | "ban" | "unban") =>
    run(async () => {
      const updated = await api.post<ApiUser>(`/api/v1/moderation/users/${group.author_id}/${action}`, {});
      onChange({ ...group, author_is_muted: updated.is_muted, author_is_active: updated.is_active });
    });

  const banAuthor = () =>
    confirmAction(`Banir ${group.author_name}? A conta não conseguirá mais entrar.`, () => authorAction("ban"), "Banir");

  const unbanAuthor = () => confirmAction(`Desbanir ${group.author_name}?`, () => authorAction("unban"), "Desbanir");

  const edited = group.review_exists && group.current_body !== null && group.current_body !== group.review_body;

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={styles.top}>
        <View style={{ flex: 1, flexDirection: "row", flexWrap: "wrap" }}>
          {group.author_id ? (
            <TouchableOpacity onPress={() => router.push(`/perfil-publico/${group.author_id}`)} hitSlop={6}>
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>{group.author_name}</Text>
            </TouchableOpacity>
          ) : (
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>{group.author_name}</Text>
          )}
          <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}> · {group.game_title}</Text>
        </View>
        {group.status !== "pending" && (
          <Tag label={STATUS_LABELS[group.status]} tone={group.status === "removed" ? "bad" : "ok"} />
        )}
      </View>

      <View style={styles.tags}>
        {group.reasons.map((reason) => (
          <Tag key={reason} label={REASON_LABELS[reason] ?? reason} tone="bad" />
        ))}
        {authorMuted && <Tag label="Autor silenciado" tone="warn" />}
        {authorBanned && <Tag label="Autor banido" tone="bad" />}
      </View>

      <View style={[styles.quote, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}>
        <Text style={{ color: colors.textPrimary, fontSize: 11, lineHeight: 16 }}>“{group.review_body}”</Text>
      </View>
      {!group.review_exists && (
        <Text style={{ color: colors.textSecondary, fontSize: 11, fontStyle: "italic" }}>
          comentário apagado pelo autor
        </Text>
      )}
      {edited && (
        <View style={[styles.quote, { backgroundColor: colors.inputBackground, borderColor: colors.accent }]}>
          <Text style={{ color: colors.textSecondary, fontSize: 10, marginBottom: 2 }}>Texto atual (editado)</Text>
          <Text style={{ color: colors.textPrimary, fontSize: 11, lineHeight: 16 }}>{group.current_body}</Text>
        </View>
      )}

      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
        Denunciado por {group.reporters_count} usuário(s) · {formatDate(group.last_reported_at)}
      </Text>

      <View style={styles.actions}>
        {group.status === "pending" && <Btn label="Manter" onPress={keep} disabled={busy} />}
        {group.review_exists && <Btn label="Apagar" danger onPress={remove} disabled={busy} />}
        {group.author_id !== null &&
          (authorBanned ? (
            <Btn label="Desbanir autor" onPress={unbanAuthor} disabled={busy} />
          ) : authorMuted ? (
            <Btn label="Banir autor" danger onPress={banAuthor} disabled={busy} />
          ) : (
            <Btn label="Silenciar autor" onPress={() => authorAction("mute")} disabled={busy} />
          ))}
      </View>
      {!!error && <Text style={{ color: colors.danger, fontSize: 11 }}>{error}</Text>}
    </View>
  );
}

function Btn({ label, onPress, danger, disabled }: { label: string; onPress: () => void; danger?: boolean; disabled?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={disabled}
      style={[styles.btn, { borderColor: danger ? colors.danger : colors.accent, opacity: disabled ? 0.6 : 1 }]}
    >
      <Text style={{ color: danger ? colors.danger : colors.textPrimary, fontSize: 11, fontWeight: "700", textAlign: "center" }}>
        {label}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 11, padding: 10, gap: 8 },
  top: { flexDirection: "row", alignItems: "center", gap: 8 },
  tags: { flexDirection: "row", gap: 4, flexWrap: "wrap" },
  quote: { borderWidth: 1, borderRadius: 8, padding: 8 },
  actions: { flexDirection: "row", gap: 6 },
  btn: { flex: 1, borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 4, alignItems: "center", justifyContent: "center" },
});
