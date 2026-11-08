import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ClientActivityPage } from "./ClientActivityPage";

const mocks=vi.hoisted(()=>({from:vi.fn(),rpc:vi.fn()}));
vi.mock("@/integrations/supabase/client",()=>({supabase:{from:mocks.from,rpc:mocks.rpc}}));

function setup(){
  const query:any={};
  for(const method of ["select","eq","gte","order"])query[method]=vi.fn(()=>query);
  query.limit=vi.fn().mockResolvedValue({data:[],error:null});
  mocks.from.mockReturnValue(query);
  const onRecorded=vi.fn();
  render(<ClientActivityPage patientId="patient-1" ownerId="owner-1" revision={0} onRecorded={onRecorded}/>);
  return {onRecorded,query};
}

beforeEach(()=>{
  vi.clearAllMocks();
  mocks.rpc.mockResolvedValue({data:{id:"activity-1"},error:null});
});
afterEach(()=>cleanup());

describe("Área de atividade física do cliente",()=>{
  it("carrega o histórico vazio sem inventar registros",async()=>{
    const {query}=setup();
    expect(await screen.findByText("Nenhuma atividade registrada neste filtro.")).toBeTruthy();
    expect(query.eq).toHaveBeenCalledWith("category","atividade");
    expect(query.eq).toHaveBeenCalledWith("event_type","logged");
  });

  it("registra uma atividade e atualiza o painel após confirmação do servidor",async()=>{
    const {onRecorded}=setup();
    await screen.findByText("Nenhuma atividade registrada neste filtro.");
    fireEvent.click(screen.getByRole("button",{name:"Corrida"}));
    fireEvent.change(screen.getByLabelText("Duração (min)"),{target:{value:"45"}});
    fireEvent.change(screen.getByLabelText("Distância (km)"),{target:{value:"6,5"}});
    fireEvent.click(screen.getByRole("button",{name:"Salvar atividade"}));
    expect(await screen.findByText("Atividade registrada no seu prontuário.")).toBeTruthy();
    expect(mocks.rpc).toHaveBeenCalledWith("care_log_client_activity",expect.objectContaining({
      p_patient_id:"patient-1",p_activity_type:"corrida",p_duration_minutes:45,p_distance_km:6.5,
    }));
    expect(onRecorded).toHaveBeenCalledTimes(1);
  });

  it("informa falha de gravação sem confirmar o registro",async()=>{
    mocks.rpc.mockResolvedValue({data:null,error:new Error("denied")});
    const {onRecorded}=setup();
    await screen.findByText("Nenhuma atividade registrada neste filtro.");
    fireEvent.click(screen.getByRole("button",{name:"Salvar atividade"}));
    expect(await screen.findByRole("alert")).toBeTruthy();
    expect(onRecorded).not.toHaveBeenCalled();
  });

  it("bloqueia duração inválida antes de chamar o banco",async()=>{
    setup();
    await screen.findByText("Nenhuma atividade registrada neste filtro.");
    fireEvent.change(screen.getByLabelText("Duração (min)"),{target:{value:"0"}});
    fireEvent.click(screen.getByRole("button",{name:"Salvar atividade"}));
    expect(await screen.findByText("Informe uma duração entre 1 e 1.440 minutos.")).toBeTruthy();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
