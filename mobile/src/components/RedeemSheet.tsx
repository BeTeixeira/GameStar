import React, { useEffect, useState } from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { Badge } from "../data/badges";
import { TEST_PHASE_FREE } from "../data/store";
import BadgeImage from "./BadgeImage";

type Props = {
  badge: Badge | null; // null = fechado
  owned: boolean;
  equipped: boolean;
  slotsFull: boolean;
  onClose: () => void;
  onRedeem: () => Promise<void>;
  onEquip: () => Promise<void>;
  onManage: () => void; // abre "Minhas badges" para trocar as equipadas
};

type Step = "idle" | "working" | "done" | "error";

// Pop-up da Loja: confirma o resgate da badge e, depois, oferece equipar no perfil.
export default function RedeemSheet({ badge, owned, equipped, slotsFull, onClose, onRedeem, onEquip, onManage }: Props) {
  const { colors } = useAppTheme();
  const [step, setStep] = useState<Step>("idle");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    setStep("idle");
    setMessage(null);
  }, [badge?.id]);

  if (!badge) return null;

  async function run(action: () => Promise<void>, success: string) {
    setStep("working");
    setMessage(null);
    try {
      await action();
      setStep("done");
      setMessage(success);
    } catch (error) {
      setStep("error");
      setMessage(error instanceof Error ? error.message : "Não foi possível concluir. Tente de novo.");
    }
  }

  const working = step === "working";

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.grabber, { backgroundColor: colors.accent }]} />

        <View style={styles.head}>
          <View style={[styles.imageBox, { backgroundColor: colors.inputBackground }]}>
            <BadgeImage id={badge.id} size={64} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[styles.name, { color: colors.textPrimary }]}>{badge.name}</Text>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Badge · {badge.category}</Text>
          </View>
        </View>

        <Row label="Preço">
          {TEST_PHASE_FREE ? (
            <View style={styles.priceRow}>
              {badge.price != null && (
                <Text style={[styles.oldPrice, { color: colors.textSecondary }]}>{badge.price} StarCoin</Text>
              )}
              <Text style={{ fontWeight: "700", color: colors.star }}>Grátis</Text>
            </View>
          ) : (
            <Text style={{ fontWeight: "700", color: colors.star }}>
              {badge.price != null ? `${badge.price} StarCoin` : "Grátis"}
            </Text>
          )}
        </Row>
        <Row label="Disponibilidade">
          <Text style={{ color: colors.textPrimary, flexShrink: 1, textAlign: "right" }}>
            {TEST_PHASE_FREE ? "Liberada na fase de testes" : badge.period ?? "Sempre disponível"}
          </Text>
        </Row>
        <View style={styles.how}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Como se ganha (fora da fase de testes)</Text>
          <Text style={{ fontSize: 13, lineHeight: 18, color: colors.textPrimary, marginTop: 4 }}>{badge.rule}</Text>
        </View>

        {message && (
          <View style={styles.feedback}>
            <Ionicons
              name={step === "error" ? "alert-circle" : "checkmark-circle"}
              size={16}
              color={step === "error" ? colors.danger : colors.success}
            />
            <Text style={{ fontSize: 12, flexShrink: 1, color: step === "error" ? colors.danger : colors.success }}>{message}</Text>
          </View>
        )}

        {!owned ? (
          <PrimaryButton
            label="Confirmar resgate"
            working={working}
            onPress={() => run(onRedeem, "Badge resgatada! Ela já está na sua coleção.")}
          />
        ) : equipped ? (
          <SecondaryButton label="Gerenciar badges equipadas" onPress={onManage} />
        ) : slotsFull ? (
          <>
            <Text style={[styles.hint, { color: colors.textSecondary }]}>
              Seus 6 espaços do perfil estão ocupados. Tire uma badge para equipar esta.
            </Text>
            <SecondaryButton label="Gerenciar badges equipadas" onPress={onManage} />
          </>
        ) : (
          <PrimaryButton
            label="Equipar no perfil"
            working={working}
            onPress={() => run(onEquip, "Badge equipada no seu perfil.")}
          />
        )}

        <TouchableOpacity onPress={onClose} style={styles.cancel} disabled={working}>
          <Text style={{ fontSize: 14, color: colors.textPrimary, fontWeight: "600" }}>
            {step === "done" ? "Fechar" : "Cancelar"}
          </Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.cardBorder }]}>
      <Text style={{ fontSize: 13, color: colors.textSecondary }}>{label}</Text>
      {children}
    </View>
  );
}

function PrimaryButton({ label, working, onPress }: { label: string; working: boolean; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity
      onPress={onPress}
      disabled={working}
      style={[styles.button, { backgroundColor: colors.star, opacity: working ? 0.6 : 1 }]}
    >
      {working ? <ActivityIndicator color="#1A1230" /> : <Text style={styles.primaryText}>{label}</Text>}
    </TouchableOpacity>
  );
}

function SecondaryButton({ label, onPress }: { label: string; onPress: () => void }) {
  const { colors } = useAppTheme();
  return (
    <TouchableOpacity onPress={onPress} style={[styles.button, { borderWidth: 1, borderColor: colors.accent }]}>
      <Text style={{ fontSize: 14, fontWeight: "700", color: colors.accent }}>{label}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 24 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 16 },
  head: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 12 },
  imageBox: { width: 80, height: 80, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  name: { fontSize: 19, fontWeight: "700", marginBottom: 4 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  priceRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  oldPrice: { fontSize: 12, textDecorationLine: "line-through" },
  how: { paddingVertical: 12 },
  feedback: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 },
  hint: { fontSize: 12, textAlign: "center", marginBottom: 10 },
  button: { height: 48, borderRadius: 12, alignItems: "center", justifyContent: "center", marginTop: 4 },
  primaryText: { fontSize: 15, fontWeight: "700", color: "#1A1230" },
  cancel: { alignItems: "center", paddingVertical: 14 },
});
