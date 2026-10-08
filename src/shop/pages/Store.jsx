/**
 * /store/:slug — a seller's storefront: who they are (GET /tenants/public/:slug), their directory
 * stats (GET /tenants/public?q=slug: logo, city, rating, delivery modes, min. order), store-scoped
 * buyer rules (GET /settings/public?tenantSlug=…), their coupons, their categories (search facets)
 * and their products (server search with tenantId), with the usual URL filters.
 *
 * The category chips use `?cat=<slug>` and stay inside the store; the filter panel's category links
 * (which go to /category/…) are hidden here so a buyer never drops out of the store by accident.
 */
import { useMemo, useState } from "react";
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import {
  BadgeCheck,
  Banknote,
  Check,
  Copy,
  LifeBuoy,
  MapPin,
  PackageCheck,
  ReceiptText,
  RotateCcw,
  Star,
  Store as StoreIcon,
  Tag,
  Truck,
  Undo2,
  Wallet,
} from "lucide-react";
import { useCartCoupons, useProducts, usePublicSettings, usePublicStore, usePublicStores } from "../hooks/index.js";
import { BrandMonogram, Button, EmptyState, Notice, PageSkeleton, cn, toast } from "../components/ui/index.js";
import { ProductListing } from "./discovery/ProductListing.jsx";
import { formatListing } from "../lib/money.js";
import { normalizeState } from "../lib/indianAddress.js";
import { displayName } from "../lib/text.js";
import { formatDate } from "../../shared/lib/format.js";

const HIDE = ["seller", "category"];

function etaOf(zones = []) {
  const mins = zones.map((z) => z.etaDaysMin).filter((n) => n != null);
  const maxs = zones.map((z) => z.etaDaysMax).filter((n) => n != null);
  return mins.length && maxs.length ? { min: Math.min(...mins), max: Math.max(...maxs) } : null;
}
const days = (min, max) => `${min === max ? min : `${min}–${max}`} day${max === 1 ? "" : "s"}`;

function Fact({ icon: Icon, children, iconClass = "text-shop-primary-ink" }) {
  return (
    <li className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-shop-well px-3 py-1.5 text-shop-sm text-shop-text">
      <Icon className={cn("size-4 shrink-0", iconClass)} strokeWidth={1.75} aria-hidden />
      <span>{children}</span>
    </li>
  );
}

function Trust({ icon: Icon, children }) {
  return (
    <li className="inline-flex items-center gap-1.5">
      <Icon className="size-4 shrink-0 text-shop-primary" strokeWidth={1.75} aria-hidden />
      {children}
    </li>
  );
}

/** Store facts card: delivery, pickup, minimum order, rating (only with reviews), buyer rules and help. */
function StoreHero({ store, row, settings }) {
  const zones = (store.deliveryZones || []).filter((z) => z?.name || z?.etaDaysMin != null);
  const eta = etaOf(zones);
  const modes = row?.deliveryModes || [];
  const city = store.pickupCity || row?.city || "";
  const place = [displayName(city), normalizeState(row?.state || "")].filter(Boolean).join(", ");
  const s = settings || {};
  const hasRating = row?.rating != null && row?.ratingCount > 0;

  return (
    <section aria-label="About this seller" className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
      <div className="grid gap-3 p-4 sm:p-5">
        <ul className="flex flex-wrap gap-2">
          {place ? <Fact icon={MapPin}>Ships from {place}</Fact> : null}
          {eta ? <Fact icon={Truck}>Delivers in {days(eta.min, eta.max)}</Fact> : null}
          {modes.includes("store_pickup") ? <Fact icon={PackageCheck}>Store pickup available</Fact> : null}
          {row?.minOrderValue > 0 ? <Fact icon={Wallet}>Min. order {formatListing(row.minOrderValue)}</Fact> : null}
          {hasRating ? (
            <Fact icon={Star} iconClass="fill-current text-shop-gold-ink">
              <span className="font-semibold tabular-nums">{Number(row.rating).toFixed(1)}</span>{" "}
              <span className="text-shop-muted">
                ({row.ratingCount.toLocaleString("en-IN")} review{row.ratingCount === 1 ? "" : "s"})
              </span>
            </Fact>
          ) : null}
        </ul>
        {zones.length > 1 ? (
          <details className="group text-shop-sm">
            <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1 font-semibold text-shop-primary-ink hover:underline [&::-webkit-details-marker]:hidden">
              Delivery zones ({zones.length})
            </summary>
            <ul className="mt-1 grid gap-1 sm:grid-cols-2 lg:grid-cols-3">
              {zones.map((z, i) => (
                <li key={`${z.name}-${i}`} className="flex items-center justify-between gap-3 rounded-xl bg-shop-page/60 px-3 py-2">
                  <span className="truncate text-shop-ink">{z.name || "Zone"}</span>
                  {z.etaDaysMin != null && z.etaDaysMax != null ? <span className="shrink-0 tabular-nums text-shop-muted">{days(z.etaDaysMin, z.etaDaysMax)}</span> : null}
                </li>
              ))}
            </ul>
          </details>
        ) : zones.length === 1 && zones[0].name ? (
          <p className="text-shop-sm text-shop-muted">Delivery zone: {zones[0].name}</p>
        ) : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-shop-line bg-shop-page/60 px-4 py-3 sm:px-5">
        <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-shop-sm text-shop-text">
          <Trust icon={ReceiptText}>GST invoice from the seller</Trust>
          {s.returnsEnabled ? <Trust icon={Undo2}>Easy returns{Number(s.returnWindowDays) > 0 ? ` within ${s.returnWindowDays} days` : ""}</Trust> : null}
          {s.codEnabled ? <Trust icon={Banknote}>Cash on delivery</Trust> : null}
          {Number(s.freeDeliveryAbove) > 0 ? <Trust icon={Truck}>Free delivery above {formatListing(s.freeDeliveryAbove)}</Trust> : null}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button to="/help#contact" variant="secondary" size="sm" leftIcon={LifeBuoy}>
            Help &amp; support
          </Button>
          <Button to="/stores" variant="ghost" size="sm" leftIcon={StoreIcon}>
            All sellers
          </Button>
        </div>
      </div>
    </section>
  );
}

/** Coupons this seller runs (same source and look as the PDP offers). Hidden when there are none. */
function StoreCoupons({ tenantId }) {
  const q = useCartCoupons({ tenantId });
  const [copied, setCopied] = useState("");
  const rows = (q.data?.coupons || []).filter((c) => String(c.tenantId || c.store?.id || "") === String(tenantId));
  if (q.isPending) return <div className="h-16 rounded-xl shop-skeleton" aria-hidden />;
  if (!rows.length) return null;
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Copied ${code}`, { description: "Apply it in your cart." });
    } catch {
      toast(`Code: ${code}`);
    }
  };
  return (
    <section aria-labelledby="store-coupons" className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="store-coupons" className="flex items-center gap-1.5 text-shop-sm font-semibold text-shop-ink">
          <Tag className="size-4 text-shop-saffron-ink" strokeWidth={1.75} aria-hidden /> Offers from this seller
        </h2>
        {rows.length > 3 ? (
          <Link to="/account/coupons" className="inline-flex min-h-11 items-center text-shop-sm font-semibold text-shop-primary-ink hover:underline">
            All {rows.length}
          </Link>
        ) : null}
      </div>
      <ul className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
        {rows.slice(0, 3).map((c) => {
          const cond = [
            Number(c.minCartValue) > 0 ? `above ${formatListing(c.minCartValue)}` : "",
            c.appliesTo === "bulk" ? "bulk lines only" : c.appliesTo === "regular" ? "regular lines only" : "",
            c.firstOrderOnly ? "first order only" : "",
            c.endsAt ? `till ${formatDate(c.endsAt)}` : "",
          ].filter(Boolean);
          return (
            <li key={c.id} className="flex items-stretch overflow-hidden rounded-xl border border-shop-line bg-shop-card">
              <span className="grid w-16 shrink-0 place-items-center border-r border-dashed border-shop-line-strong bg-shop-saffron-soft px-1 text-center font-display text-shop-sm font-bold leading-tight text-shop-saffron-ink">
                {c.type === "percent" ? `${c.value}%` : formatListing(c.value)}
                <br />
                <span className="text-shop-xs font-semibold">OFF</span>
              </span>
              <div className="min-w-0 flex-1 px-3 py-2">
                <p className="truncate text-shop-sm font-semibold text-shop-ink">{c.name || c.code}</p>
                <p className="line-clamp-2 text-shop-xs text-shop-muted">{c.description || (cond.length ? cond.join(" · ") : "On this seller’s products")}</p>
                {c.applied ? <p className="mt-0.5 text-shop-xs font-semibold text-shop-primary-ink">Applied to your cart</p> : null}
              </div>
              <button
                type="button"
                onClick={() => copy(c.code)}
                className="m-2 inline-flex min-h-10 shrink-0 items-center gap-1.5 self-center rounded-lg border border-dashed border-shop-line-strong bg-shop-page px-2.5 font-mono text-shop-xs font-bold tracking-wide text-shop-ink transition-colors hover:border-shop-primary hover:text-shop-primary-ink pointer-coarse:min-h-11"
                aria-label={`Copy coupon code ${c.code}`}
              >
                {copied === c.code ? <Check className="size-3.5 text-shop-primary" aria-hidden /> : <Copy className="size-3.5" aria-hidden />}
                {c.code}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

/** The store's categories (from its search facets) as in-store filter chips: ?cat=<slug>. */
function CategoryChips({ categories, current }) {
  const [params] = useSearchParams();
  const { pathname } = useLocation();
  if (categories.length < 2 && !current) return null;
  const href = (slug) => {
    const next = new URLSearchParams(params);
    if (slug) next.set("cat", slug);
    else next.delete("cat");
    next.delete("page");
    const qs = next.toString();
    return `${pathname}${qs ? `?${qs}` : ""}`;
  };
  const cls = (on) =>
    cn(
      "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-shop-sm font-medium transition-colors pointer-coarse:h-11",
      on ? "border-shop-ink bg-shop-ink text-white" : "border-shop-line-strong bg-shop-card text-shop-ink hover:border-shop-primary"
    );
  const known = categories.some((c) => c.slug === current);
  return (
    <nav aria-label="This seller’s categories" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
      <Link to={href("")} aria-current={!current ? "page" : undefined} className={cls(!current)}>
        All products
      </Link>
      {current && !known ? (
        <Link to={href(current)} aria-current="page" className={cls(true)}>
          {displayName(current.replace(/-/g, " "))}
        </Link>
      ) : null}
      {categories.map((c) => (
        <Link key={c.slug} to={href(c.slug)} aria-current={current === c.slug ? "page" : undefined} className={cls(current === c.slug)}>
          {displayName(c.name)}
          <span className={cn("tabular-nums text-shop-xs", current === c.slug ? "text-white/70" : "text-shop-muted")}>{c.count}</span>
        </Link>
      ))}
    </nav>
  );
}

export default function Store() {
  const { slug } = useParams();
  const [params] = useSearchParams();
  const cat = (params.get("cat") || "").trim();
  const q = usePublicStore(slug);
  const store = q.data;
  const tenantId = store?.id || store?._id ? String(store.id || store._id) : "";
  const fixed = useMemo(() => (tenantId ? { tenantId } : null), [tenantId]);

  // Directory row (logo, city/state, rating, delivery modes, min. order) for this store.
  const dir = usePublicStores({ q: store?.slug || "", limit: 20 }, { enabled: Boolean(store?.slug) });
  const row = (dir.data?.stores || []).find((s) => s.slug === store?.slug) || null;
  const settings = usePublicSettings(store?.slug || "");
  const cats = useProducts({ tenantId, facets: true }, { limit: 1, enabled: Boolean(tenantId) });
  const categories = useMemo(
    () =>
      (cats.data?.facets?.categories || [])
        .filter((c) => c.slug && c.count > 0)
        .sort((a, b) => b.count - a.count || String(a.name).localeCompare(String(b.name))),
    [cats.data]
  );

  if (q.isPending) return <PageSkeleton rows={2} />;
  if (q.error && q.error.status !== 404) {
    return (
      <div className="msr-gutter py-10">
        <Notice
          tone="danger"
          title="We couldn’t load this store"
          action={
            <Button variant="secondary" leftIcon={RotateCcw} onClick={() => q.refetch()}>
              Try again
            </Button>
          }
        >
          {q.error.message || "Check your connection and try again."}
        </Notice>
      </div>
    );
  }
  if (q.error || !fixed) {
    return (
      <div className="msr-gutter py-10">
        <EmptyState
          icon={StoreIcon}
          title="Store not found"
          description="This seller isn’t on the marketplace right now, or the link has changed."
          action={
            <>
              <Button variant="secondary" to="/stores">
                See all sellers
              </Button>
              <Button to="/category/all">Browse all products</Button>
            </>
          }
        />
      </div>
    );
  }

  const name = displayName(store.displayName || store.name);
  const logo = store.branding?.logo || row?.logo || "";
  const verified = Boolean(store.verified || row?.verified);
  const catName = cat ? categories.find((c) => c.slug === cat)?.name : "";

  const title = (
    <span className="inline-flex min-w-0 items-center gap-3">
      <span aria-hidden="true" className="contents">
        <BrandMonogram name={name} logo={logo} size="md" className="shadow-[0_8px_20px_-12px_rgba(11,16,51,0.45)]" />
      </span>
      <span className="min-w-0 break-words">{name}</span>
      {verified ? <BadgeCheck className="size-6 shrink-0 text-shop-primary" strokeWidth={2} aria-label="Verified seller" /> : null}
    </span>
  );

  return (
    <ProductListing
      category={cat}
      fixed={fixed}
      hide={HIDE}
      title={title}
      documentTitle={catName ? `${displayName(catName)} · ${name}` : name}
      kicker="Seller storefront"
      description={store.tagline || store.description || ""}
      breadcrumbs={[
        { label: "Home", to: "/" },
        { label: "Sellers", to: "/stores" },
        ...(catName ? [{ label: name, to: `/store/${store.slug || slug}` }, { label: displayName(catName) }] : [{ label: name }]),
      ]}
      intro={
        <div className="grid gap-4">
          <StoreHero store={store} row={row} settings={settings.data} />
          <StoreCoupons tenantId={tenantId} />
        </div>
      }
      subnav={<CategoryChips categories={categories} current={cat} />}
      emptyTitle={cat ? "Nothing from this seller in this category yet" : "This seller has no products listed yet"}
      emptyDescription="Browse other sellers or the whole marketplace in the meantime."
    />
  );
}
