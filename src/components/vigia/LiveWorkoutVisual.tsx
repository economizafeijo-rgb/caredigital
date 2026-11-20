import { useMemo } from "react";
import { Flame, Gauge, MapPin, Timer } from "lucide-react";

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

function routePath(route: LivePoint[], w: number, h: number, pad = 14) {
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

export function LiveWorkoutVisual({
  route,
  elapsed,
  paused,
  type,
  distanceKm,
  weightKg,
}: {
  route: LivePoint[];
  elapsed: number;
  paused: boolean;
  type: string;
  distanceKm: number;
  weightKg?: number | null;
}) {
  const speed = paused ? 0 : currentSpeedKmh(route);
  const running = type === "corrida";
  const stride = speed < 0.8 ? 0 : Math.max(0.28, Math.min(1.1, 4.2 / Math.max(speed, 1)));
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
  const state = paused ? "paused" : "running";
  return (
    <div className="mt-6 grid gap-3 md:grid-cols-2">
      <div className="relative h-[210px] overflow-hidden rounded-2xl bg-gradient-to-b from-sky-900/60 via-indigo-950/60 to-slate-950/80">
        <style>{`
        @keyframes nv-road{to{background-position:-160px 0}} @keyframes nv-hill{to{background-position:-640px 0}}
        @keyframes nv-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-7px)}}
        @keyframes nv-legA{0%,100%{transform:rotate(34deg)}50%{transform:rotate(-34deg)}} @keyframes nv-legB{0%,100%{transform:rotate(-34deg)}50%{transform:rotate(34deg)}}
        @keyframes nv-pulse{0%{transform:scale(.6);opacity:.9}100%{transform:scale(2.4);opacity:0}}
        @media (prefers-reduced-motion: reduce){.nv-anim{animation:none!important}}
      `}</style>
        <div
          className="nv-anim absolute inset-x-0 bottom-9 h-24 opacity-50"
          style={{
            backgroundImage:
              "radial-gradient(60px 46px at 80px 100%, #34d399 98%, transparent), radial-gradient(90px 60px at 240px 100%, #059669 98%, transparent), radial-gradient(70px 40px at 430px 100%, #10b981 98%, transparent), radial-gradient(100px 66px at 580px 100%, #047857 98%, transparent)",
            backgroundSize: "640px 100%",
            animation: stride ? `nv-hill ${stride * 22}s linear infinite` : "none",
            animationPlayState: state,
          }}
        />
        <div className="absolute inset-x-0 bottom-0 h-9 bg-slate-800" />
        <div
          className="nv-anim absolute inset-x-0 bottom-4 h-1"
          style={{
            backgroundImage: "linear-gradient(90deg,#fde68a 50%,transparent 50%)",
            backgroundSize: "80px 100%",
            animation: stride ? `nv-road ${stride * 1.6}s linear infinite` : "none",
            animationPlayState: state,
          }}
        />
        <svg
          viewBox="0 0 80 110"
          className="nv-anim absolute bottom-5 left-1/2 h-[104px] -translate-x-1/2"
          style={{
            animation: stride ? `nv-bob ${stride}s ease-in-out infinite` : "none",
            animationPlayState: state,
          }}
          aria-hidden="true"
        >
          <g stroke="#fff" strokeWidth="7" strokeLinecap="round" fill="none">
            <circle cx="42" cy="16" r="10" fill="#fff" stroke="none" />
            <path d={running ? "M40 30 L34 62" : "M40 30 L38 62"} />
            <path
              className="nv-anim"
              d="M39 38 L54 52"
              style={{
                transformOrigin: "39px 38px",
                animation: stride ? `nv-legB ${stride}s ease-in-out infinite` : "none",
                animationPlayState: state,
              }}
            />
            <path
              className="nv-anim"
              d="M39 38 L24 52"
              style={{
                transformOrigin: "39px 38px",
                animation: stride ? `nv-legA ${stride}s ease-in-out infinite` : "none",
                animationPlayState: state,
              }}
            />
            <path
              className="nv-anim"
              d="M35 62 L35 98"
              stroke="#fdba74"
              style={{
                transformOrigin: "35px 62px",
                animation: stride ? `nv-legA ${stride}s ease-in-out infinite` : "none",
                animationPlayState: state,
              }}
            />
            <path
              className="nv-anim"
              d="M35 62 L35 98"
              stroke="#5eead4"
              style={{
                transformOrigin: "35px 62px",
                animation: stride ? `nv-legB ${stride}s ease-in-out infinite` : "none",
                animationPlayState: state,
              }}
            />
          </g>
        </svg>
        <div className="absolute left-3 top-3 rounded-xl bg-black/35 px-3 py-2 backdrop-blur">
          <span className="flex items-center gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">
            <Gauge size={12} /> Velocidade agora
          </span>
          <strong className="text-3xl font-extrabold tabular-nums">{speed.toFixed(1)}</strong>
          <span className="ml-1 text-sm text-white/70">km/h</span>
        </div>
        <div className="absolute right-3 top-3 rounded-xl bg-black/35 px-3 py-2 text-right backdrop-blur">
          <span className="flex items-center justify-end gap-1 text-[11px] font-semibold uppercase tracking-wider text-white/70">
            <Timer size={12} /> Ritmo agora
          </span>
          <strong className="text-3xl font-extrabold tabular-nums">{paceLabel(speed)}</strong>
          <span className="ml-1 text-sm text-white/70">min/km</span>
        </div>
        {paused && (
          <span className="absolute inset-x-0 top-1/2 -translate-y-1/2 text-center text-lg font-extrabold uppercase tracking-[.3em] text-amber-300">
            Pausado
          </span>
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
                  animation: paused ? "none" : "nv-pulse 1.6s ease-out infinite",
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
        <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2.5 py-1 text-[11px] font-semibold">
          <Flame size={12} className="text-orange-300" /> ~
          {estimateKcal(type, elapsed / 60, weightKg ?? 70)} kcal
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
