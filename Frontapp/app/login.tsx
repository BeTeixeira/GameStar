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
import SelectField from "../src/components/SelectField";
import { AccountType, EXPERT_AREAS, ExpertArea } from "../src/types";

// TEXTO EDITÁVEL — as duas opções de tipo de conta no cadastro
const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: "normal", label: "Conta normal" },
  { value: "especialista", label: "Conta especialista" },
];

// Tela de login / cadastro. Usa POST /api/v1/auth/token e POST /api/v1/users.
// Depois do login o _layout.tsx troca automaticamente para o catálogo.
export default function Login() {
  const { colors } = useAppTheme();
  const { login, register } = useAuth();
  const [mode, setMode] = useState<"login" | "cadastro">("login");
  const [accountType, setAccountType] = useState<AccountType>("normal");
  const [fullName, setFullName] = useState(""); // nome (conta especialista)
  const [expertiseArea, setExpertiseArea] = useState<ExpertArea | null>(null); // área de atuação
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isCadastro = mode === "cadastro";
  const isEspecialista = isCadastro && accountType === "especialista";

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
    if (isEspecialista && fullName.trim().length < 2) {
      setError("Informe seu nome.");
      return;
    }
    if (isEspecialista && !expertiseArea) {
      setError("Escolha sua área de atuação.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      if (isCadastro)
        await register(username, email, password, {
          accountType,
          displayName: isEspecialista ? fullName : undefined,
          expertiseArea: isEspecialista ? expertiseArea : null,
        });
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

        {/* Escolha do tipo de conta — só aparece no cadastro */}
        {isCadastro && (
          <View style={[styles.segment, { borderColor: colors.cardBorder }]}>
            {ACCOUNT_TYPES.map((opt) => {
              const active = opt.value === accountType;
              return (
                <TouchableOpacity
                  key={opt.value}
                  onPress={() => {
                    setAccountType(opt.value);
                    setError(null);
                  }}
                  style={[styles.segmentItem, { backgroundColor: active ? colors.pillActive : colors.card }]}
                >
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: active ? colors.pillTextActive : colors.pillTextInactive,
                    }}
                  >
                    {opt.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Conta especialista: nome completo (vira o "Nome de exibição" do perfil) */}
        {isEspecialista && (
          <TextInput
            value={fullName}
            onChangeText={setFullName}
            placeholder="Nome"
            placeholderTextColor={colors.textSecondary}
            autoCapitalize="words"
            style={inputStyle}
          />
        )}

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

        {/* Conta especialista: área de atuação (caixa de seleção). Opções em EXPERT_AREAS (src/types) */}
        {isEspecialista && (
          <SelectField<ExpertArea>
            placeholder="Área de atuação"
            title="Área de atuação"
            value={expertiseArea}
            options={EXPERT_AREAS}
            onChange={setExpertiseArea}
            background={colors.card}
          />
        )}

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
  segment: { flexDirection: "row", borderWidth: 1, borderRadius: 8, overflow: "hidden" },
  segmentItem: { flex: 1, alignItems: "center", paddingVertical: 10 },
  input: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  error: { color: "#E05252", fontSize: 12 },
  button: { borderRadius: 8, paddingVertical: 12, alignItems: "center", marginTop: 4 },
  buttonText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  switchMode: { alignItems: "center", paddingVertical: 8 },
});
