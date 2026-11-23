import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Carrinho de cada loja parceira.
 * - Fica no aparelho para todos; para quem está logado também é salvo na conta
 *   (tabela care_store_carts) e volta em qualquer aparelho.
 * - Nunca passa do estoque disponível (o limite vem de productStatus().max).
 * - Visitante sem login: 1 unidade por produto e até GUEST_MAX_ITEMS produtos diferentes.
 */
export type VCartLine = { product_id: string; qty: number };
export type AddResult = "added" | "max" | "guest-unit" | "guest-items" | "unavailable";

export const GUEST_MAX_ITEMS = 5;
const key = (vendorId: string) => `nv-vcart-${vendorId}`;
const EVT = "nv-vcart";

type Db = {
  from: (t: string) => {
    select: (c: string) => {
      eq: (
        k: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: { lines: VCartLine[] } | null }> };
    };
    upsert: (row: Record<string, unknown>) => Promise<unknown>;
  };
};
const db = supabase as unknown as Db;

let userId: string | null = null;
let authReady: Promise<void> | null = null;
function ensureAuth() {
  if (!authReady && typeof window !== "undefined") {
    authReady = supabase.auth.getSession().then(({ data }) => {
      userId = data.session?.user?.id ?? null;
    });
    supabase.auth.onAuthStateChange((_e, s) => {
      userId = s?.user?.id ?? null;
    });
  }
  return authReady ?? Promise.resolve();
}
export const isSignedIn = () => !!userId;

export function readVCart(vendorId: string): VCartLine[] {
  try {
    const raw = JSON.parse(window.localStorage.getItem(key(vendorId)) ?? "[]") as VCartLine[];
    return Array.isArray(raw)
      ? raw.filter((l) => l && typeof l.product_id === "string" && l.qty > 0)
      : [];
  } catch {
    return [];
  }
}

const pushTimers = new Map<string, number>();
function push(vendorId: string, lines: VCartLine[]) {
  if (!userId) return;
  window.clearTimeout(pushTimers.get(vendorId));
  pushTimers.set(
    vendorId,
    window.setTimeout(() => {
      void db
        .from("care_store_carts")
        .upsert({ vendor_id: vendorId, lines, updated_at: new Date().toISOString() });
    }, 500),
  );
}

function write(vendorId: string, lines: VCartLine[], sync = true) {
  const clean = lines.filter((l) => l.qty > 0);
  try {
    window.localStorage.setItem(key(vendorId), JSON.stringify(clean));
  } catch {
    /* armazenamento indisponível */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: vendorId }));
  if (sync) push(vendorId, clean);
}

export const vcart = {
  /** Adiciona 1 unidade respeitando estoque (max) e as regras de visitante. */
  add(vendorId: string, productId: string, max = 20): AddResult {
    if (max <= 0) return "unavailable";
    const lines = readVCart(vendorId);
    const l = lines.find((x) => x.product_id === productId);
    if (!userId) {
      if (l) return "guest-unit";
      if (lines.length >= GUEST_MAX_ITEMS) return "guest-items";
    }
    if (l) {
      if (l.qty >= max) return "max";
      l.qty += 1;
    } else lines.push({ product_id: productId, qty: 1 });
    write(vendorId, lines);
    return "added";
  },
  /** Define a quantidade, sem passar do estoque (max). Visitante fica em 1 unidade. */
  setQty(vendorId: string, productId: string, qty: number, max = 20) {
    const cap = userId ? max : Math.min(1, max);
    write(
      vendorId,
      readVCart(vendorId).map((l) =>
        l.product_id === productId ? { ...l, qty: Math.max(0, Math.min(cap, qty)) } : l,
      ),
    );
  },
  remove(vendorId: string, productId: string) {
    write(
      vendorId,
      readVCart(vendorId).filter((l) => l.product_id !== productId),
    );
  },
  clear(vendorId: string) {
    write(vendorId, []);
  },
};

/** Junta o carrinho do aparelho com o salvo na conta (fica a maior quantidade de cada item). */
async function pull(vendorId: string) {
  await ensureAuth();
  if (!userId) return;
  const { data } = await db
    .from("care_store_carts")
    .select("lines")
    .eq("vendor_id", vendorId)
    .maybeSingle();
  const server = Array.isArray(data?.lines) ? data.lines : [];
  const local = readVCart(vendorId);
  const merged = new Map<string, number>();
  [...server, ...local].forEach((l) => {
    if (l && typeof l.product_id === "string" && l.qty > 0)
      merged.set(l.product_id, Math.max(merged.get(l.product_id) ?? 0, Math.min(20, l.qty)));
  });
  const lines = [...merged].map(([product_id, qty]) => ({ product_id, qty }));
  write(vendorId, lines, JSON.stringify(lines) !== JSON.stringify(server));
}

export function useVCart(vendorId: string) {
  const [lines, setLines] = useState<VCartLine[]>([]);
  useEffect(() => {
    setLines(readVCart(vendorId));
    void pull(vendorId);
    const on = (e: Event) => {
      if ((e as CustomEvent).detail === vendorId) setLines(readVCart(vendorId));
    };
    const storage = (e: StorageEvent) => {
      if (e.key === key(vendorId)) setLines(readVCart(vendorId));
    };
    window.addEventListener(EVT, on);
    window.addEventListener("storage", storage);
    return () => {
      window.removeEventListener(EVT, on);
      window.removeEventListener("storage", storage);
    };
  }, [vendorId]);
  return lines;
}

/** Sabe se o cliente está logado (para as regras de visitante). */
export function useSignedIn() {
  const [signed, setSigned] = useState(false);
  useEffect(() => {
    void ensureAuth().then(() => setSigned(!!userId));
    const { data } = supabase.auth.onAuthStateChange((_e, s) => setSigned(!!s?.user));
    return () => data.subscription.unsubscribe();
  }, []);
  return signed;
}
