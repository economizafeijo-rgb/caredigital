import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Activity, Droplets, Pill, Sparkles, UtensilsCrossed, type LucideIcon } from "lucide-react";

type Kpi = { key: string; label: string; percent: number; value: string; note: string };
type Task = { id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };

const ringStyle: Record<string, { color: string; icon: LucideIcon }> = {
  hidratacao: { color: "#38bdf8", icon: Droplets },
  alimentacao: { color: "#34d399", icon: UtensilsCrossed },
  medicacao: { color: "#a78bfa", icon: Pill },
  atividade: { color: "#fb923c", icon: Activity },
};
const lanes = [
  { key: "medicacao", label: "Medicação", color: "#a78bfa" },
  { key: "hidratacao", label: "Água", color: "#38bdf8" },
  { key: "refeicao", label: "Refeições", color: "#34d399" },
  { key: "outro", label: "Outros", color: "#fbbf24" },
] as const;
const tz = "America/Rio_Branco";
const hourOf = (iso: string | number) => {
  const p = new Intl.DateTimeFormat("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit", hour12: false }).formatToParts(new Date(iso));
  return Number(p.find((x) => x.type === "hour")?.value ?? 0) + Number(p.find((x) => x.type === "minute")?.value ?? 0) / 60;
};
const fmtHour = (h: number) => `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;

/** Anéis do dia: cada área é um anel; passar o mouse destaca e mostra o valor no centro; clicar abre a área. */
function DayRings({ kpis, dayPercent, onOpen }: { kpis: readonly Kpi[]; dayPercent: number; onOpen: (key: string) => void }) {
  const [hover, setHover] = useState<number | null>(null);
  const k = hover === null ? null : kpis[hover];
  return (
    <section aria-label="Anéis do dia" className="nv-dark relative isolate flex flex-col gap-4 overflow-hidden rounded-2xl bg-[#050d12] p-4 text-white sm:flex-row sm:items-center lg:p-5">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 opacity-50 [background-image:linear-gradient(rgba(255,255,255,.04)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.04)_1px,transparent_1px)] [background-size:24px_24px]" />
      <div aria-hidden="true" className="nv-aurora-a pointer-events-none absolute -left-24 -top-24 -z-10 h-64 w-96 rounded-full" />
      <div className="relative mx-auto size-48 shrink-0 sm:mx-0 lg:size-52">
        <svg viewBox="0 0 200 200" className="size-full -rotate-90">
          {kpis.map((kp, i) => {
            const r = 88 - i * 18;
            const st = ringStyle[kp.key];
            const dim = hover !== null && hover !== i;
            return (
              <g key={kp.key} onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onClick={() => onOpen(kp.key)} style={{ cursor: "pointer" }}>
                <circle cx="100" cy="100" r={r} fill="none" stroke={st.color} strokeOpacity=".15" strokeWidth="12" />
                <circle cx="100" cy="100" r={r} fill="none" stroke={st.color} strokeWidth={hover === i ? 14 : 12} strokeLinecap="round" pathLength={100}
                  strokeDasharray={`${Math.max(1, kp.percent)} 100`} className="nv-ring-draw"
                  style={{ opacity: dim ? 0.35 : 1, filter: hover === i ? `drop-shadow(0 0 6px ${st.color})` : undefined, transition: "opacity .25s, stroke-width .25s", animationDelay: `${i * 120}ms` }} />
              </g>
            );
          })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-items-center text-center">
          <div key={hover ?? "day"} className="nv-fade-in">
            {k ? (
              <>
                <p className="text-[11px] font-semibold" style={{ color: ringStyle[k.key].color }}>{k.label}</p>
                <p className="font-display text-2xl font-extrabold tabular-nums">{k.value}</p>
                <p className="max-w-[7rem] text-[10px] leading-tight text-white/60">{k.note}</p>
              </>
            ) : (
              <>
                <p className="font-display text-4xl font-extrabold tabular-nums">{dayPercent}%</p>
                <p className="text-[11px] text-white/60">do dia concluído</p>
              </>
            )}
          </div>
        </div>
      </div>
      <ul className="grid flex-1 gap-1.5">
        {kpis.map((kp, i) => {
          const st = ringStyle[kp.key];
          return (
            <li key={kp.key}>
              <button type="button" onPointerEnter={() => setHover(i)} onPointerLeave={() => setHover(null)} onFocus={() => setHover(i)} onBlur={() => setHover(null)} onClick={() => onOpen(kp.key)}
                className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2 text-left transition-colors ${hover === i ? "border-white/25 bg-white/10" : "border-white/10 bg-white/[.03]"}`}>
                <span className="grid size-8 shrink-0 place-items-center rounded-lg" style={{ background: `${st.color}26`, color: st.color }}><st.icon size={16} aria-hidden="true" /></span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2"><strong className="text-sm">{kp.label}</strong><span className="text-sm font-bold tabular-nums">{kp.value}</span></span>
                  <span className="mt-1 block h-1 overflow-hidden rounded-full bg-white/10"><i className="block h-full rounded-full transition-[width] duration-700" style={{ width: `${kp.percent}%`, background: st.color }} /></span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** Linha do tempo do dia: cuidados por categoria, linha do "agora" e mira que segue o ponteiro. */
function DayTimeline({ tasks, nowMs, onTask }: { tasks: readonly Task[]; nowMs: number; onTask: (t: Task) => void }) {
  const H0 = 5, H1 = 23, W = 640, Hh = 190, left = 70, top = 18, laneH = (Hh - top - 26) / lanes.length;
  const x = (h: number) => left + ((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * (W - left - 14);
  const nowH = hourOf(nowMs);
  const [hover, setHover] = useState<Task | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const placed = useMemo(() => tasks.map((t) => {
    const li = Math.max(0, lanes.findIndex((l) => l.key === (["medicacao", "hidratacao", "refeicao"].includes(t.category) ? t.category : "outro")));
    return { t, h: hourOf(t.scheduled_at), li };
  }), [tasks]);
  const done = tasks.filter((t) => t.completed_at).length;
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setCursor(px < left ? null : H0 + ((px - left) / (W - left - 14)) * (H1 - H0));
  };
  return (
    <section aria-label="Linha do tempo de hoje" className="relative flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 lg:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold">Linha do tempo de hoje</h3>
          <p className="text-xs text-muted-foreground">{done} de {tasks.length} cuidados concluídos · passe o mouse nos pontos</p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary"><span className="nv-live size-1.5 rounded-full bg-primary" /> Agora {fmtHour(nowH)}</span>
      </div>
      <svg viewBox={`0 0 ${W} ${Hh}`} className="mt-2 w-full touch-none" onPointerMove={onMove} onPointerLeave={() => setCursor(null)} role="img" aria-label={`Cuidados de hoje: ${done} concluídos de ${tasks.length}`}>
        {lanes.map((l, i) => (
          <g key={l.key}>
            <rect x={left} y={top + i * laneH + 4} width={W - left - 14} height={laneH - 8} rx="8" fill={l.color} fillOpacity=".06" />
            <text x={left - 10} y={top + i * laneH + laneH / 2 + 4} textAnchor="end" fontSize="11" fill="currentColor" className="text-muted-foreground" fontWeight="600">{l.label}</text>
          </g>
        ))}
        {Array.from({ length: (H1 - H0) / 3 + 1 }, (_, i) => H0 + i * 3).map((h) => (
          <g key={h}>
            <line x1={x(h)} x2={x(h)} y1={top} y2={Hh - 22} stroke="currentColor" className="text-border" strokeDasharray="2 4" />
            <text x={x(h)} y={Hh - 6} textAnchor="middle" fontSize="10" fill="currentColor" className="text-muted-foreground">{String(h).padStart(2, "0")}h</text>
          </g>
        ))}
        <rect x={left} y={top} width={Math.max(0, x(nowH) - left)} height={Hh - top - 22} fill="var(--primary)" fillOpacity=".05" />
        <line x1={x(nowH)} x2={x(nowH)} y1={top - 6} y2={Hh - 22} stroke="var(--primary)" strokeWidth="2" />
        <circle cx={x(nowH)} cy={top - 6} r="4" fill="var(--primary)" className="nv-live" />
        {cursor !== null && (
          <g pointerEvents="none">
            <line x1={x(cursor)} x2={x(cursor)} y1={top} y2={Hh - 22} stroke="currentColor" className="text-muted-foreground" strokeOpacity=".5" />
            <text x={x(cursor) + 4} y={top + 10} fontSize="10" fill="currentColor" className="text-muted-foreground">{fmtHour(cursor)}</text>
          </g>
        )}
        {placed.map(({ t, h, li }, i) => {
          const c = lanes[li].color;
          const cy = top + li * laneH + laneH / 2;
          const on = hover?.id === t.id;
          return (
            <g key={t.id} onPointerEnter={() => setHover(t)} onPointerLeave={() => setHover(null)} onClick={() => onTask(t)} style={{ cursor: "pointer" }}>
              <circle cx={x(h)} cy={cy} r="14" fill="transparent" />
              <circle cx={x(h)} cy={cy} r={on ? 9 : 7} fill={t.completed_at ? c : "var(--card)"} stroke={c} strokeWidth="2.5" className="nv-dot-in" style={{ animationDelay: `${i * 40}ms`, transition: "r .2s" }} />
            </g>
          );
        })}
        {hover && (() => {
          const p = placed.find((q) => q.t.id === hover.id)!;
          const cx = Math.min(Math.max(x(p.h), left + 80), W - 94);
          const cy = top + p.li * laneH + laneH / 2 - 46;
          return (
            <g pointerEvents="none" transform={`translate(${cx - 80} ${Math.max(cy, 0)})`}>
              <rect width="160" height="34" rx="8" fill="#0f172a" />
              <text x="80" y="14" textAnchor="middle" fontSize="10" fill="#94a3b8">{fmtHour(p.h)} · {hover.completed_at ? "concluído" : "pendente"}</text>
              <text x="80" y="27" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">{hover.title.length > 26 ? `${hover.title.slice(0, 25)}…` : hover.title}</text>
            </g>
          );
        })()}
      </svg>
      {tasks.length === 0 && (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground"><span className="flex items-center gap-2"><Sparkles size={16} /> Nenhum cuidado programado para hoje.</span></p>
      )}
    </section>
  );
}

/** Centro de controle da Visão geral: anéis do dia e linha do tempo interativa, lado a lado. */
export function OverviewCommandCenter({ kpis, dayPercent, tasks, nowMs, onOpen, onTask }: {
  kpis: readonly Kpi[]; dayPercent: number; tasks: readonly Task[]; nowMs: number; onOpen: (key: string) => void; onTask: (t: Task) => void;
}) {
  return (
    <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)]">
      <DayRings kpis={kpis} dayPercent={dayPercent} onOpen={onOpen} />
      <DayTimeline tasks={tasks} nowMs={nowMs} onTask={onTask} />
    </div>
  );
}
