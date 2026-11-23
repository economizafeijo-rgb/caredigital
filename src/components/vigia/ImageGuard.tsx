import { useEffect } from "react";

/** Dificulta salvar imagens do site: sem menu de contexto, sem arrastar e sem "salvar" por toque longo. */
export function ImageGuard() {
  useEffect(() => {
    const isImage = (t: EventTarget | null) =>
      t instanceof Element && !!t.closest("img, picture, video, canvas, [data-protect]");
    const onContext = (e: Event) => {
      if (isImage(e.target)) e.preventDefault();
    };
    const onDrag = (e: Event) => {
      if (isImage(e.target)) e.preventDefault();
    };
    document.addEventListener("contextmenu", onContext, true);
    document.addEventListener("dragstart", onDrag, true);
    return () => {
      document.removeEventListener("contextmenu", onContext, true);
      document.removeEventListener("dragstart", onDrag, true);
    };
  }, []);
  return null;
}
