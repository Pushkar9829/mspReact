import { Link } from "react-router-dom";
import { Check, ChevronRight, FileText, Package, Truck } from "lucide-react";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import { useDeliveryLocation } from "../context/LocationContext.jsx";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { SectionTitle } from "../components/shopUi.jsx";

const WAREHOUSE =
  "https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1400&q=80";

const PERKS = [
  { icon: Package, title: "Case packs", text: "Outer units and landing rates, not just retail jars.", to: "/category/all" },
  { icon: FileText, title: "GST invoices", text: "A tax invoice on every bulk order.", to: "/help#payments" },
  { icon: Truck, title: "Warehouse dispatch", text: "Metro 1–3 days; bulk may ship from the nearest hub.", to: "/help#shipping" },
];

export default function BulkBuy() {
  const { products, filterProducts } = useShopCatalog();
  const { location, setLocation, locations } = useDeliveryLocation();
  const featured = filterProducts({ bestseller: true });
  const rest = products.filter((p) => !featured.some((f) => f.id === p.id));
  const list = [...featured, ...rest];

  return (
    <div className="bg-msr-bg pb-12">
      <section className="bg-msr-navy text-white">
        <div className="h-[3px] bg-gradient-to-r from-msr-gold via-white/40 to-msr-gold" />
        <div className="msr-gutter grid gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-14">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-msr-gold">Wholesale desk</p>
            <h1 className="mt-3 text-[2rem] font-extrabold tracking-tight md:text-[2.4rem]">Bulk buy for business</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
              Landing rates, GST invoices, and dispatch from {locations.length} cities — built for kiranas, HORECA and
              distributors.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {["Wholesale pricing", "Bulk discounts", "GST invoices", "Reliable supply"].map((t) => (
                <li key={t} className="flex items-center gap-2 text-[13px] text-white/90">
                  <span className="grid h-5 w-5 place-items-center rounded-full bg-msr-gold text-msr-navy">
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
                      ? "border-msr-gold bg-msr-gold text-msr-navy"
                      : "border-white/20 bg-white/5 text-white/80 hover:border-msr-gold"
                  }`}
                >
                  {loc.city}
                </button>
              ))}
            </div>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                to="/register"
                className="inline-flex h-12 items-center rounded-full bg-msr-gold px-6 text-sm font-bold text-msr-navy"
              >
                Register as retailer
              </Link>
              <a
                href="#bulk-skus"
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-bold text-white hover:border-msr-gold hover:text-msr-gold"
              >
                Browse case packs
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
            </div>
          </div>
          <div className="relative min-h-[220px] overflow-hidden rounded-2xl md:min-h-[320px]">
            <img
              src={WAREHOUSE}
              alt="Warehouse dispatch"
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute inset-0 bg-gradient-to-l from-transparent to-[#080a3d]/40" />
          </div>
        </div>
      </section>

      <div className="msr-gutter py-8 md:py-10">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {PERKS.map(({ icon: Icon, title, text, to }) => (
            <Link
              key={title}
              to={to}
              className="group rounded-2xl border border-[#ece6d4] bg-white px-5 py-6 transition hover:-translate-y-1 hover:ring-1 hover:ring-[#ead9a0]"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-[#ead9a0] bg-[#fffaf0] text-msr-navy transition-colors group-hover:border-msr-gold group-hover:bg-msr-navy group-hover:text-msr-gold">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <h2 className="mt-4 text-[16px] font-bold tracking-tight text-msr-navy">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-[#6b6f7e]">{text}</p>
            </Link>
          ))}
        </div>

        {list.length ? (
          <section id="bulk-skus" className="mt-10 scroll-mt-24">
            <SectionTitle title="Popular case packs" to="/category/all" />
            <div className={PRODUCT_GRID}>
              {list.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-10 rounded-2xl border border-[#ece6d4] bg-white px-6 py-12 text-center text-sm text-msr-muted">
            Case packs will show here once the floor is stocked.
          </p>
        )}
      </div>
    </div>
  );
}
