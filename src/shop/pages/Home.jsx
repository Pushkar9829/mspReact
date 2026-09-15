import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { discount, needs } from "../data/catalog.js";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import { useDeliveryLocation } from "../context/LocationContext.jsx";
import ProductCard from "../components/ProductCard.jsx";
import Hero from "../components/Hero.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import { SectionTitle } from "../components/shopUi.jsx";
import { Award, Check, ChevronLeft, ChevronRight, Home as HomeIcon, ShieldCheck, Store, Truck } from "lucide-react";

const IMG = {
  pantry: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=80",
  spices: "https://images.unsplash.com/photo-1596040033229-a9821ebd058d?auto=format&fit=crop&w=1400&q=80",
  aisle: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
  dispatch: "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80",
  checkout: "https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=1400&q=80",
  kirana: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1400&q=80",
};

const TRUST_STRIP = [
  {
    icon: Award,
    title: "Retail and household",
    text: "One floor for kiranas and home pantries",
    to: "/bulk",
    image: IMG.pantry,
    fallback: "/categories/staples.png",
    alt: "A well-stocked home kitchen",
  },
  {
    icon: ShieldCheck,
    title: "Sealed branded packs",
    text: "Listed FMCG from known manufacturers",
    to: "/help#genuine",
    image: IMG.spices,
    fallback: "/promos/deal.png",
    alt: "Sealed spices and grocery packs",
  },
  {
    icon: Truck,
    title: "Metro dispatch 1–3 days",
    text: "Bulk may ship from the nearest warehouse",
    to: "/help#shipping",
    image: IMG.dispatch,
    fallback: "/promos/bulk.png",
    alt: "Warehouse ready for dispatch",
  },
  {
    icon: ShieldLockIcon,
    title: "UPI, cards, net banking",
    text: "Pay securely at checkout",
    to: "/help#payments",
    image: IMG.checkout,
    fallback: "/promos/new.png",
    alt: "Secure card payment at checkout",
  },
];

const BESTSELLER_IDS = [
  "aashirvaad-atta",
  "fortune-sunflower-oil",
  "tata-tea-premium",
  "surf-excel",
  "colgate-maxfresh",
  "dove-body-wash",
];

const CATEGORY_STRIP = [
  { slug: "staples", name: "Staples", image: "/categories/staples.png", tint: "bg-amber-50" },
  { slug: "beverages", name: "Beverages", image: "/categories/beverages.png", tint: "bg-orange-50" },
  { slug: "snacks", name: "Snacks", image: "/categories/snacks.png", tint: "bg-yellow-50" },
  { slug: "personal-care", name: "Personal Care", image: "/categories/personal-care.png", tint: "bg-sky-50" },
  { slug: "home-care", name: "Home Care", image: "/categories/home-care.png", tint: "bg-indigo-50" },
  { slug: "baby-care", name: "Baby Care", image: "/categories/baby-care.png", tint: "bg-pink-50" },
  { slug: "health", name: "Health & Wellness", image: "/categories/health.png", tint: "bg-emerald-50" },
  { slug: "dairy", name: "Dairy & Bakery", image: "/categories/dairy.png", tint: "bg-lime-50" },
];

const TILE =
  "group flex flex-col items-center rounded-2xl bg-white p-3 text-center shadow-[0_4px_18px_rgba(8,10,61,0.05)] ring-1 ring-[#ece6d4] transition duration-200 hover:-translate-y-1 hover:shadow-[0_12px_28px_rgba(39,34,184,0.1)] hover:ring-[#ead9a0]";

export default function Home() {
  const rowRef = useRef(null);
  const { products, filterProducts, brands, ready } = useShopCatalog();
  const { location, setLocation, locations } = useDeliveryLocation();
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [marqueePaused, setMarqueePaused] = useState(false);

  const featured = BESTSELLER_IDS.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const tagged = filterProducts({ bestseller: true });
  const bestsellers = [...featured, ...tagged.filter((p) => !BESTSELLER_IDS.includes(p.id))].slice(0, 12);
  const maxOff = products.reduce((n, p) => Math.max(n, discount(p)), 0);

  function updateScroll() {
    const el = rowRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 8);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8);
  }

  useEffect(() => {
    const el = rowRef.current;
    if (!el) return undefined;
    updateScroll();
    el.addEventListener("scroll", updateScroll, { passive: true });
    window.addEventListener("resize", updateScroll);
    return () => {
      el.removeEventListener("scroll", updateScroll);
      window.removeEventListener("resize", updateScroll);
    };
  }, [bestsellers.length]);

  function scrollBestsellers(dir) {
    const el = rowRef.current;
    if (!el) return;
    const card = el.querySelector("[data-product-card]");
    const step = card ? card.getBoundingClientRect().width + 16 : 192;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  }

  return (
    <div>
      <Hero />

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:py-10">
          <SectionTitle title="Shop by Category" to="/category/all" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8 lg:gap-4">
            {CATEGORY_STRIP.map((c) => (
              <Link key={c.slug} to={`/category/${c.slug}`} className={`${TILE} px-3`}>
                <span className={`grid aspect-square w-full place-items-center overflow-hidden rounded-2xl ${c.tint}`}>
                  <img
                    src={c.image}
                    alt={c.name}
                    className="h-[76%] w-[76%] object-contain transition duration-300 group-hover:scale-105"
                  />
                </span>
                <span className="mt-2.5 min-h-[2.5em] text-[13px] font-semibold leading-snug text-msr-navy">
                  {c.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:py-10">
          <SectionTitle title="Today's Highlights" />
          <div className="grid items-stretch gap-4 md:grid-cols-3">
            <Promo
              to="/bulk"
              kicker="Wholesale"
              title="Big savings on bulk orders"
              text="Special prices for retailers and businesses, with GST invoices."
              cta="Shop Bulk"
              image="/promos/bulk.png"
              imageAlt="Bulk MS₹ shipping boxes"
              variant="featured"
            />
            <Promo
              to="/deals"
              kicker="Limited time"
              title="Deal of the day"
              text="Fresh daily deals on fast-moving FMCG brands."
              offer={maxOff ? `${maxOff}% OFF` : null}
              cta="Shop Now"
              image="/promos/deal.png"
              imageAlt="Deal of the day salt pack"
              variant="deal"
            />
            <Promo
              to="/new"
              kicker="Just in"
              title="New launches"
              text="Discover the latest products from trusted brands."
              cta="Explore Now"
              image="/promos/new.png"
              imageAlt="New personal care launches"
              variant="new"
            />
          </div>
        </div>
      </section>

      {brands.length ? (
        <section className="bg-msr-bg py-8 md:py-10">
          <div className="msr-gutter mb-5 flex items-center justify-between gap-4">
            <Link to="/brands" className="min-w-0">
              <h2 className="text-[1.375rem] font-bold tracking-tight text-[#1a1c3d] hover:text-[#4b46ff] md:text-[1.5rem]">
                Brands on the Floor
              </h2>
            </Link>
            <div className="flex shrink-0 items-center gap-2">
              <button
                type="button"
                className="rounded-lg px-2 py-1 text-[13px] font-semibold text-msr-navy hover:bg-[#fffaf0]"
                onClick={() => setMarqueePaused((v) => !v)}
                aria-pressed={marqueePaused}
              >
                {marqueePaused ? "Play" : "Pause"}
              </button>
              <Link
                to="/brands"
                className="inline-flex items-center rounded-lg px-2 py-1 text-[13px] font-semibold text-[#4b46ff] hover:bg-[#eef0ff] hover:text-[#2722b8]"
              >
                View all →
              </Link>
            </div>
          </div>
          <div className="brand-marquee relative overflow-hidden border-y border-[#ece6d4] bg-white py-5">
            <div className={`brand-marquee-track ${marqueePaused ? "is-paused" : ""}`}>
              {[...brands, ...brands].map((b, i) => (
                <Link
                  key={`${b.slug}-${i}`}
                  to={`/category/all?q=${encodeURIComponent(b.name)}`}
                  className="mx-3 inline-flex shrink-0 items-center gap-3 whitespace-nowrap rounded-full border border-[#ead9a0] bg-[#fffaf0] px-4 py-2.5 text-msr-navy transition hover:border-msr-gold hover:bg-msr-navy hover:text-msr-gold"
                >
                  <BrandLogo className="h-9 w-9" alt="" />
                  <span className="text-sm font-semibold">{b.name}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:py-10">
          <SectionTitle title="Best Selling Products" to="/category/all" />
          <div className="relative">
            <div
              ref={rowRef}
              className="flex gap-4 overflow-x-auto overflow-y-hidden scroll-smooth no-scrollbar px-1 py-3"
            >
              {!ready && !bestsellers.length
                ? Array.from({ length: 4 }, (_, i) => (
                    <div
                      key={i}
                      className="h-[280px] w-[196px] shrink-0 animate-pulse rounded-2xl bg-[#ece6d4]/50 sm:w-[220px] lg:w-[calc((100%-3rem)/4)]"
                    />
                  ))
                : null}
              {bestsellers.map((p, i) => (
                <div
                  key={p.id}
                  data-product-card
                  className="product-card-in w-[196px] shrink-0 sm:w-[220px] lg:w-[calc((100%-3rem)/4)]"
                  style={{ animationDelay: `${Math.min(i, 8) * 70}ms` }}
                >
                  <ProductCard product={p} />
                </div>
              ))}
            </div>

            {ready && !bestsellers.length ? (
              <p className="py-10 text-center text-sm text-msr-muted">
                No bestsellers yet.{" "}
                <Link to="/category/all" className="font-semibold text-msr-navy underline">
                  Browse the floor
                </Link>
              </p>
            ) : null}

            {canLeft ? (
              <>
                <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-msr-bg to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollBestsellers(-1)}
                  className="product-arrow absolute left-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#eceef4] bg-white text-msr-navy shadow-[0_10px_28px_rgba(16,24,40,0.16)] hover:bg-msr-navy hover:text-white"
                  aria-label="Previous products"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              </>
            ) : null}

            {canRight ? (
              <>
                <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-msr-bg to-transparent" />
                <button
                  type="button"
                  onClick={() => scrollBestsellers(1)}
                  className="product-arrow absolute right-2 top-1/2 z-20 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-full border border-[#eceef4] bg-white text-msr-navy shadow-[0_10px_28px_rgba(16,24,40,0.16)] hover:bg-msr-navy hover:text-white"
                  aria-label="Next products"
                >
                  <ChevronRight className="h-5 w-5" />
                </button>
              </>
            ) : null}
          </div>
        </div>
      </section>

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:py-10">
          <SectionTitle title="The MS₹ Floor" />
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
            {TRUST_STRIP.map(({ icon: Icon, title, text, to, image, fallback, alt }) => (
              <Link
                key={title}
                to={to}
                className="group relative isolate min-h-[260px] overflow-hidden rounded-2xl text-white shadow-[0_8px_28px_rgba(8,10,61,0.12)] sm:min-h-[280px] lg:min-h-[320px]"
              >
                <CoverPhoto
                  src={image}
                  fallback={fallback}
                  alt={alt}
                  className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
                />
                <span className="absolute inset-0 bg-gradient-to-t from-[#080a3d] via-[#080a3d]/55 to-[#080a3d]/10" />
                <span className="relative z-10 flex h-full flex-col justify-end p-6 md:p-7">
                  <span className="grid h-10 w-10 place-items-center rounded-full border border-msr-gold/50 bg-white/10 text-msr-gold backdrop-blur-sm">
                    <Icon className="h-5 w-5" strokeWidth={1.6} />
                  </span>
                  <span className="mt-4 block text-[17px] font-bold tracking-tight md:text-[18px]">{title}</span>
                  <span className="mt-1 block max-w-sm text-[13px] leading-relaxed text-white/75">{text}</span>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:py-10">
          <SectionTitle title="Shop by Need" to="/category/all" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            {needs.map((n) => (
              <Link key={n.slug} to={n.to} className={`${TILE} px-3 py-4`}>
                <span className="relative h-[4.75rem] w-[4.75rem] overflow-hidden rounded-full border border-[#ead9a0] bg-[#fffaf0] sm:h-20 sm:w-20">
                  <CoverPhoto
                    src={n.image}
                    fallback={n.fallback}
                    alt={n.name}
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
                  />
                </span>
                <span className="mt-3 min-h-[2.5em] text-[13px] font-semibold leading-snug text-msr-navy">{n.name}</span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:py-10">
          <SectionTitle title="Shop Your Way" />
          <div className="grid overflow-hidden rounded-2xl border border-[#ece6d4] md:grid-cols-2">
            <Link
              to="/category/staples"
              className="group relative isolate min-h-[280px] overflow-hidden px-7 py-9 md:min-h-[320px] md:px-9"
            >
              <CoverPhoto
                src={IMG.pantry}
                fallback="/categories/staples.png"
                alt="Household pantry"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-[#fffaf0]/82" />
              <span className="relative z-10 flex h-full flex-col">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white text-msr-navy shadow-sm">
                  <HomeIcon className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-[#8a6a12]">For home</p>
                <h3 className="mt-1 text-[1.45rem] font-extrabold tracking-tight text-msr-navy">The household pantry</h3>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[#5c6070]">
                  Everyday atta, oil, tea and personal care — priced for your kitchen, delivered to your door.
                </p>
                <span className="mt-auto inline-flex items-center pt-5 text-sm font-bold text-msr-navy">
                  Shop for home <ChevronRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
            <Link
              to="/bulk"
              className="group relative isolate min-h-[280px] overflow-hidden px-7 py-9 text-white md:min-h-[320px] md:px-9"
            >
              <CoverPhoto
                src={IMG.kirana}
                fallback="/promos/bulk.png"
                alt="Kirana shop shelves"
                className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
              />
              <span className="absolute inset-0 bg-[#080a3d]/78" />
              <span className="relative z-10 flex h-full flex-col">
                <span className="grid h-12 w-12 place-items-center rounded-full bg-white/10 text-msr-gold">
                  <Store className="h-5 w-5" strokeWidth={1.7} />
                </span>
                <p className="mt-5 text-[11px] font-bold uppercase tracking-[0.16em] text-msr-gold">For kirana</p>
                <h3 className="mt-1 text-[1.45rem] font-extrabold tracking-tight">The shop counter</h3>
                <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-white/75">
                  Case packs, landing rates and GST invoices — built for retailers who restock every week.
                </p>
                <span className="mt-auto inline-flex items-center pt-5 text-sm font-bold text-msr-gold">
                  Stock your store <ChevronRight className="h-4 w-4" />
                </span>
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className="bg-msr-bg">
        <div className="msr-gutter py-8 md:pb-12 md:pt-10">
          <div className="overflow-hidden rounded-2xl border border-[#ece6d4] bg-gradient-to-br from-[#fffaf0] via-[#fff8e8] to-[#eef0ff]">
            <div className="h-[3px] bg-gradient-to-r from-msr-navy via-msr-gold to-msr-navy" />
            <div className="grid md:grid-cols-[1.35fr_0.9fr]">
              <div className="px-6 py-9 md:px-10 md:py-11">
                <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-msr-navy">Wholesale desk</p>
                <h2 className="mt-2 text-[1.7rem] font-extrabold tracking-tight text-msr-navy md:text-[2rem]">
                  Buying for your business?
                </h2>
                <p className="mt-2 max-w-xl text-[15px] leading-relaxed text-[#5c6070]">
                  Landing rates, GST invoices, and dispatch from {locations.length} cities — {products.length} SKUs on
                  the floor.
                </p>
                <ul className="mt-5 grid gap-2 sm:grid-cols-2">
                  {["Wholesale pricing", "Bulk discounts", "GST invoices", "Reliable supply"].map((t) => (
                    <li key={t} className="flex items-center gap-2 text-[13px] text-msr-navy">
                      <span className="grid h-5 w-5 place-items-center rounded-full bg-msr-navy text-msr-gold">
                        <Check className="h-3 w-3" strokeWidth={2.4} />
                      </span>
                      {t}
                    </li>
                  ))}
                </ul>
                <div className="mt-5 flex flex-wrap gap-2">
                  {locations.map((loc) => (
                    <button
                      key={loc.city}
                      type="button"
                      onClick={() => setLocation(loc)}
                      className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition ${
                        loc.postalCode === location.postalCode
                          ? "border-msr-navy bg-msr-navy text-msr-gold"
                          : "border-[#ead9a0] bg-white text-msr-navy hover:border-msr-gold"
                      }`}
                    >
                      {loc.city}
                    </button>
                  ))}
                </div>
                <Link
                  to="/bulk"
                  className="mt-7 inline-flex h-12 items-center justify-center rounded-full bg-msr-navy px-7 text-sm font-bold text-white transition hover:bg-[#1a1878]"
                >
                  Start bulk buying
                  <ChevronRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
              <div className="relative min-h-[200px] md:min-h-full">
                <CoverPhoto
                  src={IMG.aisle}
                  fallback="/promos/bulk.png"
                  alt="Packed grocery aisle"
                  className="absolute inset-0 h-full w-full object-cover"
                />
                <span className="absolute inset-0 bg-gradient-to-l from-transparent via-transparent to-[#fffaf0] max-md:hidden" />
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function CoverPhoto({ src, fallback, alt, className }) {
  return (
    <img
      src={src}
      alt={alt}
      className={className}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(e) => {
        if (e.currentTarget.dataset.fallback === "1") return;
        e.currentTarget.dataset.fallback = "1";
        e.currentTarget.src = fallback;
      }}
    />
  );
}

function ShieldLockIcon({ className }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <path d="M12 3l8 3.2v6.3c0 4.7-3.4 8.2-8 9.5-4.6-1.3-8-4.8-8-9.5V6.2z" />
      <rect x="9" y="11.2" width="6" height="4.6" rx="1" />
      <path d="M10.6 11.2V9.8a1.4 1.4 0 0 1 2.8 0v1.4" />
    </svg>
  );
}

function Promo({ title, text, cta, to, image, imageAlt, offer, kicker, variant = "new" }) {
  const featured = variant === "featured";
  const deal = variant === "deal";

  return (
    <Link
      to={to}
      className={`group relative flex h-full min-h-[210px] items-stretch overflow-hidden rounded-2xl p-5 transition duration-200 hover:-translate-y-1 sm:p-6 ${
        featured
          ? "bg-gradient-to-br from-[#eef0ff] via-white to-[#fff6d6] text-msr-text shadow-[0_4px_18px_rgba(8,10,61,0.06)] ring-1 ring-[#ece6d4] hover:shadow-[0_14px_32px_rgba(39,34,184,0.12)] hover:ring-msr-gold/40"
          : "bg-white text-msr-text shadow-[0_4px_18px_rgba(8,10,61,0.06)] ring-1 ring-[#ece6d4] hover:shadow-[0_14px_32px_rgba(39,34,184,0.12)] hover:ring-[#ead9a0]"
      }`}
    >
      <div className="relative z-10 flex min-w-0 flex-1 flex-col">
        <span
          className={`w-fit rounded-full px-2.5 py-0.5 text-[11px] font-bold uppercase tracking-[0.12em] ${
            featured ? "bg-msr-navy text-msr-gold" : deal ? "bg-amber-100 text-amber-800" : "bg-[#fffaf0] text-[#8a6a12]"
          }`}
        >
          {kicker}
        </span>
        <h3 className="mt-3 text-[1.05rem] font-bold leading-snug tracking-tight text-msr-navy md:text-lg">{title}</h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-msr-muted">{text}</p>
        {offer ? (
          <p className="mt-2 text-[13px] font-semibold text-msr-navy">
            Up to <span className={`text-xl font-extrabold ${deal ? "text-msr-navy" : ""}`}>{offer}</span>
          </p>
        ) : null}
        <span
          className={`mt-auto inline-flex w-fit items-center gap-1 rounded-full px-4 py-2 text-[13px] font-semibold ${
            featured ? "bg-msr-gold text-msr-navy" : "bg-msr-navy text-white"
          }`}
        >
          {cta}
          <ChevronRight className="h-4 w-4" />
        </span>
      </div>
      <div
        className={`ml-3 grid h-[132px] w-[42%] shrink-0 place-items-center self-center overflow-hidden rounded-2xl sm:h-[148px] ${
          featured ? "bg-white/80" : deal ? "bg-amber-50" : "bg-[#fffaf0]"
        }`}
      >
        <img
          src={image}
          alt={imageAlt}
          className="h-[82%] w-[82%] object-contain transition duration-300 group-hover:scale-105"
        />
      </div>
    </Link>
  );
}
