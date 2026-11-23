import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

/** Envia ao service worker a ordem de sincronizar a fila (com o token atual da sessão). */
async function requestFlush() {
  const sw = navigator.serviceWorker?.controller;
  if (!sw || !navigator.onLine) return;
  let token: string | null = null;
  try {
    const { data } = await supabase.auth.getSession();
    token = data.session?.access_token ?? null;
  } catch {
    /* sem sessão */
  }
  sw.postMessage({ type: "nv-flush", token });
}

/** Faixa de modo offline: avisa quando está sem internet, quantos registros aguardam envio e quando sincronizou. */
export function OfflineSync() {
  const [online, setOnline] = useState(true);
  const [pending, setPending] = useState(0);
  const [synced, setSynced] = useState(0);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    setOnline(navigator.onLine);
    const onMsg = (e: MessageEvent) => {
      const d = e.data as { type?: string; count?: number; sent?: number } | null;
      if (d?.type !== "nv-offline-queue") return;
      setPending(d.count ?? 0);
      if (d.sent) {
        setSynced(d.sent);
        window.setTimeout(() => setSynced(0), 4000);
        // Atualiza as telas com os dados que acabaram de subir.
        window.dispatchEvent(new Event("nv-offline-synced"));
      }
    };
    navigator.serviceWorker.addEventListener("message", onMsg);
    const goOnline = () => {
      setOnline(true);
      void requestFlush();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    void navigator.serviceWorker.ready.then((reg) => {
      reg.active?.postMessage({ type: "nv-count" });
      void requestFlush();
      // Guarda os arquivos que esta página já carregou, para abrirem sem internet.
      const urls = performance
        .getEntriesByType("resource")
        .map((r) => r.name)
        .filter((u) => u.startsWith(location.origin) && /\/assets\/|\.(js|css|woff2?)$/.test(u));
      reg.active?.postMessage({ type: "nv-warm", urls });
    });
    const t = window.setInterval(() => void requestFlush(), 60_000);
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "SIGNED_OUT")
        navigator.serviceWorker.controller?.postMessage({ type: "nv-signed-out" });
    });
    return () => {
      navigator.serviceWorker.removeEventListener("message", onMsg);
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
      window.clearInterval(t);
      sub.subscription.unsubscribe();
    };
  }, []);

  if (online && !pending && !synced) return null;
  return (
    <div
      role="status"
      className="nv-round fixed inset-x-0 top-[max(env(safe-area-inset-top),8px)] z-[13000] mx-auto flex w-fit max-w-[calc(100vw-1.5rem)] items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-semibold text-white shadow-xl ring-1 ring-white/15 backdrop-blur"
      style={{
        background: !online
          ? "rgba(30,41,59,.95)"
          : synced
            ? "rgba(4,120,87,.95)"
            : "rgba(14,116,144,.95)",
      }}
    >
      {!online ? (
        <>
          <CloudOff size={15} className="shrink-0 text-amber-300" />
          Modo offline
          {pending > 0
            ? ` · ${pending} registro${pending > 1 ? "s" : ""} aguardando envio`
            : " · seus registros serão enviados depois"}
        </>
      ) : synced ? (
        <>
          <CheckCircle2 size={15} className="shrink-0" /> {synced} registro{synced > 1 ? "s" : ""}{" "}
          sincronizado
          {synced > 1 ? "s" : ""}
        </>
      ) : (
        <>
          <RefreshCw size={15} className="shrink-0 animate-spin" /> Enviando {pending} registro
          {pending > 1 ? "s" : ""}…
        </>
      )}
    </div>
  );
}
