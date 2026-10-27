// ============================================================
// CORES DO APP — EDITE AQUI para mudar a paleta do GameStar.
// O app tem um único tema ("Ultravioleta"), sem troca claro/escuro.
// Cada chave é usada em várias telas, então trocar o valor aqui
// já reflete em todo o app (cards, botões, textos, etc.).
// ============================================================

export type ThemeColors = {
  background: string; // fundo da tela
  headerBackground: string; // fundo da barra superior (TopBar)
  card: string; // fundo dos cards (jogos, amigos)
  cardBorder: string; // borda dos cards
  textPrimary: string; // texto principal
  textSecondary: string; // texto secundário (subtítulos, legendas)
  accent: string; // cor de destaque (botões, ícone ativo, "Star" do logo)
  star: string; // cor das estrelinhas de avaliação
  pillActive: string; // fundo do filtro/chip selecionado
  pillInactive: string; // fundo do filtro/chip não selecionado
  pillTextActive: string;
  pillTextInactive: string;
  danger: string; // ações destrutivas e erros (excluir, sair, mensagens de erro)
  success: string; // confirmações e estado positivo (aprovado, ok)
  inputBackground: string; // fundo dos campos de texto e do avatar sem foto
};

// Tema único do app: "Ultravioleta" (fundo escuro com roxo vivo).
export const palette: ThemeColors = {
  background: "#0B0718",
  headerBackground: "#07040F",
  card: "#160E2E",
  cardBorder: "#2A1B52",
  textPrimary: "#F7F2FF",
  textSecondary: "#B5A3E0",
  accent: "#9558F2",
  star: "#F5B400",
  pillActive: "#9558F2",
  pillInactive: "#160E2E",
  pillTextActive: "#FFFFFF",
  pillTextInactive: "#B5A3E0",
  danger: "#FF6B7A",
  success: "#4CC38A",
  inputBackground: "#110A25",
};
