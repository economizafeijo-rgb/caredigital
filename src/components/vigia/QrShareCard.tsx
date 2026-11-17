import { useEffect, useState } from "react";
import { Check, Copy, Download, Info, Share2, Smartphone } from "lucide-react";
import { QR_URLS, type QrVariant } from "@/lib/qr-data";
import { useInstallApp } from "./InstallApp";
import { QrCode } from "./QrCode";

/** Cartão com QR Code para abrir, instalar e compartilhar o NextVita (Android, iPhone e computador). */
export function QrShareCard({ variant, dark = false, className = "" }: { variant: QrVariant; dark?: boolean; className?: string }) {
  const { canInstall, ios, install } = useInstallApp();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [android, setAndroid] = useState(false);
  const url = QR_URLS[variant];
  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setAndroid(/android/i.test(navigator.userAgent));
  }, []);
  useEffect(() => { if (!copied) return; const t = window.setTimeout(() => setCopied(false), 2200); return () => window.clearTimeout(t); }, [copied]);

  async function copy() {
    try { await navigator.clipboard.writeText(url.split("?")[0]); setCopied(true); }
    catch { window.prompt("Copie o link do NextVita:", url.split("?")[0]); }
  }
  async function share() {
    try { await navigator.share({ title: "NextVita", text: "Conheça o NextVita: saúde, rotina e loja em um só app. Grátis para teste.", url: url.split("?")[0] }); } catch { /* cancelado */ }
  }

  const tone = dark
    ? "border-white/15 bg-white/[.07] text-white ring-1 ring-white/10"
    : "border-border bg-card text-card-foreground shadow-card";
  const muted = dark ? "text-white/70" : "text-muted-foreground";
  const btn = dark ? "bg-white/10 ring-1 ring-white/20 hover:bg-white/20 text-white" : "border border-border bg-surface hover:bg-muted text-foreground";

  return (
    <aside aria-label="QR Code do NextVita" className={`flex flex-col items-center gap-4 rounded-3xl border p-4 sm:flex-row sm:p-5 ${tone} ${className}`}>
      <div className="shrink-0 rounded-3xl bg-white p-1.5 shadow-lg ring-1 ring-black/5"><QrCode variant={variant} size={dark ? 168 : 132} /></div>
      <div className="min-w-0 flex-1 text-center sm:text-left">
        <p className="flex items-center justify-center gap-1.5 text-[11px] font-bold uppercase tracking-[.16em] text-emerald-500 sm:justify-start"><Smartphone size={13} /> Leve o NextVita com você</p>
        <h3 className="mt-1 font-display text-xl font-extrabold leading-tight">Abra o app no celular em segundos</h3>
        <p className={`mt-1 text-sm ${muted}`}>
          <span className="hidden sm:inline">Aponte a câmera do celular para o código e acesse </span>
          <span className="sm:hidden">Mostre o código para outra pessoa escanear ou use os botões abaixo para acessar </span>
          <strong className={dark ? "text-white" : "text-foreground"}>nextvita.life</strong>.
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
          {canInstall && <button type="button" onClick={() => void install()} className="inline-flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-4 text-sm font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95"><Download size={16} /> Instalar app</button>}
          {canShare && <button type="button" onClick={() => void share()} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-95 ${btn}`}><Share2 size={16} /> Compartilhar</button>}
          <button type="button" onClick={() => void copy()} className={`inline-flex h-10 items-center gap-2 rounded-xl px-4 text-sm font-bold transition active:scale-95 ${btn}`}>{copied ? <><Check size={16} className="text-emerald-500" /> Link copiado</> : <><Copy size={16} /> Copiar link</>}</button>
        </div>
        {(ios || (android && !canInstall)) && (
          <p className={`mt-2 flex items-start justify-center gap-1.5 text-xs sm:justify-start ${muted}`}><Info size={14} className="mt-0.5 shrink-0" />{ios ? "No iPhone: Compartilhar → Adicionar à Tela de Início." : "No Android: menu do Chrome (⋮) → Instalar app ou Adicionar à tela inicial."}</p>
        )}
      </div>
    </aside>
  );
}
