import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ShoppingBag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { money, productStatus, type VendorProduct, type Vendor } from "@/lib/marketplace";
import { StoreLed } from "./store/StoreLed";

type LiveVendor = Pick<
  Vendor,
  | "id"
  | "name"
  | "slug"
  | "city"
  | "accent_hex"
  | "logo_url"
  | "verified"
  | "is_open"
  | "opening_hours"
>;
type LiveItem = VendorProduct & { vendor: LiveVendor };

/** Lojas ativas e os produtos delas, lidos do banco (somente leitura, sem login). */
export function useLiveStores() {
  const [vendors, setVendors] = useState<LiveVendor[]>([]);
  const [products, setProducts] = useState<LiveItem[]>([]);
  useEffect(() => {
    let alive = true;
    const db = supabase as any;
    void (async () => {
      const { data: vs } = await db
        .from("care_store_vendors")
        .select("id,name,slug,city,accent_hex,logo_url,verified,is_open,opening_hours")
        .eq("status", "ativo")
        .order("name")
        .limit(100);
      if (!alive) return;
      const list: LiveVendor[] = vs ?? [];
      setVendors(list);
      if (!list.length) return setProducts([]);
      const { data: ps } = await db
        .from("care_store_products")
        .select("*")
        .in(
          "vendor_id",
          list.map((v) => v.id),
        )
        .eq("active", true)
        .order("featured", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(200);
      if (!alive) return;
      const byId = new Map(list.map((v) => [v.id, v]));
      setProducts(
        (ps ?? [])
          .filter((p: VendorProduct) => byId.has(p.vendor_id))
          .map((p: VendorProduct) => ({ ...p, vendor: byId.get(p.vendor_id)! })),
      );
    })();
    return () => {
      alive = false;
    };
  }, []);
  return { vendors, products };
}

const offOf = (p: VendorProduct) =>
  p.old_price_cents ? Math.round((1 - p.price_cents / p.old_price_cents) * 100) : 0;

/** Trilho de produtos reais das lojas parceiras, com link para a loja de cada item. */
export function LiveProductRail({
  title = "Lojas parceiras",
  vendorSlug,
}: {
  title?: string;
  vendorSlug?: string;
}) {
  const { vendors, products } = useLiveStores();
  const items = useMemo(
    () => products.filter((p) => !vendorSlug || p.vendor.slug === vendorSlug).slice(0, 24),
    [products, vendorSlug],
  );
  if (!items.length) return null;
  return (
    <section
      aria-labelledby="live-stores-title"
      className="rounded-2xl border border-border bg-card p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="live-stores-title"
          className="flex items-center gap-2 font-display text-lg font-extrabold"
        >
          <ShoppingBag size={18} className="text-primary" aria-hidden="true" /> {title}
        </h2>
        <ul className="flex flex-wrap gap-1.5">
          {vendors.map((v) => (
            <li key={v.id}>
              <Link
                to="/loja"
                search={{ loja: v.slug } as never}
                className="inline-flex items-center gap-1.5 border border-border px-2.5 py-1 text-xs font-semibold hover:bg-muted"
              >
                <StoreLed open={!!v.is_open} />
                <span
                  className="size-2.5"
                  style={{ background: v.accent_hex ?? "#0e7a5f" }}
                  aria-hidden="true"
                />
                {v.name}
                {v.opening_hours && (
                  <span className="font-medium text-muted-foreground">· {v.opening_hours}</span>
                )}
                {v.verified && (
                  <BadgeCheck size={12} className="text-sky-600" aria-label="Loja verificada" />
                )}
              </Link>
            </li>
          ))}
        </ul>
      </header>
      <div className="mt-3 flex snap-x gap-3 overflow-x-auto pb-2 [scrollbar-width:thin]">
        {items.map((p) => {
          const st = productStatus(p);
          const off = offOf(p);
          return (
            <Link
              key={p.id}
              to="/loja"
              search={{ loja: p.vendor.slug } as never}
              aria-label={`${p.name}, ${money(p.price_cents)} · loja ${p.vendor.name}`}
              className="group flex w-[10.5rem] shrink-0 snap-start flex-col overflow-hidden border border-border bg-background transition hover:border-foreground/30"
            >
              <span className="relative block aspect-square overflow-hidden bg-[#f1f2f3]">
                {p.image_url ? (
                  <img
                    src={p.image_url}
                    alt=""
                    loading="lazy"
                    className={`size-full object-cover transition duration-500 group-hover:scale-105 ${st.buyable ? "" : "opacity-50 grayscale"}`}
                  />
                ) : (
                  <span className="grid size-full place-items-center text-xs text-muted-foreground">
                    Sem foto
                  </span>
                )}
                {off > 0 && (
                  <span className="absolute right-1.5 top-1.5 bg-emerald-800 px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                    {off}% off
                  </span>
                )}
                {!st.buyable && (
                  <span className="absolute left-1.5 top-1.5 bg-slate-900 px-1.5 py-0.5 text-[10.5px] font-bold text-white">
                    {st.label}
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col gap-0.5 p-2.5">
                <span
                  className="truncate text-[10.5px] font-semibold uppercase tracking-wide"
                  style={{ color: p.vendor.accent_hex ?? undefined }}
                >
                  {p.vendor.name}
                </span>
                <span className="line-clamp-2 min-h-[2.4em] text-[12.5px] font-semibold leading-tight">
                  {p.name}
                </span>
                <span className="mt-auto flex items-baseline gap-1.5 pt-1">
                  <strong className="text-sm font-extrabold tabular-nums">
                    {money(p.price_cents)}
                  </strong>
                  {p.old_price_cents && (
                    <span className="text-[10.5px] text-muted-foreground line-through">
                      {money(p.old_price_cents)}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-1 flex items-center justify-end gap-1 text-xs font-semibold text-primary">
        <Link to="/loja" className="inline-flex items-center gap-1 hover:underline">
          Ver todas as lojas <ArrowRight size={13} aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
