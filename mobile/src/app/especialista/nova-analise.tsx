import React, { useState } from "react";
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import Screen from "../../components/Screen";
import BackBar from "../../components/BackBar";
import ProfileField from "../../components/ProfileField";
import StarRating from "../../components/StarRating";
import PreviewBanner from "../../components/PreviewBanner";
import { useAppTheme } from "../../theme/ThemeContext";
import { useGames } from "../../context/GamesContext";

// NOVA ANÁLISE / EDITAR — rota "/especialista/nova-analise?jogoId=...".
// Layout da tela completa (nota, título, texto, pontos positivos e negativos, fixar no perfil).
// A publicação ainda NÃO está ligada ao servidor: hoje a análise é publicada pela tela do jogo
// ("Deixar comentário especialista"). Ligue o botão a POST /api/v1/reviews quando o backend tiver
// os campos novos (título, prós e contras, fixar).
export default function NovaAnalise() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { jogoId } = useLocalSearchParams<{ jogoId?: string }>();
  const { games } = useGames();
  const game = games.find((g) => g.id === jogoId);

  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [pros, setPros] = useState("");
  const [cons, setCons] = useState("");
  const [pin, setPin] = useState(false);
  const [notice, setNotice] = useState(false);

  return (
    <Screen>
      <BackBar title="Nova análise" fallback="/especialista/analises" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <PreviewBanner text="Prévia: o botão Publicar ainda não envia para o servidor." />

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

        <TouchableOpacity onPress={() => setNotice(true)} style={[styles.button, { backgroundColor: colors.accent }]}>
          <Text style={styles.buttonText}>Publicar análise</Text>
        </TouchableOpacity>
        {notice && (
          <Text style={{ color: colors.textSecondary, fontSize: 11, textAlign: "center", marginTop: 8 }}>
            Em breve: a publicação por esta tela será ligada ao servidor. Por enquanto, publique pela tela do jogo.
          </Text>
        )}
        {notice && game && (
          <TouchableOpacity onPress={() => router.push(`/jogo/${game.id}`)} style={{ alignSelf: "center", marginTop: 8 }}>
            <Text style={{ color: colors.accent, fontSize: 12, fontWeight: "600" }}>Abrir a página do jogo</Text>
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
