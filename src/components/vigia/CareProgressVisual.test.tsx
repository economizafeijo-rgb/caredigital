import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CareProgressVisual } from "./CareProgressVisual";
import type { ReminderTask } from "@/lib/care-reminders";

afterEach(()=>cleanup());

const tasks:ReminderTask[]=[
 {id:"med-completed",title:"Medicação — manhã",category:"medicacao",
  scheduled_at:"2026-11-02T12:00:00Z",completed_at:"2026-11-02T12:05:00Z"},
 {id:"meal-completed",title:"Almoço",category:"refeicao",
  scheduled_at:"2026-11-02T17:00:00Z",completed_at:"2026-11-02T17:02:00Z"},
];

describe("Cards de progresso do cuidado",()=>{
 it("permite clicar mesmo com alimentação e medicação 100% confirmadas",()=>{
   const water=vi.fn(),food=vi.fn(),medicine=vi.fn();
   render(<CareProgressVisual tasks={tasks}
     goal={{goal_date:"2026-11-02",status:"atingida",target_ml:2550,consumed_ml:2550}}
     onHydration={water} onFood={food} onMedication={medicine}/>);
   const hydration=screen.getByRole("button",{name:/Hidratação.*Abrir registro de água/i});
   const alimentação=screen.getByRole("button",{name:/Alimentação.*Abrir registro de refeição/i});
   const medicação=screen.getByRole("button",{name:/Medicação.*Abrir registro de medicação/i});
   expect(hydration.hasAttribute("disabled")).toBe(false);
   expect(alimentação.hasAttribute("disabled")).toBe(false);
   expect(medicação.hasAttribute("disabled")).toBe(false);
   fireEvent.click(hydration);
   fireEvent.click(alimentação);
   fireEvent.click(medicação);
   expect(water).toHaveBeenCalledTimes(1);
   expect(food).toHaveBeenCalledTimes(1);
   expect(medicine).toHaveBeenCalledTimes(1);
 });
 it("abre as três áreas mesmo se não houver tarefas cadastradas",()=>{
   const water=vi.fn(),food=vi.fn(),medicine=vi.fn();
   render(<CareProgressVisual tasks={[]} goal={null}
     onHydration={water} onFood={food} onMedication={medicine}/>);
   fireEvent.click(screen.getByRole("button",{name:/Hidratação/i}));
   fireEvent.click(screen.getByRole("button",{name:/Alimentação/i}));
   fireEvent.click(screen.getByRole("button",{name:/Medicação/i}));
   expect(water).toHaveBeenCalledOnce();
   expect(food).toHaveBeenCalledOnce();
   expect(medicine).toHaveBeenCalledOnce();
 });
});
