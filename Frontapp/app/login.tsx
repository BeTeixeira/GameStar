import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Screen from "../src/components/Screen";
import { useAppTheme } from "../src/theme/ThemeContext";
import { useAuth } from "../src/context/AuthContext";

// Tela de login / cadastro. Usa POST /api/v1/auth/token e POST /api/v1/users.
// Depois do login o _layout.tsx troca automaticamente para o catálogo.
export default function Login() {
  const { colors } = useAppTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCadastro = mode === "cadastro";

  const submit = async () => {
    if (!email.trim() || !password) {
      setError("Preencha email e senha.");
      return;
    }
    if (isCadastro && username.trim().length < 3) {
      setError("O nome de usuário precisa ter pelo menos 3 caracteres.");
      return;
    }
    if (isCadastro && password.length < 8) {
      setError("A senha precisa ter pelo menos 8 caracteres.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isCadastro) await register(username, email, password);
      else await login(email, password);
    } catch (e: any) {
      setError(e.message ?? "Não foi possível entrar.");
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    { backgroundColor: colors.card, borderColor: colors.cardBorder, color: colors.textPrimary },
  ];

  return (
    <Screen>
      {/* Rolável: com o teclado aberto em telas pequenas, campos e botão continuam alcançáveis */}
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.logoArea}>
          <View style={[styles.logoIcon, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
            <Ionicons name="game-controller" size={44} color={colors.accent} />
          </View>
          {/* TEXTO EDITÁVEL */}
          <Text style={[styles.logo, { color: colors.textPrimary }]}>
            Game<Text style={{ color: colors.accent }}>Star</Text>
          </Text>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Descubra, avalie e colecione</Text>
        </View>

        {isCadastro && (
          <TextInput
            value={username}
            onChangeText={setUsername}
            placeholder="Nome de usuário"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="none"
            style={inputStyle}
          />
        )}
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="Email"
          placeholderTextColor={colors.textSecondary}
          autoCapitalize="none"
          keyboardType="email-address"
          style={inputStyle}
        />
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="Senha"
          placeholderTextColor={colors.textSecondary}
          secureTextEntry
          style={inputStyle}
          onSubmitEditing={submit}
        />

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity
          onPress={submit}
          disabled={loading}
          style={[styles.button, { backgroundColor: colors.accent, opacity: loading ? 0.7 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>{isCadastro ? "Criar conta" : "Entrar"}</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setMode(isCadastro ? "login" : "cadastro");
            setError(null);
          }}
          style={styles.switchMode}
        >
          <Text style={{ color: colors.textSecondary, fontSize: 12 }}>
            {isCadastro ? "Já tem conta? " : "Não tem conta? "}
            <Text style={{ color: colors.accent, fontWeight: "600" }}>{isCadastro ? "Entrar" : "Cadastre-se"}</Text>
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { flexGrow: 1, justifyContent: "center", paddingHorizontal: 24, paddingVertical: 24, gap: 10 },
  logoArea: { alignItems: "center", gap: 6, marginBottom: 20 },
  logoIcon: {
    width: 84,
    height: 84,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  logo: { fontSize: 26, fontWeight: "700" },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { color: "#E05252", fontSize: 12 },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  switchMode: { alignItems: "center", paddingVertical: 8 },
});
