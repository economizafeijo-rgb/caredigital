import { useEffect, useMemo, useState, type ReactNode } from "react";
import { AlertTriangle, BookOpen, Check, CheckCircle2, Clock, Pencil, Pill, Plus, Trash2, Undo2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { acreDateKey } from "@/lib/acre-time";
import { CareTimer } from "./CareTimer";

export type ClientMedication = { id: string; name: string; category: string; dose: string; times: string[]; instructions: string | null; active: boolean };
type Intake = { medication_id: string; taken_on: string; slot: string };
type LibraryMed = { name: string; dose: string; times: string[]; use: string; tip: string };
type Category = { key: string; label: string; image: string; gradient: string; meds: LibraryMed[] };

/** Biblioteca educativa: apresentações comuns no Brasil. A dose e o horário corretos são os da receita. */
export const medicationLibrary: Category[] = [
  { key: "dor", label: "Dor e febre", image: "/images/med-dor.webp", gradient: "from-rose-600 to-orange-500", meds: [
    { name: "Dipirona", dose: "500 mg", times: ["08:00", "14:00", "20:00"], use: "Dor e febre", tip: "Respeite o intervalo mínimo de 6 horas." },
    { name: "Paracetamol", dose: "750 mg", times: ["08:00", "16:00", "00:00"], use: "Dor e febre", tip: "Não ultrapasse a dose diária indicada; cuidado com o fígado." },
    { name: "Ibuprofeno", dose: "400 mg", times: ["08:00", "16:00"], use: "Dor e inflamação", tip: "Tome após as refeições para proteger o estômago." }] },
  { key: "estomago", label: "Estômago e digestão", image: "/images/med-estomago.webp", gradient: "from-emerald-600 to-teal-500", meds: [
    { name: "Omeprazol", dose: "20 mg", times: ["07:00"], use: "Gastrite e refluxo", tip: "Em jejum, 30 minutos antes do café da manhã." },
    { name: "Lansoprazol", dose: "30 mg", times: ["07:00"], use: "Gastrite e úlcera", tip: "Em jejum, antes do café da manhã." },
    { name: "Domperidona", dose: "10 mg", times: ["07:30", "11:30", "18:30"], use: "Náusea e digestão lenta", tip: "15 a 30 minutos antes das refeições." }] },
  { key: "coracao", label: "Pressão e coração", image: "/images/med-coracao.webp", gradient: "from-sky-600 to-indigo-500", meds: [
    { name: "Losartana", dose: "50 mg", times: ["08:00"], use: "Pressão alta", tip: "Tome sempre no mesmo horário." },
    { name: "Hidroclorotiazida", dose: "25 mg", times: ["08:00"], use: "Pressão alta (diurético)", tip: "Prefira pela manhã para não interromper o sono." },
    { name: "Sinvastatina", dose: "20 mg", times: ["21:00"], use: "Colesterol", tip: "Costuma ser tomada à noite." }] },
  { key: "diabetes", label: "Diabetes", image: "/images/caredigital-medicamentos.webp", gradient: "from-violet-600 to-fuchsia-500", meds: [
    { name: "Metformina", dose: "850 mg", times: ["08:00", "20:00"], use: "Diabetes tipo 2", tip: "Junto ou logo após as refeições." },
    { name: "Glibenclamida", dose: "5 mg", times: ["07:30"], use: "Diabetes tipo 2", tip: "Antes do café da manhã; não pule refeições." }] },
  { key: "alergia", label: "Alergia e respiração", image: "/images/med-alergia.webp", gradient: "from-amber-500 to-orange-500", meds: [
    { name: "Loratadina", dose: "10 mg", times: ["08:00"], use: "Alergia e rinite", tip: "Uma vez ao dia; causa pouca sonolência." },
    { name: "Dexclorfeniramina", dose: "2 mg", times: ["08:00", "16:00", "22:00"], use: "Alergia", tip: "Pode dar sono: evite dirigir." }] },
  { key: "antibiotico", label: "Antibióticos", image: "/images/med-antibiotico.webp", gradient: "from-pink-600 to-rose-500", meds: [
    { name: "Amoxicilina", dose: "500 mg", times: ["06:00", "14:00", "22:00"], use: "Infecções bacterianas", tip: "Complete todos os dias do tratamento, mesmo se melhorar." },
    { name: "Azitromicina", dose: "500 mg", times: ["08:00"], use: "Infecções bacterianas", tip: "Uma vez ao dia, pelo número de dias da receita." }] },
];
const categoryOf = (key: string) => medicationLibrary.find(c => c.key === key);

const localKey = (id: string, kind: string) => `caredigital-medications-${kind}-${id}`;
const readLocal = <T,>(key: string): T[] => { try { return JSON.parse(localStorage.getItem(key) ?? "[]"); } catch { return []; } };
const writeLocal = (key: string, value: unknown) => { try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* indisponível */ } };

/** Valida e normaliza o cadastro; devolve a mensagem de erro ou os dados prontos. */
export function validateMedication(draft: Partial<ClientMedication>): { error: string } | { value: Omit<ClientMedication, "id"> } {
  const name = (draft.name ?? "").trim(), dose = (draft.dose ?? "").trim();
  const times = Array.from(new Set((draft.times ?? []).filter(t => /^\d{2}:\d{2}$/.test(t)))).sort();
  if (name.length < 2) return { error: "Informe o nome do medicamento." };
  if (!dose) return { error: "Informe a dose (ex.: 500 mg, 1 comprimido)." };
  if (!times.length) return { error: "Adicione pelo menos um horário." };
  if (times.length > 8) return { error: "Use no máximo 8 horários por dia." };
  return { value: { name, dose, times, category: draft.category ?? "outros", instructions: draft.instructions?.trim() || null, active: draft.active ?? true } };
}

function ConfirmDialog({ title, children, confirmLabel, danger, onConfirm, onCancel }: { title: string; children: ReactNode; confirmLabel: string; danger?: boolean; onConfirm: () => void; onCancel: () => void }) {
  return <div className="fixed inset-0 z-[100] grid place-items-center bg-slate-950/65 p-4 backdrop-blur-sm" role="alertdialog" aria-modal="true" aria-label={title}>
    <div className="w-full max-w-md overflow-hidden rounded-3xl bg-card shadow-2xl">
      <div className={`flex items-center gap-3 p-5 text-white ${danger ? "bg-gradient-to-r from-rose-600 to-red-500" : "bg-gradient-to-r from-rose-600 to-pink-500"}`}>
        {danger ? <AlertTriangle size={26}/> : <CheckCircle2 size={26}/>}<h3 className="text-lg font-bold">{title}</h3>
      </div>
      <div className="p-5 text-sm">{children}
        <div className="mt-5 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-border px-5 text-sm font-bold hover:bg-muted">Cancelar</button>
          <button type="button" autoFocus onClick={onConfirm} className={`h-11 rounded-xl px-5 text-sm font-bold text-white shadow-sm hover:brightness-110 ${danger ? "bg-red-600" : "bg-gradient-to-r from-rose-600 to-pink-500"}`}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  </div>;
}

type Pending = { kind: "save"; value: Omit<ClientMedication, "id">; id?: string } | { kind: "delete"; med: ClientMedication } | { kind: "take"; med: ClientMedication; slot: string; taken: boolean };

export function ClientMedicationManager({ patientId, ownerId }: { patientId: string; ownerId: string }) {
  const [meds, setMeds] = useState<ClientMedication[]>([]);
  const [intakes, setIntakes] = useState<Intake[]>([]);
  const [remote, setRemote] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [draft, setDraft] = useState<Partial<ClientMedication> | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);
  const [category, setCategory] = useState(medicationLibrary[0].key);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reload, setReload] = useState(0);
  const day = acreDateKey();
  const db = supabase as any;

  useEffect(() => {
    let active = true;
    void Promise.all([
      db.from("care_client_medications").select("id,name,category,dose,times,instructions,active").eq("patient_id", patientId).eq("owner_id", ownerId).order("created_at"),
      db.from("care_client_medication_intakes").select("medication_id,taken_on,slot").eq("patient_id", patientId).eq("owner_id", ownerId).eq("taken_on", day),
    ]).then(([m, i]: any[]) => {
      if (!active) return;
      if (m.error || i.error) { setRemote(false); setMeds(readLocal(localKey(patientId, "list"))); setIntakes(readLocal<Intake>(localKey(patientId, "intakes")).filter(x => x.taken_on === day)); }
      else { setRemote(true); setMeds(m.data ?? []); setIntakes(i.data ?? []); }
      setLoaded(true);
    });
    return () => { active = false; };
  }, [patientId, ownerId, day, reload]);

  const doses = useMemo(() => {
    const taken = new Set(intakes.map(i => `${i.medication_id}|${i.slot}`));
    return meds.filter(m => m.active).flatMap(med => med.times.map(slot => ({ med, slot, at: Date.parse(`${day}T${slot}:00-05:00`), taken: taken.has(`${med.id}|${slot}`) }))).sort((a, b) => a.at - b.at);
  }, [meds, intakes, day]);
  const next = doses.find(d => !d.taken && d.at >= Date.now() - 60 * 60_000);
  const done = doses.filter(d => d.taken).length;

  function requestSave() {
    if (!draft) return;
    const result = validateMedication(draft);
    if ("error" in result) return setMessage({ ok: false, text: result.error });
    setMessage(null); setPending({ kind: "save", value: result.value, id: draft.id });
  }

  async function confirm() {
    if (!pending) return;
    const p = pending; setPending(null);
    let error: unknown = null, text = "";
    if (p.kind === "save") {
      if (remote) error = (p.id ? await db.from("care_client_medications").update(p.value).eq("id", p.id) : await db.from("care_client_medications").insert({ ...p.value, patient_id: patientId, owner_id: ownerId })).error;
      else writeLocal(localKey(patientId, "list"), p.id ? meds.map(m => m.id === p.id ? { ...m, ...p.value } : m) : [...meds, { ...p.value, id: crypto.randomUUID() }]);
      text = `${p.value.name} ${p.id ? "atualizado" : "cadastrado"} com ${p.value.times.length} horário(s).`; setDraft(null);
    } else if (p.kind === "delete") {
      if (remote) error = (await db.from("care_client_medications").delete().eq("id", p.med.id)).error;
      else writeLocal(localKey(patientId, "list"), meds.filter(m => m.id !== p.med.id));
      text = `${p.med.name} excluído.`;
    } else {
      if (remote) error = (p.taken ? await db.from("care_client_medication_intakes").delete().eq("medication_id", p.med.id).eq("taken_on", day).eq("slot", p.slot)
        : await db.from("care_client_medication_intakes").insert({ medication_id: p.med.id, patient_id: patientId, owner_id: ownerId, taken_on: day, slot: p.slot })).error;
      else { const all = readLocal<Intake>(localKey(patientId, "intakes")).filter(x => x.taken_on === day);
        writeLocal(localKey(patientId, "intakes"), p.taken ? all.filter(x => !(x.medication_id === p.med.id && x.slot === p.slot)) : [...all, { medication_id: p.med.id, taken_on: day, slot: p.slot }]); }
      text = p.taken ? `Registro de ${p.med.name} (${p.slot}) desfeito.` : `${p.med.name} ${p.med.dose} das ${p.slot} registrado como tomado.`;
    }
    setMessage(error ? { ok: false, text: "Não foi possível concluir. Tente novamente." } : { ok: true, text });
    setReload(v => v + 1);
  }

  const cat = categoryOf(category)!;
  const field = "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm";
  return <section className="mt-5 flex flex-col gap-4" aria-label="Meus medicamentos">
    {!remote && loaded && <p role="status" className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm">Modo local: seus medicamentos estão salvos neste navegador até a atualização do banco ser aplicada.</p>}
    <div className="grid gap-4 lg:grid-cols-2">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950 via-rose-900 to-pink-800 p-5 text-white shadow-card">
        <div className="flex items-center justify-between gap-2"><p className="text-xs font-bold uppercase tracking-[.14em] text-white/70">Próxima dose</p><span className="rounded-full bg-white/15 px-3 py-1 text-xs font-semibold">{done} de {doses.length} hoje</span></div>
        <div className="mt-4">{next ? <CareTimer target={next.at} title={`${next.med.name} · ${next.med.dose}`} subtitle={next.med.instructions ?? "Conforme a receita"} tone="med" dark windowMs={3 * 3600_000}/>
          : <p className="py-5 text-base text-white/85">{doses.length ? "Todas as doses de hoje foram registradas." : "Cadastre seus medicamentos para ativar o timer."}</p>}</div>
        {next && <button type="button" onClick={() => setPending({ kind: "take", med: next.med, slot: next.slot, taken: false })} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-rose-900 hover:bg-white/90"><CheckCircle2 size={18}/> Registrar dose</button>}
      </div>
      <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
        <div className="flex items-center justify-between gap-2"><h3 className="flex items-center gap-2 text-lg font-bold"><Clock size={20} className="text-rose-500"/> Horários de hoje</h3>
          <button type="button" onClick={() => { setMessage(null); setDraft({ times: ["08:00"], category: "outros" }); }} className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 px-4 text-sm font-bold text-white shadow-sm hover:brightness-110"><Plus size={17}/> Novo medicamento</button></div>
        <ul className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1">
          {doses.length === 0 && <li className="rounded-xl border border-dashed border-border p-5 text-center text-sm text-muted-foreground">Nenhum horário. Use <strong>Novo medicamento</strong> ou escolha na biblioteca abaixo.</li>}
          {doses.map(({ med, slot, taken, at }) => <li key={med.id + slot} className={`flex items-center gap-3 rounded-2xl border p-3 ${taken ? "border-emerald-500/30 bg-emerald-500/[.06]" : at < Date.now() ? "border-amber-500/40 bg-amber-500/[.06]" : "border-border"}`}>
            <span className={`grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-to-br text-white ${categoryOf(med.category)?.gradient ?? "from-rose-600 to-pink-500"}`}><Pill size={18}/></span>
            <span className="min-w-0 flex-1"><strong className="block truncate text-sm">{med.name}</strong><span className="text-xs text-muted-foreground">{slot} · {med.dose}{!taken && at < Date.now() ? " · atrasada" : ""}</span></span>
            <button type="button" onClick={() => setPending({ kind: "take", med, slot, taken })} className={`inline-flex h-10 items-center gap-1.5 rounded-xl px-3 text-sm font-bold ${taken ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-gradient-to-r from-rose-600 to-pink-500 text-white"}`}>{taken ? <><Undo2 size={15}/> Tomado</> : <><Check size={16}/> Tomar</>}</button>
          </li>)}
        </ul>
      </div>
    </div>
    {message && !draft && <p role="status" className={`rounded-xl px-3 py-2 text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-destructive/10 text-destructive"}`}>{message.text}</p>}

    {meds.length > 0 && <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-lg font-bold"><Pill size={20} className="text-rose-500"/> Meus medicamentos</h3>
      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{meds.map(med => <article key={med.id} className="rounded-2xl border border-border p-4">
        <strong className="block truncate">{med.name}</strong><span className="text-sm text-muted-foreground">{med.dose} · {categoryOf(med.category)?.label ?? "Outros"}</span>
        <div className="mt-2 flex flex-wrap gap-1.5">{med.times.map(t => <span key={t} className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-700 dark:text-rose-300">{t}</span>)}</div>
        {med.instructions && <p className="mt-2 text-sm text-muted-foreground">{med.instructions}</p>}
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={() => { setMessage(null); setDraft(med); }} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold hover:bg-muted"><Pencil size={14}/> Editar</button>
          <button type="button" onClick={() => setPending({ kind: "delete", med })} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-semibold text-destructive hover:bg-destructive/10"><Trash2 size={14}/> Excluir</button>
        </div>
      </article>)}</div>
    </div>}

    <div className="rounded-3xl border border-border bg-card p-5 shadow-card">
      <h3 className="flex items-center gap-2 text-lg font-bold"><BookOpen size={20} className="text-amber-500"/> Biblioteca de medicamentos</h3>
      <p className="text-sm text-muted-foreground">Escolha uma categoria e adicione à sua lista. Ajuste dose e horários conforme a sua receita.</p>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">{medicationLibrary.map(c => <button key={c.key} type="button" aria-pressed={category === c.key} onClick={() => setCategory(c.key)}
        className={`group relative isolate h-24 overflow-hidden rounded-2xl text-left text-white shadow-sm transition ${category === c.key ? "ring-4 ring-rose-500/50" : "hover:-translate-y-0.5"}`}>
        <img src={c.image} alt="" loading="lazy" className="absolute inset-0 -z-20 h-full w-full object-cover transition duration-500 group-hover:scale-105"/>
        <span aria-hidden="true" className={`absolute inset-0 -z-10 bg-gradient-to-t opacity-60 ${c.gradient}`}/>
        <span className="absolute inset-x-3 bottom-2 text-sm font-bold leading-tight drop-shadow">{c.label}<span className="block text-xs font-medium text-white/80">{c.meds.length} medicamentos</span></span>
      </button>)}</div>
      <div className="mt-4 grid gap-3 md:grid-cols-3">{cat.meds.map(m => <article key={m.name} className="flex flex-col rounded-2xl border border-border p-4">
        <span className={`h-1.5 w-12 rounded-full bg-gradient-to-r ${cat.gradient}`}/>
        <strong className="mt-2 text-base">{m.name} <span className="text-sm font-semibold text-muted-foreground">{m.dose}</span></strong>
        <span className="text-sm text-muted-foreground">{m.use}</span>
        <p className="mt-2 flex-1 text-sm">{m.tip}</p>
        <p className="mt-2 text-xs text-muted-foreground">Horários comuns: {m.times.join(", ")}</p>
        <button type="button" onClick={() => { setMessage(null); setDraft({ name: m.name, dose: m.dose, times: m.times, category: cat.key, instructions: m.tip }); }}
          className={`mt-3 inline-flex h-10 items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r px-4 text-sm font-bold text-white hover:brightness-110 ${cat.gradient}`}><Plus size={16}/> Adicionar</button>
      </article>)}</div>
      <p className="mt-3 text-xs text-muted-foreground">Conteúdo educativo. Use medicamentos somente com orientação médica ou farmacêutica; não altere doses por conta própria.</p>
    </div>

    {draft && <div className="fixed inset-0 z-[90] grid place-items-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Cadastro de medicamento">
      <div className="w-full max-w-md rounded-3xl bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between"><h3 className="text-lg font-bold">{draft.id ? "Editar medicamento" : "Novo medicamento"}</h3>
          <button type="button" onClick={() => setDraft(null)} aria-label="Fechar" className="grid size-9 place-items-center rounded-lg hover:bg-muted"><X size={18}/></button></div>
        <div className="mt-4 grid gap-3 text-sm font-semibold">
          <label>Nome<input className={field} value={draft.name ?? ""} onChange={e => setDraft({ ...draft, name: e.target.value })} placeholder="Ex.: Losartana"/></label>
          <div className="grid grid-cols-2 gap-3">
            <label>Dose<input className={field} value={draft.dose ?? ""} onChange={e => setDraft({ ...draft, dose: e.target.value })} placeholder="Ex.: 50 mg"/></label>
            <label>Categoria<select className={field} value={draft.category ?? "outros"} onChange={e => setDraft({ ...draft, category: e.target.value })}>{medicationLibrary.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}<option value="outros">Outros</option></select></label>
          </div>
          <div>Horários<div className="mt-1 flex flex-wrap gap-2">
            {(draft.times ?? []).map((t, i) => <span key={i} className="inline-flex items-center rounded-xl border border-border bg-surface pl-2">
              <input type="time" value={t} onChange={e => { const times = [...(draft.times ?? [])]; times[i] = e.target.value; setDraft({ ...draft, times }); }} className="h-10 bg-transparent"/>
              <button type="button" aria-label="Remover horário" onClick={() => setDraft({ ...draft, times: (draft.times ?? []).filter((_, j) => j !== i) })} className="grid size-9 place-items-center text-muted-foreground hover:text-destructive"><X size={14}/></button></span>)}
            {(draft.times ?? []).length < 8 && <button type="button" onClick={() => setDraft({ ...draft, times: [...(draft.times ?? []), "12:00"] })} className="inline-flex h-10 items-center gap-1 rounded-xl border border-dashed border-border px-3 hover:bg-muted"><Plus size={14}/> Horário</button>}
          </div></div>
          <label>Orientações<textarea rows={2} maxLength={300} className="mt-1 block w-full rounded-xl border border-border bg-surface p-3" value={draft.instructions ?? ""} onChange={e => setDraft({ ...draft, instructions: e.target.value })} placeholder="Ex.: em jejum, após o almoço…"/></label>
          {message && !message.ok && <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-destructive">{message.text}</p>}
          <button type="button" onClick={requestSave} className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-600 to-pink-500 text-base font-bold text-white hover:brightness-110"><Check size={18}/> {draft.id ? "Salvar alterações" : "Cadastrar medicamento"}</button>
        </div>
      </div>
    </div>}

    {pending?.kind === "save" && <ConfirmDialog title={pending.id ? "Confirmar alterações?" : "Confirmar cadastro?"} confirmLabel={pending.id ? "Sim, salvar" : "Sim, cadastrar"} onConfirm={() => void confirm()} onCancel={() => setPending(null)}>
      <p><strong>{pending.value.name}</strong> · {pending.value.dose}</p><p className="mt-1">Horários: <strong>{pending.value.times.join(", ")}</strong></p>
      <p className="mt-2 text-muted-foreground">Confira se a dose e os horários estão iguais aos da sua receita.</p></ConfirmDialog>}
    {pending?.kind === "delete" && <ConfirmDialog danger title="Excluir medicamento?" confirmLabel="Sim, excluir" onConfirm={() => void confirm()} onCancel={() => setPending(null)}>
      <p><strong>{pending.med.name}</strong> ({pending.med.dose}) e todos os seus horários e registros de dose serão removidos. Esta ação não pode ser desfeita.</p></ConfirmDialog>}
    {pending?.kind === "take" && <ConfirmDialog title={pending.taken ? "Desfazer registro?" : "Confirmar dose tomada?"} confirmLabel={pending.taken ? "Sim, desfazer" : "Sim, tomei"} onConfirm={() => void confirm()} onCancel={() => setPending(null)}>
      <p><strong>{pending.med.name}</strong> · {pending.med.dose} · horário das <strong>{pending.slot}</strong></p>
      <p className="mt-2 text-muted-foreground">{pending.taken ? "A dose voltará a aparecer como pendente." : "Confirme apenas se você realmente tomou esta dose. Não dobre doses esquecidas."}</p></ConfirmDialog>}
  </section>;
}
