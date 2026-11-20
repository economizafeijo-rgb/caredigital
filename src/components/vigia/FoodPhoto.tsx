import { useEffect, useState } from "react";
import { ImageOff, Utensils } from "lucide-react";

type Found = { src: string; title: string; page: string } | null;
const cache = new Map<string, Found>();
const STORE = "nv-food-photo-v1:";

/** Tira detalhes de preparo para achar o alimento em si ("Abacate cru" → "abacate"). */
export function foodSearchTerm(name: string): string {
  return name
    .replace(/\(.*?\)/g, " ")
    .split(",")[0]
    .replace(
      /\b(cru|crua|cozido|cozida|assado|assada|frito|frita|grelhado|grelhada|refogado|refogada|com|sem|integral|desnatado|light|diet|enlatado|em conserva|temperado|natural)\b.*$/i,
      "",
    )
    .trim()
    .toLocaleLowerCase("pt-BR");
}

async function lookup(term: string, signal: AbortSignal): Promise<Found> {
  const url =
    "https://pt.wikipedia.org/w/api.php?action=query&format=json&origin=*&generator=search" +
    `&gsrlimit=4&gsrsearch=${encodeURIComponent(term + " alimento")}` +
    "&prop=pageimages&piprop=thumbnail&pithumbsize=640&pilicense=any";
  const res = await fetch(url, { signal });
  if (!res.ok) return null;
  const json = await res.json();
  const pages = Object.values(json?.query?.pages ?? {}) as any[];
  pages.sort((a, b) => (a.index ?? 9) - (b.index ?? 9));
  const hit = pages.find((p) => p.thumbnail?.source);
  return hit
    ? {
        src: hit.thumbnail.source,
        title: hit.title,
        page: `https://pt.wikipedia.org/wiki/${encodeURIComponent(String(hit.title).replace(/ /g, "_"))}`,
      }
    : null;
}

/** Foto do alimento, sempre no mesmo quadro 16:10, com carregamento suave e imagem de reserva. */
export function FoodPhoto({ name, className = "" }: { name: string; className?: string }) {
  const term = foodSearchTerm(name);
  const [found, setFound] = useState<Found | undefined>(() => cache.get(term));
  const [ready, setReady] = useState(false);
  useEffect(() => {
    setReady(false);
    if (!term) return setFound(null);
    if (cache.has(term)) return setFound(cache.get(term));
    try {
      const saved = localStorage.getItem(STORE + term);
      if (saved !== null) {
        const v = JSON.parse(saved) as Found;
        cache.set(term, v);
        return setFound(v);
      }
    } catch {
      /* sem armazenamento */
    }
    setFound(undefined);
    const ctl = new AbortController();
    lookup(term, ctl.signal)
      .then((v) => {
        cache.set(term, v);
        try {
          localStorage.setItem(STORE + term, JSON.stringify(v));
        } catch {
          /* sem armazenamento */
        }
        setFound(v);
      })
      .catch(() => {
        if (!ctl.signal.aborted) setFound(null);
      });
    return () => ctl.abort();
  }, [term]);
  return (
    <figure
      className={`group relative m-0 aspect-[16/10] w-full overflow-hidden border border-border bg-muted ${className}`}
    >
      {found === undefined && <span aria-hidden className="nv-shimmer absolute inset-0" />}
      {found && (
        <img
          key={found.src}
          src={found.src}
          alt={`Foto de ${name}`}
          loading="lazy"
          decoding="async"
          referrerPolicy="no-referrer"
          onLoad={() => setReady(true)}
          onError={() => setFound(null)}
          className={`absolute inset-0 size-full object-cover transition duration-700 group-hover:scale-105 ${ready ? "opacity-100" : "opacity-0"}`}
        />
      )}
      {found === null && (
        <span className="absolute inset-0 grid place-items-center text-muted-foreground">
          <span className="grid justify-items-center gap-1 text-[11px]">
            <span className="relative grid size-10 place-items-center border border-border bg-card">
              <Utensils size={18} />
              <ImageOff size={11} className="absolute -bottom-1 -right-1 bg-card" />
            </span>
            Sem foto disponível
          </span>
        </span>
      )}
      <figcaption className="pointer-events-none absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-gradient-to-t from-black/70 to-transparent px-2 pb-1 pt-4 text-[10px] text-white/85">
        <span className="truncate font-semibold">{name}</span>
        {found && <span className="shrink-0 opacity-80">Wikipédia</span>}
      </figcaption>
    </figure>
  );
}
