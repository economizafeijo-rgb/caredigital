import { useState } from "react";
import { Loader2, Power } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import type { Vendor } from "@/lib/marketplace";
import { setAgentOnline } from "@/lib/store-presence";

const hora = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleTimeString("pt-BR", {
        timeZone: "America/Rio_Branco",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

/** Abre ou fecha a loja. Aberta, a loja aparece como "aberta agora" na vitrine e na home da plataforma. */
export function SellerOpenToggle({
  vendor,
  onChanged,
  compact = false,
}: {
  vendor: Vendor;
  onChanged: () => void;
  /** Versão discreta, em uma linha, para o cabeçalho da visão geral. */
  compact?: boolean;
}) {
  const { confirm } = useDialog();
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const open = !!vendor.is_open;
  const approved = vendor.status === "ativo";

  async function toggle() {
    if (open) {
      const ok = await confirm(
        "Fechar a loja agora?",
        "Ela sai do ar como “aberta agora” e os clientes passam a ver que está fechada.",
        false,
        "Fechar loja",
      );
      if (!ok) return;
    }
    setBusy(true);
    setErr("");
    const { error } = await (supabase as any).rpc("care_store_set_open", {
      p_vendor: vendor.id,
      p_open: !open,
    });
    setBusy(false);
    if (error) {
      setErr(
        open
          ? "Não foi possível fechar a loja. Tente de novo."
          : "Não foi possível abrir a loja. Confira se ela já foi aprovada.",
      );
      return;
    }
    // Abrir a loja já coloca o atendente online (chat ativo); fechar coloca offline.
    try {
      await setAgentOnline(vendor.id, !open);
    } catch {
      /* o lojista ainda pode ajustar em Mensagens > Atendimento */
    }
    onChanged();
  }

  if (compact) {
    return (
      <div className="flex flex-wrap items-center gap-2.5 rounded-xl border border-border bg-card px-3 py-1.5">
        <span
          aria-hidden="true"
          className={`size-2.5 shrink-0 rounded-full ${open ? "bg-emerald-400 shadow-[0_0_10px_1px_rgba(52,211,153,.5)]" : "bg-slate-400"}`}
        />
        <span className="text-[13px] font-bold">{open ? "Loja aberta" : "Loja fechada"}</span>
        <button
          type="button"
          onClick={() => void toggle()}
          disabled={!approved || busy}
          aria-label={open ? "Fechar loja" : "Abrir loja"}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg px-3 text-xs font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${
            open
              ? "border border-rose-500/40 text-rose-600 hover:bg-rose-500/10 dark:text-rose-300"
              : "bg-emerald-700 text-white hover:bg-emerald-700"
          }`}
        >
          {busy ? <Loader2 size={13} className="animate-spin" /> : <Power size={13} />}
          {open ? "Fechar" : "Abrir"}
        </button>
        {err && (
          <span role="alert" className="basis-full text-xs text-rose-600 dark:text-rose-300">
            {err}
          </span>
        )}
      </div>
    );
  }

  return (
    <section
      aria-label="Situação da loja"
      className={`flex flex-wrap items-center gap-4 rounded-2xl border p-4 sm:p-5 ${
        open ? "border-emerald-500/40 bg-emerald-500/10" : "border-border bg-card"
      }`}
    >
      <span
        className={`grid size-12 shrink-0 place-items-center rounded-2xl ${
          open ? "bg-emerald-500/20" : "bg-muted"
        }`}
      >
        <span
          aria-hidden="true"
          className={`size-4 rounded-full ${open ? "bg-emerald-400 shadow-[0_0_14px_2px_rgba(52,211,153,.55)]" : "bg-slate-400"}`}
        />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-base font-extrabold">
          {open ? "Loja aberta para vendas" : "Loja fechada"}
        </p>
        <p className="text-xs text-muted-foreground">
          {!approved
            ? "Sua loja ainda não foi aprovada. Assim que for, você poderá abri-la."
            : open
              ? `Aberta desde ${hora(vendor.opened_at) ?? "agora"}. Os clientes veem a loja como aberta.`
              : "Abra a loja para aparecer como aberta na vitrine e na home da plataforma."}
        </p>
        {err && (
          <p role="alert" className="mt-1 text-xs text-rose-600 dark:text-rose-300">
            {err}
          </p>
        )}
      </div>
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={!approved || busy}
        className={`inline-flex h-11 items-center gap-2 rounded-xl px-5 text-sm font-bold transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50 ${
          open
            ? "bg-rose-600 text-white hover:bg-rose-700"
            : "bg-emerald-700 text-white hover:bg-emerald-700"
        }`}
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Power size={16} />}
        {open ? "Fechar loja" : "Abrir loja"}
      </button>
    </section>
  );
}
