import { useEffect } from "react";

/**
 * Evita toques involuntários no celular: um toque só vale como clique se o dedo
 * ficou parado e a tela não estava rolando (toque para parar a rolagem não abre card).
 */
export function TapGuard() {
  useEffect(() => {
    let lastScroll = 0;
    let startX = 0;
    let startY = 0;
    let startAt = 0;
    let block = false;
    const onScroll = () => {
      lastScroll = Date.now();
    };
    const onDown = (e: PointerEvent) => {
      block = false;
      if (e.pointerType !== "touch") return;
      startX = e.clientX;
      startY = e.clientY;
      startAt = Date.now();
      block = startAt - lastScroll < 180;
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType !== "touch") return;
      const moved = Math.hypot(e.clientX - startX, e.clientY - startY) > 8;
      const scrolledDuring = lastScroll > startAt;
      block = block || moved || scrolledDuring;
      // O clique chega logo após o toque; se não chegar, o bloqueio expira.
      window.setTimeout(() => {
        block = false;
      }, 400);
    };
    const onClick = (e: MouseEvent) => {
      if (!block) return;
      block = false;
      e.preventDefault();
      e.stopPropagation();
    };
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    document.addEventListener("pointerdown", onDown, { capture: true, passive: true });
    document.addEventListener("pointerup", onUp, { capture: true, passive: true });
    document.addEventListener("click", onClick, { capture: true });
    return () => {
      document.removeEventListener("scroll", onScroll, true);
      document.removeEventListener("pointerdown", onDown, true);
      document.removeEventListener("pointerup", onUp, true);
      document.removeEventListener("click", onClick, true);
    };
  }, []);
  return null;
}
