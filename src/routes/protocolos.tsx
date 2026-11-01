import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { BookOpen, ChevronDown, ClipboardList, LockKeyhole, Plus, ShieldCheck, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { DigestiveProtocolLibrary } from "@/components/vigia/DigestiveProtocolLibrary";

export const Route = createFileRoute("/protocolos")({
  head: () => ({ meta: [{ title: "Protocolos — CareDigital" }, { name: "description", content: "Biblioteca educativa e gestão protegida de protocolos." }] }),
  component: Protocolos,
});

type RealProtocol = { id:string; name:string; category:string; description:string|null; steps:unknown; created_at:string };
const ADMIN_EMAIL = "francdenisbr@gmail.com";
const initial = {name:"",category:"Tratamento",description:"",steps:""};

function Protocolos(){
  const [access,setAccess]=useState<"loading"|"admin"|"read">("loading");
  const [userId,setUserId]=useState("");
  const [adminOpen,setAdminOpen]=useState(false);
  const [records,setRecords]=useState<RealProtocol[]>([]);
  const [recordError,setRecordError]=useState("");
  const [pending,setPending]=useState(false);
  const [form,setForm]=useState(initial);
  const [formOpen,setFormOpen]=useState(false);
  const [deleteId,setDeleteId]=useState<string|null>(null);
  const [notice,setNotice]=useState("");
  useEffect(()=>{
    let mounted=true;
    const check=async()=>{
      const result=await supabase.auth.getUser();
      if(!mounted)return;
      const user=result.data.user;
      const isAdmin=Boolean(user&&(user.email??"").trim().toLowerCase()===ADMIN_EMAIL);
      setUserId(user?.id??"");
      setAccess(isAdmin?"admin":"read");
    };
    void check();
    const {data:listener}=supabase.auth.onAuthStateChange(()=>{void check()});
    return()=>{mounted=false;listener.subscription.unsubscribe()};
  },[]);
  const isAdmin=access==="admin";
  useEffect(()=>{
    if(!isAdmin||!userId){setRecords([]);return}
    let mounted=true;
    void (async()=>{
      const response=await (supabase as any).from("care_protocols")
        .select("id,name,category,description,steps,created_at")
        .eq("owner_id",userId).order("created_at",{ascending:false}).limit(100);
      if(!mounted)return;
      if(response.error)setRecordError("Não foi possível consultar os protocolos cadastrados.");
      else {setRecords(response.data??[]);setRecordError("")}
    })();
    return()=>{mounted=false};
  },[isAdmin,userId]);
  async function addProtocol(event:FormEvent<HTMLFormElement>){
    event.preventDefault();
    if(!isAdmin||!userId||pending||!form.name.trim())return;
    setPending(true);setNotice("");
    const steps=form.steps.split("\n").map(x=>x.trim()).filter(Boolean);
    const response=await (supabase as any).from("care_protocols")
      .insert({owner_id:userId,name:form.name.trim(),category:form.category,description:form.description.trim(),steps})
      .select("id,name,category,description,steps,created_at").single();
    setPending(false);
    if(response.error){setNotice("Não foi possível salvar no prontuário. Verifique as permissões e tente novamente.");return}
    setRecords(prev=>[response.data,...prev]);setForm(initial);setFormOpen(false);
    setNotice("Protocolo salvo no Supabase.");
  }
  async function removeProtocol(){
    if(!deleteId||!isAdmin||!userId||pending)return;
    setPending(true);setNotice("");
    const response=await (supabase as any).from("care_protocols")
      .delete().eq("id",deleteId).eq("owner_id",userId).select("id");
    setPending(false);
    if(response.error||!response.data?.length){setNotice("Não foi possível excluir. Pode haver pacientes vinculados ao protocolo.");return}
    setRecords(prev=>prev.filter(x=>x.id!==deleteId));setDeleteId(null);
    setNotice("Protocolo excluído do banco.");
  }
  return <div className="mx-auto max-w-6xl space-y-4">
    <header className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-card px-4 py-3">
      <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-primary/10 text-primary"><BookOpen size={21}/></span><div><p className="text-[10px] font-semibold uppercase tracking-widest text-primary">CareDigital · Biblioteca</p><h1 className="text-xl font-bold tracking-tight text-foreground">Protocolos de cuidado</h1><p className="text-xs text-muted-foreground">Orientações organizadas, consulta simples e segura.</p></div></div>
      <span className="flex items-center gap-1.5 rounded-full border border-border bg-muted px-3 py-1.5 text-xs text-muted-foreground">{isAdmin?<ShieldCheck size={15}/>:<LockKeyhole size={15}/>} {isAdmin?"Gestão autorizada":"Consulta somente"}</span>
    </header>
    <DigestiveProtocolLibrary />
    {isAdmin&&<section className="overflow-hidden rounded-2xl border border-border bg-card">
      <button type="button" onClick={()=>setAdminOpen(v=>!v)} aria-expanded={adminOpen} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 text-sm font-semibold"><ClipboardList size={18} className="text-primary"/> Protocolos cadastrados na administração <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{records.length}</span></span>
        <ChevronDown size={18} className={adminOpen?"rotate-180 transition-transform":"transition-transform"}/>
      </button>
      {adminOpen&&<div className="space-y-3 border-t border-border p-4">
        <div className="flex items-center justify-between"><p className="text-xs text-muted-foreground">Apenas protocolos reais do Supabase. Alterações reservadas ao administrador.</p><button type="button" onClick={()=>setFormOpen(v=>!v)} className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><Plus size={14}/> Novo</button></div>
        {formOpen&&<form onSubmit={e=>void addProtocol(e)} className="grid gap-3 rounded-xl border border-border bg-muted/35 p-3 sm:grid-cols-2">
          <label className="text-xs font-semibold">Nome<input required maxLength={80} className="field mt-1" value={form.name} onChange={e=>setForm(v=>({...v,name:e.target.value}))}/></label>
          <label className="text-xs font-semibold">Categoria<select className="field mt-1" value={form.category} onChange={e=>setForm(v=>({...v,category:e.target.value}))}><option>Tratamento</option><option>Doença</option><option>Dieta</option><option>Suplementação</option></select></label>
          <label className="text-xs font-semibold sm:col-span-2">Descrição<input maxLength={240} className="field mt-1" value={form.description} onChange={e=>setForm(v=>({...v,description:e.target.value}))}/></label>
          <label className="text-xs font-semibold sm:col-span-2">Etapas — uma por linha<textarea required rows={3} maxLength={3000} className="field mt-1" value={form.steps} onChange={e=>setForm(v=>({...v,steps:e.target.value}))}/></label>
          <div className="flex justify-end gap-2 sm:col-span-2"><button type="button" onClick={()=>setFormOpen(false)} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button><button disabled={pending} type="submit" className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-primary-foreground disabled:opacity-60">Salvar no banco</button></div>
        </form>}
        {recordError&&<p role="alert" className="text-xs text-destructive">{recordError}</p>}
        {!records.length&&<p className="rounded-lg bg-muted px-3 py-4 text-sm text-muted-foreground">Nenhum protocolo cadastrado. A biblioteca educativa acima continua disponível para consulta.</p>}
        <div className="max-h-72 space-y-2 overflow-y-auto">{records.map(record=><article key={record.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3"><div className="min-w-0"><p className="truncate text-sm font-semibold">{record.name}</p><p className="text-xs text-muted-foreground">{record.category} · {Array.isArray(record.steps)?record.steps.length:0} etapas</p></div><button type="button" title="Excluir protocolo cadastrado" onClick={()=>setDeleteId(record.id)} className="rounded-lg border border-destructive/25 p-2 text-destructive"><Trash2 size={16}/></button></article>)}</div>
        {notice&&<p role="status" className="text-xs text-muted-foreground">{notice}</p>}
      </div>}
    </section>}
    {deleteId&&isAdmin&&<div className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/70 p-4" role="presentation"><section role="dialog" aria-modal="true" aria-label="Confirmar exclusão" className="w-full max-w-sm rounded-2xl bg-card p-5 text-card-foreground"><h2 className="text-base font-bold">Excluir protocolo?</h2><p className="mt-2 text-sm text-muted-foreground">Esta ação remove o protocolo real do banco e não poderá ser desfeita.</p><div className="mt-4 flex justify-end gap-2"><button disabled={pending} onClick={()=>setDeleteId(null)} className="rounded-lg border border-border px-3 py-2 text-xs">Cancelar</button><button disabled={pending} onClick={()=>void removeProtocol()} className="rounded-lg bg-destructive px-3 py-2 text-xs font-semibold text-destructive-foreground">Excluir definitivamente</button></div></section></div>}
    {access==="loading"&&<p className="text-xs text-muted-foreground">Verificando permissões de gerenciamento…</p>}
  </div>;
}
