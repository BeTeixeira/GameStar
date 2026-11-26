import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";
import { Slots } from "../context/BadgesContext";
import { BADGES } from "../data/badges";
import BadgeImage from "./BadgeImage";

type Props = {
  slots: Slots;
  onRemove?: (index: number) => void; // se não vier, os espaços ficam só para exibição (ex: no Perfil)
  onPressSlot?: (index: number) => void;
};

// Os 3 espaços de badges do perfil. Vazio = tracejado "Espaço livre".
export default function BadgeSlots({ slots, onRemove, onPressSlot }: Props) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.row}>
      {slots.map((id, i) => {
        const badge = id ? BADGES.find((b) => b.id === id) : null;
        return (
          <TouchableOpacity
            key={i}
            activeOpacity={0.8}
            disabled={!onPressSlot}
            onPress={() => onPressSlot?.(i)}
            style={[styles.slot, { backgroundColor: colors.inputBackground, borderColor: colors.cardBorder }]}
            accessibilityLabel={badge ? badge.name : "Espaço livre"}
          >
            {badge ? (
              <>
                <BadgeImage id={badge.id} size={62} />
                {onRemove && (
                  <TouchableOpacity
                    onPress={() => onRemove(i)}
                    hitSlop={8}
                    accessibilityLabel={`Remover ${badge.name}`}
                    style={[styles.remove, { backgroundColor: colors.cardBorder, borderColor: colors.card }]}
                  >
                    <Ionicons name="close" size={12} color={colors.textPrimary} />
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <Text style={[styles.empty, { color: colors.textSecondary }]}>Espaço{"\n"}livre</Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", justifyContent: "space-between" },
  slot: { width: "31%", aspectRatio: 1, borderRadius: 16, borderWidth: 1.5, borderStyle: "dashed", alignItems: "center", justifyContent: "center" },
  empty: { fontSize: 11, textAlign: "center", lineHeight: 15 },
  remove: { position: "absolute", top: -8, right: -8, width: 26, height: 26, borderRadius: 13, borderWidth: 2, alignItems: "center", justifyContent: "center" },
});
