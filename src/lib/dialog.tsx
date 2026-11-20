import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, X } from "lucide-react";

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
  return (
    <div
      className="fixed inset-0 z-[12000] grid place-items-center bg-slate-950/45 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="nextvita-dialog-title"
    >
      <div className="nv-fade-in w-full max-w-md overflow-hidden border border-border bg-card shadow-2xl">
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid size-9 shrink-0 place-items-center ${request.danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
            >
              {request.danger ? <AlertTriangle size={18} /> : <CheckCircle2 size={18} />}
            </span>
            <div>
              <h2 id="nextvita-dialog-title" className="text-lg font-bold">
                {request.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
                {request.message}
              </p>
            </div>
            <button
              onClick={() => close(null)}
              aria-label="Fechar"
              className="-mr-1 -mt-1 ml-auto shrink-0 p-1.5 text-muted-foreground transition hover:bg-muted hover:text-foreground"
            >
              <X size={18} />
            </button>
          </div>
          {request.kind === "prompt" && (
            <input
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={request.placeholder}
              className="field mt-4"
            />
          )}
          <div className="mt-5 flex justify-end gap-2">
            <button
              onClick={() => close(null)}
              className="border border-border px-4 py-2.5 text-sm font-semibold transition hover:bg-muted"
            >
              Cancelar
            </button>
            {/* Botão principal: texto escuro sobre o verde do tema (legível no modo escuro e claro). */}
            <button
              onClick={() => close(request.kind === "confirm" ? true : value)}
              className={`px-4 py-2.5 text-sm font-bold transition hover:brightness-110 active:scale-[.98] ${request.danger ? "bg-destructive text-white" : "bg-primary text-primary-foreground"}`}
            >
              {request.confirmLabel ??
                (request.kind === "prompt"
                  ? "Confirmar"
                  : request.danger
                    ? "Excluir"
                    : "Continuar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
