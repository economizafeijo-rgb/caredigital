import { useEffect, useState } from "react";
import { Download, Share, Smartphone, X } from "lucide-react";

type InstallEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: "accepted" | "dismissed" }> };

/** Registra o service worker e oferece a instalação do app (Android/desktop: botão; iPhone: instruções). */
export function useInstallApp() {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [ios, setIos] = useState(false);
  useEffect(() => {
    if ("serviceWorker" in navigator && import.meta.env.PROD) void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    const standalone = window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
    setInstalled(standalone);
    setIos(/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone);
    const onPrompt = (e: Event) => { e.preventDefault(); setEvent(e as InstallEvent); };
    const onInstalled = () => { setInstalled(true); setEvent(null); };
    window.addEventListener("beforeinstallprompt", onPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => { window.removeEventListener("beforeinstallprompt", onPrompt); window.removeEventListener("appinstalled", onInstalled); };
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
  return <>
    <button type="button" onClick={() => canInstall ? void install() : setHelp(true)} title="Instalar o aplicativo CareDigital"
      className={`inline-flex h-9 items-center gap-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-500 px-3 text-sm font-bold text-white shadow-sm transition hover:brightness-110 ${className}`}>
      <Download size={16}/><span className="hidden sm:inline">Instalar app</span>
    </button>
    {help && <div className="fixed inset-0 z-[120] grid place-items-end bg-slate-950/60 p-4 backdrop-blur-sm sm:place-items-center" role="dialog" aria-modal="true" aria-label="Instalar no iPhone">
      <div className="w-full max-w-sm rounded-3xl bg-card p-5 text-foreground shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="flex items-center gap-2 text-lg font-bold"><Smartphone size={20} className="text-emerald-500"/> Instalar no iPhone</h3>
          <button type="button" onClick={() => setHelp(false)} aria-label="Fechar" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X size={18}/></button></div>
        <ol className="mt-3 grid gap-2 text-sm">
          <li className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><strong>1.</strong> Abra este site no <strong>Safari</strong>.</li>
          <li className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><strong>2.</strong> Toque em <Share size={16}/> <strong>Compartilhar</strong>.</li>
          <li className="flex items-center gap-2 rounded-xl bg-muted/60 p-3"><strong>3.</strong> Escolha <strong>Adicionar à Tela de Início</strong>.</li>
        </ol>
      </div>
    </div>}
  </>;
}
