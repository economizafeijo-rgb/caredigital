import { supabase } from "@/integrations/supabase/client";
import { menuForDay, recipeFits, recipeTotals, recipes, type Goal } from "@/lib/nutrition-catalog";
import { objectiveLabel } from "@/lib/objective-nutrition";
import { formatBrazilPhone } from "@/lib/public-signup-validation";

export type ExportSection = "cronograma" | "medicacao" | "suplementos" | "hidratacao" | "cardapio";
export const exportSections: { key: ExportSection; label: string }[] = [
  { key: "cronograma", label: "Cronograma do dia" },
  { key: "medicacao", label: "Medicamentos" },
  { key: "suplementos", label: "Suplementos" },
  { key: "hidratacao", label: "Hidratação" },
  { key: "cardapio", label: "Cardápio da semana" },
];

type Row = Record<string, any>;
type PlanData = {
  patient: Row;
  meds: Row[];
  supplements: Row[];
  checklist: Row[];
  waterTarget: number | null;
  prefs: Row | null;
};

const tz = "America/Rio_Branco";
const esc = (v: unknown) =>
  String(v ?? "").replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const hhmm = (iso: string) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: tz, hour: "2-digit", minute: "2-digit" }).format(
    new Date(iso),
  );
const n = (v: number, d = 0) => v.toLocaleString("pt-BR", { maximumFractionDigits: d });
const activityLabels: Record<string, string> = {
  sedentario: "Sedentário",
  leve: "Pouco ativo",
  moderado: "Moderado",
  ativo: "Ativo",
  muito_ativo: "Muito ativo",
};

/** Busca a programação do cliente (somente o que ele montou ou o que foi programado para ele). */
export async function loadPlanData(patientId: string, ownerId: string): Promise<PlanData> {
  const db = supabase as any;
  const day = new Intl.DateTimeFormat("en-CA", { timeZone: tz }).format(new Date());
  const from = new Date(day + "T00:00:00-05:00").toISOString();
  const until = new Date(Date.parse(from) + 86_400_000).toISOString();
  const [p, m, s, c, h, pr] = await Promise.all([
    db
      .from("care_patients")
      .select(
        "full_name,birth_date,sex,height_cm,weight_kg,care_goal,activity_level,city,state,phone,contact_email,health_conditions",
      )
      .eq("id", patientId)
      .maybeSingle(),
    db
      .from("care_client_medications")
      .select("name,dose,times,instructions,active")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .order("created_at"),
    db
      .from("care_supplement_plans")
      .select("name,dose,unit,times,with_food,notes,active")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .order("created_at"),
    db
      .from("care_daily_checklist")
      .select("title,category,scheduled_at")
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .gte("scheduled_at", from)
      .lt("scheduled_at", until)
      .order("scheduled_at")
      .limit(120),
    db
      .from("care_hydration_profiles")
      .select("target_ml,weight_kg")
      .eq("patient_id", patientId)
      .maybeSingle(),
    db
      .from("care_nutrition_preferences")
      .select(
        "objective,gastritis_sensitive,avoided_ingredients,target_kcal,target_protein_g,target_carbs_g,target_fat_g,weight_kg,target_weight_kg",
      )
      .eq("patient_id", patientId)
      .eq("owner_id", ownerId)
      .maybeSingle(),
  ]);
  const weight = Number(p.data?.weight_kg ?? h.data?.weight_kg ?? pr.data?.weight_kg) || null;
  return {
    patient: p.data ?? {},
    meds: (m.data ?? []).filter((x: Row) => x.active !== false),
    supplements: (s.data ?? []).filter((x: Row) => x.active !== false),
    checklist: c.data ?? [],
    waterTarget: Number(h.data?.target_ml) || (weight ? Math.round((weight * 35) / 50) * 50 : null),
    prefs: pr.data ?? null,
  };
}

/** Indica quais seções têm conteúdo, para o usuário escolher o que exportar. */
export function availableSections(d: PlanData): Record<ExportSection, boolean> {
  return {
    cronograma:
      d.meds.length + d.supplements.length + d.checklist.length > 0 || Boolean(d.waterTarget),
    medicacao: d.meds.length > 0,
    suplementos: d.supplements.length > 0,
    hidratacao: Boolean(d.waterTarget) || d.checklist.some((c) => c.category === "hidratacao"),
    cardapio: true,
  };
}

type Slot = { time: string; kind: string; title: string; detail: string; color: string };
function dayTimeline(d: PlanData): Slot[] {
  const out: Slot[] = [];
  for (const m of d.meds)
    for (const t of m.times ?? [])
      out.push({
        time: t,
        kind: "Medicamento",
        title: m.name,
        detail: [m.dose, m.instructions].filter(Boolean).join(" · "),
        color: "#e11d48",
      });
  for (const s of d.supplements)
    for (const t of s.times ?? [])
      out.push({
        time: t,
        kind: "Suplemento",
        title: s.name,
        detail: `${n(Number(s.dose), 2)} ${s.unit}${s.with_food ? " · com refeição" : ""}`,
        color: "#7c3aed",
      });
  const water = d.checklist.filter((c) => c.category === "hidratacao");
  const meals = d.checklist.filter((c) => c.category === "refeicao");
  if (water.length)
    for (const w of water)
      out.push({
        time: hhmm(w.scheduled_at),
        kind: "Água",
        title: w.title,
        detail: "",
        color: "#0284c7",
      });
  else if (d.waterTarget) {
    const times = ["07:00", "09:00", "11:00", "13:00", "15:00", "17:00", "19:00"];
    const each = Math.round(d.waterTarget / times.length / 10) * 10;
    for (const t of times)
      out.push({
        time: t,
        kind: "Água",
        title: `Beber ${n(each)} ml`,
        detail: "sugestão para distribuir a meta",
        color: "#0284c7",
      });
  }
  if (meals.length)
    for (const m of meals)
      out.push({
        time: hhmm(m.scheduled_at),
        kind: "Refeição",
        title: m.title,
        detail: "",
        color: "#059669",
      });
  else
    for (const [t, l] of [
      ["07:00", "Café da manhã"],
      ["10:00", "Lanche da manhã"],
      ["12:30", "Almoço"],
      ["15:30", "Lanche da tarde"],
      ["19:00", "Jantar"],
    ] as const)
      out.push({
        time: t,
        kind: "Refeição",
        title: l,
        detail: "horário sugerido",
        color: "#059669",
      });
  for (const c of d.checklist.filter(
    (x) => x.category !== "hidratacao" && x.category !== "refeicao" && x.category !== "medicacao",
  ))
    out.push({
      time: hhmm(c.scheduled_at),
      kind: "Cuidado",
      title: c.title,
      detail: "",
      color: "#475569",
    });
  return out.sort((a, b) => a.time.localeCompare(b.time));
}

/** Monta o documento A4 com marca d'água e dados do cliente. */
export function buildPlanHtml(d: PlanData, sections: ExportSection[], origin: string) {
  const p = d.patient;
  const age = p.birth_date
    ? Math.floor((Date.now() - Date.parse(p.birth_date + "T12:00:00")) / 31_557_600_000)
    : null;
  const goal = (d.prefs?.objective ?? p.care_goal ?? "equilibrio") as Goal;
  const now = new Intl.DateTimeFormat("pt-BR", {
    timeZone: tz,
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date());
  const info = [
    ["Cliente", p.full_name],
    ["Idade", age ? `${age} anos` : ""],
    [
      "Peso / altura",
      [
        p.weight_kg ? `${n(Number(p.weight_kg), 2)} kg` : "",
        p.height_cm ? `${n(Number(p.height_cm))} cm` : "",
      ]
        .filter(Boolean)
        .join(" · "),
    ],
    ["Objetivo", objectiveLabel(goal)],
    ["Rotina", activityLabels[p.activity_level] ?? ""],
    ["Local", [p.city, p.state].filter(Boolean).join(" - ")],
    [
      "Contato",
      [p.phone ? formatBrazilPhone(p.phone) : "", p.contact_email].filter(Boolean).join(" · "),
    ],
    ["Observações", (p.health_conditions ?? []).join(", ")],
  ].filter(([, v]) => v);

  const parts: string[] = [];
  if (sections.includes("cronograma")) {
    const rows = dayTimeline(d);
    parts.push(`<section><h2>Cronograma do dia</h2><p class="lead">Horários dos cuidados programados. Marque cada item ao concluir.</p>
      <table><thead><tr><th style="width:64px">Horário</th><th style="width:110px">Tipo</th><th>O quê</th><th>Detalhes</th><th style="width:44px">Feito</th></tr></thead><tbody>
      ${rows.map((r) => `<tr><td class="time">${esc(r.time)}</td><td><span class="tag" style="--c:${r.color}">${esc(r.kind)}</span></td><td><strong>${esc(r.title)}</strong></td><td class="muted">${esc(r.detail)}</td><td><span class="box"></span></td></tr>`).join("")}
      </tbody></table></section>`);
  }
  if (sections.includes("medicacao") && d.meds.length)
    parts.push(`<section><h2>Medicamentos</h2><table><thead><tr><th>Medicamento</th><th>Dose</th><th>Horários</th><th>Orientações</th></tr></thead><tbody>
      ${d.meds.map((m) => `<tr><td><strong>${esc(m.name)}</strong></td><td>${esc(m.dose)}</td><td class="time">${esc((m.times ?? []).join(" · "))}</td><td class="muted">${esc(m.instructions)}</td></tr>`).join("")}
      </tbody></table><p class="note">Siga sempre a receita médica. Não altere doses por conta própria.</p></section>`);
  if (sections.includes("suplementos") && d.supplements.length)
    parts.push(`<section><h2>Suplementos</h2><table><thead><tr><th>Suplemento</th><th>Dose</th><th>Horários</th><th>Como tomar</th></tr></thead><tbody>
      ${d.supplements.map((s) => `<tr><td><strong>${esc(s.name)}</strong></td><td>${n(Number(s.dose), 2)} ${esc(s.unit)}</td><td class="time">${esc((s.times ?? []).join(" · "))}</td><td class="muted">${esc([s.with_food ? "Com refeição" : "", s.notes].filter(Boolean).join(" · "))}</td></tr>`).join("")}
      </tbody></table></section>`);
  if (sections.includes("hidratacao") && d.waterTarget) {
    const cups = Math.ceil(d.waterTarget / 250);
    parts.push(`<section><h2>Hidratação</h2><div class="kpis"><div><span>Meta diária</span><strong>${n(d.waterTarget / 1000, 2)} L</strong></div><div><span>Copos de 250 ml</span><strong>${cups}</strong></div><div><span>Ideal até</span><strong>19h</strong></div></div>
      <div class="cups">${Array.from({ length: cups }, (_, i) => `<span>${i + 1}</span>`).join("")}</div><p class="note">Distribua ao longo do dia e reduza o volume nas 3 horas antes de dormir.</p></section>`);
  }
  if (sections.includes("cardapio")) {
    const avoided: string[] = d.prefs?.avoided_ingredients ?? [];
    const pool = recipes.filter((r) =>
      recipeFits(r, goal, Boolean(d.prefs?.gastritis_sensitive), avoided),
    );
    const days = ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"];
    const t = d.prefs ?? {};
    parts.push(`<section class="break"><h2>Cardápio da semana</h2><p class="lead">Sugestões para ${esc(objectiveLabel(goal).toLowerCase())}${t.target_kcal ? ` · meta de ${n(Number(t.target_kcal))} kcal` : ""}${t.target_protein_g ? ` e ${n(Number(t.target_protein_g))} g de proteína por dia` : ""}.</p>
      <table class="menu"><thead><tr><th style="width:80px">Dia</th><th>Café da manhã</th><th>Almoço</th><th>Jantar</th><th>Lanche</th></tr></thead><tbody>
      ${days
        .map((label, i) => {
          const plan = menuForDay(i, pool, 0, goal);
          return `<tr><td><strong>${label}</strong></td>${plan.map(({ recipe }) => (recipe ? `<td><strong>${esc(recipe.title)}</strong><br><span class="muted">${recipeTotals(recipe).kcal} kcal · ${n(recipeTotals(recipe).protein, 1)} g prot.</span></td>` : `<td class="muted">—</td>`)).join("")}</tr>`;
        })
        .join("")}
      </tbody></table><p class="note">Valores aproximados (TACO/UNICAMP). Cardápio educativo, não substitui a orientação de um nutricionista.</p></section>`);
  }
  if (!parts.length)
    parts.push(
      `<section><h2>Sem programação</h2><p class="lead">Monte seus horários de medicamentos, suplementos e alimentação no NextVita para exportar.</p></section>`,
    );

  const logo = `<svg viewBox="0 0 40 40" width="34" height="34"><rect width="40" height="40" rx="10" fill="#0c8063"/><path d="M12 29V11h3.4l9.2 12.4V11H28v18h-3.3l-9.3-12.5V29z" fill="#fff"/></svg>`;
  const mark = encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='360' height='220'><text x='0' y='130' transform='rotate(-28 180 110)' font-family='Arial' font-weight='800' font-size='44' fill='#0c8063' fill-opacity='0.06'>NextVita</text></svg>`,
  );
  return `<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>NextVita · Programação de ${esc(p.full_name ?? "cliente")}</title>
<style>
@page{size:A4;margin:14mm 12mm 16mm}
*{box-sizing:border-box}body{margin:0;font-family:Inter,"Segoe UI",Roboto,Arial,sans-serif;color:#0f172a;font-size:11.5px;line-height:1.45;-webkit-print-color-adjust:exact;print-color-adjust:exact}
.wm{position:fixed;inset:0;background-image:url("data:image/svg+xml,${mark}");background-repeat:repeat;z-index:0;pointer-events:none}
.wm2{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%) rotate(-28deg);font:800 120px Arial;color:#0c8063;opacity:.05;white-space:nowrap;z-index:0}
main{position:relative;z-index:1}
header{display:flex;align-items:center;gap:12px;padding:14px 16px;border-radius:14px;background:linear-gradient(120deg,#062019,#0c8063);color:#fff}
header h1{margin:0;font-size:18px}header p{margin:2px 0 0;opacity:.8;font-size:11px}header .right{margin-left:auto;text-align:right;font-size:10.5px;opacity:.85}
.info{display:grid;grid-template-columns:repeat(4,1fr);gap:8px 14px;margin:12px 0 4px;padding:12px 14px;border:1px solid #e2e8f0;border-radius:12px;background:#f8fafc}
.info div span{display:block;font-size:9.5px;color:#64748b;text-transform:none}.info div strong{font-size:11.5px}
section{margin-top:16px;break-inside:avoid-page}section.break{break-before:page}
h2{margin:0 0 4px;font-size:14px;color:#0c8063;display:flex;align-items:center;gap:8px}h2::before{content:"";width:4px;height:16px;border-radius:4px;background:#0c8063}
.lead{margin:0 0 8px;color:#475569}.note{margin:6px 0 0;color:#64748b;font-size:10px}.muted{color:#64748b}
table{width:100%;border-collapse:collapse;background:#fff}th{text-align:left;font-size:10px;color:#475569;background:#f1f5f9;padding:6px 8px;border-bottom:1px solid #e2e8f0}
td{padding:6px 8px;border-bottom:1px solid #eef2f6;vertical-align:top}tr{break-inside:avoid}.time{font-variant-numeric:tabular-nums;font-weight:700;white-space:nowrap}
.tag{display:inline-block;padding:1px 8px;border-radius:999px;font-size:9.5px;font-weight:700;color:var(--c);background:color-mix(in srgb,var(--c) 12%,#fff)}
.box{display:inline-block;width:14px;height:14px;border:1.5px solid #94a3b8;border-radius:4px}
.kpis{display:flex;gap:10px;margin:6px 0}.kpis div{flex:1;border:1px solid #e2e8f0;border-radius:10px;padding:8px 10px}.kpis span{display:block;font-size:10px;color:#64748b}.kpis strong{font-size:16px}
.cups{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}.cups span{width:26px;height:30px;border:1.5px solid #38bdf8;border-radius:4px 4px 8px 8px;display:grid;place-items:center;font-size:9px;color:#0284c7}
.menu td{font-size:10.5px}
</style></head><body><div class="wm"></div><div class="wm2">NextVita</div><main>
<header>${logo}<div><h1>Programação de cuidados</h1><p>NextVita · acompanhamento de saúde</p></div><div class="right">Gerado em ${esc(now)}<br>Horário do Acre (UTC−5)</div></header>
<div class="info">${info.map(([k, v]) => `<div><span>${esc(k)}</span><strong>${esc(v)}</strong></div>`).join("")}</div>
${parts.join("\n")}
<p class="note" style="margin-top:18px">Documento pessoal e educativo gerado pelo NextVita. Não substitui prescrição médica ou nutricional.</p>
<p class="note">NextVita · ${esc(origin.replace(/^https?:\/\//, ""))} · uso pessoal de ${esc(p.full_name ?? "")}</p>
</main></body></html>`;
}

/** Abre a janela de impressão do navegador, onde o usuário escolhe "Salvar como PDF". */
export function printHtml(html: string) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  Object.assign(frame.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  document.body.appendChild(frame);
  const doc = frame.contentDocument!;
  doc.open();
  doc.write(html);
  doc.close();
  const go = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } finally {
      window.setTimeout(() => frame.remove(), 60_000);
    }
  };
  if (doc.readyState === "complete") window.setTimeout(go, 250);
  else frame.onload = () => window.setTimeout(go, 250);
}
