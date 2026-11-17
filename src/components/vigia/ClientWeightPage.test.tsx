import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ClientWeightPage } from "./ClientWeightPage";
import { DialogProvider } from "@/lib/dialog";

type Call = { table: string; method: string; args: unknown[] };
const mocks = vi.hoisted(() => ({ from: vi.fn(), getUser: vi.fn(), calls: [] as Call[] }));
vi.mock("@/integrations/supabase/client", () => ({
  supabase: { from: mocks.from, auth: { getUser: mocks.getUser } },
}));

const rows = [
  { id: "m1", recorded_on: "2026-01-10", weight_kg: 80, height_cm: 170 },
  { id: "m2", recorded_on: "2026-01-12", weight_kg: 79.5, height_cm: 170 },
];

/** Consulta encadeável que registra as chamadas e resolve conforme a operação (insert/update/delete/select). */
function query(table: string) {
  let op: "select" | "insert" | "update" | "delete" = "select";
  const q: any = {};
  for (const method of ["select", "eq", "order", "limit", "maybeSingle", "insert", "update", "delete"]) {
    q[method] = vi.fn((...args: unknown[]) => {
      mocks.calls.push({ table, method, args });
      if (method === "insert" || method === "update" || method === "delete") op = method;
      return q;
    });
  }
  q.then = (resolve: (value: unknown) => unknown, reject?: (reason: unknown) => unknown) => {
    const value =
      table === "care_nutrition_preferences" ? { data: null, error: null }
        : op === "select" ? { data: rows, error: null }
          : op === "insert" ? { error: null }
            : { data: [{ id: "m2" }], error: null };
    return Promise.resolve(value).then(resolve, reject);
  };
  return q;
}

function setup() {
  render(<DialogProvider><ClientWeightPage patientId="patient-1" ownerId="owner-1" heightCm={170} currentWeight={79.5} /></DialogProvider>);
}
const callsOf = (method: string) => mocks.calls.filter(call => call.table === "care_body_measurements" && call.method === method);

beforeEach(() => {
  vi.clearAllMocks();
  mocks.calls.length = 0;
  mocks.from.mockImplementation((table: string) => query(table));
  mocks.getUser.mockResolvedValue({ data: { user: { id: "user-1" } } });
});
afterEach(() => cleanup());

describe("Registro de peso com cadeado", () => {
  it("não sobrescreve uma data já registrada ao inserir", async () => {
    setup();
    await screen.findByText("12/01/2026");
    fireEvent.change(screen.getByLabelText(/^Data/), { target: { value: "2026-01-12" } });
    fireEvent.change(screen.getByPlaceholderText("75,5"), { target: { value: "70" } });
    fireEvent.click(screen.getByRole("button", { name: /Inserir registro/ }));
    expect(await screen.findByText(/Já existe um registro em 12\/01\/2026/)).toBeTruthy();
    expect(callsOf("insert")).toHaveLength(0);
    expect(callsOf("update")).toHaveLength(0);
  });

  it("insere uma data nova sem usar upsert", async () => {
    setup();
    await screen.findByText("12/01/2026");
    fireEvent.change(screen.getByLabelText(/^Data/), { target: { value: "2026-01-13" } });
    fireEvent.change(screen.getByPlaceholderText("75,5"), { target: { value: "78,9" } });
    fireEvent.click(screen.getByRole("button", { name: /Inserir registro/ }));
    expect(callsOf("insert")).toHaveLength(0); // antes de confirmar, nada é gravado
    fireEvent.click(await screen.findByRole("button", { name: "Confirmar registro" }));
    await waitFor(() => expect(callsOf("insert")).toHaveLength(1));
    expect(callsOf("insert")[0].args[0]).toMatchObject({ recorded_on: "2026-01-13", weight_kg: 78.9, recorded_by: "user-1" });
  });

  it("mantém editar e excluir bloqueados até confirmar o desbloqueio", async () => {
    setup();
    await screen.findByText("12/01/2026");
    const edit = screen.getByRole("button", { name: "Editar registro de 12/01/2026" }) as HTMLButtonElement;
    const remove = screen.getByRole("button", { name: "Excluir registro de 12/01/2026" }) as HTMLButtonElement;
    expect(edit.disabled).toBe(true);
    expect(remove.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Liberar edição/ }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    // Cancelar mantém bloqueado.
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    expect(edit.disabled).toBe(true);

    fireEvent.click(screen.getByRole("button", { name: /Liberar edição/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    await waitFor(() => expect(edit.disabled).toBe(false));
    expect(remove.disabled).toBe(false);
  });

  it("edita um registro depois de liberar e volta a bloquear", async () => {
    setup();
    await screen.findByText("12/01/2026");
    fireEvent.click(screen.getByRole("button", { name: /Liberar edição/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    const edit = screen.getByRole("button", { name: "Editar registro de 12/01/2026" });
    await waitFor(() => expect((edit as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(edit);
    fireEvent.change(screen.getByLabelText("Novo peso de 12/01/2026"), { target: { value: "78,2" } });
    fireEvent.click(screen.getByRole("button", { name: /Salvar alteração/ }));
    expect(callsOf("update")).toHaveLength(0); // nada é gravado antes de confirmar
    fireEvent.click(within(await screen.findByRole("dialog")).getByRole("button", { name: "Salvar alteração" }));
    await waitFor(() => expect(callsOf("update")).toHaveLength(1));
    expect(callsOf("update")[0].args[0]).toMatchObject({ weight_kg: 78.2, recorded_by: "user-1" });
    expect(await screen.findByText(/bloqueada novamente/)).toBeTruthy();
    expect(screen.getByRole("button", { name: /Liberar edição/ })).toBeTruthy();
  });

  it("exclui somente depois de liberar e confirmar a exclusão", async () => {
    setup();
    await screen.findByText("12/01/2026");
    fireEvent.click(screen.getByRole("button", { name: /Liberar edição/ }));
    fireEvent.click(await screen.findByRole("button", { name: "Continuar" }));
    const remove = screen.getByRole("button", { name: "Excluir registro de 12/01/2026" });
    await waitFor(() => expect((remove as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(remove);
    fireEvent.click(await screen.findByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(callsOf("delete")).toHaveLength(1));
    expect(await screen.findByText(/excluído\. A edição foi bloqueada novamente/)).toBeTruthy();
  });
});
