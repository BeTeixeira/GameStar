import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "../theme/ThemeContext";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { GamesProvider } from "../context/GamesContext";
import { LibraryProvider } from "../context/LibraryContext";
import { FollowProvider } from "../context/FollowContext";

// Layout raiz do app. Cada tela usa sua própria <TopBar />, então o
// cabeçalho padrão do Stack fica desligado (headerShown: false).
//
// PARA ADICIONAR UMA NOVA ROTA à navegação em pilha (stack), normalmente
// não é preciso mexer aqui — basta criar o arquivo em src/app. Só é preciso
// listar a tela abaixo se ela tiver regra de acesso: telas dentro do
// primeiro <Stack.Protected> só abrem com usuário logado; sem login o
// app mostra a tela "login". As telas de admin (src/app/admin/) só abrem
// para contas com role "admin"; as do especialista (src/app/especialista/) só para contas especialistas.
function RootStack() {
  const { colors } = useAppTheme();
  const { user, isAdmin, isExpert, canModerate } = useAuth();

  return (
    <>
      {/* Tema único escuro: texto da barra de status sempre claro */}
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="biblioteca" />
          <Stack.Screen name="amigos" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="jogo/[id]" />
          <Stack.Screen name="perfil-publico/[id]" />
          <Stack.Screen name="pedir-especialista" />
        </Stack.Protected>
        {/* Área do especialista (src/app/especialista/) — só contas especialistas */}
        <Stack.Protected guard={!!user && isExpert}>
          <Stack.Screen name="especialista/index" />
          <Stack.Screen name="especialista/catalogo" />
          <Stack.Screen name="especialista/analises" />
          <Stack.Screen name="especialista/nova-analise" />
          <Stack.Screen name="especialista/seguidores" />
          <Stack.Screen name="especialista/avisos" />
        </Stack.Protected>
        {/* Moderação (src/app/moderacao.tsx) — moderador e admin */}
        <Stack.Protected guard={!!user && canModerate}>
          <Stack.Screen name="moderacao" />
        </Stack.Protected>
        <Stack.Protected guard={!!user && isAdmin}>
          <Stack.Screen name="admin/index" />
          <Stack.Screen name="admin/jogos" />
          <Stack.Screen name="admin/jogo" />
          <Stack.Screen name="admin/contas" />
          <Stack.Screen name="admin/conta/[id]" />
          <Stack.Screen name="admin/especialistas" />
          <Stack.Screen name="admin/moderacao" />
          <Stack.Screen name="admin/pedidos" />
          <Stack.Screen name="admin/pedido/[id]" />
        </Stack.Protected>
        <Stack.Protected guard={!user}>
          <Stack.Screen name="login" />
        </Stack.Protected>
      </Stack>
    </>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <SafeAreaProvider>
        <AuthProvider>
          <GamesProvider>
            <LibraryProvider>
              <FollowProvider>
                <RootStack />
              </FollowProvider>
            </LibraryProvider>
          </GamesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
