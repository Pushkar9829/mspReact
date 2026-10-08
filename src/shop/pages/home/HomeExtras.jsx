/**
 * Lower home-page sections:
 *  - SellersShowcase: store cards (cover band, logo/monogram, location, facts, "Visit store"). When
 *    there are fewer than four stores a "Sell on MS₹" card fills the row instead of empty space.
 *  - BrandsShowcase: compact brand tiles (monogram/logo, name, product count) in tidy rows.
 *  - BusinessBand: the business-account pitch as a navy band with four benefit tiles.
 * Everything shown comes from the API (stores, brand facets) — no invented numbers.
 */
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, Boxes, ChevronRight, FileText, MapPin, Package, RotateCcw, Store, Truck, Wallet } from "lucide-react";
import { Button, cn, Skeleton } from "../../components/ui/index.js";
import { usePublicSettings, usePublicStores } from "../../hooks/index.js";
import { normalizeState } from "../../lib/indianAddress.js";
import { formatListing } from "../../lib/money.js";
import { displayName, initialsOf } from "../../lib/text.js";

const COVERS = [
  "from-[#0f7a4a] to-[#0b4a2e]",
  "from-[#161d4d] to-[#0b1033]",
  "from-[#9a3412] to-[#7a2a06]",
  "from-[#23468f] to-[#152c5c]",
  "from-[#6e4f00] to-[#4a3500]",
];
const TONES = ["bg-shop-primary-soft text-shop-primary-ink", "bg-shop-gold-soft text-shop-gold-ink", "bg-shop-info-soft text-shop-info-ink", "bg-shop-saffron-soft text-shop-saffron-ink", "bg-shop-well text-shop-ink"];
function pick(list, key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return list[h % list.length];
}

function SectionHead({ id, title, description, to, action, icon: Icon }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div className="min-w-0">
        <h2 id={id} className="flex items-center gap-2 font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
          {Icon ? <Icon className="size-5 text-shop-primary-ink" strokeWidth={2.2} aria-hidden /> : null}
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-shop-sm text-shop-muted">{description}</p> : null}
      </div>
      {to ? (
        <Link to={to} className="group inline-flex min-h-10 shrink-0 items-center gap-1 rounded-full px-3 text-shop-sm font-semibold text-shop-primary-ink hover:bg-shop-primary-soft pointer-coarse:min-h-11">
          {action}
          <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ sellers */

function StoreCard({ store }) {
  const name = displayName(store.name);
  const modes = store.deliveryModes || [];
  const facts = [
    store.productCount != null ? { icon: Package, text: `${store.productCount} product${store.productCount === 1 ? "" : "s"}` } : null,
    modes.includes("delivery_partner") ? { icon: Truck, text: "Delivery" } : null,
    modes.includes("store_pickup") ? { icon: Store, text: "Pickup" } : null,
  ].filter(Boolean);
  const place = [store.city, normalizeState(store.state)].filter(Boolean).join(", ");

  return (
    <li className="group relative flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card transition-[box-shadow,transform] duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-22px_rgba(11,16,51,0.45)] has-[a:focus-visible]:ring-2 has-[a:focus-visible]:ring-shop-primary motion-reduce:hover:translate-y-0">
      <div aria-hidden className={cn("relative h-16 bg-gradient-to-br", pick(COVERS, store.slug || name))}>
        <div className="absolute inset-0 opacity-25 [background-image:radial-gradient(rgba(255,255,255,0.8)_1px,transparent_1px)] [background-size:14px_14px]" />
      </div>
      <div className="relative flex flex-1 flex-col px-4 pb-4">
        <span aria-hidden className="-mt-8 mb-2 grid size-16 place-items-center overflow-hidden rounded-2xl bg-white shadow-md ring-4 ring-shop-card">
          {store.logo ? (
            <img src={store.logo} alt="" loading="lazy" className="size-full object-cover" />
          ) : (
            <span className={cn("grid size-full place-items-center font-display text-shop-lg font-bold", pick(TONES, name))}>{initialsOf(name)}</span>
          )}
        </span>
        <Link to={`/store/${store.slug}`} className="line-clamp-2 font-display text-shop-md font-bold leading-snug text-shop-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none">
          {name}
        </Link>
        {place ? (
          <p className="mt-1 flex items-center gap-1 text-shop-sm text-shop-muted">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{place}</span>
          </p>
        ) : null}
        {facts.length ? (
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {facts.map((f) => (
              <li key={f.text} className="inline-flex items-center gap-1 rounded-full bg-shop-page px-2.5 py-1 text-shop-xs font-medium text-shop-text ring-1 ring-shop-line">
                <f.icon className="size-3.5 text-shop-muted" strokeWidth={1.75} aria-hidden />
                {f.text}
              </li>
            ))}
          </ul>
        ) : null}
        {store.minOrderValue > 0 ? <p className="mt-2 text-shop-xs text-shop-muted">Minimum order {formatListing(store.minOrderValue)}</p> : null}
        <span className="mt-auto flex items-center gap-1 pt-4 text-shop-sm font-semibold text-shop-primary-ink">
          Visit store <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" aria-hidden />
        </span>
      </div>
    </li>
  );
}

function SellOnCard({ email }) {
  const href = email ? `mailto:${email}?subject=${encodeURIComponent("Selling on MS₹ Market Server Price")}` : "/help";
  const external = Boolean(email);
  const body = (
    <>
      <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-shop-gold/20 blur-2xl" />
      <span className="relative grid size-12 place-items-center rounded-2xl bg-white/10 text-shop-gold ring-1 ring-white/15">
        <Store className="size-6" strokeWidth={1.75} aria-hidden />
      </span>
      <span className="relative mt-4 block font-display text-shop-lg font-bold leading-snug">Sell on MS₹</span>
      <span className="relative mt-1 block text-shop-sm text-shop-on-navy-muted">Reach shops, restaurants and resellers. You invoice under your own GSTIN.</span>
      <span className="relative mt-auto inline-flex items-center gap-1 pt-4 text-shop-sm font-semibold text-shop-gold">
        Talk to us <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
      </span>
    </>
  );
  const cls = "group relative flex h-full flex-col overflow-hidden rounded-[1.25rem] bg-shop-navy p-5 text-white transition-colors hover:bg-shop-navy-2";
  return (
    <li className="min-w-0">
      {external ? (
        <a href={href} className={cls}>
          {body}
        </a>
      ) : (
        <Link to={href} className={cls}>
          {body}
        </Link>
      )}
    </li>
  );
}

export function SellersShowcase() {
  const res = usePublicStores({ sort: "products", limit: 8 });
  const settings = usePublicSettings();
  const stores = res.data?.stores || [];
  if (res.isPending)
    return (
      <section aria-label="Sellers">
        <Skeleton className="mb-4 h-7 w-56" />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-56 rounded-[1.25rem]" />
          ))}
        </div>
      </section>
    );
  if (!stores.length) return null;
  const shown = stores.slice(0, stores.length >= 4 ? 4 : 3);
  return (
    <section aria-labelledby="home-sellers">
      <SectionHead id="home-sellers" icon={Store} title="Sellers on the marketplace" description="Every order is invoiced by the seller, with their GSTIN on the bill." to="/stores" action="All sellers" />
      <ul className="fill-row">
        {shown.map((s) => (
          <StoreCard key={s.id} store={s} />
        ))}
        {shown.length < 4 ? <SellOnCard email={settings.data?.supportEmail} /> : null}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ brands */

export function BrandsShowcase({ sample }) {
  const brands = (sample.data?.facets?.brands || [])
    .slice()
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, 12);
  if (sample.isPending)
    return (
      <section aria-label="Brands">
        <Skeleton className="mb-4 h-7 w-48" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          {Array.from({ length: 12 }, (_, i) => (
            <Skeleton key={i} className="h-[4.5rem] rounded-2xl" />
          ))}
        </div>
      </section>
    );
  if (!brands.length) return null;
  return (
    <section aria-labelledby="home-brands">
      <SectionHead id="home-brands" icon={Package} title="Popular brands" description="Genuine stock from brand distributors and wholesalers" to="/brands" action="All brands" />
      <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {brands.map((b) => {
          const name = displayName(b.name);
          return (
            <li key={b.slug}>
              <Link
                to={`/category/all?brand=${encodeURIComponent(b.slug)}`}
                className="group flex h-[4.5rem] items-center gap-3 rounded-2xl border border-shop-line bg-shop-card px-3 transition-[border-color,box-shadow] hover:border-shop-primary/50 hover:shadow-[0_10px_24px_-18px_rgba(11,16,51,0.5)]"
              >
                {b.logo ? (
                  <img src={b.logo} alt="" loading="lazy" className="size-11 shrink-0 rounded-xl bg-white object-contain p-1 ring-1 ring-shop-line" />
                ) : (
                  <span aria-hidden className={cn("grid size-11 shrink-0 place-items-center rounded-xl font-display text-shop-base font-bold", pick(TONES, name))}>
                    {initialsOf(name)}
                  </span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-shop-sm font-semibold text-shop-ink">{name}</span>
                  <span className="block text-shop-xs text-shop-muted">
                    {b.count} product{b.count === 1 ? "" : "s"}
                  </span>
                </span>
                <ChevronRight className="size-4 shrink-0 text-shop-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-shop-primary-ink" aria-hidden />
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/* ------------------------------------------------------------------ business band */

const BENEFITS = [
  { icon: Boxes, title: "Slab prices", text: "Prices drop as you buy more" },
  { icon: FileText, title: "GST invoices", text: "From every seller, for input tax credit" },
  { icon: Wallet, title: "Credit & POs", text: "For approved businesses" },
  { icon: RotateCcw, title: "One-tap reorder", text: "Repeat any past order" },
];

export function BusinessBand({ signedIn }) {
  return (
    <section aria-labelledby="home-cta" className="relative isolate overflow-hidden rounded-[1.5rem] bg-shop-navy text-white">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(80%_120%_at_100%_0%,rgba(233,185,73,0.22),transparent_55%),radial-gradient(60%_90%_at_0%_100%,rgba(15,122,74,0.35),transparent_60%)]" />
      <div className="relative grid gap-6 p-6 sm:p-8 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center lg:gap-10 lg:p-10">
        <div className="min-w-0">
          <p className="text-shop-xs font-semibold uppercase tracking-wider text-shop-gold">For businesses</p>
          <h2 id="home-cta" className="mt-1.5 font-display text-shop-xl font-bold leading-tight sm:text-shop-2xl">
            {signedIn ? "Buying in volume? Get more from your account" : "Buying for a shop, restaurant or hotel?"}
          </h2>
          <ul className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            {BENEFITS.map((b) => (
              <li key={b.title} className="flex items-start gap-3 rounded-2xl bg-white/[0.06] p-3.5 ring-1 ring-white/10">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-shop-gold/15 text-shop-gold">
                  <b.icon className="size-[18px]" strokeWidth={1.9} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-shop-sm font-semibold">{b.title}</span>
                  <span className="block text-shop-xs text-shop-on-navy-muted">{b.text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row lg:flex-col">
          {signedIn ? (
            <>
              <Button to="/bulk" variant="gold" size="lg" className="rounded-full">
                Explore bulk buying
              </Button>
              <Link to="/account/credit" className="inline-flex h-12 items-center justify-center rounded-full px-6 text-shop-base font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">
                Credit & account
              </Link>
            </>
          ) : (
            <>
              <Button to="/register" variant="gold" size="lg" className="rounded-full">
                Open a business account
              </Button>
              <Link to="/login" state={{ from: "/" }} className="inline-flex h-12 items-center justify-center rounded-full px-6 text-shop-base font-semibold text-white ring-1 ring-white/30 transition-colors hover:bg-white/10">
                Sign in
              </Link>
            </>
          )}
        </div>
      </div>
    </section>
  );
}
