import { Link } from "@tanstack/react-router";
import { ArrowRight, CalendarCheck, CheckCircle2, Clock3, Gift, LineChart, LogIn, ShieldCheck, Sparkles, UserRound } from "lucide-react";

const agenda: [string, string, boolean][] = [["08:00", "Losartana 50 mg", true], ["10:30", "Água · 250 ml", true], ["12:30", "Almoço", false]];

/** Arte da área do paciente: acompanhamento real, com cartões de interface que mostram o que o cliente encontra ao entrar. */
function GateArt() {
  return (
    <div aria-hidden="true" className="relative isolate min-h-[21rem] overflow-hidden bg-slate-950 lg:min-h-[34rem]">
      <img src="/images/gate-paciente.webp" alt="" width={1100} height={689} loading="eager" decoding="async"
        className="absolute inset-0 -z-20 size-full object-cover object-[62%_30%]" />
      <div className="absolute inset-0 -z-10 bg-[linear-gradient(160deg,rgba(4,31,29,.82)_0%,rgba(10,63,57,.55)_55%,rgba(14,107,92,.35)_100%)]" />
      <div className="absolute -left-20 -top-20 -z-10 size-72 rounded-full bg-emerald-400/25 blur-3xl" />
      <div className="absolute -bottom-24 -right-10 -z-10 size-72 rounded-full bg-teal-300/20 blur-3xl" />

      <div className="nv-float absolute left-4 top-5 w-[15.5rem] rounded-2xl border border-white/25 bg-slate-950/55 p-3.5 text-white shadow-2xl backdrop-blur-md sm:left-6 sm:top-7 sm:w-[17rem]">
        <p className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-emerald-300"><CalendarCheck size={13} /> Agenda de hoje</p>
        <ul className="mt-2.5 grid gap-1.5">
          {agenda.map(([time, name, done]) => (
            <li key={time} className="flex items-center gap-2.5 rounded-xl bg-white/10 px-2.5 py-1.5 text-xs">
              <span className="font-mono font-bold text-white/70">{time}</span><span className="flex-1 truncate font-semibold">{name}</span>
              {done ? <CheckCircle2 size={15} className="text-emerald-300" /> : <i className="size-3.5 rounded-full border-2 border-amber-300" />}
            </li>
          ))}
        </ul>
      </div>

      <div className="nv-float absolute bottom-24 right-4 flex items-center gap-3 rounded-2xl border border-white/25 bg-slate-950/55 p-3 text-white shadow-2xl backdrop-blur-md sm:bottom-28 sm:right-6" style={{ animationDelay: "-2s" }}>
        <svg viewBox="0 0 44 44" className="size-14 -rotate-90"><circle cx="22" cy="22" r="18" fill="none" stroke="rgba(255,255,255,.2)" strokeWidth="5" /><circle cx="22" cy="22" r="18" fill="none" stroke="#38bdf8" strokeWidth="5" strokeLinecap="round" strokeDasharray="113" strokeDashoffset="36" /></svg>
        <div><p className="text-[10px] font-bold uppercase tracking-widest text-sky-300">Hidratação</p><p className="text-lg font-extrabold tabular-nums leading-tight">1.700 <span className="text-xs font-semibold text-white/70">/ 2.500 ml</span></p></div>
      </div>

      <div className="nv-float absolute bottom-5 left-4 flex items-center gap-2.5 rounded-2xl border border-emerald-300/40 bg-emerald-500/25 px-3.5 py-2.5 text-white shadow-2xl backdrop-blur-md sm:bottom-7 sm:left-6" style={{ animationDelay: "-4s" }}>
        <span className="grid size-9 place-items-center rounded-xl bg-emerald-400 text-slate-950"><Sparkles size={18} /></span>
        <div><p className="text-sm font-extrabold leading-tight">Meta atingida!</p><p className="text-[11px] text-emerald-100">5 de 6 metas hoje</p></div>
      </div>
    </div>
  );
}

export function PatientAreaGate() {
  return (
    <section aria-labelledby="gate-title" className="mx-auto mt-2 grid w-full max-w-[1180px] overflow-hidden rounded-3xl border border-border bg-card shadow-pop lg:mt-6 lg:grid-cols-[1.1fr_1fr]">
      <GateArt />
      <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
        <span className="grid size-12 place-items-center rounded-2xl bg-accent text-accent-foreground"><UserRound size={24} /></span>
        <p className="mt-5 text-[11px] font-bold uppercase tracking-[.2em] text-primary">Acompanhamento individual</p>
        <h1 id="gate-title" className="mt-1 font-display text-3xl font-extrabold leading-tight sm:text-4xl">Área do paciente</h1>
        <p className="mt-3 max-w-md text-sm leading-relaxed text-muted-foreground sm:text-base">
          Entre com sua conta para acompanhar medicação, hidratação, alimentação, treinos, sono e a sua evolução, com histórico por dia, mês e ano.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link to="/entrar" className="inline-flex h-12 items-center gap-2 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground shadow-sm transition hover:brightness-110"><LogIn size={17} /> Entrar</Link>
          <a href="/entrar?mode=signup" className="inline-flex h-12 items-center gap-2 rounded-xl border border-border bg-surface px-5 text-sm font-bold transition hover:bg-muted"><Gift size={17} /> Testar grátis por 7 dias <ArrowRight size={16} /></a>
        </div>
        <ul className="mt-8 grid gap-3 text-sm">
          {([[ShieldCheck, "Acesso individual e protegido"], [Clock3, "Cada registro com a hora real"], [LineChart, "Metas e evolução com gráficos interativos"]] as const).map(([Icon, text]) => (
            <li key={text} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-lg bg-primary/10 text-primary"><Icon size={16} /></span><span className="font-medium">{text}</span></li>
          ))}
        </ul>
      </div>
    </section>
  );
}
