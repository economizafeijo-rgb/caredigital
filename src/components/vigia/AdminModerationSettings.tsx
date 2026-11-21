import { useEffect, useState, type FormEvent } from "react";
import { supabase } from "@/integrations/supabase/client";

type Row = {
  out_strikes_limit: number;
  out_strikes_window_minutes: number;
  out_block_minutes: number;
  out_rate_max: number;
  out_rate_window_seconds: number;
};
type RpcResult = { data: unknown; error: { message: string } | null };
const client = supabase as unknown as {
  rpc: (name: string, args: Record<string, unknown>) => Promise<RpcResult>;
};

type Key = "strikes" | "window" | "block" | "rateMax" | "rateWindow";
const FIELDS: { key: Key; param: string; label: string; hint: string; min: number; max: number }[] =
  [
    {
      key: "strikes",
      param: "p_strikes_limit",
      label: "Ocorrências até bloquear",
      hint: "Detecções na janela abaixo antes do bloqueio temporário.",
      min: 1,
      max: 20,
    },
    {
      key: "window",
      param: "p_strikes_window_minutes",
      label: "Janela das ocorrências (min)",
      hint: "Período em que as ocorrências são contadas.",
      min: 1,
      max: 1440,
    },
    {
      key: "block",
      param: "p_block_minutes",
      label: "Duração do bloqueio (min)",
      hint: "Bloqueio temporário. Nunca é permanente.",
      min: 1,
      max: 1440,
    },
    {
      key: "rateMax",
      param: "p_rate_max",
      label: "Mensagens por janela",
      hint: "Limite de frequência de envio.",
      min: 1,
      max: 100,
    },
    {
      key: "rateWindow",
      param: "p_rate_window_seconds",
      label: "Janela de frequência (s)",
      hint: "Tempo em que o limite de mensagens vale.",
      min: 1,
      max: 600,
    },
  ];

/** Parâmetros da moderação de mensagens. Só o administrador da plataforma vê e altera. */
export function AdminModerationSettings() {
  const [vals, setVals] = useState<Record<Key, string> | null>(null);
  const [hidden, setHidden] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let alive = true;
    client.rpc("care_store_moderation_get", {}).then(({ data, error }) => {
      if (!alive) return;
      if (error) {
        setHidden(true);
        return;
      }
      const r = ((data ?? []) as Row[])[0];
      if (!r) return setHidden(true);
      setVals({
        strikes: String(r.out_strikes_limit),
        window: String(r.out_strikes_window_minutes),
        block: String(r.out_block_minutes),
        rateMax: String(r.out_rate_max),
        rateWindow: String(r.out_rate_window_seconds),
      });
    });
    return () => {
      alive = false;
    };
  }, []);

  if (hidden || !vals) return null;

  async function save(e: FormEvent) {
    e.preventDefault();
    const nums = FIELDS.map((f) => Number(vals![f.key]));
    const bad = FIELDS.find(
      (f, i) => !Number.isInteger(nums[i]) || nums[i] < f.min || nums[i] > f.max,
    );
    if (bad) return setMsg(`${bad.label}: use um número de ${bad.min} a ${bad.max}.`);
    setBusy(true);
    setMsg("");
    const { error } = await client.rpc("care_store_moderation_set", {
      p_strikes_limit: nums[0],
      p_strikes_window_minutes: nums[1],
      p_block_minutes: nums[2],
      p_rate_max: nums[3],
      p_rate_window_seconds: nums[4],
    });
    setBusy(false);
    setMsg(error ? "Não foi possível salvar. Confira os valores." : "Moderação atualizada.");
  }

  return (
    <form onSubmit={save} className="grid gap-3 rounded-2xl border border-border bg-card p-4">
      <div>
        <h3 className="text-sm font-extrabold">Moderação do chat</h3>
        <p className="text-xs text-muted-foreground">
          Os valores valem para todas as lojas. Não há bloqueio permanente por uma única detecção.
        </p>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {FIELDS.map((f) => (
          <label key={f.key} className="grid gap-1 text-xs font-semibold">
            {f.label}
            <input
              type="number"
              min={f.min}
              max={f.max}
              inputMode="numeric"
              value={vals[f.key]}
              onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
              className="h-9 rounded-lg border border-border bg-surface px-2 font-normal"
            />
            <span className="font-normal text-muted-foreground">{f.hint}</span>
          </label>
        ))}
      </div>
      <div className="flex items-center justify-between gap-3">
        <span role="status" className="text-xs text-muted-foreground">
          {msg}
        </span>
        <button
          type="submit"
          disabled={busy}
          className="h-9 rounded-lg bg-slate-900 px-4 text-sm font-semibold text-white disabled:opacity-50"
        >
          {busy ? "Salvando…" : "Salvar moderação"}
        </button>
      </div>
    </form>
  );
}
