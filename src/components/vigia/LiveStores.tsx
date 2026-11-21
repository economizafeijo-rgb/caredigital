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
  | "segment"
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
        .select("id,name,slug,segment,city,accent_hex,logo_url,verified,is_open,opening_hours")
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
  showStoreNames = true,
}: {
  title?: string;
  vendorSlug?: string;
  /** Mostra a lista de lojas com horário ao lado do título. A homepage esconde e leva à página de parceiros. */
  showStoreNames?: boolean;
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
      className="rounded-3xl border border-fuchsia-300/15 bg-gradient-to-br from-[#2b0f3d] via-[#3a1250] to-[#1d1236] p-4 text-white shadow-[0_20px_50px_-30px_rgba(200,29,107,.6)] sm:p-6"
    >
      <header className="flex flex-wrap items-center justify-between gap-2">
        <h2
          id="live-stores-title"
          className="flex items-center gap-2 font-display text-xl font-extrabold text-white"
        >
          <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-[#e8368f] to-[#8b5cf6] text-white">
            <ShoppingBag size={16} aria-hidden="true" />
          </span>{" "}
          {title}
        </h2>
        {!showStoreNames && (
          <Link
            to="/nossos-parceiros"
            className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3.5 py-1.5 text-sm font-bold text-white ring-1 ring-white/25 transition hover:bg-white/20"
          >
            Conheça os parceiros <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
          </Link>
        )}
        <ul className={showStoreNames ? "flex flex-wrap gap-1.5" : "hidden"}>
          {vendors.map((v) => (
            <li key={v.id}>
              <Link
                to="/loja"
                search={{ loja: v.slug } as never}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/20 px-2.5 py-1 text-xs font-semibold text-white hover:bg-white/10"
              >
                <StoreLed open={!!v.is_open} />
                <span
                  className="size-2.5"
                  style={{ background: v.accent_hex ?? "#0e7a5f" }}
                  aria-hidden="true"
                />
                {v.name}
                {v.opening_hours && (
                  <span className="font-medium text-white/70">· {v.opening_hours}</span>
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
              className="group flex w-[11rem] shrink-0 snap-start flex-col overflow-hidden rounded-2xl bg-[#fffafd] text-[#2b0f3d] shadow-[0_10px_24px_-14px_rgba(0,0,0,.6)] ring-1 ring-white/40 transition duration-300 hover:-translate-y-1 hover:ring-2 hover:ring-[#f06bb0]"
            >
              <span className="relative block aspect-square overflow-hidden bg-[#f6eef3]">
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
                  <span className="absolute right-2 top-2 rounded-full bg-gradient-to-r from-[#d81b7a] to-[#9b4bd6] px-2 py-0.5 text-[11px] font-extrabold text-white shadow">
                    {off}% off
                  </span>
                )}
                {!st.buyable && (
                  <span className="absolute left-2 top-2 rounded-full bg-[#4b2a5e] px-2 py-0.5 text-[11px] font-bold text-white">
                    {st.label}
                  </span>
                )}
              </span>
              <span className="flex flex-1 flex-col gap-0.5 border-t border-[#f0dce8] p-3">
                <span
                  className="truncate text-[11.5px] font-bold"
                  style={{ color: p.vendor.accent_hex ?? "#a3195b" }}
                >
                  {p.vendor.name}
                </span>
                <span className="line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-snug text-[#2b0f3d]">
                  {p.name}
                </span>
                <span className="mt-auto flex items-baseline gap-1.5 pt-1">
                  <strong className="text-[15px] font-extrabold tabular-nums text-[#a3195b]">
                    {money(p.price_cents)}
                  </strong>
                  {p.old_price_cents && (
                    <span className="text-[11px] text-[#7a6a85] line-through">
                      {money(p.old_price_cents)}
                    </span>
                  )}
                </span>
              </span>
            </Link>
          );
        })}
      </div>
      <p className="mt-2 flex items-center justify-end gap-1 text-sm font-bold text-[#ffc2e0]">
        <Link
          to="/loja"
          className="inline-flex items-center gap-1.5 hover:text-white hover:underline"
        >
          Ver todas as lojas <ArrowRight size={15} strokeWidth={2.6} aria-hidden="true" />
        </Link>
      </p>
    </section>
  );
}
