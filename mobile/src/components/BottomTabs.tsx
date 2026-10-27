import React, { useCallback, useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, useFocusEffect, usePathname, useRouter } from "expo-router";
import { useAppTheme } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { api } from "../services/api";

// ============================================================
// BARRA DE ABAS (parte de baixo da tela) — para todos os tipos de conta:
// normal (USER_TABS), especialista (EXPERT_TABS) e admin (ADMIN_TABS).
//
// COMO EDITAR:
//   - Para mudar nome, ícone ou destino de uma aba, edite EXPERT_TABS / ADMIN_TABS abaixo.
//   - "path" é o caminho da tela (arquivo dentro de src/app).
//   - "active" diz quando a aba aparece destacada (inclui telas "filhas",
//     como /admin/conta/123 que pertence à aba Contas).
//   - "badge" (opcional) mostra um contador vermelho na aba.
// Esta barra é incluída nas telas com <BottomTabs />; ela escolhe sozinha as abas do tipo de conta.
// ============================================================

type Tab = {
  label: string; // TEXTO EDITÁVEL
  icon: keyof typeof Ionicons.glyphMap;
  path: string;
  active: (pathname: string) => boolean;
  badge?: number;
};

const is = (pathname: string, base: string) => pathname === base || pathname.startsWith(base + "/");

// ABAS DA CONTA NORMAL
const USER_TABS: Tab[] = [
  { label: "Catálogo", icon: "game-controller-outline", path: "/", active: (p) => p === "/" },
  { label: "Minha lista", icon: "star-outline", path: "/biblioteca", active: (p) => is(p, "/biblioteca") },
  { label: "Amigos", icon: "people-outline", path: "/amigos", active: (p) => is(p, "/amigos") },
  { label: "Perfil", icon: "person-outline", path: "/perfil", active: (p) => is(p, "/perfil") || is(p, "/pedir-especialista") },
];

// ABAS DO MODERADOR (as da conta normal + Moderação; o contador de pendentes entra no "badge")
const MODERATOR_TABS: Tab[] = [
  ...USER_TABS,
  { label: "Moderação", icon: "flag-outline", path: "/moderacao", active: (p) => is(p, "/moderacao") },
];

// ABAS DO ESPECIALISTA
const EXPERT_TABS: Tab[] = [
  { label: "Painel", icon: "grid-outline", path: "/especialista", active: (p) => p === "/especialista" },
  { label: "Catálogo", icon: "game-controller-outline", path: "/especialista/catalogo", active: (p) => is(p, "/especialista/catalogo") },
  {
    label: "Análises",
    icon: "list-outline",
    path: "/especialista/analises",
    active: (p) => is(p, "/especialista/analises") || is(p, "/especialista/nova-analise"),
  },
  { label: "Seguidores", icon: "heart-outline", path: "/especialista/seguidores", active: (p) => is(p, "/especialista/seguidores") },
  { label: "Perfil", icon: "person-outline", path: "/perfil", active: (p) => is(p, "/perfil") || is(p, "/perfil-publico") },
];

// ABAS DO ADMIN
const ADMIN_TABS: Tab[] = [
  { label: "Geral", icon: "speedometer-outline", path: "/admin", active: (p) => p === "/admin" },
  { label: "Jogos", icon: "game-controller-outline", path: "/admin/jogos", active: (p) => is(p, "/admin/jogos") || is(p, "/admin/jogo") },
  {
    label: "Contas",
    icon: "people-outline",
    path: "/admin/contas",
    active: (p) => is(p, "/admin/contas") || is(p, "/admin/conta") || is(p, "/admin/especialistas"),
  },
  { label: "Moderação", icon: "flag-outline", path: "/admin/moderacao", active: (p) => is(p, "/admin/moderacao") },
  { label: "Pedidos", icon: "mail-outline", path: "/admin/pedidos", active: (p) => is(p, "/admin/pedidos") || is(p, "/admin/pedido") },
];

export default function BottomTabs() {
  const { colors } = useAppTheme();
  const { isAdmin, isModerator, isExpert, canModerate } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [pendingReports, setPendingReports] = useState(0);

  // contador da aba Moderação: GET /moderation/reports/pending-count, atualizado ao focar a tela
  useFocusEffect(
    useCallback(() => {
      if (!canModerate) return;
      api
        .get<{ count: number }>("/api/v1/moderation/reports/pending-count")
        .then((r) => setPendingReports(r.count))
        .catch(() => {});
    }, [canModerate])
  );

  const tabs = isAdmin ? ADMIN_TABS : isModerator ? MODERATOR_TABS : isExpert ? EXPERT_TABS : USER_TABS;

  return (
    <View style={[styles.bar, { backgroundColor: colors.headerBackground, borderColor: colors.cardBorder }]}>
      {tabs.map((tab) => {
        const active = tab.active(pathname);
        const badge = tab.label === "Moderação" ? pendingReports : tab.badge;
        const color = active ? colors.textPrimary : colors.textSecondary;
        return (
          <TouchableOpacity
            key={tab.label}
            style={styles.tab}
            onPress={() => !active && router.replace(tab.path as Href)}
            activeOpacity={0.7}
          >
            <View>
              <Ionicons name={tab.icon} size={20} color={active ? colors.accent : colors.textSecondary} />
              {!!badge && (
                <View style={[styles.badge, { backgroundColor: colors.danger }]}>
                  <Text style={styles.badgeText}>{badge}</Text>
                </View>
              )}
            </View>
            <Text style={{ fontSize: 10, color, fontWeight: active ? "700" : "400", marginTop: 2 }}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: "row", borderTopWidth: 1, paddingTop: 6, paddingBottom: 8 },
  tab: { flex: 1, alignItems: "center", justifyContent: "center" },
  badge: {
    position: "absolute",
    top: -4,
    right: -9,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: { color: "#FFFFFF", fontSize: 8, fontWeight: "700" },
});
