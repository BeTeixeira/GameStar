import React from "react";
import { KeyboardAvoidingView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../theme/ThemeContext";

type Props = {
  children: React.ReactNode;
};

// ============================================================
// CONTAINER PADRÃO DE TODA TELA.
//
// No Android o app é desenhado de ponta a ponta (por trás da barra de
// status, da barra de navegação e do teclado). Este componente:
//   - afasta o conteúdo da barra de status (topo) e da barra de
//     navegação/gestos do celular (base);
//   - encolhe a tela quando o teclado abre, para os campos não ficarem
//     escondidos. "padding" funciona no iOS e no Android ponta a ponta.
//
// Toda tela nova deve usar <Screen> em volta do conteúdo.
// ============================================================
export default function Screen({ children }: Props) {
  const { colors } = useAppTheme();

  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: colors.background }]} edges={["top", "bottom"]}>
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        {children}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
