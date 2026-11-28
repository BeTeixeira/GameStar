import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

// ============================================================
// FUNDO DE ESTRELAS — usado na tela de login/cadastro.
//
// A imagem (assets/login-bg.jpg, céu roxo com estrela cadente, proporção 9:16)
// cobre a tela inteira ("cover": em telas mais altas ou mais largas, corta as
// sobras nas bordas). O logo GS fica na própria tela de login, acima do formulário.
//
// PARA TROCAR A IMAGEM: substitua assets/login-bg.jpg (de preferência 9:16).
// BASE_COLOR aparece só enquanto a imagem carrega.
// ============================================================

const BASE_COLOR = "#120A26";

// Onde o conteúdo do login começa (em pixels) para a tela atual.
export function useStarLayout() {
  const { height } = useWindowDimensions();
  return { formTop: Math.round(height * 0.12) };
}

export default function StarBackground() {
  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: BASE_COLOR }]} pointerEvents="none">
      <Image source={require("../../assets/login-bg.jpg")} style={StyleSheet.absoluteFill} contentFit="cover" />
    </View>
  );
}
