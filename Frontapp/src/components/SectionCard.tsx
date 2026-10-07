import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../theme/ThemeContext";

type Props = {
  title: string;
  icon?: React.ComponentProps<typeof Ionicons>["name"];
  danger?: boolean;
  children: React.ReactNode;
};

export default function SectionCard({ title, icon, danger, children }: Props) {
  const { colors } = useAppTheme();
  const titleColor = danger ? colors.danger : colors.textPrimary;

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: colors.card, borderColor: danger ? colors.danger : colors.cardBorder },
      ]}
    >
      <View style={styles.header}>
        {icon && <Ionicons name={icon} size={15} color={titleColor} style={{ marginRight: 6 }} />}
        <Text style={[styles.title, { color: titleColor }]}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 10, padding: 12, marginBottom: 12 },
  header: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 13, fontWeight: "600" },
});