import { createContext, useContext, useState, type ReactNode } from "react";
import { AlertTriangle, CheckCircle2, Image as ImageIcon, X } from "lucide-react";

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
  confirm: (title: string, message: string, danger?: boolean, confirmLabel?: string) => Promise<boolean>;
  prompt: (title: string, message: string, placeholder?: string) => Promise<string | null>;
} | null>(null);
export function useDialog() {
  const value = useContext(DialogContext);
  if (!value) throw new Error("useDialog must be used inside DialogProvider");
  return value;
}
export function DialogProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<DialogRequest | null>(null);
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
    <DialogContext.Provider value={{ confirm, prompt }}>
      {children}
      {request && <DialogOverlay request={request} close={close} />}
    </DialogContext.Provider>
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
      <div className="w-full max-w-md overflow-hidden rounded-3xl border border-border bg-card shadow-2xl">
        <div className="h-24 bg-gradient-to-br from-[#0b302d] via-[#0e5f54] to-primary p-5 text-white">
          <div className="flex items-start justify-between">
            <span className="grid size-11 place-items-center rounded-2xl bg-white/15">
              <ImageIcon size={22} />
            </span>
            <button
              onClick={() => close(null)}
              aria-label="Fechar"
              className="rounded-lg p-1 text-white/80 hover:bg-white/10"
            >
              <X size={18} />
            </button>
          </div>
        </div>
        <div className="p-5">
          <div className="flex items-start gap-3">
            <span
              className={`mt-0.5 grid size-9 shrink-0 place-items-center rounded-xl ${request.danger ? "bg-destructive/10 text-destructive" : "bg-primary/10 text-primary"}`}
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
              className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold"
            >
              Cancelar
            </button>
            <button
              onClick={() => close(request.kind === "confirm" ? true : value)}
              className={`rounded-xl px-4 py-2.5 text-sm font-bold text-white ${request.danger ? "bg-destructive" : "bg-primary"}`}
            >
              {request.confirmLabel ?? (request.kind === "prompt" ? "Confirmar" : request.danger ? "Excluir" : "Continuar")}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
