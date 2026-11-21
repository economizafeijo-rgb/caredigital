import { useEffect, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Package } from "lucide-react";
import { categoryName, money, productStatus, type VendorProduct } from "@/lib/marketplace";

const CARD_W = 320;
const CARD_H = 480;

/**
 * Ao passar o mouse (ou focar com o teclado) sobre o produto, mostra um cartão com a imagem
 * ampliada e os detalhes do produto. Fica fora da tabela, então não é cortado pelo layout.
 */
export function ProductHover({
  product,
  children,
}: {
  product: VendorProduct;
  children: ReactNode;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  // Fecha ao rolar: a posição calculada deixa de valer.
  useEffect(() => {
    if (!pos) return;
    const close = () => setPos(null);
    window.addEventListener("scroll", close, true);
    return () => window.removeEventListener("scroll", close, true);
  }, [pos]);

  function open(el: HTMLElement) {
    const r = el.getBoundingClientRect();
    let left = r.right + 12;
    if (left + CARD_W > window.innerWidth - 8) left = Math.max(8, r.left - CARD_W - 12);
    const top = Math.max(8, Math.min(r.top, window.innerHeight - CARD_H - 8));
    setPos({ top, left });
  }

  return (
    <>
      <div
        tabIndex={0}
        onMouseEnter={(e) => open(e.currentTarget)}
        onMouseLeave={() => setPos(null)}
        onFocus={(e) => open(e.currentTarget)}
        onBlur={() => setPos(null)}
        className="min-w-0 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {children}
      </div>
      {pos &&
        createPortal(
          <PreviewCard product={product} style={{ top: pos.top, left: pos.left }} />,
          document.body,
        )}
    </>
  );
}

function PreviewCard({ product: p, style }: { product: VendorProduct; style: CSSProperties }) {
  const st = productStatus(p);
  const ids = [p.code, p.sku, categoryName(p.category)].filter(Boolean).join(" · ");
  return (
    <div
      role="tooltip"
      style={{ ...style, width: CARD_W }}
      className="pointer-events-none fixed z-[130] overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
    >
      <div className="grid aspect-square place-items-center bg-muted">
        {p.image_url ? (
          <img src={p.image_url} alt={p.name} className="size-full object-cover" />
        ) : (
          <Package size={40} className="text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="grid gap-2 p-4 text-sm">
        <div>
          <p className="font-extrabold leading-tight">{p.name}</p>
          <p className="text-xs tabular-nums text-muted-foreground">{ids}</p>
        </div>
        <p className="flex flex-wrap items-baseline gap-2">
          <strong className="text-lg tabular-nums">{money(p.price_cents)}</strong>
          {p.old_price_cents ? (
            <span className="text-xs text-muted-foreground line-through tabular-nums">
              {money(p.old_price_cents)}
            </span>
          ) : null}
        </p>
        <p className="text-xs">
          <span className="font-semibold">{st.label}</span> · estoque {p.stock}
          {p.min_stock ? ` · mínimo ${p.min_stock}` : ""}
          {p.display_limit ? ` · até ${p.display_limit} por pedido` : ""}
        </p>
        {!!p.colors?.length && (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
            {p.colors.map((c) => (
              <li key={c.name} className="flex items-center gap-1">
                <span
                  className="size-3 rounded-full border border-border"
                  style={{ background: c.hex }}
                  aria-hidden="true"
                />
                {c.name} · {c.stock}
              </li>
            ))}
          </ul>
        )}
        {p.description && (
          <p className="line-clamp-3 text-xs text-muted-foreground">{p.description}</p>
        )}
      </div>
    </div>
  );
}
