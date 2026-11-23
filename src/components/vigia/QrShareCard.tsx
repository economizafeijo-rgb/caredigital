import { useEffect, useState } from "react";
import { Check, Copy, Download, Info, Share2, Smartphone } from "lucide-react";
import { QR_URLS, type QrVariant } from "@/lib/qr-data";
import { useInstallApp } from "./InstallApp";
import { QrCode } from "./QrCode";

/** Cartão com QR Code para abrir, instalar e compartilhar o NextVita (Android, iPhone e computador). */
export function QrShareCard({
  variant,
  dark = false,
  className = "",
}: {
  variant: QrVariant;
  dark?: boolean;
  className?: string;
}) {
  const { canInstall, ios, install } = useInstallApp();
  const [copied, setCopied] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [android, setAndroid] = useState(false);
  const url = QR_URLS[variant];
  const compact = variant === "footer";

  useEffect(() => {
    setCanShare(typeof navigator !== "undefined" && typeof navigator.share === "function");
    setAndroid(/android/i.test(navigator.userAgent));
  }, []);
  useEffect(() => {
    if (!copied) return;
    const t = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(t);
  }, [copied]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url.split("?")[0]);
      setCopied(true);
    } catch {
      window.prompt("Copie o link do NextVita:", url.split("?")[0]);
    }
  }

  async function share() {
    try {
      await navigator.share({
        title: "NextVita",
        text: "Conheça o NextVita: saúde, rotina e loja em um só app. Grátis para teste.",
        url: url.split("?")[0],
      });
    } catch {
      /* cancelado */
    }
  }

  const tone = dark
    ? "border-white/15 bg-white/[.07] text-white ring-1 ring-white/10"
    : "border-border bg-card text-card-foreground shadow-card";
  const muted = dark ? "text-white/70" : "text-muted-foreground";
  const btn = dark
    ? "bg-white/10 ring-1 ring-white/20 hover:bg-white/20 text-white"
    : "border border-border bg-surface hover:bg-muted text-foreground";

  return (
    <aside
      aria-label="QR Code do NextVita"
      className={
        "flex items-center gap-3 rounded-2xl border p-3 sm:p-3.5 " +
        (compact ? "sm:gap-3 " : "sm:gap-4 ") +
        tone +
        " " +
        className
      }
    >
      <div className="shrink-0 rounded-xl bg-white p-1 shadow-md ring-1 ring-black/5">
        <QrCode variant={variant} size={compact ? 92 : dark ? 168 : 132} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-[.13em] text-emerald-700 dark:text-emerald-400">
          <Smartphone size={12} /> Leve o NextVita com você
        </p>
        <h3
          className={
            (compact ? "mt-0.5 text-base sm:text-lg " : "mt-1 text-xl ") +
            "font-display font-extrabold leading-tight"
          }
        >
          Abra o app no celular em segundos
        </h3>
        <p className={"mt-0.5 text-xs " + muted}>
          <span className="hidden sm:inline">
            Aponte a câmera do celular para o código e acesse{" "}
          </span>
          <span className="sm:hidden">Escaneie o código ou use os botões para acessar </span>
          <strong className={dark ? "text-white" : "text-foreground"}>nextvita.life</strong>.
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {canInstall && (
            <button
              type="button"
              onClick={() => void install()}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-gradient-to-r from-emerald-700 to-teal-700 px-3 text-xs font-bold text-white shadow-sm transition hover:brightness-110 active:scale-95"
            >
              <Download size={14} /> Instalar app
            </button>
          )}
          {canShare && (
            <button
              type="button"
              onClick={() => void share()}
              className={
                "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95 " +
                btn
              }
            >
              <Share2 size={14} /> Compartilhar
            </button>
          )}
          <button
            type="button"
            onClick={() => void copy()}
            className={
              "inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-95 " +
              btn
            }
          >
            {copied ? (
              <>
                <Check size={14} className="text-emerald-700 dark:text-emerald-400" /> Link copiado
              </>
            ) : (
              <>
                <Copy size={14} /> Copiar link
              </>
            )}
          </button>
        </div>
        {(ios || (android && !canInstall)) && (
          <p className={"mt-1.5 flex items-start gap-1.5 text-[11px] " + muted}>
            <Info size={13} className="mt-0.5 shrink-0" />
            {ios
              ? "No iPhone: Compartilhar → Adicionar à Tela de Início."
              : "No Android: menu do Chrome (⋮) → Instalar app ou Adicionar à tela inicial."}
          </p>
        )}
      </div>
    </aside>
  );
}
