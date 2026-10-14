import React, { useState } from "react";
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView, StyleSheet } from "react-native";
import { useAppTheme } from "../../theme/ThemeContext";
import { ApiError, api } from "../../services/api";
import { ApiUser, EXPERT_AREAS, EXPERT_AREA_LABELS, ExpertArea } from "../../types";
import { confirmAction } from "../../utils/confirm";
import ProfileField from "../ProfileField";
import SelectField from "../SelectField";

// Aba "Especialistas" do painel do admin.
// A conta é encontrada SÓ pelo ID (a pessoa vê o próprio ID no perfil e envia ao
// admin) — de propósito, para não promover uma conta qualquer vista num comentário.
// Fluxo: digitar o ID → conferir a conta → escolher a área → confirmar.
// API: GET /api/v1/users/{id} e PUT /api/v1/users/{id}/account-type.

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function ExpertsAdmin() {
  const { colors } = useAppTheme();
  const [accountId, setAccountId] = useState("");
  const [account, setAccount] = useState<ApiUser | null>(null);
  const [area, setArea] = useState<ExpertArea | null>(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null);

  const findAccount = async () => {
    const id = accountId.trim();
    setAccount(null);
    setMessage(null);
    if (!UUID_REGEX.test(id)) {
      setMessage({ ok: false, text: "ID inválido. Ele tem o formato 8-4-4-4-12 (ex: 3f2a…-…)." });
      return;
    }
    setLoading(true);
    try {
      const found = await api.get<ApiUser>(`/api/v1/users/${id}`);
      setAccount(found);
      setArea(found.expertise_area);
    } catch (e) {
      const notFound = e instanceof ApiError && e.status === 404;
      setMessage({ ok: false, text: notFound ? "Nenhuma conta com esse ID." : (e as Error).message });
    } finally {
      setLoading(false);
    }
  };

  const save = (accountType: "especialista" | "normal") => {
    if (!account) return;
    if (accountType === "especialista" && !area) {
      setMessage({ ok: false, text: "Escolha a área de atuação." });
      return;
    }
    const name = `@${account.username}`;
    const question =
      accountType === "especialista"
        ? `Tornar ${name} especialista (${EXPERT_AREA_LABELS[area!]})?`
        : `Voltar ${name} para conta normal? A área de atuação e a empresa serão apagadas.`;

    confirmAction(
      question,
      async () => {
        setLoading(true);
        setMessage(null);
        try {
          const updated = await api.put<ApiUser>(`/api/v1/users/${account.id}/account-type`, {
            account_type: accountType,
            expertise_area: accountType === "especialista" ? area : null,
          });
          setAccount(updated);
          setArea(updated.expertise_area);
          setMessage({
            ok: true,
            text: accountType === "especialista" ? `${name} agora é especialista.` : `${name} voltou para conta normal.`,
          });
        } catch (e: any) {
          setMessage({ ok: false, text: e.message ?? "Não foi possível alterar a conta." });
        } finally {
          setLoading(false);
        }
      },
      "Confirmar"
    );
  };

  const isExpert = account?.account_type === "especialista";

  return (
    <ScrollView keyboardShouldPersistTaps="handled">
      {/* TEXTO EDITÁVEL */}
      <Text style={[styles.help, { color: colors.textSecondary }]}>
        Peça para a pessoa abrir o Perfil e enviar o "ID da conta". Cole o ID abaixo para conferir a conta antes de
        alterar.
      </Text>

      <ProfileField
        label="ID da conta"
        value={accountId}
        onChangeText={(t) => {
          setAccountId(t);
          setAccount(null);
        }}
        placeholder="ex: 3f2a9c1e-…"
        autoCorrect={false}
        onSubmitEditing={findAccount}
      />
      <TouchableOpacity
        onPress={findAccount}
        disabled={loading}
        style={[styles.button, { borderColor: colors.accent }]}
      >
        <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>Buscar conta</Text>
      </TouchableOpacity>

      {loading && <ActivityIndicator color={colors.accent} style={{ marginVertical: 8 }} />}

      {account && (
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.name, { color: colors.textPrimary }]}>{account.display_name || account.username}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>@{account.username}</Text>
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginBottom: 10 }}>
            Tipo atual:{" "}
            {isExpert
              ? `Especialista${account.expertise_area ? ` · ${EXPERT_AREA_LABELS[account.expertise_area]}` : ""}`
              : "Conta normal"}
            {account.role === "admin" ? " · admin" : ""}
            {!account.is_active ? " · desativada" : ""}
          </Text>

          <SelectField<ExpertArea>
            label="Área de atuação"
            placeholder="Selecione a área"
            value={area}
            options={EXPERT_AREAS}
            onChange={setArea}
          />

          <TouchableOpacity
            onPress={() => save("especialista")}
            disabled={loading}
            style={[styles.primary, { backgroundColor: colors.accent }]}
          >
            <Text style={styles.primaryText}>{isExpert ? "Salvar área de atuação" : "Tornar especialista"}</Text>
          </TouchableOpacity>
          {isExpert && (
            <TouchableOpacity
              onPress={() => save("normal")}
              disabled={loading}
              style={[styles.button, { borderColor: colors.danger, alignSelf: "stretch", alignItems: "center" }]}
            >
              <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>Voltar para conta normal</Text>
            </TouchableOpacity>
          )}
        </View>
      )}

      {message && (
        <Text style={{ fontSize: 12, marginTop: 8, color: message.ok ? colors.accent : colors.danger }}>
          {message.text}
        </Text>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  help: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  button: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
    marginBottom: 10,
  },
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginTop: 4 },
  name: { fontSize: 15, fontWeight: "700" },
  primary: { borderRadius: 8, paddingVertical: 11, alignItems: "center", marginBottom: 8 },
  primaryText: { color: "#FFFFFF", fontSize: 13, fontWeight: "600" },
});
