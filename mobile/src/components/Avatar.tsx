import React from "react";
import { View, Text, StyleSheet, StyleProp, ViewStyle } from "react-native";
import { Image } from "expo-image";
import { useAppTheme } from "../theme/ThemeContext";
import { mediaUrl } from "../services/api";

type Props = {
  avatarUrl: string | null; // caminho vindo da API (ex: "/uploads/avatars/x.gif")
  name: string; // usado nas iniciais quando não há foto
  size: number;
  borderColor?: string;
  style?: StyleProp<ViewStyle>;
};

// Foto de perfil redonda. Usa expo-image (e não o <Image> do React Native)
// porque ele anima GIFs e WebPs também no Android. Sem foto: iniciais.
export default function Avatar({ avatarUrl, name, size, borderColor, style }: Props) {
  const { colors } = useAppTheme();
  const uri = mediaUrl(avatarUrl);
  const circle = {
    width: size,
    height: size,
    borderRadius: size / 2,
    borderWidth: borderColor ? Math.max(2, size / 28) : 0,
    borderColor,
  };

  return (
    <View style={[styles.base, circle, { backgroundColor: colors.accent }, style]}>
      {uri ? (
        <Image source={{ uri }} style={StyleSheet.absoluteFill} contentFit="cover" autoplay transition={150} />
      ) : (
        <Text style={[styles.initials, { fontSize: size * 0.36 }]}>{name.slice(0, 2).toUpperCase()}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: "center", justifyContent: "center", overflow: "hidden" },
  initials: { color: "#FFFFFF", fontWeight: "700" },
});
