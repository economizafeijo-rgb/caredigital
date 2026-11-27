import { useEffect } from "react";
import { ArrowLeft, Info } from "lucide-react";

export type DetailItem = { id: string; name: string; sub: string; v: number };
export type DetailInfo = {
  label: string;
  unit: string;
  color: string;
  total: number;
  target: number;
  /** Com limite, passar do valor é ruim; sem limite, é uma meta a atingir. */
  limit?: boolean;
  items: DetailItem[];
  about: string;
};

const nf = (n: number, d = 1) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Tela de detalhe: o que cada alimento ou bebida registrada hoje contribuiu para o nutriente. */
export function NutrientDetailSheet({ info, onClose }: { info: DetailInfo; onClose: () => void }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const ratio = info.target > 0 ? info.total / info.target : 0;
  const over = info.limit && ratio > 1;
  const items = info.items.filter((i) => i.v > 0).sort((a, b) => b.v - a.v);
  const sum = items.reduce((a, i) => a + i.v, 0);
  const top = items[0]?.v ?? 1;
  const digits = info.unit === "g" ? 1 : 0;
  const left = info.target - info.total;
  return (
    <div
      className="fixed inset-0 z-[12000] flex flex-col bg-background"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${info.label}`}
    >
      <header className="flex items-center gap-3 border-b border-border px-3 pb-3 pt-[calc(0.75rem+env(safe-area-inset-top))]">
        <button
          type="button"
          onClick={onClose}
          aria-label="Voltar"
          className="grid size-11 place-items-center rounded-xl border border-border"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground">Hoje</p>
          <h2 className="truncate text-lg font-black leading-tight">{info.label}</h2>
        </div>
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
        <div className="mx-auto grid max-w-2xl gap-3">
          <section
            className="rounded-3xl border border-border p-4"
            style={{ background: `linear-gradient(135deg, ${info.color}26, transparent 70%)` }}
          >
            <p
              className="text-4xl font-black tabular-nums"
              style={{ color: over ? "#ef4444" : info.color }}
            >
              {nf(info.total, digits)}
              <span className="ml-1 text-base font-semibold text-muted-foreground">
                {info.unit}
              </span>
            </p>
            <p className="text-sm text-muted-foreground">
              {info.limit ? "limite" : "meta"} de {nf(info.target, 0)} {info.unit} ·{" "}
              {nf(ratio * 100, 0)}%
            </p>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-muted">
              <i
                className="block h-full rounded-full"
                style={{
                  width: `${Math.min(100, ratio * 100)}%`,
                  background: over ? "#ef4444" : info.color,
                }}
              />
            </div>
            <p className="mt-2 text-[13px]">
              {over
                ? `Passou ${nf(-left, digits)} ${info.unit} do limite de hoje.`
                : left > 0
                  ? info.limit
                    ? `Ainda cabem ${nf(left, digits)} ${info.unit} hoje.`
                    : `Faltam ${nf(left, digits)} ${info.unit} para a meta.`
                  : "Meta atingida."}
            </p>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold">De onde veio</h3>
            <p className="text-[11px] text-muted-foreground">
              {items.length
                ? `${items.length} ${items.length === 1 ? "item" : "itens"} registrados hoje, do maior para o menor.`
                : "Nada registrado hoje contribuiu com este item."}
            </p>
            {items.length > 0 && (
              <ul className="mt-3 divide-y divide-border">
                {items.map((i) => (
                  <li key={i.id} className="py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">{i.name}</p>
                        <p className="text-[11px] text-muted-foreground">{i.sub}</p>
                      </div>
                      <p className="shrink-0 text-right text-sm font-black tabular-nums">
                        {nf(i.v, digits)} {info.unit}
                        <span className="block text-[11px] font-semibold text-muted-foreground">
                          {sum > 0 ? nf((i.v / sum) * 100, 0) : 0}% do total
                        </span>
                      </p>
                    </div>
                    <i
                      className="mt-2 block h-1.5 rounded-full"
                      style={{
                        width: `${Math.max(3, (i.v / top) * 100)}%`,
                        background: info.color,
                      }}
                    />
                  </li>
                ))}
              </ul>
            )}
          </section>

          <p className="flex gap-2 px-1 text-[12px] leading-snug text-muted-foreground">
            <Info size={14} className="mt-0.5 shrink-0" />
            {info.about} Valores estimados a partir das quantidades registradas, não substituem o
            rótulo nem orientação profissional.
          </p>
        </div>
      </div>
    </div>
  );
}
