import { useEffect, useState } from "react";

/** Carrinho de cada loja parceira (guardado no aparelho): produto do banco e quantidade. */
export type VCartLine = { product_id: string; qty: number };
const key = (vendorId: string) => `nv-vcart-${vendorId}`;
const EVT = "nv-vcart";

export function readVCart(vendorId: string): VCartLine[] {
  try {
    return JSON.parse(window.localStorage.getItem(key(vendorId)) ?? "[]") as VCartLine[];
  } catch {
    return [];
  }
}
function write(vendorId: string, lines: VCartLine[]) {
  try {
    window.localStorage.setItem(key(vendorId), JSON.stringify(lines.filter((l) => l.qty > 0)));
  } catch {
    /* armazenamento indisponível */
  }
  window.dispatchEvent(new CustomEvent(EVT, { detail: vendorId }));
}
export const vcart = {
  add(vendorId: string, productId: string, max = 20) {
    const lines = readVCart(vendorId);
    const l = lines.find((x) => x.product_id === productId);
    if (l) l.qty = Math.min(max, l.qty + 1);
    else lines.push({ product_id: productId, qty: 1 });
    write(vendorId, lines);
  },
  setQty(vendorId: string, productId: string, qty: number) {
    write(
      vendorId,
      readVCart(vendorId).map((l) =>
        l.product_id === productId ? { ...l, qty: Math.max(0, Math.min(20, qty)) } : l,
      ),
    );
  },
  clear(vendorId: string) {
    write(vendorId, []);
  },
};

export function useVCart(vendorId: string) {
  const [lines, setLines] = useState<VCartLine[]>([]);
  useEffect(() => {
    setLines(readVCart(vendorId));
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
