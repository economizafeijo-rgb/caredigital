import { QR_MATRIX, QR_URLS, type QrVariant } from "@/lib/qr-data";

/** QR Code da marca NextVita: módulos arredondados, cantos em anel e logo no centro (correção de erro H). */
export function QrCode({ variant, size = 160, logo = true, className = "" }: { variant: QrVariant; size?: number; logo?: boolean; className?: string }) {
  const rows = QR_MATRIX[variant];
  const n = rows.length;
  const quiet = 3;
  const total = n + quiet * 2;
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  const mid = (n - 1) / 2;
  const inLogo = (x: number, y: number) => logo && Math.abs(x - mid) <= 4 && Math.abs(y - mid) <= 4;
  const dots: { x: number; y: number }[] = [];
  rows.forEach((row, y) => { for (let x = 0; x < n; x += 1) if (row[x] === "1" && !finder(x, y) && !inLogo(x, y)) dots.push({ x, y }); });
  const corners = [[0, 0], [n - 7, 0], [0, n - 7]];
  const c = quiet + mid - 3.5; // canto do quadrado da logo (9x9 módulos, logo com 7x7)
  return (
    <svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={`QR Code para abrir o NextVita em ${QR_URLS[variant].replace("https://", "")}`} className={className} shapeRendering="geometricPrecision">
      <defs><linearGradient id={`qr-${variant}`} gradientUnits="userSpaceOnUse" x1="0" y1="0" x2={total} y2={total}><stop offset="0" stopColor="#022c22" /><stop offset="1" stopColor="#0b6b57" /></linearGradient></defs>
      <rect width={total} height={total} rx="2" fill="#fff" />
      <g fill={`url(#qr-${variant})`}>
        {dots.map(({ x, y }) => <rect key={`${x}-${y}`} x={quiet + x} y={quiet + y} width="1.02" height="1.02" rx="0.2" />)}
        {corners.map(([fx, fy]) => (
          <g key={`${fx}-${fy}`}>
            <rect x={quiet + fx} y={quiet + fy} width="7" height="7" rx="0.8" />
            <rect x={quiet + fx + 1} y={quiet + fy + 1} width="5" height="5" rx="0.5" fill="#fff" />
            <rect x={quiet + fx + 2} y={quiet + fy + 2} width="3" height="3" rx="0.4" />
          </g>
        ))}
      </g>
      {logo && (
        <g>
          <rect x={c - 1} y={c - 1} width="9" height="9" rx="2.2" fill="#fff" />
          <image href="/caredigital-icon.svg" x={c} y={c} width="7" height="7" />
        </g>
      )}
    </svg>
  );
}
