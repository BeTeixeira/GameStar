import React, { useState } from "react";
import {
  View,
  Text,
  Image,
  ScrollView,
  Switch,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { SafeAreaView } from "react-native-safe-area-context";
import { useAppTheme } from "../src/theme/ThemeContext";
import { currentUser } from "../src/data/user";
import TopBar from "../src/components/TopBar";
import SectionCard from "../src/components/SectionCard";
import ProfileField from "../src/components/ProfileField";
import ConfirmModal from "../src/components/ConfirmModal";

// Tela de edição de perfil — rota "/perfil".
// Onde ligar o back-end: procure os comentários "TODO API".

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-z0-9_.]{3,20}$/;
const DELETE_WORD = "EXCLUIR"; // palavra que o usuário digita para confirmar a exclusão

export default function Perfil() {
  const { colors, theme, toggleTheme } = useAppTheme();
  const router = useRouter();

  // ---------- dados pessoais ----------
  const [avatarUri, setAvatarUri] = useState<string | null>(currentUser.avatarUri);
  const [name, setName] = useState(currentUser.name);
  const [username, setUsername] = useState(currentUser.username);
  const [email, setEmail] = useState(currentUser.email);
  const [bio, setBio] = useState(currentUser.bio);
  const [profileErrors, setProfileErrors] = useState<{ name?: string; username?: string; email?: string }>({});
  const [savedMessage, setSavedMessage] = useState("");

  // ---------- senha ----------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [passwordMessage, setPasswordMessage] = useState("");

  // ---------- preferências ----------
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(currentUser.notifyFriendRequests);
  const [notifyComments, setNotifyComments] = useState(currentUser.notifyComments);
  const [notifyRecommendations, setNotifyRecommendations] = useState(currentUser.notifyRecommendations);
  const [privateProfile, setPrivateProfile] = useState(currentUser.privateProfile);

  // ---------- modais ----------
  const [removePhotoOpen, setRemovePhotoOpen] = useState(false);
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");

  // ---------- foto ----------
  async function pickPhoto() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      setAvatarUri(result.assets[0].uri);
      // TODO API: enviar a nova foto ao servidor (upload) e salvar a URL retornada.
    }
  }

  // ---------- salvar dados pessoais ----------
  function saveProfile() {
    const errors: typeof profileErrors = {};
    if (name.trim().length < 2) errors.name = "Informe seu nome (mínimo 2 caracteres).";
    if (!USERNAME_REGEX.test(username.trim().toLowerCase()))
      errors.username = "Use 3 a 20 caracteres: letras minúsculas, números, _ ou .";
    if (!EMAIL_REGEX.test(email.trim())) errors.email = "Informe um e-mail válido.";

    setProfileErrors(errors);
    if (Object.keys(errors).length > 0) {
      setSavedMessage("");
      return;
    }

    // TODO API: enviar { name, username, email, bio, notificações, privacidade } ao servidor.
    setSavedMessage("Alterações salvas com sucesso.");
  }

  // ---------- alterar senha ----------
  function changePassword() {
    const errors: typeof passwordErrors = {};
    if (!currentPassword) errors.current = "Informe sua senha atual.";
    if (newPassword.length < 8) errors.next = "A nova senha precisa ter pelo menos 8 caracteres.";
    else if (!/\d/.test(newPassword) || !/[A-Za-z]/.test(newPassword))
      errors.next = "Use letras e números na nova senha.";
    else if (newPassword === currentPassword) errors.next = "A nova senha deve ser diferente da atual.";
    if (confirmPassword !== newPassword) errors.confirm = "A confirmação não é igual à nova senha.";

    setPasswordErrors(errors);
    if (Object.keys(errors).length > 0) {
      setPasswordMessage("");
      return;
    }

    // TODO API: enviar { currentPassword, newPassword } ao servidor e tratar "senha atual incorreta".
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordMessage("Senha alterada com sucesso.");
  }

  // ---------- sair / excluir ----------
  function logout() {
    setLogoutOpen(false);
    // TODO API: encerrar a sessão (limpar token) antes de navegar.
    router.replace("/"); // trocar por "/login" quando existir
  }

  function deleteAccount() {
    setDeleteOpen(false);
    setDeleteText("");
    // TODO API: chamar o endpoint de exclusão de conta e limpar a sessão.
    router.replace("/");
  }

  const initialsFallbackIcon = <Ionicons name="person-outline" size={40} color={colors.textSecondary} />;

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: colors.background }]} edges={["top"]}>
      <TopBar />

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <TouchableOpacity onPress={() => router.back()} style={styles.backRow} hitSlop={8}>
            <Ionicons name="arrow-back" size={16} color={colors.textSecondary} />
            <Text style={{ fontSize: 12, color: colors.textSecondary, marginLeft: 4 }}>Voltar</Text>
          </TouchableOpacity>

          <Text style={[styles.screenTitle, { color: colors.textPrimary }]}>Editar perfil</Text>

          {/* ================= 1. FOTO ================= */}
          <SectionCard title="Foto de perfil" icon="camera-outline">
            <View style={styles.avatarArea}>
              <TouchableOpacity onPress={pickPhoto} activeOpacity={0.8}>
                <View style={[styles.avatar, { borderColor: colors.accent, backgroundColor: colors.inputBackground }]}>
                  {avatarUri ? <Image source={{ uri: avatarUri }} style={styles.avatarImage} /> : initialsFallbackIcon}
                </View>
                <View style={[styles.cameraBadge, { backgroundColor: colors.accent }]}>
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                </View>
              </TouchableOpacity>

              <View style={styles.avatarActions}>
                <TouchableOpacity onPress={pickPhoto} style={[styles.pillButton, { borderColor: colors.accent }]}>
                  <Text style={{ fontSize: 11, color: colors.accent }}>Alterar foto</Text>
                </TouchableOpacity>

                {avatarUri && (
                  <TouchableOpacity
                    onPress={() => setRemovePhotoOpen(true)}
                    style={[styles.pillButton, { borderColor: colors.cardBorder }]}
                  >
                    <Text style={{ fontSize: 11, color: colors.textSecondary }}>Remover</Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          </SectionCard>

          {/* ================= 2. DADOS PESSOAIS ================= */}
          <SectionCard title="Dados pessoais" icon="person-outline">
            <ProfileField
              label="Nome"
              value={name}
              onChangeText={setName}
              error={profileErrors.name}
              autoCapitalize="words"
              placeholder="Seu nome"
            />
            <ProfileField
              label="Nome de usuário"
              value={username}
              onChangeText={setUsername}
              error={profileErrors.username}
              helper="É assim que seus amigos encontram você."
              placeholder="usuario"
            />
            <ProfileField
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              error={profileErrors.email}
              keyboardType="email-address"
              placeholder="voce@email.com"
            />
            <ProfileField
              label="Bio"
              value={bio}
              onChangeText={setBio}
              multiline
              maxLength={160}
              autoCapitalize="sentences"
              helper={`${bio.length}/160`}
              style={{ minHeight: 60, textAlignVertical: "top" }}
              placeholder="Conte um pouco sobre você"
            />
          </SectionCard>

          {/* ================= 3. SENHA ================= */}
          <SectionCard title="Alterar senha" icon="lock-closed-outline">
            <ProfileField
              label="Senha atual"
              value={currentPassword}
              onChangeText={setCurrentPassword}
              error={passwordErrors.current}
              isPassword
            />
            <ProfileField
              label="Nova senha"
              value={newPassword}
              onChangeText={setNewPassword}
              error={passwordErrors.next}
              helper="Mínimo de 8 caracteres, com letras e números."
              isPassword
            />
            <ProfileField
              label="Confirmar nova senha"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              error={passwordErrors.confirm}
              isPassword
            />

            {passwordMessage ? (
              <Text style={[styles.successText, { color: colors.accent }]}>{passwordMessage}</Text>
            ) : null}

            <TouchableOpacity onPress={changePassword} style={[styles.outlineButton, { borderColor: colors.accent }]}>
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: "600" }}>Atualizar senha</Text>
            </TouchableOpacity>
          </SectionCard>

          {/* ================= 4. NOTIFICAÇÕES ================= */}
          <SectionCard title="Notificações" icon="notifications-outline">
            <SwitchRow label="Solicitações de amizade" value={notifyFriendRequests} onChange={setNotifyFriendRequests} />
            <SwitchRow label="Comentários nas minhas avaliações" value={notifyComments} onChange={setNotifyComments} />
            <SwitchRow label="Recomendações de jogos" value={notifyRecommendations} onChange={setNotifyRecommendations} />
          </SectionCard>

          {/* ================= 5. PRIVACIDADE E APARÊNCIA ================= */}
          <SectionCard title="Privacidade e aparência" icon="shield-checkmark-outline">
            <SwitchRow
              label="Perfil privado (só amigos veem minha lista)"
              value={privateProfile}
              onChange={setPrivateProfile}
            />
            <SwitchRow label="Tema claro" value={theme === "light"} onChange={toggleTheme} />
          </SectionCard>

          {/* ================= SALVAR ================= */}
          {savedMessage ? (
            <Text style={[styles.successText, { color: colors.accent, textAlign: "center" }]}>{savedMessage}</Text>
          ) : null}

          <TouchableOpacity onPress={saveProfile} style={[styles.primaryButton, { backgroundColor: colors.accent }]}>
            <Text style={{ fontSize: 13, color: "#FFFFFF", fontWeight: "700" }}>Salvar alterações</Text>
          </TouchableOpacity>

          {/* ================= 6. SESSÃO / ZONA DE PERIGO ================= */}
          <TouchableOpacity
            onPress={() => setLogoutOpen(true)}
            style={[styles.outlineButton, { borderColor: colors.cardBorder, marginBottom: 16 }]}
          >
            <Ionicons name="log-out-outline" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: colors.textPrimary }}>Sair da conta</Text>
          </TouchableOpacity>

          <SectionCard title="Zona de perigo" icon="warning-outline" danger>
            <Text style={{ fontSize: 11, color: colors.textSecondary, lineHeight: 16, marginBottom: 10 }}>
              Excluir a conta apaga seu perfil, suas avaliações e comentários. Essa ação não pode ser desfeita.
            </Text>
            <TouchableOpacity
              onPress={() => setDeleteOpen(true)}
              style={[styles.outlineButton, { borderColor: colors.danger }]}
            >
              <Ionicons name="trash-outline" size={15} color={colors.danger} style={{ marginRight: 6 }} />
              <Text style={{ fontSize: 12, color: colors.danger, fontWeight: "600" }}>Excluir minha conta</Text>
            </TouchableOpacity>
          </SectionCard>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* ================= MODAIS DE CONFIRMAÇÃO ================= */}
      <ConfirmModal
        visible={removePhotoOpen}
        title="Remover foto?"
        message="Seu perfil voltará a exibir o ícone padrão."
        confirmLabel="Remover"
        danger
        onCancel={() => setRemovePhotoOpen(false)}
        onConfirm={() => {
          setAvatarUri(null);
          setRemovePhotoOpen(false);
        }}
      />

      <ConfirmModal
        visible={logoutOpen}
        title="Sair da conta?"
        message="Você precisará entrar novamente para acessar suas avaliações."
        confirmLabel="Sair"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={logout}
      />

      <ConfirmModal
        visible={deleteOpen}
        title="Excluir conta definitivamente?"
        message={`Para confirmar, digite ${DELETE_WORD} no campo abaixo.`}
        confirmLabel="Excluir"
        danger
        confirmDisabled={deleteText.trim().toUpperCase() !== DELETE_WORD}
        onCancel={() => {
          setDeleteOpen(false);
          setDeleteText("");
        }}
        onConfirm={deleteAccount}
      >
        <ProfileField label="" value={deleteText} onChangeText={setDeleteText} autoCapitalize="characters" placeholder={DELETE_WORD} />
      </ConfirmModal>
    </SafeAreaView>
  );
}

function SwitchRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.switchRow}>
      <Text style={{ flex: 1, fontSize: 12, color: colors.textPrimary, marginRight: 10 }}>{label}</Text>
      <Switch
        value={value}
        onValueChange={onChange}
        trackColor={{ false: colors.cardBorder, true: colors.accent }}
        thumbColor="#FFFFFF"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { padding: 12, paddingBottom: 32 },
  backRow: { flexDirection: "row", alignItems: "center", marginBottom: 8 },
  screenTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  avatarArea: { flexDirection: "row", alignItems: "center", gap: 16 },
  avatar: {
    width: 84,
    height: 84,
    borderRadius: 42,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  avatarImage: { width: "100%", height: "100%" },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarActions: { gap: 8 },
  pillButton: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6, alignSelf: "flex-start" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  successText: { fontSize: 11, marginBottom: 8 },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  primaryButton: { alignItems: "center", justifyContent: "center", borderRadius: 8, paddingVertical: 12, marginBottom: 12 },
});