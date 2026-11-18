import { useEffect, useRef } from "react";

/**
 * Faz a página caber exatamente na janela em telas largas (>= 1024 px), sem barra de rolagem.
 * Mede a altura disponível abaixo do cabeçalho; se o conteúdo natural for maior, reduz a escala
 * (zoom) proporcionalmente e estica o container para ocupar a altura toda.
 */
export function useFitWindow<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    document.body.setAttribute("data-fit-page", "");
    const main = document.getElementById("care-content");
    let frame = 0;
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth < 1024) { el.style.zoom = ""; el.style.height = ""; return; }
        if (main) main.scrollTop = 0;
        const styles = main ? getComputedStyle(main) : null;
        const pad = styles ? parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) : 32;
        const available = Math.floor((main?.clientHeight ?? window.innerHeight - 56) - pad);
        el.style.zoom = "1";
        el.style.height = "auto";
        const natural = el.scrollHeight;
        const scale = natural > available ? Math.max(0.6, available / natural) : 1;
        el.style.zoom = String(scale);
        el.style.height = `${Math.floor(available / scale)}px`;
      });
    };
    fit();
    const late = window.setTimeout(fit, 400);
    window.addEventListener("resize", fit);
    document.fonts?.ready.then(fit).catch(() => undefined);
    return () => {
      cancelAnimationFrame(frame);
      window.clearTimeout(late);
      window.removeEventListener("resize", fit);
      document.body.removeAttribute("data-fit-page");
      el.style.zoom = "";
      el.style.height = "";
    };
  }, []);
  return ref;
}
