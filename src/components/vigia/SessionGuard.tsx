import { useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import {
  checkSession,
  checkStoreDevice,
  releaseStoreDevice,
  type StoreDeviceState,
} from "@/lib/store-devices";

/** Marca que a saída foi pedida pelo próprio usuário (botão Sair), para não mostrar o aviso de "outro dispositivo". */
export const MANUAL_SIGNOUT_KEY = "nv-manual-signout";
export const OTHER_DEVICE_PATH = "/entrar?reason=other-device";
const CHECK_EVERY_MS = 15_000;
/** Sem nenhuma interação por este tempo, a sessão é encerrada neste aparelho. */
export const INACTIVITY_LIMIT_MS = 60 * 60 * 1000;
export const LAST_ACTIVITY_KEY = "nv-last-activity";
export const INACTIVITY_PATH = "/entrar?reason=inactivity";
const ACTIVITY_WRITE_EVERY_MS = 30_000;

const storage = {
  get(key: string) {
    try {
      return window.sessionStorage.getItem(key);
    } catch {
      return null;
    }
  },
  set(key: string, value: string) {
    try {
      window.sessionStorage.setItem(key, value);
    } catch {
      /* sem armazenamento */
    }
  },
  remove(key: string) {
    try {
      window.sessionStorage.removeItem(key);
    } catch {
      /* sem armazenamento */
    }
  },
};

/** Hora da última interação, compartilhada entre as abas deste navegador (localStorage). */
const activityStore = {
  get(): number {
    try {
      return Number(window.localStorage.getItem(LAST_ACTIVITY_KEY) ?? 0);
    } catch {
      return 0;
    }
  },
  set(value: number) {
    try {
      window.localStorage.setItem(LAST_ACTIVITY_KEY, String(value));
    } catch {
      /* sem armazenamento */
    }
  },
  clear() {
    try {
      window.localStorage.removeItem(LAST_ACTIVITY_KEY);
    } catch {
      /* sem armazenamento */
    }
  },
};

function touchActivity(lastWrite: { at: number }) {
  const now = Date.now();
  if (now - lastWrite.at < ACTIVITY_WRITE_EVERY_MS) return;
  lastWrite.at = now;
  activityStore.set(now);
}

/** Erro que significa "esta sessão não existe mais" (e não uma falha de rede). */
export function isSessionGone(
  error: { status?: number; code?: string; message?: string } | null | undefined,
): boolean {
  if (!error) return false;
  if (error.status === 401 || error.status === 403) return true;
  const text = `${error.code ?? ""} ${error.message ?? ""}`.toLowerCase();
  return /session_not_found|session not found|bad_jwt|invalid jwt|refresh_token_not_found|refresh token not found|invalid refresh token/.test(
    text,
  );
}

/**
 * Sessão única: quando a conta entra em outro dispositivo, o login novo encerra as demais sessões no servidor
 * (signOut escopo "others"). Este guarda confere de tempos em tempos se esta sessão ainda existe e, se não,
 * desconecta este aparelho e avisa o usuário.
 */
export function SessionGuard() {
  const hadSession = useRef(false);
  // Conta de loja: "unknown" até a primeira conferência; "not" para contas comuns (não confere de novo).
  const storeKind = useRef<"unknown" | "store" | "not">("unknown");

  useEffect(() => {
    let stopped = false;
    const kicked = async () => {
      if (stopped) return;
      stopped = true;
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* já encerrada */
      }
      if (window.location.pathname !== "/entrar") window.location.assign(OTHER_DEVICE_PATH);
    };
    // Limite de dispositivos ou expediente encerrado: sai deste aparelho e explica o motivo.
    const endStoreSession = async (state: StoreDeviceState) => {
      if (stopped) return;
      stopped = true;
      storage.set(MANUAL_SIGNOUT_KEY, "1");
      await releaseStoreDevice();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* já encerrada */
      }
      const reason = state === "limit" ? "device-limit" : "expediente";
      window.location.assign(`/entrar?reason=${reason}`);
    };
    const enforceStore = async () => {
      if (storeKind.current === "not") return;
      const state = await checkStoreDevice();
      if (state === "not_store" || state === "staff") {
        storeKind.current = "not";
        return;
      }
      if (state === "error") return;
      storeKind.current = "store";
      if (state !== "ok") await endStoreSession(state);
    };
    const logoutInactive = async () => {
      if (stopped) return;
      stopped = true;
      storage.set(MANUAL_SIGNOUT_KEY, "1");
      activityStore.clear();
      try {
        await supabase.auth.signOut({ scope: "local" });
      } catch {
        /* já encerrada */
      }
      window.location.assign(INACTIVITY_PATH);
    };
    const check = async () => {
      if (stopped) return;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        hadSession.current = true;
        // Inatividade: confere mesmo com a aba escondida, para o logout acontecer ao voltar.
        const last = activityStore.get();
        if (!last) activityStore.set(Date.now());
        else if (Date.now() - last > INACTIVITY_LIMIT_MS) {
          await logoutInactive();
          return;
        }
      } catch {
        /* sem rede: tenta de novo no próximo ciclo */
      }
      if (document.visibilityState === "hidden") return;
      try {
        const { data } = await supabase.auth.getSession();
        if (!data.session) return;
        const { error } = await supabase.auth.getUser();
        if (isSessionGone(error)) {
          await kicked();
          return;
        }
        // Sessão registrada no servidor: se a conta entrou em outro aparelho, sai deste.
        if (storeKind.current !== "store" && (await checkSession()) === "replaced") {
          await kicked();
          return;
        }
        await enforceStore();
      } catch {
        /* sem rede: tenta de novo no próximo ciclo */
      }
    };
    const { data: listener } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN") {
        storeKind.current = "unknown";
        activityStore.set(Date.now());
      }
      if (session) hadSession.current = true;
      if (event === "SIGNED_OUT" && hadSession.current) {
        if (storage.get(MANUAL_SIGNOUT_KEY)) {
          storage.remove(MANUAL_SIGNOUT_KEY);
          hadSession.current = false;
          return;
        }
        void kicked();
      }
    });
    const lastWrite = { at: 0 };
    const onActivity = () => touchActivity(lastWrite);
    const activityEvents = ["pointerdown", "keydown", "scroll", "touchstart", "mousemove"] as const;
    for (const ev of activityEvents) window.addEventListener(ev, onActivity, { passive: true });
    onActivity();
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
      for (const ev of activityEvents) window.removeEventListener(ev, onActivity);
      window.removeEventListener("focus", onWake);
      window.removeEventListener("online", onWake);
      document.removeEventListener("visibilitychange", onWake);
    };
  }, []);

  return null;
}

/** Chamado logo após um login válido: encerra a conta em todos os outros dispositivos. */
export async function endOtherSessions(): Promise<void> {
  try {
    await supabase.auth.signOut({ scope: "others" });
  } catch {
    /* o login continua válido */
  }
}
