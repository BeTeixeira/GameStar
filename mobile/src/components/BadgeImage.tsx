import React from "react";
import { Image } from "react-native";
import { BADGE_IMAGES } from "../data/badgeImages";

// Imagem de uma badge. `locked` usa a versão em cinza (assets/badges/gray),
// para a badge que o usuário ainda não tem.
export default function BadgeImage({ id, size, locked }: { id: string; size: number; locked?: boolean }) {
  const img = BADGE_IMAGES[id];
  return (
    <Image
      source={locked ? img.gray : img.color}
      resizeMode="contain"
      style={[{ width: size, height: size }, locked && { opacity: 0.8 }]}
    />
  );
}
