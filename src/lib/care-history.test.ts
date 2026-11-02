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
    expect(water.find(e=>e.title.includes("100 ml"))?.waterEntryId).toBe("water1");
    expect(water.find(e=>e.title.includes("300 ml"))?.waterEntryId).toBe("water2");
    expect(water.find(e=>e.title.includes("100 ml"))?.taskId).toBe("water-scheduled");
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
  it("registra apenas resultados diários concluídos, por data e sem duplicar consumo",()=>{
    const source=data();
    source.dailyGoals=[
      {goal_date:"2026-11-02",target_ml:2550,consumed_ml:590,status:"em_andamento",closed_at:null,updated_at:"2026-11-02T20:10:00Z"},
      {goal_date:"2026-11-01",target_ml:2200,consumed_ml:2000,status:"nao_atingida",closed_at:"2026-11-02T04:00:00Z",updated_at:"2026-11-02T04:05:00Z"},
      {goal_date:"2026-10-31",target_ml:2200,consumed_ml:2400,status:"atingida",closed_at:"2026-11-01T04:00:00Z",updated_at:"2026-11-01T04:05:00Z"}
    ];
    const entries=assembleCareHistory(source,now);
    const goals=entries.filter(e=>e.subtype==="meta_diaria");
    expect(goals).toHaveLength(2);
    expect(goals.find(e=>e.status==="meta_nao_atingida")?.description).toContain("faltaram 200 ml");
    expect(goals.find(e=>e.status==="meta_atingida")?.description).toContain("2.400 de 2.200");
    expect(goals.every(e=>e.group==="liquidos")).toBe(true);
    expect(entries.filter(e=>e.subtype==="agua"&&e.amountMl)).toHaveLength(2);
  });
  it("permite filtrar apenas os dias cuja meta não foi atingida",()=>{
    const source=data();
    source.dailyGoals=[{goal_date:"2026-11-01",target_ml:2550,consumed_ml:500,status:"nao_atingida",closed_at:"2026-11-02T04:00:00Z",updated_at:"2026-11-02T04:05:00Z"}];
    const entries=assembleCareHistory(source,now);
    const missed=filterCareHistory(entries,{...filters,group:"liquidos",subtype:"meta_diaria",status:"meta_nao_atingida",period:"7d"},now);
    expect(missed).toHaveLength(1);
    expect(missed[0].description).toContain("01/11/2026");
  });

  it("mantém frutas, almoço avulso, shakes e energéticos nas categorias corretas",()=>{
    const source=data();
    source.drinks.push(
      {id:"shake-1",kind:"shake",name:"Shake de banana e aveia",amount_ml:300,notes:"",consumed_at:"2026-11-02T19:15:00Z"},
      {id:"energy-1",kind:"energetico",name:"Energético 250 ml",amount_ml:250,notes:"",consumed_at:"2026-11-02T19:16:00Z"}
    );
    source.audit.push(
      {id:"fruit-1",category:"refeicao",event_type:"logged",source:"client_unscheduled_intake",
        details:{kind:"fruta",description:"Banana prata, 1 unidade"},scheduled_at:null,happened_at:null,recorded_at:"2026-11-02T19:17:00Z"},
      {id:"lunch-1",category:"refeicao",event_type:"logged",source:"client_unscheduled_intake",
        details:{kind:"almoco",description:"Arroz e frango, 100 g"},scheduled_at:null,happened_at:null,recorded_at:"2026-11-02T19:18:00Z"}
    );
    const all=assembleCareHistory(source,now);
    expect(all.find(e=>e.id==="manual-meal-fruit-1")?.title).toBe("Frutas");
    expect(all.find(e=>e.id==="manual-meal-lunch-1")?.title).toBe("Almoço");
    expect(all.find(e=>e.id==="drink-shake-1")?.subtype).toBe("shake");
    expect(all.find(e=>e.id==="drink-energy-1")?.subtype).toBe("energetico");
    expect(all.find(e=>e.id==="drink-shake-1")?.group).toBe("liquidos");
    expect(filterCareHistory(all,{...filters,group:"refeicoes",subtype:"fruta"},now)).toHaveLength(1);
    expect(filterCareHistory(all,{...filters,group:"liquidos",subtype:"shake"},now)).toHaveLength(1);
  });

  it("mostra não realizado ou cancelado na data real e não duplica pendências",()=>{
    const source=data();
    source.checklist.push(
      {id:"not-eaten",category:"refeicao",title:"Lanche da tarde",scheduled_at:"2026-11-02T19:00:00Z",completed_at:null},
      {id:"cancel-med",category:"medicacao",title:"Medicação",scheduled_at:"2026-11-02T19:10:00Z",completed_at:null}
    );
    source.resolutions=[
      {task_id:"not-eaten",status:"nao_cumprido",reason:"Não tive fome",
        scheduled_at:"2026-11-02T19:00:00Z",resolved_at:"2026-11-02T20:03:00Z"},
      {task_id:"cancel-med",status:"cancelado",reason:"Relato de suspensão",
        scheduled_at:"2026-11-02T19:10:00Z",resolved_at:"2026-11-02T20:06:00Z"},
    ];
    const rows=assembleCareHistory(source,now);
    const meal=rows.find(row=>row.id==="resolved-not-eaten");
    const med=rows.find(row=>row.id==="resolved-cancel-med");
    expect(meal?.status).toBe("nao_cumprido");
    expect(meal?.description).toContain("Não tive fome");
    expect(med?.status).toBe("cancelado");
    expect(med?.description).toContain("Não altera a prescrição");
    expect(rows.some(row=>row.id==="pending-not-eaten"||row.id==="pending-cancel-med")).toBe(false);
    expect(filterCareHistory(rows,{...filters,group:"refeicoes",status:"nao_cumprido"},now)).toHaveLength(1);
  });

});
