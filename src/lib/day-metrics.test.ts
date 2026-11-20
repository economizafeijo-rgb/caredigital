import { describe, expect, it } from "vitest";
import {
  acreDayHour,
  buildDay,
  buildDays,
  emptyRaw,
  goalObservation,
  kcalBand,
  monthGrid,
  monthRange,
  monthlySummaries,
  periodDays,
  summarize,
  type Ctx,
  type PeriodRaw,
  type Targets,
} from "./day-metrics";

const targets: Targets = {
  waterMl: 2500,
  kcal: 2000,
  protein: 100,
  carbs: 250,
  fat: 60,
  objective: "equilibrio",
  targetWeightKg: null,
};
const at = (day: string, hhmm: string) => `${day}T${hhmm}:00-05:00`;
// "agora" = 17/11/2026 15:00 no Acre (dia em andamento); depois do fechamento = 22:30.
const ctxAt = (day: string, hhmm: string, t: Targets = targets): Ctx => ({
  targets: t,
  nowMs: Date.parse(at(day, hhmm)),
});
const raw = (patch: Partial<PeriodRaw>): PeriodRaw => ({ ...emptyRaw(), ...patch });
const food = (day: string, hhmm: string, kcal: number, protein: number) => ({
  at: at(day, hhmm),
  label: "refeição",
  source: "Refeição",
  kcal,
  protein,
  carbs: 0,
  fat: 0,
});

describe("tempo do Acre", () => {
  it("separa dia e hora no fuso do Acre, não no UTC", () => {
    expect(acreDayHour("2026-11-03T02:59:59Z")).toEqual({ day: "2026-11-02", hour: 21 });
    expect(acreDayHour("2026-11-03T03:00:00Z")).toEqual({ day: "2026-11-02", hour: 22 });
    expect(acreDayHour("2026-11-03T05:00:00Z")).toEqual({ day: "2026-11-03", hour: 0 });
  });
  it("monta o calendário do mês em semanas de domingo a sábado", () => {
    const weeks = monthGrid(2026, 11); // 1º de novembro de 2026 é domingo
    expect(weeks[0][0]).toBe("2026-11-01");
    expect(weeks.every((week) => week.length === 7)).toBe(true);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(monthRange(2026, 2)).toEqual({ from: "2026-02-01", to: "2026-02-28" });
    expect(periodDays("2026-12-30", "2027-01-02")).toEqual([
      "2026-12-30",
      "2026-12-31",
      "2027-01-01",
      "2027-01-02",
    ]);
  });
});

describe("métricas das 24 horas", () => {
  it("soma por hora e conta todos os registros das 24 horas na meta de água", () => {
    const day = "2026-11-10";
    const result = buildDay(
      raw({
        water: [
          { at: at(day, "08:10"), ml: 300 },
          { at: at(day, "08:50"), ml: 200 },
          { at: at(day, "21:59"), ml: 250 },
          { at: at(day, "22:30"), ml: 500 },
        ],
      }),
      day,
      ctxAt("2026-11-17", "15:00"),
    );
    expect(result.hours[8].water).toBe(500);
    expect(result.hours[22].water).toBe(500);
    expect(result.waterMl).toBe(1250); // a janela é de 24 h: nada fica fora da meta
    expect(result.waterAllMl).toBe(1250);
    expect(result.hasData).toBe(true);
  });
  it("recupera totais diários dos snapshots sem somar novamente os eventos individuais", () => {
    const day = "2026-11-05";
    const result = buildDay(
      raw({
        water: [
          { at: at(day, "08:00"), ml: 200 },
          { at: at(day, "10:00"), ml: 250 },
        ],
        reviews: [
          {
            day,
            metric: "hidratacao",
            status: "nao_atingida",
            target: 2500,
            actual: 1700,
            unit: "ml",
            observation: "Snapshot de hidratação.",
          },
          {
            day,
            metric: "calorias",
            status: "nao_atingida",
            target: 2400,
            actual: 1980,
            unit: "kcal",
            observation: "Snapshot de calorias.",
          },
          {
            day,
            metric: "proteina",
            status: "nao_atingida",
            target: 150,
            actual: 105,
            unit: "g",
            observation: "Snapshot de proteínas.",
          },
        ],
      }),
      day,
      ctxAt("2026-11-17", "15:00"),
    );
    expect(result.waterMl).toBe(1700);
    expect(result.waterAllMl).toBe(1700);
    expect(result.kcal).toBe(1980);
    expect(result.protein).toBe(105);
    expect(result.goals.find((goal) => goal.metric === "hidratacao")).toMatchObject({
      target: 2500,
      actual: 1700,
    });
    expect(result.goals.find((goal) => goal.metric === "calorias")).toMatchObject({
      target: 2400,
      actual: 1980,
    });
    expect(result.goals.find((goal) => goal.metric === "proteina")).toMatchObject({
      target: 150,
      actual: 105,
    });
    expect(result.hasData).toBe(true);
  });

  it("não conta refeições depois das 22h na meta de calorias", () => {
    const day = "2026-11-10";
    const result = buildDay(
      raw({ foods: [food(day, "12:00", 800, 40), food(day, "22:15", 400, 10)] }),
      day,
      ctxAt("2026-11-17", "15:00"),
    );
    expect(result.kcal).toBe(800);
    expect(result.hours[22].kcal).toBe(400);
  });
});

describe("metas do dia", () => {
  const closedDay = "2026-11-10";
  const later = ctxAt("2026-11-17", "15:00");

  it("marca hidratação atingida quando a meta é alcançada, mesmo com o dia aberto", () => {
    const today = "2026-11-17";
    const result = buildDay(
      raw({ water: [{ at: at(today, "09:00"), ml: 2600 }] }),
      today,
      ctxAt(today, "15:00"),
    );
    const water = result.goals.find((goal) => goal.metric === "hidratacao")!;
    expect(water.status).toBe("atingida");
    expect(water.monotonic).toBe(true);
  });

  it("mantém a água em andamento até o fim do dia e só vira não atingida na virada", () => {
    const today = "2026-11-17";
    const rawToday = raw({
      water: [{ at: at(today, "09:00"), ml: 1000 }],
      waterGoals: [{ day: today, target: 2500, consumed: 1000, status: "em_andamento" }],
    });
    const before = buildDay(rawToday, today, ctxAt(today, "23:59")).goals.find(
      (goal) => goal.metric === "hidratacao",
    )!;
    const after = buildDay(rawToday, today, ctxAt("2026-11-18", "00:01")).goals.find(
      (goal) => goal.metric === "hidratacao",
    )!;
    expect(before.status).toBe("em_andamento");
    expect(after.status).toBe("nao_atingida");
    expect(after.pct).toBe(40);
  });

  it("não penaliza dia sem nenhum registro", () => {
    const result = buildDay(
      raw({ waterGoals: [{ day: closedDay, target: 2500, consumed: 0, status: "nao_atingida" }] }),
      closedDay,
      later,
    );
    expect(result.hasData).toBe(false);
    expect(result.goals.every((goal) => goal.status === "sem_registro")).toBe(true);
    expect(result.summary).toBe("empty");
  });

  it("usa a meta de água do servidor para dias passados", () => {
    const result = buildDay(
      raw({
        waterGoals: [{ day: closedDay, target: 3000, consumed: 3100, status: "atingida" }],
        water: [{ at: at(closedDay, "10:00"), ml: 3100 }],
      }),
      closedDay,
      later,
    );
    const water = result.goals.find((goal) => goal.metric === "hidratacao")!;
    expect(water.target).toBe(3000);
    expect(water.status).toBe("atingida");
  });

  it("avalia calorias por faixa conforme o objetivo", () => {
    expect(kcalBand("emagrecimento").max).toBeCloseTo(1.05);
    expect(kcalBand("hipertrofia").max).toBe(Infinity);
    const base = raw({ foods: [food(closedDay, "12:00", 2400, 120)] });
    const equilibrio = buildDay(base, closedDay, later).goals.find(
      (goal) => goal.metric === "calorias",
    )!;
    const hipertrofia = buildDay(
      base,
      closedDay,
      ctxAt("2026-11-17", "15:00", { ...targets, objective: "hipertrofia" }),
    ).goals.find((goal) => goal.metric === "calorias")!;
    expect(equilibrio.status).toBe("nao_atingida"); // 120% está acima da faixa de equilíbrio
    expect(hipertrofia.status).toBe("atingida");
  });

  it("compara doses de suplementos e medicação com o que foi programado", () => {
    const plans = [
      {
        id: "s1",
        name: "Creatina",
        dose: "3 g",
        times: ["08:00", "20:00"],
        active: true,
        createdDay: "2026-11-01",
        kind: "suplemento" as const,
      },
      {
        id: "m1",
        name: "Losartana",
        dose: "50 mg",
        times: ["08:00"],
        active: true,
        createdDay: "2026-11-01",
        kind: "medicacao" as const,
      },
    ];
    const result = buildDay(
      raw({
        plans,
        doses: [
          {
            at: at(closedDay, "08:05"),
            day: closedDay,
            name: "Creatina",
            slot: "08:00",
            kind: "suplemento",
          },
        ],
        tasks: [
          {
            day: closedDay,
            category: "medicacao",
            title: "Omeprazol",
            scheduledAt: at(closedDay, "07:00"),
            completedAt: null,
          },
        ],
      }),
      closedDay,
      later,
    );
    const supplements = result.goals.find((goal) => goal.metric === "suplementos")!;
    const medication = result.goals.find((goal) => goal.metric === "medicacao")!;
    expect(supplements).toMatchObject({ target: 2, actual: 1, status: "nao_atingida" });
    expect(medication).toMatchObject({ target: 2, actual: 0, status: "nao_atingida" });
  });

  it("ignora planos criados depois do dia e planos desativados", () => {
    const plans = [
      {
        id: "s1",
        name: "Whey",
        dose: "30 g",
        times: ["16:00"],
        active: true,
        createdDay: "2026-11-12",
        kind: "suplemento" as const,
      },
      {
        id: "s2",
        name: "Ômega",
        dose: "1",
        times: ["12:00"],
        active: false,
        createdDay: "2026-11-01",
        kind: "suplemento" as const,
      },
    ];
    const result = buildDay(
      raw({ plans, water: [{ at: at(closedDay, "10:00"), ml: 100 }] }),
      closedDay,
      later,
    );
    expect(result.supplements.planned).toBe(0);
    expect(result.goals.some((goal) => goal.metric === "suplementos")).toBe(false);
  });

  it("avalia o sono com tolerância de 90% da meta de 8 horas", () => {
    const sleep = (hours: number) => ({
      day: closedDay,
      hours,
      quality: 3,
      awakenings: 1,
      bedAt: at(closedDay, "23:00"),
      wakeAt: at(closedDay, "06:00"),
    });
    const okay = buildDay(raw({ sleep: [sleep(7.4)] }), closedDay, later).goals.find(
      (goal) => goal.metric === "sono",
    )!;
    const short = buildDay(raw({ sleep: [sleep(6)] }), closedDay, later).goals.find(
      (goal) => goal.metric === "sono",
    )!;
    expect(okay.status).toBe("atingida");
    expect(short.status).toBe("nao_atingida");
  });

  it("resume o dia pela proporção de metas atingidas", () => {
    const water = [{ at: at(closedDay, "10:00"), ml: 2600 }];
    const all = buildDay(
      raw({
        waterGoals: [{ day: closedDay, target: 2500, consumed: 2600, status: "atingida" }],
        water,
        foods: [food(closedDay, "12:00", 2000, 100)],
      }),
      closedDay,
      later,
    );
    const part = buildDay(
      raw({
        waterGoals: [{ day: closedDay, target: 2500, consumed: 2600, status: "atingida" }],
        water,
        foods: [food(closedDay, "12:00", 900, 20)],
      }),
      closedDay,
      later,
    );
    expect(all.summary).toBe("ok");
    expect(all.score).toBe(100);
    expect(part.summary).toBe("partial");
    expect(part.score).toBe(33);
  });

  it("não avalia metas de dias que ainda não chegaram", () => {
    const result = buildDay(
      raw({
        plans: [
          {
            id: "s1",
            name: "Creatina",
            dose: "3 g",
            times: ["08:00"],
            active: true,
            createdDay: "2026-11-01",
            kind: "suplemento",
          },
        ],
      }),
      "2026-11-25",
      ctxAt("2026-11-17", "15:00"),
    );
    expect(result.future).toBe(true);
    expect(result.goals).toHaveLength(0);
    expect(result.summary).toBe("future");
  });

  it("mantém o dia aberto (azul) enquanto há metas pendentes", () => {
    const today = "2026-11-17";
    const result = buildDay(
      raw({ water: [{ at: at(today, "09:00"), ml: 2600 }] }),
      today,
      ctxAt(today, "15:00"),
    );
    expect(result.summary).toBe("open");
  });
});

describe("observações das metas", () => {
  const goal = (patch: Record<string, unknown>) =>
    ({
      metric: "hidratacao",
      label: "Hidratação",
      unit: "ml",
      target: 2500,
      actual: 1450,
      pct: 58,
      status: "nao_atingida",
      rule: "",
      monotonic: true,
      ...patch,
    }) as never;
  it("descreve a hidratação não atingida com quanto faltou", () => {
    expect(goalObservation(goal({}), "2026-11-15")).toBe(
      "Meta de hidratação não atingida em 15/11/2026: 1.450 de 2.500 ml (58%). Faltaram 1.050 ml.",
    );
  });
  it("descreve calorias acima da meta", () => {
    const text = goalObservation(
      goal({ metric: "calorias", unit: "kcal", target: 2000, actual: 2600, pct: 130 }),
      "2026-11-15",
    );
    expect(text).toContain("600 kcal acima da meta");
  });
  it("descreve doses de medicação sem confirmação", () => {
    const text = goalObservation(
      goal({ metric: "medicacao", unit: "doses", target: 4, actual: 3, pct: 75 }),
      "2026-11-15",
    );
    expect(text).toBe(
      "Atenção: 3 de 4 doses de medicação confirmadas em 15/11/2026. 1 sem confirmação.",
    );
  });
  it("descreve a conquista quando a meta é atingida", () => {
    expect(
      goalObservation(goal({ status: "atingida", actual: 2600, pct: 104 }), "2026-11-15"),
    ).toBe("Meta de hidratação atingida em 15/11/2026: 2.600 de 2.500 ml (104%).");
  });
});

describe("resumos do período", () => {
  it("resume médias, metas e adesão do mês e agrupa o ano por mês", () => {
    const rows = ["2026-11-02", "2026-11-03", "2026-12-04"];
    const plans = [
      {
        id: "s1",
        name: "Creatina",
        dose: "3 g",
        times: ["08:00"],
        active: true,
        createdDay: "2026-01-01",
        kind: "suplemento" as const,
      },
    ];
    const data = raw({
      plans,
      water: rows.map((day, i) => ({ at: at(day, "10:00"), ml: 2000 + i * 500 })),
      doses: [
        {
          at: at("2026-11-02", "08:00"),
          day: "2026-11-02",
          name: "Creatina",
          slot: "08:00",
          kind: "suplemento",
        },
      ],
    });
    const days = buildDays(
      data,
      "2026-11-01",
      "2026-12-31",
      ctxAt("2027-01-05", "10:00", { ...targets, kcal: null, protein: null }),
    );
    const nov = summarize(days.filter((day) => day.day.startsWith("2026-11")));
    expect(nov.daysWithData).toBe(2);
    expect(nov.avgWaterMl).toBe(2250);
    expect(nov.supplementAdherence).toBe(Math.round((1 / 30) * 100));
    const monthly = monthlySummaries(days);
    expect(monthly).toHaveLength(12);
    expect(monthly[10].summary.daysWithData).toBe(2);
    expect(monthly[11].summary.daysWithData).toBe(1);
  });
});
