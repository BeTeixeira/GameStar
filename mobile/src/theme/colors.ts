// ============================================================
// CORES DO APP — EDITE AQUI para mudar a paleta do GameStar.
// Cada chave é usada em várias telas, então trocar o valor aqui
// já reflete em todo o app (cards, botões, textos, etc.).
// ============================================================

export type ThemeName = "light" | "dark";

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
  inputBackground: string; // fundo dos campos de texto e do avatar sem foto
};

export const palette: Record<ThemeName, ThemeColors> = {
  dark: {
    background: "#2A1B4E",
    headerBackground: "#241947",
    card: "#3A2A63",
    cardBorder: "#4A3878",
    textPrimary: "#FFFFFF",
    textSecondary: "#C9BEEA",
    accent: "#8B6FD9",
    star: "#F5B400",
    pillActive: "#8B6FD9",
    pillInactive: "#3A2A63",
    pillTextActive: "#FFFFFF",
    pillTextInactive: "#C9BEEA",
    danger: "#E05252",
    inputBackground: "#2F2257",
  },
  light: {
    background: "#EAF3FB",
    headerBackground: "#BFE0F5",
    card: "#FFFFFF",
    cardBorder: "#CFE3F2",
    textPrimary: "#14121F",
    textSecondary: "#5F5E5A",
    accent: "#5B3FA0",
    star: "#F5B400",
    pillActive: "#5B3FA0",
    pillInactive: "#FFFFFF",
    pillTextActive: "#FFFFFF",
    pillTextInactive: "#5F5E5A",
    danger: "#C93C3C",
    inputBackground: "#F4F8FC",
  },
};
