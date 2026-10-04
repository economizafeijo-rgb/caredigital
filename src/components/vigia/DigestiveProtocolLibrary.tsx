import { useEffect, useMemo, useState } from "react";
import { loadDigestiveProtocols, type DigestiveProtocol } from "@/lib/digestive-protocols";
import { Panel, Tag } from "@/components/vigia/ui";

const categories = ["Todas", "Estômago", "Intestino", "Intolerância"] as const;

/** Shared, public, read-only digestives reference library. */
export function DigestiveProtocolLibrary() {
  const [protocols, setProtocols] = useState<DigestiveProtocol[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("Todas");
  const [selectedId, setSelectedId] = useState("");

  useEffect(() => {
    let cancelled = false;
    loadDigestiveProtocols()
      .then((rows) => {
        if (cancelled) return;
        setProtocols(rows);
        setSelectedId(rows.find((row) => row.id === "gastrite-h-pylori")?.id ?? rows[0]?.id ?? "");
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : "Erro ao carregar protocolos.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const visible = useMemo(
    () => category === "Todas" ? protocols : protocols.filter((item) => item.category === category),
    [category, protocols],
  );
  const selected = visible.find((item) => item.id === selectedId) ?? visible[0];

  return (
    <section aria-labelledby="digestive-protocols-title">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <div className="label-mono text-muted-foreground">Biblioteca pública · conteúdo com fontes</div>
          <h2 id="digestive-protocols-title" className="mt-2 font-display text-3xl tracking-tight md:text-4xl">Protocolos digestivos</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">Orientações educativas organizadas por condição, com cuidados e links para as fontes.</p>
        </div>
        <div className="flex flex-wrap gap-2" aria-label="Filtrar protocolos por área">
          {categories.map((item) => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}
              className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${category === item ? "bg-foreground text-primary-foreground" : "bg-foreground/5 text-muted-foreground hover:bg-foreground/10"}`}>
              {item}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-5 rounded-2xl border border-warning/30 bg-warning/10 p-4 text-sm leading-relaxed">
        Material educativo para apoiar a conversa com a equipe de saúde; não substitui diagnóstico nem prescrição. Na gastrite, a alimentação pode aliviar sintomas, mas não elimina causas como H. pylori.
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <div className="space-y-2">
          {loading && <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Carregando protocolos ativos…</p>}
          {!loading && error && <p role="alert" className="rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm">{error}</p>}
          {!loading && !error && visible.length === 0 && <p className="rounded-xl bg-foreground/5 p-4 text-sm text-muted-foreground">Nenhum protocolo ativo para este filtro.</p>}
          {visible.map((protocol) => (
            <button key={protocol.id} type="button" onClick={() => setSelectedId(protocol.id)} aria-pressed={selected?.id === protocol.id}
              className={`w-full rounded-xl p-4 text-left transition-colors ${selected?.id === protocol.id ? "bg-primary/10 ring-1 ring-primary/30" : "bg-foreground/5 hover:bg-foreground/10"}`}>
              <div className="flex items-center justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{protocol.category}</span>
                <span className="rounded-full bg-success/10 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-success">Ativo</span>
              </div>
              <div className="mt-1 text-sm font-semibold">{protocol.name}</div>
              <div className="mt-2 line-clamp-2 text-xs leading-relaxed text-muted-foreground">{protocol.summary}</div>
            </button>
          ))}
        </div>

        {selected && <Panel className="lg:col-span-2" delay={0.1}>
          <div className="flex flex-wrap items-center gap-2"><Tag tone="primary">{selected.category}</Tag><span className="text-xs text-muted-foreground">Atualizado em {new Date(`${selected.updated_at}T00:00:00`).toLocaleDateString("pt-BR")}</span></div>
          <h3 className="mt-3 font-display text-3xl tracking-tight">{selected.name}</h3>
          <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{selected.summary}</p>
          <h4 className="mt-6 label-mono">O que fazer</h4>
          <ol className="mt-3 space-y-3">
            {selected.guidance.map((item, index) => (
              <li key={item} className="flex items-start gap-3 rounded-xl bg-foreground/5 p-3 text-sm leading-relaxed">
                <span className="grid size-7 shrink-0 place-items-center rounded-lg bg-foreground font-mono text-xs text-primary-foreground">{index + 1}</span><span>{item}</span>
              </li>
            ))}
          </ol>
          <div className="mt-5 rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm leading-relaxed">
            <strong className="block text-foreground">Cuidados e limites</strong><span className="mt-1 block text-muted-foreground">{selected.caution}</span>
          </div>
          <div className="mt-5">
            <h4 className="label-mono">Fontes consultadas</h4>
            <ul className="mt-2 space-y-2">
              {selected.sources.map((source) => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary underline-offset-4 hover:underline">{source.label} ↗</a></li>)}
            </ul>
          </div>
        </Panel>}
      </div>

      <p className="mt-5 text-xs leading-relaxed text-muted-foreground">Procure atendimento urgente se houver vômito com sangue ou aspecto de borra de café, fezes negras, desmaio ou dor intensa. Dietas restritivas devem ter objetivo e prazo definidos com profissional de saúde.</p>
    </section>
  );
}
