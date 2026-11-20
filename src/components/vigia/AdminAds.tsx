import { useEffect, useState } from "react";
import {
  CalendarRange,
  Eye,
  EyeOff,
  ImageIcon,
  Megaphone,
  Pencil,
  Plus,
  Trash2,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";

type Ad = {
  id: string;
  title: string;
  subtitle: string | null;
  cta_label: string | null;
  link_url: string | null;
  image_url: string | null;
  placement: "inicio" | "loja" | "cliente" | "lojista";
  vendor_id: string | null;
  starts_on: string | null;
  ends_on: string | null;
  priority: number;
  active: boolean;
};
type Draft = Omit<Ad, "id"> & { id?: string };
const PLACES: Record<Ad["placement"], string> = {
  inicio: "Página inicial",
  loja: "Loja virtual",
  cliente: "Área do cliente",
  lojista: "Página do lojista",
};
const empty: Draft = {
  title: "",
  subtitle: "",
  cta_label: "Saiba mais",
  link_url: "/loja",
  image_url: "",
  placement: "loja",
  vendor_id: null,
  starts_on: null,
  ends_on: null,
  priority: 50,
  active: true,
};
const today = () =>
  new Intl.DateTimeFormat("en-CA", { timeZone: "America/Rio_Branco" }).format(new Date());
const fmt = (d: string | null) => (d ? d.split("-").reverse().join("/") : "—");

function status(ad: Ad) {
  const t = today();
  if (!ad.active) return { label: "Pausada", cls: "bg-muted text-muted-foreground" };
  if (ad.starts_on && ad.starts_on > t)
    return { label: "Agendada", cls: "bg-sky-500/15 text-sky-700 dark:text-sky-300" };
  if (ad.ends_on && ad.ends_on < t)
    return { label: "Encerrada", cls: "bg-slate-500/15 text-slate-500" };
  return { label: "No ar", cls: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" };
}

/** Propagandas: banners por local da plataforma, com período, prioridade, pausa e prévia. */
export function AdminAds() {
  const dialog = useDialog();
  const [ads, setAds] = useState<Ad[] | null>(null);
  const [vendors, setVendors] = useState<{ id: string; name: string }[]>([]);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [reload, setReload] = useState(0);
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    void Promise.all([
      db
        .from("care_ads")
        .select("*")
        .order("priority", { ascending: false })
        .order("created_at", { ascending: false }),
      db.from("care_store_vendors").select("id,name").order("name"),
    ]).then(([a, v]: any[]) => {
      if (!active) return;
      if (a.error) setError("Não foi possível carregar as propagandas.");
      setAds(a.data ?? []);
      setVendors(v.data ?? []);
    });
    return () => {
      active = false;
    };
  }, [reload]); // eslint-disable-line react-hooks/exhaustive-deps

  function validate(d: Draft) {
    if (d.title.trim().length < 2) return "Informe um título (2 a 80 caracteres).";
    for (const [k, v] of [
      ["link", d.link_url],
      ["imagem", d.image_url],
    ] as const)
      if (v && !/^(https?:\/\/|\/)/i.test(v))
        return `O endereço de ${k} deve começar com https:// ou /.`;
    if (d.starts_on && d.ends_on && d.ends_on < d.starts_on)
      return "A data final não pode ser antes da inicial.";
    if (!Number.isInteger(d.priority) || d.priority < 0 || d.priority > 100)
      return "Prioridade entre 0 e 100.";
    return "";
  }
  async function save() {
    if (!draft) return;
    const problem = validate(draft);
    if (problem) {
      setError(problem);
      return;
    }
    if (
      !(await dialog.confirm(
        draft.id ? "Salvar alterações?" : "Publicar propaganda?",
        `"${draft.title.trim()}" em ${PLACES[draft.placement]}${draft.active ? "" : " (pausada)"}.`,
        false,
        draft.id ? "Salvar" : "Publicar",
      ))
    )
      return;
    setBusy(true);
    setError("");
    const row = {
      ...draft,
      title: draft.title.trim(),
      subtitle: draft.subtitle?.trim() || null,
      cta_label: draft.cta_label?.trim() || null,
      link_url: draft.link_url?.trim() || null,
      image_url: draft.image_url?.trim() || null,
      updated_at: new Date().toISOString(),
    };
    delete (row as any).id;
    const res = draft.id
      ? await db.from("care_ads").update(row).eq("id", draft.id)
      : await db.from("care_ads").insert(row);
    setBusy(false);
    if (res.error) {
      setError(res.error.message || "Não foi possível salvar.");
      return;
    }
    setDraft(null);
    setReload((n) => n + 1);
  }
  async function toggle(ad: Ad) {
    if (
      !(await dialog.confirm(
        ad.active ? "Pausar propaganda?" : "Reativar propaganda?",
        `"${ad.title}" ${ad.active ? "sai do ar até ser reativada" : "volta a aparecer no período definido"}.`,
        false,
        ad.active ? "Pausar" : "Reativar",
      ))
    )
      return;
    const res = await db
      .from("care_ads")
      .update({ active: !ad.active, updated_at: new Date().toISOString() })
      .eq("id", ad.id);
    if (res.error) setError(res.error.message);
    else setReload((n) => n + 1);
  }
  async function remove(ad: Ad) {
    if (
      !(await dialog.confirm(
        "Excluir definitivamente?",
        `A propaganda "${ad.title}" será apagada. Não dá para desfazer.`,
        true,
        "Excluir",
      ))
    )
      return;
    const res = await db.from("care_ads").delete().eq("id", ad.id);
    if (res.error) setError(res.error.message);
    else setReload((n) => n + 1);
  }

  const set = (patch: Partial<Draft>) => setDraft((d) => (d ? { ...d, ...patch } : d));
  const field = "mt-1 h-10 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return (
    <section
      aria-label="Propagandas"
      className="grid gap-3 rounded-2xl border border-border bg-card p-4 shadow-card sm:p-5"
    >
      <header className="flex flex-wrap items-center gap-3">
        <span className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-fuchsia-600 to-orange-500 text-white">
          <Megaphone size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="text-lg font-extrabold leading-tight">Propagandas</h2>
          <p className="text-xs text-muted-foreground">
            Banners da plataforma por local, com período, prioridade e pausa.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setDraft({ ...empty });
            setError("");
          }}
          className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-110 active:scale-[.97]"
        >
          <Plus size={16} /> Nova propaganda
        </button>
      </header>
      {error && (
        <p
          role="alert"
          className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
        >
          {error}
        </p>
      )}

      {draft && (
        <div className="grid gap-4 rounded-2xl border border-primary/30 bg-primary/[.04] p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-semibold sm:col-span-2">
              Título
              <input
                value={draft.title}
                maxLength={80}
                onChange={(e) => set({ title: e.target.value })}
                className={field}
                placeholder="Ex.: Semana do whey com 15% off"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Texto de apoio
              <input
                value={draft.subtitle ?? ""}
                maxLength={160}
                onChange={(e) => set({ subtitle: e.target.value })}
                className={field}
                placeholder="Uma frase curta sobre a oferta"
              />
            </label>
            <label className="text-xs font-semibold">
              Local
              <select
                value={draft.placement}
                onChange={(e) => set({ placement: e.target.value as Ad["placement"] })}
                className={field}
              >
                {Object.entries(PLACES).map(([k, v]) => (
                  <option key={k} value={k}>
                    {v}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Loja anunciante
              <select
                value={draft.vendor_id ?? ""}
                onChange={(e) => set({ vendor_id: e.target.value || null })}
                className={field}
              >
                <option value="">Plataforma NextVita</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs font-semibold">
              Botão
              <input
                value={draft.cta_label ?? ""}
                maxLength={30}
                onChange={(e) => set({ cta_label: e.target.value })}
                className={field}
              />
            </label>
            <label className="text-xs font-semibold">
              Link do botão
              <input
                value={draft.link_url ?? ""}
                onChange={(e) => set({ link_url: e.target.value })}
                className={field}
                placeholder="/loja ou https://…"
              />
            </label>
            <label className="text-xs font-semibold sm:col-span-2">
              Imagem (endereço)
              <input
                value={draft.image_url ?? ""}
                onChange={(e) => set({ image_url: e.target.value })}
                className={field}
                placeholder="/images/hero-suplementos.webp ou https://…"
              />
            </label>
            <label className="text-xs font-semibold">
              Início
              <input
                type="date"
                value={draft.starts_on ?? ""}
                onChange={(e) => set({ starts_on: e.target.value || null })}
                className={field}
              />
            </label>
            <label className="text-xs font-semibold">
              Fim
              <input
                type="date"
                value={draft.ends_on ?? ""}
                onChange={(e) => set({ ends_on: e.target.value || null })}
                className={field}
              />
            </label>
            <label className="text-xs font-semibold">
              Prioridade (0–100)
              <input
                type="number"
                min={0}
                max={100}
                value={draft.priority}
                onChange={(e) => set({ priority: Math.round(Number(e.target.value)) })}
                className={field}
              />
            </label>
            <label className="flex items-center gap-2 self-end rounded-xl border border-border bg-surface px-3 py-2.5 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(e) => set({ active: e.target.checked })}
              />{" "}
              No ar
            </label>
          </div>
          <div className="grid content-start gap-2">
            <p className="text-xs font-semibold text-muted-foreground">Prévia</p>
            <AdCard ad={{ ...draft, id: "preview" } as Ad} />
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() => setDraft(null)}
                className="inline-flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border border-border text-sm font-semibold hover:bg-muted"
              >
                <X size={15} /> Cancelar
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() => void save()}
                className="h-10 flex-1 rounded-xl bg-primary text-sm font-bold text-primary-foreground disabled:opacity-50"
              >
                {busy ? "Salvando…" : draft.id ? "Salvar" : "Publicar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {!ads ? (
        <div className="h-32 animate-pulse rounded-xl bg-muted" />
      ) : ads.length === 0 && !draft ? (
        <p className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
          Nenhuma propaganda cadastrada. Use <strong>Nova propaganda</strong> para criar o primeiro
          banner.
        </p>
      ) : (
        <ul className="grid gap-2">
          {ads.map((ad) => {
            const st = status(ad);
            return (
              <li
                key={ad.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface p-2.5"
              >
                <span className="grid size-14 shrink-0 place-items-center overflow-hidden rounded-lg bg-muted">
                  {ad.image_url ? (
                    <img src={ad.image_url} alt="" className="size-full object-cover" />
                  ) : (
                    <ImageIcon size={18} className="text-muted-foreground" />
                  )}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-sm">{ad.title}</strong>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${st.cls}`}>
                      {st.label}
                    </span>
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {PLACES[ad.placement]} ·{" "}
                    {ad.vendor_id
                      ? (vendors.find((v) => v.id === ad.vendor_id)?.name ?? "Loja")
                      : "Plataforma"}{" "}
                    · prioridade {ad.priority}
                  </p>
                  <p className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <CalendarRange size={12} /> {fmt(ad.starts_on)} até {fmt(ad.ends_on)}
                  </p>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => void toggle(ad)}
                    title={ad.active ? "Pausar" : "Reativar"}
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    {ad.active ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setDraft({ ...ad });
                      setError("");
                    }}
                    title="Editar"
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    type="button"
                    onClick={() => void remove(ad)}
                    title="Excluir"
                    className="grid size-9 place-items-center rounded-lg text-muted-foreground hover:bg-rose-500/10 hover:text-rose-600"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

/** Banner como aparece para o público. */
export function AdCard({
  ad,
}: {
  ad: Pick<Ad, "title" | "subtitle" | "cta_label" | "link_url" | "image_url">;
}) {
  return (
    <a
      href={ad.link_url || "#"}
      className="group relative isolate block overflow-hidden rounded-2xl bg-slate-900 p-4 text-white shadow-card"
    >
      {ad.image_url && (
        <img
          src={ad.image_url}
          alt=""
          aria-hidden
          className="absolute inset-0 -z-20 size-full object-cover transition-transform duration-700 group-hover:scale-105"
        />
      )}
      <span
        aria-hidden
        className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950/90 via-slate-900/70 to-transparent"
      />
      <span className="text-[10px] font-semibold text-white/60">Patrocinado</span>
      <strong className="mt-0.5 block text-lg font-extrabold leading-tight">
        {ad.title || "Título da propaganda"}
      </strong>
      {ad.subtitle && (
        <span className="mt-0.5 block max-w-xs text-xs text-white/80">{ad.subtitle}</span>
      )}
      {ad.cta_label && (
        <span className="mt-3 inline-flex h-8 items-center rounded-lg bg-white px-3 text-xs font-bold text-slate-900">
          {ad.cta_label}
        </span>
      )}
    </a>
  );
}

/** Mostra as propagandas ativas de um local (para usar nas páginas públicas). */
export function AdSlot({
  placement,
  className = "",
}: {
  placement: Ad["placement"];
  className?: string;
}) {
  const [ads, setAds] = useState<Ad[]>([]);
  useEffect(() => {
    let active = true;
    try {
      void (supabase as any)
        .from("care_ads")
        .select("*")
        .eq("placement", placement)
        .order("priority", { ascending: false })
        .limit(3)
        .then(
          (r: any) => {
            if (active) setAds(r?.data ?? []);
          },
          () => undefined,
        );
    } catch {
      /* sem cliente de dados */
    }
    return () => {
      active = false;
    };
  }, [placement]);
  if (!ads.length) return null;
  return (
    <div className={`grid gap-3 sm:grid-cols-2 xl:grid-cols-3 ${className}`}>
      {ads.map((ad) => (
        <AdCard key={ad.id} ad={ad} />
      ))}
    </div>
  );
}
