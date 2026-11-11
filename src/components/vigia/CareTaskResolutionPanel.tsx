import { useState, type FormEvent } from "react";
import { AlertTriangle, CalendarClock, CheckCircle2, RotateCcw, XCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { type CareTaskRecord } from "./CareTaskRecordModal";

export type CareResolution = {
  task_id:string;
  status:"nao_cumprido"|"cancelado";
  reason:string;
  resolved_at:string;
};
type Action="nao_cumprido"|"cancelado"|"remarcado";
type Props={
  task:CareTaskRecord;
  resolution:CareResolution|null;
  waterAnswered:boolean;
  onChange:(value:CareResolution|null)=>void;
  onSaved:()=>void;
  onClose:()=>void;
};

const acreDate=(iso:string)=>new Intl.DateTimeFormat("en-CA",{
  timeZone:"America/Rio_Branco",year:"numeric",month:"2-digit",day:"2-digit",
}).format(new Date(iso));
const acreTime=(iso:string)=>new Intl.DateTimeFormat("pt-BR",{
  timeZone:"America/Rio_Branco",hour:"2-digit",minute:"2-digit",hour12:false
}).format(new Date(iso));
const isBefore=(value:string)=>Date.parse(value)>Date.now();

export function CareTaskResolutionPanel({
  task,resolution,waterAnswered,onChange,onSaved,onClose
}:Props){
  const [action,setAction]=useState<Action|null>(null);
  const [reason,setReason]=useState("");
  const [time,setTime]=useState(acreTime(task.scheduled_at));
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState("");
  const [receipt,setReceipt]=useState("");
  const isMed=task.category==="medicacao";
  const canReschedule=task.category==="refeicao"||task.category==="hidratacao";
  const started=Date.now()>=Date.parse(task.scheduled_at);
  const isResolved=Boolean(resolution);
  const canShowActions=!task.completed_at&&!isResolved&&!waterAnswered&&started;

  async function commit(event:FormEvent){
    event.preventDefault();
    if(!action||busy||!canShowActions)return;
    setBusy(true);setError("");setReceipt("");
    try{
      let outcome:any;
      if(action==="remarcado"){
        if(!canReschedule)throw new Error("Medicações devem seguir a orientação de prescrição.");
        if(!/^\d{2}:\d{2}$/.test(time))throw new Error("Informe um horário válido.");
        const date=acreDate(task.scheduled_at);
        const timestamp=date+"T"+time+":00-05:00";
        if(!isBefore(timestamp))throw new Error("Informe um horário futuro.");
        outcome=await (supabase as any).rpc("care_reschedule_pending_task",{
          p_task_id:task.id,p_new_scheduled_at:timestamp,p_reason:reason.trim()
        });
      }else{
        outcome=await (supabase as any).rpc("care_resolve_pending_task",{
          p_task_id:task.id,p_status:action,p_reason:reason.trim()
        });
      }
      if(outcome.error)throw outcome.error;
      if(outcome.data?.task_id!==task.id||outcome.data?.status!==action)
        throw new Error("O servidor não confirmou a decisão. Verifique o histórico antes de tentar novamente.");
      if(action==="remarcado"){
        setReceipt("Remarcação salva no prontuário com o horário real.");
        onSaved();
        onClose();
        return;
      }
      const resolvedAt=outcome.data.resolved_at;
      if(typeof resolvedAt!=="string"||!Number.isFinite(Date.parse(resolvedAt)))
        throw new Error("Resposta registrada, mas não foi possível confirmar o horário. Consulte o prontuário.");
      onChange({task_id:task.id,status:action,reason:reason.trim(),resolved_at:resolvedAt});
      setReceipt(action==="nao_cumprido"
        ?"Cuidado registrado como não realizado. Não aparecerá mais na faixa de pendências."
        :"Cuidado marcado como cancelado. Não aparecerá mais na faixa de pendências.");
      setAction(null);
      onSaved();
    }catch(failure){
      setError(failure instanceof Error?failure.message:"Não foi possível registrar a resposta.");
      onSaved();
    }finally{setBusy(false);}
  }

  async function undo(){
    if(busy||!resolution)return;
    setBusy(true);setError("");setReceipt("");
    try{
      const result=await (supabase as any).rpc("care_undo_task_resolution",{p_task_id:task.id});
      if(result.error)throw result.error;
      if(result.data?.task_id!==task.id||result.data?.status!=="pendente")
        throw new Error("A reversão não foi confirmada pelo servidor.");
      onChange(null);
      setReceipt("Decisão desfeita. O cuidado voltou a ficar disponível para registro.");
      onSaved();
    }catch(failure){
      setError(failure instanceof Error?failure.message:"Não foi possível desfazer a decisão.");
      onSaved();
    }finally{setBusy(false);}
  }

  return <div className="care-resolution-panel mt-3 space-y-2 border-t border-border/65 pt-3">
    {isResolved&&<div className="rounded-xl border border-emerald-500/35 bg-emerald-500/[.065] p-3">
      <p className="flex items-center gap-1.5 text-xs font-bold text-foreground">
        <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-300"/>
        {resolution?.status==="cancelado"?"Cancelamento registrado":"Cuidado informado como não realizado"}
      </p>
      <p className="mt-1 text-[11px] text-muted-foreground">
        Resposta salva em {resolution&&acreTime(resolution.resolved_at)} (Acre). O registro original permanece no histórico.
      </p>
      {resolution?.reason&&<p className="mt-1 break-words text-[11px] text-foreground">Observação: {resolution.reason}</p>}
      <button type="button" disabled={busy} onClick={()=>void undo()}
        className="mt-2 inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-primary/40 bg-card px-3 text-[11px] font-bold text-foreground disabled:opacity-50">
        <RotateCcw size={14}/> {busy?"Corrigindo…":"Desfazer resposta"}
      </button>
    </div>}
    {canShowActions&&<div>
      <p className="mb-2 text-[11px] font-bold text-muted-foreground">Resolver pendência</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        <button type="button" disabled={busy} onClick={()=>{setAction(action==="nao_cumprido"?null:"nao_cumprido");setError("");}}
          aria-pressed={action==="nao_cumprido"}
          className={"flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold "+
            (action==="nao_cumprido"?"border-amber-500 bg-amber-500/15 text-foreground":"border-border bg-muted/35 text-foreground")}>
          <AlertTriangle size={14}/> {task.category==="refeicao"?"Não comi":task.category==="hidratacao"?"Não bebi":"Não realizei"}
        </button>
        <button type="button" disabled={busy} onClick={()=>{setAction(action==="cancelado"?null:"cancelado");setError("");}}
          aria-pressed={action==="cancelado"}
          className={"flex min-h-10 items-center justify-center gap-1 rounded-lg border px-2 text-[11px] font-bold "+
            (action==="cancelado"?"border-rose-500 bg-rose-500/15 text-foreground":"border-border bg-muted/35 text-foreground")}>
          <XCircle size={14}/> Cancelado
        </button>
        {canReschedule&&<button type="button" disabled={busy}
          onClick={()=>{setAction(action==="remarcado"?null:"remarcado");setError("");}}
          aria-pressed={action==="remarcado"}
          className={"col-span-2 flex min-h-10 items-center justify-center gap-1.5 rounded-lg border px-2 text-[11px] font-bold sm:col-span-1 "+
            (action==="remarcado"?"border-sky-500 bg-sky-500/15 text-foreground":"border-border bg-muted/35 text-foreground")}>
          <CalendarClock size={14}/> Remarcar
        </button>}
      </div>
    </div>}
    {action&&canShowActions&&<form onSubmit={event=>void commit(event)}
      className="rounded-xl border border-primary/25 bg-muted/[.16] p-3">
      <p className="text-xs font-bold text-foreground">
        {action==="nao_cumprido"?"Confirmar que não realizou este cuidado?":
         action==="cancelado"?"Confirmar que este cuidado foi cancelado?":
         "Escolha o novo horário deste cuidado"}
      </p>
      {action==="remarcado"&&<label className="mt-2 block text-[11px] font-bold text-foreground">
        Novo horário (Acre)
        <input type="time" required value={time} onChange={event=>setTime(event.target.value)}
          className="field mt-1 w-full"/>
      </label>}
      <label className="mt-2 block text-[11px] font-bold text-foreground">
        Observação (opcional)
        <textarea value={reason} onChange={event=>setReason(event.target.value)}
          rows={2} maxLength={500} placeholder="Informe o motivo, se desejar"
          className="field mt-1 w-full resize-none"/>
      </label>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A decisão será salva com a data e hora reais. {isMed?
          "Este relato não cancela a prescrição nem autoriza alterar doses; converse com seu profissional de saúde.":
          "O horário original e a alteração continuarão registrados no prontuário."}
      </p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" disabled={busy} onClick={()=>{setAction(null);setError("");}}
          className="min-h-9 rounded-lg border border-border px-3 text-[11px] font-semibold">Voltar</button>
        <button type="submit" disabled={busy}
          className="min-h-9 rounded-lg bg-primary px-3 text-[11px] font-bold text-primary-foreground disabled:opacity-50">
          {busy?"Salvando…":"Salvar decisão"}
        </button>
      </div>
    </form>}
    {error&&<p role="alert" className="rounded-lg border border-destructive/35 bg-destructive/5 p-2 text-[11px] text-destructive">{error}</p>}
    {receipt&&<p role="status" className="rounded-lg border border-emerald-500/30 bg-emerald-500/[.07] p-2 text-[11px] text-foreground">{receipt}</p>}
  </div>;
}
