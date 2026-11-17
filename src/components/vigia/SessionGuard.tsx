import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Marca que a saída foi pedida pelo próprio usuário (botão Sair), para não mostrar o aviso de "outro dispositivo". */
export const MANUAL_SIGNOUT_KEY = "nv-manual-signout";
export const OTHER_DEVICE_PATH = "/entrar?reason=other-device";
const CHECK_EVERY_MS = 30_000;

const storage = {
  get(key: string) { try { return window.sessionStorage.getItem(key); } catch { return null; } },
  set(key: string, value: string) { try { window.sessionStorage.setItem(key, value); } catch { /* sem armazenamento */ } },
  remove(key: string) { try { window.sessionStorage.removeItem(key); } catch { /* sem armazenamento */ } },
};

/** Erro que significa "esta sessão não existe mais" (e não uma falha de rede). */
export function isSessionGone(error: { status?: number; code?: string; message?: string } | null | undefined): boolean {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return /session_not_found|session not found|bad_jwt|invalid jwt|refresh_token_not_found|refresh token not found|invalid refresh token/.test(text);
}

/**
 * Sessão única: quando a conta entra em outro dispositivo, o login novo encerra as demais sessões no servidor
 * (signOut escopo "others"). Este guarda confere de tempos em tempos se esta sessão ainda existe e, se não,
 * desconecta este aparelho e avisa o usuário.
 */
export function SessionGuard() {
  const hadSession = useRef(false);

  useEffect(() => {
    let stopped = false;
    const kicked = async () => {
      if (stopped) return;
      stopped = true;
      try { await supabase.auth.signOut({ scope: "local" }); } catch { /* já encerrada */ }
      if (window.location.pathname !== "/entrar") window.location.assign(OTHER_DEVICE_PATH);
    };
    const check = async () => {
      if (stopped || document.visibilityState === "hidden") return;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        hadSession.current = true;
        const { error } = await supabase.auth.getUser();
        if (isSessionGone(error)) await kicked();
      } catch { /* sem rede: tenta de novo no próximo ciclo */ }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) hadSession.current = true;
      if (event === "SIGNED_OUT" && hadSession.current) {
        if (storage.get(MANUAL_SIGNOUT_KEY)) { storage.remove(MANUAL_SIGNOUT_KEY); hadSession.current = false; return; }
        void kicked();
      }
    });
    void check();
    const timer = window.setInterval(() => void check(), CHECK_EVERY_MS);
    const onWake = () => void check();
    window.addEventListener("focus", onWake);
    window.addEventListener("online", onWake);
    document.addEventListener("visibilitychange", onWake);
    return () => {
      stopped = true;
      listener.subscription.unsubscribe();
      window.clearInterval(timer);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return null;
}

/** Chamado logo após um login válido: encerra a conta em todos os outros dispositivos. */
export async function endOtherSessions(): Promise<void> {
  try { await supabase.auth.signOut({ scope: "others" }); } catch { /* o login continua válido */ }
}
