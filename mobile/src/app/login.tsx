import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  StyleSheet,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import StarBackground, { useStarLayout } from "../components/StarBackground";
import { useAppTheme } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";

// Tela de login / cadastro. Usa POST /api/v1/auth/token e POST /api/v1/users.
// Depois do login o _layout.tsx troca automaticamente para o catálogo.
export default function Login() {
  const { colors } = useAppTheme();
  const { login, register } = useAuth();
  const insets = useSafeAreaInsets();
  const { formTop } = useStarLayout();
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
    // campos levemente translúcidos para o fundo de constelações aparecer por trás
    { backgroundColor: "rgba(22,14,46,0.78)", borderColor: colors.cardBorder, color: colors.textPrimary },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      {/* Fundo de constelações (logo GameStar já faz parte da imagem) */}
      <StarBackground />
      <KeyboardAvoidingView style={styles.fill} behavior="padding">
        {/* Rolável: com o teclado aberto em telas pequenas, campos e botão continuam alcançáveis */}
        <ScrollView
          contentContainerStyle={[styles.content, { paddingTop: formTop, paddingBottom: insets.bottom + 24 }]}
          keyboardShouldPersistTaps="handled"
        >
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
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, gap: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { color: "#FF6B7A", fontSize: 12 },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  switchMode: { alignItems: "center", paddingVertical: 8 },
});
