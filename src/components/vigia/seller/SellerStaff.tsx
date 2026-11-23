import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Eye, ShieldCheck, Trash2, UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import type { Vendor } from "@/lib/marketplace";
import { btn, inputCls, Panel } from "./shared";
import { SellerAttendants } from "./SellerAttendants";

type Role = "operador" | "visualizador";
type Staff = {
  id: string;
  name: string;
  email: string;
  active: boolean;
  role: Role | "atendente";
  created_at: string;
};

const ROLE_INFO: Record<Role, { label: string; hint: string }> = {
  operador: {
    label: "Operador",
    hint: "Atende o chat, avança pedidos e confere retiradas.",
  },
  visualizador: {
    label: "Somente ver",
    hint: "Acessa o painel para consultar. Não altera pedidos nem responde clientes.",
  },
};

/** Funcionários da loja e seus níveis de acesso. O banco aplica as permissões; a tela só reflete. */
export function SellerStaff({ vendor }: { vendor: Vendor }) {
  const [all, setAll] = useState<Staff[]>([]);
  const rows = all.filter((s) => s.role !== "atendente");
  const attendants = all.filter((s) => s.role === "atendente");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("operador");
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const { confirm } = useDialog();

  const load = useCallback(async () => {
    const { data } = await (supabase as any)
      .from("care_store_staff")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at");
    setAll(data ?? []);
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
    if (role !== "operador") {
      await (supabase as any)
        .from("care_store_staff")
        .update({ role })
        .eq("vendor_id", vendor.id)
        .eq("email", email.trim().toLowerCase());
    }
    setMsg({
      ok: true,
      text: `${name.trim()} cadastrado como ${ROLE_INFO[role].label.toLowerCase()}.`,
    });
    setName("");
    setEmail("");
    setRole("operador");
    void load();
  }

  async function changeRole(s: Staff, next: Role) {
    if (next === s.role) return;
    const { error } = await (supabase as any)
      .from("care_store_staff")
      .update({ role: next })
      .eq("id", s.id);
    if (error) setMsg({ ok: false, text: "Não foi possível alterar o nível de acesso." });
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
      <SellerAttendants vendor={vendor} rows={attendants} onChanged={() => void load()} />
      <p className="flex items-start gap-2 rounded-2xl border border-border bg-card p-4 text-sm">
        <ShieldCheck size={18} className="mt-0.5 shrink-0 text-primary" />
        <span>
          Cada funcionário entra com a própria conta NextVita. <strong>Operador</strong> atende o
          chat e avança pedidos. <strong>Somente ver</strong> consulta o painel sem alterar nada. Só
          você, como dono, gerencia cadastros, caixa e a equipe.
        </span>
      </p>

      <Panel title="Outros funcionários (conta NextVita própria)">
        <form
          onSubmit={(e) => void add(e)}
          className="grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-[1fr_1fr_16rem_auto] xl:items-end"
        >
          <label className="grid gap-1.5 text-[13px] font-semibold">
            Nome completo
            <input
              className={inputCls}
              value={name}
              maxLength={80}
              onChange={(e) => setName(e.target.value)}
            />
          </label>
          <label className="grid gap-1.5 text-[13px] font-semibold">
            E-mail da conta NextVita
            <input
              className={inputCls}
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>
          <fieldset className="grid gap-1.5">
            <legend className="text-[13px] font-semibold">Nível de acesso</legend>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  aria-pressed={role === r}
                  onClick={() => setRole(r)}
                  className={`h-10 rounded-xl border px-2 text-[12.5px] font-semibold transition ${role === r ? "border-transparent text-white" : "border-border bg-card text-muted-foreground hover:bg-muted"}`}
                  style={role === r ? { background: "var(--accent-store)" } : undefined}
                >
                  {ROLE_INFO[r].label}
                </button>
              ))}
            </div>
          </fieldset>
          <button type="submit" className={btn.primary}>
            <UserPlus size={15} /> Cadastrar
          </button>
        </form>
        <p className="px-4 pb-3 text-xs text-muted-foreground">{ROLE_INFO[role].hint}</p>
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
        <ul className="divide-y divide-border">
          {rows.map((s) => {
            const info = ROLE_INFO[s.role as Role] ?? ROLE_INFO.operador;
            return (
              <li
                key={s.id}
                className="grid gap-3 px-4 py-3 md:grid-cols-[1fr_auto] md:items-center"
              >
                <div className="flex min-w-0 items-center gap-3">
                  <span
                    className="grid size-10 shrink-0 place-items-center rounded-xl text-sm font-bold text-white"
                    style={{ background: "var(--accent-store)" }}
                  >
                    {s.name.slice(0, 1).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <strong className="block truncate text-sm">{s.name}</strong>
                    <span className="block truncate text-xs text-muted-foreground">{s.email}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <label className="sr-only" htmlFor={`role-${s.id}`}>
                    Nível de acesso de {s.name}
                  </label>
                  <select
                    id={`role-${s.id}`}
                    value={s.role}
                    onChange={(e) => void changeRole(s, e.target.value as Role)}
                    className={`${inputCls} h-9 w-auto py-1 text-xs`}
                  >
                    {(Object.keys(ROLE_INFO) as Role[]).map((r) => (
                      <option key={r} value={r}>
                        {ROLE_INFO[r].label}
                      </option>
                    ))}
                  </select>
                  <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                    {s.role === "visualizador" && <Eye size={12} />}
                    {info.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => void toggle(s)}
                    aria-pressed={s.active}
                    className={`h-8 rounded-lg px-2.5 text-xs font-semibold ${s.active ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-muted text-muted-foreground"}`}
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
                </div>
              </li>
            );
          })}
          {!rows.length && (
            <li className="px-4 py-12 text-center text-sm text-muted-foreground">
              Nenhum funcionário cadastrado. Cadastre quem vai operar ou só acompanhar o painel.
            </li>
          )}
        </ul>
      </Panel>
    </div>
  );
}
