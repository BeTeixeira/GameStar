import React from "react";
import { Modal, View, Text, TouchableOpacity, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { Badge } from "../data/badges";
import BadgeImage from "./BadgeImage";
import { MAX_SLOTS } from "../context/BadgesContext";
import { TEST_PHASE_FREE } from "../data/store";

type Props = {
  badge: Badge | null; // null = fechado
  owned: boolean;
  inProfile: boolean; // já está em um dos 3 espaços
  slotsFull: boolean;
  onClose: () => void;
  onAdd: () => void;
  onRemove: () => void;
  onRedeem?: () => void; // se vier, quem não tem a badge pode resgatar aqui
  redeeming?: boolean;
};

// Pop-up (bottom sheet) com os detalhes da badge: nome, se está bloqueada,
// preço em StarCoin, período e como desbloquear. Se a conta tem a badge,
// também oferece colocar/tirar do perfil.
export default function BadgeSheet({ badge, owned, inProfile, slotsFull, onClose, onAdd, onRemove, onRedeem, redeeming }: Props) {
  const { colors } = useAppTheme();
  if (!badge) return null;

  return (
    <Modal visible transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={styles.backdrop} onPress={onClose} accessibilityLabel="Fechar" />
      <View style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
        <View style={[styles.grabber, { backgroundColor: colors.cardBorder }]} />
        <ScrollView showsVerticalScrollIndicator={false}>
          <View style={styles.head}>
            <BadgeImage id={badge.id} size={92} locked={!owned} />
            <View style={styles.headText}>
              <Text style={[styles.name, { color: colors.textPrimary }]}>{badge.name}</Text>
              <View style={[styles.status, { backgroundColor: owned ? "#4CC38A" + "33" : colors.cardBorder }]}>
                <Ionicons
                  name={owned ? "checkmark-circle" : "lock-closed"}
                  size={12}
                  color={owned ? "#4CC38A" : colors.textSecondary}
                />
                <Text style={{ fontSize: 11, fontWeight: "700", color: owned ? "#4CC38A" : colors.textSecondary }}>
                  {owned ? "Desbloqueada" : "Bloqueada"}
                </Text>
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 6 }}>
                {badge.category} · {badge.type}
              </Text>
            </View>
          </View>

          <Row label="Preço">
            {TEST_PHASE_FREE ? (
              <Text style={{ fontWeight: "700", color: colors.success }}>Grátis (fase de testes)</Text>
            ) : badge.price != null ? (
              <Text style={{ fontWeight: "700", color: colors.star }}>{badge.price} StarCoin</Text>
            ) : (
              <Text style={{ color: colors.textPrimary }}>Não se compra</Text>
            )}
          </Row>
          <Row label="Período">
            <Text style={{ color: colors.textPrimary, flexShrink: 1, textAlign: "right" }}>{badge.period ?? "Sempre disponível"}</Text>
          </Row>
          <View style={styles.how}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Como desbloquear</Text>
            <Text style={{ fontSize: 13, lineHeight: 19, color: colors.textPrimary, marginTop: 4 }}>{badge.rule}</Text>
          </View>
        </ScrollView>

        {owned ? (
          inProfile ? (
            <TouchableOpacity onPress={onRemove} style={[styles.btn, { borderColor: colors.accent, borderWidth: 1 }]}>
              <Text style={[styles.btnText, { color: colors.accent }]}>Tirar do perfil</Text>
            </TouchableOpacity>
          ) : (
            <>
              <TouchableOpacity
                onPress={onAdd}
                disabled={slotsFull}
                style={[styles.btn, { backgroundColor: colors.accent, opacity: slotsFull ? 0.4 : 1 }]}
              >
                <Text style={[styles.btnText, { color: "#FFFFFF" }]}>Colocar no perfil</Text>
              </TouchableOpacity>
              {slotsFull && (
                <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center", marginTop: 6 }}>
                  Seus {MAX_SLOTS} espaços estão cheios. Tire uma badge para colocar esta.
                </Text>
              )}
            </>
          )
        ) : onRedeem ? (
          <TouchableOpacity
            onPress={onRedeem}
            disabled={redeeming}
            style={[styles.btn, { backgroundColor: colors.star, opacity: redeeming ? 0.5 : 1 }]}
          >
            <Text style={[styles.btnText, { color: "#1A1230" }]}>{redeeming ? "Resgatando..." : "Resgatar grátis"}</Text>
          </TouchableOpacity>
        ) : (
          <Text style={{ fontSize: 11, color: colors.textSecondary, textAlign: "center", marginTop: 4 }}>
            Você ainda não tem esta badge.
          </Text>
        )}
        <TouchableOpacity onPress={onClose} style={styles.close}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, fontWeight: "600" }}>Fechar</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  const { colors } = useAppTheme();
  return (
    <View style={[styles.row, { borderBottomColor: colors.cardBorder }]}>
      <Text style={{ fontSize: 12, color: colors.textSecondary }}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.6)" },
  sheet: { maxHeight: "80%", borderTopLeftRadius: 24, borderTopRightRadius: 24, borderWidth: 1, borderBottomWidth: 0, paddingHorizontal: 20, paddingTop: 10, paddingBottom: 20 },
  grabber: { alignSelf: "center", width: 40, height: 4, borderRadius: 2, marginBottom: 14 },
  head: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 14 },
  headText: { flex: 1 },
  name: { fontSize: 19, fontWeight: "700", marginBottom: 6 },
  status: { flexDirection: "row", alignItems: "center", gap: 5, alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  row: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12, paddingVertical: 12, borderBottomWidth: 1 },
  how: { paddingVertical: 12, marginBottom: 8 },
  btn: { height: 46, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  btnText: { fontSize: 14, fontWeight: "700" },
  close: { alignItems: "center", paddingVertical: 12 },
});
