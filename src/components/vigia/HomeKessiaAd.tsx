import { Link } from "@tanstack/react-router";
import { ArrowRight, MapPin, Store } from "lucide-react";

const showcase = [
  { ref: "vestido-floresta", name: "Vestido Midi Estampa Floresta", price: "R$ 159,90" },
  { ref: "cropped-bordado", name: "Cropped Bordado à Mão", price: "R$ 89,90" },
  { ref: "bolsa-palha", name: "Bolsa de Palha com Alça de Couro", price: "R$ 139,90" },
  { ref: "colar-sementes", name: "Colar de Sementes Regionais", price: "R$ 49,90" },
];

/** Propaganda de inauguração da Kessia' Digital Store, logo abaixo da abertura da home. */
export function HomeKessiaAd() {
  return (
    <section
      aria-labelledby="kessia-ad-title"
      className="nv-dark relative isolate overflow-hidden rounded-3xl bg-[#2a0a22] text-white"
    >
      <img
        src="/loja/bela-vista/banner.jpg"
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 -z-20 size-full object-cover opacity-40"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#2a0a22]/95 via-[#4a0f3a]/85 to-[#2a0a22]/70"
      />
      <div className="grid gap-6 p-5 sm:p-8 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.4fr)] lg:items-center lg:gap-10">
        <div className="min-w-0">
          <img
            src="/loja/kessia/logo.svg"
            alt="Kessia' Digital Store"
            className="size-14 rounded-full bg-white object-contain p-1 shadow-lg"
          />
          <p className="mt-4 inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/10 px-3 py-1 text-[12px] font-semibold">
            <MapPin size={13} aria-hidden="true" /> Inauguração · Feijó, Acre
          </p>
          <h2
            id="kessia-ad-title"
            className="mt-3 text-balance font-display text-2xl font-extrabold leading-tight tracking-tight sm:text-[1.9rem]"
          >
            A Kessia' Digital Store abriu a loja online
          </h2>
          <p className="mt-2 max-w-[44ch] text-sm leading-relaxed text-white/80">
            Moda feminina regional, acessórios e bijuterias artesanais de Feijó. Pague no Pix com 5%
            de desconto, retire no balcão ou receba em casa.
          </p>
          <div className="mt-5 flex flex-wrap gap-2.5">
            <a
              href="/loja?loja=kessia-digital-store"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-bold text-[#6b1450] transition hover:bg-pink-50"
            >
              <Store size={16} aria-hidden="true" /> Conhecer a loja
            </a>
            <Link
              to="/lojista"
              className="inline-flex h-11 items-center gap-1.5 rounded-xl border border-white/30 px-4 text-sm font-semibold transition hover:bg-white/10"
            >
              Quero vender também <ArrowRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </div>
        <ul className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          {showcase.map((p) => (
            <li
              key={p.ref}
              className="overflow-hidden rounded-xl bg-white text-slate-900 shadow-lg"
            >
              <img
                src={`/loja/kessia/${p.ref}.png`}
                alt={p.name}
                loading="lazy"
                className="aspect-square w-full object-cover"
              />
              <div className="p-2.5">
                <p className="line-clamp-2 min-h-[2.2rem] text-[12.5px] font-semibold leading-tight">
                  {p.name}
                </p>
                <p className="mt-1 text-sm font-extrabold text-[#8a1459]">{p.price}</p>
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
