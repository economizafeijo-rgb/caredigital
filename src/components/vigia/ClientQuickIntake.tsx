import { useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Droplets, Plus, Save, UtensilsCrossed, X } from "lucide-react";
import { CareCategoryReport } from "./CareCategoryReport";
import { BarChart3 } from "lucide-react";
import { CareIntakePicker, CareIntakeIcon } from "./CareIntakePicker";
import { foodCategory,beverageCategory,isFoodKind,type IntakeKind,type FoodKind,type BeverageKind } from "@/lib/care-intake-categories";
import { supabase } from "@/integrations/supabase/client";

type Props = { patientId: string; onRecorded?: () => void; variant?: "home" | "panel"; mode?: "all" | "water" | "food" | "drink"; /** Increment to open the existing form from a dashboard card. */ openSignal?: number };
const zone = "America/Rio_Branco";
const formatTime = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: zone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
}).format(new Date(date));

/** datetime-local does not carry a timezone; its displayed value is always Acre wall time. */
const acreInputValue = (date = new Date()) => {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(date);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? "00";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
};

/** Registros avulsos não criam tarefas e não confirmam horários da programação. */
export function ClientQuickIntake({ patientId, onRecorded, variant = "panel", mode = "all", openSignal = 0 }: Props) {
  const [open, setOpen] = useState(false);
  const [reportOpen,setReportOpen]=useState(false);
  const [kind, setKind] = useState<IntakeKind>("lanche");
  const [group,setGroup]=useState<"food"|"beverage">("food");
  const [portion,setPortion]=useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("200");
  const [consumedAt,setConsumedAt]=useState("");
  const [manualTime,setManualTime]=useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef<string | null>(null);
  const openedBySignal = useRef(0);

  const isFood = isFoodKind(kind);
  const isWater = kind === "agua";
  const option = foodCategory(kind)??beverageCategory(kind);
  const label = option?.label??"Consumo avulso";
  const formDescription = isFood
    ? description.trim()+(portion.trim()?" · Porção: "+portion.trim():"")
    : isWater?"Água":description.trim();

  function openForm() {
    requestId.current = crypto.randomUUID();
    const initialGroup=mode==="water"||mode==="drink"?"beverage":"food";
    setGroup(initialGroup);
    setKind(mode==="water"?"agua":mode==="drink"?"cha":mode==="food"?"almoco":"lanche");
    setDescription("");
    setPortion("");
    setAmount("200");
    setConsumedAt(acreInputValue());
    setManualTime(false);
    setError("");
    setNotice("");
    setOpen(true);
  }
  // A home card may open this same form without creating an extra intake
  // instance or bypassing the server's idempotent save/confirmation rules.
  useEffect(() => {
    if (openSignal > openedBySignal.current && patientId) {
      openedBySignal.current = openSignal;
      openForm();
    }
    // Only a new click signal opens the form; changing patient data alone cannot
    // reopen a form unexpectedly or duplicate an earlier registration.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [openSignal, patientId]);

  function closeForm() {
    if (!saving) {
      setOpen(false);
      setError("");
      requestId.current = null;
    }
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving || !requestId.current) return;
    const volume = isFood ? null : Number(amount);
    if (!isWater && (description.trim().length < (isFood ? 3 : 2) || formDescription.length > (isFood ? 1000 : 100))) {
      setError(isFood ? "Descreva o alimento consumido (3 a 1.000 caracteres)." : "Informe a bebida (2 a 100 caracteres).");
      return;
    }
    if (!isFood && (volume === null || !Number.isInteger(volume) || volume < 10 || volume > 1500)) {
      setError("Informe um volume entre 10 e 1.500 ml.");
      return;
    }
    // Current-time entries use the database clock. Only manually selected times
    // are converted from Acre wall time and sent by the browser.
    const consumed = manualTime ? new Date(consumedAt+"-05:00") : null;
    if (manualTime && (!consumed || !Number.isFinite(consumed.getTime()))) {
      setError("Confira a data e a hora informadas no fuso do Acre (UTC−5).");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const { data, error: failure } = await (supabase as any).rpc("care_log_unscheduled_intake", {
        p_patient_id: patientId,
        p_kind: kind,
        p_description: formDescription,
        p_amount_ml: volume,
        p_request_id: requestId.current,
        p_consumed_at: consumed?.toISOString() ?? null,
      });
      if (failure) throw failure;
      if (typeof data !== "string" || !Number.isFinite(Date.parse(data))) {
        throw new Error("O servidor não confirmou o horário de registro.");
      }
      const effectiveConsumedAt = manualTime ? consumed!.toISOString() : data;
      setNotice(isWater
        ? `Água registrada em ${formatTime(effectiveConsumedAt)} (Acre). Meta e histórico atualizados.`
        : `Consumo (${label.toLowerCase()}) registrado em ${formatTime(effectiveConsumedAt)} (Acre). Veja o histórico no prontuário.`);
      setOpen(false);
      requestId.current = null;
      onRecorded?.();
    } catch (failure) {
      const detail = failure && typeof failure === "object" && "message" in failure
        ? String((failure as {message?:unknown}).message ?? "")
        : failure instanceof Error ? failure.message : "";
      const friendly = /future/i.test(detail)
        ? "O horário informado está no futuro no horário do Acre. Confira e tente novamente."
        : /last 7 days|older than 7 days/i.test(detail)
          ? "O horário informado ultrapassa o limite de 7 dias. Escolha uma data mais recente."
          : /Patient unavailable|Authentication required/i.test(detail)
          ? "Sua sessão ou o vínculo com o prontuário expirou. Entre novamente e tente salvar."
          : detail || "Confira sua conexão e tente novamente.";
      setError(`Não foi possível salvar. ${friendly}`);
      // Mantém o mesmo identificador para reenvios sem duplicar lançamentos.
    } finally {
      setSaving(false);
    }
  }

  return <>
    {reportOpen&&<CareCategoryReport patientId={patientId} category={mode==="water"||mode==="drink"?"hidratacao":"refeicao"} onClose={()=>setReportOpen(false)}/>}

    <button type="button" onClick={openForm} disabled={!patientId}
      className={variant === "home"
        ? "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-300/40 bg-sky-300/15 px-2.5 text-[11px] font-bold text-primary-foreground transition hover:bg-sky-300/25 dark:text-sky-100 disabled:opacity-50"
        : mode === "water"
          ? "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-sky-500/35 bg-sky-500/10 px-3 text-xs font-bold text-foreground transition hover:bg-sky-500/20 disabled:opacity-50"
          : "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-xl bg-primary px-3 text-xs font-bold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"}>
      {mode === "water"||mode==="drink" ? <Droplets size={16}/> : mode==="food"?<UtensilsCrossed size={16}/>:<Plus size={16}/>} {mode === "water" ? "Registrar água" : mode==="food"?"Registrar alimento":mode==="drink"?"Registrar bebida":"Registrar consumo"}
    </button>
    {notice && typeof document !== "undefined" && createPortal(
      <div role="status" className="fixed right-3 top-16 z-[151] flex max-w-sm items-start gap-2 rounded-xl border border-success/30 bg-card p-3 text-xs font-semibold text-foreground shadow-xl">
        <CheckCircle2 size={17} className="shrink-0 text-success"/>
        <span className="flex-1">{notice}</span>
        <button type="button" aria-label="Fechar aviso" onClick={() => setNotice("")}><X size={16}/></button>
      </div>, document.body
    )}
    {open && typeof document !== "undefined" && createPortal(
      <div className="care-intake-modal-overlay fixed inset-0 z-[150] flex items-center justify-center overflow-hidden bg-slate-950/60 p-3 backdrop-blur-sm"
        onMouseDown={event => { if (event.target === event.currentTarget) closeForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="quick-intake-title"
          className="care-premium-intake-dialog care-intake-responsive-v2 care-intake-oneview flex h-[min(94dvh,710px)] max-h-[94dvh] w-full max-w-[720px] min-w-0 flex-col overflow-hidden rounded-[24px] border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5">
          <div className="care-premium-intake-header flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <CareIntakeIcon kind={kind} size={20}/>
              </span>
              <div>
                <h2 id="quick-intake-title" className="text-base font-bold">{mode==="water"?"Registrar água":isFood?"Registrar alimento ou refeição":"Registrar líquido"}</h2>
                <p className="text-[11px] text-muted-foreground">Informe o horário do consumo · fuso horário do Acre</p>
              </div>
            </div>
            <button type="button" aria-label="Fechar" disabled={saving} onClick={closeForm}
              className="grid size-8 place-items-center rounded-lg border border-border"><X size={18}/></button>
          </div>
          <button type="button" onClick={()=>setReportOpen(true)} className="mt-3 inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-primary/30 bg-accent px-3 py-2.5 text-xs font-bold text-primary hover:bg-accent"><BarChart3 size={17}/> Relatório diário, mensal e anual</button>
          <form className="care-intake-oneview-form mt-2 grid min-h-0 flex-1 content-start gap-2 overflow-y-auto overscroll-contain pr-1" onSubmit={event => void save(event)}>
            {mode==="all"&&<div role="group" aria-label="Selecionar tipo de consumo" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/35 p-1">
              <button type="button" aria-pressed={group==="food"}
                onClick={()=>{setGroup("food");setKind("almoco");setDescription("");setPortion("");setError("");}}
                className={"flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-bold "+(group==="food"?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-card")}>
                <UtensilsCrossed size={15}/> Alimentos e refeições
              </button>
              <button type="button" aria-pressed={group==="beverage"}
                onClick={()=>{setGroup("beverage");setKind("agua");setDescription("");setPortion("");setError("");}}
                className={"flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-bold "+(group==="beverage"?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-card")}>
                <Droplets size={15}/> Líquidos e shakes
              </button>
            </div>}
            {mode!=="water"&&<div className="care-intake-picker-scroll care-intake-picker-visible min-w-0 rounded-xl border border-border/60 bg-muted/[.13] p-2">
              {group==="food"?
                <CareIntakePicker group="food" value={isFoodKind(kind)?kind:"lanche"}
                  onChange={(selected:FoodKind)=>{setKind(selected);setDescription("");setPortion("");setError("");}} compact/>:
                <CareIntakePicker group="beverage" value={!isFoodKind(kind)?kind as BeverageKind:"agua"}
                  onChange={(selected:BeverageKind)=>{setKind(selected);setDescription("");setPortion("");setAmount(String(beverageCategory(selected)?.amount??200));setError("");}} compact/>}
            </div>}
            <p className="flex min-w-0 items-center gap-1.5 rounded-lg bg-primary/[.06] px-2.5 py-2 text-[11px] font-semibold text-foreground">
              <CareIntakeIcon kind={kind} size={16} className="shrink-0 text-primary"/>
              <span className="min-w-0 flex-1">{label} <span className="font-normal text-muted-foreground">· {option?.hint}</span></span>
            </p>
            {!isWater && (isFood
              ? <div className="care-intake-food-fields grid min-w-0 grid-cols-1 gap-3">
                  <label className="block min-w-0 text-xs font-semibold leading-relaxed">
                    <span className="block">O que você comeu?</span>
                    <textarea rows={3} required maxLength={1000} value={description}
                      onChange={event => setDescription(event.target.value)}
                      placeholder={foodCategory(kind)?.example??"Descreva o alimento ou a refeição"}
                      className="field mt-1.5 block min-h-[76px] w-full resize-y"/>
                  </label>
                  <label className="block min-w-0 text-xs font-semibold leading-relaxed">
                    <span className="block">Quantidade ou porção (opcional)</span>
                    <input type="text" className="field mt-1.5 block min-h-[44px] w-full" maxLength={100} value={portion}
                      onChange={event=>setPortion(event.target.value)} placeholder="Ex.: 1 unidade, 100 g, 1 prato"/>
                  </label>
                </div>
              : <label className="text-xs font-semibold">Nome da bebida
                  <input type="text" className="field mt-1 w-full" maxLength={100}
                    value={description} required onChange={event => setDescription(event.target.value)}
                    placeholder={beverageCategory(kind)?.example??"Descreva a bebida"}/>
                </label>
            )}
            {!isFood && <div aria-label="Volumes sugeridos para facilitar o registro" className="grid grid-cols-4 gap-1.5">{[100,200,300,500].map(value=><button key={value} type="button" onClick={()=>setAmount(String(value))} aria-pressed={amount===String(value)} className={`rounded-lg border px-1 py-2 text-[11px] font-bold ${amount===String(value)?"border-primary bg-primary/10 text-primary":"border-border bg-muted/50 text-foreground"}`}>{value} ml</button>)}</div>}
            {!isFood && <label className="text-xs font-semibold">Quantidade consumida (ml)
                <input type="number" min={10} max={1500} step={1} required
                  className="field mt-1 w-full" value={amount}
                  onChange={event => setAmount(event.target.value)}/>
              </label>}
            <div className="min-w-0 max-w-full overflow-hidden rounded-xl border border-border/70 bg-card/80 p-3 space-y-2 text-foreground">
              <label className="block min-w-0 max-w-full text-xs font-semibold">Data e hora do consumo · horário do Acre (UTC−5)
                <input type="datetime-local" required value={consumedAt} onChange={event=>{setConsumedAt(event.target.value);setManualTime(true);}} className="field care-intake-datetime mt-1 block w-full min-w-0 max-w-full" style={{boxSizing:"border-box",minWidth:0,maxWidth:"100%"}}/>
              </label>
              <p className="text-[11px] text-foreground/80">O campo já vem preenchido com o horário atual do Acre. Se você não alterar, o sistema usa o relógio oficial do servidor; se editar, salva a data e a hora escolhidas. A data do lançamento também fica registrada no prontuário.</p>
            </div>
            <p className="rounded-lg border border-primary/30 bg-card px-3 py-2 text-[11px] font-medium leading-relaxed text-foreground dark:bg-card dark:text-foreground">
              O consumo será salvo com o horário informado (ou o horário atual) e a data do lançamento.
              {isWater
                ? "Água e outras bebidas entram no total diário de líquidos. Este registro não confirma horários programados; não registre o mesmo copo novamente na agenda."
                : isFood?"Selecione o tipo correto (Almoço, Jantar etc.). O registro aparece no histórico e será conciliado com a programação correspondente quando houver.":"Chás, energéticos, suplementos líquidos e shakes ficam no histórico, e entram no total de líquidos consumidos."}
            </p>
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={saving} onClick={closeForm}
                className="rounded-lg border border-primary/30 bg-slate-950/75 px-3 py-2.5 text-xs font-semibold text-foreground disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-bold text-primary-foreground transition hover:bg-primary disabled:opacity-50">
                <Save size={15}/>{saving ? "Salvando..." : "Registrar agora"}
              </button>
            </div>
          </form>
        </section>
      </div>, document.body
    )}
  </>;
}
