import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { EvolutionHub } from "./EvolutionHub";
import { GoalFxProvider } from "./GoalFx";
import { acreAddDays } from "@/lib/acre-time";
import { acreDayHour, emptyRaw } from "@/lib/day-metrics";
import type { PeriodData } from "@/lib/period-data";

const today = acreDayHour(Date.now()).day;
const yesterday = acreAddDays(today, -1);

const loader = async (_p: string, _o: string, from: string, to: string): Promise<PeriodData> => {
  const raw = emptyRaw();
  for (let day = from; day <= to; day = acreAddDays(day, 1)) {
    if (day === yesterday) {
      raw.water.push({ at: `${day}T10:00:00-05:00`, ml: 1200 });
      raw.waterGoals.push({ day, target: 2500, consumed: 1200, status: "nao_atingida" });
    }
  }
  return {
    raw,
    prefs: {
      objective: "equilibrio",
      weightKg: 80,
      kcal: 2000,
      protein: 100,
      carbs: 250,
      fat: 60,
      targetWeightKg: null,
    },
    warnings: [],
  };
};
// O jsdom não tem ResizeObserver, que o Recharts usa para medir os gráficos.
beforeAll(() => {
  (globalThis as any).ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
});
afterEach(() => cleanup());

describe("Histórico de evolução", () => {
  it("abre no mês atual, navega para o ano e para as 24 horas de um dia", async () => {
    render(
      <GoalFxProvider>
        <EvolutionHub patientId="p" ownerId="o" waterTarget={2500} loader={loader} />
      </GoalFxProvider>,
    );
    expect(await screen.findByText("Calendário do mês")).toBeTruthy();
    expect(screen.getByText("Observações do mês")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Ano" }));
    expect(await screen.findByText("Meses do ano")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Dia" }));
    expect(await screen.findByText("Metas do dia")).toBeTruthy();
    expect(screen.getByText("Hidratação nas 24 horas")).toBeTruthy();
    expect(screen.getByText("Observações do dia")).toBeTruthy();
  });

  it("registra no histórico a hidratação não atingida de ontem e a explica no dia", async () => {
    render(
      <GoalFxProvider>
        <EvolutionHub patientId="p" ownerId="o" waterTarget={2500} loader={loader} />
      </GoalFxProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Dia" }));
    fireEvent.click(await screen.findByLabelText("Período anterior"));
    await waitFor(() =>
      expect(screen.getByText(/Meta de hidratação não atingida em/)).toBeTruthy(),
    );
    expect(screen.getByText(/1\.200 de 2\.500 ml \(48%\)\. Faltaram 1\.300 ml\./)).toBeTruthy();
  });

  it("avisa quando uma fonte de dados ainda não existe no banco", async () => {
    const withWarning = async (...args: Parameters<typeof loader>): Promise<PeriodData> => ({
      ...(await loader(...args)),
      warnings: ["suplementos"],
    });
    render(
      <GoalFxProvider>
        <EvolutionHub patientId="p" ownerId="o" waterTarget={null} loader={withWarning} />
      </GoalFxProvider>,
    );
    expect(await screen.findByText(/Aplique as migrações pendentes/)).toBeTruthy();
  });
});
