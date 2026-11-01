import {createFileRoute,Link} from "@tanstack/react-router";
import {HomeClientCard} from "@/components/vigia/HomeClientCard";
import {House} from "lucide-react";
export const Route=createFileRoute("/cliente")({component:ClientPage});
function ClientPage(){
 return <div className="mx-auto max-w-6xl space-y-2">
  <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border bg-card/95 px-3 py-2.5">
   <div><p className="text-[10px] font-semibold uppercase tracking-wider text-primary">CareDigital · Área do cliente</p><h1 className="text-base font-bold">Meu acompanhamento</h1></div>
   <Link to="/" className="flex items-center gap-2 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground"><House size={15}/> Ir para a homepage</Link>
  </div>
  <HomeClientCard/>
  <p className="px-1 text-[11px] text-muted-foreground">Horários no fuso do Acre. As confirmações registram o momento efetivo no servidor; não substituem orientações profissionais.</p>
 </div>;
}