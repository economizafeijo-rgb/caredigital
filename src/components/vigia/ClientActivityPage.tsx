import { useEffect, useMemo, useState } from "react";
import { Activity, Bike, Clock3, Footprints, HeartPulse, Plus, Search, Waves, Dumbbell } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ActivityEntry = {
  id: string;
  happened_at: string;
  details: {
    activity_type?: string;
    title?: string;
    duration_minutes?: number;
    distance_km?: number | null;
    intensity?: string;
    notes?: string;
  } | null;
};

const activityOptions = [
  { value: "caminhada", label: "Caminhada", icon: Footprints },
  { value: "corrida", label: "Corrida", icon: Activity },
  { value: "ciclismo", label: "Ciclismo", icon: Bike },
  { value: "musculacao", label: "Musculação", icon: Dumbbell },
  { value: "natacao", label: "Natação", icon: Waves },
  { value: "outro", label: "Outra atividade", icon: HeartPulse },
] as const;
const formatDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Rio_Branco", day: "2-digit", month: "short", year: "numeric",
  hour: "2-digit", minute: "2-digit",
}).format(new Date(value));

export function ClientActivityPage({ patientId, ownerId, revision, onRecorded }: {
  patientId: string; ownerId: string; revision: number; onRecorded: () => void;
}) {
  const [items, setItems] = useState<ActivityEntry[]>([]);
  const [type, setType] = useState<(typeof activityOptions)[number]["value"]>("caminhada");
  const [duration, setDuration] = useState("30");
  const [distance, setDistance] = useState("");
  const [intensity, setIntensity] = useState("moderada");
  const [notes, setNotes] = useState("");
  const [filter, setFilter] = useState("todos");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    setLoading(true);
    void (async () => {
      try {
        const since = new Date(Date.now() - 90 * 86400000).toISOString();
        const result = await (supabase as any).from("care_activity_log")
          .select("id,happened_at,details")
          .eq("patient_id", patientId).eq("owner_id", ownerId)
          .eq("category", "atividade").eq("event_type", "logged")
          .gte("happened_at", since).order("happened_at", { ascending: false }).limit(200);
        if (!active) return;
        if (result.error) throw result.error;
        setItems(result.data ?? []);
        setError("");
      } catch {
        if (active) setError("Não foi possível carregar as atividades. Tente novamente em instantes.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [patientId, ownerId, revision]);

  const filtered = useMemo(() => items.filter(item => filter === "todos" || item.details?.activity_type === filter), [items, filter]);
  const totalMinutes = items.reduce((sum, item) => sum + (Number(item.details?.duration_minutes) || 0), 0);
  const totalDistance = items.reduce((sum, item) => sum + (Number(item.details?.distance_km) || 0), 0);
  const averageMinutes = items.length ? Math.round(totalMinutes / items.length) : 0;

  async function save() {
    const minutes = Number(duration);
    const km = distance.trim() === "" ? null : Number(distance.replace(",", "."));
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      setError("Informe uma duração entre 1 e 1.440 minutos."); return;
    }
    if (km !== null && (!Number.isFinite(km) || km < 0 || km > 500)) {
      setError("Informe uma distância válida entre 0 e 500 km."); return;
    }
    if (notes.trim().length > 500) { setError("As observações podem ter até 500 caracteres."); return; }
    setSaving(true); setError(""); setNotice("");
    try {
      const result = await (supabase as any).rpc("care_log_client_activity", {
        p_patient_id: patientId, p_activity_type: type, p_duration_minutes: minutes,
        p_distance_km: km, p_intensity: intensity, p_notes: notes.trim(),
      });
      if (result.error) throw result.error;
      setNotice("Atividade registrada no seu prontuário.");
      setDuration("30"); setDistance(""); setIntensity("moderada"); setNotes("");
      onRecorded();
    } catch {
      setError("Não foi possível registrar. Confira sua conexão e o acesso ao prontuário.");
    } finally {
      setSaving(false);
    }
  }

  return <section className="flex h-full min-h-0 flex-col gap-3" aria-label="Atividade física">
    <div className="grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-4">
      <article className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-[11px] font-semibold text-muted-foreground">Sessões registradas</span><strong className="mt-1 block text-xl font-bold tabular-nums">{items.length}</strong><span className="text-[11px] text-muted-foreground">Últimos 90 dias</span></article>
      <article className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-[11px] font-semibold text-muted-foreground">Tempo total</span><strong className="mt-1 block text-xl font-bold tabular-nums">{Math.floor(totalMinutes / 60)}h {totalMinutes % 60}min</strong><span className="text-[11px] text-muted-foreground">Duração registrada</span></article>
      <article className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-[11px] font-semibold text-muted-foreground">Distância total</span><strong className="mt-1 block text-xl font-bold tabular-nums">{totalDistance.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} km</strong><span className="text-[11px] text-muted-foreground">Quando informada</span></article>
      <article className="rounded-xl border border-border bg-muted/30 p-3"><span className="text-[11px] font-semibold text-muted-foreground">Média por sessão</span><strong className="mt-1 block text-xl font-bold tabular-nums">{averageMinutes} min</strong><span className="text-[11px] text-muted-foreground">Tempo médio</span></article>
    </div>

    <div className="grid min-h-0 flex-1 gap-3 lg:grid-cols-[minmax(280px,.8fr)_minmax(0,1.2fr)]">
      <section className="rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary"><Plus size={18}/></span><div><h3 className="text-sm font-bold">Registrar atividade</h3><p className="text-[11px] text-muted-foreground">O horário real é salvo automaticamente.</p></div></div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          {activityOptions.map(option => { const Icon = option.icon; return <button key={option.value} type="button" onClick={() => setType(option.value)} aria-pressed={type === option.value} className={`flex min-h-10 items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-xs font-semibold transition ${type === option.value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted"}`}><Icon size={15}/>{option.label}</button>; })}
        </div>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <label className="text-xs font-semibold">Duração (min)<input type="number" min="1" max="1440" step="1" value={duration} onChange={e => setDuration(e.target.value)} className="field mt-1 w-full"/></label>
          <label className="text-xs font-semibold">Distância (km)<input type="text" inputMode="decimal" value={distance} onChange={e => setDistance(e.target.value)} placeholder="Opcional" className="field mt-1 w-full"/></label>
          <label className="col-span-2 text-xs font-semibold">Intensidade<select value={intensity} onChange={e => setIntensity(e.target.value)} className="field mt-1 w-full"><option value="leve">Leve</option><option value="moderada">Moderada</option><option value="intensa">Intensa</option></select></label>
          <label className="col-span-2 text-xs font-semibold">Observações<textarea rows={2} maxLength={500} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Percurso, sensação ou detalhes (opcional)" className="field mt-1 w-full resize-y"/></label>
        </div>
        <button type="button" disabled={saving} onClick={() => void save()} className="mt-3 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving ? "Salvando…" : "Salvar atividade"}</button>
        {error && <p role="alert" className="mt-2 text-xs text-destructive">{error}</p>}
        {notice && <p role="status" className="mt-2 text-xs text-emerald-600">{notice}</p>}
      </section>

      <section className="flex min-h-0 flex-col rounded-2xl border border-border bg-card p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2"><div><h3 className="text-sm font-bold">Histórico de atividades</h3><p className="text-[11px] text-muted-foreground">Registros reais dos últimos 90 dias</p></div><label className="flex items-center gap-1.5 text-xs"><Search size={14}/><select value={filter} onChange={e => setFilter(e.target.value)} className="field h-9"><option value="todos">Todas</option>{activityOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label></div>
        <div className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
          {loading ? <p className="py-6 text-center text-xs text-muted-foreground">Carregando atividades…</p> : filtered.length === 0 ? <div className="rounded-xl border border-dashed border-border p-6 text-center"><Activity className="mx-auto text-muted-foreground" size={22}/><p className="mt-2 text-xs font-semibold">Nenhuma atividade registrada neste filtro.</p><p className="mt-1 text-[11px] text-muted-foreground">Seus registros aparecerão aqui depois de salvar uma atividade.</p></div> : filtered.map(item => {
            const detail = item.details ?? {};
            const option = activityOptions.find(entry => entry.value === detail.activity_type);
            const Icon = option?.icon ?? Activity;
            return <article key={item.id} className="flex items-start gap-3 rounded-xl border border-border/70 bg-muted/20 p-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={17}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center justify-between gap-1"><strong className="text-xs">{detail.title ?? option?.label ?? "Atividade"}</strong><time className="text-[11px] text-muted-foreground">{formatDate(item.happened_at)}</time></div><p className="mt-1 text-[11px] text-muted-foreground"><Clock3 className="mr-1 inline" size={12}/>{detail.duration_minutes ?? "—"} min{detail.distance_km != null ? ` · ${Number(detail.distance_km).toLocaleString("pt-BR")} km` : ""} · Intensidade {detail.intensity ?? "não informada"}</p>{detail.notes && <p className="mt-1 text-xs">{detail.notes}</p>}</div></article>;
          })}
        </div>
      </section>
    </div>
  </section>;
}
