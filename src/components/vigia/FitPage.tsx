import { useEffect, useRef, type ReactNode } from "react";

/**
 * Página fixa: em telas largas (>= 1024 px) o conteúdo ocupa exatamente a janela, sem barra de rolagem.
 * Mede a altura natural do conteúdo e, se ela não couber, reduz a escala proporcionalmente.
 * No celular não faz nada e a página rola normalmente.
 */
export function FitPage({
  children,
  className = "",
  reserve = 49,
  label,
}: {
  children: ReactNode;
  className?: string;
  reserve?: number;
  label?: string;
}) {
  const outer = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = outer.current;
    const content = inner.current;
    if (!box || !content) return;
    // Sempre o contêiner de rolagem real; um pai com altura automática faria a página encolher a cada medição.
    const main = (box.closest("#care-content") as HTMLElement | null) ?? box.parentElement;
    let frame = 0;
    document.body.dataset.fitPage = "1"; // o QR Code do rodapé some nestas páginas fixas (telas largas) para não criar rolagem
    const fit = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        if (window.innerWidth < 1024) {
          box.style.height = "";
          content.style.zoom = "";
          content.style.height = "";
          return;
        }
        const styles = main ? getComputedStyle(main) : null;
        const pad = styles ? parseFloat(styles.paddingTop) + parseFloat(styles.paddingBottom) : 0;
        const available = Math.floor((main?.clientHeight ?? window.innerHeight) - pad - reserve);
        if (available < 360) {
          // Medida inválida ou janela muito baixa: deixa a página fluir e rolar normalmente.
          box.style.height = "";
          content.style.zoom = "";
          content.style.height = "";
          return;
        }
        box.style.height = `${available}px`;
        content.style.zoom = "1";
        content.style.height = "auto";
        const natural = content.scrollHeight;
        const scale = natural > available ? Math.max(0.5, available / natural) : 1;
        content.style.zoom = String(scale);
        content.style.height = `${available / scale}px`;
      });
    };
    fit();
    const observer = new ResizeObserver(fit);
    if (main) observer.observe(main);
    window.addEventListener("resize", fit);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", fit);
      delete document.body.dataset.fitPage;
    };
  }, [reserve]);

  return (
    <div ref={outer} className="lg:overflow-hidden">
      <div
        ref={inner}
        className={className}
        {...(label ? { role: "region", "aria-label": label } : {})}
      >
        {children}
      </div>
    </div>
  );
}
