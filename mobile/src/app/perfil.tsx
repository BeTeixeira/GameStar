import React, { useCallback, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  Switch,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect, useRouter } from "expo-router";
import { useAppTheme } from "../theme/ThemeContext";
import { ProfileImage, useAuth } from "../context/AuthContext";
import { useLibrary } from "../context/LibraryContext";
import { ApiError, LocalFile, api, mediaUrl } from "../services/api";
import { ApiFriend, EXPERT_AREAS, EXPERT_AREA_LABELS, ExpertArea } from "../types";
import Screen from "../components/Screen";
import TopBar from "../components/TopBar";
import BottomTabs from "../components/BottomTabs";
import Avatar from "../components/Avatar";
import SectionCard from "../components/SectionCard";
import ProfileField from "../components/ProfileField";
import SelectField from "../components/SelectField";
import ConfirmModal from "../components/ConfirmModal";

// Tela de perfil — rota "/perfil". Cabeçalho (fundo, foto, estatísticas) +
// edição da conta. Tudo é salvo na API em /api/v1/users/me.

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const DELETE_WORD = "EXCLUIR"; // palavra que o usuário digita para confirmar a exclusão

// Limites da API (backend/app/infrastructure/storage.py)
const MAX_MB: Record<ProfileImage, number> = { avatar: 5, banner: 10 };

// TEXTO EDITÁVEL — mensagens de erro da API (detail em inglês → português)
function friendlyError(e: any): string {
  const msg: string = e?.message ?? "";
  if (msg.startsWith("Email")) return "Esse e-mail já está em uso.";
  if (msg.startsWith("Username")) return "Esse nome de usuário já está em uso.";
  if (msg === "Current password is incorrect.") return "Senha atual incorreta.";
  if (msg === "New password must be different from the current one.")
    return "A nova senha deve ser diferente da atual.";
  if (msg === "Password is incorrect.") return "Senha incorreta.";
  if (msg.startsWith("Image is too large")) return "Imagem muito grande.";
  if (msg.startsWith("Unsupported image format")) return "Formato não suportado. Use PNG, JPG, WebP ou GIF.";
  return msg || "Algo deu errado. Tente de novo.";
}

// Abre a galeria e devolve o arquivo escolhido. Sem recorte (allowsEditing):
// recortar transformaria o GIF em imagem parada.
async function pickImage(): Promise<ImagePicker.ImagePickerAsset | null> {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images"],
    allowsEditing: false,
    quality: 1,
  });
  return result.canceled ? null : result.assets[0];
}

function toLocalFile(asset: ImagePicker.ImagePickerAsset): LocalFile {
  const ext = asset.uri.split(".").pop()?.toLowerCase() ?? "jpg";
  const type = asset.mimeType ?? (ext === "jpg" ? "image/jpeg" : `image/${ext}`);
  return { uri: asset.uri, name: asset.fileName ?? `imagem.${ext}`, type };
}

export default function Perfil() {
  const { colors } = useAppTheme();
  const router = useRouter();
  const { user, isAdmin, isExpert, refreshMe, logout, updateProfile, changePassword, deleteAccount, setImage, removeImage } =
    useAuth();
  const { myReviews, statuses } = useLibrary();

  // ---------- estatísticas ----------
  const [friendsCount, setFriendsCount] = useState<number | null>(null);
  useFocusEffect(
    useCallback(() => {
      refreshMe().catch(() => {});
      api
        .get<ApiFriend[]>("/api/v1/friends")
        .then((f) => setFriendsCount(f.length))
        .catch(() => setFriendsCount(null));
    }, [refreshMe])
  );

  // ---------- foto e fundo ----------
  const [uploading, setUploading] = useState<ProfileImage | null>(null);
  const [imageMessage, setImageMessage] = useState<{ text: string; ok: boolean } | null>(null);
  const [removeImageOpen, setRemoveImageOpen] = useState<ProfileImage | null>(null);

  // ---------- dados pessoais, notificações e privacidade ----------
  const [displayName, setDisplayName] = useState(user?.displayName ?? "");
  const [username, setUsername] = useState(user?.username ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [bio, setBio] = useState(user?.bio ?? "");
  const [notifyFriendRequests, setNotifyFriendRequests] = useState(user?.notifyFriendRequests ?? true);
  const [notifyComments, setNotifyComments] = useState(user?.notifyComments ?? true);
  const [notifyRecommendations, setNotifyRecommendations] = useState(user?.notifyRecommendations ?? false);
  const [privateProfile, setPrivateProfile] = useState(user?.privateProfile ?? false);
  // Conta especialista: empresa e área de atuação
  const [company, setCompany] = useState(user?.company ?? "");
  const [expertiseArea, setExpertiseArea] = useState<ExpertArea | null>(user?.expertiseArea ?? null);
  const [profileErrors, setProfileErrors] = useState<{ username?: string; email?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ text: string; ok: boolean } | null>(null);

  // ---------- senha ----------
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<{ current?: string; next?: string; confirm?: string }>({});
  const [passwordMessage, setPasswordMessage] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  // ---------- sair / excluir ----------
  const [logoutOpen, setLogoutOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState("");
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);

  if (!user) return null;

  const shownName = user.displayName || user.username;
  const bannerUri = mediaUrl(user.bannerUrl);

  // ---------- ações: foto e fundo ----------
  async function changeImage(kind: ProfileImage) {
    setImageMessage(null);
    const asset = await pickImage();
    if (!asset) return;
    if (asset.fileSize && asset.fileSize > MAX_MB[kind] * 1024 * 1024) {
      setImageMessage({ ok: false, text: `Imagem muito grande (máx. ${MAX_MB[kind]} MB).` });
      return;
    }
    setUploading(kind);
    try {
      await setImage(kind, toLocalFile(asset));
      setImageMessage({ ok: true, text: kind === "avatar" ? "Foto atualizada." : "Fundo atualizado." });
    } catch (e) {
      setImageMessage({ ok: false, text: friendlyError(e) });
    } finally {
      setUploading(null);
    }
  }

  async function confirmRemoveImage() {
    const kind = removeImageOpen;
    setRemoveImageOpen(null);
    if (!kind) return;
    setUploading(kind);
    try {
      await removeImage(kind);
      setImageMessage(null);
    } catch (e) {
      setImageMessage({ ok: false, text: friendlyError(e) });
    } finally {
      setUploading(null);
    }
  }

  // ---------- ações: salvar perfil ----------
  async function saveProfile() {
    const errors: typeof profileErrors = {};
    const cleanUsername = username.trim();
    if (cleanUsername.length < 3 || /\s/.test(cleanUsername))
      errors.username = "Use pelo menos 3 caracteres, sem espaços.";
    if (!EMAIL_REGEX.test(email.trim())) errors.email = "Informe um e-mail válido.";
    setProfileErrors(errors);
    setSaveMessage(null);
    if (Object.keys(errors).length > 0) return;

    setSaving(true);
    try {
      await updateProfile({
        display_name: displayName,
        username: cleanUsername,
        email: email.trim(),
        bio,
        notify_friend_requests: notifyFriendRequests,
        notify_comments: notifyComments,
        notify_recommendations: notifyRecommendations,
        private_profile: privateProfile,
        // Só conta especialista (a API recusa esses campos para conta normal)
        ...(isExpert ? { company: company.trim() } : {}),
        ...(isExpert && expertiseArea ? { expertise_area: expertiseArea } : {}),
      });
      setSaveMessage({ ok: true, text: "Alterações salvas." });
    } catch (e) {
      const text = friendlyError(e);
      if (text.includes("nome de usuário")) setProfileErrors({ username: text });
      else if (text.includes("e-mail")) setProfileErrors({ email: text });
      setSaveMessage({ ok: false, text });
    } finally {
      setSaving(false);
    }
  }

  // ---------- ações: senha ----------
  async function submitPassword() {
    const errors: typeof passwordErrors = {};
    if (!currentPassword) errors.current = "Informe sua senha atual.";
    if (newPassword.length < 8) errors.next = "A nova senha precisa ter pelo menos 8 caracteres.";
    else if (!/\d/.test(newPassword) || !/[A-Za-z]/.test(newPassword))
      errors.next = "Use letras e números na nova senha.";
    else if (newPassword === currentPassword) errors.next = "A nova senha deve ser diferente da atual.";
    if (confirmPassword !== newPassword) errors.confirm = "A confirmação não é igual à nova senha.";
    setPasswordErrors(errors);
    setPasswordMessage("");
    if (Object.keys(errors).length > 0) return;

    setChangingPassword(true);
    try {
      await changePassword(currentPassword, newPassword);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordMessage("Senha alterada com sucesso.");
    } catch (e) {
      const text = friendlyError(e);
      if (text === "Senha atual incorreta.") setPasswordErrors({ current: text });
      else setPasswordErrors({ next: text });
    } finally {
      setChangingPassword(false);
    }
  }

  // ---------- ações: excluir conta ----------
  function closeDelete() {
    setDeleteOpen(false);
    setDeleteText("");
    setDeletePassword("");
    setDeleteError("");
  }

  async function submitDelete() {
    setDeleting(true);
    setDeleteError("");
    try {
      await deleteAccount(deletePassword); // sucesso faz logout → o app volta para o login
    } catch (e) {
      setDeleteError(e instanceof ApiError && e.status === 400 ? "Senha incorreta." : friendlyError(e));
      setDeleting(false);
    }
  }

  return (
    <Screen>
      <TopBar />

      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {/* ================= CABEÇALHO: FUNDO + FOTO ================= */}
        <View style={[styles.headerCard, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
          <TouchableOpacity activeOpacity={0.85} onPress={() => changeImage("banner")} disabled={!!uploading}>
            <View style={[styles.banner, { backgroundColor: colors.pillActive }]}>
              {bannerUri ? (
                <Image source={{ uri: bannerUri }} style={StyleSheet.absoluteFill} contentFit="cover" autoplay />
              ) : (
                <View style={styles.bannerEmpty}>
                  <Ionicons name="image-outline" size={22} color="#FFFFFF" />
                  {/* TEXTO EDITÁVEL */}
                  <Text style={styles.bannerHint}>Toque para adicionar um fundo</Text>
                </View>
              )}
              {uploading === "banner" && <ActivityIndicator color="#FFFFFF" style={styles.spinner} />}
            </View>
          </TouchableOpacity>

          <View style={styles.identity}>
            <TouchableOpacity onPress={() => changeImage("avatar")} activeOpacity={0.85} disabled={!!uploading}>
              <Avatar avatarUrl={user.avatarUrl} name={shownName} size={84} borderColor={colors.card} />
              <View style={[styles.cameraBadge, { backgroundColor: colors.accent, borderColor: colors.card }]}>
                {uploading === "avatar" ? (
                  <ActivityIndicator size="small" color="#FFFFFF" />
                ) : (
                  <Ionicons name="camera" size={13} color="#FFFFFF" />
                )}
              </View>
            </TouchableOpacity>

            <View style={styles.nameRow}>
              <Text style={[styles.name, { color: colors.textPrimary }]} numberOfLines={1}>
                {shownName}
              </Text>
              {isAdmin && (
                <View style={[styles.badge, { borderColor: colors.accent }]}>
                  <Ionicons name="shield-checkmark" size={11} color={colors.accent} />
                  <Text style={{ fontSize: 10, color: colors.accent, fontWeight: "600" }}>ADMIN</Text>
                </View>
              )}
            </View>
            {/* TAG ESPECIALISTA — só aparece para contas especialistas. Texto/ícone editáveis aqui. */}
            {isExpert && (
              <View style={[styles.expertTag, { backgroundColor: colors.accent }]}>
                <Ionicons name="ribbon-outline" size={12} color="#FFFFFF" />
                <Text style={styles.expertTagText}>
                  Especialista{user.expertiseArea ? ` · ${EXPERT_AREA_LABELS[user.expertiseArea]}` : ""}
                </Text>
              </View>
            )}
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>@{user.username}</Text>
            {/* ID da conta (selecionável): o admin usa para tornar a conta especialista */}
            <Text selectable style={{ fontSize: 10, color: colors.textSecondary, marginTop: 2 }}>
              ID da conta: {user.id}
            </Text>
            {user.bio ? <Text style={[styles.bio, { color: colors.textPrimary }]}>{user.bio}</Text> : null}

            <View style={styles.stats}>
              <Stat value={myReviews.length} label="Avaliações" />
              {isExpert ? (
                // Conta especialista: seguidores no lugar de "Na minha lista"
                <Stat value={user.followersCount} label="Seguidores" />
              ) : (
                <Stat value={Object.keys(statuses).length} label="Na minha lista" />
              )}
              {/* Especialista não tem amigos (só seguidores) */}
              {!isExpert && <Stat value={friendsCount ?? "–"} label="Amigos" />}
            </View>
          </View>
        </View>

        {/* ATALHO DE NAVEGAÇÃO — especialista vê a própria vitrine (tela /perfil-publico/[id]);
            conta normal abre o pedido para virar especialista (tela /pedir-especialista). */}
        {isExpert ? (
          <TouchableOpacity
            onPress={() => router.push(`/perfil-publico/${user.id}`)}
            style={[styles.outlineButton, { borderColor: colors.accent, marginBottom: 12 }]}
          >
            <Ionicons name="eye-outline" size={15} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: "600" }}>Ver como meus seguidores me veem</Text>
          </TouchableOpacity>
        ) : user?.role === "user" ? (
          <TouchableOpacity
            onPress={() => router.push("/pedir-especialista")}
            style={[styles.outlineButton, { borderColor: colors.accent, marginBottom: 12 }]}
          >
            <Ionicons name="ribbon-outline" size={15} color={colors.accent} style={{ marginRight: 6 }} />
            <Text style={{ fontSize: 12, color: colors.accent, fontWeight: "600" }}>Quero ser especialista</Text>
          </TouchableOpacity>
        ) : null}

        {/* ================= 1. FOTO E FUNDO ================= */}
        <SectionCard title="Foto e fundo" icon="images-outline">
          <View style={styles.imageButtons}>
            <PillButton label="Alterar foto" color={colors.accent} onPress={() => changeImage("avatar")} />
            {user.avatarUrl && (
              <PillButton
                label="Remover foto"
                color={colors.textSecondary}
                onPress={() => setRemoveImageOpen("avatar")}
              />
            )}
          </View>
          <View style={styles.imageButtons}>
            <PillButton label="Alterar fundo" color={colors.accent} onPress={() => changeImage("banner")} />
            {user.bannerUrl && (
              <PillButton
                label="Remover fundo"
                color={colors.textSecondary}
                onPress={() => setRemoveImageOpen("banner")}
              />
            )}
          </View>
          {/* TEXTO EDITÁVEL */}
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            PNG, JPG, WebP ou GIF animado. Foto até {MAX_MB.avatar} MB, fundo até {MAX_MB.banner} MB.
          </Text>
          {imageMessage && (
            <Text style={[styles.feedback, { color: imageMessage.ok ? colors.accent : colors.danger }]}>
              {imageMessage.text}
            </Text>
          )}
        </SectionCard>

        {/* ================= 2. DADOS PESSOAIS ================= */}
        <SectionCard title="Dados pessoais" icon="person-outline">
          <ProfileField
            label="Nome de exibição"
            value={displayName}
            onChangeText={setDisplayName}
            maxLength={60}
            autoCapitalize="words"
            placeholder={user.username}
            helper="Aparece no seu perfil. Em branco, mostra o nome de usuário."
          />
          <ProfileField
            label="Nome de usuário"
            value={username}
            onChangeText={setUsername}
            error={profileErrors.username}
            maxLength={50}
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
          {/* CONTA ESPECIALISTA — empresa e área de atuação (opções da caixa em EXPERT_AREAS, src/types) */}
          {isExpert && (
            <>
              <ProfileField
                label="Empresa"
                value={company}
                onChangeText={setCompany}
                maxLength={80}
                autoCapitalize="words"
                placeholder="Onde você trabalha (opcional)"
              />
              <SelectField<ExpertArea>
                label="Área de atuação"
                placeholder="Selecione sua área"
                value={expertiseArea}
                options={EXPERT_AREAS}
                onChange={setExpertiseArea}
              />
            </>
          )}
          <ProfileField
            label="Bio"
            value={bio}
            onChangeText={setBio}
            multiline
            maxLength={160}
            autoCapitalize="sentences"
            helper={`${bio.length}/160`}
            style={{ minHeight: 60, textAlignVertical: "top" }}
            placeholder="Conte um pouco sobre você e os jogos que curte"
          />
        </SectionCard>

        {/* ================= 3. NOTIFICAÇÕES ================= */}
        <SectionCard title="Notificações" icon="notifications-outline">
          <SwitchRow label="Solicitações de amizade" value={notifyFriendRequests} onChange={setNotifyFriendRequests} />
          <SwitchRow label="Comentários nas minhas avaliações" value={notifyComments} onChange={setNotifyComments} />
          <SwitchRow label="Recomendações de jogos" value={notifyRecommendations} onChange={setNotifyRecommendations} />
          {/* TEXTO EDITÁVEL */}
          <Text style={[styles.helper, { color: colors.textSecondary }]}>
            Suas escolhas ficam salvas; o envio de notificações chega numa próxima versão.
          </Text>
        </SectionCard>

        {/* ================= 4. PRIVACIDADE ================= */}
        {/* "Perfil privado": removido para a conta especialista (perfil sempre público) */}
        {!isExpert && (
          <SectionCard title="Privacidade" icon="shield-checkmark-outline">
            <SwitchRow
              label="Perfil privado (só amigos veem minha lista)"
              value={privateProfile}
              onChange={setPrivateProfile}
            />
          </SectionCard>
        )}

        {/* ================= SALVAR ================= */}
        {saveMessage && (
          <Text style={[styles.feedback, styles.center, { color: saveMessage.ok ? colors.accent : colors.danger }]}>
            {saveMessage.text}
          </Text>
        )}
        <TouchableOpacity
          onPress={saveProfile}
          disabled={saving}
          style={[styles.primaryButton, { backgroundColor: colors.accent, opacity: saving ? 0.7 : 1 }]}
        >
          {saving ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={{ fontSize: 13, color: "#FFFFFF", fontWeight: "700" }}>Salvar alterações</Text>
          )}
        </TouchableOpacity>

        {/* ================= 5. SENHA ================= */}
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
            <Text style={[styles.feedback, { color: colors.accent }]}>{passwordMessage}</Text>
          ) : null}
          <TouchableOpacity
            onPress={submitPassword}
            disabled={changingPassword}
            style={[styles.outlineButton, { borderColor: colors.accent }]}
          >
            {changingPassword ? (
              <ActivityIndicator color={colors.accent} />
            ) : (
              <Text style={{ fontSize: 12, color: colors.accent, fontWeight: "600" }}>Atualizar senha</Text>
            )}
          </TouchableOpacity>
        </SectionCard>

        {/* ================= 6. SESSÃO / ZONA DE PERIGO ================= */}
        <TouchableOpacity
          onPress={() => setLogoutOpen(true)}
          style={[styles.outlineButton, { borderColor: colors.cardBorder, marginBottom: 16 }]}
        >
          <Ionicons name="log-out-outline" size={15} color={colors.textPrimary} style={{ marginRight: 6 }} />
          <Text style={{ fontSize: 12, color: colors.textPrimary }}>Sair da conta</Text>
        </TouchableOpacity>

        <SectionCard title="Zona de perigo" icon="warning-outline" danger>
          <Text style={[styles.helper, { color: colors.textSecondary, marginBottom: 10 }]}>
            Excluir a conta apaga seu perfil, suas avaliações, sua lista e suas amizades. Essa ação não pode
            ser desfeita.
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
      <BottomTabs />

      {/* ================= MODAIS DE CONFIRMAÇÃO ================= */}
      <ConfirmModal
        visible={removeImageOpen !== null}
        title={removeImageOpen === "banner" ? "Remover fundo?" : "Remover foto?"}
        message={
          removeImageOpen === "banner"
            ? "Seu perfil voltará ao fundo padrão."
            : "Seu perfil voltará a exibir suas iniciais."
        }
        confirmLabel="Remover"
        danger
        onCancel={() => setRemoveImageOpen(null)}
        onConfirm={confirmRemoveImage}
      />

      <ConfirmModal
        visible={logoutOpen}
        title="Sair da conta?"
        message="Você precisará entrar novamente para acessar suas avaliações."
        confirmLabel="Sair"
        onCancel={() => setLogoutOpen(false)}
        onConfirm={() => {
          setLogoutOpen(false);
          logout(); // o _layout.tsx leva para a tela de login
        }}
      />

      <ConfirmModal
        visible={deleteOpen}
        title="Excluir conta definitivamente?"
        message={`Para confirmar, digite ${DELETE_WORD} e sua senha.`}
        confirmLabel={deleting ? "Excluindo..." : "Excluir"}
        danger
        confirmDisabled={deleting || deleteText.trim().toUpperCase() !== DELETE_WORD || !deletePassword}
        onCancel={closeDelete}
        onConfirm={submitDelete}
      >
        <ProfileField
          label="Confirmação"
          value={deleteText}
          onChangeText={setDeleteText}
          autoCapitalize="characters"
          placeholder={DELETE_WORD}
        />
        <ProfileField
          label="Senha"
          value={deletePassword}
          onChangeText={setDeletePassword}
          error={deleteError}
          isPassword
        />
      </ConfirmModal>
    </Screen>
  );
}

function Stat({ value, label }: { value: number | string; label: string }) {
  const { colors } = useAppTheme();
  return (
    <View style={styles.stat}>
      <Text style={[styles.statValue, { color: colors.textPrimary }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  );
}

function PillButton({ label, color, onPress }: { label: string; color: string; onPress: () => void }) {
  return (
    <TouchableOpacity onPress={onPress} style={[styles.pillButton, { borderColor: color }]}>
      <Text style={{ fontSize: 11, color }}>{label}</Text>
    </TouchableOpacity>
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
  content: { padding: 12, paddingBottom: 32 },
  headerCard: { borderWidth: 1, borderRadius: 12, overflow: "hidden", marginBottom: 12 },
  banner: { height: 120, justifyContent: "center", alignItems: "center" },
  // marginBottom: sobe o conteúdo acima da parte do fundo coberta pela foto (42 = metade do avatar)
  bannerEmpty: { alignItems: "center", gap: 4, opacity: 0.85, marginBottom: 42 },
  bannerHint: { color: "#FFFFFF", fontSize: 11 },
  spinner: { position: "absolute" },
  identity: { alignItems: "center", paddingHorizontal: 16, paddingBottom: 16, marginTop: -42 },
  cameraBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 8, maxWidth: "100%" },
  name: { fontSize: 18, fontWeight: "700", flexShrink: 1 },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderWidth: 1,
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  expertTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    marginTop: 4,
    marginBottom: 2,
  },
  expertTagText: { fontSize: 10, color: "#FFFFFF", fontWeight: "700" },
  bio: { fontSize: 12, textAlign: "center", marginTop: 8, lineHeight: 17 },
  stats: { flexDirection: "row", justifyContent: "space-around", alignSelf: "stretch", marginTop: 14 },
  stat: { alignItems: "center" },
  statValue: { fontSize: 18, fontWeight: "700" },
  statLabel: { fontSize: 11 },
  imageButtons: { flexDirection: "row", gap: 8, marginBottom: 8 },
  pillButton: { borderWidth: 1, borderRadius: 20, paddingHorizontal: 14, paddingVertical: 6 },
  helper: { fontSize: 11, lineHeight: 16 },
  feedback: { fontSize: 11, marginTop: 6, marginBottom: 6 },
  center: { textAlign: "center" },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingVertical: 6 },
  outlineButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
  },
  primaryButton: { alignItems: "center", justifyContent: "center", borderRadius: 8, paddingVertical: 12, marginBottom: 16 },
});
