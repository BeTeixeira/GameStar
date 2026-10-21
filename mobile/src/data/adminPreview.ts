// DADOS DE EXEMPLO das telas do admin que ainda não têm backend (Moderação e Pedidos).
// Quando as rotas da API existirem, troque estes arrays por chamadas em api.get(...)
// e apague o <PreviewBanner /> das telas.

export type PreviewReport = {
  id: string;
  author: string;
  game: string;
  reason: "Ofensivo" | "Spam" | "Spoiler";
  text: string;
  reporters: number;
  when: string;
};

export const PREVIEW_REPORTS: PreviewReport[] = [
  { id: "d1", author: "rafa_88", game: "Elden Ring", reason: "Ofensivo", text: "“Quem gosta disso não entende nada de jogo, só pode ser…”", reporters: 2, when: "há 1 h" },
  { id: "d2", author: "pedro_h", game: "Celeste", reason: "Spam", text: "“Compre moedas baratas em site-xyz.com…”", reporters: 1, when: "há 3 h" },
  { id: "d3", author: "carol.s", game: "Hades II", reason: "Spoiler", text: "“No final o personagem morre e…”", reporters: 1, when: "ontem" },
];

export type RequestStatus = "pendente" | "aprovado" | "recusado";

export type PreviewRequest = {
  id: string;
  name: string;
  username: string;
  area: string;
  company: string;
  links: string[];
  message: string;
  status: RequestStatus;
  when: string;
};

export const PREVIEW_REQUESTS: PreviewRequest[] = [
  { id: "p1", name: "Julia Reis", username: "julia_reis", area: "Jornalista", company: "Games&Co", links: ["gamesandco.com.br", "Instagram"], message: "Escrevo sobre jogos há 6 anos e gostaria de publicar análises no GameStar.", status: "pendente", when: "há 12 min" },
  { id: "p2", name: "Tiago Lima", username: "tiago_lima", area: "Influencer", company: "@tiagoplays", links: ["YouTube"], message: "Tenho um canal de gameplay e quero compartilhar minhas notas.", status: "pendente", when: "há 2 h" },
  { id: "p3", name: "lucas.dev", username: "lucas.dev", area: "Dev", company: "Estúdio Lume", links: ["lume.dev"], message: "Desenvolvedor indie.", status: "aprovado", when: "02/10" },
  { id: "p4", name: "anon_77", username: "anon_77", area: "Empresa", company: "—", links: [], message: "Quero divulgar meus produtos.", status: "recusado", when: "28/09" },
];
