import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  View,
  Text,
  Image,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useAppTheme } from "../../src/theme/ThemeContext";
import { useAuth } from "../../src/context/AuthContext";
import { useGames } from "../../src/context/GamesContext";
import { LibraryStatus, STATUS_LABELS, useLibrary } from "../../src/context/LibraryContext";
import { api } from "../../src/services/api";
import { ApiReview, Review, mapApiReview, starsToApiRating } from "../../src/types";
import Screen from "../../src/components/Screen";
import TopBar from "../../src/components/TopBar";
import StarRating from "../../src/components/StarRating";
import FilterPills from "../../src/components/FilterPills";
import { confirmAction, formatDate } from "../../src/utils/confirm";

// Tela de Detalhe do jogo.
// Rota dinâmica: o nome do arquivo "[id].tsx" vira um parâmetro.
// Ex: router.push("/jogo/<uuid>") abre esta tela com id = "<uuid>".

const STATUS_OPTIONS = (Object.keys(STATUS_LABELS) as LibraryStatus[]).map((value) => ({
  value,
  label: STATUS_LABELS[value],
}));

const MIN_COMMENT_LENGTH = 10;

export default function DetalheJogo() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { user } = useAuth();
  const { getGame, isLoading: gamesLoading } = useGames();
  const { statuses, setStatus, refreshMyReviews } = useLibrary();

  const game = getGame(id);

  const [reviews, setReviews] = useState<Review[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [showBreakdown, setShowBreakdown] = useState(false);
  const [statusError, setStatusError] = useState<string | null>(null);

  const [formOpen, setFormOpen] = useState(false);
  const [formRating, setFormRating] = useState(0);
  const [formText, setFormText] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // O formulário fica no meio da lista: ao focar o campo, rola até ele
  // (depois do teclado abrir e a tela encolher) para não ficar escondido.
  const listRef = useRef<FlatList<Review>>(null);
  const formY = useRef(0);
  const scrollToForm = () =>
    setTimeout(() => listRef.current?.scrollToOffset({ offset: formY.current, animated: true }), 300);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    setReviewsError(null);
    try {
      const data = await api.get<ApiReview[]>(`/api/v1/reviews/game/${id}?limit=100`);
      setReviews(data.map(mapApiReview));
    } catch (e: any) {
      setReviewsError(e.message ?? "Erro ao carregar comentários");
    } finally {
      setReviewsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadReviews();
  }, [loadReviews]);

  const myReview = reviews.find((r) => r.userId === user?.id);

  const average = reviews.length ? reviews.reduce((s, r) => s + r.rating, 0) / reviews.length : 0;
  const breakdown = useMemo(
    () => [5, 4, 3, 2, 1].map((stars) => ({ stars, count: reviews.filter((r) => r.rating === stars).length })),
    [reviews]
  );

  const openForm = () => {
    // Backend aceita 1 avaliação por usuário por jogo: se já existe, o formulário edita
    setFormRating(myReview?.rating ?? 0);
    setFormText(myReview?.body ?? "");
    setFormError(null);
    setFormOpen(true);
    scrollToForm();
  };

  const submitReview = async () => {
    if (formRating === 0) {
      setFormError("Selecione uma nota de 1 a 5 estrelas.");
      return;
    }
    if (formText.trim().length < MIN_COMMENT_LENGTH) {
      setFormError(`O comentário precisa ter pelo menos ${MIN_COMMENT_LENGTH} caracteres.`);
      return;
    }
    setSubmitting(true);
    setFormError(null);
    try {
      const body = { rating: starsToApiRating(formRating), body: formText.trim() };
      if (myReview) await api.patch(`/api/v1/reviews/${myReview.id}`, body);
      else await api.post("/api/v1/reviews", { game_id: id, ...body });
      setFormOpen(false);
      await Promise.all([loadReviews(), refreshMyReviews()]);
    } catch (e: any) {
      setFormError(e.message ?? "Não foi possível enviar o comentário.");
    } finally {
      setSubmitting(false);
    }
  };

  const deleteReview = (review: Review) =>
    confirmAction("Excluir seu comentário?", async () => {
      try {
        await api.delete(`/api/v1/reviews/${review.id}`);
        await Promise.all([loadReviews(), refreshMyReviews()]);
      } catch (e: any) {
        setReviewsError(e.message ?? "Não foi possível excluir o comentário.");
      }
    });

  if (!game) {
    return (
      <Screen>
        <TopBar />
        <View style={styles.content}>
          {gamesLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : (
            <Text style={{ color: colors.textPrimary }}>Jogo não encontrado.</Text>
          )}
        </View>
      </Screen>
    );
  }

  const meta = [game.genre, game.developer, game.year].filter(Boolean).join(" · ");

  return (
    <Screen>
      <TopBar />

      <FlatList
        ref={listRef}
        data={reviews}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.content}
        keyboardShouldPersistTaps="handled"
        ListHeaderComponent={
          <View>
            <TouchableOpacity
              onPress={() => (router.canGoBack() ? router.back() : router.replace("/"))}
              style={styles.backRow}
              hitSlop={8}
            >
              <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
              {/* TEXTO EDITÁVEL */}
              <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>Voltar</Text>
            </TouchableOpacity>

            {/* Capa vinda de cover_image_url no backend */}
            {game.image ? (
              <Image source={game.image} style={styles.cover} resizeMode="cover" />
            ) : (
              <View style={[styles.cover, styles.coverPlaceholder, { backgroundColor: colors.card }]}>
                {/* TEXTO EDITÁVEL */}
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Sem imagem</Text>
              </View>
            )}

            <Text style={[styles.title, { color: colors.textPrimary }]}>{game.title}</Text>
            <Text style={[styles.genre, { color: colors.textSecondary }]}>{meta}</Text>

            {/* TEXTO EDITÁVEL */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Na minha lista</Text>
            <FilterPills
              options={STATUS_OPTIONS}
              selected={statuses[game.id]}
              // tocar no status já selecionado remove o jogo da lista
              onSelect={(s) => {
                setStatusError(null);
                setStatus(game.id, statuses[game.id] === s ? null : s).catch((e) =>
                  setStatusError(e.message ?? "Não foi possível atualizar sua lista.")
                );
              }}
            />
            {statusError && <Text style={styles.error}>{statusError}</Text>}

            {/* TEXTO EDITÁVEL */}
            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Sinopse do jogo</Text>
            <Text style={[styles.synopsis, { color: colors.textSecondary }]}>
              {game.description || "Sem sinopse cadastrada."}
            </Text>

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>Notas</Text>
            <View style={styles.ratingsRow}>
              <View>
                {/* TEXTO EDITÁVEL — média das avaliações dos usuários */}
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>
                  Geral {reviews.length ? `(${average.toFixed(1)})` : ""}
                </Text>
                <StarRating rating={average} size={16} />
              </View>
              <View>
                {/* TEXTO EDITÁVEL — o backend ainda não tem notas de especialistas */}
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Especialistas</Text>
                <Text style={{ fontSize: 11, color: colors.textSecondary }}>Em breve</Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={() => setShowBreakdown((v) => !v)}
              style={[styles.smallButton, { borderColor: colors.cardBorder }]}
            >
              <Text style={{ fontSize: 11, color: colors.textPrimary }}>
                {showBreakdown ? "Menos notas" : "Mais notas"}
              </Text>
            </TouchableOpacity>

            {showBreakdown && (
              <View style={[styles.breakdown, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
                {breakdown.map(({ stars, count }) => (
                  <View key={stars} style={styles.breakdownRow}>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{stars}★</Text>
                    <View style={[styles.barTrack, { backgroundColor: colors.cardBorder }]}>
                      <View
                        style={[
                          styles.barFill,
                          {
                            backgroundColor: colors.star,
                            width: `${reviews.length ? (count / reviews.length) * 100 : 0}%`,
                          },
                        ]}
                      />
                    </View>
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{count}</Text>
                  </View>
                ))}
              </View>
            )}

            <Text style={[styles.sectionTitle, { color: colors.textPrimary }]}>
              Comentários {reviews.length ? `(${reviews.length})` : ""}
            </Text>

            {!formOpen ? (
              <TouchableOpacity
                onPress={openForm}
                style={[styles.smallButton, { borderColor: colors.accent, marginBottom: 10 }]}
              >
                <Text style={{ fontSize: 11, color: colors.accent }}>
                  {myReview ? "Editar meu comentário" : "Deixar um comentário"}
                </Text>
              </TouchableOpacity>
            ) : (
              <View
                style={[styles.form, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}
                onLayout={(e) => (formY.current = e.nativeEvent.layout.y)}
              >
                <Text style={[styles.ratingLabel, { color: colors.textSecondary }]}>Sua nota</Text>
                <StarRating rating={formRating} size={28} onRate={setFormRating} />
                <TextInput
                  value={formText}
                  onChangeText={setFormText}
                  placeholder="Escreva seu comentário..."
                  placeholderTextColor={colors.textSecondary}
                  multiline
                  textAlignVertical="top"
                  onFocus={scrollToForm}
                  selectionColor={colors.accent}
                  style={[
                    styles.textInput,
                    { color: colors.textPrimary, borderColor: colors.cardBorder, backgroundColor: colors.background },
                  ]}
                />
                {formError && <Text style={styles.error}>{formError}</Text>}
                <View style={styles.formActions}>
                  <TouchableOpacity onPress={() => setFormOpen(false)} disabled={submitting}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary }}>Cancelar</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={submitReview}
                    disabled={submitting}
                    style={[styles.publishButton, { backgroundColor: colors.accent }]}
                  >
                    {submitting ? (
                      <ActivityIndicator color="#FFFFFF" size="small" />
                    ) : (
                      <Text style={styles.publishText}>{myReview ? "Salvar" : "Publicar"}</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {reviewsError && <Text style={styles.error}>{reviewsError}</Text>}
          </View>
        }
        ListEmptyComponent={
          reviewsLoading ? (
            <ActivityIndicator color={colors.accent} />
          ) : reviewsError ? null : (
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Nenhum comentário ainda. Seja o primeiro!</Text>
          )
        }
        renderItem={({ item }) => (
          <View style={[styles.commentCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="person-circle-outline" size={22} color={colors.textSecondary} />
            <View style={{ marginLeft: 8, flex: 1 }}>
              <View style={styles.commentHeader}>
                <Text style={{ fontSize: 12, fontWeight: "600", color: colors.textPrimary }}>{item.author}</Text>
                <StarRating rating={item.rating} size={11} />
              </View>
              <Text style={{ fontSize: 11, color: colors.textSecondary }}>{item.body}</Text>
              <Text style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>{formatDate(item.date)}</Text>
            </View>
            {item.userId === user?.id && (
              <TouchableOpacity onPress={() => deleteReview(item)} hitSlop={8} style={{ marginLeft: 8 }}>
                <Ionicons name="trash-outline" size={16} color="#E05252" />
              </TouchableOpacity>
            )}
          </View>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: 12 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 10 },
  cover: { width: "100%", height: 160, borderRadius: 10, marginBottom: 12 },
  coverPlaceholder: { alignItems: "center", justifyContent: "center" },
  title: { fontSize: 17, fontWeight: "700" },
  genre: { fontSize: 11, marginBottom: 4 },
  sectionTitle: { fontSize: 13, fontWeight: "600", marginTop: 10, marginBottom: 6 },
  synopsis: { fontSize: 12, lineHeight: 18 },
  ratingsRow: { flexDirection: "row", gap: 24, marginBottom: 8 },
  ratingLabel: { fontSize: 10, marginBottom: 4 },
  smallButton: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginBottom: 6,
  },
  breakdown: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 4, marginBottom: 6 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownLabel: { fontSize: 11, width: 22 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: "hidden" },
  barFill: { height: "100%", borderRadius: 3 },
  form: { borderWidth: 1, borderRadius: 10, padding: 10, gap: 8, marginBottom: 10 },
  textInput: { borderWidth: 1, borderRadius: 8, padding: 8, minHeight: 80, fontSize: 12 },
  formActions: { flexDirection: "row", justifyContent: "flex-end", alignItems: "center", gap: 16 },
  publishButton: { borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, minWidth: 80, alignItems: "center" },
  publishText: { color: "#FFFFFF", fontSize: 12, fontWeight: "600" },
  error: { color: "#E05252", fontSize: 11, marginBottom: 6 },
  commentCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 8,
  },
  commentHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 2 },
});
