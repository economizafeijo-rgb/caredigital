import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  AtSign,
  CalendarDays,
  CheckCircle2,
  ExternalLink,
  ImagePlus,
  KeyRound,
  LayoutDashboard,
  Mail,
  MapPin,
  Package,
  Phone,
  ShieldAlert,
  Store,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useDialog } from "@/lib/dialog";
import {
  COUNTED,
  money,
  PLANS,
  pct,
  segmentLabel,
  type Vendor,
  type VendorOrder,
  type VendorProduct,
} from "@/lib/marketplace";
import { StatusBadge } from "./seller/shared";
import { disputeReasonLabel, disputeStatusLabel, type Dispute } from "@/lib/disputes";
import { uploadStoreImage } from "./seller/SellerProducts";

type Owner = {
  user_id?: string;
  email?: string;
  name?: string | null;
  phone?: string | null;
  confirmed?: boolean;
  created_at?: string;
  last_sign_in_at?: string | null;
  is_admin?: boolean;
};
const dayKey = (d: Date | string) =>
  new Date(d).toLocaleDateString("sv-SE", { timeZone: "America/Rio_Branco" });
const fmt = (iso?: string | null) =>
  iso
    ? new Date(iso).toLocaleString("pt-BR", {
        timeZone: "America/Rio_Branco",
        dateStyle: "short",
        timeStyle: "short",
      })
    : "—";
const field =
  "mt-1 block h-10 w-full rounded-lg border border-border bg-surface px-2.5 text-sm font-normal";

/** Ficha completa da loja para o administrador: dono e acesso, cadastro, faturamento e pedidos. */
export function AdminVendorDetail({ vendor, onClose }: { vendor: Vendor; onClose: () => void }) {
  const { confirm } = useDialog();
  const [owner, setOwner] = useState<Owner | null>(null);
  const [orders, setOrders] = useState<VendorOrder[]>([]);
  const [products, setProducts] = useState<VendorProduct[]>([]);
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pw, setPw] = useState("");
  const [nEmail, setNEmail] = useState("");
  const [nName, setNName] = useState("");
  const [nPw, setNPw] = useState("");
  const [busy, setBusy] = useState("");

  const load = useCallback(async () => {
    const db = supabase as any;
    const [o, ord, p] = await Promise.all([
      db.rpc("care_store_admin_vendor_owner", { p_vendor: vendor.id }),
      db
        .from("care_store_orders")
        .select("*")
        .eq("vendor_id", vendor.id)
        .order("created_at", { ascending: false })
        .limit(1000),
      db.from("care_store_products").select("*").eq("vendor_id", vendor.id),
    ]);
    setOwner((o.data as Owner) ?? {});
    setOrders(ord.data ?? []);
    setProducts(p.data ?? []);
    const { data: ds } = await db
      .from("care_store_disputes")
      .select("*")
      .eq("vendor_id", vendor.id)
      .order("created_at", { ascending: false })
      .limit(200);
    setDisputes(ds ?? []);
  }, [vendor.id]);
  useEffect(() => {
    void load();
  }, [load]);
  useEffect(() => {
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", k);
    return () => window.removeEventListener("keydown", k);
  }, [onClose]);

  const s = useMemo(() => {
    const today = dayKey(new Date());
    const month = today.slice(0, 7);
    const paid = orders.filter((o) => COUNTED.includes(o.status));
    const when = (o: VendorOrder) => dayKey(o.paid_at ?? o.created_at);
    const sum = (list: VendorOrder[]) => list.reduce((a, o) => a + o.total_cents, 0);
    const day = paid.filter((o) => when(o) === today);
    const mon = paid.filter((o) => when(o).startsWith(month));
    const week = paid.filter(
      (o) => Date.now() - new Date(o.paid_at ?? o.created_at).getTime() < 7 * 86_400_000,
    );
    const days = Array.from({ length: 14 }, (_, k) =>
      dayKey(new Date(Date.now() - (13 - k) * 86_400_000)),
    );
    const series = days.map((d) => ({ d, v: sum(paid.filter((o) => when(o) === d)) }));
    const top = new Map<string, { name: string; qty: number; total: number }>();
    paid.forEach((o) =>
      o.items.forEach((i) => {
        const t = top.get(i.name) ?? { name: i.name, qty: 0, total: 0 };
        t.qty += i.qty;
        t.total += i.qty * i.price_cents;
        top.set(i.name, t);
      }),
    );
    return {
      day: sum(day),
      dayN: day.length,
      week: sum(week),
      month: sum(mon),
      monthN: mon.length,
      total: sum(paid),
      count: paid.length,
      commissionMonth: mon.reduce((a, o) => a + o.commission_cents, 0),
      commission: paid.reduce((a, o) => a + o.commission_cents, 0),
      avg: paid.length ? Math.round(sum(paid) / paid.length) : 0,
      open: orders.filter((o) =>
        ["aguardando_pagamento", "pago", "separando", "pronto", "enviado"].includes(o.status),
      ).length,
      cancelled: orders.filter((o) => o.status === "cancelado").length,
      series,
      top: [...top.values()].sort((a, b) => b.total - a.total).slice(0, 5),
      low: products.filter((p) => p.active && p.stock <= (p.min_stock ?? 3)).length,
      stockValue: products.reduce((a, p) => a + p.stock * p.price_cents, 0),
    };
  }, [orders, products]);
  const max = Math.max(1, ...s.series.map((x) => x.v));
  const isAdminOwner = owner?.is_admin;

  async function run(
    key: string,
    fn: () => Promise<{ error: unknown }>,
    ok: string,
    fail: (m: string) => string,
  ) {
    setBusy(key);
    setMsg(null);
    const { error } = await fn();
    setBusy("");
    if (error) {
      setMsg({ ok: false, text: fail(String((error as { message?: string }).message ?? "")) });
      return false;
    }
    setMsg({ ok: true, text: ok });
    void load();
    return true;
  }
  const [idf, setIdf] = useState({
    name: "",
    slug: "",
    accent: "#0e7a5f",
    description: "",
    city: "",
    phone: "",
    opening: "",
  });
  useEffect(() => {
    setIdf({
      name: vendor.name,
      slug: vendor.slug,
      accent: vendor.accent_hex ?? "#0e7a5f",
      description: vendor.description ?? "",
      city: vendor.city ?? "",
      phone: vendor.phone ?? "",
      opening: vendor.opening_hours ?? "",
    });
  }, [
    vendor.id,
    vendor.name,
    vendor.slug,
    vendor.accent_hex,
    vendor.description,
    vendor.city,
    vendor.phone,
    vendor.opening_hours,
  ]);
  const identityFail = (m: string) =>
    m.includes("já está em uso")
      ? "Este endereço já está em uso por outra loja."
      : m.includes("Nome")
        ? "Nome deve ter de 2 a 80 caracteres."
        : m.includes("Endereço inválido")
          ? "Endereço inválido: use só letras minúsculas, números e hífen."
          : m.includes("Cor")
            ? "Escolha uma cor válida."
            : "Não foi possível salvar a identidade da loja.";
  const saveIdentity = (e: FormEvent) => {
    e.preventDefault();
    void run(
      "identity",
      () =>
        (supabase as any).rpc("care_store_admin_update_identity", {
          p_vendor: vendor.id,
          p_name: idf.name,
          p_slug: idf.slug,
          p_accent_hex: idf.accent,
          p_description: idf.description,
          p_city: idf.city,
          p_phone: idf.phone,
          p_opening_hours: idf.opening,
          p_logo_url: null,
          p_banner_url: null,
        }),
      "Identidade da loja salva.",
      identityFail,
    );
  };
  async function uploadBanner(file?: File) {
    if (!file) return;
    try {
      const link = await uploadStoreImage(vendor.id, file, "banner");
      await run(
        "identity",
        () =>
          (supabase as any).rpc("care_store_admin_update_identity", {
            p_vendor: vendor.id,
            p_name: idf.name,
            p_slug: idf.slug,
            p_accent_hex: idf.accent,
            p_description: idf.description,
            p_city: idf.city,
            p_phone: idf.phone,
            p_opening_hours: idf.opening,
            p_logo_url: null,
            p_banner_url: link,
          }),
        "Banner atualizado.",
        identityFail,
      );
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }
  const setLogo = (url: string | null) =>
    run(
      "logo",
      () =>
        (supabase as any).rpc("care_store_admin_set_logo", {
          p_vendor: vendor.id,
          p_logo_url: url,
        }),
      url ? "Logomarca atualizada." : "Logomarca removida.",
      () => "Não foi possível salvar a logomarca.",
    );
  async function uploadLogo(file?: File) {
    if (!file) return;
    try {
      const link = await uploadStoreImage(vendor.id, file, "logo");
      await setLogo(link);
    } catch (e) {
      setMsg({ ok: false, text: (e as Error).message });
    }
  }
  const confirmEmail = () =>
    run(
      "confirm",
      () => (supabase as any).rpc("care_store_admin_confirm_owner_email", { p_vendor: vendor.id }),
      "E-mail confirmado. O lojista já pode entrar.",
      () => "Não foi possível confirmar o e-mail.",
    );
  async function setPassword(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 6)
      return setMsg({ ok: false, text: "A senha precisa ter pelo menos 6 caracteres." });
    if (
      !(await confirm(
        "Definir nova senha?",
        `A senha de ${owner?.email} será trocada agora. O lojista passa a entrar com a nova senha.`,
        false,
        "Trocar senha",
      ))
    )
      return;
    if (
      await run(
        "pw",
        () =>
          (supabase as any).rpc("care_store_admin_set_owner_password", {
            p_vendor: vendor.id,
            p_password: pw,
          }),
        "Senha alterada. Informe a nova senha ao lojista.",
        () => "Não foi possível alterar a senha.",
      )
    )
      setPw("");
  }
  async function createOwner(e: FormEvent) {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(nEmail.trim()))
      return setMsg({ ok: false, text: "Informe um e-mail válido." });
    if (nPw.length < 6)
      return setMsg({ ok: false, text: "A senha precisa ter pelo menos 6 caracteres." });
    if (
      !(await confirm(
        `Criar o login de ${vendor.name}?`,
        `Uma conta ${nEmail.trim()} será criada já confirmada, e a loja passa a ser gerenciada por ela.`,
        false,
        "Criar login",
      ))
    )
      return;
    if (
      await run(
        "create",
        () =>
          (supabase as any).rpc("care_store_admin_create_owner", {
            p_vendor: vendor.id,
            p_email: nEmail.trim(),
            p_password: nPw,
            p_name: nName.trim() || null,
          }),
        "Login criado. O lojista já pode entrar com esse e-mail e senha.",
        (m) =>
          m.includes("already")
            ? "Esse e-mail já tem conta. Use “Transferir loja” na lista de lojas de teste."
            : "Não foi possível criar o login.",
      )
    ) {
      setNEmail("");
      setNPw("");
      setNName("");
    }
  }

  const accent = vendor.accent_hex ?? "#0e7a5f";
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Detalhes de ${vendor.name}`}
      className="fixed inset-0 z-[90] flex justify-end bg-black/50 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="nv-fade-in flex h-full w-full max-w-3xl flex-col overflow-y-auto bg-background shadow-2xl">
        <header
          className="nv-dark sticky top-0 z-10 flex items-center gap-3 px-5 py-4 text-white"
          style={{
            background: `linear-gradient(120deg, color-mix(in srgb, ${accent} 70%, #020617), #0b1220)`,
          }}
        >
          <span
            className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-white text-sm font-black"
            style={{ color: accent }}
          >
            {vendor.logo_url ? (
              <img src={vendor.logo_url} alt="" className="size-full object-cover" />
            ) : (
              vendor.name
                .split(/\s+/)
                .map((w) => w[0])
                .slice(0, 2)
                .join("")
            )}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-white/65">
              {segmentLabel(vendor.segment)} · {vendor.city}
              {vendor.is_demo ? " · loja de teste" : ""}
            </p>
            <h2 className="truncate text-lg font-extrabold">{vendor.name}</h2>
          </div>
          <a
            href={`/lojista?loja=${vendor.id}`}
            className="hidden h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-xs font-bold text-slate-950 sm:inline-flex"
          >
            <LayoutDashboard size={14} /> Abrir painel da loja
          </a>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="grid size-9 place-items-center rounded-lg hover:bg-white/15"
          >
            <X size={18} />
          </button>
        </header>

        <div className="grid gap-4 p-5">
          {msg && (
            <p
              role={msg.ok ? "status" : "alert"}
              className={`rounded-lg px-3 py-2 text-sm ${msg.ok ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300" : "bg-rose-500/10 text-rose-700 dark:text-rose-300"}`}
            >
              {msg.text}
            </p>
          )}

          <form
            aria-label="Identidade da loja"
            onSubmit={saveIdentity}
            className="grid gap-3 rounded-2xl border border-border bg-card p-4"
          >
            <div>
              <h3 className="text-sm font-bold">Identidade da loja</h3>
              <p className="text-xs text-muted-foreground">
                Só a administração altera nome, endereço, cor e informações da loja.
              </p>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="text-[13px] font-semibold">
                Nome da loja
                <input
                  className={field}
                  value={idf.name}
                  onChange={(e) => setIdf({ ...idf, name: e.target.value })}
                  maxLength={80}
                  required
                />
              </label>
              <label className="text-[13px] font-semibold">
                Endereço da loja (link)
                <input
                  className={`${field} font-mono`}
                  value={idf.slug}
                  onChange={(e) =>
                    setIdf({ ...idf, slug: e.target.value.toLowerCase().replace(/\s+/g, "-") })
                  }
                  maxLength={60}
                  required
                />
                <span className="mt-1 block text-[11px] font-normal text-muted-foreground">
                  Links antigos da loja deixam de funcionar ao trocar.
                </span>
              </label>
              <label className="text-[13px] font-semibold">
                Cor da loja
                <span className="mt-1 flex items-center gap-2">
                  <input
                    type="color"
                    aria-label="Escolher cor"
                    value={idf.accent}
                    onChange={(e) => setIdf({ ...idf, accent: e.target.value })}
                    className="h-10 w-12 cursor-pointer rounded-lg border border-border bg-surface p-1"
                  />
                  <input
                    className={`${field} mt-0 font-mono`}
                    value={idf.accent}
                    onChange={(e) => setIdf({ ...idf, accent: e.target.value })}
                    maxLength={7}
                  />
                </span>
              </label>
              <label className="text-[13px] font-semibold">
                Cidade
                <input
                  className={field}
                  value={idf.city}
                  onChange={(e) => setIdf({ ...idf, city: e.target.value })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                WhatsApp (com DDD)
                <input
                  className={field}
                  inputMode="tel"
                  value={idf.phone}
                  onChange={(e) => setIdf({ ...idf, phone: e.target.value })}
                />
              </label>
              <label className="text-[13px] font-semibold">
                Horário de atendimento
                <input
                  className={field}
                  value={idf.opening}
                  onChange={(e) => setIdf({ ...idf, opening: e.target.value })}
                  placeholder="Seg a sáb · 8h às 17h"
                />
              </label>
            </div>
            <label className="text-[13px] font-semibold">
              Descrição
              <textarea
                className="mt-1 block min-h-20 w-full rounded-lg border border-border bg-surface px-2.5 py-2 text-sm font-normal"
                value={idf.description}
                onChange={(e) => setIdf({ ...idf, description: e.target.value })}
                maxLength={500}
              />
            </label>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
                <ImagePlus size={14} /> {busy === "identity" ? "Enviando…" : "Trocar banner"}
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="sr-only"
                  disabled={busy === "identity"}
                  onChange={(e) => void uploadBanner(e.target.files?.[0])}
                />
              </label>
              <button
                type="submit"
                disabled={busy === "identity"}
                className="h-10 rounded-lg bg-primary px-4 text-sm font-bold text-primary-foreground hover:brightness-110 disabled:opacity-50"
              >
                {busy === "identity" ? "Salvando…" : "Salvar identidade"}
              </button>
            </div>
          </form>

          <section
            aria-label="Logomarca"
            className="flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-card p-4"
          >
            <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted text-sm font-black">
              {vendor.logo_url ? (
                <img src={vendor.logo_url} alt="Logo atual" className="size-full object-cover" />
              ) : (
                <ImagePlus size={20} className="text-muted-foreground" />
              )}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="text-sm font-bold">Logomarca da loja</h3>
              <p className="text-xs text-muted-foreground">
                Só a administração define a logo. PNG, JPG ou WEBP de até 2 MB.
              </p>
            </div>
            <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-semibold hover:bg-muted">
              <ImagePlus size={14} /> {vendor.logo_url ? "Trocar logo" : "Enviar logo"}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="sr-only"
                disabled={busy === "logo"}
                onChange={(e) => void uploadLogo(e.target.files?.[0])}
              />
            </label>
            {vendor.logo_url && (
              <button
                type="button"
                disabled={busy === "logo"}
                onClick={() => void setLogo(null)}
                className="h-9 rounded-lg px-3 text-xs font-semibold text-rose-600 hover:bg-rose-500/10 disabled:opacity-50"
              >
                Remover
              </button>
            )}
          </section>

          <section aria-label="Disputas" className="rounded-2xl border border-border bg-card p-4">
            <h3 className="text-sm font-bold">
              Disputas · {disputes.filter((d) => d.status === "aberta").length} aberta(s)
            </h3>
            <p className="text-xs text-muted-foreground">
              Somente leitura. O dono da loja é quem responde e resolve.
            </p>
            {!disputes.length ? (
              <p className="mt-3 text-sm text-muted-foreground">Nenhuma disputa.</p>
            ) : (
              <ul className="mt-3 divide-y divide-border">
                {disputes.map((d) => (
                  <li
                    key={d.id}
                    className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm"
                  >
                    <span>{disputeReasonLabel(d.reason)}</span>
                    <span className="text-xs text-muted-foreground">
                      {disputeStatusLabel(d.status)} · {fmt(d.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section aria-label="Faturamento" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {[
              ["Hoje", money(s.day), `${s.dayN} pedido(s)`],
              ["Últimos 7 dias", money(s.week), ""],
              ["Este mês", money(s.month), `${s.monthN} pedido(s)`],
              ["Total vendido", money(s.total), `${s.count} pedidos pagos`],
              ["Ticket médio", money(s.avg), ""],
              ["Contribuição no mês", money(s.commissionMonth), `total ${money(s.commission)}`],
              ["Pedidos em aberto", String(s.open), `${s.cancelled} cancelado(s)`],
              ["Estoque", money(s.stockValue), `${products.length} produtos · ${s.low} baixo(s)`],
            ].map(([l, v, h]) => (
              <div key={l} className="rounded-xl border border-border bg-card p-3">
                <p className="text-[11px] text-muted-foreground">{l}</p>
                <p className="text-base font-extrabold tabular-nums">{v}</p>
                {h && <p className="text-[10.5px] text-muted-foreground">{h}</p>}
              </div>
            ))}
          </section>

          <section
            className="rounded-2xl border border-border bg-card p-4"
            aria-label="Vendas por dia"
          >
            <h3 className="text-sm font-bold">Vendas por dia · 14 dias</h3>
            <div className="mt-3 flex h-28 items-end gap-1">
              {s.series.map((x) => (
                <div
                  key={x.d}
                  className="group relative flex h-full flex-1 flex-col justify-end"
                  title={`${x.d.split("-").reverse().join("/")}: ${money(x.v)}`}
                >
                  <span
                    className="block rounded-t-[3px]"
                    style={{
                      height: `${Math.max(2, (x.v / max) * 100)}%`,
                      background: x.v
                        ? accent
                        : "color-mix(in srgb, currentColor 10%, transparent)",
                    }}
                  />
                  <span className="mt-1 text-center text-[9px] tabular-nums text-muted-foreground">
                    {x.d.slice(8)}
                  </span>
                </div>
              ))}
            </div>
          </section>

          <div className="grid gap-4 md:grid-cols-2">
            <section
              className="rounded-2xl border border-border bg-card p-4"
              aria-label="Dono e acesso"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <UserRound size={15} /> Dono e acesso
              </h3>
              {owner === null ? (
                <p className="mt-3 text-xs text-muted-foreground">Carregando…</p>
              ) : (
                <dl className="mt-3 grid gap-2 text-[13px]">
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Nome</dt>
                    <UserRound size={14} className="text-muted-foreground" />
                    <dd>
                      {isAdminOwner ? "Administrador (loja sem dono próprio)" : owner.name || "—"}
                    </dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">E-mail</dt>
                    <Mail size={14} className="text-muted-foreground" />
                    <dd className="truncate">{owner.email ?? "—"}</dd>
                    {owner.email && (
                      <span
                        className={`ml-auto shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold ${owner.confirmed ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300" : "bg-amber-500/15 text-amber-700 dark:text-amber-300"}`}
                      >
                        {owner.confirmed ? "confirmado" : "não confirmado"}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Telefone</dt>
                    <Phone size={14} className="text-muted-foreground" />
                    <dd>{owner.phone || vendor.phone}</dd>
                  </div>
                  <div className="flex items-center gap-2">
                    <dt className="sr-only">Conta criada</dt>
                    <CalendarDays size={14} className="text-muted-foreground" />
                    <dd>
                      Conta criada {fmt(owner.created_at)} · último acesso{" "}
                      {fmt(owner.last_sign_in_at)}
                    </dd>
                  </div>
                </dl>
              )}
              {owner && !isAdminOwner && owner.email && (
                <div className="mt-4 grid gap-3 border-t border-border pt-3">
                  {!owner.confirmed && (
                    <button
                      type="button"
                      disabled={busy === "confirm"}
                      onClick={() => void confirmEmail()}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-emerald-600 text-xs font-bold text-white disabled:opacity-50"
                    >
                      <CheckCircle2 size={14} /> Confirmar e-mail agora
                    </button>
                  )}
                  <form onSubmit={(e) => void setPassword(e)} className="grid gap-1.5">
                    <label className="text-xs font-semibold">
                      Nova senha de acesso
                      <input
                        type="text"
                        autoComplete="new-password"
                        value={pw}
                        onChange={(e) => setPw(e.target.value)}
                        className={field}
                        placeholder="Mínimo 6 caracteres"
                      />
                    </label>
                    <button
                      type="submit"
                      disabled={busy === "pw"}
                      className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-border bg-background text-xs font-bold disabled:opacity-50"
                    >
                      <KeyRound size={14} /> Definir senha
                    </button>
                  </form>
                </div>
              )}
              {owner && isAdminOwner && (
                <form
                  onSubmit={(e) => void createOwner(e)}
                  className="mt-4 grid gap-2 border-t border-border pt-3"
                >
                  <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                    <ShieldAlert size={14} className="mt-0.5 shrink-0" /> Esta loja ainda está na
                    sua conta. Crie o login do lojista; o e-mail já sai confirmado.
                  </p>
                  <label className="text-xs font-semibold">
                    Nome do responsável
                    <input
                      value={nName}
                      onChange={(e) => setNName(e.target.value)}
                      className={field}
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    E-mail de acesso
                    <input
                      type="email"
                      value={nEmail}
                      onChange={(e) => setNEmail(e.target.value)}
                      className={field}
                      placeholder={
                        vendor.is_demo ? `${vendor.slug}@teste.nextvita.life` : "lojista@email.com"
                      }
                    />
                  </label>
                  <label className="text-xs font-semibold">
                    Senha
                    <input
                      type="text"
                      autoComplete="new-password"
                      value={nPw}
                      onChange={(e) => setNPw(e.target.value)}
                      className={field}
                      placeholder="Mínimo 6 caracteres"
                    />
                  </label>
                  <button
                    type="submit"
                    disabled={busy === "create"}
                    className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg bg-primary text-xs font-bold text-primary-foreground disabled:opacity-50"
                  >
                    <UserPlus size={14} /> Criar login da loja
                  </button>
                </form>
              )}
            </section>

            <section
              className="rounded-2xl border border-border bg-card p-4"
              aria-label="Cadastro da loja"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Store size={15} /> Cadastro da loja
              </h3>
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1.5 text-[13px]">
                <dt className="text-muted-foreground">Situação</dt>
                <dd className="capitalize">
                  {vendor.status}
                  {vendor.verified ? " · verificada" : ""}
                </dd>
                <dt className="text-muted-foreground">Plano</dt>
                <dd>
                  {PLANS[vendor.plan].label} · {pct(vendor.commission_bps)} +{" "}
                  {money(vendor.monthly_fee_cents)}/mês
                </dd>
                <dt className="text-muted-foreground">Endereço</dt>
                <dd className="flex items-start gap-1">
                  <MapPin size={13} className="mt-0.5 shrink-0" />
                  {vendor.address ?? "—"} · {vendor.city}
                </dd>
                <dt className="text-muted-foreground">WhatsApp</dt>
                <dd>
                  <a
                    className="text-primary hover:underline"
                    href={`https://wa.me/55${vendor.phone.replace(/\D/g, "").replace(/^55/, "")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {vendor.phone}
                  </a>
                </dd>
                <dt className="text-muted-foreground">Horário</dt>
                <dd>{vendor.opening_hours ?? "—"}</dd>
                <dt className="text-muted-foreground">Recebimento</dt>
                <dd>
                  {[
                    vendor.offers_pickup && "retirada",
                    vendor.offers_delivery && `entrega (${money(vendor.delivery_fee_cents)})`,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </dd>
                <dt className="text-muted-foreground">Endereço web</dt>
                <dd className="flex items-center gap-1">
                  <AtSign size={13} />
                  /loja?loja={vendor.slug}
                </dd>
                <dt className="text-muted-foreground">Cadastrada em</dt>
                <dd>{fmt(vendor.created_at)}</dd>
              </dl>
              <div className="mt-3 flex flex-wrap gap-2">
                <a
                  href={`/lojista?loja=${vendor.id}`}
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-bold text-primary-foreground"
                >
                  <LayoutDashboard size={14} /> Painel da loja
                </a>
                <a
                  href={`/loja?loja=${vendor.slug}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-xs font-bold"
                >
                  <ExternalLink size={14} /> Página pública
                </a>
              </div>
            </section>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <section
              className="rounded-2xl border border-border bg-card p-4"
              aria-label="Mais vendidos"
            >
              <h3 className="flex items-center gap-2 text-sm font-bold">
                <Package size={15} /> Mais vendidos
              </h3>
              <ul className="mt-2 divide-y divide-border text-[13px]">
                {s.top.map((t) => (
                  <li key={t.name} className="flex justify-between gap-2 py-1.5">
                    <span className="truncate">
                      {t.qty}× {t.name}
                    </span>
                    <strong className="tabular-nums">{money(t.total)}</strong>
                  </li>
                ))}
                {!s.top.length && (
                  <li className="py-3 text-xs text-muted-foreground">Sem vendas pagas ainda.</li>
                )}
              </ul>
            </section>
            <section
              className="rounded-2xl border border-border bg-card p-4"
              aria-label="Últimos pedidos"
            >
              <h3 className="text-sm font-bold">Últimos pedidos</h3>
              <ul className="mt-2 divide-y divide-border text-[13px]">
                {orders.slice(0, 6).map((o) => (
                  <li key={o.id} className="flex items-center gap-2 py-1.5">
                    <span className="w-10 font-mono text-xs text-muted-foreground">
                      #{o.order_number}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{o.customer_name}</span>
                    <StatusBadge status={o.status} />
                    <strong className="w-20 text-right tabular-nums">{money(o.total_cents)}</strong>
                  </li>
                ))}
                {!orders.length && (
                  <li className="py-3 text-xs text-muted-foreground">Nenhum pedido.</li>
                )}
              </ul>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
