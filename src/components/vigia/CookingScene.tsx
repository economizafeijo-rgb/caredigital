import { useId } from "react";
import type { Glyph, Vessel } from "@/lib/cooking-times";

/** Desenho de cada alimento, centrado na origem e ocupando cerca de 56 x 56. */
function GlyphShape({ glyph, color }: { glyph: Glyph; color: string }) {
  const dark = `color-mix(in srgb, ${color} 60%, #000)`;
  const light = `color-mix(in srgb, ${color} 55%, #fff)`;
  switch (glyph) {
    case "egg":
      return (
        <g>
          <ellipse cx="0" cy="1" rx="12" ry="15" fill="#f6eedf" stroke="#d9cdb4" strokeWidth="1" />
          <ellipse cx="-4" cy="-5" rx="3.5" ry="6" fill="#fff" opacity=".75" />
        </g>
      );
    case "fried":
      return (
        <g>
          <path
            d="M-24 2c-4-14 10-22 22-18 12-6 28 2 24 16 6 12-8 22-20 18-14 6-30-2-26-16z"
            fill="#fbf8f0"
            stroke="#e5dcc6"
            strokeWidth="1"
          />
          <circle cx="0" cy="1" r="9" fill="#f5b327" />
          <circle cx="-3" cy="-2" r="3" fill="#fde28a" />
        </g>
      );
    case "omelet":
      return (
        <g>
          <path d="M-26 8a26 22 0 0 1 52 0z" fill={color} stroke={dark} strokeWidth="1.2" />
          <path
            d="M-14 5a14 12 0 0 1 28 0"
            fill="none"
            stroke={light}
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".7"
          />
        </g>
      );
    case "disc":
      return (
        <g>
          <circle r="25" fill={color} stroke={dark} strokeWidth="1.2" />
          <path d="M-25 0h50" stroke={dark} strokeWidth="1" opacity=".5" />
          <circle cx="-8" cy="-9" r="2" fill={dark} opacity=".35" />
          <circle cx="10" cy="8" r="2.4" fill={dark} opacity=".35" />
        </g>
      );
    case "tuber":
      return (
        <g transform="rotate(-18)">
          <path
            d="M-26 0c0-12 14-17 28-15 14 2 24 8 24 15s-10 13-24 15c-14 2-28-3-28-15z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
          />
          <path
            d="M-14-6c8-3 18-3 26 0"
            stroke={light}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity=".65"
          />
          <circle cx="-8" cy="6" r="1.4" fill={dark} />
          <circle cx="12" cy="4" r="1.4" fill={dark} />
        </g>
      );
    case "banana":
      return (
        <g>
          <path
            d="M-24-6c6 20 28 26 46 8 2-3 6-3 5 1-6 26-40 34-58 10-4-6 2-24 7-19z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <path
            d="M-18 4c8 12 22 15 36 4"
            fill="none"
            stroke={light}
            strokeWidth="2"
            strokeLinecap="round"
            opacity=".7"
          />
        </g>
      );
    case "liquid":
      return (
        <g>
          <path
            d="M-26-2h52c0 18-10 28-26 28S-26 16-26-2z"
            fill="#f3efe6"
            stroke="#d6cfbf"
            strokeWidth="1.2"
          />
          <ellipse cx="0" cy="-2" rx="26" ry="6" fill={color} stroke={dark} strokeWidth="1" />
          <ellipse cx="-6" cy="-3" rx="9" ry="2" fill={light} opacity=".6" />
        </g>
      );
    case "grain":
      return (
        <g fill={color} stroke={dark} strokeWidth=".8">
          {[
            [-14, -8, -20],
            [0, -12, 10],
            [14, -6, 30],
            [-8, 4, -5],
            [8, 5, 15],
            [-18, 10, 25],
            [18, 12, -25],
            [0, 16, 0],
          ].map(([x, y, r], i) => (
            <ellipse key={i} cx={x} cy={y} rx="6.5" ry="3.6" transform={`rotate(${r} ${x} ${y})`} />
          ))}
        </g>
      );
    case "chunks":
      return (
        <g stroke={dark} strokeWidth="1" strokeLinejoin="round">
          <rect
            x="-26"
            y="-4"
            width="20"
            height="20"
            rx="5"
            fill={color}
            transform="rotate(-10 -16 6)"
          />
          <rect
            x="-2"
            y="-16"
            width="22"
            height="22"
            rx="5"
            fill={color}
            transform="rotate(8 9 -5)"
          />
          <rect
            x="2"
            y="6"
            width="20"
            height="18"
            rx="5"
            fill={light}
            transform="rotate(-6 12 15)"
          />
        </g>
      );
    case "floret":
      return (
        <g>
          <path d="M-5 4h10l3 20h-16z" fill="#7bbf5b" stroke="#4d8a37" strokeWidth="1" />
          <g fill={color} stroke={dark} strokeWidth="1">
            <circle cx="-14" cy="-2" r="11" />
            <circle cx="2" cy="-12" r="13" />
            <circle cx="16" cy="-1" r="11" />
            <circle cx="1" cy="3" r="10" />
          </g>
        </g>
      );
    case "sticks":
      return (
        <g strokeLinecap="round">
          <path d="M-22 18l8-38" stroke={color} strokeWidth="8" />
          <path d="M-4 20l2-42" stroke={color} strokeWidth="8" />
          <path d="M16 18l-6-38" stroke={color} strokeWidth="8" />
          <path
            d="M-22 18l8-38M-4 20l2-42M16 18l-6-38"
            stroke={light}
            strokeWidth="2"
            opacity=".6"
          />
        </g>
      );
    case "corn":
      return (
        <g transform="rotate(-25)">
          <ellipse rx="12" ry="26" fill={color} stroke={dark} strokeWidth="1.2" />
          {[-16, -8, 0, 8, 16].map((y) =>
            [-6, 0, 6].map((x) => (
              <circle key={`${x}${y}`} cx={x} cy={y} r="2.2" fill={light} opacity=".85" />
            )),
          )}
          <path
            d="M-12 18c-8 2-12 10-10 14 8-1 16-6 20-14z"
            fill="#7bbf5b"
            stroke="#4d8a37"
            strokeWidth="1"
          />
        </g>
      );
    case "meat":
      return (
        <g>
          <path
            d="M-26 2c-2-14 12-22 26-20 16-2 28 8 24 22-4 12-18 16-28 14-14 0-20-6-22-16z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
          />
          <path
            d="M-12-4c6-4 14-4 20 0"
            stroke={light}
            strokeWidth="2"
            strokeLinecap="round"
            fill="none"
            opacity=".6"
          />
          <circle cx="-4" cy="8" r="2" fill={dark} opacity=".5" />
          <circle cx="12" cy="4" r="2" fill={dark} opacity=".5" />
        </g>
      );
    case "fish":
      return (
        <g>
          <path
            d="M-28 0c10-16 28-16 40 0-12 16-30 16-40 0z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
          />
          <path
            d="M12 0l16-12v24z"
            fill={color}
            stroke={dark}
            strokeWidth="1.2"
            strokeLinejoin="round"
          />
          <circle cx="-18" cy="-2" r="2" fill="#2a2a2a" />
          <path d="M-6-8c4 5 4 11 0 16" stroke={dark} strokeWidth="1.2" fill="none" opacity=".5" />
        </g>
      );
    case "pasta":
      return (
        <g fill="none" stroke={color} strokeWidth="5" strokeLinecap="round">
          <path d="M-26-10c10-10 14 10 26 0s16 10 26 0" />
          <path d="M-26 2c10-10 14 10 26 0s16 10 26 0" />
          <path d="M-26 14c10-10 14 10 26 0s16 10 26 0" />
        </g>
      );
  }
}

/** Miniatura do alimento para listas e botões. */
export function GlyphIcon({
  glyph,
  color,
  className = "size-10",
}: {
  glyph: Glyph;
  color: string;
  className?: string;
}) {
  return (
    <svg viewBox="-32 -32 64 64" className={className} aria-hidden="true">
      <GlyphShape glyph={glyph} color={color} />
    </svg>
  );
}

type DialProps = {
  glyph: Glyph;
  color: string;
  vessel: Vessel;
  qty: number;
  /** 0 a 1 */ progress: number;
  status: "idle" | "running" | "paused" | "done";
  label: string;
};

const LIQUID = new Set<Glyph>(["liquid"]);

/** Mostrador do timer: anel de progresso, marcas de minuto e a cena de cozimento. */
export function CookingDial({ glyph, color, vessel, qty, progress, status, label }: DialProps) {
  const uid = useId().replace(/:/g, "");
  const running = status === "running",
    done = status === "done";
  const ring = done ? "#5ed8c3" : `color-mix(in srgb, ${color} 70%, #fff)`;
  const heat = 0.55 + 0.45 * progress;
  const water = LIQUID.has(glyph) ? `color-mix(in srgb, ${color} 80%, #fff)` : "#4aa3c7";
  const bubbles = running ? 4 + Math.round(progress * 6) : 0;
  const count =
    glyph === "egg" || glyph === "fried" || glyph === "omelet"
      ? Math.min(qty, 5)
      : Math.min(Math.max(qty, 1), 3);
  const spots = [
    [140, 168],
    [112, 172],
    [168, 172],
    [126, 184],
    [154, 184],
  ];
  const frySpots = [
    [140, 158],
    [114, 162],
    [166, 162],
    [128, 172],
    [152, 172],
  ];
  return (
    <svg
      viewBox="0 0 280 280"
      role="img"
      aria-label={label}
      className={"block w-full " + (done ? "nv-done-pulse" : "")}
    >
      <defs>
        <clipPath id={`${uid}-scene`}>
          <circle cx="140" cy="140" r="104" />
        </clipPath>
        <clipPath id={`${uid}-water`}>
          <rect x="75" y="142" width="130" height="52" rx="4" />
        </clipPath>
        <radialGradient id={`${uid}-bg`} cx="50%" cy="38%" r="75%">
          <stop offset="0" stopColor="#16352d" />
          <stop offset="1" stopColor="#081a16" />
        </radialGradient>
        <linearGradient id={`${uid}-steel`} x1="0" x2="1">
          <stop offset="0" stopColor="#8f9ba1" />
          <stop offset=".45" stopColor="#dfe6e9" />
          <stop offset="1" stopColor="#7c898f" />
        </linearGradient>
        <linearGradient id={`${uid}-pan`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#3a4045" />
          <stop offset="1" stopColor="#1c2023" />
        </linearGradient>
      </defs>

      {/* anel de progresso e marcas */}
      <circle
        cx="140"
        cy="140"
        r="128"
        fill="none"
        stroke="#ffffff"
        strokeOpacity=".08"
        strokeWidth="8"
      />
      <circle
        cx="140"
        cy="140"
        r="128"
        fill="none"
        stroke={ring}
        strokeWidth="8"
        strokeLinecap="round"
        pathLength="100"
        opacity={progress > 0 ? 1 : 0}
        strokeDasharray={`${Math.max(0.001, progress * 100)} 100`}
        transform="rotate(-90 140 140)"
        style={{ transition: "stroke .4s" }}
      />
      {Array.from({ length: 60 }, (_, i) => {
        const a = (i / 60) * Math.PI * 2,
          major = i % 5 === 0,
          r1 = major ? 112 : 115,
          r2 = 120,
          lit = i / 60 < progress;
        return (
          <line
            key={i}
            x1={140 + Math.sin(a) * r1}
            y1={140 - Math.cos(a) * r1}
            x2={140 + Math.sin(a) * r2}
            y2={140 - Math.cos(a) * r2}
            stroke={lit ? ring : "#fff"}
            strokeOpacity={lit ? 0.95 : major ? 0.35 : 0.16}
            strokeWidth={major ? 2 : 1}
            strokeLinecap="round"
          />
        );
      })}

      <g clipPath={`url(#${uid}-scene)`}>
        <rect x="36" y="36" width="208" height="208" fill={`url(#${uid}-bg)`} />
        <rect x="36" y="224" width="208" height="20" fill="#0b2620" />

        {vessel === "panela" ? (
          <g>
            {/* vapor */}
            {(running || done === false) &&
              [112, 140, 168].map((x, i) => (
                <path
                  key={x}
                  d={`M${x} 112c-8-10 8-18 0-30s8-18 0-28`}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className={running ? "nv-steam" : ""}
                  style={{ opacity: running ? 0 : 0.12, animationDelay: `${i * 0.7}s` }}
                />
              ))}
            {/* cabos */}
            <rect x="60" y="130" width="18" height="8" rx="4" fill="#5b666b" />
            <rect x="202" y="130" width="18" height="8" rx="4" fill="#5b666b" />
            {/* corpo da panela em corte */}
            <path
              d="M72 118h136v70a12 12 0 0 1-12 12H84a12 12 0 0 1-12-12z"
              fill="#0d211c"
              stroke={`url(#${uid}-steel)`}
              strokeWidth="6"
              strokeLinejoin="round"
            />
            <g clipPath={`url(#${uid}-water)`}>
              <rect x="75" y="142" width="130" height="52" fill={water} opacity=".55" />
              <g
                className={running ? "nv-wave" : ""}
                style={{ animationDuration: `${4 - heat * 2}s` }}
              >
                <path
                  d="M-5 144q10-6 20 0t20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0 20 0V160H-5z"
                  fill={water}
                  opacity=".9"
                  transform="translate(75 0)"
                />
              </g>
              {Array.from({ length: bubbles }, (_, i) => (
                <circle
                  key={i}
                  cx={88 + ((i * 37) % 104)}
                  cy="190"
                  r={1.6 + (i % 3) * 0.8}
                  fill="#fff"
                  fillOpacity=".7"
                  className="nv-bubble"
                  style={{
                    animationDelay: `${(i * 0.37) % 2}s`,
                    animationDuration: `${2.2 - heat * 0.9}s`,
                  }}
                />
              ))}
              {Array.from({ length: count }, (_, i) => {
                const [x, y] = spots[i];
                return (
                  <g
                    key={i}
                    transform={`translate(${x} ${y}) scale(${glyph === "liquid" ? 0 : 0.62})`}
                  >
                    <g
                      className={running ? "nv-jiggle" : ""}
                      style={{ animationDelay: `${i * 0.3}s` }}
                    >
                      <GlyphShape glyph={glyph} color={color} />
                    </g>
                  </g>
                );
              })}
              {glyph === "liquid" && (
                <ellipse cx="140" cy="150" rx="52" ry="3" fill="#fff" opacity=".18" />
              )}
            </g>
            {glyph === "liquid" && (
              <g className={running ? "nv-stir" : ""} style={{ transformOrigin: "150px 96px" }}>
                <path d="M150 96l-12 78" stroke="#c18a52" strokeWidth="5" strokeLinecap="round" />
                <ellipse cx="137" cy="176" rx="6" ry="3" fill="#c18a52" />
              </g>
            )}
            {/* borda da panela por cima da água */}
            <path d="M68 118h144" stroke="#e6edef" strokeWidth="5" strokeLinecap="round" />
            {/* boca do fogão e chama */}
            <rect x="96" y="208" width="88" height="8" rx="3" fill="#2a3a36" />
            {running && (
              <g
                className="nv-flame"
                style={{ transformOrigin: "140px 208px", transform: `scale(${0.7 + heat * 0.4})` }}
              >
                <path
                  d="M140 176c-8 10-4 20-14 26 10 0 14 4 14 8 0-4 4-8 14-8-10-6-6-16-14-26z"
                  fill="#38bdf8"
                  opacity=".95"
                />
                <path
                  d="M118 208c4-8 2-12 8-16 0 6 6 8 6 16zM162 208c-4-8-2-12-8-16 0 6-6 8-6 16z"
                  fill="#2563eb"
                  opacity=".9"
                />
                <path d="M140 190c-4 6-2 12-6 18h12c-4-6-2-12-6-18z" fill="#e0f2fe" />
              </g>
            )}
          </g>
        ) : (
          <g>
            {running &&
              [116, 142, 168].map((x, i) => (
                <path
                  key={x}
                  d={`M${x} 140c-6-8 6-14 0-22`}
                  fill="none"
                  stroke="#fff"
                  strokeWidth="3"
                  strokeLinecap="round"
                  className="nv-steam"
                  style={{ animationDelay: `${i * 0.5}s`, opacity: 0 }}
                />
              ))}
            {/* cabo e frigideira em perspectiva */}
            <path d="M212 168l32 8" stroke="#2c3236" strokeWidth="9" strokeLinecap="round" />
            <path
              d="M60 156a80 20 0 0 1 160 0v14a80 20 0 0 1-160 0z"
              fill={`url(#${uid}-pan)`}
              stroke={`url(#${uid}-steel)`}
              strokeWidth="3"
            />
            <ellipse
              cx="140"
              cy="156"
              rx="74"
              ry="16"
              fill="#14181a"
              stroke="#4b555a"
              strokeWidth="1.5"
            />
            <ellipse
              cx="140"
              cy="156"
              rx="74"
              ry="16"
              fill="#f5b83a"
              opacity={running ? 0.07 + progress * 0.08 : 0.05}
            />
            {Array.from({ length: count }, (_, i) => {
              const [x, y] = frySpots[i];
              return (
                <g
                  key={i}
                  transform={`translate(${x} ${y}) scale(${glyph === "fried" || glyph === "disc" || glyph === "omelet" ? 0.55 : 0.5}, ${0.38})`}
                >
                  <g
                    className={running ? "nv-jiggle" : ""}
                    style={{ animationDelay: `${i * 0.3}s` }}
                  >
                    <GlyphShape glyph={glyph} color={color} />
                  </g>
                </g>
              );
            })}
            {running &&
              Array.from({ length: 6 }, (_, i) => (
                <circle
                  key={i}
                  cx={96 + i * 18}
                  cy={156 + (i % 2) * 6}
                  r="1.8"
                  fill="#fff"
                  className="nv-bubble"
                  style={{ animationDelay: `${i * 0.25}s`, animationDuration: ".9s" }}
                />
              ))}
            <rect x="96" y="200" width="88" height="8" rx="3" fill="#2a3a36" />
            {running && (
              <g
                className="nv-flame"
                style={{ transformOrigin: "140px 200px", transform: `scale(${0.6 + heat * 0.3})` }}
              >
                <path
                  d="M140 176c-8 10-4 16-14 22 10 0 14 4 14 8 0-4 4-8 14-8-10-6-6-12-14-22z"
                  fill="#38bdf8"
                  opacity=".95"
                />
                <path d="M140 188c-4 5-2 9-6 12h12c-4-3-2-7-6-12z" fill="#e0f2fe" />
              </g>
            )}
          </g>
        )}

        {status === "idle" && (
          <g opacity=".95">
            <circle cx="140" cy="100" r="24" fill="none" />
          </g>
        )}
      </g>

      {done && (
        <g>
          <circle cx="140" cy="140" r="104" fill="#042f26" opacity=".72" />
          <circle cx="140" cy="140" r="34" fill="#5ed8c3" />
          <path
            d="M124 141l11 11 22-24"
            fill="none"
            stroke="#042f26"
            strokeWidth="7"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </g>
      )}
    </svg>
  );
}
