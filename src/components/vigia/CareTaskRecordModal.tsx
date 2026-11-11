import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { CheckCircle2, Clock3, Droplets, Pencil, X, UtensilsCrossed, Pill, CalendarClock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { canConfirmCare, careScheduleLabel } from "@/lib/care-schedule";
import { CareTaskResolutionPanel, type CareResolution } from "./CareTaskResolutionPanel";

export type CareTaskRecord = {
  id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
};

type TaskDetails = {
  task_id: string;
  title: string;
  category: string;
  scheduled_at: string;
  completed_at: string | null;
  description: string | null;
  amount_ml: number | null;
  water_entry_id: string | null;
  last_corrected_at: string | null;
  can_edit_water: boolean;
};

type WaterResponse={response:string;recorded_at:string}|null;

type Props = {
  task: CareTaskRecord | null;
  onClose: () => void;
  onSaved?: () => void;
  onConfirm?: (task: CareTaskRecord) => void;
};

const acreDay=(date:Date)=>new Intl.DateTimeFormat("en-CA",{timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit"}).format(date);
const acreTime=()=>new Intl.DateTimeFormat("en-GB",{timeZone:"America/Rio_Branco",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date());

const stamp = (date: string) => new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Rio_Branco",
  day: "2-digit", month: "2-digit", year: "numeric",
  hour: "2-digit", minute: "2-digit", second: "2-digit",
}).format(new Date(date));

const label = (category: string) =>
  category === "hidratacao" ? "Hidratação" :
  category === "refeicao" ? "Refeição" :
  category === "medicacao" ? "Medicação" : "Cuidado";

export function CareTaskRecordModal({ task, onClose, onSaved, onConfirm }: Props) {
  const [details, setDetails] = useState<TaskDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState("");
  const [editingMeal,setEditingMeal]=useState(false);
  const [mealDescription,setMealDescription]=useState("");
  const [mealTime,setMealTime]=useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [waterResponse,setWaterResponse]=useState<WaterResponse>(null);
  const [responseReady,setResponseReady]=useState(false);
  const [confirmNo,setConfirmNo]=useState(false);
  const [decisionSaving,setDecisionSaving]=useState(false);
  const [resolution,setResolution]=useState<CareResolution|null>(null);
  const [resolutionReady,setResolutionReady]=useState(false);

  useEffect(() => {
    if (!task) {
      setDetails(null);
      setWaterResponse(null);
      setResponseReady(false);
      setResolution(null);
      setResolutionReady(false);
      setConfirmNo(false);
      setEditing(false);
      setEditingMeal(false);
      setError("");
      setSuccess("");
      return;
    }
    let active = true;
    setLoading(true);
    setEditing(false);
    setEditingMeal(false);
    setError("");
    setSuccess("");
    setDetails(null);
    setWaterResponse(null);
    setResponseReady(false);
    setResolution(null);
    setResolutionReady(false);
    setConfirmNo(false);
    void (async () => {
      const [response,waterDecision,resolutionResult] = await Promise.all([
        (supabase as any).rpc("care_get_task_record", {p_task_id:task.id}),
        task.category==="hidratacao"?
          (supabase as any).from("care_hydration_responses")
            .select("response,recorded_at").eq("task_id",task.id).maybeSingle()
          : Promise.resolve({data:null,error:null}),
        (supabase as any).from("care_task_resolutions")
          .select("task_id,status,reason,resolved_at").eq("task_id",task.id).maybeSingle(),
      ]);
      if (!active) return;
      if (response.error) {
        setError("Não foi possível consultar o registro: " + response.error.message);
      } else if (response.data && response.data.task_id === task.id) {
        setDetails(response.data as TaskDetails);
        setAmount(String(response.data.amount_ml ?? ""));
        setMealDescription(response.data.description ?? "");
        const mealStamp=response.data.completed_at ?? response.data.scheduled_at;
        setMealTime(response.data.completed_at ? new Intl.DateTimeFormat("en-GB",{timeZone:"America/Rio_Branco",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).format(new Date(mealStamp)) : acreTime());
      } else {
        setError("Registro não encontrado no prontuário.");
      }
      if(waterDecision.error){
        setResponseReady(false);
        setError("Não foi possível verificar respostas anteriores de água. Atualize e tente novamente.");
      }else{
        setWaterResponse(waterDecision.data as WaterResponse);
        setResponseReady(true);
      }
      if(resolutionResult.error){
        setResolutionReady(false);
        setError("Não foi possível conferir o estado da pendência. Atualize para tentar novamente.");
      }else{
        setResolution(resolutionResult.data as CareResolution|null);
        setResolutionReady(true);
      }
      setLoading(false);
    })();
    return () => { active = false; };
  }, [task?.id]);

  if (!task || typeof document === "undefined") return null;

  async function saveCorrection(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!task || !details?.can_edit_water || saving) return;
    const volume = Number(amount);
    if (!Number.isInteger(volume) || volume < 10 || volume > 1500) {
      setError("Informe uma quantidade entre 10 e 1.500 ml.");
      return;
    }
    if (volume === details.amount_ml) {
      setEditing(false);
      setError("");
      return;
    }

    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await (supabase as any).rpc("care_correct_water_quantity", {
        p_task_id: task.id,
        p_new_amount_ml: volume,
      });
      if (response.error) throw response.error;
      if (response.data?.amount_ml !== volume) {
        throw new Error("O servidor não confirmou a alteração; consulte novamente o registro.");
      }
      setDetails(old => old ? {
        ...old,
        amount_ml: response.data.amount_ml,
        last_corrected_at: response.data.corrected_at,
      } : old);
      setEditing(false);
      setSuccess(`Quantidade corrigida de ${response.data.previous_ml} para ${volume} ml. O horário original foi preservado. Total do dia: ${response.data.daily_total_ml} ml.`);
      onSaved?.();
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : "Não foi possível corrigir o registro.");
    } finally {
      setSaving(false);
    }
  }

  async function confirmPendingMeal(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!task||!details||details.category!=="refeicao"||details.completed_at||saving||!canConfirmCare(details)||!resolutionReady||resolution)return;
    const description=mealDescription.trim();
    if(description.length<3||description.length>900){setError("Informe os alimentos consumidos (3 a 900 caracteres).");return;}
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(mealTime)){setError("Informe um horário válido.");return;}
    const scheduledDay=acreDay(new Date(details.scheduled_at));
    const actual=new Date(scheduledDay+"T"+mealTime+":00-05:00");
    if(!Number.isFinite(actual.getTime())||actual.getTime()>Date.now()){setError("Esse horário ainda não ocorreu no Acre. Confira a hora informada.");return;}
    setSaving(true);setError("");setSuccess("");
    try{
      const response=await (supabase as any).rpc("care_replace_meal",{p_task_id:task.id,p_description:description,p_consumed_at:actual.toISOString()});
      if(response.error)throw response.error;
      const verified=await (supabase as any).rpc("care_get_task_record",{p_task_id:task.id});
      if(verified.error||!verified.data||verified.data.task_id!==task.id)throw new Error("Registro enviado, mas não foi possível conferir a confirmação. Consulte o prontuário antes de repetir.");
      const saved=verified.data as TaskDetails;
      if(!saved.completed_at||saved.description?.trim()!==description||Math.abs(Date.parse(saved.completed_at)-actual.getTime())>61000)throw new Error("O servidor não confirmou os dados informados. Consulte o prontuário antes de repetir.");
      setDetails(saved);setSuccess("Refeição confirmada com os alimentos e o horário informados.");onSaved?.();
    }catch(failure){setError(failure instanceof Error?failure.message:"Não foi possível confirmar a refeição.");}
    finally{setSaving(false);}
  }

  async function saveMealCorrection(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!task||!details||details.category!=="refeicao"||!details.completed_at||saving)return;
    const description=mealDescription.trim();
    if(description.length<3||description.length>900){setError("Descreva o que foi consumido (3 a 900 caracteres).");return;}
    if(!/^([01]\d|2[0-3]):[0-5]\d$/.test(mealTime)){setError("Informe um horário válido no Acre.");return;}
    const dateAcre=acreDay(new Date(details.completed_at));
    const consumedAt=new Date(dateAcre+"T"+mealTime+":00-05:00");
    if(!Number.isFinite(consumedAt.getTime())||consumedAt.getTime()>Date.now()){setError("O horário informado não pode estar no futuro.");return;}
    setSaving(true);setError("");setSuccess("");
    try{
      const result=await (supabase as any).rpc("care_replace_meal",{p_task_id:task.id,p_description:description,p_consumed_at:consumedAt.toISOString()});
      if(result.error)throw result.error;
      const fresh=await (supabase as any).rpc("care_get_task_record",{p_task_id:task.id});
      if(fresh.error||!fresh.data||fresh.data.task_id!==task.id)throw new Error("A alteração foi enviada, mas não foi possível verificar o registro atualizado. Consulte novamente antes de repetir.");
      const updated=fresh.data as TaskDetails;
      if(updated.description?.trim()!==description||!updated.completed_at||Math.abs(Date.parse(updated.completed_at)-consumedAt.getTime())>61000)throw new Error("Não foi possível confirmar os novos dados. Verifique o prontuário antes de repetir.");
      setDetails(updated);setEditingMeal(false);setSuccess("Alimentos e horário real atualizados.");onSaved?.();
    }catch(failure){setError(failure instanceof Error?failure.message:"Não foi possível atualizar a refeição.");}
    finally{setSaving(false);}
  }

  async function changeWaterDecision(decision:"not_drunk"|"reset_not_drunk"){
    if(!task||!details||details.category!=="hidratacao"||details.completed_at||
       !responseReady||!resolutionReady||resolution||saving||decisionSaving||!canConfirmCare(details))return;
    if(decision==="not_drunk"&&!confirmNo)return;
    if(decision==="reset_not_drunk"&&waterResponse?.response!=="not_drunk")return;
    setDecisionSaving(true);setError("");setSuccess("");
    try{
      const result=await (supabase as any).rpc("care_record_water_decision",{
        p_task_id:task.id,p_decision:decision,p_amount_ml:null
      });
      if(result.error)throw result.error;
      if(result.data?.decision!==decision)throw new Error("O servidor não confirmou a resposta; consulte o prontuário.");
      if(decision==="not_drunk"){
        const recorded=result.data.recorded_at;
        if(typeof recorded!=="string"||!Number.isFinite(Date.parse(recorded)))
          throw new Error("O servidor não retornou a hora da resposta. Verifique o prontuário antes de repetir.");
        setWaterResponse({response:"not_drunk",recorded_at:recorded});
        setSuccess("“Não bebi” registrado com o horário real. Nenhum volume de água foi contabilizado.");
      }else{
        setWaterResponse(null);
        setSuccess("Resposta desfeita com registro no histórico. Se bebeu, você pode confirmar agora.");
      }
      setConfirmNo(false);
      onSaved?.();
    }catch(failure){
      setError(failure instanceof Error?failure.message:"Não foi possível salvar a resposta. Tente novamente.");
      setConfirmNo(false);
      onSaved?.();
    }finally{setDecisionSaving(false);}
  }

  const row = (title: string, value: string) =>
    <div className="min-w-0 rounded-lg border border-border/60 bg-background/65 px-2.5 py-1.5 shadow-sm backdrop-blur-sm">
      <dt className="text-[11px] font-semibold tracking-wide text-muted-foreground">{title}</dt>
      <dd className="mt-0.5 break-words text-xs font-semibold leading-tight sm:text-sm text-foreground">{value}</dd>
    </div>;
  const CategoryIcon=task?.category==="refeicao"?UtensilsCrossed:task?.category==="hidratacao"?Droplets:Pill;

  const skippedWater=details?.category==="hidratacao"&&waterResponse?.response==="not_drunk";
  const canMarkNo=Boolean(details&&details.category==="hidratacao"&&!details.completed_at&&responseReady&&resolutionReady&&!resolution&&!skippedWater&&canConfirmCare(details));
  const canUndoNo=Boolean(details&&details.category==="hidratacao"&&!details.completed_at&&responseReady&&resolutionReady&&!resolution&&skippedWater&&canConfirmCare(details));
  const canConfirm=Boolean(details&&!details.completed_at&&onConfirm&&
    ["hidratacao","refeicao","medicacao"].includes(details.category)&&canConfirmCare(details)&&
    resolutionReady&&!resolution&&(details.category!=="hidratacao"||(responseReady&&!skippedWater)));

  return createPortal(
    <div className="care-record-modal-overlay care-detail-v4 care-modal-theme fixed inset-0 z-[10020] flex items-center justify-center overflow-hidden bg-slate-950/60 p-2 backdrop-blur-sm sm:p-3"
      onMouseDown={event => { if (event.target === event.currentTarget && !saving && !decisionSaving) onClose(); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="care-task-record-title"
        data-care-type={task.category} className="care-record-modal-dialog care-detail-dialog-v4 flex w-full max-w-[680px] flex-col overflow-hidden rounded-[20px] border border-border/70 bg-card text-card-foreground shadow-[0_28px_100px_rgba(0,0,0,.35)]">
        <header className="care-detail-header shrink-0 border-b border-border px-4 py-4 sm:px-5">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-border bg-muted px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.12em] text-foreground">
                <CategoryIcon size={15}/> {label(task.category)} · Detalhes
              </div>
              <h2 id="care-task-record-title" className="text-xl font-bold leading-tight tracking-tight text-foreground sm:text-2xl">{task.title}</h2>
              <p className="care-detail-description mt-1 text-xs text-muted-foreground">Confira os dados e escolha como deseja prosseguir.</p>
    
            </div>
            <button type="button" aria-label="Fechar detalhes" disabled={saving||decisionSaving} onClick={onClose}
              className="grid size-9 shrink-0 place-items-center rounded-full border border-border bg-surface text-foreground transition hover:bg-muted disabled:opacity-50">
              <X size={19}/>
            </button>
          </div>
        </header>
        <div className="care-detail-content min-h-0 overflow-y-auto overscroll-contain px-4 pb-4 pt-3 sm:px-5 sm:pb-5 [scrollbar-width:thin]">
          {details?.completed_at && <div className="mb-2 flex items-center gap-2 rounded-xl border border-emerald-500/25 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-foreground"><CheckCircle2 size={17} className="shrink-0 text-emerald-500"/> Registro realizado com sucesso</div>}

        {loading ? <p role="status" className="mt-3 text-sm text-muted-foreground">Consultando o prontuário…</p> :
          details && <dl className="care-detail-facts grid grid-cols-1 gap-2 sm:grid-cols-2">
            {row("Horário planejado · Acre", stamp(details.scheduled_at))}
            {row("Situação", details.completed_at?"Confirmado":resolution?.status==="cancelado"?"Cancelado · informado pelo cliente":resolution?.status==="nao_cumprido"?"Não realizado · informado pelo cliente":skippedWater?"Não bebi · resposta registrada":careScheduleLabel(details))}
            {skippedWater&&waterResponse?.recorded_at&&row("Resposta registrada em (Acre)",stamp(waterResponse.recorded_at))}
            {details.completed_at && row("Horário real do consumo · Acre", stamp(details.completed_at))}
            {details.category === "refeicao" && row("Alimentos informados", details.description || "Sem descrição detalhada registrada")}
            {details.category === "hidratacao" && details.completed_at && row(
              "Quantidade registrada",
              details.amount_ml === null ? "Volume não localizado — consulte o responsável" : `${details.amount_ml} ml`
            )}
            {details.last_corrected_at && row("Última correção (Acre)", stamp(details.last_corrected_at))}
          </dl>}

        {!editing&&!editingMeal&&details&&!details.completed_at&&resolutionReady&&(!skippedWater||Boolean(resolution))&&<div className="care-record-pending-actions rounded-xl border border-primary/30 bg-primary/[.045] px-3 pb-3 pt-1">
          <p className="mt-2 text-xs font-bold text-foreground">Registrar uma decisão</p>
          <CareTaskResolutionPanel key={task.id} task={task} resolution={resolution} waterAnswered={Boolean(skippedWater)}
            onChange={setResolution} onSaved={()=>onSaved?.()} onClose={onClose}/>
        </div>}
        {details?.category==="refeicao"&&!details.completed_at&&resolutionReady&&!resolution&&canConfirmCare(details)&&<form onSubmit={event=>void confirmPendingMeal(event)} className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-primary/30 bg-primary/[.045] p-2.5 sm:grid-cols-[minmax(0,1fr)_150px]"><div className="sm:col-span-2"><p className="text-xs font-bold">Informar consumo antes de confirmar</p></div><label className="block text-xs font-semibold">O que você consumiu?<textarea required minLength={3} maxLength={900} rows={2} value={mealDescription} onChange={event=>setMealDescription(event.target.value)} placeholder="Ex.: pão, ovo, banana e café; inclua as quantidades se desejar." className="mt-1 w-full resize-y rounded-lg border border-border bg-background p-2 text-sm text-foreground"/></label><label className="block text-xs font-semibold">Horário real da refeição · Acre<input required type="time" value={mealTime} onChange={event=>setMealTime(event.target.value)} className="mt-1 w-full rounded-lg border border-border bg-background p-2 text-sm text-foreground"/></label><button type="submit" disabled={saving||mealDescription.trim().length<3||!mealTime} className="min-h-9 w-full rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50 sm:col-span-2">{saving?"Confirmando…":"Confirmar refeição com estes dados"}</button></form>}

        {details?.category==="refeicao"&&details.completed_at&&!editingMeal&&<button type="button" onClick={()=>{setEditingMeal(true);setError("");setSuccess("");}} className="mt-3 inline-flex min-h-10 items-center gap-2 rounded-xl border border-primary/35 bg-primary/10 px-3 text-xs font-bold text-primary transition hover:bg-primary/15"><Pencil size={15}/> Editar alimentos e horário real</button>}
        {editingMeal&&details?.category==="refeicao"&&details.completed_at&&<form onSubmit={event=>void saveMealCorrection(event)} className="mt-2 grid grid-cols-1 gap-2 rounded-xl border border-primary/25 bg-muted/20 p-2.5 sm:grid-cols-[minmax(0,1fr)_150px]"><p className="text-sm font-bold">Corrigir refeição registrada</p><label className="block text-xs font-semibold">O que foi consumido?<textarea required minLength={3} maxLength={900} rows={3} value={mealDescription} onChange={event=>setMealDescription(event.target.value)} className="mt-1 w-full resize-y rounded-xl border border-border bg-background p-3 text-sm text-foreground" placeholder="Alimentos, bebidas e quantidades consumidas"/></label><label className="block text-xs font-semibold">Horário real do consumo · Acre<input required type="time" value={mealTime} onChange={event=>setMealTime(event.target.value)} className="mt-1 w-full rounded-xl border border-border bg-background p-3 text-sm text-foreground"/></label><p className="text-[11px] leading-relaxed text-muted-foreground">A data da refeição é mantida. O horário planejado não será modificado.</p><div className="grid grid-cols-2 gap-2"><button type="button" disabled={saving} onClick={()=>{setEditingMeal(false);setError("");}} className="rounded-xl border border-border px-3 py-2 text-xs font-semibold">Cancelar</button><button type="submit" disabled={saving||mealDescription.trim().length<3||!mealTime} className="rounded-xl bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-50">{saving?"Salvando…":"Salvar alterações"}</button></div></form>}

        {details?.category==="hidratacao"&&!details.completed_at&&!resolution&&<p className="care-detail-hint mt-3 text-xs text-muted-foreground">Para alterar o horário, utilize Remarcar. Para registrar o volume realmente consumido, selecione Bebi água.</p>}
        {details?.can_edit_water && !editing && <button type="button" onClick={() => { setEditing(true); setError(""); setSuccess(""); }}
          className="mt-3 inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-primary/40 bg-primary/10 px-3 text-xs font-bold text-primary hover:bg-primary/15">
          <Pencil size={15}/> Corrigir quantidade de água
        </button>}

        {editing && details?.can_edit_water && <form className="mt-3 rounded-xl border border-primary/30 bg-muted/20 p-3" onSubmit={event => void saveCorrection(event)}>
          <label className="block text-xs font-bold">Quantidade correta (ml)
            <input type="number" inputMode="numeric" min={10} max={1500} step={1} required
              value={amount} onChange={event => setAmount(event.target.value)}
              className="field mt-1 w-full" autoFocus/>
          </label>
          <p className="mt-2 text-[11px] leading-relaxed text-muted-foreground">
            Somente os ml serão alterados. Data e hora originais permanecerão iguais, e o histórico da correção será preservado.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" disabled={saving} onClick={() => { setEditing(false); setAmount(String(details.amount_ml ?? "")); setError(""); }}
              className="rounded-lg border border-border px-3 py-2 text-xs font-semibold">Cancelar</button>
            <button type="submit" disabled={saving} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">
              {saving ? "Salvando…" : "Salvar correção"}
            </button>
          </div>
        </form>}

        {confirmNo&&canMarkNo&&!editing&&<div role="group" aria-label="Confirmar ausência de consumo"
          className="mt-3 rounded-xl border border-amber-500/35 bg-amber-500/[.08] p-3">
          <p className="text-xs font-bold">Você não bebeu água neste horário?</p>
          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">Vamos registrar sua resposta com a data e hora reais, sem somar nenhum ml à meta. Você poderá corrigir depois.</p>
          <div className="mt-3 flex justify-end gap-2">
            <button type="button" disabled={decisionSaving} onClick={()=>setConfirmNo(false)}
              className="min-h-9 rounded-lg border border-border px-3 text-[11px] font-semibold">Cancelar</button>
            <button type="button" disabled={decisionSaving} onClick={()=>void changeWaterDecision("not_drunk")}
              className="min-h-9 rounded-lg bg-amber-600 px-3 text-[11px] font-bold text-foreground hover:bg-amber-700 disabled:opacity-50">
              {decisionSaving?"Salvando…":"Sim, não bebi"}
            </button>
          </div>
        </div>}

        {success && <p role="status" className="mt-3 flex items-start gap-1.5 rounded-lg border border-success/30 bg-success/10 p-2 text-xs text-foreground">
          <CheckCircle2 size={16} className="shrink-0 text-success"/>{success}
        </p>}
        {error && <p role="alert" className="mt-3 rounded-lg border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">{error}</p>}
        <div className="mt-2 flex items-center gap-2 text-[11px] leading-snug text-muted-foreground">
          {details?.completed_at?<><CheckCircle2 size={14}/> Registro confirmado; consulta não altera o consumo.</>:
            resolution?<><CheckCircle2 size={14}/> Esta pendência já recebeu uma resposta. Confira ou corrija no prontuário.</>:
            skippedWater?<><Droplets size={14}/> Você informou “Não bebi”. Nenhum ml foi contabilizado.</>:
            <><Clock3 size={14}/> Este cuidado ainda não foi confirmado.</>}
        </div>

        {!editing&&!editingMeal && <div className="care-detail-footer mt-2 flex flex-wrap items-center gap-2">
          <button type="button" disabled={saving||decisionSaving} onClick={onClose}
            className="min-h-11 min-w-[75px] flex-1 rounded-xl border border-border bg-background/50 px-3 py-2.5 text-sm font-semibold transition hover:bg-muted">Fechar</button>
          {canUndoNo&&<button type="button" disabled={saving||decisionSaving}
            onClick={()=>void changeWaterDecision("reset_not_drunk")}
            className="min-h-10 min-w-[125px] flex-1 rounded-lg border border-amber-500/40 bg-amber-500/10 px-2 py-2.5 text-xs font-bold text-foreground hover:bg-amber-500/20">
            {decisionSaving?"Corrigindo…":"Desfazer “Não bebi”"}
          </button>}
          {canConfirm&&onConfirm&&!confirmNo&&details?.category!=="refeicao"&&<button type="button" disabled={saving||decisionSaving}
            onClick={()=>{onClose();onConfirm(task);}}
            className="min-h-10 min-w-[110px] flex-1 rounded-lg bg-primary px-2.5 py-2.5 text-xs font-bold text-primary-foreground">
            {details?.category==="hidratacao"?"Bebi água":"Confirmar agora"}
          </button>}
        </div>}
        </div>
      </section>
    </div>, document.body
  );
}
