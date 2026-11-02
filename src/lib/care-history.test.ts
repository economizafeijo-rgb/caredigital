import { describe, expect, it } from "vitest";
import { assembleCareHistory, filterCareHistory, type HistorySources, type HistoryFilter } from "./care-history";

const now=Date.parse("2026-11-02T20:20:00Z"); // 15:20 in Acre
function data():HistorySources {
  return {
    checklist:[
      {id:"water-scheduled",category:"hidratacao",title:"Verificar hidratação",scheduled_at:"2026-11-02T18:00:00Z",completed_at:"2026-11-02T18:03:00Z"},
      {id:"meal",category:"refeicao",title:"Almoço",scheduled_at:"2026-11-02T16:00:00Z",completed_at:"2026-11-02T16:04:00Z"},
      {id:"old-medicine",category:"medicacao",title:"Medicação da noite",scheduled_at:"2026-11-01T23:00:00Z",completed_at:null},
      {id:"today-pending",category:"hidratacao",title:"Verificar hidratação",scheduled_at:"2026-11-02T19:00:00Z",completed_at:null},
      {id:"skipped",category:"hidratacao",title:"Verificar hidratação",scheduled_at:"2026-11-02T17:00:00Z",completed_at:null},
    ],
    water:[
      {id:"water1",task_id:"water-scheduled",amount_ml:100,recorded_at:"2026-11-02T18:03:00Z"},
      {id:"water2",task_id:null,amount_ml:300,recorded_at:"2026-11-02T20:06:35Z"},
    ],
    meals:[{task_id:"meal",description:"Arroz e macaxeira"}],
    drinks:[{id:"tea",kind:"cha",name:"Camomila",amount_ml:180,notes:"Sem açúcar",consumed_at:"2026-11-02T19:00:00Z"}],
    observations:[],
    responses:[{task_id:"skipped",response:"not_drunk",recorded_at:"2026-11-02T17:05:00Z"}],
    audit:[
      {id:"manual-snack",category:"refeicao",event_type:"logged",source:"client_unscheduled_intake",
        details:{kind:"lanche",description:"Banana com aveia"},scheduled_at:null,happened_at:null,recorded_at:"2026-11-02T18:12:00Z"},
      {id:"manual-water",category:"hidratacao",event_type:"logged",source:"client_unscheduled_intake",
        details:{kind:"agua",amount_ml:300},scheduled_at:null,happened_at:null,recorded_at:"2026-11-02T20:06:35Z"},
      {id:"shift1",category:"hidratacao",event_type:"rescheduled",source:"automatic_extra_water_reflow",
        details:{previous_scheduled_at:"2026-11-02T20:49:15Z",next_scheduled_at:"2026-11-02T20:51:15Z"},
        scheduled_at:"2026-11-02T20:49:15Z",happened_at:null,recorded_at:"2026-11-02T20:06:35Z"},
      {id:"shift2",category:"hidratacao",event_type:"rescheduled",source:"automatic_extra_water_reflow",
        details:{previous_scheduled_at:"2026-11-02T21:49:15Z",next_scheduled_at:"2026-11-02T21:51:15Z"},
        scheduled_at:"2026-11-02T21:49:15Z",happened_at:null,recorded_at:"2026-11-02T20:06:35Z"},
      {id:"correction",category:"hidratacao",event_type:"water_volume_corrected",source:"client_correction",
        details:{previous_ml:200,corrected_ml:100},scheduled_at:null,happened_at:null,recorded_at:"2026-11-02T18:15:00Z"},
    ]
  };
}
const filters:HistoryFilter={group:"todos",subtype:"todos",status:"todos",period:"hoje",query:"",order:"recentes"};

describe("histórico inteligente CareDigital",()=>{
  it("não duplica a água confirmada nem o mesmo consumo manual",()=>{
    const all=assembleCareHistory(data(),now);
    const water=all.filter(e=>e.group==="liquidos"&&e.subtype==="agua"&&e.amountMl);
    expect(water).toHaveLength(2);
    expect(water.map(e=>e.amountMl).sort((a,b)=>(a??0)-(b??0))).toEqual([100,300]);
  });
  it("separa refeição agendada e lanche extra, com as descrições reais",()=>{
    const all=assembleCareHistory(data(),now);
    const food=all.filter(e=>e.group==="refeicoes");
    expect(food).toHaveLength(2);
    expect(food.find(e=>e.title==="Almoço")?.description).toBe("Arroz e macaxeira");
    expect(food.find(e=>e.subtype==="lanche")?.description).toBe("Banana com aveia");
  });
  it("agrupa ajustes automáticos e nunca os apresenta como ingestão de água",()=>{
    const all=assembleCareHistory(data(),now);
    const shifts=all.filter(e=>e.status==="reprogramado");
    expect(shifts).toHaveLength(1);
    expect(shifts[0].title).toContain("2 horários");
    expect(shifts[0].group).toBe("ajustes");
    expect(all.some(e=>e.title==="Ocorrência registrada")).toBe(false);
  });
  it("não declara tarefa do dia não confirmada quando a janela ainda está aberta",()=>{
    const all=assembleCareHistory(data(),now);
    expect(all.some(e=>e.id==="pending-today-pending")).toBe(false);
    expect(all.some(e=>e.id==="pending-old-medicine")).toBe(true);
    expect(all.find(e=>e.id==="skip-skipped")?.status).toBe("nao_bebi");
  });
  it("combina tipo, situação, data e pesquisa sem misturar líquidos com refeições",()=>{
    const all=assembleCareHistory(data(),now);
    expect(filterCareHistory(all,{...filters,group:"liquidos",subtype:"cha"},now)).toHaveLength(1);
    expect(filterCareHistory(all,{...filters,group:"refeicoes",subtype:"lanche",query:"BANANA"},now)).toHaveLength(1);
    expect(filterCareHistory(all,{...filters,group:"ajustes",status:"corrigido"},now)).toHaveLength(1);
    expect(filterCareHistory(all,{...filters,group:"liquidos",status:"reprogramado"},now)).toHaveLength(0);
  });
  it("respeita dias do Acre e diferencia períodos",()=>{
    const all=assembleCareHistory(data(),now);
    expect(filterCareHistory(all,filters,now).some(e=>e.id==="pending-old-medicine")).toBe(false);
    expect(filterCareHistory(all,{...filters,period:"7d"},now).some(e=>e.id==="pending-old-medicine")).toBe(true);
  });
});
