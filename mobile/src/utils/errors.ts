// TEXTO EDITÁVEL — mostrado quando a API recusa uma ação com 403 (a mensagem da API vem em inglês).
export const FORBIDDEN_MESSAGE = "Sua conta não tem permissão para esta ação.";

// Erro de uma ação em comentário/análise. No 403 recarrega a conta (refreshMe), porque a
// causa mais comum é ter sido silenciado: a tela passa a mostrar o aviso pelo user.isMuted.
export function actionErrorMessage(e: any, fallback: string, refreshMe: () => Promise<void>): string {
  if (e?.status === 403) {
    refreshMe().catch(() => {});
    return FORBIDDEN_MESSAGE;
  }
  return e?.message ?? fallback;
}
