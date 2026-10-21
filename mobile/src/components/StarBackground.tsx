import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import { Image } from "expo-image";

// ============================================================
// FUNDO DE CONSTELAÇÕES — usado na tela de login/cadastro.
//
// A imagem (assets/login-bg.jpg, já com a logo GameStar desenhada) ocupa a
// largura da tela e as bordas dela somem em um degradê roxo, que continua
// como cor de fundo da tela inteira. O degradê é feito com faixas de cor
// (sem biblioteca extra).
//
// PARA TROCAR A IMAGEM: substitua assets/login-bg.jpg (mantenha a proporção
// ou ajuste IMAGE_RATIO). Cores das bordas da imagem: TOP_COLOR e BOTTOM_COLOR.
// ============================================================

const TOP_COLOR: [number, number, number] = [23, 11, 44]; // topo da imagem
const BOTTOM_COLOR: [number, number, number] = [52, 25, 73]; // base da imagem
const IMAGE_RATIO = 665 / 371; // altura / largura da imagem
const FORM_START = 0.575; // onde o formulário começa dentro da imagem (0–1, de cima para baixo)
const STRIPS = 48;
const FADE = 0.16; // parte da imagem (em cima e embaixo) que some no degradê

const mix = (t: number) => BOTTOM_COLOR.map((b, i) => Math.round(TOP_COLOR[i] + (b - TOP_COLOR[i]) * t));
const rgb = (c: number[], a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

// Posição da imagem e do início do formulário (em pixels) para a tela atual.
export function useStarLayout() {
  const { width, height } = useWindowDimensions();
  const imgHeight = width * IMAGE_RATIO;
  const imgTop = Math.max(0, Math.min(height * 0.085, height - imgHeight));
  return { width, height, imgTop, imgHeight, formTop: imgTop + imgHeight * FORM_START };
}

export default function StarBackground() {
  const { width, height, imgTop, imgHeight } = useStarLayout();
  const fadeH = imgHeight * FADE;
  const fadeStrips = 14;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {/* cor de fundo da tela: degradê vertical do topo para a base */}
      {Array.from({ length: STRIPS }).map((_, i) => (
        <View key={i} style={{ flex: 1, backgroundColor: rgb(mix(i / (STRIPS - 1))) }} />
      ))}

      {/* imagem das constelações */}
      <View style={{ position: "absolute", top: imgTop, left: 0, width, height: imgHeight }}>
        <Image source={require("../../assets/login-bg.jpg")} style={{ width, height: imgHeight }} contentFit="fill" />
        {/* bordas da imagem se misturam ao fundo */}
        {Array.from({ length: fadeStrips }).map((_, i) => {
          const a = 1 - i / (fadeStrips - 1); // 1 → 0
          const h = fadeH / fadeStrips;
          const yTop = i * h;
          const yBottom = imgHeight - (i + 1) * h;
          const cTop = mix((imgTop + yTop) / height);
          const cBottom = mix((imgTop + yBottom) / height);
          return (
            <React.Fragment key={i}>
              <View style={{ position: "absolute", left: 0, right: 0, top: yTop, height: h + 1, backgroundColor: rgb(cTop, a) }} />
              <View style={{ position: "absolute", left: 0, right: 0, top: yBottom, height: h + 1, backgroundColor: rgb(cBottom, a) }} />
            </React.Fragment>
          );
        })}
      </View>
    </View>
  );
}
