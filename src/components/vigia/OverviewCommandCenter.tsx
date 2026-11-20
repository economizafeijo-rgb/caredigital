import { useMemo, useState, type PointerEvent as ReactPointerEvent } from "react";
import { Sparkles } from "lucide-react";

type Task = {
  id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
};

const lanes = [
  { key: "medicacao", label: "Medicação", color: "#a78bfa" },
  { key: "hidratacao", label: "Água", color: "#38bdf8" },
  { key: "refeicao", label: "Refeições", color: "#34d399" },
  { key: "outro", label: "Outros", color: "#fbbf24" },
] as const;
const tz = "America/Rio_Branco";
const hourOf = (iso: string | number) => {
  const p = new Intl.DateTimeFormat("en-GB", {
    timeZone: tz,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  return (
    Number(p.find((x) => x.type === "hour")?.value ?? 0) +
    Number(p.find((x) => x.type === "minute")?.value ?? 0) / 60
  );
};
const fmtHour = (h: number) =>
  `${String(Math.floor(h) % 24).padStart(2, "0")}:${String(Math.round((h % 1) * 60) % 60).padStart(2, "0")}`;

/** Linha do tempo do dia: cuidados por categoria, linha do "agora" e mira que segue o ponteiro. */
export function DayTimeline({
  tasks,
  nowMs,
  onTask,
}: {
  tasks: readonly Task[];
  nowMs: number;
  onTask: (t: Task) => void;
}) {
  const H0 = 5,
    H1 = 23,
    W = 640,
    Hh = 190,
    left = 70,
    top = 18,
    laneH = (Hh - top - 26) / lanes.length;
  const x = (h: number) =>
    left + ((Math.min(Math.max(h, H0), H1) - H0) / (H1 - H0)) * (W - left - 14);
  const nowH = hourOf(nowMs);
  const [hover, setHover] = useState<Task | null>(null);
  const [cursor, setCursor] = useState<number | null>(null);
  const placed = useMemo(
    () =>
      tasks.map((t) => {
        const li = Math.max(
          0,
          lanes.findIndex(
            (l) =>
              l.key ===
              (["medicacao", "hidratacao", "refeicao"].includes(t.category) ? t.category : "outro"),
          ),
        );
        return { t, h: hourOf(t.scheduled_at), li };
      }),
    [tasks],
  );
  const done = tasks.filter((t) => t.completed_at).length;
  const onMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - r.left) / r.width) * W;
    setCursor(px < left ? null : H0 + ((px - left) / (W - left - 14)) * (H1 - H0));
  };
  return (
    <section
      aria-label="Linha do tempo de hoje"
      className="relative flex min-w-0 flex-col rounded-2xl border border-border bg-card p-4 lg:p-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-display text-base font-bold">Linha do tempo de hoje</h3>
          <p className="text-xs text-muted-foreground">
            {done} de {tasks.length} cuidados concluídos · passe o mouse nos pontos
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
          <span className="nv-live size-1.5 rounded-full bg-primary" /> Agora {fmtHour(nowH)}
        </span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${Hh}`}
        className="mt-2 w-full touch-none"
        onPointerMove={onMove}
        onPointerLeave={() => setCursor(null)}
        role="img"
        aria-label={`Cuidados de hoje: ${done} concluídos de ${tasks.length}`}
      >
        {lanes.map((l, i) => (
          <g key={l.key}>
            <rect
              x={left}
              y={top + i * laneH + 4}
              width={W - left - 14}
              height={laneH - 8}
              rx="8"
              fill={l.color}
              fillOpacity=".06"
            />
            <text
              x={left - 10}
              y={top + i * laneH + laneH / 2 + 4}
              textAnchor="end"
              fontSize="11"
              fill="currentColor"
              className="text-muted-foreground"
              fontWeight="600"
            >
              {l.label}
            </text>
          </g>
        ))}
        {Array.from({ length: (H1 - H0) / 3 + 1 }, (_, i) => H0 + i * 3).map((h) => (
          <g key={h}>
            <line
              x1={x(h)}
              x2={x(h)}
              y1={top}
              y2={Hh - 22}
              stroke="currentColor"
              className="text-border"
              strokeDasharray="2 4"
            />
            <text
              x={x(h)}
              y={Hh - 6}
              textAnchor="middle"
              fontSize="10"
              fill="currentColor"
              className="text-muted-foreground"
            >
              {String(h).padStart(2, "0")}h
            </text>
          </g>
        ))}
        <rect
          x={left}
          y={top}
          width={Math.max(0, x(nowH) - left)}
          height={Hh - top - 22}
          fill="var(--primary)"
          fillOpacity=".05"
        />
        <line
          x1={x(nowH)}
          x2={x(nowH)}
          y1={top - 6}
          y2={Hh - 22}
          stroke="var(--primary)"
          strokeWidth="2"
        />
        <circle cx={x(nowH)} cy={top - 6} r="4" fill="var(--primary)" className="nv-live" />
        {cursor !== null && (
          <g pointerEvents="none">
            <line
              x1={x(cursor)}
              x2={x(cursor)}
              y1={top}
              y2={Hh - 22}
              stroke="currentColor"
              className="text-muted-foreground"
              strokeOpacity=".5"
            />
            <text
              x={x(cursor) + 4}
              y={top + 10}
              fontSize="10"
              fill="currentColor"
              className="text-muted-foreground"
            >
              {fmtHour(cursor)}
            </text>
          </g>
        )}
        {placed.map(({ t, h, li }, i) => {
          const c = lanes[li].color;
          const cy = top + li * laneH + laneH / 2;
          const on = hover?.id === t.id;
          return (
            <g
              key={t.id}
              onPointerEnter={() => setHover(t)}
              onPointerLeave={() => setHover(null)}
              onClick={() => onTask(t)}
              style={{ cursor: "pointer" }}
            >
              <circle cx={x(h)} cy={cy} r="14" fill="transparent" />
              <circle
                cx={x(h)}
                cy={cy}
                r={on ? 9 : 7}
                fill={t.completed_at ? c : "var(--card)"}
                stroke={c}
                strokeWidth="2.5"
                className="nv-dot-in"
                style={{ animationDelay: `${i * 40}ms`, transition: "r .2s" }}
              />
            </g>
          );
        })}
        {hover &&
          (() => {
            const p = placed.find((q) => q.t.id === hover.id)!;
            const cx = Math.min(Math.max(x(p.h), left + 80), W - 94);
            const cy = top + p.li * laneH + laneH / 2 - 46;
            return (
              <g pointerEvents="none" transform={`translate(${cx - 80} ${Math.max(cy, 0)})`}>
                <rect width="160" height="34" rx="8" fill="#0f172a" />
                <text x="80" y="14" textAnchor="middle" fontSize="10" fill="#94a3b8">
                  {fmtHour(p.h)} · {hover.completed_at ? "concluído" : "pendente"}
                </text>
                <text x="80" y="27" textAnchor="middle" fontSize="11" fontWeight="700" fill="#fff">
                  {hover.title.length > 26 ? `${hover.title.slice(0, 25)}…` : hover.title}
                </text>
              </g>
            );
          })()}
      </svg>
      {tasks.length === 0 && (
        <p className="absolute inset-0 grid place-items-center text-sm text-muted-foreground">
          <span className="flex items-center gap-2">
            <Sparkles size={16} /> Nenhum cuidado programado para hoje.
          </span>
        </p>
      )}
    </section>
  );
}
