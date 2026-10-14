import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { useAppTheme } from "../theme/ThemeContext";

type Props = {
  username: string;
  info: string; // TEXTO — subtítulo (ex: "Amigos desde 30/09/2026")
  actions?: React.ReactNode; // botões à direita (aceitar, recusar, remover...)
};

export default function FriendCard({ username, info, actions }: Props) {
  const { colors } = useAppTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <View style={[styles.avatar, { backgroundColor: colors.accent }]}>
        <Text style={styles.avatarText}>{username.slice(0, 2).toUpperCase()}</Text>
      </View>

      <View style={{ flex: 1 }}>
        <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
          {username}
        </Text>
        <Text style={[styles.info, { color: colors.textSecondary }]} numberOfLines={1}>
          {info}
        </Text>
      </View>

      {actions && <View style={styles.actions}>{actions}</View>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  avatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  name: { fontSize: 13, fontWeight: "600" },
  info: { fontSize: 11, marginTop: 2 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14 },
});
