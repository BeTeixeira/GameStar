import React, { useEffect, useState } from "react";
import { View, Text, Image, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import TopBar from "../../components/TopBar";
import ProfileField from "../../components/ProfileField";
import { useAppTheme } from "../../theme/ThemeContext";
import { useGames } from "../../context/GamesContext";
import { api } from "../../services/api";
import { ApiGame } from "../../types";

// Formulário de jogo do admin — rota "/admin/jogo" (novo) ou "/admin/jogo?id=<id>" (editar).
// API: POST /api/v1/games, PATCH /api/v1/games/{id}.

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export default function AdminGameForm() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const { refresh } = useGames();
  const isEdit = !!id;

  const [title, setTitle] = useState("");
  const [genre, setGenre] = useState("");
  const [developer, setDeveloper] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [coverUrl, setCoverUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(isEdit);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Editando: carrega os dados completos do jogo (inclui a data exata de lançamento)
  useEffect(() => {
    if (!id) return;
    api
      .get<ApiGame>(`/api/v1/games/${id}`)
      .then((g) => {
        setTitle(g.title);
        setGenre(g.genre ?? "");
        setDeveloper(g.developer ?? "");
        setReleaseDate(g.release_date ?? "");
        setCoverUrl(g.cover_image_url ?? "");
        setDescription(g.description ?? "");
      })
      .catch((e) => setError(e.message ?? "Não foi possível carregar o jogo."))
      .finally(() => setLoading(false));
  }, [id]);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace("/admin"));

  const save = async () => {
    if (!title.trim()) {
      setError("Informe o título.");
      return;
    }
    if (releaseDate.trim() && !DATE_REGEX.test(releaseDate.trim())) {
      setError("Data de lançamento no formato AAAA-MM-DD (ex: 2022-02-25).");
      return;
    }
    const orNull = (v: string) => v.trim() || null;
    const body = {
      title: title.trim(),
      genre: orNull(genre),
      developer: orNull(developer),
      release_date: orNull(releaseDate),
      cover_image_url: orNull(coverUrl),
      description: orNull(description),
    };
    setSaving(true);
    setError(null);
    try {
      if (isEdit) await api.patch(`/api/v1/games/${id}`, body);
      else await api.post("/api/v1/games", body);
      await refresh();
      goBack();
    } catch (e: any) {
      setError(e.message ?? "Não foi possível salvar o jogo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Screen>
      <TopBar />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <TouchableOpacity onPress={goBack} style={styles.backRow} hitSlop={8}>
          <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
          <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>Voltar</Text>
        </TouchableOpacity>

        {/* TEXTO EDITÁVEL */}
        <Text style={[styles.title, { color: colors.textPrimary }]}>{isEdit ? "Editar jogo" : "Novo jogo"}</Text>

        {loading ? (
          <ActivityIndicator color={colors.accent} />
        ) : (
          <>
            <ProfileField label="Título *" value={title} onChangeText={setTitle} maxLength={200} autoCapitalize="words" />
            <ProfileField label="Gênero" value={genre} onChangeText={setGenre} maxLength={100} placeholder="ex: RPG" />
            <ProfileField label="Desenvolvedora" value={developer} onChangeText={setDeveloper} maxLength={200} />
            <ProfileField
              label="Data de lançamento"
              value={releaseDate}
              onChangeText={setReleaseDate}
              placeholder="AAAA-MM-DD"
              keyboardType="numbers-and-punctuation"
              maxLength={10}
            />
            <ProfileField
              label="URL da capa"
              value={coverUrl}
              onChangeText={setCoverUrl}
              placeholder="https://..."
              keyboardType="url"
              maxLength={500}
            />
            {coverUrl.trim().startsWith("http") && (
              <Image source={{ uri: coverUrl.trim() }} style={styles.cover} resizeMode="cover" />
            )}
            <ProfileField
              label="Sinopse"
              value={description}
              onChangeText={setDescription}
              multiline
              textAlignVertical="top"
              autoCapitalize="sentences"
              style={{ minHeight: 100 }}
            />

            {error && <Text style={[styles.error, { color: colors.danger }]}>{error}</Text>}

            <TouchableOpacity
              onPress={save}
              disabled={saving}
              style={[styles.saveButton, { backgroundColor: colors.accent }]}
            >
              {saving ? (
                <ActivityIndicator color="#FFFFFF" />
              ) : (
                <Text style={styles.saveText}>{isEdit ? "Salvar alterações" : "Cadastrar jogo"}</Text>
              )}
            </TouchableOpacity>
          </>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12, paddingBottom: 40 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  title: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  cover: { width: "100%", height: 150, borderRadius: 10, marginBottom: 12 },
  error: { fontSize: 12, marginBottom: 8 },
  saveButton: { borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  saveText: { color: "#FFFFFF", fontSize: 14, fontWeight: "600" },
});
