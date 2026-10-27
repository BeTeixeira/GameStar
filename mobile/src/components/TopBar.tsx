import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, usePathname, useRouter } from "expo-router";
import { useAppTheme } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNotifications } from "../context/NotificationsContext";
import Avatar from "./Avatar";

// ============================================================
// BARRA SUPERIOR — aparece em todas as telas.
//
// COMO NAVEGAR DE UMA TELA PARA OUTRA (Expo Router):
//   1) Toda tela é um arquivo dentro de /app. O nome/caminho do
//      arquivo VIRA o caminho de navegação. Ex: src/app/amigos.tsx
//      é acessado com "/amigos".
//   2) Os ícones desta barra trocam de tela com router.replace()
//      (não empilham telas: o "voltar" não fica passando por todas
//      as abas já visitadas). Telas de detalhe, como o jogo, usam
//      router.push() para o "voltar" retornar à lista.
//   3) Para criar uma nova tela principal: crie o arquivo em /app
//      (ex: src/app/perfil.tsx) e adicione um novo botão com goTo("/perfil").
// ============================================================

export default function TopBar() {
  const { colors } = useAppTheme();
  const { user, isExpert, isAdmin } = useAuth();
  const { unread } = useNotifications();
  const router = useRouter();
  const pathname = usePathname();

  const goTo = (path: Href & string) => {
    if (pathname !== path) router.replace(path);
  };
  const iconColor = (path: string) => (pathname === path ? colors.accent : colors.textPrimary);

  // Todas as contas navegam pela barra de abas de baixo (BottomTabs); aqui só ficam
  // o nome do app (leva à home de cada tipo de conta) e atalhos extras de admin/especialista.
  const home = isAdmin ? "/admin" : isExpert ? "/especialista" : "/";

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBackground, borderColor: colors.cardBorder }]}>
      <View style={styles.iconGroup}>
        {/* ADMIN: escudo (volta ao painel) */}
        {isAdmin && (
          <TouchableOpacity onPress={() => goTo("/admin")} hitSlop={8}>
            <Ionicons name="shield-checkmark-outline" size={18} color={iconColor("/admin")} />
          </TouchableOpacity>
        )}
      </View>

      {/* TEXTO EDITÁVEL — nome do app. "Star" usa a cor de destaque (accent).
          Tocar no nome leva para a home do tipo de conta (troque "home" acima para mudar o destino). */}
      <TouchableOpacity onPress={() => goTo(home)} hitSlop={8}>
        <Text style={[styles.logo, { color: colors.textPrimary }]}>
          Game<Text style={{ color: colors.accent }}>Star</Text>
        </Text>
      </TouchableOpacity>

      <View style={[styles.iconGroup, styles.rightGroup]}>
        {/* SINO DE AVISOS (todas as contas): tela /avisos, com contador vermelho de não lidos */}
        <TouchableOpacity onPress={() => goTo("/avisos")} hitSlop={8}>
          <Ionicons name="notifications-outline" size={18} color={iconColor("/avisos")} />
          {unread > 0 && (
            <View style={[styles.badge, { backgroundColor: colors.danger }]}>
              <Text style={styles.badgeText}>{unread > 99 ? "99+" : unread}</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* ADMIN: ícone de perfil/ajustes (as outras contas têm a aba "Perfil" embaixo) */}
        {isAdmin && (
          <TouchableOpacity onPress={() => goTo("/perfil")} hitSlop={8} style={styles.icon}>
            {/* Com foto de perfil, mostra a foto (contornada quando a tela de perfil está aberta) */}
            {user?.avatarUrl ? (
              <Avatar
                avatarUrl={user.avatarUrl}
                name={user.username}
                size={22}
                borderColor={pathname === "/perfil" ? colors.accent : undefined}
              />
            ) : (
              <Ionicons name="person-circle-outline" size={20} color={iconColor("/perfil")} />
            )}
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  // largura fixa nos dois lados mantém o nome do app centralizado
  iconGroup: { flexDirection: "row", alignItems: "center", width: 80 },
  rightGroup: { justifyContent: "flex-end" },
  icon: { marginLeft: 12 },
  badge: {
    position: "absolute",
    top: -5,
    right: -9,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" },
  logo: { fontSize: 15, fontWeight: "700" },
});
