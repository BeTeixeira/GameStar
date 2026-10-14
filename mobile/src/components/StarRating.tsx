import React from "react";
import { TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";

type Props = {
  rating: number; // 0 a 5
  size?: number;
  // Se informado, as estrelas viram botões (usado no formulário de comentário)
  onRate?: (rating: number) => void;
};

// ÍCONE EDITÁVEL: troque "star" / "star-outline" por qualquer outro
// nome de ícone da biblioteca Ionicons (ex: "heart", "heart-outline")
// para mudar o símbolo usado na avaliação.
export default function StarRating({ rating, size = 14, onRate }: Props) {
  const { colors } = useAppTheme();
  const rounded = Math.round(rating);

  return (
    <View style={{ flexDirection: "row" }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <TouchableOpacity key={i} disabled={!onRate} onPress={() => onRate?.(i)} hitSlop={4}>
          <Ionicons
            name={i <= rounded ? "star" : "star-outline"}
            size={size}
            color={colors.star}
            style={{ marginRight: onRate ? 6 : 1 }}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}
