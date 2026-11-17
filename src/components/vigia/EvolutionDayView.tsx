import { Activity, BedDouble, ClipboardList, Play, Scale, Star } from "lucide-react";
import { Area, Bar, CartesianGrid, Cell, ComposedChart, Pie, PieChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { DAY_CUTOFF_HOUR } from "@/lib/acre-time";
import { acreDayHour, goalObservation, goalValue, type DayMetrics, type PeriodRaw, type Targets } from "@/lib/day-metrics";
import { goalFxItem, useGoalFx } from "./GoalFx";
import { ChartTip, clock, hm, METRIC_STYLE, nf, Panel, ProgressRing, StatusBadge, STATUS_STYLE } from "./evolution-ui";

const pad = (value: number) => String(value).padStart(2, "0");
const axis = { fontSize: 11, fill: "currentColor" } as const;

function Empty({ children }: { children: string }) {
  return <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">{children}</p>;
}

export function EvolutionDayView({ metrics: m, raw, targets }: { metrics: DayMetrics; raw: PeriodRaw; targets: Targets }) {
  const fx = useGoalFx();
  const water = m.goals.find((goal) => goal.metric === "hidratacao");
  const kcal = m.goals.find((goal) => goal.metric === "calorias");

  let waterTotal = 0;
  const waterHours = m.hours.map((h, i) => { waterTotal += h.water; return { hour: `${pad(i)}h`, ml: h.water, cum: waterTotal, pct: water ? Math.round((waterTotal / water.target) * 100) : null }; });
  let foodTotal = 0;
  const foodHours = m.hours.map((h, i) => { foodTotal += h.kcal; return { hour: `${pad(i)}h`, kcal: Math.round(h.kcal), cum: Math.round(foodTotal), protein: Math.round(h.protein) }; });
  const macros = [
    { name: "Proteínas", g: m.protein, color: "#f43f5e", target: targets.protein },
    { name: "Carboidratos", g: m.carbs, color: "#f59e0b", target: targets.carbs },
    { name: "Gorduras", g: m.fat, color: "#8b5cf6", target: targets.fat },
  ];

  const plansFor = (kind: "suplemento" | "medicacao") => raw.plans.filter((plan) => plan.kind === kind && plan.active && plan.createdDay <= m.day);
  const taken = (list: DayMetrics["supplements"]["entries"], name: string, slot: string) => list.some((dose) => dose.name === name && dose.slot === slot);

  const misses = m.goals.filter((goal) => goal.status === "nao_atingida");
  const savedMetrics = new Set(m.reviews.map((review) => review.metric));

  return (
    <div className="grid gap-3">
      <Panel title="Metas do dia" note={m.closed ? "Dia fechado às 22h (horário do Acre)" : `Em andamento · fecha às ${DAY_CUTOFF_HOUR}h`}>
        {m.goals.length === 0 ? <Empty>Ainda não há metas programadas para este dia.</Empty> : (
          <div className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-3">
            {m.goals.map((goal) => {
              const style = METRIC_STYLE[goal.metric];
              const Icon = style.icon;
              const replay = goal.status === "atingida" || goal.status === "nao_atingida";
              return (
                <div key={goal.metric} className="flex items-center gap-3 rounded-2xl border border-border bg-surface/60 p-3">
                  <ProgressRing pct={goal.pct} color={STATUS_STYLE[goal.status].hex} size={72}>
                    <Icon size={16} className={style.text} /><span className="block text-[11px] font-extrabold tabular-nums">{goal.pct}%</span>
                  </ProgressRing>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-1.5"><p className="text-sm font-bold">{goal.label}</p><StatusBadge status={goal.status} /></div>
                    <p className="mt-0.5 text-xs font-semibold tabular-nums">{goal.status === "sem_registro" ? "Sem registros neste dia" : goalValue(goal)}</p>
                    <p className="text-[11px] leading-snug text-muted-foreground">Critério: {goal.rule}</p>
                    {replay && (
                      <button type="button" onClick={() => fx.push(goalFxItem(goal, goal.status === "atingida" ? "hit" : "miss", m.day))}
                        className="mt-1 inline-flex items-center gap-1 text-[11px] font-bold text-primary hover:underline"><Play size={11} /> Rever animação</button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Panel>

      <div className="grid items-start gap-3 xl:grid-cols-2">
        <Panel title="Hidratação nas 24 horas" note={water ? `Meta ${nf(water.target)} ml · consumo contado até as ${DAY_CUTOFF_HOUR}h` : "Barras: volume por hora · área: acumulado do dia"}>
          {m.water.length === 0 ? <Empty>Nenhum copo registrado neste dia.</Empty> : (
            <div className="h-60 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={waterHours} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                  <defs><linearGradient id="evWater" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0ea5e9" stopOpacity={0.4} /><stop offset="1" stopColor="#0ea5e9" stopOpacity={0.02} /></linearGradient></defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                  <XAxis dataKey="hour" tick={axis} className="text-muted-foreground" tickLine={false} axisLine={false} interval={2} />
                  <YAxis yAxisId="left" tick={axis} className="text-muted-foreground" tickLine={false} axisLine={false} width={44} />
                  <YAxis yAxisId="right" orientation="right" tick={axis} className="text-muted-foreground" tickLine={false} axisLine={false} width={44} />
                  <Tooltip content={<ChartTip title={(r) => `${r.hour} · acumulado do dia`} rows={(r) => [["Nesta hora", `${nf(r.ml)} ml`, "#0ea5e9"], ["Acumulado", `${nf(r.cum)} ml`, "#0369a1"], ...(r.pct !== null ? [["Da meta", `${r.pct}%`] as [string, string]] : [])]} />} />
                  <ReferenceLine x={`${pad(DAY_CUTOFF_HOUR)}h`} yAxisId="left" stroke="#94a3b8" strokeDasharray="4 4" label={{ value: "22h", position: "top", fontSize: 10, fill: "#94a3b8" }} />
                  {water && <ReferenceLine y={water.target} yAxisId="right" stroke="#10b981" strokeDasharray="6 4" label={{ value: `Meta ${nf(water.target)} ml`, position: "insideTopRight", fontSize: 10, fontWeight: 700, fill: "#10b981" }} />}
                  <Area yAxisId="right" type="monotone" dataKey="cum" stroke="#0369a1" strokeWidth={2.5} fill="url(#evWater)" isAnimationActive={false} />
                  <Bar yAxisId="left" dataKey="ml" radius={[5, 5, 0, 0]} maxBarSize={18}>
                    {waterHours.map((row, i) => <Cell key={i} fill={i >= DAY_CUTOFF_HOUR ? "#94a3b8" : "#0ea5e9"} />)}
                  </Bar>
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          )}
          {m.water.length > 0 && (
            <ul className="mt-2 grid max-h-36 gap-1 overflow-y-auto text-xs sm:grid-cols-2">
              {m.water.map((entry, i) => {
                const late = acreDayHour(entry.at).hour >= DAY_CUTOFF_HOUR;
                return <li key={i} className="flex items-center justify-between rounded-lg bg-muted/50 px-2.5 py-1.5"><span className="font-mono font-bold">{clock(entry.at)}</span><span className="tabular-nums">+{nf(entry.ml)} ml</span>{late && <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">após o fechamento</span>}</li>;
              })}
            </ul>
          )}
          <p className="mt-2 text-[11px] text-muted-foreground">Total nas 24 horas: <strong className="text-foreground">{nf(m.waterAllMl)} ml</strong></p>
        </Panel>

        <Panel title="Alimentação nas 24 horas" note={kcal ? `Meta ${nf(kcal.target)} kcal · ${kcal.rule}` : "Calorias por hora e acumulado do dia"}>
          {m.foods.length === 0 ? <Empty>Nenhum alimento registrado neste dia.</Empty> : (
            <>
              <div className="h-60 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={foodHours} margin={{ top: 8, right: 4, left: -14, bottom: 0 }}>
                    <defs><linearGradient id="evFood" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f97316" stopOpacity={0.4} /><stop offset="1" stopColor="#f97316" stopOpacity={0.02} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border" vertical={false} />
                    <XAxis dataKey="hour" tick={axis} className="text-muted-foreground" tickLine={false} axisLine={false} interval={2} />
                    <YAxis yAxisId="left" tick={axis} className="text-muted-foreground" tickLine={false} axisLine={false} width={44} />
                    <YAxis yAxisId="right" orientation="right" tick={axis} className="text-muted-foreground" tickLine={false} axisLine={false} width={44} />
                    <Tooltip content={<ChartTip title={(r) => `${r.hour} · refeições`} rows={(r) => [["Nesta hora", `${nf(r.kcal)} kcal`, "#f97316"], ["Acumulado", `${nf(r.cum)} kcal`, "#c2410c"], ["Proteínas", `${nf(r.protein)} g`, "#f43f5e"]]} />} />
                    <ReferenceLine x={`${pad(DAY_CUTOFF_HOUR)}h`} yAxisId="left" stroke="#94a3b8" strokeDasharray="4 4" />
                    {kcal && <ReferenceLine y={kcal.target} yAxisId="right" stroke="#10b981" strokeDasharray="6 4" label={{ value: `Meta ${nf(kcal.target)} kcal`, position: "insideTopRight", fontSize: 10, fontWeight: 700, fill: "#10b981" }} />}
                    <Area yAxisId="right" type="monotone" dataKey="cum" stroke="#c2410c" strokeWidth={2.5} fill="url(#evFood)" isAnimationActive={false} />
                    <Bar yAxisId="left" dataKey="kcal" fill="#f97316" radius={[5, 5, 0, 0]} maxBarSize={18} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
              <div className="mt-2 grid items-center gap-3 sm:grid-cols-[120px_1fr]">
                <div className="mx-auto size-28">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={macros.map((item) => ({ name: item.name, value: Math.max(item.g, 0.001) }))} dataKey="value" innerRadius={30} outerRadius={50} paddingAngle={2} isAnimationActive={false}>
                        {macros.map((item) => <Cell key={item.name} fill={item.color} />)}
                      </Pie>
                      <Tooltip formatter={(value: number, name: string) => [`${nf(value)} g`, name]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid gap-1.5">
                  {macros.map((item) => (
                    <div key={item.name}>
                      <div className="flex justify-between text-[11px] font-semibold"><span className="inline-flex items-center gap-1.5"><i className="size-2 rounded-full" style={{ background: item.color }} />{item.name}</span><span className="tabular-nums">{nf(item.g)}{item.target ? ` de ${nf(item.target)}` : ""} g</span></div>
                      <div className="mt-0.5 h-1.5 overflow-hidden rounded-full bg-muted"><i className="block h-full rounded-full" style={{ width: `${item.target ? Math.min(100, (item.g / item.target) * 100) : 0}%`, background: item.color }} /></div>
                    </div>
                  ))}
                </div>
              </div>
              <ul className="mt-2 grid max-h-36 gap-1 overflow-y-auto text-xs">
                {m.foods.map((food, i) => (
                  <li key={i} className="flex items-center gap-2 rounded-lg bg-muted/50 px-2.5 py-1.5">
                    <span className="font-mono font-bold">{clock(food.at)}</span><span className="min-w-0 flex-1 truncate" title={food.label}>{food.label}</span><span className="shrink-0 tabular-nums font-semibold">{nf(food.kcal)} kcal</span>
                  </li>
                ))}
              </ul>
            </>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 lg:grid-cols-2">
        <Panel title="Suplementação" note={`${m.supplements.taken} de ${m.supplements.planned} doses programadas`}>
          {plansFor("suplemento").length === 0 && m.supplements.entries.length === 0 ? <Empty>Nenhum suplemento programado neste dia.</Empty> : (
            <ul className="grid gap-2">
              {plansFor("suplemento").map((plan) => (
                <li key={plan.id} className="rounded-xl bg-muted/50 p-2.5">
                  <p className="text-sm font-bold">{plan.name}{plan.dose && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{plan.dose}</span>}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {plan.times.map((slot) => { const ok = taken(m.supplements.entries, plan.name, slot); return <span key={slot} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : m.closed ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground"}`}>{slot} · {ok ? "tomada" : m.closed ? "não tomada" : "pendente"}</span>; })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        <Panel title="Medicação" note={`${m.medication.taken} de ${m.medication.planned} doses confirmadas`}>
          {m.medication.planned === 0 && m.medication.entries.length === 0 ? <Empty>Nenhuma dose de medicação programada neste dia.</Empty> : (
            <ul className="grid gap-2">
              {m.medication.tasks.map((task, i) => (
                <li key={i} className="flex items-center justify-between gap-2 rounded-xl bg-muted/50 px-3 py-2 text-xs">
                  <span className="min-w-0"><b className="font-mono">{clock(task.scheduledAt)}</b> <span className="font-semibold">{task.title}</span></span>
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold ${task.completedAt ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : m.closed ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground"}`}>{task.completedAt ? `confirmada ${clock(task.completedAt)}` : m.closed ? "sem confirmação" : "pendente"}</span>
                </li>
              ))}
              {plansFor("medicacao").map((plan) => (
                <li key={plan.id} className="rounded-xl bg-muted/50 p-2.5">
                  <p className="text-sm font-bold">{plan.name}{plan.dose && <span className="ml-1.5 text-xs font-medium text-muted-foreground">{plan.dose}</span>}</p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {plan.times.map((slot) => { const ok = taken(m.medication.entries, plan.name, slot); return <span key={slot} className={`rounded-full px-2.5 py-1 text-[11px] font-bold ${ok ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : m.closed ? "bg-rose-500/15 text-rose-700 dark:text-rose-300" : "bg-muted text-muted-foreground"}`}>{slot} · {ok ? "tomada" : m.closed ? "não tomada" : "pendente"}</span>; })}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <Panel title="Sono" note="Noite registrada neste dia">
          {m.sleep ? (
            <div className="grid gap-1 text-xs">
              <p className="inline-flex items-center gap-2 text-2xl font-extrabold tabular-nums"><BedDouble size={20} className="text-indigo-500" />{hm(m.sleep.hours)}</p>
              <p className="text-muted-foreground">Dormiu {clock(m.sleep.bedAt)} · acordou {clock(m.sleep.wakeAt)}</p>
              <p className="inline-flex items-center gap-1">{Array.from({ length: 5 }, (_, i) => <Star key={i} size={13} className={i < m.sleep!.quality ? "fill-amber-400 text-amber-400" : "text-muted-foreground/40"} />)}<span className="ml-1 text-muted-foreground">{m.sleep.awakenings} despertar(es)</span></p>
            </div>
          ) : <Empty>Sem registro de sono.</Empty>}
        </Panel>
        <Panel title="Peso" note="Medição deste dia">
          {m.weightKg !== null ? <p className="inline-flex items-center gap-2 text-2xl font-extrabold tabular-nums"><Scale size={20} className="text-fuchsia-500" />{nf(m.weightKg, 1)} kg</p> : <Empty>Sem medição neste dia.</Empty>}
        </Panel>
        <Panel title="Atividade física" note="Treinos registrados">
          {m.activityMinutes > 0 ? <p className="inline-flex items-center gap-2 text-2xl font-extrabold tabular-nums"><Activity size={20} className="text-emerald-500" />{nf(m.activityMinutes)} min{m.activityKm > 0 && <span className="text-sm font-semibold text-muted-foreground">· {nf(m.activityKm, 1)} km</span>}</p> : <Empty>Sem treino registrado.</Empty>}
        </Panel>
      </div>

      <Panel title="Observações do dia" note="O sistema registra uma observação quando uma meta não é atingida">
        {misses.length === 0 ? <Empty>{m.closed ? "Nenhuma meta deixou de ser atingida neste dia." : "As observações aparecem aqui quando o dia fechar, caso alguma meta não seja atingida."}</Empty> : (
          <ul className="grid gap-2">
            {misses.map((goal) => (
              <li key={goal.metric} className="flex items-start gap-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs">
                <ClipboardList size={16} className="mt-0.5 shrink-0 text-amber-600" />
                <div className="min-w-0 flex-1"><p className="font-semibold leading-snug">{goalObservation(goal, m.day)}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">{savedMetrics.has(goal.metric) ? "Registrada no seu histórico" : "Será registrada no seu histórico"}</p></div>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
