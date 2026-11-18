import { useEffect, useMemo, useState, type ReactNode } from "react";
import { qrMatrix } from "@/lib/qr";
import { formatLeft, money, msLeft, ORDER_STATUS, PAYMENT_LABEL, type OrderStatus, type Vendor, type VendorOrder } from "@/lib/marketplace";

/** SVG do QR como texto (para imprimir ou baixar). */
export function qrSvgString(text: string, px = 220, color = "#0f172a") {
  const m = qrMatrix(text);
  const n = m.length; const q = 4; const total = n + q * 2;
  let rects = "";
  m.forEach((row, y) => row.forEach((on, x) => { if (on) rects += `<rect x="${x + q}" y="${y + q}" width="1.04" height="1.04"/>`; }));
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}" viewBox="0 0 ${total} ${total}" shape-rendering="crispEdges"><rect width="${total}" height="${total}" fill="#fff"/><g fill="${color}">${rects}</g></svg>`;
}

/** QR Code de qualquer link, com módulos arredondados e cantos destacados. */
export function QrImage({ text, size = 160, color = "#0f172a", label, className = "", badge }: { text: string; size?: number; color?: string; label?: string; className?: string; badge?: { initials: string; color: string; logo?: string | null } }) {
  const m = useMemo(() => { try { return qrMatrix(text); } catch { return null; } }, [text]);
  if (!m) return null;
  const n = m.length; const q = 3; const total = n + q * 2;
  const finder = (x: number, y: number) => (x < 7 && y < 7) || (x >= n - 7 && y < 7) || (x < 7 && y >= n - 7);
  return (
    <svg width={size} height={size} viewBox={`0 0 ${total} ${total}`} role="img" aria-label={label ?? `QR Code: ${text}`} className={className}>
      <rect width={total} height={total} rx="2" fill="#fff" />
      <g fill={color}>
        {m.flatMap((row, y) => row.map((on, x) => (on && !finder(x, y) ? <rect key={`${x}-${y}`} x={q + x + 0.06} y={q + y + 0.06} width=".88" height=".88" rx=".28" /> : null)))}
        {[[0, 0], [n - 7, 0], [0, n - 7]].map(([fx, fy]) => (
          <g key={`${fx}-${fy}`} fill={badge?.color ?? color}>
            <rect x={q + fx} y={q + fy} width="7" height="7" rx="1.6" />
            <rect x={q + fx + 1} y={q + fy + 1} width="5" height="5" rx="1.1" fill="#fff" />
            <rect x={q + fx + 2} y={q + fy + 2} width="3" height="3" rx=".8" />
          </g>
        ))}
      </g>
      {badge && (() => {
        const b = Math.round(n * 0.22); const x = q + (n - b) / 2;
        return (
          <g>
            <rect x={x - 0.8} y={x - 0.8} width={b + 1.6} height={b + 1.6} rx="2" fill="#fff" />
            {badge.logo ? <image href={badge.logo} x={x} y={x} width={b} height={b} preserveAspectRatio="xMidYMid slice" /> : <>
              <rect x={x} y={x} width={b} height={b} rx="1.6" fill={badge.color} />
              <text x={x + b / 2} y={x + b / 2 + b * 0.16} textAnchor="middle" fontSize={b * 0.44} fontWeight="800" fill="#fff" fontFamily="system-ui, sans-serif">{badge.initials}</text>
            </>}
          </g>
        );
      })()}
    </svg>
  );
}

/** Link curto da loja para divulgar: nextvita.life/?l=nome-da-loja */
export const shortStoreUrl = (slug: string) => `https://nextvita.life/?l=${encodeURIComponent(slug)}`;
export const initialsOf = (name: string) => name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

/** Gera o cartão da loja (1080×1920, para stories e status) com logo, nome, QR e link, e baixa em PNG. */
export async function downloadStoreCard(v: { name: string; slug: string; city?: string; accent_hex?: string | null; logo_url?: string | null; description?: string | null }) {
  const W = 1080, H = 1920, accent = v.accent_hex ?? "#0e7a5f", url = shortStoreUrl(v.slug);
  const c = document.createElement("canvas"); c.width = W; c.height = H; const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, W, H); grad.addColorStop(0, accent); grad.addColorStop(1, "#070b14");
  g.fillStyle = grad; g.fillRect(0, 0, W, H);
  g.fillStyle = "rgba(255,255,255,.06)"; for (let y = 40; y < H; y += 48) for (let x = 40; x < W; x += 48) { g.beginPath(); g.arc(x, y, 2, 0, 7); g.fill(); }
  const round = (x: number, y: number, w: number, h: number, r: number) => { g.beginPath(); g.roundRect(x, y, w, h, r); };
  // logo
  round(W / 2 - 110, 230, 220, 220, 56); g.fillStyle = "#fff"; g.fill();
  let drewLogo = false;
  if (v.logo_url) { try { const im = new Image(); im.crossOrigin = "anonymous"; im.src = v.logo_url; await im.decode(); g.save(); round(W / 2 - 100, 240, 200, 200, 48); g.clip(); g.drawImage(im, W / 2 - 100, 240, 200, 200); g.restore(); drewLogo = true; } catch { /* usa as iniciais */ } }
  if (!drewLogo) { g.fillStyle = accent; g.font = "800 96px system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(initialsOf(v.name), W / 2, 345); }
  g.textAlign = "center"; g.textBaseline = "alphabetic"; g.fillStyle = "#fff";
  g.font = "800 76px system-ui, sans-serif"; g.fillText(v.name, W / 2, 560, W - 120);
  g.font = "500 36px system-ui, sans-serif"; g.fillStyle = "rgba(255,255,255,.75)"; g.fillText(`Loja parceira NextVita${v.city ? ` · ${v.city}` : ""}`, W / 2, 620, W - 120);
  // QR
  round(W / 2 - 330, 720, 660, 660, 56); g.fillStyle = "#fff"; g.fill();
  const qr = new Image(); qr.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(qrSvgString(url, 600, "#0f172a")); await qr.decode();
  g.drawImage(qr, W / 2 - 300, 750, 600, 600);
  round(W / 2 - 66, 984, 132, 132, 28); g.fillStyle = "#fff"; g.fill(); round(W / 2 - 56, 994, 112, 112, 24); g.fillStyle = accent; g.fill();
  g.fillStyle = "#fff"; g.font = "800 50px system-ui, sans-serif"; g.textBaseline = "middle"; g.fillText(initialsOf(v.name), W / 2, 1052);
  g.textBaseline = "alphabetic"; g.fillStyle = "#fff"; g.font = "700 46px system-ui, sans-serif"; g.fillText("Aponte a câmera e compre", W / 2, 1480);
  round(W / 2 - 380, 1530, 760, 96, 48); g.fillStyle = "rgba(255,255,255,.14)"; g.fill();
  g.fillStyle = "#fff"; g.font = "600 40px ui-monospace, Menlo, monospace"; g.fillText(url.replace("https://", ""), W / 2, 1592, 720);
  g.fillStyle = "rgba(255,255,255,.6)"; g.font = "500 30px system-ui, sans-serif"; g.fillText("Pedido pelo app · retirada com código · WhatsApp", W / 2, 1760);
  const a = document.createElement("a"); a.href = c.toDataURL("image/png"); a.download = `cartao-${v.slug}.png`; a.click();
}

/** Links de compartilhamento nas redes. */
export function socialLinks(name: string, url: string) {
  const text = `Conheça a ${name} na NextVita`;
  return [
    { key: "whatsapp", label: "WhatsApp", color: "#25d366", href: `https://wa.me/?text=${encodeURIComponent(`${text}: ${url}`)}` },
    { key: "facebook", label: "Facebook", color: "#1877f2", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { key: "x", label: "X", color: "#0f172a", href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}` },
    { key: "telegram", label: "Telegram", color: "#229ed9", href: `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}` },
  ];
}

/** Baixa um QR como imagem PNG. */
export async function downloadQrPng(text: string, filename: string, color = "#0f172a") {
  const svg = qrSvgString(text, 1024, color);
  const img = new Image();
  img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
  await img.decode();
  const canvas = document.createElement("canvas"); canvas.width = 1024; canvas.height = 1024;
  canvas.getContext("2d")!.drawImage(img, 0, 0, 1024, 1024);
  const a = document.createElement("a"); a.href = canvas.toDataURL("image/png"); a.download = filename; a.click();
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string);
const fmtDate = (iso?: string | null) => (iso ? new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Rio_Branco", dateStyle: "short", timeStyle: "short" }) : "—");

/** Abre o comprovante do pedido para impressão (cupom 80 mm): código de retirada, QR e itens. */
export function printOrderTicket(order: VendorOrder, vendor: Pick<Vendor, "name" | "address" | "city" | "phone">, trackUrl: string) {
  const w = window.open("", "_blank", "width=420,height=720");
  if (!w) return false;
  const items = order.items.map((i) => `<tr><td>${i.qty}× ${esc(i.name)}</td><td class="r">${money(i.price_cents * i.qty)}</td></tr>`).join("");
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Pedido #${order.order_number ?? ""} · ${esc(vendor.name)}</title>
<style>
@page{size:80mm auto;margin:4mm}*{box-sizing:border-box}body{font:13px/1.35 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;color:#0f172a;margin:0;padding:12px;max-width:80mm}
h1{font-size:16px;margin:0}small{color:#475569}.c{text-align:center}.r{text-align:right}hr{border:0;border-top:1px dashed #94a3b8;margin:10px 0}
.code{font:800 34px/1 ui-monospace,Menlo,Consolas,monospace;letter-spacing:.18em;border:2px solid #0f172a;border-radius:10px;padding:10px 6px;margin:8px 0}
table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}.tot td{font-weight:800;font-size:15px;padding-top:6px}
.tag{display:inline-block;border:1px solid #0f172a;border-radius:99px;padding:1px 8px;font-size:11px;font-weight:700}
@media screen{body{margin:16px auto;box-shadow:0 10px 30px rgba(0,0,0,.12);border-radius:12px}}
</style></head><body>
<div class="c"><h1>${esc(vendor.name)}</h1><small>${esc([vendor.address, vendor.city].filter(Boolean).join(" · "))}<br>WhatsApp ${esc(vendor.phone)}</small></div><hr>
<div class="c"><span class="tag">${order.fulfillment === "retirada" ? "RETIRADA NA LOJA" : "ENTREGA"}</span>
<p style="margin:8px 0 0">Pedido <b>#${order.order_number ?? "—"}</b> · ${fmtDate(order.created_at)}</p>
<div class="code">${esc(order.pickup_code ?? "------")}</div>
<small>Apresente este código ${order.fulfillment === "retirada" ? "no balcão. Qualquer pessoa com ele pode retirar." : "ao entregador para confirmar o recebimento."}</small>
<div style="margin:10px auto 0;width:150px">${qrSvgString(trackUrl, 150)}</div><small>Acompanhe o pedido pelo QR</small></div><hr>
<p style="margin:0 0 6px"><b>Cliente:</b> ${esc(order.customer_name)}<br><b>Status:</b> ${esc(ORDER_STATUS[order.status as OrderStatus]?.label ?? order.status)}<br><b>Pagamento:</b> ${esc(PAYMENT_LABEL[order.payment_method] ?? order.payment_method)}${order.address ? `<br><b>Endereço:</b> ${esc(order.address)}` : ""}</p>
<table>${items}${order.delivery_fee_cents ? `<tr><td>Entrega</td><td class="r">${money(order.delivery_fee_cents)}</td></tr>` : ""}<tr class="tot"><td>Total</td><td class="r">${money(order.total_cents)}</td></tr></table>
${order.notes ? `<hr><small>${esc(order.notes)}</small>` : ""}<hr><p class="c"><small>Vendido pela plataforma NextVita · nextvita.life</small></p>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
  w.document.close();
  return true;
}

/** Cartaz da loja para imprimir: QR grande para o público abrir a vitrine. */
export function printStorePoster(vendor: Pick<Vendor, "name" | "city" | "phone">, url: string, accent = "#0e7a5f") {
  const w = window.open("", "_blank", "width=720,height=960");
  if (!w) return false;
  w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(vendor.name)} · QR da loja</title>
<style>@page{size:A4;margin:14mm}body{font:16px/1.4 ui-sans-serif,system-ui,Segoe UI,Roboto,Arial;color:#0f172a;text-align:center;margin:0;padding:40px}
h1{font-size:40px;margin:0 0 6px}.box{display:inline-block;padding:18px;border:3px solid ${accent};border-radius:28px;margin:28px 0}.u{font:600 15px ui-monospace,monospace;color:#334155}
.bar{height:10px;background:${accent};border-radius:99px;margin:0 auto 28px;width:120px}</style></head><body>
<div class="bar"></div><h1>${esc(vendor.name)}</h1><p>Aponte a câmera do celular para ver os produtos e comprar.</p>
<div class="box">${qrSvgString(url, 340, "#0f172a")}</div><p class="u">${esc(url.replace("https://", ""))}</p>
<p>${esc(vendor.city)} · WhatsApp ${esc(vendor.phone)}</p><p style="margin-top:36px;color:#64748b;font-size:13px">Loja parceira NextVita</p>
<script>window.onload=function(){setTimeout(function(){window.print()},250)}</script></body></html>`);
  w.document.close();
  return true;
}

/** Relógio que atualiza a cada 30 s (timers de entrega). */
export function useNow(step = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const t = window.setInterval(() => setNow(Date.now()), step); return () => window.clearInterval(t); }, [step]);
  return now;
}

/** Contador do prazo prometido: verde no prazo, âmbar perto do fim, vermelho atrasado. */
export function DeadlineChip({ order, now }: { order: VendorOrder; now: number }) {
  if (["entregue", "cancelado", "aguardando_pagamento"].includes(order.status)) return null;
  const left = msLeft(order.promised_at, now);
  if (left === null) return null;
  const total = order.paid_at && order.promised_at ? new Date(order.promised_at).getTime() - new Date(order.paid_at).getTime() : 1;
  const ratio = Math.max(0, Math.min(1, left / Math.max(total, 1)));
  const tone = left < 0 ? "text-rose-600 dark:text-rose-300 bg-rose-500/10" : ratio < 0.25 ? "text-amber-700 dark:text-amber-300 bg-amber-500/10" : "text-emerald-700 dark:text-emerald-300 bg-emerald-500/10";
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold tabular-nums ${tone}`} title={`Prazo: ${fmtDate(order.promised_at)}`}>
      <svg viewBox="0 0 20 20" className="size-3.5 -rotate-90" aria-hidden><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" /><circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="3" strokeDasharray={`${50.3 * ratio} 50.3`} strokeLinecap="round" /></svg>
      {left < 0 ? formatLeft(left) : `faltam ${formatLeft(left)}`}
    </span>
  );
}

export function StatusBadge({ status }: { status: OrderStatus }) {
  const s = ORDER_STATUS[status];
  return <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${s?.tone ?? "bg-muted"}`}>{s?.label ?? status}</span>;
}

export function Panel({ title, action, children, className = "" }: { title?: ReactNode; action?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-2xl border border-border bg-card ${className}`}>
      {(title || action) && <header className="flex items-center justify-between gap-2 border-b border-border px-4 py-3"><h2 className="text-sm font-bold">{title}</h2>{action}</header>}
      {children}
    </section>
  );
}

export { fmtDate };
export const inputCls = "mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm font-normal transition-colors focus:border-primary/60";
export const btn = {
  primary: "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary px-3.5 text-[13px] font-semibold text-primary-foreground transition hover:brightness-110 active:scale-[.98] disabled:opacity-50",
  ghost: "inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background px-3 text-[13px] font-semibold transition hover:bg-muted active:scale-[.98] disabled:opacity-50",
  icon: "grid size-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground",
};
