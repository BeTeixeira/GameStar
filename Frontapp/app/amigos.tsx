import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "expo-router";
import Screen from "../src/components/Screen";
import { useAppTheme } from "../src/theme/ThemeContext";
import { ApiError, api } from "../src/services/api";
import { ApiFriend, ApiFriendRequest, ApiFriendRequestResult } from "../src/types";
import { confirmAction, formatDate } from "../src/utils/confirm";
import TopBar from "../src/components/TopBar";
import FriendCard from "../src/components/FriendCard";

// Tela de Amigos — amizades aceitas e pedidos pendentes (/api/v1/friends).
// Para virar amigo, quem recebe o pedido precisa aceitar.

// TEXTO EDITÁVEL — mensagens de erro da API (detail em inglês → português)
const ERROR_MESSAGES: Record<string, string> = {
  "You cannot add yourself as a friend.": "Você não pode adicionar a si mesmo.",
  "You are already friends.": "Vocês já são amigos.",
  "Friend request already sent.": "Você já enviou um pedido para essa pessoa.",
};

function friendlyError(e: any): string {
  if (e instanceof ApiError && e.status === 404) return "Usuário não encontrado.";
  return ERROR_MESSAGES[e?.message] ?? e?.message ?? "Algo deu errado.";
}

export default function Amigos() {
  const { colors } = useAppTheme();
  const [tab, setTab] = useState<"amigos" | "pendentes">("amigos");
  const [friends, setFriends] = useState<ApiFriend[]>([]);
  const [requests, setRequests] = useState<ApiFriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [username, setUsername] = useState("");
  const [sending, setSending] = useState(false);
  const [feedback, setFeedback] = useState<{ text: string; ok: boolean } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [f, r] = await Promise.all([
        api.get<ApiFriend[]>("/api/v1/friends"),
        api.get<ApiFriendRequest[]>("/api/v1/friends/requests"),
      ]);
      setFriends(f);
      setRequests(r);
    } catch (e: any) {
      setError(friendlyError(e));
    } finally {
      setLoading(false);
    }
  }, []);

  // Recarrega sempre que a tela aparece (ex: voltando de outra aba)
  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  // Executa uma ação da API e recarrega as listas
  const run = async (action: () => Promise<unknown>) => {
    setError(null);
    try {
      await action();
    } catch (e: any) {
      setError(friendlyError(e));
    }
    await load();
  };

  const sendRequest = async () => {
    const name = username.trim();
    if (!name) return;
    setSending(true);
    setFeedback(null);
    try {
      const result = await api.post<ApiFriendRequestResult>("/api/v1/friends/requests", {
        username: name,
      });
      setUsername("");
      // TEXTO EDITÁVEL
      setFeedback({
        ok: true,
        text:
          result.status === "accepted"
            ? `Agora você e ${result.user.username} são amigos!`
            : `Pedido enviado para ${result.user.username}.`,
      });
      await load();
    } catch (e: any) {
      setFeedback({ ok: false, text: friendlyError(e) });
    } finally {
      setSending(false);
    }
  };

  const incomingCount = requests.filter((r) => r.direction === "incoming").length;

  const tabButton = (value: "amigos" | "pendentes", label: string) => (
    <TouchableOpacity
      onPress={() => setTab(value)}
      style={[
        styles.tab,
        {
          backgroundColor: tab === value ? colors.pillActive : colors.pillInactive,
          borderColor: colors.cardBorder,
        },
      ]}
    >
      <Text style={{ fontSize: 12, color: tab === value ? colors.pillTextActive : colors.pillTextInactive }}>
        {label}
      </Text>
    </TouchableOpacity>
  );

  const iconButton = (name: React.ComponentProps<typeof Ionicons>["name"], color: string, onPress: () => void) => (
    <TouchableOpacity onPress={onPress} hitSlop={8}>
      <Ionicons name={name} size={20} color={color} />
    </TouchableOpacity>
  );

  const renderFriend = ({ item }: { item: ApiFriend }) => (
    <FriendCard
      username={item.user.username}
      // TEXTO EDITÁVEL
      info={`Amigos desde ${formatDate(item.since)}`}
      actions={iconButton("person-remove-outline", colors.textSecondary, () =>
        confirmAction(
          `Desfazer amizade com ${item.user.username}?`,
          () => run(() => api.delete(`/api/v1/friends/${item.user.id}`)),
          "Desfazer"
        )
      )}
    />
  );

  const renderRequest = ({ item }: { item: ApiFriendRequest }) =>
    item.direction === "incoming" ? (
      <FriendCard
        username={item.user.username}
        info="Quer ser seu amigo" // TEXTO EDITÁVEL
        actions={
          <>
            {iconButton("checkmark-circle", colors.accent, () =>
              run(() => api.post(`/api/v1/friends/requests/${item.id}/accept`, {}))
            )}
            {iconButton("close-circle-outline", "#E05252", () =>
              run(() => api.delete(`/api/v1/friends/requests/${item.id}`))
            )}
          </>
        }
      />
    ) : (
      <FriendCard
        username={item.user.username}
        info="Pedido enviado — aguardando" // TEXTO EDITÁVEL
        actions={iconButton("close-circle-outline", colors.textSecondary, () =>
          confirmAction(
            `Cancelar o pedido para ${item.user.username}?`,
            () => run(() => api.delete(`/api/v1/friends/requests/${item.id}`)),
            "Cancelar pedido"
          )
        )}
      />
    );

  const emptyText = tab === "amigos"
    ? "Você ainda não tem amigos. Adicione alguém pelo nome de usuário acima."
    : "Nenhum pedido pendente.";

  return (
    <Screen>
      <TopBar />

      <View style={styles.content}>
        {/* Adicionar amigo pelo nome de usuário */}
        <View style={styles.addRow}>
          <TextInput
            value={username}
            onChangeText={(t) => {
              setUsername(t);
              setFeedback(null);
            }}
            placeholder="Nome de usuário do amigo" // TEXTO EDITÁVEL
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="send"
            onSubmitEditing={sendRequest}
            selectionColor={colors.accent}
            style={[
              styles.input,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
            ]}
          />
          <TouchableOpacity
            onPress={sendRequest}
            disabled={sending || !username.trim()}
            style={[styles.addButton, { backgroundColor: colors.accent, opacity: sending || !username.trim() ? 0.6 : 1 }]}
          >
            {sending ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Ionicons name="person-add" size={16} color="#FFFFFF" />
            )}
          </TouchableOpacity>
        </View>
        {feedback && (
          <Text style={[styles.feedback, { color: feedback.ok ? colors.accent : "#E05252" }]}>{feedback.text}</Text>
        )}

        <View style={styles.tabs}>
          {/* TEXTO EDITÁVEL */}
          {tabButton("amigos", `Amigos (${friends.length})`)}
          {tabButton("pendentes", incomingCount ? `Solicitações pendentes (${incomingCount})` : "Solicitações pendentes")}
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <FlatList<ApiFriend | ApiFriendRequest>
          data={tab === "amigos" ? friends : requests}
          keyExtractor={(item) => ("friendship_id" in item ? item.friendship_id : item.id)}
          renderItem={({ item }) =>
            "friendship_id" in item ? renderFriend({ item }) : renderRequest({ item })
          }
          refreshControl={<RefreshControl refreshing={false} onRefresh={load} tintColor={colors.accent} />}
          ListEmptyComponent={
            loading ? (
              <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />
            ) : (
              <Text style={{ color: colors.textSecondary, fontSize: 12 }}>{emptyText}</Text>
            )
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  addRow: { flexDirection: "row", gap: 8, marginBottom: 6 },
  input: { flex: 1, borderWidth: 1, borderRadius: 8, paddingHorizontal: 10, paddingVertical: 8, fontSize: 13 },
  addButton: { width: 44, borderRadius: 8, alignItems: "center", justifyContent: "center" },
  feedback: { fontSize: 12, marginBottom: 6 },
  tabs: { flexDirection: "row", gap: 8, marginTop: 6, marginBottom: 12 },
  tab: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, borderWidth: 1 },
  error: { color: "#E05252", fontSize: 12, marginBottom: 8 },
});
