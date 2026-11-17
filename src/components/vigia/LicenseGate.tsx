import { useEffect, useState, type ReactNode } from "react";
import { KeyRound, Loader2, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TrialTour } from "./TrialStart";
import { acreDateKey } from "@/lib/acre-time";

type License = { plan: string; status: string; expires: string | null };
const planLabel: Record<string, string> = { basico: "Básico", premium: "Premium", profissional: "Profissional" };

/** A plataforma é gratuita: a validade não bloqueia mais o acesso. Só a suspensão feita pelo administrador bloqueia. */
export function licenseState(license: License | null) {
  if (!license) return "ativa";
  if (license.status === "suspensa") return "suspensa";
  if (license.status === "ativa") return "ativa";
  return "gratuita";
}
export const daysLeft = (expires: string | null, today = acreDateKey()) =>
  expires ? Math.round((Date.parse(expires + "T00:00:00Z") - Date.parse(today + "T00:00:00Z")) / 86_400_000) : null;

/** Formata o código no padrão CARE-XXXX-XXXX-XXXX enquanto o cliente digita. */
export function formatLicenseCode(raw: string) {
  const clean = raw.toUpperCase().replace(/[^A-Z0-9]/g, "").replace(/^CARE/, "").slice(0, 12);
  return clean ? "CARE-" + (clean.match(/.{1,4}/g) ?? []).join("-") : "";
}

export function LicenseGate({ children }: { children: ReactNode }) {
  const [license, setLicense] = useState<License | null | undefined>(undefined);
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  useEffect(() => {
    let active = true;
    void (async () => {
      const db = supabase as any;
      const { data } = await supabase.auth.getUser();
      if (!data.user) { if (active) setLicense(null); return; }
      const grant = await db.from("care_patient_access").select("patient_id").eq("user_id", data.user.id).limit(1);
      const id = grant.data?.[0]?.patient_id;
      if (!id) { if (active) setLicense(null); return; }
      const row = await db.from("care_patients").select("license_plan,license_status,license_expires_on").eq("id", id).maybeSingle();
      // Sem as colunas de licença (migração pendente) o acesso não é bloqueado.
      if (!active) return;
      setLicense(row.error || !row.data ? null : { plan: row.data.license_plan, status: row.data.license_status, expires: row.data.license_expires_on });
    })();
    return () => { active = false; };
  }, [reload]);

  async function redeem() {
    if (busy || code.length !== 19) { setMessage({ ok: false, text: "Digite o código completo no formato CARE-XXXX-XXXX-XXXX." }); return; }
    setBusy(true); setMessage(null);
    const { data, error } = await (supabase as any).rpc("care_redeem_license", { p_code: code });
    setBusy(false);
    if (error) {
      const m = error.message ?? "";
      setMessage({ ok: false, text: /already used/i.test(m) ? "Este código já foi utilizado." : /another client/i.test(m) ? "Este código foi gerado para outro cliente."
        : /invalid/i.test(m) ? "Código inválido ou revogado. Confira com o administrador." : "Não foi possível ativar agora. Tente novamente." });
      return;
    }
    setMessage({ ok: true, text: `Licença ${planLabel[data.plan] ?? data.plan} ativada até ${String(data.expires_on).split("-").reverse().join("/")}.` });
    setCode(""); setReload(v => v + 1);
  }

  if (license === undefined) return <div role="status" className="grid h-full place-items-center text-sm text-muted-foreground">Verificando sua licença…</div>;
  const state = licenseState(license);
  const redeemForm = <div className="flex flex-wrap gap-2">
    <input value={code} onChange={e => setCode(formatLicenseCode(e.target.value))} placeholder="CARE-XXXX-XXXX-XXXX" aria-label="Código de licença"
      className="h-12 min-w-[240px] flex-1 rounded-xl border border-border bg-surface px-4 font-mono text-base tracking-wider text-foreground"/>
    <button type="button" onClick={() => void redeem()} disabled={busy} className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-500 px-6 text-sm font-bold text-white shadow-sm hover:brightness-110 disabled:opacity-60">
      {busy ? <Loader2 size={18} className="animate-spin"/> : <KeyRound size={18}/>} Ativar licença</button>
  </div>;

  if (state === "suspensa") return <section className="mx-auto mt-8 w-full max-w-xl overflow-hidden rounded-3xl border border-border bg-card shadow-pop">
    <div className="bg-gradient-to-br from-rose-600 to-pink-500 p-6 text-white">
      <ShieldAlert size={34}/>
      <h1 className="mt-3 text-2xl font-extrabold">Seu acesso está suspenso</h1>
      <p className="mt-1 text-sm text-white/85">Seus registros continuam guardados. Se você tem um código de reativação, insira-o abaixo; caso contrário, fale com o administrador da plataforma.</p>
    </div>
    <div className="p-6">{redeemForm}
      {message && <p role="status" className={`mt-3 rounded-xl px-3 py-2 text-sm font-medium ${message.ok ? "bg-emerald-500/10 text-emerald-700" : "bg-destructive/10 text-destructive"}`}>{message.text}</p>}
      <p className="mt-3 text-xs text-muted-foreground">Não tem um código? Fale com o administrador da plataforma.</p>
    </div>
  </section>;

  return <>
    {state === "gratuita" && <TrialTour/>}
    {children}
  </>;
}
