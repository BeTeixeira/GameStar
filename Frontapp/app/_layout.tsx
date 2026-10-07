import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";
import { ThemeProvider, useAppTheme } from "../src/theme/ThemeContext";
import { AuthProvider, useAuth } from "../src/context/AuthContext";
import { GamesProvider } from "../src/context/GamesContext";
import { LibraryProvider } from "../src/context/LibraryContext";

// Layout raiz do app. Cada tela usa sua própria <TopBar />, então o
// cabeçalho padrão do Stack fica desligado (headerShown: false).
//
// PARA ADICIONAR UMA NOVA ROTA à navegação em pilha (stack), normalmente
// não é preciso mexer aqui — basta criar o arquivo em /app. Só é preciso
// listar a tela abaixo se ela tiver regra de acesso: telas dentro do
// primeiro <Stack.Protected> só abrem com usuário logado; sem login o
// app mostra a tela "login".
function RootStack() {
  const { theme, colors } = useAppTheme();
  const { user } = useAuth();

  return (
    <>
      {/* Texto da barra de status acompanha o tema (claro no escuro e vice-versa) */}
      <StatusBar style={theme === "dark" ? "light" : "dark"} />
      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.background } }}>
        <Stack.Protected guard={!!user}>
          <Stack.Screen name="index" />
          <Stack.Screen name="biblioteca" />
          <Stack.Screen name="amigos" />
          <Stack.Screen name="perfil" />
          <Stack.Screen name="jogo/[id]" />
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
              <RootStack />
            </LibraryProvider>
          </GamesProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </ThemeProvider>
  );
}
