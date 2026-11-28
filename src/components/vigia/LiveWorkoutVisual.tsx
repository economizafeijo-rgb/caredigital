import { LiveMeters } from "./LiveMeters";
import { useMemo } from "react";
import { Flame, MapPin, Timer } from "lucide-react";

export type LivePoint = {
  latitude: number;
  longitude: number;
  accuracy?: number;
  speed?: number | null;
  t?: number;
};
const R = 6371;
export function haversineKm(a: LivePoint, b: LivePoint) {
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180,
    dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.latitude * Math.PI) / 180) *
      Math.cos((b.latitude * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
/** Velocidade atual em km/h: usa a do GPS quando existe; senão, a média dos últimos ~12 s. */
export function currentSpeedKmh(route: LivePoint[]): number {
  const last = route.at(-1);
  if (!last) return 0;
  if (typeof last.speed === "number" && last.speed >= 0) return last.speed * 3.6;
  const recent = route.filter((p) => p.t && last.t && last.t - p.t <= 12_000);
  if (recent.length < 2 || !recent[0].t || !last.t) return 0;
  const km = recent.slice(1).reduce((sum, p, i) => sum + haversineKm(recent[i], p), 0);
  const h = (last.t - recent[0].t) / 3_600_000;
  return h > 0 ? km / h : 0;
}
export const paceLabel = (kmh: number) => {
  if (kmh < 0.8) return "—";
  const min = 60 / kmh;
  return `${Math.floor(min)}:${String(Math.round((min % 1) * 60) % 60).padStart(2, "0")}`;
};
/** Tempo de cada quilômetro completo, em segundos. */
export function kmSplits(route: LivePoint[]): number[] {
  const splits: number[] = [];
  let km = 0,
    mark = route[0]?.t ?? 0;
  for (let i = 1; i < route.length; i++) {
    km += haversineKm(route[i - 1], route[i]);
    if (km >= splits.length + 1 && route[i].t) {
      splits.push(Math.round((route[i].t! - mark) / 1000));
      mark = route[i].t!;
    }
  }
  return splits;
}
/** Gasto estimado (kcal) por MET: caminhada 3,8; corrida 9,8; outros 6. */
export const estimateKcal = (type: string, minutes: number, weightKg = 70) =>
  Math.round(
    (type === "corrida" ? 9.8 : type === "caminhada" ? 3.8 : 6) * weightKg * (minutes / 60),
  );

export function routePath(route: LivePoint[], w: number, h: number, pad = 14) {
  if (route.length < 2)
    return { d: "", end: null as null | [number, number], start: null as null | [number, number] };
  const lat = route.map((p) => p.latitude),
    lon = route.map((p) => p.longitude);
  const minLat = Math.min(...lat),
    maxLat = Math.max(...lat),
    minLon = Math.min(...lon),
    maxLon = Math.max(...lon);
  const k = Math.cos((((minLat + maxLat) / 2) * Math.PI) / 180);
  const spanX = Math.max((maxLon - minLon) * k, 1e-6),
    spanY = Math.max(maxLat - minLat, 1e-6);
  const scale = Math.min((w - pad * 2) / spanX, (h - pad * 2) / spanY);
  const ox = (w - spanX * scale) / 2,
    oy = (h - spanY * scale) / 2;
  const pts = route.map(
    (p) =>
      [ox + (p.longitude - minLon) * k * scale, h - (oy + (p.latitude - minLat) * scale)] as [
        number,
        number,
      ],
  );
  return {
    d: pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" "),
    end: pts.at(-1)!,
    start: pts[0],
  };
}

export type LiveStatus = "searching" | "moving" | "auto" | "manual";

const GAUGE_MAX: Record<string, number> = { caminhada: 10, corrida: 20, ciclismo: 40 };

/** Medidor semicircular de velocidade (km/h) com ponteiro e arco animados. */
function SpeedGauge({ speed, max, active }: { speed: number; max: number; active: boolean }) {
  const frac = Math.max(0, Math.min(1, speed / max));
  const R = 78;
  const C = Math.PI * R;
  const angle = Math.PI * (1 - frac);
  const px = 100 + R * Math.cos(angle);
  const py = 100 - R * Math.sin(angle);
  const arc = `M ${100 - R} 100 A ${R} ${R} 0 0 1 ${100 + R} 100`;
  return (
    <svg
      viewBox="0 0 200 118"
      className="mx-auto max-h-44 w-full"
      role="img"
      aria-label={`Velocidade ${speed.toFixed(1)} km/h`}
    >
      <defs>
        <linearGradient id="nvGauge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#34d399" />
          <stop offset=".6" stopColor="#38bdf8" />
          <stop offset="1" stopColor="#a78bfa" />
        </linearGradient>
      </defs>
      <path
        d={arc}
        fill="none"
        stroke="#fff"
        strokeOpacity=".1"
        strokeWidth="10"
        strokeLinecap="round"
      />
      <path
        d={arc}
        fill="none"
        stroke="url(#nvGauge)"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={C}
        strokeDashoffset={C * (1 - frac)}
        style={{ transition: "stroke-dashoffset .9s cubic-bezier(.2,.8,.2,1)" }}
      />
      {Array.from({ length: 11 }, (_, i) => {
        const a = Math.PI * (1 - i / 10);
        const r1 = R - 12;
        const r2 = R - (i % 5 === 0 ? 20 : 16);
        return (
          <line
            key={i}
            x1={100 + r1 * Math.cos(a)}
            y1={100 - r1 * Math.sin(a)}
            x2={100 + r2 * Math.cos(a)}
            y2={100 - r2 * Math.sin(a)}
            stroke="#fff"
            strokeOpacity={i % 5 === 0 ? 0.45 : 0.2}
            strokeWidth="1.4"
          />
        );
      })}
      {active && (
        <circle
          className="nv-anim"
          cx={px}
          cy={py}
          r="9"
          fill="#38bdf8"
          opacity=".35"
          style={{
            transformOrigin: `${px}px ${py}px`,
            animation: "nv-pulse 1.8s ease-out infinite",
          }}
        />
      )}
      <circle
        cx={px}
        cy={py}
        r="6"
        fill="#fff"
        stroke="#38bdf8"
        strokeWidth="3"
        style={{ transition: "all .9s cubic-bezier(.2,.8,.2,1)" }}
      />
      <text x={100 - R} y="116" textAnchor="middle" fill="#fff" fillOpacity=".45" fontSize="9">
        0
      </text>
      <text x={100 + R} y="116" textAnchor="middle" fill="#fff" fillOpacity=".45" fontSize="9">
        {max}
      </text>
    </svg>
  );
}

const STATUS_COPY: Record<LiveStatus, { label: string; tone: string }> = {
  searching: { label: "Buscando sinal do GPS…", tone: "text-sky-200" },
  moving: { label: "Registrando seu movimento", tone: "text-emerald-200" },
  auto: { label: "Você parou · tempo pausado", tone: "text-amber-200" },
  manual: { label: "Pausado por você", tone: "text-amber-200" },
};

export function LiveWorkoutVisual({
  route,
  elapsed,
  status,
  type,
  distanceKm,
  weightKg,
}: {
  route: LivePoint[];
  elapsed: number;
  status: LiveStatus;
  type: string;
  distanceKm: number;
  weightKg?: number | null;
}) {
  const live = status === "moving";
  const speed = live ? currentSpeedKmh(route) : 0;
  const path = useMemo(() => routePath(route, 320, 190), [route]);
  const splits = useMemo(() => kmSplits(route), [route]);
  const spark = useMemo(() => {
    const tail = route.slice(-40);
    return tail.slice(1).map((p, i) => {
      if (typeof p.speed === "number" && p.speed >= 0) return p.speed * 3.6;
      const dt = ((p.t ?? 0) - (tail[i].t ?? 0)) / 3_600_000;
      return dt > 0 ? Math.min(30, haversineKm(tail[i], p) / dt) : 0;
    });
  }, [route]);
  const sparkMax = Math.max(3, ...spark);
  const accuracy = route.at(-1)?.accuracy;
  const paused = status === "auto" || status === "manual";
  const copy = STATUS_COPY[status];
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      <style>{`
        @keyframes nv-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
        @media (prefers-reduced-motion: reduce){.nv-anim{animation:none!important}}
      `}</style>
      <div className="nv-round relative overflow-hidden rounded-2xl bg-gradient-to-b from-slate-900/70 to-slate-950/80 px-4 pb-4 pt-3 ring-1 ring-white/10">
        <p className={`flex items-center gap-2 text-[12px] font-semibold ${copy.tone}`}>
          <span
            className={`size-2 rounded-full ${live ? "animate-pulse bg-emerald-300" : status === "searching" ? "animate-pulse bg-sky-300" : "bg-amber-300"}`}
          />
          {copy.label}
        </p>
        <div className="relative mx-auto mt-1 max-w-[280px]">
          <SpeedGauge speed={speed} max={GAUGE_MAX[type] ?? 10} active={live} />
          <div className="absolute inset-x-0 bottom-3 text-center">
            <strong className="text-4xl font-extrabold tabular-nums leading-none">
              {speed.toFixed(1)}
            </strong>
            <span className="ml-1 text-xs font-semibold text-white/60">km/h</span>
          </div>
        </div>
        <div className="mt-2 grid grid-cols-2 divide-x divide-white/10 rounded-xl bg-black/25 py-2 text-center">
          <div>
            <span className="flex items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
              <Timer size={11} /> Ritmo agora
            </span>
            <strong className="text-lg font-extrabold tabular-nums">{paceLabel(speed)}</strong>
            <span className="ml-1 text-[11px] text-white/55">min/km</span>
          </div>
          <div>
            <span className="flex items-center justify-center gap-1 text-[10.5px] font-semibold uppercase tracking-wider text-white/55">
              <Flame size={11} className="text-orange-300" /> Gasto estimado
            </span>
            <strong className="text-lg font-extrabold tabular-nums">
              {estimateKcal(type, elapsed / 60, weightKg ?? 70)}
            </strong>
            <span className="ml-1 text-[11px] text-white/55">kcal</span>
          </div>
        </div>
        {paused && (
          <p className="mt-2 text-center text-[11px] text-white/55">
            {status === "auto"
              ? "Volte a andar que o tempo e a distância continuam sozinhos."
              : "Toque em Retomar para continuar."}
          </p>
        )}
      </div>

      <div className="relative h-[210px] overflow-hidden rounded-2xl bg-black/25">
        <svg
          viewBox="0 0 320 190"
          className="h-full w-full"
          role="img"
          aria-label="Percurso registrado pelo GPS"
        >
          <defs>
            <linearGradient id="nvRoute" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#34d399" />
              <stop offset="1" stopColor="#38bdf8" />
            </linearGradient>
            <pattern id="nvGrid" width="32" height="32" patternUnits="userSpaceOnUse">
              <path d="M32 0H0V32" fill="none" stroke="#fff" strokeOpacity=".07" />
            </pattern>
          </defs>
          <rect width="320" height="190" fill="url(#nvGrid)" />
          {path.d ? (
            <>
              <path
                d={path.d}
                fill="none"
                stroke="#000"
                strokeOpacity=".35"
                strokeWidth="9"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={path.d}
                fill="none"
                stroke="url(#nvRoute)"
                strokeWidth="5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle
                cx={path.start![0]}
                cy={path.start![1]}
                r="5"
                fill="#fff"
                stroke="#34d399"
                strokeWidth="3"
              />
              <circle
                className="nv-anim"
                cx={path.end![0]}
                cy={path.end![1]}
                r="7"
                fill="#38bdf8"
                opacity=".6"
                style={{
                  transformOrigin: `${path.end![0]}px ${path.end![1]}px`,
                  animation: live ? "nv-pulse 1.6s ease-out infinite" : "none",
                }}
              />
              <circle
                cx={path.end![0]}
                cy={path.end![1]}
                r="6"
                fill="#38bdf8"
                stroke="#fff"
                strokeWidth="2.5"
              />
            </>
          ) : (
            <text x="160" y="98" textAnchor="middle" fill="#fff" fillOpacity=".7" fontSize="13">
              Aguardando sinal do GPS… comece a se mover
            </text>
          )}
        </svg>
        <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold">
          <MapPin size={12} /> Percurso ao vivo
          {accuracy ? ` · precisão ±${Math.round(accuracy)} m` : ""}
        </span>
        <span className="absolute bottom-3 right-3 rounded-full bg-black/45 px-3 py-1.5 backdrop-blur">
          <LiveMeters distanceKm={distanceKm} active={live} />
        </span>
      </div>

      <div className="rounded-2xl bg-black/20 p-3 md:col-span-2">
        <div className="flex items-end gap-[3px]" style={{ height: 44 }} aria-hidden="true">
          {(spark.length ? spark : Array(40).fill(0)).map((v, i) => (
            <i
              key={i}
              className="flex-1 rounded-t bg-gradient-to-t from-emerald-400 to-sky-400 transition-[height] duration-500"
              style={{
                height: `${Math.max(4, (v / sparkMax) * 100)}%`,
                opacity: 0.35 + (i / 40) * 0.65,
              }}
            />
          ))}
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-white/75">
          <span className="font-semibold">Velocidade nos últimos instantes</span>
          {splits.length ? (
            splits.map((s, i) => (
              <span
                key={i}
                className="rounded-full bg-white/10 px-2.5 py-1 font-semibold tabular-nums"
              >
                km {i + 1} · {Math.floor(s / 60)}:{String(s % 60).padStart(2, "0")}
              </span>
            ))
          ) : (
            <span className="ml-auto">
              O tempo de cada quilômetro aparece aqui ({distanceKm.toFixed(2)} km até agora).
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
