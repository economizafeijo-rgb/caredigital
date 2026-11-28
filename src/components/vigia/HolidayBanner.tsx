import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight, X } from "lucide-react";

/** Banner fotográfico de fim de ano: aparece de 15/11 a 06/01 e pode ser fechado (lembra por ano). */
function inSeason(d = new Date()) {
  const m = d.getMonth() + 1;
  const day = d.getDate();
  return (m === 11 && day >= 15) || m === 12 || (m === 1 && day <= 6);
}

export function HolidayBanner() {
  const now = new Date();
  const key = `nv-holiday-closed-${now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()}`;
  const [show, setShow] = useState(false);
  useEffect(() => {
    let closed = false;
    try {
      closed = localStorage.getItem(key) === "1";
    } catch {
      /* sem armazenamento */
    }
    setShow(inSeason() && !closed);
  }, [key]);
  if (!show) return null;

  const close = () => {
    setShow(false);
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* só não lembra */
    }
  };

  return (
    <section
      aria-label="Boas festas"
      className="nv-dark relative isolate overflow-hidden rounded-2xl bg-[#0b1512] text-white shadow-card max-sm:-mx-3 max-sm:rounded-none"
    >
      <img
        src="/images/natal-ceia.webp"
        alt=""
        aria-hidden="true"
        className="absolute inset-0 -z-20 size-full object-cover object-right"
      />
      <span
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-r from-[#08110e] via-[#08110e]/85 to-transparent max-sm:via-[#08110e]/90 max-sm:to-[#08110e]/55"
      />
      <div className="flex min-h-[11.5rem] max-w-xl flex-col justify-center gap-2 px-5 py-5 sm:min-h-[13rem] sm:px-8">
        <p className="text-[12px] font-semibold text-[#e8c36a]">Boas festas · NextVita</p>
        <h2 className="font-display text-2xl font-extrabold leading-tight sm:text-[1.75rem]">
          Uma ceia que cuida de você
        </h2>
        <p className="max-w-md text-[13.5px] leading-snug text-white/80">
          Monte um prato equilibrado, beba água entre os brindes e mantenha o sono em dia. O app
          acompanha cada registro nas festas.
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-2">
          <Link
            to="/dietas"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-[#e8c36a] px-4 text-sm font-bold text-[#1a1406] transition hover:brightness-105 active:scale-[.98]"
          >
            Ceia equilibrada <ArrowRight size={15} aria-hidden="true" />
          </Link>
        </div>
      </div>
      <button
        type="button"
        onClick={close}
        aria-label="Fechar banner de boas festas"
        className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-lg bg-black/30 text-white/80 backdrop-blur transition hover:bg-black/50 hover:text-white"
      >
        <X size={16} />
      </button>
    </section>
  );
}
