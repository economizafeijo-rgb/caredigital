import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { House, UserRound, LogIn } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { HomeClientCard } from "@/components/vigia/HomeClientCard";

export const Route = createFileRoute("/cliente")({ component: ClientPage });

function ClientPage() {
  const [name, setName] = useState("");
  const [status, setStatus] = useState<"loading" | "ready" | "guest" | "unlinked">("loading");
  useEffect(() => {
    let active = true;
    const load = async () => {
      const user = await supabase.auth.getUser();
      if (!active) return;
      if (!user.data.user) { setStatus("guest"); setName(""); return; }
      const grants = await (supabase as any).from("care_patient_access")
        .select("patient_id").eq("user_id",user.data.user.id).limit(1);
      if (!active) return;
      const patientId = grants.data?.[0]?.patient_id;
      if (grants.error || !patientId) { setStatus("unlinked"); setName(""); return; }
      const person = await (supabase as any).from("care_patients")
        .select("full_name").eq("id",patientId).limit(1);
      if (!active) return;
      if (person.error || !person.data?.length) { setStatus("unlinked"); return; }
      setName(person.data[0].full_name || "Cliente");
      setStatus("ready");
    };
    void load();
    const {data:listener} = supabase.auth.onAuthStateChange(() => { if(active) void load(); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  if (status === "loading") return <div role="status" className="rounded-xl border border-border bg-card p-4 text-sm">Verificando seu acesso…</div>;
  if (status === "guest") return <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6 text-center"><UserRound className="mx-auto text-primary" size={30}/><h1 className="mt-3 text-xl font-bold">Área do cliente</h1><p className="mt-2 text-sm text-muted-foreground">Entre com sua conta para consultar seu acompanhamento.</p><Link to="/entrar" className="mt-4 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-primary-foreground"><LogIn size={17}/> Entrar</Link></section>;
  if (status === "unlinked") return <section className="mx-auto max-w-lg rounded-2xl border border-border bg-card p-6"><h1 className="text-lg font-bold">Prontuário não vinculado</h1><p className="mt-2 text-sm text-muted-foreground">Sua conta está conectada, mas não foi possível localizar um prontuário autorizado. Solicite acesso ao administrador.</p><Link to="/" className="mt-3 inline-block text-sm font-semibold text-primary underline">Voltar à homepage</Link></section>;
  return <div className="mx-auto flex min-h-0 max-w-6xl flex-col gap-2 md:h-full md:overflow-hidden">
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-xl border border-primary/20 bg-card px-3 py-2 shadow-sm">
      <div className="flex min-w-0 items-center gap-2"><div className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary/15 text-primary"><UserRound size={18}/></div><div className="min-w-0"><p className="text-[10px] font-bold uppercase tracking-[.13em] text-primary">Área do cliente · sessão ativa</p><h1 className="truncate text-lg font-extrabold tracking-tight text-foreground sm:text-xl">{name}</h1><p className="text-xs text-muted-foreground">Meu acompanhamento de saúde</p></div></div>
      <Link to="/" className="flex shrink-0 items-center gap-2 rounded-xl border border-border bg-muted px-3 py-2.5 text-xs font-semibold text-foreground hover:bg-primary/10"><House size={16}/> Homepage</Link>
    </div>
    <div className="min-h-0 flex-1 md:overflow-hidden"><HomeClientCard/></div>

  </div>;
}