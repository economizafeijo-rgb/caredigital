import { useEffect, useState, type FormEvent } from "react";
import { ChevronDown, ClipboardList, Plus, ShieldCheck, Trash2, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

type ProtocolRecord = {
  id:string;name:string;category:string;description:string|null;steps:unknown;created_at:string;
};
type FormData = {name:string;category:string;description:string;steps:string};
const initial:FormData={name:"",category:"Tratamento",description:"",steps:""};

export function ProtocolAdminManager({ownerId}:{ownerId:string}) {
  const [open,setOpen]=useState(false);
  const [records,setRecords]=useState<ProtocolRecord[]>([]);
  const [form,setForm]=useState<FormData>(initial);
  const [formOpen,setFormOpen]=useState(false);
  const [deleting,setDeleting]=useState<string|null>(null);
  const [busy,setBusy]=useState(false);
  const [loading,setLoading]=useState(false);
  const [feedback,setFeedback]=useState("");
  const [error,setError]=useState("");

  useEffect(()=>{
    if(!open||!ownerId)return;
    let active=true;
    setLoading(true);
    void (async()=>{
      const result=await (supabase as any).from("care_protocols")
        .select("id,name,category,description,steps,created_at")
        .eq("owner_id",ownerId).order("created_at",{ascending:false}).limit(100);
      if(!active)return;
      setLoading(false);
      if(result.error){setError("Não foi possível consultar os protocolos. Verifique o acesso autorizado.");return}
      setError("");
      setRecords(result.data??[]);
    })().catch(()=>{if(active){setError("Falha na conexão com o banco de dados.");setLoading(false)}});
    return()=>{active=false};
  },[open,ownerId]);

  async function add(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if(!ownerId||busy||!form.name.trim())return;
    setBusy(true);setError("");setFeedback("");
    const steps=form.steps.split("\n").map(item=>item.trim()).filter(Boolean);
    if(!steps.length){setBusy(false);setError("Informe ao menos uma etapa do protocolo.");return}
    const result=await (supabase as any).from("care_protocols")
      .insert({owner_id:ownerId,name:form.name.trim(),category:form.category,description:form.description.trim(),steps})
      .select("id,name,category,description,steps,created_at").single();
    setBusy(false);
    if(result.error){setError("Não foi possível salvar. Confira suas permissões no Supabase.");return}
    setRecords(prev=>[result.data,...prev]);setForm(initial);setFormOpen(false);
    setFeedback("Protocolo cadastrado e salvo no banco de dados.");
  }

  async function remove() {
    if(!deleting||!ownerId||busy)return;
    setBusy(true);setError("");setFeedback("");
    const result=await (supabase as any).from("care_protocols")
      .delete().eq("id",deleting).eq("owner_id",ownerId).select("id");
    setBusy(false);
    if(result.error||!result.data?.length){setError("Não foi possível excluir. Pode existir um vínculo ativo com o protocolo.");return}
    setRecords(prev=>prev.filter(record=>record.id!==deleting));
    setDeleting(null);setFeedback("Protocolo excluído com sucesso.");
  }

  return <section className="mt-4 overflow-hidden rounded-2xl border border-border bg-card" aria-label="Gestão administrativa de protocolos">
    <button type="button" onClick={()=>setOpen(value=>!value)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/50">
      <span className="flex items-center gap-2"><ClipboardList size={18} className="text-primary"/><span className="text-sm font-bold text-foreground">Protocolos administrativos</span><span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">Acesso restrito</span></span>
      <ChevronDown size={18} className={open?"rotate-180 transition-transform":"transition-transform"}/>
    </button>
    {open&&<div className="space-y-3 border-t border-border p-4">
      <p className="inline-flex items-center gap-2 text-xs text-muted-foreground"><ShieldCheck size={15} className="text-primary"/> Modelos de protocolos do administrador. Não são exibidos na página demonstrativa.</p>
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs font-semibold text-foreground">{loading?"Carregando…":records.length+" protocolo(s) cadastrado(s)"}</span>
        <button type="button" onClick={()=>setFormOpen(v=>!v)} className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground"><Plus size={15}/> Novo protocolo</button>
      </div>
      {formOpen&&<form onSubmit={event=>void add(event)} className="grid gap-3 rounded-xl border border-border bg-muted/40 p-3 sm:grid-cols-2">
        <label className="text-xs font-semibold text-foreground">Nome<input className="field mt-1" required maxLength={80} value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label>
        <label className="text-xs font-semibold text-foreground">Categoria<select className="field mt-1" value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}><option>Tratamento</option><option>Doença</option><option>Dieta</option><option>Suplementação</option></select></label>
        <label className="text-xs font-semibold text-foreground sm:col-span-2">Descrição<input className="field mt-1" maxLength={240} value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label>
        <label className="text-xs font-semibold text-foreground sm:col-span-2">Etapas (uma por linha)<textarea className="field mt-1" required rows={3} maxLength={3000} value={form.steps} onChange={e=>setForm(v=>({...v,steps:e.target.value}))}/></label>
        <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setFormOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button><button type="submit" disabled={busy} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">Salvar protocolo</button></div>
      </form>}
      {error&&<p role="alert" className="text-xs text-destructive">{error}</p>}
      {feedback&&<p role="status" className="text-xs text-success">{feedback}</p>}
      {!loading&&records.length===0&&<p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">Ainda não há protocolos cadastrados para este administrador.</p>}
      <div className="max-h-[245px] space-y-2 overflow-y-auto">
        {records.map(record=><article key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-bold text-foreground">{record.name}</p><p className="text-[11px] text-muted-foreground">{record.category} · {Array.isArray(record.steps)?record.steps.length:0} etapas</p></div><button type="button" title="Excluir protocolo" aria-label={"Excluir "+record.name} onClick={()=>setDeleting(record.id)} className="rounded-lg border border-destructive/20 p-2 text-destructive"><Trash2 size={16}/></button></article>)}
      </div>
    </div>}
    {deleting&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/75 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-label="Confirmar exclusão de protocolo" className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-2xl">
        <div className="flex items-center justify-between gap-3"><h3 className="text-base font-bold text-foreground">Excluir protocolo?</h3><button type="button" aria-label="Fechar" onClick={()=>setDeleting(null)} disabled={busy}><X size={18}/></button></div>
        <p className="mt-2 text-xs leading-relaxed text-muted-foreground">Esta ação remove o modelo do banco. Não poderá ser desfeita e pode falhar se existir vínculo com algum paciente.</p>
        <div className="mt-4 flex justify-end gap-2"><button type="button" disabled={busy} onClick={()=>setDeleting(null)} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button><button type="button" disabled={busy} onClick={()=>void remove()} className="rounded-lg bg-destructive px-3 py-2 text-xs font-bold text-destructive-foreground">Excluir definitivamente</button></div>
      </div>
    </div>}
  </section>;
}
