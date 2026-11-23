/**
 * Compartilha um produto com a foto anexada quando o navegador aceita arquivos
 * (iPhone, Android e alguns navegadores de computador). Sem a Web Share API, copia o link.
 */
export type ShareResult = "shared" | "cancel" | "copied" | "failed";

export async function shareProductLink(opts: {
  url: string;
  title: string;
  text: string;
  image?: string | null;
  fileName?: string;
}): Promise<ShareResult> {
  const { url, title, text, image } = opts;
  if (typeof navigator !== "undefined" && typeof navigator.share === "function") {
    let files: File[] | undefined;
    if (image) {
      try {
        const blob = await fetch(image).then((r) => r.blob());
        const type = blob.type || "image/jpeg";
        const ext = (type.split("/")[1] || "jpg").replace("jpeg", "jpg").replace("+xml", "");
        const file = new File([blob], `${(opts.fileName || "produto").slice(0, 40)}.${ext}`, {
          type,
        });
        if (!type.includes("svg") && navigator.canShare?.({ files: [file] })) files = [file];
      } catch {
        files = undefined;
      }
    }
    try {
      await navigator.share(files ? { title, text, url, files } : { title, text, url });
      return "shared";
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return "cancel";
      try {
        await navigator.share({ title, text, url });
        return "shared";
      } catch (e2) {
        if (e2 instanceof DOMException && e2.name === "AbortError") return "cancel";
      }
    }
  }
  try {
    await navigator.clipboard.writeText(url);
    return "copied";
  } catch {
    return "failed";
  }
}
