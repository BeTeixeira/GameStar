import React, { useCallback, useState } from "react";
import { View, Text, FlatList, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import BottomTabs from "../../components/BottomTabs";
import FilterPills from "../../components/FilterPills";
import SearchBar from "../../components/SearchBar";
import Avatar from "../../components/Avatar";
import PreviewBanner from "../../components/PreviewBanner";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { ApiUser, EXPERT_AREA_LABELS } from "../../types";

// SEGUIDORES — substitui "Amigos" para o especialista (rota "/especialista/seguidores").
// Duas abas:
//   - SEGUINDO: especialistas que você segue (GET /api/v1/users/me/following) — já funciona.
//   - SEGUIDORES: quem segue você — a API ainda não tem essa lista (só o total), então a aba é uma prévia.
type Tab = "seguidores" | "seguindo";

export default function SeguidoresEspecialista() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>("seguidores");
  const [query, setQuery] = useState("");
  const [following, setFollowing] = useState<ApiUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      setLoading(true);
      api
        .get<ApiUser[]>("/api/v1/users/me/following")
        .then((d) => {
          setFollowing(d);
          setError(null);
        })
        .catch((e) => setError(e.message ?? "Não foi possível carregar."))
        .finally(() => setLoading(false));
    }, [])
  );

  const options: { value: Tab; label: string }[] = [
    { value: "seguidores", label: `SEGUIDORES · ${user?.followersCount ?? 0}` },
    { value: "seguindo", label: `SEGUINDO · ${following.length}` },
  ];
  const q = query.trim().toLowerCase();
  const shown = following.filter((u) => !q || (u.display_name || u.username).toLowerCase().includes(q));

  return (
    <Screen>
      <TopBar />
      <View style={styles.content}>
        <Text style={[styles.title, { color: colors.textPrimary }]}>Seguidores</Text>
        <FilterPills<Tab> options={options} selected={tab} onSelect={setTab} />

        {tab === "seguidores" ? (
          <View>
            <PreviewBanner text="Em breve: a lista de quem segue você. Por enquanto o app só informa o total." />
            <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
              Você tem {user?.followersCount ?? 0} seguidor(es).
            </Text>
          </View>
        ) : (
          <>
            <SearchBar value={query} onChangeText={setQuery} placeholder="Buscar especialista..." />
            {error && <Text style={{ color: colors.danger, fontSize: 11, marginTop: 8 }}>{error}</Text>}
            {loading && <ActivityIndicator color={colors.accent} style={{ marginTop: 16 }} />}
            <FlatList
              style={{ marginTop: 10 }}
              data={shown}
              keyExtractor={(u) => u.id}
              ListEmptyComponent={
                loading ? null : (
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
                    Você ainda não segue nenhum especialista. Toque no nome de um especialista em um jogo para seguir.
                  </Text>
                )
              }
              renderItem={({ item }) => {
                const name = item.display_name || item.username;
                return (
                  <TouchableOpacity
                    // CAMINHO — abre a vitrine do especialista (src/app/perfil-publico/[id].tsx)
                    onPress={() => router.push(`/perfil-publico/${item.id}`)}
                    style={[styles.card, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                  >
                    <Avatar avatarUrl={null} name={name} size={36} />
                    <View style={{ flex: 1 }}>
                      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }} numberOfLines={1}>
                        {name}
                      </Text>
                      <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                        {item.expertise_area ? EXPERT_AREA_LABELS[item.expertise_area] : "Especialista"} ·{" "}
                        {item.followers_count} seguidor(es)
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </>
        )}
      </View>
      <BottomTabs />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flex: 1, padding: 12 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 10 },
  card: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 8 },
});
