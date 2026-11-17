import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, BadgeCheck, ChevronDown, HeartPulse, Mail, MessageCircle, Percent, Smartphone, Star, Store, Truck, Users, Zap } from "lucide-react";
import { SEGMENTS } from "@/lib/marketplace";
import { products, money, STORE_WHATSAPP } from "@/lib/store";
import { NiceSelect } from "./NiceSelect";
import { ShareButton } from "./ShareButton";

const EMAIL = "aplicativosfj@gmail.com";
const field = "mt-1 block h-12 w-full rounded-xl border border-border bg-surface px-3 text-sm";

const pillars = [
  { icon: HeartPulse, title: "Um app de saúde de verdade", text: "Hidratação, medicação, dieta, peso, sono e treino num só lugar. Quem usa a NextVita está cuidando do corpo todos os dias." },
  { icon: Store, title: "Uma loja dentro do app", text: "Quando o cliente pensa em suplemento, vitamina ou roupa de treino, a sua loja está a um toque de distância." },
  { icon: Users, title: "Público que já quer comprar", text: "Gente que treina, se cuida e procura produtos de saúde e bem-estar. Você vende para quem tem interesse real." },
] as const;
const perks = [
  { icon: Zap, t: "Cadastro grátis", d: "Abrir a loja não custa nada. Plano inicial sem mensalidade." },
  { icon: Smartphone, t: "Venda direto do celular", d: "Cadastre produtos, preços e estoque pelo telefone, sem site próprio." },
  { icon: Truck, t: "Entrega ou retirada", d: "Você escolhe como o cliente recebe, com frete e área de entrega." },
  { icon: Star, t: "Selo e avaliações", d: "Sua loja ganha selo, página própria e notas do público." },
  { icon: Percent, t: "Pague só quando vender", d: "Comissão sobre as vendas. Sem venda, sem comissão no plano gratuito." },
  { icon: BadgeCheck, t: "Divulgação no app", d: "Destaque nos banners e na vitrine da página inicial." },
] as const;
const faq = [
  ["Preciso pagar para cadastrar?", "Não. O cadastro é gratuito e o plano inicial não tem mensalidade. Você só paga a comissão quando vender."],
  ["Preciso ter CNPJ ou site?", "Não é preciso ter site. Comerciantes, lojas e autônomos podem começar pelo celular; conversamos sobre a documentação quando você falar com a equipe."],
  ["Posso vender produtos feitos em casa?", "Sim. Artesanato saudável, doces fit, marmitas, produtos naturais e outros itens de bem-estar são bem-vindos. A equipe confere cada loja antes de liberar."],
  ["Como recebo o pagamento?", "Hoje o pagamento é combinado direto com o cliente (Pix, cartão ou dinheiro na retirada). Em breve, o pagamento online dividirá a comissão automaticamente."],
  ["Em quanto tempo a loja é liberada?", "A equipe analisa o cadastro e libera a vitrine em poucos dias úteis. Você acompanha tudo pelo painel do lojista."],
] as const;

/** Página de apresentação da plataforma para comerciantes: proposta, benefícios, enquete rápida de cadastro e contato. */
export function PartnersPage() {
  const [name, setName] = useState("");
  const [shop, setShop] = useState("");
  const [phone, setPhone] = useState("");
  const [segment, setSegment] = useState("suplementos");
  const [sells, setSells] = useState("");
  const [city, setCity] = useState("Feijó");
  const [error, setError] = useState("");
  const [open, setOpen] = useState<number | null>(0);

  const segmentLabel = SEGMENTS.find((s) => s.key === segment)?.label ?? segment;
  function buildMessage() {
    return [
      "Olá! Quero vender na NextVita (cadastro grátis).",
      `Nome: ${name.trim()}`,
      shop.trim() && `Loja/negócio: ${shop.trim()}`,
      `Segmento: ${segmentLabel}`,
      sells.trim() && `Vendo: ${sells.trim()}`,
      `Cidade: ${city.trim() || "Feijó"}`,
      `WhatsApp: ${phone.trim()}`,
    ].filter(Boolean).join("\n");
  }
  function valid() {
    if (name.trim().length < 2) { setError("Informe o seu nome."); return false; }
    if (phone.replace(/\D/g, "").length < 10) { setError("Informe o WhatsApp com DDD."); return false; }
    setError(""); return true;
  }
  function viaWhatsApp(e: FormEvent) {
    e.preventDefault();
    if (!valid()) return;
    window.open(`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(buildMessage())}`, "_blank", "noopener");
  }
  function viaEmail() {
    if (!valid()) return;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Quero vender na NextVita")}&body=${encodeURIComponent(buildMessage())}`;
  }
  const sample = products.filter((p) => ["whey-900", "conjunto-fem-2", "multivitaminico", "camiseta-oversized"].includes(p.id));

  return (
    <div className="grid gap-6">
      <section aria-labelledby="par-title" className="relative isolate overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-pop">
        <img src="/loja/mulher3.webp" alt="" aria-hidden="true" className="absolute inset-0 -z-20 size-full object-cover opacity-45" />
        <div aria-hidden="true" className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/85 to-emerald-900/40" />
        <div className="grid gap-6 p-6 sm:p-10 lg:grid-cols-[1.25fr_.75fr] lg:items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-300 px-4 py-1.5 text-xs font-extrabold uppercase tracking-widest text-slate-950">Cadastro grátis · lojistas e autônomos</span>
            <h1 id="par-title" className="mt-4 text-balance font-display text-4xl font-extrabold leading-[1.05] sm:text-5xl">Coloque o seu produto na vitrine de quem <span className="text-emerald-300">cuida da saúde.</span></h1>
            <p className="mt-3 max-w-2xl text-base text-slate-200 sm:text-lg">A NextVita é uma plataforma de bem-estar com loja virtual integrada. Lojas, comerciantes e quem produz em casa podem vender aqui, sem custo para começar.</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <a href="#enquete" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-300 to-teal-200 px-8 text-lg font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5 active:scale-95">Quero vender · é grátis <ArrowRight size={19} /></a>
              <Link to="/lojista" className="inline-flex h-14 items-center rounded-2xl border border-white/30 px-6 text-sm font-bold backdrop-blur hover:bg-white/10">Já tenho conta de lojista</Link>
              <ShareButton variant="pill" title="Venda na NextVita" text="Cadastro grátis para quem quer vender produtos na NextVita, a plataforma de saúde com loja virtual." path="/parceiros" label="Divulgar para um amigo" className="[&>button]:h-14" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3" aria-hidden="true">
            {sample.map((p) => <div key={p.id} className="overflow-hidden rounded-2xl bg-white text-slate-900 shadow-xl"><img src={p.img} alt="" loading="lazy" className="aspect-square w-full object-cover" /><div className="p-2"><p className="truncate text-xs font-bold">{p.name}</p><p className="text-sm font-extrabold">{money(p.priceCents)}</p></div></div>)}
          </div>
        </div>
      </section>

      <section aria-label="A plataforma" className="grid gap-3 md:grid-cols-3">
        {pillars.map((p) => <article key={p.title} className="rounded-3xl border border-border bg-card p-5 shadow-card"><span className="grid size-12 place-items-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 text-white"><p.icon size={24} /></span><h2 className="mt-3 font-display text-xl font-extrabold">{p.title}</h2><p className="mt-1 text-sm text-muted-foreground">{p.text}</p></article>)}
      </section>

      <section aria-label="Vantagens" className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
        <h2 className="font-display text-2xl font-extrabold">Por que vender na NextVita</h2>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {perks.map((p) => <li key={p.t} className="flex gap-3 rounded-2xl bg-muted/50 p-4"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"><p.icon size={20} /></span><span><strong className="block text-sm">{p.t}</strong><span className="text-xs leading-snug text-muted-foreground">{p.d}</span></span></li>)}
        </ul>
      </section>

      <section id="enquete" aria-labelledby="enq-title" className="scroll-mt-20 rounded-3xl border-2 border-emerald-500/40 bg-gradient-to-b from-emerald-500/10 to-card p-5 shadow-card sm:p-7">
        <h2 id="enq-title" className="font-display text-2xl font-extrabold">Enquete rápida: 1 minuto e pronto</h2>
        <p className="text-sm text-muted-foreground">Responda e a equipe NextVita fala com você pelo WhatsApp para liberar a sua loja. Sem custo.</p>
        <form onSubmit={viaWhatsApp} className="mt-4 grid gap-3 sm:grid-cols-2" aria-label="Enquete para novos parceiros">
          <label className="text-sm font-semibold">Seu nome<input className={field} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} autoComplete="name" /></label>
          <label className="text-sm font-semibold">WhatsApp com DDD<input className={field} inputMode="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="(68) 90000-0000" /></label>
          <label className="text-sm font-semibold">Nome da loja ou negócio (opcional)<input className={field} value={shop} onChange={(e) => setShop(e.target.value)} maxLength={80} /></label>
          <div className="text-sm font-semibold">O que você vende?<NiceSelect className="mt-1 h-12" ariaLabel="Segmento" value={segment} onChange={setSegment} options={SEGMENTS.map((s) => ({ value: s.key, label: s.label, hint: s.hint }))} /></div>
          <label className="text-sm font-semibold sm:col-span-2">Conte rapidamente os produtos (opcional)<input className={field} value={sells} onChange={(e) => setSells(e.target.value)} maxLength={160} placeholder="Ex.: doces fit, marmitas, camisetas de treino" /></label>
          <label className="text-sm font-semibold sm:col-span-2">Cidade<input className={field} value={city} onChange={(e) => setCity(e.target.value)} maxLength={80} /></label>
          {error && <p role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2">{error}</p>}
          <button type="submit" className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 text-base font-extrabold text-white shadow-lg transition hover:brightness-110 active:scale-95"><MessageCircle size={20} /> Enviar pelo WhatsApp</button>
          <button type="button" onClick={viaEmail} className="inline-flex h-14 items-center justify-center gap-2 rounded-2xl border border-border bg-card text-base font-bold transition hover:bg-muted"><Mail size={20} /> Enviar por e-mail</button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">Prefere já abrir a loja? <Link to="/lojista" className="font-bold text-primary underline">Faça o cadastro completo</Link> e acompanhe tudo pelo seu painel.</p>
      </section>

      <section aria-label="Perguntas frequentes" className="rounded-3xl border border-border bg-card p-5 shadow-card sm:p-7">
        <h2 className="font-display text-2xl font-extrabold">Perguntas frequentes</h2>
        <div className="mt-3 grid gap-2">
          {faq.map(([q, a], i) => (
            <div key={q} className="rounded-2xl border border-border">
              <h3><button type="button" aria-expanded={open === i} onClick={() => setOpen(open === i ? null : i)} className="flex min-h-12 w-full items-center justify-between gap-3 px-4 text-left text-sm font-bold">{q}<ChevronDown size={18} className={`shrink-0 transition ${open === i ? "rotate-180" : ""}`} /></button></h3>
              {open === i && <p className="px-4 pb-4 text-sm text-muted-foreground">{a}</p>}
            </div>))}
        </div>
      </section>

      <section id="contato" aria-labelledby="contato-title" className="relative isolate overflow-hidden rounded-3xl bg-gradient-to-br from-[#022c22] to-[#0e6b5c] p-6 text-white shadow-pop sm:p-9">
        <h2 id="contato-title" className="font-display text-3xl font-extrabold">Fale com o desenvolvedor</h2>
        <p className="mt-1 max-w-xl text-sm text-white/85">Dúvidas sobre planos, produtos ou como começar? Chame e responderemos pessoalmente.</p>
        <div className="mt-5 flex flex-wrap gap-3">
          <a href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Quero vender meus produtos na NextVita. Pode me explicar como funciona?")}`} target="_blank" rel="noreferrer" className="inline-flex h-14 items-center gap-2 rounded-2xl bg-white px-7 text-base font-extrabold text-slate-950 shadow-lg transition hover:-translate-y-0.5"><MessageCircle size={20} className="text-emerald-600" /> WhatsApp</a>
          <a href={`mailto:${EMAIL}?subject=${encodeURIComponent("Quero vender na NextVita")}`} className="inline-flex h-14 items-center gap-2 rounded-2xl border border-white/40 bg-white/10 px-7 text-base font-bold backdrop-blur hover:bg-white/20"><Mail size={20} /> {EMAIL}</a>
        </div>
      </section>
    </div>
  );
}
