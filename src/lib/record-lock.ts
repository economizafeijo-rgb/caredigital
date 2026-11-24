/**
 * Trava de segurança dos registros: depois de 24 horas, editar ou excluir pede uma senha.
 * Serve para evitar apagar sem querer; não substitui a segurança do servidor.
 */
export const RECORD_LOCK_HOURS = 24;
const RECORD_PIN = "000000";
/** Depois de digitar a senha, as alterações ficam liberadas por alguns minutos. */
const UNLOCK_MINUTES = 5;
let unlockedUntil = 0;

type Prompt = (
  title: string,
  message: string,
  placeholder?: string,
  initial?: string,
  secret?: boolean,
) => Promise<string | null>;

function toMs(at: string | number | Date): number {
  if (typeof at === "string" && /^\d{4}-\d{2}-\d{2}$/.test(at)) {
    // Só data: vale o fim desse dia no horário do Acre.
    return Date.parse(at + "T23:59:59-05:00");
  }
  return new Date(at).getTime();
}

export function isRecordLocked(at: string | number | Date | null | undefined, now = Date.now()) {
  if (at === null || at === undefined) return false;
  const t = toMs(at);
  return Number.isFinite(t) && now - t > RECORD_LOCK_HOURS * 3_600_000;
}

/** Devolve true se o registro pode ser alterado (recente, ou senha correta). */
export async function ensureUnlocked(
  at: string | number | Date | null | undefined,
  prompt: Prompt,
  notify?: (message: string, tone?: "success" | "danger" | "info") => void,
): Promise<boolean> {
  if (!isRecordLocked(at) || Date.now() < unlockedUntil) return true;
  for (let attempt = 0; attempt < 3; attempt++) {
    const typed = await prompt(
      "Registro protegido",
      attempt === 0
        ? "Registros com mais de 24 horas ficam trancados para não serem apagados sem querer. Digite a senha para alterar."
        : "Senha incorreta. Tente novamente.",
      "Senha de 6 dígitos",
      "",
      true,
    );
    if (typed === null) return false;
    if (typed.trim() === RECORD_PIN) {
      unlockedUntil = Date.now() + UNLOCK_MINUTES * 60_000;
      return true;
    }
  }
  notify?.("Senha incorreta. O registro continua protegido.", "danger");
  return false;
}
