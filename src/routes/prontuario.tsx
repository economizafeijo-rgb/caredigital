import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { ClipboardList, Droplets, HeartPulse, Plus, CheckCircle2, Circle, Bell, Clock3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Btn, Panel, PageHeader } from "@/components/vigia/ui";

export const Route = createFileRoute("/prontuario")({
  head: () => ({ meta: [{ title: "Prontuário de acompanhamento — CareDigital" }] }),
  component: Prontuario,
});

type Client = { id: string; full_name: string; birth_date: string | null; condition_notes: string | null; status: string; contact_email: string | null; weight_kg: number | null; height_cm: number | null; care_goal: string | null };
type Task = { id: string; patient_id: string; category: string; scheduled_at: string; title: string; notes: string | null; completed_at: string | null };
type Observation = { id: string; patient_id: string; observation_type: string; numeric_value: number | null; unit: string | null; notes: string | null; recorded_at: string };

// Explicit runtime schemas are maintained in supabase/caredigital_schema.sql and migrations.
// The generated Database type should be regenerated when the backend migrations are synchronized.
const db = supabase as unknown as { from: (table: string) => any; auth: typeof supabase.auth };
const fmt = (iso: string) => new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short", timeZone: "America/Rio_Branco" }).format(new Date(iso));

function Prontuario() {
  const [owner, setOwner] = useState<string | null>(null);
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [observations, setObservations] = useState<Observation[]>([]);
  const [water, setWater] = useState<{id:string;amount_ml:number;recorded_at:string}[]>([]);
  const [waterMl, setWaterMl] = useState("200");
  const [waterBusy, setWaterBusy] = useState(false);
  const [observationType, setObservationType] = useState("peso");
  const [observationValue, setObservationValue] = useState("");
  const [observationNotes, setObservationNotes] = useState("");
  const [observationBusy, setObservationBusy] = useState(false);
  const [agendaDay, setAgendaDay] = useState(() => new Intl.DateTimeFormat("en-CA", {timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date()));
  const [agendaFilter, setAgendaFilter] = useState("todos");
  const [activeSection, setActiveSection] = useState<"agenda" | "agua" | "evolucao">("agenda");
  const [name, setName] = useState("");
  const [birth, setBirth] = useState("");
  const [condition, setCondition] = useState("");
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDate, setTaskDate] = useState("");
  const [taskCategory, setTaskCategory] = useState("medicacao");
  const [prescriptionChecked, setPrescriptionChecked] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [clockNow, setClockNow] = useState(() => Date.now());

  async function loadClients(userId: string) {
    const { data, error } = await db.from("care_patients").select("id,full_name,birth_date,condition_notes,status,contact_email,weight_kg,height_cm,care_goal").eq("owner_id", userId).order("created_at", { ascending: false });
    if (error) throw error;
    setClients(data ?? []);
    setSelected((previous) => previous || data?.[0]?.id || "");
  }
  async function loadRecords(userId: string, patientId: string) {
    const [schedule, history, hydration] = await Promise.all([
      db.from("care_daily_checklist").select("id,patient_id,category,scheduled_at,title,notes,completed_at").eq("owner_id", userId).eq("patient_id", patientId).order("scheduled_at", { ascending: true }).limit(500),
      db.from("care_observations").select("id,patient_id,observation_type,numeric_value,unit,notes,recorded_at").eq("owner_id", userId).eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(100),
      db.from("care_hydration").select("id,amount_ml,recorded_at").eq("owner_id", userId).eq("patient_id", patientId).order("recorded_at", { ascending: false }).limit(500),
    ]);
    if (schedule.error) throw schedule.error;
    if (history.error) throw history.error;
    if (hydration.error) throw hydration.error;
    setTasks(schedule.data ?? []);
    setObservations(history.data ?? []);
    setWater(hydration.data ?? []);
  }
  useEffect(() => {
    let active = true;
    void db.auth.getUser().then(async ({ data, error }: {data: {user: {id: string} | null}; error: unknown}) => {
      if (!active) return;
      if (error || !data.user) { setMessage("Entre com sua conta para acessar prontuários protegidos."); setLoading(false); return; }
      setOwner(data.user.id);
      try { await loadClients(data.user.id); } catch { setMessage("Não foi possível carregar os clientes. Verifique o projeto Supabase conectado."); }
      finally { if (active) setLoading(false); }
    });
    return () => { active = false; };
  }, []);
  useEffect(() => {
    if (!owner || !selected) { setTasks([]); setObservations([]); setWater([]); return; }
    void loadRecords(owner, selected).catch(() => setMessage("Não foi possível carregar a agenda e o histórico."));
  }, [owner, selected]);


  useEffect(() => {
    const timer = window.setInterval(() => setClockNow(Date.now()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  async function createClient(event: FormEvent) {
    event.preventDefault();
    if (!owner || !name.trim()) return;
    const { error } = await db.from("care_patients").insert({ owner_id: owner, full_name: name.trim(), birth_date: birth || null, condition_notes: condition || null });
    if (error) { setMessage(error.message); return; }
    setName(""); setBirth(""); setCondition("");
    await loadClients(owner);
    setMessage("Cliente cadastrado com segurança.");
  }
  async function createTask(event: FormEvent) {
    event.preventDefault();
    if (!owner || !selected || !taskTitle || !taskDate) return;
    const timestamp = new Date(taskDate).toISOString();
    const { error } = await db.from("care_daily_checklist").insert({ owner_id: owner, patient_id: selected, category: taskCategory, title: taskTitle.trim(), scheduled_at: timestamp });
    if (error) { setMessage(error.message); return; }
    setTaskTitle(""); setTaskDate("");
    await loadRecords(owner, selected);
    setMessage("Compromisso salvo na agenda. Esta página não envia notificações automáticas.");
  }

  async function generateRequestedSchedule() {
    if (!owner || !selected || !prescriptionChecked || generating) return;
    setGenerating(true);
    setMessage("");
    try {
      const schedule: {owner_id:string;patient_id:string;category:string;scheduled_at:string;title:string;notes:string}[] = [];
      const add = (day: string, time: string, category: string, title: string, notes: string) => {
        schedule.push({ owner_id: owner, patient_id: selected, category, scheduled_at: new Date(day + "T" + time + ":00-05:00").toISOString(), title, notes });
      };
      const dayAt = (offset: number) => {
        const date = new Date(Date.UTC(2026, 9, 31 + offset));
        return date.toISOString().slice(0, 10);
      };
      for (let day = 0; day < 14; day++) {
        const date = dayAt(day);
        if (day < 7) {
          add(date, "07:00", "medicacao", "Esquema combinado — manhã", "Tomada informada pelo cliente. Conferir receita, apresentação e doses. Não confirmada como administrada.");
          add(date, "19:00", "medicacao", "Esquema combinado — noite", "Tomada informada pelo cliente. Conferir receita, apresentação e doses. Não confirmada como administrada.");
        } else {
          add(date, "07:00", "medicacao", "Lansoprazol — continuidade", "Tomada diária informada pelo cliente. Confirmar dose e duração na receita; não confirmada como administrada.");
        }
        for (const [time, label] of [["07:30", "Café da manhã"], ["10:00", "Lanche da manhã"], ["12:30", "Almoço"], ["16:00", "Lanche da tarde"], ["19:30", "Jantar"], ["21:00", "Ceia opcional"]]) {
          add(date, time, "refeicao", label, "Registrar alimentação e tolerância; adaptar com orientação profissional.");
        }
        for (let hour = 8; hour <= 20; hour++) {
          add(date, String(hour).padStart(2,"0") + ":00", "hidratacao", "Verificar hidratação", "Marcar somente após beber. Registrar volume real; meta diária individualizada por profissional.");
        }
      }
      const first = new Date("2026-10-31T00:00:00-05:00").toISOString();
      const last = new Date("2026-11-14T00:00:00-05:00").toISOString();
      const existing = await db.from("care_daily_checklist").select("category,scheduled_at,title").eq("owner_id", owner).eq("patient_id", selected).gte("scheduled_at", first).lt("scheduled_at", last).limit(1000);
      if (existing.error) throw existing.error;
      const keys = new Set((existing.data ?? []).map((row: {category:string;scheduled_at:string;title:string}) => row.category + "|" + row.scheduled_at + "|" + row.title));
      const missing = schedule.filter(row => !keys.has(row.category + "|" + row.scheduled_at + "|" + row.title));
      for (let start=0; start<missing.length;start+=100) {
        const result = await db.from("care_daily_checklist").insert(missing.slice(start,start+100));
        if (result.error) throw result.error;
      }
      await loadRecords(owner, selected);
      setMessage(missing.length ? `Agenda criada: ${missing.length} atividades pendentes. Nenhuma foi marcada como concluída.` : "A agenda solicitada já foi cadastrada. Nenhuma duplicação feita.");
    } catch {
      setMessage("A geração foi interrompida. Verifique sua conexão e tente novamente; tarefas existentes serão preservadas.");
    } finally { setGenerating(false); }
  }
  async function recordWater(event: FormEvent) {
    event.preventDefault();
    if (!owner || !selected || waterBusy) return;
    const amount = Number(waterMl);
    if (!Number.isInteger(amount) || amount < 10 || amount > 1500) { setMessage("Informe um volume entre 10 e 1500 ml realmente consumido."); return; }
    setWaterBusy(true);
    const { error } = await db.from("care_hydration").insert({ owner_id: owner, patient_id: selected, amount_ml: amount });
    if (error) setMessage("Não foi possível salvar a hidratação. Tente novamente.");
    else { await loadRecords(owner, selected); setMessage(`Consumo de ${amount} ml registrado no prontuário.`); }
    setWaterBusy(false);
  }
  async function recordObservation(event: FormEvent) {
    event.preventDefault();
    if (!owner || !selected || observationBusy) return;
    const numeric = observationType === "peso" ? Number(observationValue) : null;
    if (observationType === "peso" && (!Number.isFinite(numeric) || numeric === null || numeric < 20 || numeric > 400)) {
      setMessage("Informe um peso válido, em kg, entre 20 e 400."); return;
    }
    if (observationType !== "peso" && !observationNotes.trim()) {
      setMessage("Descreva a observação antes de salvar."); return;
    }
    setObservationBusy(true);
    const result = await db.from("care_observations").insert({
      owner_id: owner, patient_id: selected, observation_type: observationType,
      numeric_value: observationType === "peso" ? numeric : null,
      unit: observationType === "peso" ? "kg" : null,
      notes: observationNotes.trim() || null,
    });
    if (result.error) setMessage("Falha ao registrar evolução. Verifique sua conexão e permissões.");
    else {
      setObservationValue(""); setObservationNotes("");
      await loadRecords(owner, selected);
      setMessage("Evolução registrada no prontuário.");
    }
    setObservationBusy(false);
  }
  async function toggle(task: Task) {
    if (!owner) return;
    const { error } = await db.from("care_daily_checklist").update({ completed_at: task.completed_at ? null : new Date().toISOString() }).eq("id", task.id).eq("owner_id", owner);
    if (error) { setMessage(error.message); return; }
    await loadRecords(owner, selected);
  }
  const weights = observations.filter(o => o.observation_type === "peso" && o.numeric_value !== null).slice().reverse();
  const latestWeight = weights.length ? weights[weights.length - 1].numeric_value : null;
  const initialWeight = clients.find(client => client.id === selected)?.weight_kg ?? null;
  const weightDifference = latestWeight !== null && initialWeight !== null ? latestWeight - initialWeight : null;
  const todayForAlerts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Rio_Branco", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(clockNow));
  const todayMedication = tasks.filter(task => task.category === "medicacao" && localDay(task.scheduled_at) === todayForAlerts).sort((a,b) => a.scheduled_at.localeCompare(b.scheduled_at));
  const dueNow = todayMedication.filter(task => !task.completed_at && new Date(task.scheduled_at).getTime() <= clockNow && clockNow - new Date(task.scheduled_at).getTime() <= 60*60*1000);
  const upcoming = todayMedication.filter(task => !task.completed_at && new Date(task.scheduled_at).getTime() > clockNow).slice(0,2);
  const current = clients.find((client) => client.id === selected);
  const completed = tasks.filter((task) => task.completed_at).length;
  const localDay = (date: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Rio_Branco", year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(date));
  const filteredTasks = tasks.filter(task => localDay(task.scheduled_at) === agendaDay && (agendaFilter === "todos" || task.category === agendaFilter));
  const dayTasks = tasks.filter(task => localDay(task.scheduled_at) === agendaDay);
  const dayDone = dayTasks.filter(task => task.completed_at).length;
  const todayBrazil = new Intl.DateTimeFormat("en-CA", {timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date());
  const consumedToday = water.filter(w => new Intl.DateTimeFormat("en-CA", {timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(new Date(w.recorded_at)) === todayBrazil).reduce((sum,w) => sum + w.amount_ml,0);
  return <>
    <PageHeader eyebrow="Área protegida · CareDigital" title="Prontuário de acompanhamento" />
    <p className="mb-5 rounded-xl border border-warning/30 bg-warning/10 p-3 text-sm">Registros de acompanhamento, não prescrições. Horários e doses devem seguir orientação profissional validada. Os lembretes nesta tela não são notificações do sistema.</p>
    {message && <div role="status" className="mb-4 rounded-xl bg-primary/10 p-3 text-sm">{message}</div>}
    {loading ? <Panel>Carregando prontuários…</Panel> : !owner ? <Panel title="Acesso protegido"><Link to="/entrar" className="font-semibold text-primary underline">Entrar na minha conta</Link></Panel> : <>
      <div className="grid gap-5 lg:grid-cols-[1fr_2fr]">
        <div className="space-y-5">
          <Panel title="Clientes acompanhados">
            <label className="block text-xs text-muted-foreground">Selecionar prontuário</label>
            <select className="field mt-2" value={selected} onChange={(e) => setSelected(e.target.value)}>
              <option value="">Selecione um cliente</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
            </select>
            <form className="mt-5 space-y-3" onSubmit={(e) => void createClient(e)}>
              <h3 className="text-sm font-semibold">Novo cliente</h3>
              <label className="block text-xs">Nome completo<input className="field mt-1" required maxLength={120} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="block text-xs">Data de nascimento<input className="field mt-1" type="date" value={birth} onChange={(e) => setBirth(e.target.value)} /></label>
              <label className="block text-xs">Contexto clínico (opcional)<textarea className="field mt-1" rows={3} value={condition} onChange={(e) => setCondition(e.target.value)} /></label>
              <Btn type="submit" size="lg" className="w-full"><Plus size={16} /> Salvar cliente</Btn>
            </form>
          </Panel>
          <Panel title="Privacidade">
            <p className="text-xs leading-relaxed text-muted-foreground">Os registros ficam associados à conta autenticada, com controle de acesso por proprietário. O compartilhamento entre profissionais ainda não está habilitado.</p>
          </Panel>
        </div>
        <div className="space-y-5">
          {!current ? <Panel title="Selecione um cliente"><p className="text-sm text-muted-foreground">Escolha ou cadastre um cliente para abrir a ficha individual.</p></Panel> : <>
            <Panel title="Ficha individual">
              <div className="flex items-center gap-3"><HeartPulse className="text-primary" /><div><h2 className="text-xl font-semibold">{current.full_name}</h2><p className="text-xs text-muted-foreground">{current.birth_date ? `Nascimento: ${new Date(current.birth_date+"T12:00:00").toLocaleDateString("pt-BR")}` : "Nascimento não informado"}</p></div></div>
              {current.contact_email && <p className="mt-2 text-xs text-muted-foreground">{current.contact_email}</p>}
              <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                <div className="rounded-xl bg-foreground/5 p-3"><p className="text-xs text-muted-foreground">Peso inicial</p><strong>{current.weight_kg ? `${current.weight_kg} kg` : "Não registrado"}</strong></div>
                <div className="rounded-xl bg-foreground/5 p-3"><p className="text-xs text-muted-foreground">Altura</p><strong>{current.height_cm ? `${current.height_cm} cm` : "Não registrada"}</strong></div>
                <div className="rounded-xl bg-foreground/5 p-3"><p className="text-xs text-muted-foreground">Objetivo</p><strong className="text-xs">{current.care_goal || "Não definido"}</strong></div>
              </div>
              {current.condition_notes && <p className="mt-4 rounded-xl bg-foreground/5 p-3 text-sm">{current.condition_notes}</p>}
              <div className="mt-4 grid grid-cols-2 gap-3"><div className="rounded-xl bg-foreground/5 p-3"><span className="text-xs text-muted-foreground">Tarefas</span><div className="text-2xl font-semibold">{tasks.length}</div></div><div className="rounded-xl bg-foreground/5 p-3"><span className="text-xs text-muted-foreground">Concluídas</span><div className="text-2xl font-semibold">{completed}</div></div></div>
            </Panel>
            <div className="grid grid-cols-3 gap-2" role="tablist" aria-label="Seções do prontuário">
              {([["agenda","Agenda"],["agua","Água"],["evolucao","Evolução"]] as const).map(([id,label]) => (
                <button key={id} type="button" role="tab" aria-selected={activeSection === id} onClick={() => setActiveSection(id)} className={`rounded-xl border px-3 py-3 text-sm font-semibold transition-colors ${activeSection === id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-foreground/5"}`}>{label}</button>
              ))}
            </div>
            {activeSection === "agenda" && <section aria-label="Central de avisos do cuidado" className="rounded-2xl border border-border bg-background p-4 shadow-sm">
              <div className="mb-3 flex items-center gap-3"><span className="rounded-xl bg-primary/10 p-2 text-primary"><Bell size={19} /></span><div><h3 className="font-semibold">Central de avisos</h3><p className="text-xs text-muted-foreground">Acompanhamento de hoje · horário do Acre</p></div></div>
              {dueNow.length > 0 && <div role="status" className="mb-3 rounded-xl border border-warning/30 bg-warning/10 p-3">
                <p className="text-xs font-semibold">Horário de acompanhamento alcançado</p>
                {dueNow.map(task => <p key={task.id} className="mt-1 text-sm">{fmt(task.scheduled_at)} — {task.title}</p>)}
                <p className="mt-2 text-xs text-muted-foreground">Confira a prescrição e registre a atividade somente após verificar o cuidado. Um horário alcançado não confirma atraso nem dose não tomada.</p>
              </div>}
              {upcoming.length > 0 ? <div className="space-y-2">{upcoming.map(task => <div key={task.id} className="flex items-center gap-3 rounded-xl bg-foreground/5 p-3"><Clock3 size={17} className="shrink-0 text-primary" /><div className="flex-1"><p className="text-sm font-medium">{task.title}</p><p className="text-xs text-muted-foreground">{fmt(task.scheduled_at)} · programado</p></div></div>)}</div> : <p className="text-sm text-muted-foreground">{todayMedication.length ? "Não há outras atividades de medicação previstas para hoje." : "Nenhum horário de medicação cadastrado para hoje."}</p>}
              <p className="mt-3 text-xs text-muted-foreground">Avisos exibidos exclusivamente dentro do CareDigital. Sem pop-ups do navegador ou solicitações de permissão. Esta central não envia mensagens com o aplicativo fechado.</p>
            </section>}
            {activeSection === "agenda" && <Panel title="Agenda de cuidados" action={<ClipboardList size={19} className="text-primary" />}>
              {tasks.length === 0 && <div className="mb-4 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <strong className="text-sm">Calendário solicitado · 31/10 a 13/11/2026</strong>
                <p className="mt-1 text-xs text-muted-foreground">Inclui horários de tratamento informados, seis momentos de alimentação e verificações de hidratação das 08h às 20h. Não envia notificações; não define volume de água. A etapa de continuidade de lansoprazol depende de confirmação da prescrição.</p>
                <label className="mt-3 flex items-start gap-2 text-xs"><input type="checkbox" className="mt-0.5" checked={prescriptionChecked} onChange={e => setPrescriptionChecked(e.target.checked)} /><span>Conferi a prescrição com o profissional responsável, incluindo os horários e a fase de continuidade, e autorizo registrar esta agenda.</span></label>
                <Btn type="button" className="mt-3" disabled={!prescriptionChecked || generating} onClick={() => void generateRequestedSchedule()}>{generating ? "Criando agenda…" : "Criar agenda de 14 dias"}</Btn>
              </div>}
              <form onSubmit={(e) => void createTask(e)} className="mb-4 grid gap-3 rounded-xl bg-foreground/5 p-3 sm:grid-cols-2">
                <label className="text-xs">Atividade<input className="field mt-1" required value={taskTitle} maxLength={140} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ex.: Refeição ou cuidado prescrito" /></label>
                <label className="text-xs">Data e hora<input className="field mt-1" type="datetime-local" required value={taskDate} onChange={(e) => setTaskDate(e.target.value)} /></label>
                <label className="text-xs">Categoria<select className="field mt-1" value={taskCategory} onChange={(e) => setTaskCategory(e.target.value)}>{[["medicacao","Medicação"],["refeicao","Refeição"],["hidratacao","Hidratação"],["peso","Peso"],["outro","Outro"]].map(([v,t])=><option key={v} value={v}>{t}</option>)}</select></label>
                <Btn type="submit" className="self-end">Adicionar à agenda</Btn>
              </form>
              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="text-xs">Dia da agenda<input type="date" className="field mt-1" value={agendaDay} onChange={e => setAgendaDay(e.target.value)} /></label>
                <label className="text-xs">Exibir<select className="field mt-1" value={agendaFilter} onChange={e => setAgendaFilter(e.target.value)}><option value="todos">Todas as atividades</option><option value="medicacao">Medicação</option><option value="refeicao">Alimentação</option><option value="hidratacao">Hidratação</option><option value="peso">Peso</option><option value="outro">Outros</option></select></label>
              </div>
              <p className="mb-3 text-xs text-muted-foreground">{dayDone} de {dayTasks.length} atividades concluídas no dia selecionado. Uma atividade pendente não significa que o cuidado foi omitido.</p>
              {tasks.length === 0 ? <p className="py-5 text-sm text-muted-foreground">Agenda vazia. Insira horários validados para iniciar o acompanhamento.</p> : filteredTasks.length === 0 ? <p className="py-5 text-sm text-muted-foreground">Nenhuma atividade cadastrada neste dia e filtro.</p> :
                <div className="max-h-96 divide-y divide-border overflow-y-auto">{filteredTasks.map(task => <button type="button" key={task.id} onClick={() => void toggle(task)} className="flex w-full items-center gap-3 px-2 py-3 text-left hover:bg-foreground/5">{task.completed_at ? <CheckCircle2 className="text-success" size={20} /> : <Circle className="text-muted-foreground" size={20} />}<span className="flex-1"><span className={`block text-sm font-semibold ${task.completed_at ? "line-through opacity-60" : ""}`}>{task.title}</span><span className="text-xs text-muted-foreground">{fmt(task.scheduled_at)} · {task.category}</span></span></button>)}</div>}
            </Panel>}
            {activeSection === "agua" && <Panel title="Hidratação registrada" action={<Droplets size={19} className="text-primary" />}>
              <div className="flex items-baseline gap-2"><strong className="text-3xl">{consumedToday.toLocaleString("pt-BR")}</strong><span className="text-sm text-muted-foreground">ml registrados hoje</span></div>
              <p className="mt-2 text-xs text-muted-foreground">Total efetivamente informado, não uma meta ou prescrição. Os volumes devem refletir apenas o que foi consumido.</p>
              <form className="mt-4 flex flex-wrap items-end gap-3" onSubmit={e => void recordWater(e)}>
                <label className="text-xs">Quantidade consumida (ml)<input type="number" min={10} max={1500} step={10} required className="field mt-1 w-36" value={waterMl} onChange={e => setWaterMl(e.target.value)} /></label>
                <Btn type="submit" disabled={waterBusy}>{waterBusy ? "Salvando…" : "Registrar água bebida"}</Btn>
              </form>
              <div className="mt-4 max-h-40 space-y-1 overflow-y-auto">{water.slice(0,15).map(w => <div key={w.id} className="flex justify-between border-b border-border/60 py-2 text-xs"><span>{fmt(w.recorded_at)}</span><strong>{w.amount_ml} ml</strong></div>)}</div>
            </Panel>}
            {activeSection === "evolucao" && <Panel title="Histórico de evolução">
              <div className="mb-4 grid grid-cols-2 gap-3 rounded-xl bg-foreground/5 p-3"><div><p className="text-xs text-muted-foreground">Peso mais recente registrado</p><strong className="text-xl">{latestWeight === null ? "Sem registro" : `${latestWeight} kg`}</strong></div><div><p className="text-xs text-muted-foreground">Variação desde o cadastro</p><strong className="text-xl">{weightDifference === null ? "—" : `${weightDifference > 0 ? "+" : ""}${weightDifference.toFixed(1)} kg`}</strong></div></div>
              {weights.length > 0 && <div className="mb-4 max-h-40 overflow-auto rounded-xl border border-border p-3"><h3 className="mb-2 text-xs font-semibold">Histórico de peso</h3>{weights.map(w => <div key={w.id} className="flex justify-between border-b border-border/50 py-1 text-xs"><span>{fmt(w.recorded_at)}</span><strong>{w.numeric_value} kg</strong></div>)}</div>}
              <form className="mb-4 grid gap-3 rounded-xl bg-foreground/5 p-3 sm:grid-cols-2" onSubmit={event => void recordObservation(event)}>
                <label className="text-xs">Tipo de registro
                  <select className="field mt-1" value={observationType} onChange={event => setObservationType(event.target.value)}>
                    <option value="peso">Peso corporal</option><option value="sintoma">Sintoma relatado</option>
                    <option value="alimentacao">Alimentação / tolerância</option><option value="sinais_vitais">Sinais vitais</option><option value="outro">Outra observação</option>
                  </select>
                </label>
                {observationType === "peso" && <label className="text-xs">Peso medido (kg)<input type="number" className="field mt-1" min={20} max={400} step={0.1} value={observationValue} onChange={event => setObservationValue(event.target.value)} required /></label>}
                <label className="text-xs sm:col-span-2">Anotações do acompanhamento
                  <textarea className="field mt-1" rows={2} maxLength={1000} placeholder="Descreva somente informações observadas ou relatadas." value={observationNotes} onChange={event => setObservationNotes(event.target.value)} />
                </label>
                <Btn type="submit" disabled={observationBusy} className="sm:col-span-2">{observationBusy ? "Salvando…" : "Registrar evolução"}</Btn>
              </form>
              {observations.length === 0 ? <p className="text-sm text-muted-foreground">Nenhuma observação registrada ainda.</p> : <div className="space-y-2">{observations.map(o => <div key={o.id} className="rounded-xl bg-foreground/5 p-3 text-sm"><strong>{o.observation_type}</strong> {o.numeric_value ?? ""} {o.unit ?? ""}<p>{o.notes}</p><span className="text-xs text-muted-foreground">{fmt(o.recorded_at)}</span></div>)}</div>}
              <p className="mt-3 text-xs text-muted-foreground">Evolução corporal e observações clínicas devem ser registradas pela equipe responsável.</p>
            </Panel>}
          </>}
        </div>
      </div>
    </>}
  </>;
}
