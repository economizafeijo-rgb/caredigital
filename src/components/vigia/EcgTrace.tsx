import { useEffect, useRef } from "react";

/** Traçado tipo eletrocardiograma desenhado a cada batida, no ritmo da frequência real. */
export function EcgTrace({
  bpm,
  color,
  running,
  className = "h-28 w-full",
}: {
  bpm: number;
  color: string;
  running: boolean;
  className?: string;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ bpm, color, running });
  live.current = { bpm, color, running };
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    let x = 0;
    let last = performance.now();
    let nextBeat = last;
    let beatT = -1;
    const ys: number[] = [];
    const resize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = Math.max(1, Math.round(r.width * devicePixelRatio));
      canvas.height = Math.max(1, Math.round(r.height * devicePixelRatio));
      ys.length = canvas.width;
      ys.fill(NaN);
      x = 0;
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    // Forma PQRST normalizada (0..1 do tempo da batida → altura).
    const wave = (p: number) => {
      if (p < 0.08) return 0.12 * Math.sin((p / 0.08) * Math.PI);
      if (p < 0.14) return 0;
      if (p < 0.17) return -0.18 * ((p - 0.14) / 0.03);
      if (p < 0.21) return -0.18 + 1.18 * ((p - 0.17) / 0.04);
      if (p < 0.25) return 1 - 1.35 * ((p - 0.21) / 0.04);
      if (p < 0.28) return -0.35 + 0.35 * ((p - 0.25) / 0.03);
      if (p < 0.4) return 0;
      if (p < 0.56) return 0.28 * Math.sin(((p - 0.4) / 0.16) * Math.PI);
      return 0;
    };
    const tick = (now: number) => {
      const { bpm: b, color: c, running: on } = live.current;
      const W = canvas.width,
        H = canvas.height,
        dpr = devicePixelRatio;
      const speed = 90 * dpr; // px por segundo
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const beatMs = 60000 / Math.max(30, b || 60);
      const steps = Math.max(1, Math.round(speed * dt));
      for (let i = 0; i < steps; i++) {
        const tNow = now - (steps - i) * (1000 / speed) * dpr;
        if (on && b > 0 && tNow >= nextBeat) {
          beatT = tNow;
          nextBeat = tNow + beatMs;
        }
        const p = beatT >= 0 ? (tNow - beatT) / Math.min(beatMs, 900) : 1;
        const v = on && b > 0 && p >= 0 && p <= 1 ? wave(p) : 0;
        ys[x] = H * 0.62 - v * H * 0.48;
        x = (x + 1) % W;
        for (let g = 0; g < 18 * dpr; g++) ys[(x + g) % W] = NaN; // espaço à frente do traço
      }
      ctx.clearRect(0, 0, W, H);
      ctx.lineWidth = 2.2 * dpr;
      ctx.lineJoin = "round";
      ctx.strokeStyle = c;
      ctx.shadowColor = c;
      ctx.shadowBlur = 12 * dpr;
      ctx.beginPath();
      let pen = false;
      for (let i = 0; i < W; i++) {
        const y = ys[i];
        if (Number.isNaN(y)) {
          pen = false;
          continue;
        }
        if (!pen) {
          ctx.moveTo(i, y);
          pen = true;
        } else ctx.lineTo(i, y);
      }
      ctx.stroke();
      // cabeça brilhante do traço
      const hy = ys[(x - 1 + W) % W];
      if (!Number.isNaN(hy)) {
        ctx.shadowBlur = 18 * dpr;
        ctx.fillStyle = "#fff";
        ctx.beginPath();
        ctx.arc((x - 1 + W) % W, hy, 2.6 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      if (!reduce) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, []);
  return <canvas ref={ref} className={className} aria-hidden="true" />;
}
