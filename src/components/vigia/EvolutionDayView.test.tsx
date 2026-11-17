import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import { EvolutionDayView, type MetricFocus } from "./EvolutionDayView";
import { GoalFxProvider } from "./GoalFx";
import { buildDay, emptyRaw } from "@/lib/day-metrics";
import { resolveTargets } from "./../../lib/period-data";

const day = "2026-11-10";
const at = (hhmm: string) => `${day}T${hhmm}:00-05:00`;
const prefs = { objective: "equilibrio", weightKg: 80, kcal: 2000, protein: 100, carbs: 250, fat: 60, targetWeightKg: null };

function mount(focus?: MetricFocus) {
  const raw = emptyRaw();
  raw.water.push({ at: at("09:00"), ml: 600 });
  raw.foods.push({ at: at("12:30"), label: "arroz e frango", source: "Refeição", kcal: 700, protein: 40, carbs: 90, fat: 15 });
  raw.plans.push({ id: "s1", name: "Creatina", dose: "3 g", times: ["08:00"], active: true, createdDay: "2026-11-01", kind: "suplemento" });
  raw.plans.push({ id: "m1", name: "Losartana", dose: "50 mg", times: ["08:00"], active: true, createdDay: "2026-11-01", kind: "medicacao" });
  raw.sleep.push({ day, hours: 7, quality: 4, awakenings: 1, bedAt: at("23:00"), wakeAt: at("06:00") });
  raw.weights.push({ day, kg: 79.5 });
  raw.activities.push({ at: at("18:00"), type: "corrida", minutes: 30, km: 4.2 });
  const targets = resolveTargets(prefs, 2500);
  const metrics = buildDay(raw, day, { targets, nowMs: Date.parse("2026-11-17T15:00:00-05:00") });
  return render(<GoalFxProvider><EvolutionDayView metrics={metrics} raw={raw} targets={targets} focus={focus} /></GoalFxProvider>);
}
// Os painéis têm o título em <h3>; os nomes das metas ficam em <p>, então a busca pelo cabeçalho não se confunde.
const has = (title: string) => screen.queryByRole("heading", { level: 3, name: title }) !== null;
const goalNames = () => Array.from(document.querySelectorAll("p.text-sm.font-bold")).map((el) => el.textContent);
beforeAll(() => { (globalThis as any).ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }; });
afterEach(() => cleanup());

const PANELS = ["Hidratação nas 24 horas", "Alimentação nas 24 horas", "Suplementação", "Medicação", "Sono", "Peso", "Atividade física"] as const;
const ONLY: Record<MetricFocus, (typeof PANELS)[number]> = {
  hidratacao: "Hidratação nas 24 horas", alimentacao: "Alimentação nas 24 horas", suplementos: "Suplementação", medicacao: "Medicação",
  sono: "Sono", peso: "Peso", atividade: "Atividade física",
};

describe("métricas isoladas por área", () => {
  it("sem área (Visão geral), reúne todas as métricas", () => {
    mount();
    for (const title of PANELS) expect(has(title), title).toBe(true);
    expect(has("Metas do dia")).toBe(true);
    expect(has("Observações do dia")).toBe(true);
  });

  for (const focus of Object.keys(ONLY) as MetricFocus[]) {
    it(`na área ${focus}, mostra só o que é dela`, () => {
      mount(focus);
      expect(has(ONLY[focus])).toBe(true);
      for (const title of PANELS) if (title !== ONLY[focus]) expect(has(title), `${focus} não deve mostrar ${title}`).toBe(false);
    });
  }

  it("só áreas com meta mostram metas e observações", () => {
    mount("hidratacao");
    expect(has("Metas do dia")).toBe(true);
    expect(has("Observações do dia")).toBe(true);
    cleanup();
    mount("peso");
    expect(has("Metas do dia")).toBe(false);
    expect(has("Observações do dia")).toBe(false);
  });

  it("a meta mostrada pertence à área (hidratação não traz calorias nem sono)", () => {
    mount("hidratacao");
    expect(goalNames()).toEqual(["Hidratação"]);
    cleanup();
    mount("alimentacao");
    expect(goalNames().sort()).toEqual(["Calorias", "Proteínas"]);
    cleanup();
    mount();
    expect(goalNames().length).toBeGreaterThanOrEqual(5);
  });

  it("atividade lista os treinos do dia", () => {
    mount("atividade");
    expect(screen.getByText(/30 min · 4,2 km/)).toBeTruthy();
  });
});
