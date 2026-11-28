import { useEffect, useState } from "react";
import { ArrowLeft, Info } from "lucide-react";
import { CalorieGuide } from "./CalorieGuide";

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
  /** Peso para estimar o gasto em exercícios (só energia). */
  weightKg?: number | null;
};

const nf = (n: number, d = 1) =>
  n.toLocaleString("pt-BR", { maximumFractionDigits: d, minimumFractionDigits: 0 });

/** Painel lateral compacto: o que cada alimento ou bebida registrada hoje contribuiu para o nutriente. */
export function NutrientDetailSheet({ info, onClose }: { info: DetailInfo; onClose: () => void }) {
  const [sort, setSort] = useState<"qtd" | "hora">("qtd");
  const [hover, setHover] = useState<string | null>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);
  const ratio = info.target > 0 ? info.total / info.target : 0;
  const over = info.limit && ratio > 1;
  const byQty = info.items.filter((i) => i.v > 0).sort((a, b) => b.v - a.v);
  const items = sort === "qtd" ? byQty : [...byQty].sort((a, b) => a.sub.localeCompare(b.sub));
  const sum = byQty.reduce((a, i) => a + i.v, 0);
  const digits = info.unit === "g" ? 1 : 0;
  const left = info.target - info.total;
  const tone = over ? "#ef4444" : info.color;
  const shade = (idx: number) =>
    `color-mix(in srgb, ${tone} ${Math.max(28, 100 - idx * 14)}%, transparent)`;
  const R = 30;
  const C = 2 * Math.PI * R;
  return (
    <div
      className="fixed inset-0 z-[12000] flex justify-end bg-black/55 backdrop-blur-[2px]"
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${info.label}`}
      onClick={onClose}
    >
      <div
        className="flex h-full w-full max-w-md flex-col border-l border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center gap-3 border-b border-border px-3 pb-2.5 pt-[calc(0.6rem+env(safe-area-inset-top))]">
          <button
            type="button"
            onClick={onClose}
            aria-label="Voltar"
            className="grid size-9 place-items-center rounded-lg border border-border hover:bg-muted"
          >
            <ArrowLeft size={16} />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-muted-foreground">Hoje</p>
            <h2 className="truncate text-base font-black leading-tight">{info.label}</h2>
          </div>
          <span
            className="rounded-full px-2 py-0.5 text-[11px] font-bold"
            style={{ background: `${tone}22`, color: tone }}
          >
            {over ? "Acima do limite" : left <= 0 ? "Meta atingida" : `${nf(ratio * 100, 0)}%`}
          </span>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto p-3 pb-[calc(1rem+env(safe-area-inset-bottom))]">
          <section
            className="flex items-center gap-3 rounded-2xl border border-border p-3"
            style={{ background: `linear-gradient(135deg, ${tone}1f, transparent 70%)` }}
          >
            <svg
              viewBox="0 0 72 72"
              className="size-[4.5rem] shrink-0 -rotate-90"
              aria-hidden="true"
            >
              <circle
                cx="36"
                cy="36"
                r={R}
                fill="none"
                stroke="currentColor"
                strokeOpacity=".12"
                strokeWidth="7"
              />
              <circle
                cx="36"
                cy="36"
                r={R}
                fill="none"
                stroke={tone}
                strokeWidth="7"
                strokeLinecap="round"
                strokeDasharray={`${Math.min(1, ratio) * C} ${C}`}
                className="transition-[stroke-dasharray] duration-700"
              />
            </svg>
            <div className="min-w-0">
              <p
                className="font-display text-2xl font-black leading-none tabular-nums"
                style={{ color: tone }}
              >
                {nf(info.total, digits)}
                <span className="ml-1 text-xs font-semibold text-muted-foreground">
                  {info.unit}
                </span>
              </p>
              <p className="mt-1 text-[11px] text-muted-foreground">
                {info.limit ? "limite" : "meta"} {nf(info.target, 0)} {info.unit} ·{" "}
                {over
                  ? `passou ${nf(-left, digits)} ${info.unit}`
                  : left > 0
                    ? info.limit
                      ? `cabem ${nf(left, digits)} ${info.unit}`
                      : `faltam ${nf(left, digits)} ${info.unit}`
                    : "concluída"}
              </p>
            </div>
          </section>

          <section className="mt-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-xs font-bold">
                De onde veio{" "}
                <span className="font-normal text-muted-foreground">· {items.length} itens</span>
              </h3>
              {items.length > 1 && (
                <div
                  role="group"
                  aria-label="Ordenar"
                  className="flex rounded-lg bg-muted p-0.5 text-[11px] font-semibold"
                >
                  {(
                    [
                      ["qtd", "Maior"],
                      ["hora", "Horário"],
                    ] as const
                  ).map(([k, l]) => (
                    <button
                      key={k}
                      type="button"
                      aria-pressed={sort === k}
                      onClick={() => setSort(k)}
                      className={`h-7 rounded-md px-2.5 ${sort === k ? "bg-card shadow-sm" : "text-muted-foreground"}`}
                    >
                      {l}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {byQty.length > 0 ? (
              <>
                <div
                  className="mt-2 flex h-3 overflow-hidden rounded-full bg-muted"
                  aria-hidden="true"
                >
                  {byQty.map((i, idx) => (
                    <i
                      key={i.id}
                      title={`${i.name}: ${nf(i.v, digits)} ${info.unit}`}
                      onMouseEnter={() => setHover(i.id)}
                      onMouseLeave={() => setHover(null)}
                      className="block h-full border-r border-background/60 transition-opacity last:border-r-0"
                      style={{
                        width: `${(i.v / sum) * 100}%`,
                        background: shade(idx),
                        opacity: hover && hover !== i.id ? 0.35 : 1,
                      }}
                    />
                  ))}
                </div>
                <ul className="mt-2 grid gap-px overflow-hidden rounded-xl border border-border bg-border">
                  {items.map((i) => {
                    const idx = byQty.indexOf(i);
                    const pct = (i.v / sum) * 100;
                    return (
                      <li
                        key={i.id}
                        onMouseEnter={() => setHover(i.id)}
                        onMouseLeave={() => setHover(null)}
                        className={`grid grid-cols-[0.6rem_minmax(0,1fr)_auto] items-center gap-2 bg-card px-2.5 py-2 transition-colors ${hover === i.id ? "bg-muted" : ""}`}
                      >
                        <i className="size-2.5 rounded-full" style={{ background: shade(idx) }} />
                        <div className="min-w-0">
                          <p className="truncate text-[13px] font-semibold leading-tight">
                            {i.name}
                          </p>
                          <p className="truncate text-[10px] text-muted-foreground">{i.sub}</p>
                        </div>
                        <p className="text-right text-[13px] font-black leading-tight tabular-nums">
                          {nf(i.v, digits)}
                          <span className="ml-0.5 text-[10px] font-semibold text-muted-foreground">
                            {info.unit}
                          </span>
                          <span className="block text-[10px] font-semibold text-muted-foreground">
                            {nf(pct, 0)}%
                          </span>
                        </p>
                      </li>
                    );
                  })}
                </ul>
              </>
            ) : (
              <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-center text-xs text-muted-foreground">
                Nada registrado hoje contribuiu com este item.
              </p>
            )}
          </section>

          {info.unit === "kcal" && (
            <CalorieGuide
              total={info.total}
              target={info.target}
              weightKg={info.weightKg ?? null}
            />
          )}
          <p className="mt-3 flex gap-2 px-1 text-[11px] leading-snug text-muted-foreground">
            <Info size={13} className="mt-0.5 shrink-0" />
            {info.about} Valores estimados a partir das quantidades registradas, não substituem o
            rótulo nem orientação profissional.
          </p>
        </div>
      </div>
    </div>
  );
}
