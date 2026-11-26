import { BADGES } from "./badges";

// ============================================================
// LOJA — configurações e textos editáveis.
// ============================================================

// FASE DE TESTES: enquanto for true, toda badge pode ser resgatada sem custo
// e os preços em StarCoin não são cobrados. Mude para false quando a loja
// passar a cobrar (o backend também precisará validar o saldo).
export const TEST_PHASE_FREE = true;

export type StoreSection = "badges" | "borders" | "names";

// Abas da loja. "ready: false" mostra o aviso "Em desenvolvimento".
export const STORE_SECTIONS: { value: StoreSection; label: string; ready: boolean }[] = [
  { value: "badges", label: "Badges", ready: true },
  { value: "borders", label: "Bordas", ready: false },
  { value: "names", label: "Nomes", ready: false },
];

export const ALL_CATEGORIES = "Todas";

// Categorias na mesma ordem do catálogo (src/data/badges.ts).
export const BADGE_CATEGORIES: string[] = [ALL_CATEGORIES, ...new Set(BADGES.map((badge) => badge.category))];
