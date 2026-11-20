import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Clock3, PencilLine, ShieldQuestion, X } from "lucide-react";

type DialogRequest = {
  kind: "confirm" | "prompt";
  title: string;
  message: string;
  danger?: boolean;
  confirmLabel?: string;
  placeholder?: string;
  resolve: (value: boolean | string | null) => void;
};
const DialogContext = createContext<{
  confirm: (
    title: string,
    message: string,
    danger?: boolean,
    confirmLabel?: string,
  ) => Promise<boolean>;
  prompt: (title: string, message: string, placeholder?: string) => Promise<string | null>;
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
  const prompt = (title: string, message: string, placeholder = "") =>
    new Promise<string | null>((resolve) =>
      setRequest({
        kind: "prompt",
        title,
        message,
        placeholder,
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
  const [value, setValue] = useState("");
  const label = request.confirmLabel ?? "";
  const postpone = /adiar/i.test(label) || /adiar/i.test(request.title);
  const tone = request.danger ? "#f43f5e" : postpone ? "#fbbf24" : "var(--color-primary)";
  const Icon = request.danger
    ? AlertTriangle
    : postpone
      ? Clock3
      : request.kind === "prompt"
        ? PencilLine
        : ShieldQuestion;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") close(null);
      else if (e.key === "Enter" && request.kind === "confirm") close(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [close, request.kind]);
  return (
    <div
      className="fixed inset-0 z-[12000] grid place-items-center bg-[radial-gradient(ellipse_at_center,rgba(2,6,23,.55),rgba(2,6,23,.8))] p-4 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nextvita-dialog-title"
      onMouseDown={(e) => e.target === e.currentTarget && close(null)}
    >
      <div className="nv-pop relative w-full max-w-[26rem] overflow-hidden border border-white/10 bg-card shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)]">
        <i
          aria-hidden
          className="absolute inset-x-0 top-0 h-[2px]"
          style={{ background: `linear-gradient(90deg, ${tone}, transparent 80%)` }}
        />
        <i
          aria-hidden
          className="pointer-events-none absolute -right-16 -top-16 size-44 opacity-25 blur-3xl"
          style={{ background: tone }}
        />
        <div className="relative p-5 pb-4">
          <div className="flex items-start gap-3.5">
            <span
              className="relative grid size-11 shrink-0 place-items-center"
              style={{ color: tone }}
            >
              <svg viewBox="0 0 44 44" className="absolute inset-0 size-full">
                <circle cx="22" cy="22" r="20" fill="currentColor" fillOpacity=".1" />
                <circle
                  cx="22"
                  cy="22"
                  r="20"
                  fill="none"
                  stroke="currentColor"
                  strokeOpacity=".55"
                  strokeWidth="1.2"
                  strokeDasharray="126"
                  strokeDashoffset="126"
                  className="nv-dialog-ring"
                />
              </svg>
              <Icon size={19} className="relative" />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <h2
                id="nextvita-dialog-title"
                className="font-display text-[17px] font-extrabold leading-tight tracking-tight"
              >
                {request.title}
              </h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-muted-foreground">
                {request.message}
              </p>
            </div>
            <button
              onClick={() => close(null)}
              aria-label="Fechar"
              className="-mr-1.5 -mt-1.5 shrink-0 p-1.5 text-muted-foreground/70 transition hover:bg-muted hover:text-foreground"
            >
              <X size={16} />
            </button>
          </div>
          {request.kind === "prompt" && (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && close(value)}
              placeholder={request.placeholder}
              className="field mt-4"
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
