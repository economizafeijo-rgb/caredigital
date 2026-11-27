/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";

/** Depois de 24 horas o registro fica trancado; a senha da conta libera a edição por 60 segundos. */
export const LOCK_AFTER_MS = 24 * 3_600_000;
const UNLOCK_SECONDS = 60;

export function useRecordLock() {
  const dialog = useDialog();
  const [until, setUntil] = useState<number | null>(null);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (until === null) return;
    const t = window.setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= until) setUntil(null);
    }, 1000);
    return () => window.clearInterval(t);
  }, [until]);
  const open = until !== null && now < until;
  const secondsLeft = open && until !== null ? Math.max(0, Math.ceil((until - now) / 1000)) : 0;
  /** Trancado: passou de 24 h e a edição não foi liberada. */
  const isLocked = (at: string) => Date.now() - Date.parse(at) > LOCK_AFTER_MS && !open;

  async function unlock() {
    const pass = await dialog.prompt(
      "Liberar edição",
      `Registros com mais de 24 horas ficam trancados. Digite a senha da sua conta para editar ou excluir por ${UNLOCK_SECONDS} segundos.`,
      "Senha",
      "",
      true,
    );
    if (!pass) return false;
    const { data } = await supabase.auth.getUser();
    const email = data.user?.email;
    if (!email) {
      dialog.notify("Entre na sua conta para liberar a edição.", "danger");
      return false;
    }
    const { error } = await (supabase.auth as any).signInWithPassword({ email, password: pass });
    if (error) {
      dialog.notify("Senha incorreta.", "danger");
      return false;
    }
    const n = Date.now();
    setNow(n);
    setUntil(n + UNLOCK_SECONDS * 1000);
    dialog.notify("Edição liberada por 60 segundos.");
    return true;
  }
  return { isLocked, unlock, open, secondsLeft };
}
