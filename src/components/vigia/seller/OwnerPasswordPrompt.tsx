import { useCallback, useRef, useState, type FormEvent, type ReactNode } from "react";
import { KeyRound, Loader2, X } from "lucide-react";

type Ask = {
  title: string;
  description: string;
  confirmLabel: string;
  danger?: boolean;
  /** Executa a ação com a senha; deve lançar Error com mensagem clara se falhar. */
  action: (password: string) => Promise<void>;
};

/**
 * Pede a senha de exclusão do dono (6 números) antes de uma ação protegida.
 * O erro aparece na própria janela, e ela só fecha quando a ação dá certo ou o dono cancela.
 */
export function useOwnerPasswordPrompt(): {
  ask: (a: Ask) => Promise<boolean>;
  element: ReactNode;
} {
  const [open, setOpen] = useState<Ask | null>(null);
  const [pw, setPw] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);
  const resolver = useRef<((ok: boolean) => void) | null>(null);

  const ask = useCallback((a: Ask) => {
    setPw("");
    setErr("");
    setOpen(a);
    return new Promise<boolean>((resolve) => {
      resolver.current = resolve;
    });
  }, []);

  const close = (ok: boolean) => {
    setOpen(null);
    resolver.current?.(ok);
    resolver.current = null;
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!open) return;
    if (!/^\d{6}$/.test(pw)) return setErr("Digite a senha de 6 números.");
    setBusy(true);
    setErr("");
    try {
      await open.action(pw);
      close(true);
    } catch (x) {
      setErr(x instanceof Error ? x.message : "Não foi possível concluir.");
      setPw("");
    } finally {
      setBusy(false);
    }
  }

  const element = open ? (
    <div
      className="fixed inset-0 z-[200] grid place-items-center bg-slate-950/70 p-4 backdrop-blur-sm"
      onKeyDown={(e) => {
        if (e.key === "Escape" && !busy) close(false);
      }}
    >
      <form
        role="dialog"
        aria-modal="true"
        aria-labelledby="owner-pass-title"
        onSubmit={submit}
        className="relative w-full max-w-sm rounded-3xl bg-card p-6 shadow-2xl ring-1 ring-white/10"
      >
        <button
          type="button"
          onClick={() => close(false)}
          disabled={busy}
          aria-label="Cancelar"
          className="absolute right-3 top-3 grid size-8 place-items-center rounded-full text-muted-foreground hover:bg-muted"
        >
          <X size={16} />
        </button>
        <span
          className={`grid size-11 place-items-center rounded-2xl ${open.danger ? "bg-rose-500/15 text-rose-600 dark:text-rose-300" : "bg-primary/15 text-primary"}`}
        >
          <KeyRound size={20} />
        </span>
        <h2 id="owner-pass-title" className="mt-3 text-lg font-extrabold leading-snug">
          {open.title}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">{open.description}</p>
        <label className="mt-4 block text-[13px] font-semibold">
          Senha de exclusão do dono
          <input
            autoFocus
            type="password"
            inputMode="numeric"
            autoComplete="off"
            maxLength={6}
            value={pw}
            onChange={(e) => setPw(e.target.value.replace(/\D/g, "").slice(0, 6))}
            className="mt-1 h-12 w-full rounded-xl border border-border bg-surface px-4 text-center font-mono text-xl tracking-[0.5em]"
            aria-invalid={!!err}
            aria-describedby={err ? "owner-pass-err" : undefined}
          />
        </label>
        {err && (
          <p
            id="owner-pass-err"
            role="alert"
            className="mt-2 text-xs font-semibold text-rose-600 dark:text-rose-300"
          >
            {err}
          </p>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => close(false)}
            disabled={busy}
            className="h-11 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={busy || pw.length !== 6}
            className={`inline-flex h-11 items-center justify-center gap-2 rounded-xl text-sm font-bold disabled:opacity-45 ${open.danger ? "bg-rose-600 text-white hover:bg-rose-700" : "bg-primary text-primary-foreground hover:brightness-110"}`}
          >
            {busy && <Loader2 size={15} className="animate-spin" />}
            {open.confirmLabel}
          </button>
        </div>
      </form>
    </div>
  ) : null;

  return { ask, element };
}
