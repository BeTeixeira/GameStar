import React, { useCallback, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { useFocusEffect } from "expo-router";
import Screen from "../components/Screen";
import BackBar from "../components/BackBar";
import ProfileField from "../components/ProfileField";
import SelectField from "../components/SelectField";
import { useAppTheme } from "../theme/ThemeContext";
import { ApiError, api } from "../services/api";
import { ApiExpertRequest, EXPERT_AREAS, ExpertArea } from "../types";

// PEDIR CONTA DE ESPECIALISTA — rota "/pedir-especialista" (aberta pelo botão
// "Quero ser especialista" do Perfil, só para conta normal).
// O pedido vai para a aba "Pedidos" do admin, que aprova ou recusa.
const MIN_MESSAGE = 10;

export default function PedirEspecialista() {
  const { colors } = useAppTheme();
  const [area, setArea] = useState<ExpertArea | null>(null);
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [reason, setReason] = useState("");
  const [latest, setLatest] = useState<ApiExpertRequest | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      api
        .get<ApiExpertRequest | null>("/api/v1/expert-requests/me")
        .then(setLatest)
        .catch(() => setLatest(null))
        .finally(() => setLoaded(true));
    }, [])
  );

  const pending = latest?.status === "pending";
  const rejected = latest?.status === "rejected";

  async function submit() {
    if (!area) return setError("Escolha a área de atuação.");
    if (reason.trim().length < MIN_MESSAGE) return setError(`Escreva pelo menos ${MIN_MESSAGE} caracteres na mensagem.`);
    setSending(true);
    setError(null);
    try {
      const created = await api.post<ApiExpertRequest>("/api/v1/expert-requests", {
        expertise_area: area,
        company: company.trim() || null,
        link: link.trim() || null,
        message: reason.trim(),
      });
      setLatest(created);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : "Não foi possível enviar o pedido.");
    } finally {
      setSending(false);
    }
  }

  return (
    <Screen>
      <BackBar title="Perfil" fallback="/perfil" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* TEXTOS EDITÁVEIS */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Quero ser especialista</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 14 }}>
          Especialistas publicam notas e comentários em destaque. Seu pedido será analisado pela equipe.
        </Text>

        {pending && (
          <View style={[styles.sent, { borderColor: colors.star, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>Pedido em análise</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Você será avisado quando for analisado.</Text>
          </View>
        )}
        {rejected && (
          <View style={[styles.sent, { borderColor: colors.danger, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>Pedido recusado</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
              Motivo: {latest?.rejection_reason ?? "não informado"}. Você pode enviar um novo pedido.
            </Text>
          </View>
        )}

        {loaded && !pending && (
          <>
            <SelectField
              label="Área de atuação"
              placeholder="Selecione a área"
              value={area}
              options={EXPERT_AREAS}
              onChange={(v) => setArea(v as ExpertArea)}
            />
            <ProfileField label="Empresa ou canal" value={company} onChangeText={setCompany} placeholder="Ex: Games&Co" autoCapitalize="words" />
            <ProfileField label="Link principal" value={link} onChangeText={setLink} placeholder="Ex: gamesandco.com.br" keyboardType="url" autoCapitalize="none" />
            <ProfileField
              label="Por que você quer ser especialista?"
              value={reason}
              onChangeText={setReason}
              placeholder="Conte um pouco sobre seu trabalho…"
              autoCapitalize="sentences"
              multiline
              style={{ minHeight: 90, textAlignVertical: "top" }}
            />
            {error && <Text style={{ color: colors.danger, fontSize: 11, marginBottom: 8 }}>{error}</Text>}
            <TouchableOpacity
              onPress={submit}
              disabled={sending}
              style={[styles.button, { backgroundColor: colors.accent, opacity: sending ? 0.6 : 1 }]}
            >
              <Text style={styles.buttonText}>{sending ? "Enviando…" : "Enviar pedido"}</Text>
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 6 },
  sent: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 10, gap: 2 },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
