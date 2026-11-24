import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";
import { ConfirmCard, confirmArea } from "@/components/vigia/ConfirmCard";

type DialogRequest = {
  kind: "confirm" | "prompt";
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  placeholder?: string;
  initial?: string;
  secret?: boolean;
  resolve: (value: boolean | string | null) => void;
};
const DialogContext = createContext<{
  confirm: (
    title: string,
    message: string,
    danger?: boolean,
    confirmLabel?: string,
  ) => Promise<boolean>;
  prompt: (
    title: string,
    message: string,
    placeholder?: string,
    initial?: string,
    secret?: boolean,
  ) => Promise<string | null>;
  /** Aviso rápido de confirmação (registro salvo, alterado, excluído…). */
  notify: (message: string, tone?: NoticeTone) => void;
} | null>(null);
type NoticeTone = "success" | "danger" | "info";
type Notice = { id: number; message: string; tone: NoticeTone };
export function useDialog() {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialog must be used inside DialogProvider");
  return value;
}
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
  const [notices, setNotices] = useState<Notice[]>([]);
  const notify = (message: string, tone: NoticeTone = "success") => {
    const id = Date.now() + Math.random();
    setNotices((list) => [...list.slice(-2), { id, message, tone }]);
  };
  const confirm = (title: string, message: string, danger = false, confirmLabel?: string) =>
    new Promise<boolean>((resolve) =>
      setRequest({
        kind: "confirm",
        title,
        message,
        danger,
        confirmLabel,
        resolve: (value) => resolve(Boolean(value)),
      }),
    );
  const prompt = (title: string, message: string, placeholder = "", initial = "", secret = false) =>
    new Promise<string | null>((resolve) =>
      setRequest({
        kind: "prompt",
        title,
        message,
        placeholder,
        initial,
        secret,
        resolve: (value) => resolve(typeof value === "string" ? value : null),
      }),
    );
  const close = (value: boolean | string | null) => {
    request?.resolve(value);
    setRequest(null);
  };
  return (
    <DialogContext.Provider value={{ confirm, prompt, notify }}>
      {children}
      <NoticeStack
        notices={notices}
        dismiss={(id) => setNotices((list) => list.filter((n) => n.id !== id))}
      />
      {request && <DialogOverlay request={request} close={close} />}
    </DialogContext.Provider>
  );
}
function NoticeStack({ notices, dismiss }: { notices: Notice[]; dismiss: (id: number) => void }) {
  return (
    <div
      className="pointer-events-none fixed bottom-4 right-4 z-[12500] flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {notices.map((n) => (
        <NoticeItem key={n.id} notice={n} dismiss={dismiss} />
      ))}
    </div>
  );
}
function NoticeItem({ notice, dismiss }: { notice: Notice; dismiss: (id: number) => void }) {
  useEffect(() => {
    const t = window.setTimeout(() => dismiss(notice.id), 4200);
    return () => window.clearTimeout(t);
  }, [notice.id, dismiss]);
  const tone =
    notice.tone === "danger"
      ? "border-l-destructive text-destructive"
      : notice.tone === "info"
        ? "border-l-sky-500 text-sky-500"
        : "border-l-emerald-500 text-emerald-500";
  return (
    <div
      className={`nv-pop pointer-events-auto flex items-center gap-2.5 border border-border border-l-4 bg-card px-3 py-2.5 text-sm font-semibold text-foreground shadow-xl ${tone.split(" ")[0]}`}
    >
      {notice.tone === "danger" ? (
        <AlertTriangle size={16} className="shrink-0 text-destructive" />
      ) : (
        <CheckCircle2 size={16} className={`shrink-0 ${tone.split(" ")[1]}`} />
      )}
      <span className="min-w-0 flex-1">{notice.message}</span>
      <button
        type="button"
        onClick={() => dismiss(notice.id)}
        aria-label="Fechar aviso"
        className="shrink-0 text-muted-foreground hover:text-foreground"
      >
        <X size={14} />
      </button>
    </div>
  );
}
function DialogOverlay({
  request,
  close,
}: {
  request: DialogRequest;
  close: (value: boolean | string | null) => void;
}) {
  const [value, setValue] = useState(request.initial ?? "");
  const label = request.confirmLabel ?? "";
  const postpone = /adiar/i.test(label) || /adiar/i.test(request.title);
  const tone = request.danger ? "#f43f5e" : postpone ? "#fbbf24" : "var(--color-primary)";
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(null);
      else if (e.key === "Enter" && request.kind === "confirm") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, request.kind]);
  if (request.kind === "confirm") {
    const area = confirmArea(`${request.title} ${request.message}`);
    return (
      <div
        className="fixed inset-0 z-[12000] grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,.55),rgba(2,6,23,.82))] p-4 backdrop-blur-md"
        role="dialog"
        aria-modal="true"
        aria-labelledby="nextvita-dialog-title"
        style={{ maxWidth: "100vw" }}
      >
        <ConfirmCard
          titleId="nextvita-dialog-title"
          title={request.title}
          lines={[request.message]}
          area={area}
          danger={request.danger}
          onClose={() => close(null)}
          footer={
            <div className="grid grid-cols-[auto_1fr] gap-2">
              <button
                type="button"
                onClick={() => close(null)}
                style={{ cursor: "pointer" }}
                className="h-11 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold transition hover:bg-white/20 active:scale-95"
              >
                Cancelar
              </button>
              <button
                type="button"
                autoFocus
                onClick={() => close(true)}
                style={{ cursor: "pointer", background: request.danger ? "#f43f5e" : area.accent }}
                className={`h-11 rounded-xl text-sm font-extrabold shadow-lg transition hover:brightness-110 active:scale-95 ${request.danger ? "text-white" : "text-slate-950"}`}
              >
                {request.confirmLabel ?? (request.danger ? "Excluir" : "Continuar")}
              </button>
            </div>
          }
        />
      </div>
    );
  }
  return (
    <div
      className="fixed inset-0 z-[12000] grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,.55),rgba(2,6,23,.8))] p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nextvita-dialog-title"
      onMouseDown={(e) => e.target === e.currentTarget && close(null)}
    >
      <div className="nv-pop relative w-full max-w-[28rem] overflow-hidden border border-white/10 bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)]">
        <DialogHero
          kind={
            postpone
              ? "clock"
              : request.danger
                ? "alert"
                : request.kind === "prompt"
                  ? "edit"
                  : "shield"
          }
          tone={tone}
        />
        <button
          onClick={() => close(null)}
          aria-label="Fechar"
          className="absolute right-2 top-2 z-10 p-1.5 text-white/70 transition hover:bg-white/10 hover:text-white"
        >
          <X size={16} />
        </button>
        <div className="relative px-6 pb-5 pt-5 text-center">
          <h2
            id="nextvita-dialog-title"
            className="font-display text-xl font-extrabold leading-tight tracking-tight"
          >
            {request.title}
          </h2>
          <p className="mx-auto mt-2 max-w-[22rem] text-[13px] leading-relaxed text-muted-foreground">
            {request.message}
          </p>
          {request.kind === "prompt" && (
            <input
              autoFocus
              onFocus={(e) => e.currentTarget.select()}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && close(value)}
              placeholder={request.placeholder}
              type={request.secret ? "password" : "text"}
              inputMode={request.secret ? "numeric" : undefined}
              autoComplete="off"
              className="field mt-4 text-left"
            />
          )}
        </div>
        <div className="relative flex items-center gap-2 border-t border-border bg-muted/30 px-5 py-3">
          <span className="mr-auto hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex">
            <kbd className="border border-border px-1.5 py-0.5 font-sans">Esc</kbd> fecha
            <kbd className="border border-border px-1.5 py-0.5 font-sans">Enter</kbd> confirma
          </span>
          <button
            onClick={() => close(null)}
            className="h-9 px-4 text-[13px] font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground"
          >
            Cancelar
          </button>
          <button
            onClick={() => close(request.kind === "confirm" ? true : value)}
            className={`h-9 px-5 text-[13px] font-bold transition hover:brightness-110 active:scale-[.97] ${request.danger ? "bg-destructive text-white" : "bg-primary text-primary-foreground"}`}
          >
            {request.confirmLabel ??
              (request.kind === "prompt" ? "Confirmar" : request.danger ? "Excluir" : "Continuar")}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Faixa de destaque animada (hero) da janela de confirmação. */
function DialogHero({ kind, tone }: { kind: "clock" | "alert" | "edit" | "shield"; tone: string }) {
  return (
    <div
      className="nv-dark relative h-36 overflow-hidden bg-[#070e17]"
      style={{ color: tone }}
      aria-hidden
    >
      <i
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,.07) 1px,transparent 1px),linear-gradient(90deg,rgba(255,255,255,.07) 1px,transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at center, black 30%, transparent 75%)",
        }}
      />
      <i
        className="absolute left-1/2 top-1/2 size-56 -translate-x-1/2 -translate-y-1/2 opacity-30 blur-3xl"
        style={{ background: "currentColor" }}
      />
      <svg viewBox="0 0 320 144" className="relative size-full">
        <g transform="translate(160 72)">
          <circle
            r="54"
            fill="none"
            stroke="currentColor"
            strokeOpacity=".18"
            strokeDasharray="2 6"
            className="nv-hero-spin"
          />
          <circle r="42" fill="none" stroke="currentColor" strokeOpacity=".3" />
          <circle
            r="42"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeDasharray="264"
            strokeDashoffset="264"
            className="nv-dialog-ring"
            transform="rotate(-90)"
          />
          <circle r="42" fill="none" stroke="currentColor" className="nv-hero-pulse" />
          <circle r="30" fill="currentColor" fillOpacity=".12" />
          {kind === "clock" && (
            <g stroke="currentColor" strokeLinecap="round" fill="none" strokeWidth="2.6">
              <path d="M0 -17v-3M17 0h3M0 17v3M-17 0h-3" strokeWidth="2" strokeOpacity=".7" />
              <path d="M0 0V-12" className="nv-hero-hand-slow" />
              <path d="M0 0V-17" className="nv-hero-hand" />
              <circle r="2.4" fill="currentColor" stroke="none" />
            </g>
          )}
          {kind === "alert" && (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="nv-hero-shake"
            >
              <path d="M0 -18 18 13H-18Z" />
              <path d="M0 -6v9M0 8.5v.5" />
            </g>
          )}
          {kind === "edit" && (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="nv-hero-float"
            >
              <path d="M-14 14 -11 5 8 -14l6 6L-5 11Z" />
              <path d="M-14 14h28" strokeOpacity=".55" strokeDasharray="3 4" />
            </g>
          )}
          {kind === "shield" && (
            <g
              fill="none"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="nv-hero-float"
            >
              <path d="M0 -19 15 -13V1C15 10 8 16 0 19-8 16-15 10-15 1V-13Z" />
              <path
                d="M-5 0 -1 4 6 -4"
                strokeDasharray="22"
                strokeDashoffset="22"
                className="nv-hero-check"
              />
            </g>
          )}
        </g>
        {[
          [52, 34, 0],
          [270, 40, 0.8],
          [86, 112, 1.6],
          [246, 108, 0.4],
        ].map(([x, y, d]) => (
          <rect
            key={`${x}-${y}`}
            x={x}
            y={y}
            width="4"
            height="4"
            fill="currentColor"
            className="nv-hero-dot"
            style={{ animationDelay: `${d}s` }}
          />
        ))}
      </svg>
      <i
        className="absolute inset-x-0 bottom-0 h-px"
        style={{ background: "linear-gradient(90deg,transparent,currentColor,transparent)" }}
      />
    </div>
  );
}
