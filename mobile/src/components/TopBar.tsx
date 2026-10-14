import React from "react";
import { View, Text, TouchableOpacity, Switch, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Href, usePathname, useRouter } from "expo-router";
import { useAppTheme } from "../theme/ThemeContext";
import { useAuth } from "../context/AuthContext";
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
  const { colors, theme, toggleTheme } = useAppTheme();
  const { user, isExpert, isAdmin } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const goTo = (path: Href & string) => {
    if (pathname !== path) router.replace(path);
  };
  const iconColor = (path: string) => (pathname === path ? colors.accent : colors.textPrimary);

  return (
    <View style={[styles.container, { backgroundColor: colors.headerBackground, borderColor: colors.cardBorder }]}>
      <View style={[styles.iconGroup, isExpert && styles.fixedGroup]}>
        {/* ÍCONE/CAMINHO EDITÁVEL — "star" leva para a Minha lista */}
        <TouchableOpacity onPress={() => goTo("/biblioteca")} hitSlop={8}>
          <Ionicons name="star-outline" size={18} color={iconColor("/biblioteca")} />
        </TouchableOpacity>

        {/* ÍCONE/CAMINHO EDITÁVEL — "game-controller" leva para o catálogo (Home) */}
        <TouchableOpacity onPress={() => goTo("/")} hitSlop={8}>
          <Ionicons name="game-controller-outline" size={18} color={iconColor("/")} style={styles.icon} />
        </TouchableOpacity>

        {/* ÍCONE/CAMINHO EDITÁVEL — "people" leva para a tela de amigos */}
        <TouchableOpacity onPress={() => goTo("/amigos")} hitSlop={8}>
          <Ionicons name="people-outline" size={18} color={iconColor("/amigos")} style={styles.icon} />
        </TouchableOpacity>
      </View>

      {/* TEXTO EDITÁVEL — nome do app. "Star" usa a cor de destaque (accent).
          CONTA ESPECIALISTA: tocar no nome leva para a página inicial (troque "/" para mudar o destino).
          Conta normal: o nome continua só como texto. */}
      <TouchableOpacity
        onPress={() => isExpert && goTo("/")}
        disabled={!isExpert}
        hitSlop={8}
        activeOpacity={isExpert ? 0.7 : 1}
      >
        <Text style={[styles.logo, { color: colors.textPrimary }]}>
          Game<Text style={{ color: colors.accent }}>Star</Text>
        </Text>
      </TouchableOpacity>

      <View style={[styles.iconGroup, isExpert && styles.fixedGroup, isExpert && styles.rightGroup]}>
        {/* Botão de modo claro/escuro: removido para a conta especialista (o interruptor
            "Tema claro" continua no perfil). A conta normal mantém o botão aqui. */}
        {!isExpert && <Switch value={theme === "light"} onValueChange={toggleTheme} />}

        {/* ÍCONE EDITÁVEL — painel do admin (src/app/admin/), só para contas admin */}
        {isAdmin && (
          <TouchableOpacity onPress={() => goTo("/admin")} hitSlop={8} style={styles.icon}>
            <Ionicons name="shield-checkmark-outline" size={18} color={iconColor("/admin")} />
          </TouchableOpacity>
        )}

        {/* Ícone de perfil — leva para src/app/perfil.tsx (dados da conta e sair) */}
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
  iconGroup: { flexDirection: "row", alignItems: "center" },
  // conta especialista: largura fixa nos dois lados mantém o nome do app centralizado
  fixedGroup: { width: 80 },
  rightGroup: { justifyContent: "flex-end" },
  icon: { marginLeft: 12 },
  logo: { fontSize: 15, fontWeight: "700" },
});
