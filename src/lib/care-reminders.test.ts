import { describe, expect, it } from "vitest";
import {
  CARE_REMINDER_WINDOW_MS, CARE_RECENT_UNANSWERED_MS, careReminderState, summarizeCareReminders,
  reminderCategoryLabel, reminderMmSs, type ReminderTask,
} from "./care-reminders";

const start=Date.parse("2026-11-02T17:00:00Z");
const task=(id:string,category="hidratacao",minutes=0,confirmedAt:string|null=null):ReminderTask=>({
  id,title:"Verificar cuidado",category,scheduled_at:new Date(start+minutes*60000).toISOString(),
  completed_at:confirmedAt,
});
describe("CareDigital — lembretes de até 10 minutos",()=>{
  it("fica aguardando antes do horário e inicia aviso ao chegar",()=>{
    const t=task("a");
    expect(careReminderState(t,start-1)).toBe("waiting");
    expect(careReminderState(t,start)).toBe("due");
    expect(careReminderState(t,start+CARE_REMINDER_WINDOW_MS-1)).toBe("due");
  });
  it("ao completar dez minutos mostra sem confirmação sem inventar consumo",()=>{
    const t=task("b","medicacao");
    expect(careReminderState(t,start+CARE_REMINDER_WINDOW_MS)).toBe("unconfirmed");
    expect(careReminderState(t,start+3600000)).toBe("unconfirmed");
  });
  it("confirmação tardia retira o alerta visual sem sobrescrever hora do sistema",()=>{
    const late=task("late","refeicao",0,new Date(start+3600000).toISOString());
    expect(careReminderState(late,start+7200000)).toBe("confirmed");
    expect(late.completed_at).toBe(new Date(start+3600000).toISOString());
  });
  it("lembrete ativo sempre tem prioridade sobre pendências anteriores",()=>{
    const earlier=task("old","medicacao",-100);
    const current=task("now","hidratacao",0);
    const later=task("next","refeicao",40);
    const summary=summarizeCareReminders([earlier,later,current],start+2000);
    expect(summary.primary?.task.id).toBe("now");
    expect(summary.dueCount).toBe(1);
    expect(summary.unconfirmedCount).toBe(1);
    expect(summary.next?.task.id).toBe("next");
  });
  it("mantém todas as pendências visíveis por contagem, sem confundir com não realização",()=>{
    const summary=summarizeCareReminders([
      task("old1","medicacao",-40),task("old2","refeicao",-30)
    ],start);
    expect(summary.primary?.task.id).toBe("old2");
    expect(summary.unconfirmedCount).toBe(2);
    expect(summary.dueCount).toBe(0);
  });
  it("não cria avisos para tarefas concluídas, formatos inválidos ou listas vazias",()=>{
    const confirmed=task("done","medicacao",0,new Date(start+10).toISOString());
    const invalid={...task("broken"),scheduled_at:"not a date"};
    expect(summarizeCareReminders([confirmed,invalid],start+3600000).primary).toBeNull();
    expect(summarizeCareReminders([],start).next).toBeNull();
  });
  it("gera contagem legível e reconhece as três categorias",()=>{
    expect(reminderMmSs(10*60000)).toBe("10:00");
    expect(reminderMmSs(950)).toBe("00:01");
    expect(reminderCategoryLabel("medicacao")).toBe("Medicação");
    expect(reminderCategoryLabel("hidratacao")).toBe("Hidratação");
    expect(reminderCategoryLabel("refeicao")).toBe("Alimentação");
  });
  it("não mostra como pendência uma água respondida com Não bebi",()=>{
    const alreadyAnswered=task("water-0900","hidratacao");
    const responseIds=new Set(["water-0900"]);
    expect(careReminderState(alreadyAnswered,start+10,responseIds)).toBe("responded");
    expect(careReminderState(alreadyAnswered,start+600000,responseIds)).toBe("responded");
    const result=summarizeCareReminders([alreadyAnswered],start+600000,responseIds);
    expect(result.primary).toBeNull();
    expect(result.unconfirmedCount).toBe(0);
    expect(result.dueCount).toBe(0);
  });
  it("exibe somente acontecimentos recentes que ainda não foram respondidos",()=>{
    const old=task("old","hidratacao",-150);
    const recent=task("recent","refeicao",-20);
    const res=summarizeCareReminders([old,recent],start);
    expect(res.unconfirmedCount).toBe(1);
    expect(res.primary?.task.id).toBe("recent");
    expect(summarizeCareReminders([old],start).primary).toBeNull();
    expect(CARE_RECENT_UNANSWERED_MS).toBe(2*60*60*1000);
  });
  it("resposta Não bebi bloqueia alerta visual e áudio de um horário atual",()=>{
    const active=task("water-now","hidratacao",0);
    const summary=summarizeCareReminders([active],start+2000,new Set(["water-now"]));
    expect(summary.primary).toBeNull();
    expect(summary.dueCount).toBe(0);
  });

  it("retira da faixa refeição declarada não realizada e medicação cancelada",()=>{
    const meal=task("meal","refeicao",-15);
    const med=task("med","medicacao",-20);
    const now=start;
    const unresolved=summarizeCareReminders([meal,med],now);
    expect(unresolved.unconfirmedCount).toBe(2);
    const answered=new Set(["meal","med"]);
    const resolved=summarizeCareReminders([meal,med],now,answered);
    expect(resolved.primary).toBeNull();
    expect(resolved.unconfirmedCount).toBe(0);
    expect(careReminderState(meal,now,answered)).toBe("responded");
    expect(careReminderState(med,now,answered)).toBe("responded");
    expect(summarizeCareReminders([meal,med],now,new Set()).unconfirmedCount).toBe(2);
  });
  it("uma remarcação futura não fica presa como pendência antiga",()=>{
    const rescheduled=task("meal","refeicao",40);
    const summary=summarizeCareReminders([rescheduled],start);
    expect(summary.primary).toBeNull();
    expect(summary.next?.task.id).toBe("meal");
  });

});
