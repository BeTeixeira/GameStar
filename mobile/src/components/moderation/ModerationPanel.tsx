import React, { useCallback, useEffect, useRef, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from "react-native";
import { useRouter } from "expo-router";
import { useAppTheme } from "../../theme/ThemeContext";
import { api } from "../../services/api";
import { ApiReportGroup, ApiReview } from "../../types";
import { confirmAction, formatDate } from "../../utils/confirm";
import FilterPills from "../FilterPills";
import SearchBar from "../SearchBar";
import ReportCard from "./ReportCard";

type Tab = "denuncias" | "recentes" | "historico";

// TEXTO EDITÁVEL — 403 ao carregar a moderação: a conta (moderador) está silenciada
const MUTED_MODERATOR_MESSAGE = "Sua conta está silenciada e não pode moderar no momento.";

// PAINEL DE MODERAÇÃO — usado em "/moderacao" (moderador) e "/admin/moderacao" (admin).
//   DENÚNCIAS: GET /moderation/reports?status=pending · RECENTES: GET /moderation/reviews/recent
//   HISTÓRICO: denúncias já tratadas (status=kept e status=removed). Todas aceitam busca (q).
export default function ModerationPanel() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("denuncias");
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<ApiReportGroup[]>([]);
  const [recent, setRecent] = useState<ApiReview[]>([]);
  const [pendingCount, setPendingCount] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cada carga ganha um número; resposta de uma carga antiga (outra aba/busca) é descartada
  const requestId = useRef(0);

  const load = useCallback(async (currentTab: Tab, q: string) => {
    const current = ++requestId.current;
    const isStale = () => current !== requestId.current;
    setLoading(true);
    setError(null);
    const search = q.trim() ? `&q=${encodeURIComponent(q.trim())}` : "";
    try {
      if (currentTab === "recentes") {
        const reviews = await api.get<ApiReview[]>(`/api/v1/moderation/reviews/recent?limit=50${search}`);
        if (!isStale()) setRecent(reviews);
      } else if (currentTab === "denuncias") {
        const pending = await api.get<ApiReportGroup[]>(`/api/v1/moderation/reports?status=pending&limit=100${search}`);
        if (!isStale()) setGroups(pending);
      } else {
        const [kept, removed] = await Promise.all([
          api.get<ApiReportGroup[]>(`/api/v1/moderation/reports?status=kept&limit=100${search}`),
          api.get<ApiReportGroup[]>(`/api/v1/moderation/reports?status=removed&limit=100${search}`),
        ]);
        if (!isStale()) {
          setGroups([...kept, ...removed].sort((a, b) => b.last_reported_at.localeCompare(a.last_reported_at)));
        }
      }
    } catch (e: any) {
      if (!isStale()) {
        setError(e?.status === 403 ? MUTED_MODERATOR_MESSAGE : e.message ?? "Não foi possível carregar a moderação.");
      }
    } finally {
      if (!isStale()) setLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => load(tab, query), 300);
    return () => clearTimeout(timer);
  }, [tab, query, load]);

  useEffect(() => {
    api
      .get<{ count: number }>("/api/v1/moderation/reports/pending-count")
      .then((r) => setPendingCount(r.count))
      .catch(() => {});
  }, []);

  const tabs = [
    { value: "denuncias" as Tab, label: `DENÚNCIAS${pendingCount !== null ? ` · ${pendingCount}` : ""}` },
    { value: "recentes" as Tab, label: "RECENTES" },
    { value: "historico" as Tab, label: "HISTÓRICO" },
  ];

  const replaceGroup = (updated: ApiReportGroup) =>
    setGroups((prev) => prev.map((g) => (g.review_id === updated.review_id ? updated : g)));

  const onReviewHandled = (reviewId: string) => {
    if (tab === "denuncias") {
      setGroups((prev) => prev.filter((g) => g.review_id !== reviewId));
      setPendingCount((n) => (n === null ? n : Math.max(0, n - 1)));
    } else {
      load(tab, query);
    }
  };

  const removeRecent = (review: ApiReview) =>
    confirmAction(
      `Apagar o comentário de ${review.display_name || review.username || "usuário"}?`,
      async () => {
        setError(null);
        try {
          await api.delete(`/api/v1/moderation/reviews/${review.id}`);
          setRecent((prev) => prev.filter((r) => r.id !== review.id));
        } catch (e: any) {
          setError(e.message ?? "Não foi possível apagar o comentário.");
        }
      },
      "Apagar"
    );

  const header = (
    <View>
      <FilterPills<Tab> options={tabs} selected={tab} onSelect={setTab} />
      {/* TEXTO EDITÁVEL */}
      <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar por autor, jogo ou texto..." />
      {!!error && <Text style={{ color: colors.danger, fontSize: 11, marginBottom: 8 }}>{error}</Text>}
    </View>
  );

  const empty = loading ? null : (
    <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
      {tab === "denuncias" ? "Nenhuma denúncia pendente." : tab === "recentes" ? "Nenhum comentário encontrado." : "Nenhuma denúncia tratada ainda."}
    </Text>
  );

  if (tab === "recentes") {
    return (
      <FlatList
        data={recent}
        keyExtractor={(r) => r.id}
        refreshing={loading}
        onRefresh={() => load(tab, query)}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        ListHeaderComponent={header}
        ListEmptyComponent={empty}
        ItemSeparatorComponent={() => <View style={{ height: 8 }} />}
        renderItem={({ item }) => (
          <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <View style={styles.top}>
              <TouchableOpacity onPress={() => router.push(`/perfil-publico/${item.user_id}`)} hitSlop={6}>
                <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>
                  {item.display_name || item.username || "Usuário"}
                </Text>
              </TouchableOpacity>
              <Text style={{ color: colors.textPrimary, fontSize: 12, fontWeight: "600", flex: 1 }} numberOfLines={1}>
                {" "}
                · {item.game_title ?? "Jogo"}
              </Text>
              <Text style={{ color: colors.textSecondary, fontSize: 10 }}>{formatDate(item.created_at)}</Text>
            </View>
            <Text style={{ color: colors.textPrimary, fontSize: 11, lineHeight: 16 }}>{item.body}</Text>
            <TouchableOpacity onPress={() => removeRecent(item)} style={[styles.btn, { borderColor: colors.danger }]}>
              <Text style={{ color: colors.danger, fontSize: 11, fontWeight: "700" }}>Apagar</Text>
            </TouchableOpacity>
          </View>
        )}
      />
    );
  }

  return (
    <FlatList
      data={groups}
      keyExtractor={(g) => `${g.review_id}-${g.status}`}
      refreshing={loading}
      onRefresh={() => load(tab, query)}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}
      ListHeaderComponent={header}
      ListEmptyComponent={empty}
      ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
      renderItem={({ item }) => (
        <ReportCard group={item} onChange={replaceGroup} onReviewHandled={() => onReviewHandled(item.review_id)} />
      )}
    />
  );
}

const styles = StyleSheet.create({
  content: { padding: 12 },
  card: { borderWidth: 1, borderRadius: 11, padding: 10, gap: 8 },
  top: { flexDirection: "row", alignItems: "center" },
  btn: { alignSelf: "flex-start", borderWidth: 1, borderRadius: 7, paddingVertical: 6, paddingHorizontal: 16 },
});
