import { useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Droplets, Plus, Save, UtensilsCrossed, X } from "lucide-react";
import { CareIntakePicker, CareIntakeIcon } from "./CareIntakePicker";
import { foodCategory,beverageCategory,isFoodKind,type IntakeKind,type FoodKind,type BeverageKind } from "@/lib/care-intake-categories";
import { supabase } from "@/integrations/supabase/client";

type Props = { patientId: string; onRecorded?: () => void; variant?: "home" | "panel"; mode?: "all" | "water" | "food" | "drink" };
const zone = "America/Rio_Branco";
const formatTime = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: zone, day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
}).format(new Date(date));

/** Registros avulsos não criam tarefas e não confirmam horários da programação. */
export function ClientQuickIntake({ patientId, onRecorded, variant = "panel", mode = "all" }: Props) {
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<IntakeKind>("lanche");
  const [group,setGroup]=useState<"food"|"beverage">("food");
  const [portion,setPortion]=useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("200");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const requestId = useRef<string | null>(null);

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
    setKind(mode==="water"?"agua":mode==="drink"?"cha":"lanche");
    setDescription("");
    setPortion("");
    setAmount("200");
    setError("");
    setNotice("");
    setOpen(true);
  }
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
    setError("");
    setSaving(true);
    try {
      const { data, error: failure } = await (supabase as any).rpc("care_log_unscheduled_intake", {
        p_patient_id: patientId,
        p_kind: kind,
        p_description: formDescription,
        p_amount_ml: volume,
        p_request_id: requestId.current,
      });
      if (failure) throw failure;
      if (typeof data !== "string" || !Number.isFinite(Date.parse(data))) {
        throw new Error("O servidor não confirmou o horário de registro.");
      }
      setNotice(isWater
        ? `Água registrada em ${formatTime(data)} (Acre). Meta e histórico atualizados.`
        : `Consumo (${label.toLowerCase()}) registrado em ${formatTime(data)} (Acre). Veja o histórico no prontuário.`);
      setOpen(false);
      requestId.current = null;
      onRecorded?.();
    } catch (failure) {
      setError(failure instanceof Error
        ? `Não foi possível salvar. ${failure.message}`
        : "Não foi possível salvar. Confira a conexão e tente novamente.");
      // Mantém o mesmo identificador para reenvios sem duplicar lançamentos.
    } finally {
      setSaving(false);
    }
  }

  return <>
    <button type="button" onClick={openForm} disabled={!patientId}
      className={variant === "home"
        ? "inline-flex min-h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg border border-sky-300/40 bg-sky-300/15 px-2.5 text-[11px] font-bold text-slate-900 transition hover:bg-sky-300/25 dark:text-sky-100 disabled:opacity-50"
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
      <div className="fixed inset-0 z-[150] flex items-center justify-center bg-slate-950/75 p-3 backdrop-blur-sm"
        onMouseDown={event => { if (event.target === event.currentTarget) closeForm(); }}>
        <section role="dialog" aria-modal="true" aria-labelledby="quick-intake-title"
          className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-md flex-col overflow-y-auto rounded-2xl border border-border bg-card p-4 text-card-foreground shadow-2xl sm:p-5">
          <div className="flex shrink-0 items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <span className="grid size-9 place-items-center rounded-xl bg-primary/10 text-primary">
                <CareIntakeIcon kind={kind} size={20}/>
              </span>
              <div>
                <h2 id="quick-intake-title" className="text-base font-extrabold">{mode==="water"?"Registrar água":isFood?"Registrar alimento ou refeição":"Registrar líquido"}</h2>
                <p className="text-[11px] text-muted-foreground">Consumo informado agora · horário real do Acre</p>
              </div>
            </div>
            <button type="button" aria-label="Fechar" disabled={saving} onClick={closeForm}
              className="grid size-8 place-items-center rounded-lg border border-border"><X size={18}/></button>
          </div>
          <form className="mt-3 grid min-h-0 gap-2.5" onSubmit={event => void save(event)}>
            {mode==="all"&&<div role="group" aria-label="Selecionar tipo de consumo" className="grid grid-cols-2 gap-1 rounded-xl border border-border bg-muted/35 p-1">
              <button type="button" aria-pressed={group==="food"}
                onClick={()=>{setGroup("food");setKind("lanche");setDescription("");setPortion("");setError("");}}
                className={"flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-extrabold "+(group==="food"?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-card")}>
                <UtensilsCrossed size={15}/> Alimentos e refeições
              </button>
              <button type="button" aria-pressed={group==="beverage"}
                onClick={()=>{setGroup("beverage");setKind("agua");setDescription("");setPortion("");setError("");}}
                className={"flex min-h-9 items-center justify-center gap-1.5 rounded-lg px-2 text-[11px] font-extrabold "+(group==="beverage"?"bg-primary text-primary-foreground":"text-muted-foreground hover:bg-card")}>
                <Droplets size={15}/> Líquidos e shakes
              </button>
            </div>}
            {mode!=="water"&&<div className="care-intake-picker-scroll max-h-[193px] overflow-y-auto overscroll-contain rounded-xl border border-border/60 bg-muted/[.13] p-2">
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
              ? <div className="grid min-w-0 gap-2">
                  <label className="text-xs font-semibold">O que você comeu?
                    <textarea rows={2} required maxLength={1000} value={description}
                      onChange={event => setDescription(event.target.value)}
                      placeholder={foodCategory(kind)?.example??"Descreva o alimento ou a refeição"}
                      className="field mt-1 w-full resize-none"/>
                  </label>
                  <label className="text-xs font-semibold">Quantidade ou porção (opcional)
                    <input type="text" className="field mt-1 w-full" maxLength={100} value={portion}
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
            <p className="rounded-lg bg-muted/60 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground">
              O horário real do registro será salvo automaticamente (Acre).
              {isWater
                ? "Apenas água é contabilizada na meta diária. Este registro não substitui confirmações da programação."
                : isFood?"Frutas, lanches e refeições completas são salvos no histórico de alimentação, sem confirmar uma refeição programada.":"Chás, energéticos, suplementos líquidos e shakes ficam no histórico, sem somar à meta exclusiva de água."}
            </p>
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
            <div className="grid grid-cols-2 gap-2">
              <button type="button" disabled={saving} onClick={closeForm}
                className="rounded-lg border border-border px-3 py-2.5 text-xs font-semibold disabled:opacity-50">Cancelar</button>
              <button type="submit" disabled={saving}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2.5 text-xs font-extrabold text-primary-foreground disabled:opacity-50">
                <Save size={15}/>{saving ? "Salvando..." : "Registrar agora"}
              </button>
            </div>
          </form>
        </section>
      </div>, document.body
    )}
  </>;
}
