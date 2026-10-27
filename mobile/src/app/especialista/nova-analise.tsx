import React, { useEffect, useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import BackBar from "../../components/BackBar";
import ProfileField from "../../components/ProfileField";
import StarRating from "../../components/StarRating";
import { useAppTheme } from "../../theme/ThemeContext";
import { useGames } from "../../context/GamesContext";
import { useLibrary } from "../../context/LibraryContext";
import { api } from "../../services/api";
import { starsToApiRating } from "../../types";
import { confirmAction } from "../../utils/confirm";

// NOVA ANÁLISE / EDITAR — rota "/especialista/nova-analise?jogoId=...".
// Publica em POST /api/v1/reviews; se o especialista já analisou o jogo, abre em modo edição (PATCH / DELETE).
const MUTED_MESSAGE = "Sua conta está silenciada.";

export default function NovaAnalise() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { jogoId } = useLocalSearchParams<{ jogoId?: string }>();
  const { games } = useGames();
  const { myReviewFor, refreshMyReviews } = useLibrary();
  const game = games.find((g) => g.id === jogoId);
  const existing = jogoId ? myReviewFor(jogoId) : undefined;
  const isEdit = existing !== undefined;

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [pin, setPin] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!existing) return;
    setRating(existing.rating);
    setTitle(existing.title ?? "");
    setBody(existing.body);
    setPros(existing.pros ?? "");
    setCons(existing.cons ?? "");
    setPin(existing.pinned);
  }, [existing?.id]);

  const errorMessage = (e: any, fallback: string) => {
    const message: string = e?.message ?? fallback;
    return e?.status === 403 && message === "Your account is muted." ? MUTED_MESSAGE : message;
  };

  const submit = async () => {
    if (!game) {
      setError("Escolha um jogo no catálogo.");
      return;
    }
    if (rating === 0) {
      setError("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        rating: starsToApiRating(rating),
        body: body.trim(),
        title: title.trim(),
        pros: pros.trim(),
        cons: cons.trim(),
        pinned: pin,
      };
      if (existing) await api.patch(`/api/v1/reviews/${existing.id}`, payload);
      else await api.post("/api/v1/reviews", { game_id: game.id, ...payload });
      await refreshMyReviews();
      router.replace("/especialista/analises");
    } catch (e: any) {
      setError(errorMessage(e, "Não foi possível salvar a análise."));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = () => {
    if (!existing) return;
    confirmAction("Excluir esta análise?", async () => {
      setSubmitting(true);
      setError(null);
      try {
        await api.delete(`/api/v1/reviews/${existing.id}`);
        await refreshMyReviews();
        router.replace("/especialista/analises");
      } catch (e: any) {
        setError(errorMessage(e, "Não foi possível excluir a análise."));
        setSubmitting(false);
      }
    });
  };

  return (
    <Screen>
      <BackBar title={isEdit ? "Editar análise" : "Nova análise"} fallback="/especialista/analises" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* JOGO ANALISADO — sem jogo escolhido, leva ao catálogo para escolher */}
        {game ? (
          <View style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="game-controller-outline" size={20} color={colors.accent} />
            <View style={{ flex: 1 }}>
              <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "600" }}>{game.title}</Text>
              <Text style={{ color: colors.textSecondary, fontSize: 11 }}>
                {[game.genre, game.year].filter(Boolean).join(" · ") || game.developer}
              </Text>
            </View>
          </View>
        ) : (
          <TouchableOpacity
            onPress={() => router.replace("/especialista/catalogo")}
            style={[styles.gameCard, { backgroundColor: colors.card, borderColor: colors.accent }]}
          >
            <Ionicons name="search-outline" size={20} color={colors.accent} />
            <Text style={{ color: colors.accent, fontSize: 13, fontWeight: "600", flex: 1 }}>Escolher um jogo no catálogo</Text>
          </TouchableOpacity>
        )}

        <Text style={[styles.label, { color: colors.textPrimary }]}>Nota especialista</Text>
        <View style={{ marginBottom: 12 }}>
          <StarRating rating={rating} size={26} onRate={setRating} />
        </View>

        <ProfileField label="Título da análise" value={title} onChangeText={setTitle} placeholder="Ex: Um retorno à altura" autoCapitalize="sentences" />
        <ProfileField
          label="Análise"
          value={body}
          onChangeText={setBody}
          placeholder="Escreva sua análise…"
          autoCapitalize="sentences"
          multiline
          style={{ minHeight: 90, textAlignVertical: "top" }}
        />
        <ProfileField label="Pontos positivos" value={pros} onChangeText={setPros} placeholder="Ex: Combate fluido, trilha sonora" autoCapitalize="sentences" />
        <ProfileField label="Pontos negativos" value={cons} onChangeText={setCons} placeholder="Ex: Acesso antecipado" autoCapitalize="sentences" />

        <TouchableOpacity onPress={() => setPin((p) => !p)} style={styles.pinRow} activeOpacity={0.8}>
          <Ionicons name={pin ? "checkbox" : "square-outline"} size={20} color={colors.accent} />
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>Fixar no meu perfil</Text>
        </TouchableOpacity>

        {error && <Text style={{ color: colors.danger, fontSize: 12, marginBottom: 8 }}>{error}</Text>}

        <TouchableOpacity onPress={submit} disabled={submitting} style={[styles.button, { backgroundColor: colors.accent }]}>
          {submitting ? (
            <ActivityIndicator color="#FFFFFF" size="small" />
          ) : (
            <Text style={styles.buttonText}>{isEdit ? "Salvar" : "Publicar análise"}</Text>
          )}
        </TouchableOpacity>
        {isEdit && (
          <TouchableOpacity onPress={remove} disabled={submitting} style={{ alignSelf: "center", marginTop: 12 }}>
            <Text style={{ color: colors.danger, fontSize: 12, fontWeight: "600" }}>Excluir análise</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 14 },
  gameCard: { flexDirection: "row", alignItems: "center", gap: 10, padding: 10, borderRadius: 10, borderWidth: 1, marginBottom: 14 },
  label: { fontSize: 12, fontWeight: "700", marginBottom: 6 },
  pinRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: "center" },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
});
