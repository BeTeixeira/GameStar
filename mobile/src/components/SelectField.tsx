import React, { useState } from "react";
import { View, Text, TouchableOpacity, Modal, Pressable, ScrollView, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";

type Option<T extends string> = { value: T; label: string };

type Props<T extends string> = {
  label?: string; // TEXTO EDITÁVEL — rótulo acima da caixa (opcional)
  placeholder: string; // TEXTO EDITÁVEL — aparece quando nada foi escolhido
  title?: string; // TEXTO EDITÁVEL — título da janela de opções (padrão: o rótulo)
  value: T | null;
  options: Option<T>[]; // lista de opções (ex: EXPERT_AREAS em src/types)
  onChange: (value: T) => void;
  error?: string;
  helper?: string;
  background?: string; // cor de fundo da caixa (padrão: a dos campos do perfil)
};

// Caixa de seleção (dropdown): toque para abrir a lista e escolher uma opção.
// Usada em "Área de atuação" no cadastro (login.tsx) e no perfil (perfil.tsx).
// Usa <Modal> para funcionar igual no celular e no navegador.
export default function SelectField<T extends string>({
  label,
  placeholder,
  title,
  value,
  options,
  onChange,
  error,
  helper,
  background,
}: Props<T>) {
  const { colors } = useAppTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <View style={styles.wrapper}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}

      <TouchableOpacity
        onPress={() => setOpen(true)}
        activeOpacity={0.8}
        style={[
          styles.box,
          {
            backgroundColor: background ?? colors.inputBackground,
            borderColor: error ? colors.danger : colors.cardBorder,
          },
        ]}
      >
        <Text style={{ flex: 1, fontSize: 13, color: selected ? colors.textPrimary : colors.textSecondary }}>
          {selected ? selected.label : placeholder}
        </Text>
        {/* ÍCONE EDITÁVEL — seta da caixa (Ionicons) */}
        <Ionicons name="chevron-down" size={16} color={colors.textSecondary} />
      </TouchableOpacity>

      {error ? (
        <Text style={[styles.message, { color: colors.danger }]}>{error}</Text>
      ) : helper ? (
        <Text style={[styles.message, { color: colors.textSecondary }]}>{helper}</Text>
      ) : null}

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <Pressable style={styles.backdrop} onPress={() => setOpen(false)}>
          {/* Pressable interno impede que tocar na lista feche a janela */}
          <Pressable style={[styles.sheet, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Text style={[styles.sheetTitle, { color: colors.textPrimary }]}>{title ?? label ?? placeholder}</Text>
            <ScrollView style={{ maxHeight: 320 }}>
              {options.map((opt) => {
                const active = opt.value === value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    onPress={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    style={[styles.option, { borderColor: colors.cardBorder }]}
                  >
                    <Text
                      style={{
                        flex: 1,
                        fontSize: 13,
                        color: active ? colors.accent : colors.textPrimary,
                        fontWeight: active ? "700" : "400",
                      }}
                    >
                      {opt.label}
                    </Text>
                    {active && <Ionicons name="checkmark" size={16} color={colors.accent} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: { marginBottom: 12 },
  label: { fontSize: 11, marginBottom: 4 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 10,
  },
  message: { fontSize: 10, marginTop: 4 },
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", justifyContent: "center", padding: 24 },
  sheet: { borderWidth: 1, borderRadius: 14, padding: 16 },
  sheetTitle: { fontSize: 15, fontWeight: "700", marginBottom: 8 },
  option: { flexDirection: "row", alignItems: "center", paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth },
});
