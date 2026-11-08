import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { CareClockAlert } from "./CareClockAlert";
import { CARE_REMINDER_WINDOW_MS, careReminderState, type ReminderTask } from "@/lib/care-reminders";

afterEach(()=>cleanup());

const task:ReminderTask={
  id:"care-test",title:"Conferir medicação — noite",category:"medicacao",
  scheduled_at:"2026-11-03T00:00:00.000Z",completed_at:null,
};

function mount(overrides:Partial<ReminderTask>={}){
  const onDetails=vi.fn(),onConfirm=vi.fn(),onSnooze=vi.fn(),onDismiss=vi.fn(),onChanged=vi.fn();
  render(<CareClockAlert task={{...task,...overrides}} now={Date.parse(task.scheduled_at)+30000}
    remainingMs={CARE_REMINDER_WINDOW_MS-30000}
    onDetails={onDetails} onConfirm={onConfirm} onSnooze={onSnooze} onDismiss={onDismiss} onChanged={onChanged}/>);
  return {onDetails,onConfirm,onSnooze,onDismiss,onChanged};
}

describe("Relógio animado CareDigital",()=>{
  it("exibe o compromisso no horário do Acre e apresenta a arte animada",()=>{
    mount();
    expect(screen.getByRole("dialog",{name:"Lembrete de cuidado no horário"})).toBeTruthy();
    expect(screen.getByText("Seu cuidado está no horário")).toBeTruthy();
    expect(screen.getByText("Previsto para 19:00 · Acre")).toBeTruthy();
    expect(screen.getByText("09:30")).toBeTruthy();
    expect(document.querySelector(".care-clock-ring-orbit-one")).toBeTruthy();
    expect(document.querySelector(".care-clock-visual-wave-two")).toBeTruthy();
  });

  it("abre os detalhes e nunca executa confirmação direta",()=>{
    const {onDetails,onConfirm}=mount();
    fireEvent.click(screen.getByRole("button",{name:/Ver detalhes/i}));
    expect(onDetails).toHaveBeenCalledTimes(1);
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it("a confirmação só abre o fluxo existente após clique do usuário",()=>{
    const {onConfirm}=mount();
    expect(onConfirm).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:/Confirmar realização/i}));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("permite lembrar novamente a medicação em três minutos sem alterar a prescrição",()=>{
    const {onSnooze,onDismiss,onChanged}=mount();
    fireEvent.click(screen.getByRole("button",{name:/Deixar para depois/i}));
    fireEvent.click(screen.getByRole("button",{name:"Lembrar em 3 minutos"}));
    expect(onSnooze).toHaveBeenCalledTimes(1);
    expect(onSnooze).toHaveBeenCalledWith(3);
    expect(onChanged).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button",{name:"Fechar lembrete sem confirmar"}));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it("não considera cuidado concluído antes da confirmação real",()=>{
    expect(careReminderState(task,Date.parse(task.scheduled_at)+1000)).toBe("due");
    expect(careReminderState({...task,completed_at:task.scheduled_at},Date.parse(task.scheduled_at)+1000)).toBe("confirmed");
  });
});
