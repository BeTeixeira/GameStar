import React, { useEffect, useState } from "react";
import { Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeContext";
import { REPORT_REASONS, ReportReason } from "../types";
import ConfirmModal from "./ConfirmModal";

type Props = {
  visible: boolean;
  submitting: boolean;
  error: string | null;
  onSubmit: (reason: ReportReason) => void;
  onCancel: () => void;
};

// Escolha do motivo ao denunciar um comentário (motivos em REPORT_REASONS, src/types/index.ts).
export default function ReportModal({ visible, submitting, error, onSubmit, onCancel }: Props) {
  const { colors } = useAppTheme();
  const [reason, setReason] = useState<ReportReason | null>(null);

  useEffect(() => {
    if (visible) setReason(null);
  }, [visible]);

  return (
    <ConfirmModal
      visible={visible}
      title="Denunciar comentário"
      message="Por que este comentário deve ser analisado?"
      confirmLabel="Denunciar"
      danger
      confirmDisabled={!reason || submitting}
      onConfirm={() => reason && onSubmit(reason)}
      onCancel={onCancel}
    >
      {REPORT_REASONS.map((option) => {
        const active = option.value === reason;
        return (
          <TouchableOpacity
            key={option.value}
            onPress={() => setReason(option.value)}
            style={[
              styles.option,
              { borderColor: active ? colors.accent : colors.cardBorder, backgroundColor: active ? colors.pillActive : "transparent" },
            ]}
          >
            <Text style={{ fontSize: 12, color: active ? colors.pillTextActive : colors.textPrimary }}>{option.label}</Text>
          </TouchableOpacity>
        );
      })}
      {!!error && <Text style={{ color: colors.danger, fontSize: 11, marginBottom: 6 }}>{error}</Text>}
    </ConfirmModal>
  );
}

const styles = StyleSheet.create({
  option: { borderWidth: 1, borderRadius: 8, paddingVertical: 9, paddingHorizontal: 12, marginBottom: 6 },
});
