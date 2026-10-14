import React, { useCallback, useEffect, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { ApiUser, EXPERT_AREA_LABELS } from "../../types";
import { confirmAction } from "../../utils/confirm";
import SearchBar from "../SearchBar";

// Aba "Usuários" do painel do admin: busca contas (GET /api/v1/users?q=),
// desativa/reativa (PATCH /users/{id}/status) e exclui (DELETE /users/{id}).
export default function UsersAdmin() {
  const { colors } = useAppTheme();
  const { user: me } = useAuth();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (q: string) => {
    setLoading(true);
    setError(null);
    try {
      const params = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";
      setUsers(await api.get<ApiUser[]>(`/api/v1/users?limit=100${params}`));
    } catch (e: any) {
      setError(e.message ?? "Não foi possível carregar os usuários.");
    } finally {
      setLoading(false);
    }
  }, []);

  // busca enquanto digita, esperando a pessoa parar por um instante
  useEffect(() => {
    const timer = setTimeout(() => load(query), 300);
    return () => clearTimeout(timer);
  }, [query, load]);

  const replace = (updated: ApiUser) => setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));

  const toggleActive = (u: ApiUser) =>
    confirmAction(
      u.is_active
        ? `Desativar @${u.username}? A conta não conseguirá mais entrar no app.`
        : `Reativar @${u.username}?`,
      async () => {
        setError(null);
        try {
          replace(await api.patch<ApiUser>(`/api/v1/users/${u.id}/status`, { is_active: !u.is_active }));
        } catch (e: any) {
          setError(e.message ?? "Não foi possível alterar a conta.");
        }
      },
      u.is_active ? "Desativar" : "Reativar"
    );

  const deleteUser = (u: ApiUser) =>
    confirmAction(`Excluir @${u.username} de vez? Avaliações, lista e amizades da conta também somem.`, async () => {
      setError(null);
      try {
        await api.delete(`/api/v1/users/${u.id}`);
        setUsers((prev) => prev.filter((x) => x.id !== u.id));
      } catch (e: any) {
        setError(e.message ?? "Não foi possível excluir a conta.");
      }
    });

  return (
    <FlatList
      data={users}
      keyExtractor={(u) => u.id}
      refreshing={loading}
      onRefresh={() => load(query)}
      keyboardShouldPersistTaps="handled"
      ListHeaderComponent={
        <View style={{ marginBottom: 10 }}>
          {/* TEXTO EDITÁVEL */}
          <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por nome, usuário ou e-mail..." />
          {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}
        </View>
      }
      ListEmptyComponent={
        loading ? null : <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Nenhuma conta encontrada.</Text>
      }
      renderItem={({ item }) => {
        const isMe = item.id === me?.id;
        return (
          <View
            style={[
              styles.row,
              { backgroundColor: colors.card, borderColor: colors.cardBorder, opacity: item.is_active ? 1 : 0.6 },
            ]}
          >
            <View style={{ flex: 1 }}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {item.display_name || item.username}
                <Text style={{ fontWeight: "400", color: colors.textSecondary }}> @{item.username}</Text>
              </Text>
              <Text style={{ fontSize: 11, color: colors.textSecondary }} numberOfLines={1}>
                {item.email}
              </Text>
              <View style={styles.badges}>
                {item.role === "admin" && <Badge label="ADMIN" color={colors.accent} />}
                {item.account_type === "especialista" && (
                  <Badge
                    label={`ESPECIALISTA${item.expertise_area ? ` · ${EXPERT_AREA_LABELS[item.expertise_area].toUpperCase()}` : ""}`}
                    color={colors.accent}
                  />
                )}
                {!item.is_active && <Badge label="DESATIVADA" color={colors.danger} />}
              </View>
              {/* id selecionável: é o que o admin usa na aba "Especialistas" */}
              <Text selectable style={{ fontSize: 10, color: colors.textSecondary, marginTop: 4 }}>
                ID: {item.id}
              </Text>
            </View>
            {!isMe && (
              <View style={styles.actions}>
                <TouchableOpacity onPress={() => toggleActive(item)} hitSlop={8}>
                  <Ionicons
                    name={item.is_active ? "pause-circle-outline" : "play-circle-outline"}
                    size={20}
                    color={colors.accent}
                  />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteUser(item)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={18} color={colors.danger} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }}
    />
  );
}

function Badge({ label, color }: { label: string; color: string }) {
  return (
    <View style={[styles.badge, { borderColor: color }]}>
      <Text style={{ fontSize: 9, fontWeight: "700", color }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  error: { fontSize: 11, marginTop: 8 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  name: { fontSize: 13, fontWeight: "600" },
  badges: { flexDirection: "row", flexWrap: "wrap", gap: 4, marginTop: 4 },
  badge: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  actions: { flexDirection: "row", alignItems: "center", gap: 14, marginLeft: 8 },
});
