import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { BadgePercent, CheckCircle2, ChevronLeft, ChevronRight, Package, RefreshCcw, ShieldCheck, Truck } from "lucide-react";
import { heroSlides } from "../../shared/data/catalog.js";
import { inr } from "../../shared/lib/format.js";

const FEATURES = [
  { icon: BadgePercent, line1: "Top brands at", line2: "best prices", to: "/brands" },
  { icon: Package, line1: "Bulk orders", line2: "special prices", to: "/bulk" },
  { icon: Truck, line1: "Pan-India", line2: "delivery", to: "/help#shipping" },
];

const TRUST = [
  { icon: ShieldCheck, line1: "100% genuine", line2: "products", to: "/help" },
  { icon: CheckCircle2, line1: "Best price", line2: "guarantee", to: "/deals" },
  { icon: Truck, line1: "Fast & reliable", line2: "delivery", to: "/help#shipping" },
  { icon: RefreshCcw, line1: "Easy returns", line2: "& refunds", to: "/help#returns" },
];

export default function Hero() {
  const slides = heroSlides;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const current = slides[index] || slides[0];

  useEffect(() => {
    if (paused || slides.length < 2) return undefined;
    const timer = setInterval(() => setIndex((i) => (i + 1) % slides.length), 5500);
    return () => clearInterval(timer);
  }, [paused, slides.length]);

  function go(next) {
    setIndex((i) => (i + next + slides.length) % slides.length);
  }

  return (
    <section
      className="hero-canvas relative overflow-hidden text-white"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div className="pointer-events-none absolute inset-0 hero-glow" />

      <div className="msr-gutter relative grid items-center gap-8 py-10 lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)_6.75rem] lg:py-12">
        <div className="relative z-10 min-h-[240px] md:min-h-[260px]">
          <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#c4c0ff]">{current.kicker}</p>
          <h1 className="mt-3 whitespace-pre-line text-[2.05rem] font-extrabold leading-[1.15] tracking-tight md:text-[2.6rem] lg:text-[2.85rem]">
            {current.title}
          </h1>
          <p className="mt-4 max-w-[26rem] text-[15px] leading-relaxed text-white/80 line-clamp-3">{current.sub}</p>
          {current.price ? (
            <p className="mt-3 text-lg font-extrabold text-white">
              {inr(current.price)}
              {current.weight ? <span className="ml-2 text-sm font-medium text-white/70">· {current.weight}</span> : null}
            </p>
          ) : null}
          <Link
            to={current.to}
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-white px-6 py-2.5 text-sm font-bold text-[#0b1460] hover:bg-white/95"
          >
            {current.cta} <span aria-hidden>→</span>
          </Link>
        </div>

        <div className="relative min-w-0">
          <Link to={current.to} className="block">
            <img
              key={current.id}
              src={current.image}
              alt={current.imageAlt}
              className="mx-auto h-[260px] w-full object-contain md:h-[320px] lg:h-[360px]"
            />
          </Link>
          {slides.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(-1)}
                className="absolute left-0 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                aria-label="Previous slide"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => go(1)}
                className="absolute right-0 top-1/2 z-20 grid h-10 w-10 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-white/10 text-white backdrop-blur-sm hover:bg-white/20"
                aria-label="Next slide"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          ) : null}
        </div>

        <div className="hidden flex-col items-center gap-4 lg:flex">
          {FEATURES.map((f) => (
            <Link
              key={f.line1}
              to={f.to}
              className="flex h-[104px] w-[108px] flex-col items-center justify-center rounded-full border border-white/30 bg-white/5 px-2 text-center transition hover:bg-white/15"
            >
              <f.icon className="h-5 w-5" strokeWidth={1.6} />
              <p className="mt-1.5 text-[11px] font-semibold leading-tight text-white">
                {f.line1}
                <br />
                {f.line2}
              </p>
            </Link>
          ))}
        </div>
      </div>

      <div className="msr-gutter relative grid grid-cols-2 gap-x-8 gap-y-4 pb-5 pt-1 md:grid-cols-4">
        {TRUST.map((t) => (
          <Link key={t.line1} to={t.to} className="flex items-center gap-3 rounded-lg p-1 hover:bg-white/10">
            <t.icon className="h-5 w-5 shrink-0 text-white/90" strokeWidth={1.7} />
            <p className="text-[13px] font-semibold leading-snug text-white/95 md:text-sm">
              {t.line1}
              <br />
              {t.line2}
            </p>
          </Link>
        ))}
      </div>

      <div className="relative flex justify-center gap-2 pb-5" role="tablist" aria-label="Hero slides">
        {slides.map((s, i) => (
          <button
            key={s.id}
            type="button"
            role="tab"
            aria-label={s.kicker}
            aria-selected={i === index}
            onClick={() => setIndex(i)}
            className={`h-2 rounded-full transition ${i === index ? "w-6 bg-white" : "w-2 bg-white/35 hover:bg-white/70"}`}
          />
        ))}
      </div>
    </section>
  );
}
