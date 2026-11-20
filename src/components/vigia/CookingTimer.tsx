import { useEffect, useMemo, useState } from "react";
import {
  Bell,
  BellOff,
  Check,
  Flame,
  Minus,
  Pause,
  Play,
  Plus,
  RotateCcw,
  Search,
  Timer,
  X,
} from "lucide-react";
import { useCookTimers } from "@/hooks/use-cook-timers";
import { playChime, useAlertSound } from "./NextUpClock";
import { CookingDial, GlyphIcon } from "./CookingScene";
import { cookInfo } from "@/lib/cooking-info";
import {
  cookFoodById,
  cookFoods,
  cookGroups,
  formatClock,
  formatDuration,
  matchesCookFood,
  plural,
  presetOf,
  qtyNutrition,
  type CookFood,
  type CookGroup,
} from "@/lib/cooking-times";
import { progressOf, remainingOf, type CookTimer } from "@/lib/cook-timers";

const finishTime = (ms: number) =>
  new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Rio_Branco",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(ms));
const chip = (on: boolean) =>
  "min-h-10 rounded-xl border px-3 text-sm font-semibold transition active:scale-95 " +
  (on
    ? "border-white bg-white text-[#062019]"
    : "border-white/15 bg-white/[.06] text-white/85 hover:bg-white/15");

function MiniRing({ timer, now }: { timer: CookTimer; now: number }) {
  const p = progressOf(timer, now),
    c = 2 * Math.PI * 14;
  const food = cookFoodById.get(timer.foodId);
  return (
    <svg viewBox="0 0 36 36" className="size-9 shrink-0" aria-hidden="true">
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke="#fff"
        strokeOpacity=".15"
        strokeWidth="3"
      />
      <circle
        cx="18"
        cy="18"
        r="14"
        fill="none"
        stroke={timer.status === "done" ? "#5ed8c3" : (food?.color ?? "#fff")}
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${p * c} ${c}`}
        transform="rotate(-90 18 18)"
      />
      {timer.status === "done" ? (
        <path
          d="M12 18.5l4 4 8-9"
          fill="none"
          stroke="#5ed8c3"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      ) : null}
    </svg>
  );
}

export function CookingTimer({ patientId }: { patientId: string }) {
  const sound = useAlertSound();
  const { timers, now, start, pause, resume, addMinute, restart, remove } = useCookTimers(
    patientId,
    sound.on,
  );
  const [foodId, setFoodId] = useState("ovo_cozido");
  const [presetKey, setPresetKey] = useState("duro");
  const [qty, setQty] = useState(2);
  const [extra, setExtra] = useState(0);
  const [focusId, setFocusId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState<CookGroup | "todos">("todos");

  const focused = timers.find((t) => t.id === focusId) ?? null;
  const food: CookFood =
    (focused ? cookFoodById.get(focused.foodId) : cookFoodById.get(foodId)) ?? cookFoods[0];
  const preset = presetOf(food, focused ? focused.presetKey : presetKey);
  const shownQty = focused ? focused.qty : qty;

  useEffect(() => {
    if (focusId && !timers.some((t) => t.id === focusId)) setFocusId(null);
  }, [timers, focusId]);

  const list = useMemo(
    () =>
      cookFoods.filter(
        (f) => (group === "todos" || f.group === group) && matchesCookFood(f, query),
      ),
    [group, query],
  );

  function pickFood(f: CookFood) {
    setFocusId(null);
    setFoodId(f.id);
    setPresetKey(f.defaultPreset);
    setQty(f.qty?.def ?? 1);
    setExtra(0);
  }
  function pickPreset(k: string) {
    setPresetKey(k);
    setExtra(0);
  }

  const setupMinutes = Math.max(0.5, preset.minutes + extra);
  const remaining = focused ? remainingOf(focused, now) : setupMinutes * 60_000;
  const progress = focused ? progressOf(focused, now) : 0;
  const status = focused ? focused.status : "idle";
  const nutrition = qtyNutrition(food, shownQty);
  const cfg = food.qty;
  const unit = cfg ? plural(shownQty, cfg.unit) : "";
  const hint = cfg?.hint?.(shownQty, focused ? focused.presetKey : presetKey);
  const clock = formatClock(remaining / 1000);
  const minutesLeft = Math.ceil(remaining / 60_000);
  const dialLabel =
    status === "idle"
      ? `${food.name}: ${formatDuration(setupMinutes)} de preparo`
      : status === "done"
        ? `${food.name}: pronto`
        : `${food.name}: faltam cerca de ${minutesLeft} min`;

  function begin() {
    playChime(0.001);
    const id = start({
      foodId: food.id,
      presetKey: preset.key,
      qty: shownQty,
      minutes: setupMinutes,
    });
    setFocusId(id);
    if (typeof Notification !== "undefined" && Notification.permission === "default" && sound.on)
      void Notification.requestPermission();
  }

  const doneTimers = timers.filter((t) => t.status === "done");

  return (
    <section
      aria-label="Tempo de preparo"
      className={"grid gap-3 " + (focused ? "" : "lg:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]")}
    >
      {/* Escolha do alimento */}
      <div
        className={
          (focused ? "hidden " : "") +
          "rounded-2xl border border-border bg-card p-3 lg:sticky lg:top-2 lg:self-start"
        }
      >
        <h3 className="px-1 text-base font-bold">Tempo de preparo</h3>
        <p className="px-1 text-xs text-muted-foreground">
          Escolha o alimento, ajuste a quantidade e inicie o timer.
        </p>
        <label className="relative mt-3 block">
          <Search
            size={15}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar: ovo, batata-doce, arroz…"
            aria-label="Buscar alimento para cozinhar"
            className="h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </label>
        <div
          className="mt-2 flex gap-1 overflow-x-auto pb-1"
          role="group"
          aria-label="Grupo de alimentos"
        >
          {(
            [["todos", "Todos"], ...cookGroups.map((g) => [g.key, g.label])] as [string, string][]
          ).map(([k, l]) => (
            <button
              key={k}
              type="button"
              aria-pressed={group === k}
              onClick={() => setGroup(k as CookGroup | "todos")}
              className={
                "h-9 shrink-0 rounded-lg px-3 text-xs font-semibold transition " +
                (group === k
                  ? "bg-foreground text-background"
                  : "bg-muted/60 text-muted-foreground hover:text-foreground")
              }
            >
              {l}
            </button>
          ))}
        </div>
        <ul className="mt-2 grid max-h-[26rem] gap-1 overflow-y-auto pr-1">
          {list.map((f) => {
            const sel = !focused && f.id === foodId;
            return (
              <li key={f.id}>
                <button
                  type="button"
                  onClick={() => pickFood(f)}
                  aria-pressed={sel}
                  className={
                    "flex w-full items-center gap-3 rounded-xl border p-2 text-left transition active:scale-[.99] " +
                    (sel ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted/60")
                  }
                >
                  <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-[#0d211c]">
                    <GlyphIcon glyph={f.glyph} color={f.color} className="size-9" />
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{f.name}</strong>
                    <span className="text-xs text-muted-foreground">
                      {formatDuration(presetOf(f, f.defaultPreset).minutes)} ·{" "}
                      {f.vessel === "frigideira" ? "frigideira" : "panela"}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {!list.length && (
          <p className="mt-2 rounded-xl border border-dashed border-border p-3 text-sm text-muted-foreground">
            Nenhum alimento encontrado. Tente outro nome.
          </p>
        )}
      </div>

      {/* Palco do timer */}
      <div className="nv-dark relative isolate overflow-hidden rounded-2xl bg-[#071512] p-4 text-white shadow-card sm:p-5">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10 opacity-60"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.04) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        {doneTimers.length > 0 && (
          <div role="alert" className="mb-3 grid gap-2">
            {doneTimers.map((t) => {
              const f = cookFoodById.get(t.foodId);
              return (
                <div
                  key={t.id}
                  className="nv-rise flex flex-wrap items-center gap-2 rounded-xl border border-teal-300/40 bg-teal-300/15 px-3 py-2 text-sm"
                >
                  <Check size={16} className="text-teal-200" />
                  <strong className="min-w-0 flex-1">
                    {f?.name} pronto ({finishTime(t.doneAt)})
                  </strong>
                  <button
                    type="button"
                    onClick={() => addMinute(t.id)}
                    className="h-9 rounded-lg bg-white/15 px-3 text-xs font-semibold hover:bg-white/25"
                  >
                    +1 min
                  </button>
                  <button
                    type="button"
                    onClick={() => remove(t.id)}
                    className="h-9 rounded-lg bg-white px-3 text-xs font-semibold text-[#062019]"
                  >
                    Dispensar
                  </button>
                </div>
              );
            })}
          </div>
        )}

        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-emerald-200">
              {focused ? "Em preparo" : "Programar preparo"}
            </p>
            <h3 className="font-display text-2xl font-extrabold leading-tight">{food.name}</h3>
            <p className="text-sm text-white/70">{preset.label}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {focused && (
              <button
                type="button"
                onClick={() => setFocusId(null)}
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"
              >
                <Plus size={16} /> Novo preparo
              </button>
            )}
            <button
              type="button"
              onClick={sound.toggle}
              aria-pressed={sound.on}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-3 text-sm font-semibold hover:bg-white/20"
            >
              {sound.on ? <Bell size={16} /> : <BellOff size={16} />}{" "}
              {sound.on ? "Som ligado" : "Som desligado"}
            </button>
          </div>
        </div>

        <div
          className={
            "mt-4 grid items-start gap-5 " +
            (focused ? "justify-items-center" : "md:grid-cols-[minmax(0,19rem)_minmax(0,1fr)]")
          }
        >
          {/* Mostrador */}
          <div className={"mx-auto w-full " + (focused ? "max-w-[24rem]" : "max-w-[19rem]")}>
            <div className="relative">
              {status === "running" && (
                <>
                  <span aria-hidden="true" className="cook-ripple" />
                  <span
                    aria-hidden="true"
                    className="cook-ripple"
                    style={{ animationDelay: "1.4s" }}
                  />
                </>
              )}
              <CookingDial
                glyph={food.glyph}
                color={food.color}
                vessel={food.vessel}
                qty={shownQty}
                progress={progress}
                status={status}
                label={dialLabel}
              />
            </div>
            <p
              role="timer"
              aria-label={dialLabel}
              className={
                "mt-1 text-center font-display font-extrabold tabular-nums tracking-tight " +
                (focused ? "text-7xl" : "text-5xl")
              }
            >
              {clock}
            </p>
            <p className="mt-1 text-center text-xs text-white/60">
              {status === "running" && focused
                ? `Pronto às ${finishTime(focused.endsAt)}`
                : status === "paused"
                  ? "Pausado"
                  : status === "done"
                    ? "Tempo concluído"
                    : `Conte a partir de: ${preset.from}`}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {!focused && (
                <button
                  type="button"
                  onClick={begin}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-400 px-6 text-base font-bold text-emerald-950 transition hover:bg-emerald-300 active:scale-95"
                >
                  <Play size={18} /> Iniciar timer
                </button>
              )}
              {focused?.status === "running" && (
                <button
                  type="button"
                  onClick={() => pause(focused.id)}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-white px-5 text-base font-bold text-[#062019] active:scale-95"
                >
                  <Pause size={18} /> Pausar
                </button>
              )}
              {focused?.status === "paused" && (
                <button
                  type="button"
                  onClick={() => resume(focused.id)}
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-base font-bold text-emerald-950 active:scale-95"
                >
                  <Play size={18} /> Continuar
                </button>
              )}
              {focused && (
                <button
                  type="button"
                  onClick={() => addMinute(focused.id)}
                  className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20 active:scale-95"
                >
                  <Plus size={16} /> 1 min
                </button>
              )}
              {focused && (
                <button
                  type="button"
                  onClick={() => restart(focused.id)}
                  className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 text-sm font-semibold hover:bg-white/20 active:scale-95"
                >
                  <RotateCcw size={16} /> Reiniciar
                </button>
              )}
              {focused && (
                <button
                  type="button"
                  onClick={() => remove(focused.id)}
                  className="inline-flex h-12 items-center gap-1.5 rounded-xl border border-white/20 px-4 text-sm font-semibold text-white/80 hover:bg-white/10 active:scale-95"
                >
                  <X size={16} /> Cancelar
                </button>
              )}
            </div>
          </div>

          {/* Opções e instruções */}
          <div className={focused ? "hidden" : "grid gap-4"}>
            <div>
              <p className="text-sm font-semibold text-white/80">Ponto ou método</p>
              <div
                className="mt-2 flex flex-wrap gap-2"
                role="group"
                aria-label="Ponto ou método de preparo"
              >
                {food.presets.map((p) => (
                  <button
                    key={p.key}
                    type="button"
                    disabled={!!focused}
                    aria-pressed={p.key === preset.key}
                    onClick={() => pickPreset(p.key)}
                    className={
                      chip(p.key === preset.key) +
                      " disabled:cursor-not-allowed disabled:opacity-60"
                    }
                  >
                    {p.label}{" "}
                    <span className="tabular-nums opacity-70">· {formatDuration(p.minutes)}</span>
                  </button>
                ))}
              </div>
              {preset.note && <p className="mt-2 text-xs text-white/65">{preset.note}</p>}
            </div>

            {cfg && (
              <div>
                <p className="text-sm font-semibold text-white/80">Quantidade</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <div className="inline-flex items-center rounded-xl border border-white/15 bg-white/[.06]">
                    <button
                      type="button"
                      disabled={!!focused || qty <= cfg.min}
                      onClick={() => setQty((q) => Math.max(cfg.min, q - 1))}
                      aria-label="Diminuir quantidade"
                      className="grid size-10 place-items-center rounded-l-xl hover:bg-white/10 disabled:opacity-40"
                    >
                      <Minus size={16} />
                    </button>
                    <span className="min-w-28 px-2 text-center text-sm font-bold tabular-nums">
                      {shownQty} {unit}
                    </span>
                    <button
                      type="button"
                      disabled={!!focused || qty >= cfg.max}
                      onClick={() => setQty((q) => Math.min(cfg.max, q + 1))}
                      aria-label="Aumentar quantidade"
                      className="grid size-10 place-items-center rounded-r-xl hover:bg-white/10 disabled:opacity-40"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {!focused &&
                    cfg.quick?.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setQty(n)}
                        aria-pressed={qty === n}
                        className={chip(qty === n) + " min-w-10 tabular-nums"}
                      >
                        {n}
                      </button>
                    ))}
                </div>
                {hint && <p className="mt-2 text-xs text-white/70">{hint}</p>}
              </div>
            )}

            {!focused && (
              <div>
                <p className="text-sm font-semibold text-white/80">Ajustar tempo</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExtra((e) => Math.max(0.5 - preset.minutes, e - 1))}
                    aria-label="Menos 1 minuto"
                    className={chip(false) + " grid size-10 place-items-center !p-0"}
                  >
                    <Minus size={16} />
                  </button>
                  <span className="min-w-24 text-center text-sm font-bold tabular-nums">
                    {formatDuration(setupMinutes)}
                  </span>
                  <button
                    type="button"
                    onClick={() => setExtra((e) => Math.min(240, e + 1))}
                    aria-label="Mais 1 minuto"
                    className={chip(false) + " grid size-10 place-items-center !p-0"}
                  >
                    <Plus size={16} />
                  </button>
                  {extra !== 0 && (
                    <button
                      type="button"
                      onClick={() => setExtra(0)}
                      className="h-10 rounded-xl px-3 text-xs font-semibold text-white/70 hover:bg-white/10"
                    >
                      Voltar ao padrão
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {!focused && cookInfo[food.id] && (
          <div className="mt-5 grid gap-px border border-white/10 bg-white/10 text-sm sm:grid-cols-3">
            {(
              [
                ["Tipo de alimento", cookInfo[food.id].kind],
                ["Benefício", cookInfo[food.id].benefit],
                ["Como preparar", cookInfo[food.id].prep],
              ] as const
            ).map(([t, v]) => (
              <div key={t} className="bg-[#0b1d19] p-3">
                <p className="text-[11px] font-bold text-emerald-200">{t}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/85">{v}</p>
              </div>
            ))}
          </div>
        )}

        <div
          className={
            (focused ? "hidden " : "") +
            "mt-5 grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,16rem)]"
          }
        >
          <div>
            <h4 className="flex items-center gap-1.5 text-sm font-bold">
              <Flame size={15} className="text-amber-300" /> Como fazer
            </h4>
            <ol className="mt-2 grid gap-2 text-sm leading-relaxed text-white/85">
              {food.steps.map((s, i) => (
                <li key={i} className="flex gap-2.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-bold tabular-nums">
                    {i + 1}
                  </span>
                  <span>{s}</span>
                </li>
              ))}
            </ol>
            {food.after && (
              <p className="mt-3 rounded-xl border border-white/10 bg-white/[.05] p-3 text-xs text-white/80">
                {food.after}
              </p>
            )}
          </div>
          {nutrition && (
            <div className="self-start rounded-xl border border-white/10 bg-white/[.06] p-3">
              <p className="text-xs text-white/60">
                {shownQty} {unit} · cerca de {nutrition.grams} g
              </p>
              <p className="mt-1 text-2xl font-extrabold tabular-nums">
                {nutrition.kcal} <span className="text-sm font-semibold text-white/60">kcal</span>
              </p>
              <p className="text-xs text-white/70">
                Proteína: {nutrition.protein.toLocaleString("pt-BR", { maximumFractionDigits: 1 })}{" "}
                g
              </p>
            </div>
          )}
        </div>

        {/* Vários timers ao mesmo tempo */}
        {timers.length > 0 && (
          <div className="mt-5 border-t border-white/10 pt-4">
            <h4 className="flex items-center gap-1.5 text-sm font-bold">
              <Timer size={15} /> Em andamento ({timers.length})
            </h4>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {timers.map((t) => {
                const f = cookFoodById.get(t.foodId);
                return (
                  <li
                    key={t.id}
                    className={
                      "flex items-center gap-2 rounded-xl border p-2 " +
                      (t.id === focusId
                        ? "border-white/60 bg-white/15"
                        : "border-white/10 bg-white/[.05]")
                    }
                  >
                    <button
                      type="button"
                      onClick={() => setFocusId(t.id)}
                      aria-label={`Ver timer de ${f?.name}`}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <MiniRing timer={t} now={now} />
                      <span className="min-w-0">
                        <strong className="block truncate text-sm">{f?.name}</strong>
                        <span className="text-xs tabular-nums text-white/70">
                          {t.status === "done"
                            ? "Pronto"
                            : t.status === "paused"
                              ? "Pausado · " + formatClock(remainingOf(t, now) / 1000)
                              : formatClock(remainingOf(t, now) / 1000)}
                        </span>
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={() => remove(t.id)}
                      aria-label={`Remover timer de ${f?.name}`}
                      className="grid size-9 shrink-0 place-items-center rounded-lg text-white/70 hover:bg-white/10"
                    >
                      <X size={15} />
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        <p className="mt-4 text-[11px] text-white/55">
          Tempos de referência para a cozinha de casa. Variam com o tamanho do alimento, a panela e
          o fogão. Confira o ponto com um garfo antes de servir.
        </p>
      </div>
    </section>
  );
}
