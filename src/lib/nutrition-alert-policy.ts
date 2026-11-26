import type { RiskInfo } from "./nutrition-risk";

/** Estado diário dos avisos de sódio, açúcar e gordura (guardado no aparelho). */
export type AlertState = { muted: boolean; notified: string[] };

export const emptyAlertState = (): AlertState => ({ muted: false, notified: [] });

/**
 * Decide quais limites geram aviso agora: só a primeira vez no dia em que cada nutriente passa do
 * limite. "Perto do limite" nunca gera aviso (só o indicador nos cartões), um nutriente já avisado
 * não avisa de novo (nem ao corrigir e voltar a passar) e silenciar vale até o fim do dia.
 */
export function pendingAlerts(
  risks: RiskInfo[],
  state: AlertState,
): { fire: RiskInfo[]; next: AlertState } {
  if (state.muted) return { fire: [], next: state };
  const fire = risks.filter(
    (r) => (r.level === "over" || r.level === "severe") && !state.notified.includes(r.key),
  );
  if (!fire.length) return { fire, next: state };
  return { fire, next: { ...state, notified: [...state.notified, ...fire.map((r) => r.key)] } };
}
