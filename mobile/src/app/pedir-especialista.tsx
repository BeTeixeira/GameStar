import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import Screen from "../components/Screen";
import BackBar from "../components/BackBar";
import ProfileField from "../components/ProfileField";
import SelectField from "../components/SelectField";
import PreviewBanner from "../components/PreviewBanner";
import { useAppTheme } from "../theme/ThemeContext";
import { EXPERT_AREAS, ExpertArea } from "../types";

// PEDIR CONTA DE ESPECIALISTA — rota "/pedir-especialista" (aberta pelo botão
// "Quero ser especialista" do Perfil, só para conta normal).
// O pedido vai para a aba "Pedidos" do admin, que aprova ou recusa.
// Ainda NÃO está ligado ao servidor: o botão só mostra a confirmação na tela.
export default function PedirEspecialista() {
  const { colors } = useAppTheme();
  const [area, setArea] = useState<ExpertArea | null>(null);
  const [company, setCompany] = useState("");
  const [link, setLink] = useState("");
  const [reason, setReason] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <Screen>
      <BackBar title="Perfil" fallback="/perfil" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PreviewBanner text="Prévia: o pedido ainda não é enviado ao servidor." />
        {/* TEXTOS EDITÁVEIS */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>Quero ser especialista</Text>
        <Text style={{ color: colors.textSecondary, fontSize: 12, lineHeight: 17, marginBottom: 14 }}>
          Especialistas publicam notas e comentários em destaque. Seu pedido será analisado pela equipe.
        </Text>

        <SelectField
          label="Área de atuação"
          placeholder="Selecione a área"
          value={area}
          options={EXPERT_AREAS}
          onChange={(v) => setArea(v as ExpertArea)}
        />
        <ProfileField label="Empresa ou canal" value={company} onChangeText={setCompany} placeholder="Ex: Games&Co" autoCapitalize="words" />
        <ProfileField label="Link principal" value={link} onChangeText={setLink} placeholder="Ex: gamesandco.com.br" keyboardType="url" />
        <ProfileField
          label="Por que você quer ser especialista?"
          value={reason}
          onChangeText={setReason}
          placeholder="Conte um pouco sobre seu trabalho…"
          autoCapitalize="sentences"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />

        {sent && (
          <View style={[styles.sent, { borderColor: colors.star, backgroundColor: colors.card }]}>
            <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600" }}>Pedido enviado</Text>
            <Text style={{ color: colors.textSecondary, fontSize: 11 }}>Você será avisado quando for analisado.</Text>
          </View>
        )}
        <TouchableOpacity
          onPress={() => setSent(true)}
          disabled={sent}
          style={[styles.button, { backgroundColor: colors.accent, opacity: sent ? 0.6 : 1 }]}
        >
          <Text style={styles.buttonText}>Enviar pedido</Text>
        </TouchableOpacity>
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
