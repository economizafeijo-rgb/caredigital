import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

let savedPrompt: InstallEvent | null = null;
let swStarted = false;
/** Registra o service worker uma única vez (produção) e guarda o convite de instalação mesmo que o botão monte depois. */
export function startPwa() {
  if (typeof window === "undefined" || swStarted) return;
  swStarted = true;
  if ("serviceWorker" in navigator && import.meta.env.PROD) {
    const register = () =>
      navigator.serviceWorker
        .register("/sw.js", { scope: "/" })
        .then((reg) => {
          reg.addEventListener("updatefound", () => {
            const worker = reg.installing;
            worker?.addEventListener("statechange", () => {
              if (worker.state === "installed" && navigator.serviceWorker.controller)
                worker.postMessage("skipWaiting");
            });
          });
        })
        .catch(() => undefined);
    if (document.readyState === "complete") void register();
    else window.addEventListener("load", () => void register(), { once: true });
  }
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    savedPrompt = e as InstallEvent;
    window.dispatchEvent(new Event("nv-install-ready"));
  });
  window.addEventListener("appinstalled", () => {
    savedPrompt = null;
  });
}
if (typeof window !== "undefined") startPwa();

/** Registra o service worker e oferece a instalação do app (Android/desktop: botão; iPhone: instruções). */
export function useInstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    startPwa();
    setEvent(savedPrompt);
    const standalone =
      window.matchMedia("(display-mode: standalone)").matches ||
      (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = () => setEvent(savedPrompt);
    const onInstalled = () => {
      setInstalled(true);
      setEvent(null);
    };
    window.addEventListener("nv-install-ready", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("nv-install-ready", onPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);
  async function install() {
    if (!event) return false;
    await event.prompt();
    const choice = await event.userChoice;
    if (choice.outcome === "accepted") setEvent(null);
    return choice.outcome === "accepted";
  }
  return { canInstall: Boolean(event) && !installed, ios, installed, install };
}

export function InstallAppButton({ className = "" }: { className?: string }) {
  const { canInstall, ios, install } = useInstallApp();
  const [help, setHelp] = useState(false);
  if (!canInstall && !ios) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => (canInstall ? void install() : setHelp(true))}
        title="Instalar o aplicativo NextVita"
        className={`inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 ${className}`}
      >
        <Download size={16} />
        <span className="hidden 2xl:inline">Instalar app</span>
      </button>
      {help && (
        <div
          className="fixed inset-0 z-[120] grid place-items-end bg-slate-950/60 p-4 backdrop-blur-sm sm:place-items-center"
          role="dialog"
          aria-modal="true"
          aria-label="Instalar no iPhone"
        >
          <div className="w-full max-w-sm rounded-3xl bg-card p-5 text-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-lg font-bold">
                <Smartphone size={20} className="text-emerald-500" /> Instalar no iPhone
              </h3>
              <button
                type="button"
                onClick={() => setHelp(false)}
                aria-label="Fechar"
                className="grid size-9 place-items-center rounded-lg hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>
            <ol className="mt-3 grid gap-2 text-sm">
              <li className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
                <strong>1.</strong> Abra este site no <strong>Safari</strong>.
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
                <strong>2.</strong> Toque em <Share size={16} /> <strong>Compartilhar</strong>.
              </li>
              <li className="flex items-center gap-2 rounded-xl bg-muted/60 p-3">
                <strong>3.</strong> Escolha <strong>Adicionar à Tela de Início</strong>.
              </li>
            </ol>
          </div>
        </div>
      )}
    </>
  );
}
