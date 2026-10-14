import React from "react";
import { Modal, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeContext";

type Props = {
  visible: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  confirmDisabled?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  children?: React.ReactNode;
};

export default function ConfirmModal({
  visible,
  title,
  message,
  confirmLabel = "Confirmar",
  cancelLabel = "Cancelar",
  danger,
  confirmDisabled,
  onConfirm,
  onCancel,
  children,
}: Props) {
  const { colors } = useAppTheme();

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onCancel}>
      <View style={styles.backdrop}>
        <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <Text style={[styles.title, { color: colors.textPrimary }]}>{title}</Text>
          <Text style={[styles.message, { color: colors.textSecondary }]}>{message}</Text>

          {children}

          <View style={styles.actions}>
            <TouchableOpacity onPress={onCancel} style={[styles.button, { borderColor: colors.cardBorder }]}>
              <Text style={{ fontSize: 12, color: colors.textPrimary }}>{cancelLabel}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={onConfirm}
              disabled={confirmDisabled}
              style={[
                styles.button,
                {
                  backgroundColor: danger ? colors.danger : colors.accent,
                  borderColor: danger ? colors.danger : colors.accent,
                  opacity: confirmDisabled ? 0.4 : 1,
                },
              ]}
            >
              <Text style={{ fontSize: 12, color: "#FFFFFF", fontWeight: "600" }}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  box: { borderWidth: 1, borderRadius: 14, padding: 16 },
  title: { fontSize: 15, fontWeight: "700", marginBottom: 6 },
  message: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  actions: { flexDirection: "row", justifyContent: "flex-end", gap: 8, marginTop: 4 },
  button: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
});