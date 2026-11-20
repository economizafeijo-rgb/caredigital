import { useCallback, useEffect, useState, type FormEvent } from "react";
import { ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import type { Vendor } from "@/lib/marketplace";
import { btn, inputCls, Panel } from "./shared";

type Staff = { id: string; name: string; email: string; active: boolean; created_at: string };

/** Funcionários da loja: acesso só a pedidos e chat, sem editar cadastros, apagar ou mexer em senhas. */
export function SellerStaff({ vendor }: { vendor: Vendor }) {
  const [rows, setRows] = useState<Staff[]>([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { confirm } = useDialog();
  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("care_store_staff")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at");
    setRows(data ?? []);
  }, [vendor.id]);
  useEffect(() => {
    void load();
  }, [load]);

  async function add(e: FormEvent) {
    e.preventDefault();
    if (name.trim().length < 2 || !/^\S+@\S+\.\S+$/.test(email.trim()))
      return setMsg({ ok: false, text: "Informe o nome e um e-mail válido." });
    const { error } = await (supabase as any).rpc("care_store_add_staff", {
      p_vendor: vendor.id,
      p_email: email.trim(),
      p_name: name.trim(),
    });
    if (error)
      return setMsg({
        ok: false,
        text: /not found/i.test(error.message)
          ? "Esse e-mail ainda não tem conta na NextVita. Peça para a pessoa criar uma conta grátis e tente de novo."
          : "Não foi possível cadastrar. Confira os dados.",
      });
    setMsg({ ok: true, text: "Funcionário cadastrado. No próximo acesso ele já vê a loja." });
    setName("");
    setEmail("");
    void load();
  }
  async function toggle(s: Staff) {
    await (supabase as any).from("care_store_staff").update({ active: !s.active }).eq("id", s.id);
    void load();
  }
  async function remove(s: Staff) {
    if (
      !(await confirm(`Remover ${s.name}?`, "Ele perde o acesso à loja na hora.", true, "Remover"))
    )
      return;
    await (supabase as any).from("care_store_staff").delete().eq("id", s.id);
    void load();
  }
  return (
    <div className="grid gap-4">
      <p className="flex items-start gap-2 border border-border bg-card p-3.5 text-sm">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />O funcionário entra com a
        própria conta e usa só Pedidos e Mensagens: atende o chat e avança as vendas. Ele não vê o
        caixa, não edita nem apaga clientes, produtos ou conversas e não altera senhas.
      </p>
      <Panel title="Novo funcionário">
        <form
          onSubmit={(e) => void add(e)}
          className="grid gap-3 p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        >
          <label className="text-[13px] font-semibold">
            Nome
            <input
              className={inputCls}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="text-[13px] font-semibold">
            E-mail da conta NextVita
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <button type="submit" className={btn.primary}>
            <UserPlus size={15} /> Cadastrar
          </button>
        </form>
        {msg && (
          <p
            role="status"
            className={`px-4 pb-3 text-sm ${msg.ok ? "text-emerald-600" : "text-rose-600"}`}
          >
            {msg.text}
          </p>
        )}
      </Panel>
      <Panel title={`Equipe · ${rows.length}`}>
        <ul className="divide-y divide-border text-[13px]">
          {rows.map((s) => (
            <li key={s.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="grid size-8 place-items-center bg-muted text-xs font-bold">
                {s.name.slice(0, 1).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <strong className="block truncate">{s.name}</strong>
                <span className="text-xs text-muted-foreground">{s.email}</span>
              </span>
              <button
                type="button"
                onClick={() => void toggle(s)}
                aria-pressed={s.active}
                className={`h-7 px-2.5 text-xs font-semibold ${s.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
              >
                {s.active ? "Ativo" : "Suspenso"}
              </button>
              <button
                type="button"
                aria-label={`Remover ${s.name}`}
                onClick={() => void remove(s)}
                className={btn.icon}
              >
                <Trash2 size={15} />
              </button>
            </li>
          ))}
          {!rows.length && (
            <li className="px-4 py-10 text-center text-muted-foreground">
              Nenhum funcionário cadastrado.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
