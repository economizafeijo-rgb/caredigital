import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { CalendarClock, CheckCircle2, Droplets, LockKeyhole, Pill, UtensilsCrossed, UserRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type Client = { id: string; full_name: string; status: string; care_goal: string | null };
type Task = { id: string; patient_id: string; title: string; category: string; scheduled_at: string; completed_at: string | null };
const db = supabase as unknown as { from: (table: string) => any; auth: typeof supabase.auth };
const tz = "America/Rio_Branco";
const dayInAcre = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const timeInAcre = (iso: string) => new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", timeZone: tz }).format(new Date(iso));
const categoryInfo: Record<string, { label: string; icon: typeof Pill }> = {
  medicacao: { label: "Medicação", icon: Pill },
  hidratacao: { label: "Hidratação", icon: Droplets },
  refeicao: { label: "Refeição", icon: UtensilsCrossed },
};

export function HomeClientCard() {
  const [owner, setOwner] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [client, setClient] = useState<Client | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [notice, setNotice] = useState("");
  const [locked, setLocked] = useState(false);
  const [pending, setPending] = useState<Task | null>(null);
  const [amount, setAmount] = useState("200");
  const [busy, setBusy] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const interval = window.setInterval(() => setTick(t => t + 1), 60000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    let active = true;
    const loadAuth = async () => {
      const { data } = await db.auth.getUser();
      if (!active) return;
      setOwner(data.user?.id ?? null);
      setLoading(false);
    };
    void loadAuth();
    const { data: listener } = db.auth.onAuthStateChange(() => { if (active) void loadAuth(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);

  useEffect(() => {
    if (!owner) { setClient(null); setTasks([]); return; }
    let active = true;
    const load = async () => {
      const res = await db.from("care_patients").select("id,full_name,status,care_goal").eq("owner_id", owner).order("created_at", {ascending: true}).limit(1);
      if (!active) return;
      if (res.error) { setNotice("Não foi possível consultar o prontuário."); return; }
      const first = (res.data ?? [])[0] as Client | undefined;
      setClient(first ?? null);
      if (!first) { setTasks([]); return; }
      const date = dayInAcre(new Date());
      const from = new Date(date + "T00:00:00-05:00").toISOString();
      const until = new Date(new Date(from).getTime() + 86400000).toISOString();
      const rows = await db.from("care_daily_checklist").select("id,patient_id,title,category,scheduled_at,completed_at")
        .eq("owner_id",owner).eq("patient_id",first.id).gte("scheduled_at",from).lt("scheduled_at",until)
        .in("category",["medicacao","hidratacao","refeicao"]).order("scheduled_at",{ascending:true}).limit(100);
      if (active) { if (rows.error) setNotice("Não foi possível carregar a agenda de hoje."); else setTasks(rows.data ?? []); }
    };
    void load();
    return () => { active = false; };
  }, [owner, tick]);

  const nextItems = useMemo(() => {
    const now = Date.now();
    const future = tasks.filter(t => !t.completed_at && new Date(t.scheduled_at).getTime() >= now);
    const due = tasks.filter(t => !t.completed_at && new Date(t.scheduled_at).getTime() < now);
    const ordered = [...due.slice(-3).reverse(), ...future];
    const grouped = ["medicacao", "hidratacao", "refeicao"].map(kind => ordered.find(t => t.category === kind)).filter((t): t is Task => Boolean(t));
    return grouped;
  }, [tasks, tick]);
  const completed = tasks.filter(t => Boolean(t.completed_at)).length;

  function askConfirm(task: Task) {
    if (!owner || !client) { setLocked(true); return; }
    setNotice("");
    setPending(task);
  }

  async function confirm() {
    if (!pending || !owner || !client || busy) return;
    if (pending.category === "hidratacao" && (!Number.isInteger(Number(amount)) || Number(amount) < 10 || Number(amount) > 1500)) {
      setNotice("Informe o volume de água realmente consumido (10 a 1.500 ml).");
      return;
    }
    setBusy(true);
    try {
      // The database function performs confirmation and hydration logging atomically.
      const payload = pending.category === "hidratacao" ? Number(amount) : null;
      const result = await (supabase as any).rpc("care_confirm_task", { p_task_id: pending.id, p_water_ml: payload });
      if (result.error) throw result.error;
      setTasks(previous => previous.map(t => t.id === pending.id ? { ...t, completed_at: typeof result.data === "string" ? result.data : new Date().toISOString() } : t));
      setNotice(pending.category === "hidratacao" ? "Hidratação confirmada e volume registrado." : "Atividade confirmada no prontuário.");
      setPending(null);
    } catch {
      setNotice("Não foi possível confirmar. Consulte o prontuário antes de tentar novamente.");
    } finally { setBusy(false); }
  }

  return <section aria-label="Resumo do cliente e agenda" className="mt-6 overflow-hidden rounded-3xl border border-[#b8d2df] bg-white shadow-[0_20px_54px_-38px_rgba(11,55,78,.45)]">
    <div className="flex flex-wrap items-center justify-between gap-3 bg-gradient-to-r from-[#123b58] to-[#216986] px-5 py-4 text-white">
      <div className="flex items-center gap-3"><span className="rounded-xl bg-white/15 p-2"><UserRound size={22}/></span><div><h2 className="text-lg font-bold">Meu acompanhamento</h2><p className="text-xs text-white/75">Agenda de hoje · horário do Acre</p></div></div>
      <Link to={owner ? "/prontuario" : "/entrar"} className="rounded-xl border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold hover:bg-white/20">{owner ? "Abrir prontuário" : "Entrar para acessar"}</Link>
    </div>
    {loading ? <p className="p-6 text-sm text-muted-foreground">Verificando acesso seguro…</p> : !owner ? <div className="grid gap-4 p-5 sm:grid-cols-[1fr_auto] sm:items-center">
      <div><div className="flex items-center gap-2 font-semibold"><LockKeyhole size={19} className="text-primary"/> Acesso protegido</div><p className="mt-2 max-w-2xl text-sm text-muted-foreground">Entre com sua conta para visualizar o cliente cadastrado, consultar a programação e confirmar medicação, água e refeições. Nenhum dado pessoal aparece sem autenticação.</p></div>
      <button onClick={() => setLocked(true)} className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white">Consultar programação</button>
    </div> : !client ? <p className="p-6 text-sm text-muted-foreground">Nenhum cliente vinculado a esta conta. Confira seu acesso ao prontuário.</p> : <div className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><div><h3 className="text-lg font-bold text-[#173b52]">{client.full_name}</h3><p className="text-xs text-muted-foreground">{client.care_goal || "Acompanhamento individual"}</p></div><div className="rounded-xl bg-[#e5f1f5] px-3 py-2 text-xs font-semibold text-[#1f5974]">{completed} de {tasks.length} cuidados registrados</div></div>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{nextItems.map(task => {
        const info = categoryInfo[task.category];
        const Icon = info.icon;
        return <div key={task.id} className="rounded-2xl border border-[#d4e3eb] bg-[#f5f9fb] p-3">
          <div className="mb-2 flex items-center gap-2 text-xs font-semibold text-[#286680]"><Icon size={16}/>{info.label}<span className="ml-auto font-mono">{timeInAcre(task.scheduled_at)}</span></div>
          <p className="min-h-10 text-sm font-medium text-[#18374e]">{task.title}</p>
          <button type="button" onClick={() => askConfirm(task)} className="mt-3 w-full rounded-lg bg-[#216083] px-3 py-2 text-xs font-semibold text-white">Confirmar {task.category === "hidratacao" ? "água" : task.category === "medicacao" ? "medicação" : "refeição"}</button>
        </div>;
      })}</div>
      {nextItems.length === 0 && <p className="text-sm text-muted-foreground">Não há cuidados pendentes para hoje. Consulte o prontuário para outros dias.</p>}
    </div>}
    {notice && <p role="status" className="mx-5 mb-4 rounded-xl bg-[#e4eff4] p-3 text-sm text-[#24526c]">{notice}</p>}
    {locked && <div role="dialog" aria-label="Acesso restrito" className="m-5 rounded-2xl border border-[#aec8d6] bg-[#eff5f8] p-5">
      <div className="flex items-center gap-2 font-bold text-[#163b56]"><LockKeyhole size={19}/> Acesso necessário</div>
      <p className="mt-2 text-sm text-[#456478]">Para proteger as informações de saúde, faça login antes de visualizar ou confirmar atividades do cliente.</p>
      <div className="mt-4 flex flex-wrap gap-2"><Link to="/entrar" className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white">Ir para a tela de login</Link><button onClick={() => setLocked(false)} className="rounded-xl border border-[#b8d2df] px-4 py-3 text-sm">Fechar</button></div>
    </div>}
    {pending && <div role="dialog" aria-label="Confirmar cuidado" className="m-5 rounded-2xl border border-[#aec8d6] bg-[#eff5f8] p-5">
      <div className="flex items-center gap-2 font-bold text-[#163b56]"><CheckCircle2 size={19}/> Confirmação de cuidado</div>
      <p className="mt-2 text-sm">{pending.title} · {timeInAcre(pending.scheduled_at)}</p>
      {pending.category === "medicacao" && <p className="mt-2 text-xs text-muted-foreground">Confirme somente se a medicação foi realmente administrada conforme a prescrição. Um horário agendado não comprova a tomada.</p>}
      {pending.category === "refeicao" && <p className="mt-2 text-xs text-muted-foreground">Confirme somente se a refeição foi realizada.</p>}
      {pending.category === "hidratacao" && <label className="mt-3 block text-sm">Água realmente consumida (ml)<input className="field mt-1 max-w-40" type="number" min={10} max={1500} step={10} value={amount} onChange={e => setAmount(e.target.value)} /></label>}
      <div className="mt-4 flex flex-wrap gap-2"><button disabled={busy} onClick={() => void confirm()} className="rounded-xl bg-[#216083] px-5 py-3 text-sm font-semibold text-white disabled:opacity-50">{busy ? "Salvando…" : "Confirmar realização"}</button><button disabled={busy} onClick={() => setPending(null)} className="rounded-xl border border-[#b8d2df] px-4 py-3 text-sm">Cancelar</button></div>
    </div>}
  </section>;
}
