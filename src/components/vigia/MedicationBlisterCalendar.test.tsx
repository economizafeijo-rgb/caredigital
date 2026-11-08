import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { MedicationBlisterCalendar } from "./MedicationBlisterCalendar";

const query = vi.hoisted(() => ({
  result: { data: [] as Array<Record<string, unknown>>, error: null as unknown },
  filters: [] as Array<[string, unknown]>,
  from: vi.fn(),
}));

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: (table: string) => {
      query.from(table);
      const builder = {
        select: (columns: string) => {
          query.filters.push(["select", columns]);
          return builder;
        },
        eq: (column: string, value: unknown) => {
          query.filters.push([column, value]);
          return builder;
        },
        order: (column: string, options: unknown) => {
          query.filters.push([column, options]);
          return builder;
        },
        limit: (value: number) => {
          query.filters.push(["limit", value]);
          return Promise.resolve(query.result);
        },
      };
      return builder;
    },
  },
}));

const doses = [
  {
    id: "dose-1",
    patient_id: "patient-1",
    title: "Lansoprazol · manhã",
    category: "medicacao",
    scheduled_at: "2026-11-07T12:00:00.000Z",
    completed_at: "2026-11-07T12:04:00.000Z",
  },
  {
    id: "dose-2",
    patient_id: "patient-1",
    title: "Lansoprazol · noite",
    category: "medicacao",
    scheduled_at: "2026-11-07T23:00:00.000Z",
    completed_at: null,
  },
  {
    id: "dose-3",
    patient_id: "patient-1",
    title: "Lansoprazol · manhã",
    category: "medicacao",
    scheduled_at: "2026-11-08T12:00:00.000Z",
    completed_at: null,
  },
];

describe("MedicationBlisterCalendar", () => {
  beforeEach(() => {
    query.result = { data: doses, error: null };
    query.filters = [];
    query.from.mockClear();
  });

  it("loads only the selected patient's medication schedule", async () => {
    render(
      <MedicationBlisterCalendar
        patientId="patient-1"
        ownerId="owner-1"
        revision={0}
        onConfirm={vi.fn()}
      />,
    );

    await screen.findByRole("progressbar", { name: "Progresso das confirmações de medicamentos" });
    expect(query.from).toHaveBeenCalledWith("care_daily_checklist");
    expect(query.filters).toContainEqual(["owner_id", "owner-1"]);
    expect(query.filters).toContainEqual(["patient_id", "patient-1"]);
    expect(query.filters).toContainEqual(["category", "medicacao"]);
    expect(query.filters).toContainEqual(["limit", 500]);
    expect(screen.getByText("Programados")).toBeInTheDocument();
    expect(screen.getByText("Pendentes")).toBeInTheDocument();
    const firstDayButtons = await screen.findAllByRole("button", { name: /confirmados/i });
    fireEvent.click(firstDayButtons[0]);
    expect(await screen.findByText((_, element) => element?.tagName === "P" && element.textContent.includes("Lansoprazol · manhã"))).toBeInTheDocument();
  });

  it("shows an explicit empty state instead of inventing blister units", async () => {
    query.result = { data: [], error: null };
    render(
      <MedicationBlisterCalendar
        patientId="patient-1"
        ownerId="owner-1"
        revision={0}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      await screen.findByText("Nenhum horário de medicamento encontrado"),
    ).toBeInTheDocument();
    expect(screen.queryByText(/84 unidades/)).not.toBeInTheDocument();
  });

  it("shows a recoverable error when the schedule cannot be loaded", async () => {
    query.result = { data: null as unknown as Array<Record<string, unknown>>, error: { message: "offline" } };
    render(
      <MedicationBlisterCalendar
        patientId="patient-1"
        ownerId="owner-1"
        revision={0}
        onConfirm={vi.fn()}
      />,
    );

    expect(
      await screen.findByRole("alert"),
    ).toHaveTextContent("Não foi possível carregar a agenda de medicamentos.");
  });

  it("switches the selected day without changing schedule data", async () => {
    render(
      <MedicationBlisterCalendar
        patientId="patient-1"
        ownerId="owner-1"
        revision={0}
        onConfirm={vi.fn()}
      />,
    );

    await screen.findByRole("progressbar", { name: "Progresso das confirmações de medicamentos" });
    const dayButtons = await screen.findAllByRole("button", { name: /confirmados/i });
    expect(dayButtons.length).toBe(2);
    fireEvent.click(dayButtons[1]);
    expect(await screen.findByText((_, element) => element?.tagName === "P" && element.textContent.includes("Lansoprazol · manhã"))).toBeInTheDocument();
    await waitFor(() => expect(dayButtons[1]).toHaveAttribute("aria-pressed", "true"));
  });
});
