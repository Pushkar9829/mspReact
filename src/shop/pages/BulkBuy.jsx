import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { Check, ChevronRight, FileText, Package, Truck } from "lucide-react";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import { useDeliveryLocation } from "../context/LocationContext.jsx";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { SectionTitle } from "../components/shopUi.jsx";
import { inr } from "../../shared/lib/format.js";
import { useCart } from "../context/CartContext.jsx";
import SlabTable, { bulkRulesText } from "../components/SlabTable.jsx";

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
  const { findLine } = useCart();
  const eligible = filterProducts({ bulkEligible: true });
  const featured = eligible.filter((p) => p.bestseller);
  const rest = eligible.filter((p) => !featured.some((f) => f.id === p.id));
  const list = [...featured, ...rest];
  const { hash } = useLocation();

  useEffect(() => {
    if (!hash || !list.length) return;
    const el = document.getElementById(hash.slice(1));
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [hash, list.length]);

  return (
    <div className="bg-msr-bg pb-12">
      <section className="bg-msr-navy text-white">
        <div className="h-[3px] bg-gradient-to-r from-msr-gold via-white/40 to-msr-gold" />
        <div className="msr-gutter grid gap-8 py-10 md:grid-cols-[1.15fr_0.85fr] md:items-center md:py-14">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-msr-gold">Wholesale desk</p>
            <h1 className="mt-3 text-[2rem] font-extrabold tracking-tight md:text-[2.4rem]">Bulk buy for business</h1>
            <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-white/70">
              Selected SKUs sold by the case pack. Buy more packs of a size to unlock a lower price per pack — the cart
              applies the right slab automatically. Bulk lines sit separately from items you add one at a time elsewhere
              in the shop.
            </p>
            <ul className="mt-6 grid gap-2 sm:grid-cols-2">
              {["Wholesale pricing slabs", "Max qty controls", "GST invoices", "PO checkout supported"].map((t) => (
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
                Browse eligible SKUs
                <ChevronRight className="ml-1 h-4 w-4" />
              </a>
              <Link
                to="/cart"
                className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-sm font-bold text-white hover:border-msr-gold hover:text-msr-gold"
              >
                Go to cart / checkout
              </Link>
            </div>
          </div>
          <div className="relative min-h-[220px] overflow-hidden rounded-2xl md:min-h-[320px]">
            <img
              src={WAREHOUSE}
              alt="Warehouse dispatch"
              className="absolute inset-0 h-full w-full object-cover"
              referrerPolicy="no-referrer"
            />
            <span className="absolute inset-0 bg-gradient-to-l from-transparent to-msr-ink/40" />
          </div>
        </div>
      </section>

      <div className="msr-gutter py-8 md:py-10">
        <div className="grid gap-3 md:grid-cols-3 md:gap-4">
          {PERKS.map(({ icon: Icon, title, text, to }) => (
            <Link
              key={title}
              to={to}
              className="group rounded-2xl border border-msr-line bg-white px-5 py-6 transition hover:-translate-y-1 hover:ring-1 hover:ring-msr-line"
            >
              <span className="grid h-11 w-11 place-items-center rounded-full border border-msr-line bg-msr-surface text-msr-navy transition-colors group-hover:border-msr-gold group-hover:bg-msr-navy group-hover:text-msr-gold">
                <Icon className="h-5 w-5" strokeWidth={1.6} />
              </span>
              <h2 className="mt-4 text-[16px] font-bold tracking-tight text-msr-navy">{title}</h2>
              <p className="mt-1.5 text-[13px] leading-relaxed text-msr-muted">{text}</p>
            </Link>
          ))}
        </div>

        {list.length ? (
          <section id="bulk-skus" className="mt-10 scroll-mt-24">
            <SectionTitle title="Bulk-eligible case packs" subtitle={`${list.length} SKUs open for wholesale`} />
            <div className={PRODUCT_GRID}>
              {list.map((p) => (
                <div
                  key={p.id}
                  id={`bulk-${p.id}`}
                  className={`flex scroll-mt-36 flex-col rounded-2xl ${
                    hash === `#bulk-${p.id}` ? "ring-2 ring-msr-gold ring-offset-2" : ""
                  }`}
                >
                  <ProductCard product={p} bulk />
                  <div className="-mt-1 rounded-b-2xl border border-t-0 border-msr-line bg-white px-3 pb-3 pt-2">
                    <p className="text-[11px] text-msr-muted">{bulkRulesText(p)}</p>
                    {p.slabs?.length ? (
                      <SlabTable
                        slabs={p.slabs}
                        pack={p.weight}
                        qty={findLine(p.id, p.weight, true)?.qty || 0}
                        className="mt-2"
                      />
                    ) : (
                      <p className="mt-1 text-[11px] text-msr-subtle">From {inr(p.price)}</p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ) : (
          <p className="mt-10 rounded-2xl border border-msr-line bg-white px-6 py-12 text-center text-sm text-msr-muted">
            No bulk-eligible products yet. Store admins can enable Bulk on Products or upload a CSV with max qty and slabs.
          </p>
        )}
      </div>
    </div>
  );
}
