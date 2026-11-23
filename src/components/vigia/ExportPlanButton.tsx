import { useState } from "react";
import { createPortal } from "react-dom";
import { Check, FileDown, Loader2, X } from "lucide-react";
import {
  availableSections,
  buildPlanHtml,
  exportSections,
  loadPlanData,
  printHtml,
  type ExportSection,
} from "@/lib/care-plan-export";

/**
 * Exporta a programação do cliente em PDF (cronograma, medicamentos, suplementos, água e cardápio),
 * com marca d'água do NextVita e dados do cliente. Usa "Salvar como PDF" do navegador.
 */
export function ExportPlanButton({
  patientId,
  ownerId,
  className = "",
  label = "Exportar PDF",
  labelClassName = "",
}: {
  patientId: string;
  ownerId: string;
  className?: string;
  label?: string;
  /** Classes do texto (ex.: "max-sm:sr-only" para só ícone no celular). */
  labelClassName?: string;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPlanData>> | null>(null);
  const [picked, setPicked] = useState<ExportSection[]>([]);
  const [error, setError] = useState("");

  async function start() {
    setOpen(true);
    setError("");
    setBusy(true);
    try {
      const d = await loadPlanData(patientId, ownerId);
      const av = availableSections(d);
      setData(d);
      setPicked(exportSections.map((s) => s.key).filter((k) => av[k]));
    } catch {
      setError("Não foi possível carregar sua programação.");
    } finally {
      setBusy(false);
    }
  }
  function generate() {
    if (!data || !picked.length) return;
    printHtml(
      buildPlanHtml(
        data,
        exportSections.map((s) => s.key).filter((k) => picked.includes(k)),
        window.location.origin,
      ),
    );
    setOpen(false);
  }
  const av = data ? availableSections(data) : null;

  return (
    <>
      <button
        type="button"
        onClick={() => void start()}
        className={
          className ||
          "inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/25 bg-white/10 px-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/20 active:scale-[.97]"
        }
      >
        <FileDown size={16} /> <span className={labelClassName}>{label}</span>
      </button>
      {open &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[10010] grid place-items-center bg-slate-950/60 p-4 backdrop-blur-sm"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nv-export-title"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget) setOpen(false);
            }}
          >
            <div className="nv-rise w-full max-w-md overflow-hidden rounded-3xl bg-card text-foreground shadow-2xl">
              <div className="relative bg-gradient-to-br from-[#062019] to-[#0c8063] p-5 text-white">
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  aria-label="Fechar"
                  className="absolute right-3 top-3 grid size-8 place-items-center rounded-lg bg-white/15 hover:bg-white/25"
                >
                  <X size={16} />
                </button>
                <FileDown size={26} />
                <h3 id="nv-export-title" className="mt-2 text-lg font-extrabold">
                  Exportar minha programação
                </h3>
                <p className="text-sm text-white/80">
                  PDF com seus dados, horários e marca d'água do NextVita.
                </p>
              </div>
              <div className="p-5">
                {busy ? (
                  <p className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 size={16} className="animate-spin" /> Reunindo sua programação…
                  </p>
                ) : error ? (
                  <p role="alert" className="text-sm text-destructive">
                    {error}
                  </p>
                ) : (
                  <>
                    <p className="text-sm font-semibold">O que incluir</p>
                    <ul className="mt-2 grid gap-1.5">
                      {exportSections.map((s) => {
                        const has = av?.[s.key],
                          on = picked.includes(s.key);
                        return (
                          <li key={s.key}>
                            <button
                              type="button"
                              disabled={!has}
                              aria-pressed={on}
                              onClick={() =>
                                setPicked((p) =>
                                  on ? p.filter((x) => x !== s.key) : [...p, s.key],
                                )
                              }
                              className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left text-sm transition ${on ? "border-primary bg-primary/[.07]" : "border-border hover:bg-muted/50"} disabled:cursor-not-allowed disabled:opacity-45`}
                            >
                              <span
                                className={`grid size-5 place-items-center rounded-md border ${on ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}
                              >
                                {on && <Check size={13} strokeWidth={3} />}
                              </span>
                              <span className="flex-1 font-semibold">{s.label}</span>
                              {!has && (
                                <span className="text-[11px] text-muted-foreground">
                                  sem programação
                                </span>
                              )}
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                    <p className="mt-3 text-xs text-muted-foreground">
                      Na janela que abrir, escolha <strong>Salvar como PDF</strong> como destino.
                    </p>
                    <button
                      type="button"
                      onClick={generate}
                      disabled={!picked.length}
                      className="mt-4 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-primary text-sm font-bold text-primary-foreground transition hover:brightness-110 active:scale-[.98] disabled:opacity-50"
                    >
                      <FileDown size={16} /> Gerar PDF
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
