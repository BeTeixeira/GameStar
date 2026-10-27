import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { useAppTheme } from "../../theme/ThemeContext";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";
import { ApiPublicProfile } from "../../types";
import { confirmAction } from "../../utils/confirm";
import Tag from "../Tag";

type Props = {
  profile: ApiPublicProfile;
  onChange: (profile: ApiPublicProfile) => void;
};

type Action = "ban" | "unban" | "mute" | "unmute";

// MODERAÇÃO DO PERFIL — estado da conta + silenciar/banir (POST /api/v1/moderation/users/{id}/...).
// Só aparece para moderador/admin; o moderador não age em admins, moderadores nem em si mesmo.
export default function ModerationActions({ profile, onChange }: Props) {
  const { colors } = useAppTheme();
  const { user, isModerator, canModerate } = useAuth();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isSelf = user?.id === profile.id;
  const protectedTarget = profile.role === "admin" || profile.role === "moderator";
  if (!canModerate || isSelf || (isModerator && protectedTarget)) return null;

  const isActive = profile.is_active !== false;
  const isMuted = profile.is_muted === true;
  // Moderador só desfaz banimento feito por moderador; sem registro (null, banimentos antigos) conta como do admin
  const canUnban = !isModerator || profile.deactivated_by_role === "moderator";

  const run = async (action: Action) => {
    setBusy(true);
    setError(null);
    try {
      const updated = await api.post<ApiPublicProfile>(`/api/v1/moderation/users/${profile.id}/${action}`, {});
      onChange({
        ...profile,
        is_active: updated.is_active,
        is_muted: updated.is_muted,
        deactivated_by_role: updated.deactivated_by_role,
      });
    } catch (e: any) {
      setError(e.message ?? "Não foi possível concluir a ação.");
    } finally {
      setBusy(false);
    }
  };

  const press = (action: Action) => {
    if (action === "ban") confirmAction(`Banir @${profile.username}? A conta não conseguirá mais entrar.`, () => run(action), "Banir");
    else if (action === "unban") confirmAction(`Desbanir @${profile.username}?`, () => run(action), "Desbanir");
    else run(action);
  };

  const button = (label: string, action: Action, destructive: boolean) => (
    <TouchableOpacity
      disabled={busy}
      onPress={() => press(action)}
      style={[styles.button, { borderColor: destructive ? colors.danger : colors.accent, opacity: busy ? 0.6 : 1 }]}
    >
      <Text style={{ color: destructive ? colors.danger : colors.accent, fontSize: 12, fontWeight: "700" }}>{label}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.box, { backgroundColor: colors.card, borderColor: colors.cardBorder }]}>
      <Text style={{ color: colors.textPrimary, fontSize: 13, fontWeight: "700" }}>Moderação</Text>
      <View style={styles.tags}>
        <Tag label={isActive ? "Ativa" : "Banida"} tone={isActive ? "ok" : "bad"} />
        {!isActive && profile.deactivated_by_role === "admin" && <Tag label="por admin" tone="warn" />}
        {!isActive && profile.deactivated_by_role === "moderator" && <Tag label="por moderador" tone="warn" />}
        {isMuted && <Tag label="Silenciada" tone="warn" />}
      </View>
      <View style={styles.buttons}>
        {button(isMuted ? "Tirar silêncio" : "Silenciar", isMuted ? "unmute" : "mute", false)}
        {isActive ? button("Banir", "ban", true) : canUnban && button("Desbanir", "unban", false)}
      </View>
      {!!error && <Text style={{ color: colors.danger, fontSize: 11 }}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderWidth: 1, borderRadius: 10, padding: 12, gap: 8 },
  tags: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
  buttons: { flexDirection: "row", gap: 8 },
  button: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: 9, alignItems: "center" },
});
