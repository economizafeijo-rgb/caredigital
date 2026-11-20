import { useEffect, useRef, useState } from "react";

/**
 * Miniatura ao vivo de uma página do próprio site: um iframe em 1366 × 768 reduzido para caber no
 * espaço. Fica nítido em qualquer tela e sempre mostra a versão publicada. Não usar na página inicial
 * apontando para "/" (geraria miniaturas dentro de miniaturas).
 */
export function LiveSitePreview({
  src = "/",
  title,
  className = "",
}: {
  src?: string;
  title: string;
  className?: string;
}) {
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.3);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(([e]) => setScale(e.contentRect.width / 1366));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <div
      ref={box}
      className={`relative aspect-[16/9] w-full overflow-hidden bg-white ${className}`}
    >
      <iframe
        src={src}
        title={title}
        loading="lazy"
        tabIndex={-1}
        aria-hidden="true"
        className="pointer-events-none absolute left-0 top-0 origin-top-left border-0"
        style={{ width: 1366, height: 768, transform: `scale(${scale})` }}
      />
    </div>
  );
}
