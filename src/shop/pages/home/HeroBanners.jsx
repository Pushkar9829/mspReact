/**
 * Home hero: a rotating banner carousel built from live data (no stock photography, no invented
 * numbers). Each slide is composed in HTML — headline, one clear action and a visual made from real
 * products (deal discounts, a real slab table, credit terms).
 *
 * Designed image banners can be added in src/shop/config/banners.js; they take precedence when present.
 *
 * Accessibility: WAI-ARIA carousel pattern (region + roledescription), auto-rotation pauses on hover,
 * on focus, when the tab is hidden and when the user prefers reduced motion; there is an explicit
 * pause/play control; slides not in view are `inert`.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgePercent, Boxes, ChevronLeft, ChevronRight, FileText, Pause, Play, ShieldCheck, Sparkles, Wallet } from "lucide-react";
import { cn, ImageWithFallback, Skeleton } from "../../components/ui/index.js";
import { formatListing } from "../../lib/money.js";
import { IMAGE_BANNERS } from "../../config/banners.js";

const INTERVAL = 6500;

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(() => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches);
  useEffect(() => {
    const mq = window.matchMedia?.("(prefers-reduced-motion: reduce)");
    if (!mq) return undefined;
    const on = () => setReduced(mq.matches);
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, []);
  return reduced;
}

/* ------------------------------------------------------------------ slide visuals */

/** Product image URLs that actually load (broken images never reach a banner). */
function useLoadedImages(products, max = 3) {
  const urls = useMemo(() => [...new Set(products.map((p) => p.image).filter(Boolean))].slice(0, 10), [products]);
  const [ok, setOk] = useState(() => new Set());
  useEffect(() => {
    let alive = true;
    for (const url of urls) {
      const img = new Image();
      img.decoding = "async";
      img.onload = () => alive && img.naturalWidth > 0 && setOk((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
      img.src = url;
    }
    return () => {
      alive = false;
    };
  }, [urls]);
  const seen = new Set();
  return products.filter((p) => p.image && ok.has(p.image) && !seen.has(p.image) && seen.add(p.image)).slice(0, max);
}

/** A fanned stack of real packshots on white wells. */
function PackCluster({ products, badge }) {
  const items = useLoadedImages(products);
  if (!items.length) return null;
  const pos = [
    "left-[6%] top-[18%] -rotate-6 z-10",
    "left-[34%] top-[4%] rotate-2 z-20 scale-110",
    "left-[60%] top-[22%] rotate-6 z-10",
  ];
  return (
    <div aria-hidden className="relative h-full min-h-[13rem] w-full">
      {items.map((p, i) => (
        <div key={p.id || p.slug} className={cn("absolute w-[38%] max-w-[11rem] rounded-2xl bg-white p-2 shadow-[0_18px_40px_-18px_rgba(0,0,0,0.55)] ring-1 ring-black/5", pos[i])}>
          <ImageWithFallback src={p.image} alt="" className="aspect-square w-full rounded-xl" />
          {badge?.(p) ? (
            <span className="absolute -right-2 -top-2 rounded-full bg-shop-deal px-2 py-1 text-shop-xs font-bold text-white shadow-md">{badge(p)}</span>
          ) : null}
        </div>
      ))}
    </div>
  );
}

/** A real slab table from one bulk product: the price drops as quantity goes up. */
function SlabCard({ product }) {
  const v = product?.defaultVariant;
  // Only real savings: a slab priced the same as a single pack is not a tier worth showing.
  const slabs = (v?.slabs || []).filter((s) => s.unitPrice < v.price).slice(0, 3);
  if (!product || !slabs.length) return null;
  return (
    <div aria-hidden className="ml-auto w-full max-w-[19rem] rounded-2xl bg-white/95 p-4 text-shop-ink shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)] ring-1 ring-black/5 backdrop-blur">
      <div className="flex items-center gap-3">
        <ImageWithFallback src={product.image} alt="" className="size-12 shrink-0 rounded-lg" />
        <div className="min-w-0">
          <p className="truncate text-shop-sm font-semibold">{product.name}</p>
          <p className="text-shop-xs text-shop-muted">Price per pack</p>
        </div>
      </div>
      <ul className="mt-3 grid gap-1.5">
        <li className="flex items-center justify-between rounded-lg px-3 py-1.5 text-shop-sm">
          <span className="text-shop-muted">1+ packs</span>
          <span className="font-semibold tabular-nums">{formatListing(v.price)}</span>
        </li>
        {slabs.map((s, i) => (
          <li
            key={s.minQty}
            className={cn("flex items-center justify-between rounded-lg px-3 py-1.5 text-shop-sm", i === slabs.length - 1 ? "bg-shop-primary-soft font-semibold text-shop-primary-ink" : "")}
          >
            <span>{s.minQty}+ packs</span>
            <span className="tabular-nums">{formatListing(s.unitPrice)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Credit / invoice visual: a stylised account card (illustrative layout, no account data). */
function TermsCard() {
  return (
    <div aria-hidden className="relative ml-auto h-full min-h-[13rem] w-full max-w-[20rem]">
      <div className="absolute right-6 top-2 h-40 w-64 rotate-6 rounded-2xl bg-white/15 ring-1 ring-white/25" />
      <div className="absolute right-0 top-8 w-64 rounded-2xl bg-gradient-to-br from-white to-[#eef6f1] p-4 text-shop-ink shadow-[0_24px_50px_-24px_rgba(0,0,0,0.6)]">
        <div className="flex items-center justify-between">
          <span className="text-shop-xs font-semibold uppercase tracking-wider text-shop-muted">Business account</span>
          <Wallet className="size-5 text-shop-primary" />
        </div>
        <div className="mt-4 grid gap-2">
          {[
            ["Purchase orders", "Accepted"],
            ["Payment terms", "Set by each seller"],
            ["GST invoice", "Every order"],
          ].map(([k, val]) => (
            <div key={k} className="flex items-center justify-between text-shop-sm">
              <span className="text-shop-muted">{k}</span>
              <span className="font-semibold text-shop-primary-ink">{val}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ slides */

function useSlides({ deals, bulk, fresh, signedIn }) {
  return useMemo(() => {
    const bestDeal = Math.max(0, ...deals.products.map((p) => p.discountPct || 0));
    let bulkSave = 0;
    let bulkProduct = null;
    for (const p of bulk.products) {
      const v = p.defaultVariant;
      for (const s of v?.slabs || []) {
        if (v.price > 0 && s.unitPrice < v.price) {
          const save = Math.floor(((v.price - s.unitPrice) / v.price) * 100);
          if (save > bulkSave) {
            bulkSave = save;
            bulkProduct = p;
          }
        }
      }
    }
    const showcase = fresh.products.length ? fresh.products : deals.products;

    const slides = [
      {
        id: "brand",
        theme: "navy",
        eyebrow: "Wholesale marketplace",
        title: (
          <>
            Wholesale prices.
            <br />
            <span className="text-shop-gold">Retail convenience.</span>
          </>
        ),
        text: "Groceries and FMCG from verified sellers, with a GST invoice on every order.",
        cta: { to: "/category/all", label: "Shop all products" },
        alt: signedIn ? { to: "/account/orders?view=buy-again", label: "Buy again" } : { to: "/register", label: "Open a business account" },
        visual: <PackCluster products={showcase} />,
      },
    ];

    if (deals.products.length) {
      slides.push({
        id: "deals",
        theme: "saffron",
        eyebrow: "Deals of the week",
        icon: BadgePercent,
        title: bestDeal > 0 ? (
          <>
            Up to <span className="text-shop-gold">{bestDeal}% off</span> MRP
          </>
        ) : (
          "Limited-period seller prices"
        ),
        text: `${deals.total ?? deals.products.length} seller deal${(deals.total ?? deals.products.length) === 1 ? "" : "s"} live right now. Prices change when the deal ends.`,
        cta: { to: "/deals", label: "Shop deals" },
        visual: <PackCluster products={[...deals.products].sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0))} badge={(p) => (p.discountPct ? `${p.discountPct}% off` : null)} />,
      });
    }

    if (bulkProduct) {
      slides.push({
        id: "bulk",
        theme: "green",
        eyebrow: "Case-pack savings",
        icon: Boxes,
        title: (
          <>
            Buy by the case,
            <br />
            pay up to <span className="text-shop-gold">{bulkSave}% less</span> per pack
          </>
        ),
        text: "Slab prices drop automatically as your quantity goes up — no codes, no haggling.",
        cta: { to: "/bulk", label: "Explore bulk buying" },
        visual: <SlabCard product={bulkProduct} />,
      });
    }

    slides.push({
      id: "terms",
      theme: "ink",
      eyebrow: "For businesses",
      icon: ShieldCheck,
      title: (
        <>
          Purchase orders and
          <br />
          <span className="text-shop-gold">credit terms</span> for your shop
        </>
      ),
      text: "Approved buyers can pay by PO or on credit with each seller, with input tax credit on every GST invoice.",
      cta: signedIn ? { to: "/account/credit", label: "View your credit" } : { to: "/register", label: "Apply for business terms" },
      visual: <TermsCard />,
    });

    return slides;
  }, [deals.products, deals.total, bulk.products, fresh.products, signedIn]);
}

const THEMES = {
  navy: "bg-shop-navy bg-[radial-gradient(90%_120%_at_100%_0%,rgba(233,185,73,0.22),transparent_55%),radial-gradient(70%_90%_at_0%_100%,rgba(15,122,74,0.35),transparent_60%)]",
  saffron: "bg-[#7a2a06] bg-[radial-gradient(90%_120%_at_100%_0%,rgba(255,196,120,0.35),transparent_55%),linear-gradient(135deg,#9a3412,#c2410c_55%,#7a2a06)]",
  green: "bg-shop-primary bg-[radial-gradient(90%_120%_at_100%_0%,rgba(233,185,73,0.28),transparent_55%),linear-gradient(135deg,#0b5a37,#0f7a4a_60%,#0b4a2e)]",
  ink: "bg-shop-ink bg-[radial-gradient(90%_120%_at_100%_100%,rgba(15,122,74,0.45),transparent_60%),radial-gradient(60%_80%_at_0%_0%,rgba(233,185,73,0.18),transparent_60%)]",
};

function Slide({ slide, active, index, count }) {
  if (slide.image) {
    // Designed banner from config/banners.js
    return (
      <Link
        to={slide.to}
        className="block h-full w-full overflow-hidden"
        aria-label={slide.alt}
        tabIndex={active ? 0 : -1}
      >
        <picture>
          {slide.imageMobile ? <source media="(max-width: 639px)" srcSet={slide.imageMobile} /> : null}
          <img src={slide.image} alt={slide.alt} className="h-full w-full object-cover" loading={index === 0 ? "eager" : "lazy"} decoding="async" />
        </picture>
      </Link>
    );
  }
  const Icon = slide.icon || Sparkles;
  return (
    <div className={cn("relative grid h-full grid-cols-1 overflow-hidden text-white sm:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]", THEMES[slide.theme])}>
      {/* fine grain + edge light for depth */}
      <div aria-hidden className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:radial-gradient(rgba(255,255,255,0.9)_1px,transparent_1px)] [background-size:18px_18px]" />
      <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />

      <div className="relative z-10 flex flex-col justify-center gap-4 px-6 pb-16 pt-6 sm:px-8 sm:pt-8 lg:px-10">
        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-white/12 px-3 py-1 text-shop-xs font-semibold uppercase tracking-wider text-white/90 ring-1 ring-white/20 backdrop-blur">
          <Icon className="size-3.5 text-shop-gold" strokeWidth={2.2} aria-hidden />
          {slide.eyebrow}
        </span>
        <h2 className="font-display text-[1.6rem] font-bold leading-[1.12] tracking-tight sm:text-shop-2xl lg:text-[2.1rem] xl:text-[2.3rem]">{slide.title}</h2>
        <p className="max-w-md text-shop-base text-white/80 sm:text-shop-md">{slide.text}</p>
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <Link
            to={slide.cta.to}
            tabIndex={active ? 0 : -1}
            className="group inline-flex h-11 items-center gap-2 rounded-full bg-white px-5 text-shop-sm font-semibold text-shop-ink shadow-[0_10px_24px_-10px_rgba(0,0,0,0.6)] transition-transform hover:-translate-y-px"
          >
            {slide.cta.label}
            <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
          </Link>
          {slide.alt ? (
            <Link
              to={slide.alt.to}
              tabIndex={active ? 0 : -1}
              className="inline-flex h-11 items-center rounded-full px-4 text-shop-sm font-semibold text-white ring-1 ring-white/35 transition-colors hover:bg-white/10"
            >
              {slide.alt.label}
            </Link>
          ) : null}
        </div>
        <span className="sr-only">
          Slide {index + 1} of {count}
        </span>
      </div>

      <div className="relative hidden items-center px-6 py-6 sm:flex lg:px-10">{slide.visual}</div>
    </div>
  );
}

export function HeroBanners({ deals, bulk, fresh, signedIn, className }) {
  const generated = useSlides({ deals, bulk, fresh, signedIn });
  const slides = IMAGE_BANNERS.length ? IMAGE_BANNERS : generated;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false); // user toggle
  const [hovering, setHovering] = useState(false);
  const [focusWithin, setFocusWithin] = useState(false);
  const reduced = usePrefersReducedMotion();
  const touch = useRef(null);
  const count = slides.length;
  const i = count ? index % count : 0;

  const go = useCallback((n) => setIndex(((n % count) + count) % count), [count]);
  const running = count > 1 && !paused && !hovering && !focusWithin && !reduced;

  useEffect(() => {
    if (!running) return undefined;
    const t = setTimeout(() => {
      if (document.visibilityState === "visible") go(i + 1);
    }, INTERVAL);
    return () => clearTimeout(t);
  }, [running, i, go]);

  const loading = deals.isPending && bulk.isPending && fresh.isPending && !IMAGE_BANNERS.length;
  if (loading) return <Skeleton className={cn("h-[17.5rem] w-full rounded-[1.25rem] sm:h-[21rem] lg:h-[23.5rem]", className)} />;

  return (
    <section
      aria-roledescription="carousel"
      aria-label="Highlights"
      className={cn("group/hero relative isolate overflow-hidden rounded-[1.25rem] shadow-[0_24px_60px_-30px_rgba(11,16,51,0.55)]", className)}
      onMouseEnter={() => setHovering(true)}
      onMouseLeave={() => setHovering(false)}
      onFocus={() => setFocusWithin(true)}
      onBlur={(e) => !e.currentTarget.contains(e.relatedTarget) && setFocusWithin(false)}
      onTouchStart={(e) => (touch.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touch.current == null) return;
        const dx = e.changedTouches[0].clientX - touch.current;
        if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        touch.current = null;
      }}
    >
      <div
        className="flex min-h-[17.5rem] transition-transform duration-700 ease-[cubic-bezier(.22,.8,.2,1)] motion-reduce:transition-none sm:min-h-[21rem] lg:min-h-[23.5rem]"
        style={{ transform: `translateX(-${i * 100}%)` }}
        aria-live={running ? "off" : "polite"}
      >
        {slides.map((s, n) => (
          <div
            key={s.id || n}
            role="group"
            aria-roledescription="slide"
            aria-label={`${n + 1} of ${count}`}
            inert={n !== i}
            className="flex w-full shrink-0 [&>*]:flex-1"
          >
            <Slide slide={s} active={n === i} index={n} count={count} />
          </div>
        ))}
      </div>

      {count > 1 ? (
        <>
          <div className="absolute bottom-4 left-6 z-20 flex items-center gap-2 sm:left-8 lg:left-10">
            <button
              type="button"
              onClick={() => setPaused((v) => !v)}
              className="grid size-8 place-items-center rounded-full bg-black/25 text-white ring-1 ring-white/25 backdrop-blur transition-colors hover:bg-black/40 pointer-coarse:size-11"
              aria-label={paused ? "Play slides" : "Pause slides"}
            >
              {paused ? <Play className="size-3.5" aria-hidden /> : <Pause className="size-3.5" aria-hidden />}
            </button>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Choose slide">
              {slides.map((s, n) => (
                <button
                  key={s.id || n}
                  type="button"
                  role="tab"
                  aria-selected={n === i}
                  aria-label={`Slide ${n + 1}`}
                  onClick={() => go(n)}
                  className="relative grid h-8 place-items-center pointer-coarse:h-11"
                >
                  <span className={cn("block h-1.5 overflow-hidden rounded-full bg-white/35 transition-all duration-300", n === i ? "w-9" : "w-1.5 hover:bg-white/60")}>
                    {n === i ? (
                      <span
                        key={`${i}-${running}`}
                        className={cn("block h-full rounded-full bg-white", running ? "w-0 animate-[msr-hero-progress_linear_forwards]" : "w-full")}
                        style={running ? { animationDuration: `${INTERVAL}ms` } : undefined}
                      />
                    ) : null}
                  </span>
                </button>
              ))}
            </div>
          </div>
          <div className="absolute bottom-4 right-4 z-20 hidden gap-2 opacity-0 transition-opacity group-hover/hero:opacity-100 group-focus-within/hero:opacity-100 sm:flex">
            <button type="button" onClick={() => go(i - 1)} className="grid size-10 place-items-center rounded-full bg-white/90 text-shop-ink shadow-md hover:bg-white" aria-label="Previous slide">
              <ChevronLeft className="size-5" aria-hidden />
            </button>
            <button type="button" onClick={() => go(i + 1)} className="grid size-10 place-items-center rounded-full bg-white/90 text-shop-ink shadow-md hover:bg-white" aria-label="Next slide">
              <ChevronRight className="size-5" aria-hidden />
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}

/* Small helper used by the side card: an icon + line list. */
export function FactLine({ icon: Icon = FileText, children }) {
  return (
    <li className="flex items-start gap-2 text-shop-sm text-shop-text">
      <Icon className="mt-0.5 size-4 shrink-0 text-shop-primary-ink" strokeWidth={2} aria-hidden />
      <span>{children}</span>
    </li>
  );
}
