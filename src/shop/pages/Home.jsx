import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, Check, ChevronRight, Flame, Home as HomeIcon, Package, ShieldCheck, Sparkles, Store, Truck } from "lucide-react";
import { discount, needs } from "../data/catalog.js";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import { useDeliveryLocation } from "../context/LocationContext.jsx";
import Hero from "../components/Hero.jsx";
import ProductRail from "../components/ProductRail.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import { SectionTitle, buttonClass } from "../components/shopUi.jsx";

const IMG = {
  pantry: "https://images.unsplash.com/photo-1556910103-1c02745aae4d?auto=format&fit=crop&w=1400&q=80",
  aisle: "https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&w=1400&q=80",
  kirana: "https://images.unsplash.com/photo-1604719312566-8912e9227c6a?auto=format&fit=crop&w=1400&q=80",
};

const TRUST_STRIP = [
  { icon: BadgeCheck, title: "Genuine brands", text: "Sealed FMCG packs", to: "/help#genuine" },
  { icon: Truck, title: "Dispatch in 1–3 days", text: "Across metro cities", to: "/help#shipping" },
  { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards, net banking", to: "/help#payments" },
  { icon: Package, title: "Bulk pricing", text: "GST invoices for retailers", to: "/bulk" },
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

export default function Home() {
  const { products, filterProducts, brands, ready } = useShopCatalog();
  const { location, setLocation, locations } = useDeliveryLocation();

  const featured = BESTSELLER_IDS.map((id) => products.find((p) => p.id === id)).filter(Boolean);
  const tagged = filterProducts({ bestseller: true });
  const bestsellers = [...featured, ...tagged.filter((p) => !BESTSELLER_IDS.includes(p.id))].slice(0, 12);
  const deals = [...products]
    .filter((p) => p.deal || discount(p) > 0)
    .sort((a, b) => discount(b) - discount(a))
    .slice(0, 12);
  const maxOff = products.reduce((n, p) => Math.max(n, discount(p)), 0);
  const loading = !ready && !products.length;

  return (
    <div className="pb-4">
      <section className="msr-gutter pt-4 md:pt-5">
        <div className="grid gap-3 lg:grid-cols-[minmax(0,2.4fr)_minmax(0,1fr)] lg:gap-4">
          <Hero className="aspect-[16/8] sm:aspect-[16/7] lg:aspect-auto lg:min-h-[340px] xl:min-h-[380px]" />
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-1 lg:gap-4">
            <PromoTile
              to="/deals"
              kicker="Deal of the day"
              title={maxOff ? `Up to ${maxOff}% off` : "Daily deals"}
              text="On fast-moving FMCG brands"
              image="/promos/deal.png"
              tone="warm"
            />
            <PromoTile
              to="/bulk"
              kicker="Wholesale"
              title="Bulk savings"
              text="Case packs with GST invoices"
              image="/promos/bulk.png"
              tone="dark"
            />
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-msr-line bg-msr-line lg:mt-4 lg:grid-cols-4">
          {TRUST_STRIP.map(({ icon: Icon, title, text, to }) => (
            <Link key={title} to={to} className="group flex items-center gap-3 bg-white px-4 py-3.5 transition-colors hover:bg-msr-surface">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-msr-primary-soft text-msr-primary">
                <Icon className="h-5 w-5" strokeWidth={1.8} />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-semibold text-msr-ink">{title}</span>
                <span className="block truncate text-[12px] text-msr-muted">{text}</span>
              </span>
            </Link>
          ))}
        </div>
      </section>

      <Section>
        <SectionTitle title="Shop by category" subtitle="Everything for the pantry and the shop counter" to="/category/all" />
        <div className="no-scrollbar -mx-1 flex gap-3 overflow-x-auto px-1 pb-1 md:grid md:grid-cols-8 md:overflow-visible">
          {CATEGORY_STRIP.map((c) => (
            <Link
              key={c.slug}
              to={`/category/${c.slug}`}
              className="group flex w-[88px] shrink-0 flex-col items-center text-center md:w-auto"
            >
              <span
                className={`grid aspect-square w-full place-items-center overflow-hidden rounded-2xl ${c.tint} ring-1 ring-black/[0.03] transition group-hover:-translate-y-0.5 group-hover:shadow-lift`}
              >
                <img src={c.image} alt="" className="h-[74%] w-[74%] object-contain transition duration-300 group-hover:scale-105" />
              </span>
              <span className="mt-2 text-[12.5px] font-semibold leading-snug text-msr-ink group-hover:text-msr-primary">
                {c.name}
              </span>
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <div className="rounded-2xl border border-msr-line bg-white p-4 sm:p-5">
          <SectionTitle
            title={
              <span className="inline-flex items-center gap-2">
                <span className="grid h-7 w-7 place-items-center rounded-lg bg-msr-danger-soft text-msr-danger">
                  <Flame className="h-4 w-4" />
                </span>
                Deals of the day
              </span>
            }
            subtitle={maxOff ? `Save up to ${maxOff}% on everyday essentials` : "Fresh daily deals"}
            to="/deals"
          />
          <ProductRail products={deals} loading={loading} empty={<RailEmpty />} />
        </div>
      </Section>

      <Section>
        <SectionTitle title="Best sellers" subtitle="What households and retailers are stocking up on" to="/category/all" />
        <ProductRail products={bestsellers} loading={loading} empty={<RailEmpty />} />
      </Section>

      {brands.length ? (
        <Section>
          <SectionTitle title="Top brands" subtitle="Trusted manufacturers on the MS₹ floor" to="/brands" />
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            {brands.slice(0, 12).map((b) => (
              <Link
                key={b.slug}
                to={`/category/all?q=${encodeURIComponent(b.name)}`}
                className="group flex items-center gap-3 rounded-2xl border border-msr-line bg-white px-3.5 py-3 transition hover:border-msr-primary/40 hover:shadow-card"
              >
                <BrandLogo className="h-9 w-9" alt="" />
                <span className="min-w-0 truncate text-[13px] font-semibold text-msr-ink group-hover:text-msr-primary">{b.name}</span>
              </Link>
            ))}
          </div>
        </Section>
      ) : null}

      <Section>
        <SectionTitle title="Shop by need" to="/category/all" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {needs.map((n) => (
            <Link
              key={n.slug}
              to={n.to}
              className="group flex items-center gap-3 rounded-2xl border border-msr-line bg-white p-3 transition hover:border-msr-primary/40 hover:shadow-card"
            >
              <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-msr-surface sm:h-16 sm:w-16">
                <CoverPhoto
                  src={n.image}
                  fallback={n.fallback}
                  alt=""
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </span>
              <span className="min-w-0 flex-1 text-[13px] font-semibold leading-snug text-msr-ink group-hover:text-msr-primary">
                {n.name}
              </span>
              <ChevronRight className="hidden h-4 w-4 shrink-0 text-msr-subtle sm:block" />
            </Link>
          ))}
        </div>
      </Section>

      <Section>
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <SplitCard
            to="/category/staples"
            image={IMG.pantry}
            fallback="/categories/staples.png"
            icon={HomeIcon}
            kicker="For home"
            title="The household pantry"
            text="Everyday atta, oil, tea and personal care — priced for your kitchen."
            cta="Shop for home"
          />
          <SplitCard
            to="/bulk"
            image={IMG.kirana}
            fallback="/promos/bulk.png"
            icon={Store}
            kicker="For kirana"
            title="The shop counter"
            text="Case packs, landing rates and GST invoices for weekly restocks."
            cta="Stock your store"
          />
        </div>
      </Section>

      <Section>
        <div className="overflow-hidden rounded-2xl bg-msr-brand text-white">
          <div className="grid md:grid-cols-[1.3fr_1fr]">
            <div className="px-6 py-9 md:px-10 md:py-12">
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-2.5 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-msr-gold">
                <Sparkles className="h-3.5 w-3.5" />
                Wholesale desk
              </p>
              <h2 className="mt-4 text-2xl font-extrabold tracking-tight md:text-[2rem] md:leading-tight">Buying for your business?</h2>
              <p className="mt-2 max-w-xl text-[14px] leading-relaxed text-white/65">
                Landing rates, GST invoices and dispatch from {locations.length} cities — {products.length} SKUs ready to ship.
              </p>
              <ul className="mt-5 grid max-w-md gap-2 sm:grid-cols-2">
                {["Wholesale pricing", "Bulk discounts", "GST invoices", "Reliable supply"].map((t) => (
                  <li key={t} className="flex items-center gap-2 text-[13px] text-white/85">
                    <span className="grid h-5 w-5 place-items-center rounded-full bg-msr-success">
                      <Check className="h-3 w-3" strokeWidth={3} />
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
                    className={`h-8 rounded-full px-3 text-[12px] font-semibold transition ${
                      loc.postalCode === location.postalCode
                        ? "bg-white text-msr-brand"
                        : "border border-white/20 text-white/80 hover:border-white/50 hover:text-white"
                    }`}
                  >
                    {loc.city}
                  </button>
                ))}
              </div>
              <Link to="/bulk" className={buttonClass({ variant: "gold", size: "lg", className: "mt-7" })}>
                Start bulk buying
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative min-h-[220px]">
              <CoverPhoto src={IMG.aisle} fallback="/promos/bulk.png" alt="Packed grocery aisle" className="absolute inset-0 h-full w-full object-cover" />
              <span className="absolute inset-0 bg-gradient-to-r from-msr-brand via-msr-brand/30 to-transparent max-md:bg-gradient-to-t" />
            </div>
          </div>
        </div>
      </Section>
    </div>
  );
}

function Section({ children }) {
  return <section className="msr-gutter pt-8 md:pt-10">{children}</section>;
}

function RailEmpty() {
  return (
    <p className="rounded-2xl border border-dashed border-msr-line-strong bg-white py-10 text-center text-sm text-msr-muted">
      Nothing here yet.{" "}
      <Link to="/category/all" className="font-semibold text-msr-primary hover:underline">
        Browse all products
      </Link>
    </p>
  );
}

function PromoTile({ to, kicker, title, text, image, tone }) {
  const dark = tone === "dark";
  return (
    <Link
      to={to}
      className={`group relative flex min-h-[132px] overflow-hidden rounded-2xl p-4 transition hover:shadow-lift sm:p-5 lg:min-h-0 ${
        dark ? "bg-msr-brand text-white" : "bg-gradient-to-br from-[#fff4d9] to-[#ffe7b8] text-msr-ink"
      }`}
    >
      <div className="relative z-10 flex min-w-0 flex-col">
        <span className={`text-[10.5px] font-bold uppercase tracking-[0.12em] ${dark ? "text-msr-gold" : "text-msr-warning-ink"}`}>
          {kicker}
        </span>
        <span className="mt-1.5 text-[17px] font-extrabold leading-tight tracking-tight sm:text-xl">{title}</span>
        <span className={`mt-1 hidden text-[12.5px] sm:block ${dark ? "text-white/65" : "text-msr-ink/65"}`}>{text}</span>
        <span className={`mt-auto inline-flex items-center gap-1 pt-3 text-[12.5px] font-bold ${dark ? "text-white" : "text-msr-ink"}`}>
          Shop now <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
        </span>
      </div>
      <img
        src={image}
        alt=""
        className="pointer-events-none absolute -bottom-2 -right-2 h-[62%] w-auto max-w-[48%] object-contain transition duration-300 group-hover:scale-105 lg:h-[78%]"
      />
    </Link>
  );
}

function SplitCard({ to, image, fallback, icon: Icon, kicker, title, text, cta }) {
  return (
    <Link to={to} className="group relative isolate flex min-h-[240px] overflow-hidden rounded-2xl p-6 text-white md:min-h-[280px] md:p-8">
      <CoverPhoto src={image} fallback={fallback} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
      <span className="absolute inset-0 -z-10 bg-gradient-to-t from-msr-brand via-msr-brand/70 to-msr-brand/20" />
      <span className="flex flex-col justify-end">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/15 backdrop-blur">
          <Icon className="h-5 w-5" strokeWidth={1.8} />
        </span>
        <span className="mt-4 text-[11px] font-bold uppercase tracking-[0.14em] text-msr-gold">{kicker}</span>
        <span className="mt-1 text-xl font-extrabold tracking-tight md:text-2xl">{title}</span>
        <span className="mt-1.5 max-w-sm text-[13.5px] leading-relaxed text-white/75">{text}</span>
        <span className="mt-4 inline-flex items-center gap-1 text-[13px] font-bold">
          {cta} <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
        </span>
      </span>
    </Link>
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
