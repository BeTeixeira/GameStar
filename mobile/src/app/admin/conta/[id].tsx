import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../../components/Screen";
import BackBar from "../../../components/BackBar";
import BottomTabs from "../../../components/BottomTabs";
import Avatar from "../../../components/Avatar";
import Tag from "../../../components/Tag";
import SelectField from "../../../components/SelectField";
import { useAppTheme } from "../../../theme/ThemeContext";
import { useAuth } from "../../../context/AuthContext";
import { api } from "../../../services/api";
import { ApiUser, EXPERT_AREAS, EXPERT_AREA_LABELS, ExpertArea } from "../../../types";
import { confirmAction, formatDate } from "../../../utils/confirm";

// DETALHE DA CONTA — rota "/admin/conta/{id}" (aberta ao tocar numa conta da aba Contas).
// Dados: GET /users/{id}. Ações (as mesmas que já existiam no painel antigo):
//   desativar/reativar (PATCH /users/{id}/status), excluir (DELETE /users/{id}),
//   tornar especialista / voltar para normal (PUT /users/{id}/account-type),
//   tornar / remover moderador (PUT /users/{id}/role; não vale para especialistas).
// Ainda não existem no backend: comentários, jogos na lista e denúncias da conta.
export default function AdminConta() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user: me } = useAuth();
  const [account, setAccount] = useState<ApiUser | null>(null);
  const [area, setArea] = useState<ExpertArea | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    api
      .get<ApiUser>(`/api/v1/users/${id}`)
      .then((u) => {
        setAccount(u);
        setArea(u.expertise_area);
      })
      .catch((e) => setMessage({ ok: false, text: e.message ?? "Não foi possível carregar a conta." }))
      .finally(() => setLoading(false));
  }, [id]);

  const run = async (action: () => Promise<void>, okText?: string) => {
    setBusy(true);
    setMessage(null);
    try {
      await action();
      if (okText) setMessage({ ok: true, text: okText });
    } catch (e: any) {
      setMessage({ ok: false, text: e.message ?? "Não foi possível concluir." });
    } finally {
      setBusy(false);
    }
  };

  if (loading)
    return (
      <Screen>
        <BackBar title="Conta" fallback="/admin/contas" />
        <ActivityIndicator color={colors.accent} style={{ marginTop: 24 }} />
        <BottomTabs />
      </Screen>
    );

  const isMe = account?.id === me?.id;
  const isExpert = account?.account_type === "especialista";
  const name = account ? account.display_name || account.username : "";

  const toggleActive = () =>
    account &&
    confirmAction(
      account.is_active ? `Desativar @${account.username}? A conta não conseguirá mais entrar.` : `Reativar @${account.username}?`,
      () => run(async () => setAccount(await api.patch<ApiUser>(`/api/v1/users/${account.id}/status`, { is_active: !account.is_active }))),
      account.is_active ? "Desativar" : "Reativar"
    );

  const remove = () =>
    account &&
    confirmAction(`Excluir @${account.username} de vez? Avaliações, lista e amizades também somem.`, () =>
      run(async () => {
        await api.delete(`/api/v1/users/${account.id}`);
        router.replace("/admin/contas");
      })
    );

  const toggleModerator = () => {
    if (!account) return;
    const makeModerator = account.role !== "moderator";
    confirmAction(
      makeModerator ? `Tornar ${name} moderador?` : `Remover ${name} de moderador?`,
      () =>
        run(
          async () => setAccount(await api.put<ApiUser>(`/api/v1/users/${account.id}/role`, { role: makeModerator ? "moderator" : "user" })),
          makeModerator ? "Conta promovida a moderador." : "Conta deixou de ser moderadora."
        ),
      "Confirmar"
    );
  };

  const changeType = (type: "normal" | "especialista") => {
    if (!account) return;
    if (type === "especialista" && !area) {
      setMessage({ ok: false, text: "Escolha a área de atuação." });
      return;
    }
    confirmAction(
      type === "especialista" ? `Tornar ${name} especialista (${EXPERT_AREA_LABELS[area!]})?` : `Voltar ${name} para conta normal?`,
      () =>
        run(async () => {
          const updated = await api.put<ApiUser>(`/api/v1/users/${account.id}/account-type`, {
            account_type: type,
            expertise_area: type === "especialista" ? area : null,
          });
          setAccount(updated);
          setArea(updated.expertise_area);
        }, type === "especialista" ? "Conta promovida a especialista." : "Conta voltou para normal."),
      "Confirmar"
    );
  };

  return (
    <Screen>
      <BackBar title="Conta" fallback="/admin/contas" />
      {!account ? (
        <Text style={{ color: colors.danger, fontSize: 12, padding: 14 }}>{message?.text ?? "Conta não encontrada."}</Text>
      ) : (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.identity}>
            <Avatar avatarUrl={account.avatar_url} name={name} size={54} />
            <View style={{ flex: 1, gap: 3 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 15, fontWeight: "700" }}>{name}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>{account.email}</Text>
              <View style={{ flexDirection: "row", gap: 4 }}>
                <Tag label={account.is_active ? "Ativa" : "Desativada"} tone={account.is_active ? "ok" : "bad"} />
                {account.role === "admin" && <Tag label="Admin" tone="bad" />}
                {account.role === "moderator" && <Tag label="Moderador" />}
                {!account.is_active && account.deactivated_by_role === "admin" && <Tag label="por admin" tone="warn" />}
                {!account.is_active && account.deactivated_by_role === "moderator" && <Tag label="por moderador" tone="warn" />}
                {account.is_muted && <Tag label="Silenciada" tone="warn" />}
              </View>
            </View>
          </View>

          <View>
            <Row label="Tipo" value={isExpert ? `Especialista${account.expertise_area ? ` · ${EXPERT_AREA_LABELS[account.expertise_area]}` : ""}` : "Normal"} />
            <Row label="Cadastro" value={formatDate(account.created_at)} />
            <Row label="Seguidores" value={String(account.followers_count)} />
            <Row label="ID" value={account.id} selectable />
          </View>

          {message && (
            <Text style={{ color: message.ok ? colors.accent : colors.danger, fontSize: 12 }}>{message.text}</Text>
          )}

          {!isMe && account.role !== "admin" && (
            <>
              <Text style={[styles.section, { color: colors.textPrimary }]}>Ações</Text>
              {isExpert ? (
                <ActionButton label="Voltar para conta normal" onPress={() => changeType("normal")} disabled={busy} />
              ) : (
                <>
                  <SelectField
                    placeholder="Área de atuação"
                    value={area}
                    options={EXPERT_AREAS}
                    onChange={(v) => setArea(v as ExpertArea)}
                  />
                  <ActionButton label="Tornar especialista" onPress={() => changeType("especialista")} disabled={busy} />
                </>
              )}
              {!isExpert && (
                <ActionButton
                  label={account.role === "moderator" ? "Remover moderador" : "Tornar moderador"}
                  onPress={toggleModerator}
                  disabled={busy}
                />
              )}
              <ActionButton label={account.is_active ? "Desativar conta" : "Reativar conta"} onPress={toggleActive} disabled={busy} />
              <ActionButton label="Excluir conta" onPress={remove} disabled={busy} danger />
            </>
          )}
        </ScrollView>
      )}
      <BottomTabs />
    </Screen>
  );
}

function Row({ label, value, selectable }: { label: string; value: string; selectable?: boolean }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.kv, { borderColor: colors.cardBorder }]}>
      <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{label}</Text>
      <Text selectable={selectable} style={{ color: colors.textPrimary, fontSize: 12, flexShrink: 1, textAlign: "right" }}>
        {value}
      </Text>
    </View>
  );
}

function ActionButton({ label, onPress, disabled, danger }: { label: string; onPress: () => void; disabled?: boolean; danger?: boolean }) {
  const { colors } = useAppTheme();
  const c = danger ? colors.danger : colors.accent;
  return (
    <TouchableOpacity onPress={onPress} disabled={disabled} style={[styles.action, { borderColor: c, opacity: disabled ? 0.6 : 1 }]}>
      <Text style={{ color: danger ? colors.danger : colors.textPrimary, fontSize: 13, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14, gap: 12 },
  identity: { flexDirection: "row", alignItems: "center", gap: 12 },
  kv: { flexDirection: "row", justifyContent: "space-between", gap: 12, paddingVertical: 7, borderBottomWidth: 1 },
  section: { fontSize: 13, fontWeight: "700", marginTop: 4 },
  action: { borderWidth: 1, borderRadius: 8, paddingVertical: 11, alignItems: "center" },
});
