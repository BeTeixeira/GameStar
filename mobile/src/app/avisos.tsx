import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, RefreshControl, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, useFocusEffect, useRouter } from "expo-router";
import Screen from "../components/Screen";
import TopBar from "../components/TopBar";
import BottomTabs from "../components/BottomTabs";
import { useAppTheme } from "../theme/ThemeContext";
import { useNotifications } from "../context/NotificationsContext";
import { ApiNotification } from "../types";

// AVISOS — destino do sino da barra superior (rota "/avisos"), para todas as contas.
// Lista os avisos da API; não lidos ganham borda de destaque. Tocar marca como lido e abre a tela do aviso.
function formatDate(iso: string): string {
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function Avisos() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { items, unread, refresh, markRead, markAllRead } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      await refresh();
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível carregar os avisos.");
    }
  }, [refresh]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  };

  const open = async (n: ApiNotification) => {
    if (!n.read_at) await markRead(n.id).catch(() => {});
    const route = n.data?.route;
    if (typeof route === "string" && route.startsWith("/")) router.push(route as Href);
  };

  return (
    <Screen>
      <TopBar />
      <FlatList
        data={items}
        keyExtractor={(n) => n.id}
        contentContainerStyle={items.length ? styles.list : styles.emptyList}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.accent} />}
        ListHeaderComponent={
          items.length > 0 && unread > 0 ? (
            <TouchableOpacity onPress={() => markAllRead().catch(() => {})} style={styles.markAll} hitSlop={8}>
              {/* TEXTO EDITÁVEL */}
              <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "700" }}>Marcar todas como lidas</Text>
            </TouchableOpacity>
          ) : null
        }
        ListEmptyComponent={
          <View style={styles.center}>
            <Ionicons name="notifications-outline" size={40} color={colors.textSecondary} />
            {/* TEXTO EDITÁVEL */}
            <Text style={[styles.title, { color: colors.textPrimary }]}>Avisos</Text>
            <Text style={{ color: error ? colors.danger : colors.textSecondary, fontSize: 12, textAlign: "center" }}>
              {error ?? "Nenhum aviso por enquanto. Novos seguidores, pedidos de amizade e respostas às suas análises aparecem aqui."}
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isNew = !item.read_at;
          return (
            <TouchableOpacity
              onPress={() => open(item)}
              activeOpacity={0.8}
              style={[
                styles.card,
                { backgroundColor: colors.card, borderColor: isNew ? colors.accent : colors.cardBorder },
              ]}
            >
              <View style={styles.row}>
                <Text style={[styles.cardTitle, { color: colors.textPrimary }]} numberOfLines={2}>
                  {item.title}
                </Text>
                {isNew && <View style={[styles.dot, { backgroundColor: colors.accent }]} />}
              </View>
              <Text style={{ color: colors.textSecondary, fontSize: 12, marginTop: 2 }}>{item.body}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 10, marginTop: 6 }}>{formatDate(item.created_at)}</Text>
            </TouchableOpacity>
          );
        }}
      />
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { padding: 12, gap: 8 },
  emptyList: { flexGrow: 1 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", gap: 8, padding: 24 },
  title: { fontSize: 17, fontWeight: "700" },
  markAll: { alignSelf: "flex-end", marginBottom: 4 },
  card: { borderWidth: 1, borderRadius: 12, padding: 12 },
  row: { flexDirection: "row", alignItems: "center", gap: 8 },
  cardTitle: { flex: 1, fontSize: 14, fontWeight: "700" },
  dot: { width: 8, height: 8, borderRadius: 4 },
});
