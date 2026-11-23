import { useState, type FormEvent } from "react";
import { Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BadgeCheck,
  ChevronDown,
  HeartPulse,
  Mail,
  MessageCircle,
  Percent,
  Smartphone,
  Star,
  Store,
  Truck,
  Users,
  Zap,
} from "lucide-react";
import { SEGMENTS } from "@/lib/marketplace";
import { products, money, STORE_WHATSAPP } from "@/lib/store";
import { NiceSelect } from "./NiceSelect";
import { ShareButton } from "./ShareButton";

const EMAIL = "aplicativosfj@gmail.com";
const field =
  "mt-1 block h-11 w-full rounded-xl border border-border bg-surface px-3 text-sm font-normal transition-colors focus:border-primary/60";

const pillars = [
  {
    icon: HeartPulse,
    title: "Um app de saúde de verdade",
    text: "Hidratação, medicação, dieta, peso, sono e treino num só lugar. Quem usa a NextVita está cuidando do corpo todos os dias.",
  },
  {
    icon: Store,
    title: "Uma loja dentro do app",
    text: "Quando o cliente pensa em suplemento, vitamina ou roupa de treino, a sua loja está a um toque de distância.",
  },
  {
    icon: Users,
    title: "Público que já quer comprar",
    text: "Gente que treina, se cuida e procura produtos de saúde e bem-estar. Você vende para quem tem interesse real.",
  },
] as const;
const perks = [
  {
    icon: Zap,
    t: "Cadastro grátis",
    d: "Abrir a loja não custa nada. Plano inicial sem mensalidade.",
  },
  {
    icon: Smartphone,
    t: "Venda direto do celular",
    d: "Cadastre produtos, preços e estoque pelo telefone, sem site próprio.",
  },
  {
    icon: Truck,
    t: "Entrega ou retirada",
    d: "Você escolhe como o cliente recebe, com frete e área de entrega.",
  },
  {
    icon: Star,
    t: "Selo e avaliações",
    d: "Sua loja ganha selo, página própria e notas do público.",
  },
  {
    icon: Percent,
    t: "Pague só quando vender",
    d: "Comissão sobre as vendas. Sem venda, sem comissão no plano gratuito.",
  },
  {
    icon: BadgeCheck,
    t: "Divulgação no app",
    d: "Destaque nos banners e na vitrine da página inicial.",
  },
] as const;
const faq = [
  [
    "Preciso pagar para cadastrar?",
    "Não. O cadastro é gratuito e o plano inicial não tem mensalidade. Você só paga a comissão quando vender.",
  ],
  [
    "Preciso ter CNPJ ou site?",
    "Não é preciso ter site. Comerciantes, lojas e autônomos podem começar pelo celular; conversamos sobre a documentação quando você falar com a equipe.",
  ],
  [
    "Posso vender produtos feitos em casa?",
    "Sim. Artesanato saudável, doces fit, marmitas, produtos naturais e outros itens de bem-estar são bem-vindos. A equipe confere cada loja antes de liberar.",
  ],
  [
    "Como recebo o pagamento?",
    "Hoje o pagamento é combinado direto com o cliente (Pix, cartão ou dinheiro na retirada). Em breve, o pagamento online dividirá a comissão automaticamente.",
  ],
  [
    "Em quanto tempo a loja é liberada?",
    "A equipe analisa o cadastro e libera a vitrine em poucos dias úteis. Você acompanha tudo pelo painel do lojista.",
  ],
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
    ]
      .filter(Boolean)
      .join("\n");
  }
  function valid() {
    if (name.trim().length < 2) {
      setError("Informe o seu nome.");
      return false;
    }
    if (phone.replace(/\D/g, "").length < 10) {
      setError("Informe o WhatsApp com DDD.");
      return false;
    }
    setError("");
    return true;
  }
  function viaWhatsApp(e: FormEvent) {
    e.preventDefault();
    if (!valid()) return;
    window.open(
      `https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent(buildMessage())}`,
      "_blank",
      "noopener",
    );
  }
  function viaEmail() {
    if (!valid()) return;
    window.location.href = `mailto:${EMAIL}?subject=${encodeURIComponent("Quero vender na NextVita")}&body=${encodeURIComponent(buildMessage())}`;
  }
  const sample = products.filter((p) =>
    ["whey-900", "conjunto-fem-2", "multivitaminico"].includes(p.id),
  );
  const label = "block text-[13px] font-semibold";

  return (
    <div className="grid gap-5">
      {/* Capa: proposta à esquerda, prévia do painel do lojista à direita */}
      <section
        aria-labelledby="par-title"
        className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#05110f] text-white shadow-pop"
      >
        <img
          src="/loja/mulher3.webp"
          alt=""
          aria-hidden="true"
          className="absolute inset-0 -z-20 size-full object-cover object-[30%_25%] opacity-35"
        />
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-[linear-gradient(100deg,#05110f_0%,rgba(5,17,15,.92)_42%,rgba(5,17,15,.55)_100%)] max-lg:bg-[linear-gradient(180deg,rgba(5,17,15,.7)_0%,#05110f_70%)]"
        />
        <div className="grid items-center gap-8 p-6 sm:p-9 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)] lg:gap-10 lg:px-11 lg:py-10">
          <div className="min-w-0">
            <span className="nv-rise inline-flex items-center gap-2 rounded-full border border-emerald-300/30 bg-emerald-300/10 px-3 py-1 text-xs font-semibold text-emerald-200">
              <Store size={13} aria-hidden="true" /> Para lojas, comerciantes e autônomos
            </span>
            <h1
              id="par-title"
              style={{ animationDelay: "120ms" }}
              className="nv-rise mt-4 max-w-[18ch] text-balance font-display text-[2rem] font-extrabold leading-[1.06] tracking-tight sm:text-[2.6rem] lg:text-[2.9rem]"
            >
              Venda para quem já cuida da saúde todos os dias.
            </h1>
            <p
              style={{ animationDelay: "240ms" }}
              className="nv-rise mt-3 max-w-[54ch] text-[15px] leading-relaxed text-slate-300"
            >
              A NextVita é um app de bem-estar com loja integrada. Sua vitrine aparece para quem
              registra treinos, dieta e suplementos, e começar não custa nada.
            </p>
            <div
              style={{ animationDelay: "360ms" }}
              className="nv-rise mt-6 flex flex-wrap items-center gap-2.5"
            >
              <a
                href="#enquete"
                className="inline-flex h-12 items-center gap-2 rounded-xl bg-emerald-400 px-5 text-sm font-bold text-slate-950 shadow-[0_10px_30px_-10px_rgba(52,211,153,.7)] transition hover:bg-emerald-300 active:scale-[.98]"
              >
                Cadastrar minha loja <ArrowRight size={16} />
              </a>
              <Link
                to="/lojista"
                className="inline-flex h-12 items-center rounded-xl border border-white/20 bg-white/5 px-4 text-sm font-semibold backdrop-blur transition hover:bg-white/10"
              >
                Já sou lojista
              </Link>
              <ShareButton
                variant="pill"
                title="Venda na NextVita"
                text="Cadastro grátis para quem quer vender produtos na NextVita, a plataforma de saúde com loja virtual."
                path="/parceiros"
                label="Indicar"
                className="[&>button]:h-12"
              />
            </div>
            <dl
              style={{ animationDelay: "480ms" }}
              className="nv-rise mt-7 grid max-w-md grid-cols-3 divide-x divide-white/10 rounded-2xl border border-white/10 bg-white/[.04] backdrop-blur"
            >
              {[
                ["R$ 0", "para cadastrar"],
                ["R$ 0", "de mensalidade"],
                ["Poucos dias", "para liberar"],
              ].map(([v, l]) => (
                <div key={l} className="px-3 py-2.5">
                  <dt className="sr-only">{l}</dt>
                  <dd className="font-display text-base font-extrabold tabular-nums sm:text-lg">
                    {v}
                  </dd>
                  <dd className="text-[11px] text-white/55">{l}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Prévia ilustrativa do painel do lojista */}
          <div aria-hidden="true" className="relative mx-auto w-full max-w-[26rem]">
            <div
              className="nv-rise rounded-2xl border border-white/10 bg-[#0b1714]/90 p-4 shadow-2xl backdrop-blur"
              style={{ animationDelay: "300ms" }}
            >
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <span className="grid size-7 place-items-center rounded-lg bg-emerald-400/15 text-[11px] font-extrabold text-emerald-300">
                    SL
                  </span>{" "}
                  Sua Loja
                </span>
                <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/60">
                  Painel do lojista · exemplo
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  ["Visitas", "1.284"],
                  ["Pedidos", "37"],
                  ["Nota", "4,8"],
                ].map(([l, v]) => (
                  <div key={l} className="rounded-xl bg-white/[.05] px-2.5 py-2">
                    <p className="text-[10px] text-white/50">{l}</p>
                    <p className="font-display text-[15px] font-extrabold tabular-nums">{v}</p>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex h-16 items-end gap-1.5 rounded-xl bg-white/[.03] px-2.5 pb-2 pt-3">
                {[30, 42, 38, 55, 48, 66, 72, 61, 80, 92].map((h, i) => (
                  <span
                    key={i}
                    className="nv-bar flex-1 rounded-t-sm bg-emerald-400/70"
                    style={{ height: `${h}%`, animationDelay: `${400 + i * 70}ms` }}
                  />
                ))}
              </div>
              <ul className="mt-3 grid gap-1.5">
                {sample.map((p) => (
                  <li
                    key={p.id}
                    className="flex items-center gap-2.5 rounded-xl bg-white/[.04] p-1.5 pr-2.5"
                  >
                    <img
                      src={p.img}
                      alt=""
                      loading="lazy"
                      className="size-9 rounded-lg bg-white object-cover"
                    />
                    <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-white/85">
                      {p.name}
                    </span>
                    <strong className="text-[12px] tabular-nums">{money(p.priceCents)}</strong>
                  </li>
                ))}
              </ul>
            </div>
            <div className="nv-float absolute -bottom-4 -left-3 flex items-center gap-2 rounded-xl bg-white px-3 py-2 text-slate-900 shadow-xl sm:-left-6">
              <span className="grid size-7 place-items-center rounded-full bg-emerald-700 text-white">
                <BadgeCheck size={15} />
              </span>
              <span className="leading-tight">
                <strong className="block text-[12px]">Novo pedido</strong>
                <span className="text-[11px] text-slate-500">Whey Protein · Pix</span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Como funciona: sequência real em três passos */}
      <section
        aria-labelledby="steps-title"
        className="rounded-3xl border border-border bg-card p-5 sm:p-6"
      >
        <h2 id="steps-title" className="font-display text-lg font-extrabold">
          Como funciona
        </h2>
        <ol className="mt-4 grid gap-3 md:grid-cols-3">
          {[
            [
              Smartphone,
              "Faça o cadastro",
              "Responda a enquete abaixo ou abra a conta de lojista pelo celular.",
            ],
            [
              BadgeCheck,
              "A equipe libera",
              "Conferimos a loja e publicamos sua vitrine em poucos dias úteis.",
            ],
            [Store, "Comece a vender", "Seus produtos aparecem na loja e nos destaques do app."],
          ].map(([I, t, d], i) => {
            const Icon = I as typeof Store;
            return (
              <li
                key={t as string}
                className="relative flex gap-3 rounded-2xl border border-border bg-background/50 p-4"
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <Icon size={19} />
                </span>
                <span>
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Passo {i + 1}
                  </span>
                  <strong className="block text-sm">{t as string}</strong>
                  <span className="mt-0.5 block text-[13px] leading-snug text-muted-foreground">
                    {d as string}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      {/* Público e vantagens */}
      <section
        aria-labelledby="why-title"
        className="grid gap-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]"
      >
        <div className="grid gap-3">
          <h2 id="why-title" className="sr-only">
            Por que vender na NextVita
          </h2>
          {pillars.map((p, i) => (
            <article
              key={p.title}
              className="relative isolate flex min-h-[7.5rem] items-end overflow-hidden rounded-2xl p-4 text-white"
            >
              <img
                src={
                  [
                    "/images/hero-metricas.webp",
                    "/loja/gym2.webp",
                    "/images/caredigital-esporte.webp",
                  ][i]
                }
                alt=""
                aria-hidden="true"
                loading="lazy"
                className="absolute inset-0 -z-20 size-full object-cover"
              />
              <div
                aria-hidden="true"
                className="absolute inset-0 -z-10 bg-gradient-to-r from-black/85 via-black/60 to-black/20"
              />
              <div className="max-w-[40ch]">
                <h3 className="flex items-center gap-2 text-[15px] font-bold">
                  <p.icon size={16} className="text-emerald-300" /> {p.title}
                </h3>
                <p className="mt-1 text-[13px] leading-snug text-white/80">{p.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
          <h2 className="font-display text-lg font-extrabold">Tudo o que a sua loja ganha</h2>
          <ul className="mt-4 grid gap-x-5 gap-y-4 sm:grid-cols-2">
            {perks.map((p) => (
              <li key={p.t} className="flex gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                  <p.icon size={17} />
                </span>
                <span>
                  <strong className="block text-sm">{p.t}</strong>
                  <span className="text-[13px] leading-snug text-muted-foreground">{p.d}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Cadastro rápido */}
      <section
        id="enquete"
        aria-labelledby="enq-title"
        className="scroll-mt-20 grid overflow-hidden rounded-3xl border border-border bg-card lg:grid-cols-[minmax(0,.8fr)_minmax(0,1.2fr)]"
      >
        <div className="nv-dark relative isolate flex flex-col justify-between gap-6 bg-gradient-to-br from-[#04211c] to-[#0b4b40] p-6 text-white sm:p-7">
          <div>
            <h2 id="enq-title" className="font-display text-2xl font-extrabold leading-tight">
              Cadastro em 1 minuto
            </h2>
            <p className="mt-2 text-sm text-white/80">
              Responda e a equipe NextVita chama você no WhatsApp para liberar a loja. Sem custo.
            </p>
          </div>
          <ul className="grid gap-2.5 text-sm text-white/85">
            {[
              "Sem site e sem mensalidade",
              "Comissão só quando vender",
              "Produtos feitos em casa também",
            ].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <BadgeCheck size={16} className="shrink-0 text-emerald-300" /> {t}
              </li>
            ))}
          </ul>
          <p className="text-xs text-white/60">
            Prefere abrir a loja agora?{" "}
            <Link to="/lojista" className="font-semibold text-white underline underline-offset-2">
              Faça o cadastro completo
            </Link>
            .
          </p>
        </div>
        <form
          onSubmit={viaWhatsApp}
          className="grid content-start gap-3 p-5 sm:grid-cols-2 sm:p-7"
          aria-label="Enquete para novos parceiros"
        >
          <label className={label}>
            Seu nome
            <input
              className={field}
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={80}
              autoComplete="name"
            />
          </label>
          <label className={label}>
            WhatsApp com DDD
            <input
              className={field}
              inputMode="tel"
              autoComplete="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="(68) 90000-0000"
            />
          </label>
          <label className={label}>
            Loja ou negócio <span className="font-normal text-muted-foreground">(opcional)</span>
            <input
              className={field}
              value={shop}
              onChange={(e) => setShop(e.target.value)}
              maxLength={80}
            />
          </label>
          <div className={label}>
            O que você vende?
            <NiceSelect
              className="mt-1 h-11"
              ariaLabel="Segmento"
              value={segment}
              onChange={setSegment}
              options={SEGMENTS.map((s) => ({ value: s.key, label: s.label, hint: s.hint }))}
            />
          </div>
          <label className={label}>
            Produtos <span className="font-normal text-muted-foreground">(opcional)</span>
            <input
              className={field}
              value={sells}
              onChange={(e) => setSells(e.target.value)}
              maxLength={160}
              placeholder="Ex.: doces fit, marmitas"
            />
          </label>
          <label className={label}>
            Cidade
            <input
              className={field}
              value={city}
              onChange={(e) => setCity(e.target.value)}
              maxLength={80}
            />
          </label>
          {error && (
            <p
              role="alert"
              className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive sm:col-span-2"
            >
              {error}
            </p>
          )}
          <div className="mt-1 flex flex-wrap gap-2 sm:col-span-2">
            <button
              type="submit"
              className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-700 px-5 text-sm font-bold text-white transition hover:bg-emerald-700 active:scale-[.98]"
            >
              <MessageCircle size={17} /> Enviar pelo WhatsApp
            </button>
            <button
              type="button"
              onClick={viaEmail}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-5 text-sm font-semibold transition hover:bg-muted"
            >
              <Mail size={17} /> Enviar por e-mail
            </button>
          </div>
        </form>
      </section>

      {/* Dúvidas e contato */}
      <section className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,.6fr)]">
        <div
          aria-labelledby="faq-title"
          className="rounded-3xl border border-border bg-card p-5 sm:p-6"
        >
          <h2 id="faq-title" className="font-display text-lg font-extrabold">
            Perguntas frequentes
          </h2>
          <div className="mt-3 divide-y divide-border">
            {faq.map(([q, a], i) => (
              <div key={q}>
                <h3>
                  <button
                    type="button"
                    aria-expanded={open === i}
                    onClick={() => setOpen(open === i ? null : i)}
                    className="flex min-h-12 w-full items-center justify-between gap-3 text-left text-sm font-semibold transition-colors hover:text-primary"
                  >
                    {q}
                    <ChevronDown
                      size={17}
                      className={`shrink-0 text-muted-foreground transition-transform duration-300 ${open === i ? "rotate-180" : ""}`}
                    />
                  </button>
                </h3>
                {open === i && (
                  <p className="nv-fade-in pb-4 text-sm leading-relaxed text-muted-foreground">
                    {a}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
        <aside
          id="contato"
          aria-labelledby="contato-title"
          className="nv-dark flex flex-col justify-between gap-5 rounded-3xl bg-gradient-to-br from-[#022c22] to-[#0e6b5c] p-6 text-white"
        >
          <div>
            <h2 id="contato-title" className="font-display text-lg font-extrabold">
              Fale com a equipe
            </h2>
            <p className="mt-1 text-sm text-white/80">
              Dúvidas sobre planos ou como começar? Respondemos pessoalmente.
            </p>
          </div>
          <div className="grid gap-2">
            <a
              href={`https://wa.me/${STORE_WHATSAPP}?text=${encodeURIComponent("Olá! Quero vender meus produtos na NextVita. Pode me explicar como funciona?")}`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-white text-sm font-bold text-slate-950 transition hover:bg-emerald-50"
            >
              <MessageCircle size={17} className="text-emerald-600" /> WhatsApp
            </a>
            <a
              href={`mailto:${EMAIL}?subject=${encodeURIComponent("Quero vender na NextVita")}`}
              className="inline-flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl border border-white/30 bg-white/10 px-3 text-sm font-semibold backdrop-blur hover:bg-white/20"
            >
              <Mail size={17} className="shrink-0" /> <span className="truncate">{EMAIL}</span>
            </a>
          </div>
        </aside>
      </section>
    </div>
  );
}
