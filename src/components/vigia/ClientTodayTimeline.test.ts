import { describe, expect, it } from "vitest";
import { careTimelineKind, pickCareTimelineItems, type CareTimelineTask } from "./ClientTodayTimeline";

const today = "2026-11-02";
const base = new Date(`${today}T16:00:00Z`).getTime();
const task = (id:string, hour:number, minute=0, category="hidratacao", title="Verificar hidratação", completed_at:string|null=null):CareTimelineTask => ({
  id, patient_id:"patient-test", category, title,
  scheduled_at:`2026-11-02T${String(hour).padStart(2,"0")}:${String(minute).padStart(2,"0")}:00Z`,
  completed_at,
});

describe("linha visual de cuidados",()=>{
  it("prioriza próximos horários em vez de confirmações antigas",()=>{
    const tasks=[
      task("old",9,0,"hidratacao","Água","2026-11-02T09:05:00Z"),
      task("old-pending",10,0),
      task("next-water",16,10),
      task("meal",17,0,"refeicao","Almoço"),
      task("medicine",19,0,"medicacao","Medicação da noite"),
    ];
    const selected=pickCareTimelineItems(tasks,base);
    expect(selected.map(item=>item.id)).toEqual(["next-water","meal","medicine"]);
  });

  it("exibe categorias distintas mesmo com vários copos futuros",()=>{
    const tasks=[
      task("water-1",16,10),
      task("water-2",16,30),
      task("water-3",16,40),
      task("meal",17,0,"refeicao","Lanche"),
      task("supp",18,0,"outro","Suplementação diária"),
    ];
    const selected=pickCareTimelineItems(tasks,base);
    expect(selected.map(item=>item.id)).toEqual(["water-1","meal","supp"]);
    expect(careTimelineKind(selected[2])).toBe("suplementacao");
  });

  it("não inventa suplementação quando ela não foi cadastrada",()=>{
    const tasks=[task("water",16,20),task("meal",18,0,"refeicao","Jantar")];
    const selected=pickCareTimelineItems(tasks,base);
    expect(selected).toHaveLength(2);
    expect(selected.some(item=>careTimelineKind(item)==="suplementacao")).toBe(false);
  });

  it("usa os pendentes mais recentes quando não há próximos horários",()=>{
    const tasks=[task("early",8),task("late",12),task("recent",15)];
    const selected=pickCareTimelineItems(tasks,new Date("2026-11-02T22:00:00Z").getTime(),2);
    expect(selected.map(item=>item.id)).toEqual(["late","recent"]);
  });
});
