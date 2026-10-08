/**
 * /product/:slug — product detail. Everything money- or stock-related is a server field from
 * GET /products/lookup (variants with slabs, rules and stock; store; returns; delivery). The pack is
 * kept in the URL (?v=<variantId>), the tab too (?tab=).
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import {
  BadgeCheck,
  BellRing,
  Boxes,
  Check,
  ChevronRight,
  Copy,
  Expand,
  FileText,
  Heart,
  PackageX,
  RotateCcw,
  Share2,
  ShoppingCart,
  Store as StoreIcon,
  Tag,
  Truck,
  Wallet,
  Zap,
} from "lucide-react";
import { api } from "../../shared/api/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { formatDate } from "../../shared/lib/format.js";
import { shopKeys, useCartActions, useCartCoupons, useCartQuery, useCategories, useProduct, useProducts, useViewer, useWishlist } from "../hooks/index.js";
import {
  Breadcrumbs,
  Button,
  Dialog,
  EmptyState,
  Field,
  ImageWithFallback,
  Input,
  Money,
  Notice,
  PdpSkeleton,
  PincodeCheck,
  Price,
  QtyStepper,
  RatingStars,
  SellerCard,
  SlabHint,
  SlabTable,
  TabPanel,
  Tabs,
  cn,
  toast,
  useRestockAlert,
} from "../components/ui/index.js";
import { discountPercent, formatListing } from "../lib/money.js";
import { activeSlab, bestSlab } from "../lib/slabs.js";
import { mapLookup } from "../lib/mapProduct.js";
import { displayName } from "../lib/text.js";
import { ProductRail } from "./discovery/Rail.jsx";
import { ProductReviews } from "./discovery/Reviews.jsx";
import { pushRecentlyViewed, useRecentlyViewed } from "./discovery/recentlyViewed.js";

/* ------------------------------------------------------------------ gallery */

/** Photo stage on white (packshots read best there) with thumbnails beside it on desktop, below on phones. */
function Gallery({ images, name, off, bulk }) {
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(null);
  const [open, setOpen] = useState(false);
  const list = images.length ? images : [""];
  const src = list[Math.min(index, list.length - 1)];
  const many = list.length > 1;

  return (
    <div className={cn("pdp-gallery", many && "has-thumbs")}>
      {many ? (
        <div className="pdp-thumbs no-scrollbar" role="group" aria-label="Product images">
          {list.map((img, i) => (
            <button
              key={img + i}
              type="button"
              onClick={() => setIndex(i)}
              onMouseEnter={() => setIndex(i)}
              aria-label={`Image ${i + 1} of ${list.length}`}
              aria-pressed={i === index}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl border-2 bg-white transition-colors",
                i === index ? "border-shop-primary" : "border-shop-line hover:border-shop-line-strong"
              )}
            >
              <ImageWithFallback src={img} alt="" rounded={false} padded={false} fallbackName={name} className="size-full bg-white" imgClassName="p-1.5" />
            </button>
          ))}
        </div>
      ) : null}

      <div
        className="group relative overflow-hidden rounded-[1.25rem] border border-shop-line bg-white"
        style={zoom ? { "--zx": `${zoom.x}%`, "--zy": `${zoom.y}%` } : undefined}
        onMouseMove={(e) => {
          if (!src) return;
          const r = e.currentTarget.getBoundingClientRect();
          setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
        }}
        onMouseLeave={() => setZoom(null)}
      >
        <ImageWithFallback
          src={src}
          alt={name}
          priority
          rounded={false}
          fallbackName={name}
          className="bg-white [&_span]:text-[4rem]"
          sizes="(min-width:1024px) 560px, 100vw"
          imgClassName={cn("origin-[var(--zx,50%)_var(--zy,50%)] p-6 transition-transform duration-150 sm:p-10", zoom && "scale-[1.8]")}
        />
        {off > 0 || bulk ? (
          <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
            {off > 0 ? <span className="rounded-full bg-shop-saffron px-2.5 py-1 text-shop-xs font-bold text-white shadow-sm">{off}% off</span> : null}
            {bulk ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-shop-gold-soft px-2.5 py-1 text-shop-xs font-semibold text-shop-gold-ink ring-1 ring-shop-gold/40">
                <Boxes className="size-3.5" strokeWidth={2} aria-hidden /> Bulk pricing
              </span>
            ) : null}
          </div>
        ) : null}
        {many ? (
          <span className="absolute bottom-3 left-3 rounded-full bg-shop-navy/80 px-2.5 py-1 text-shop-xs font-semibold tabular-nums text-white lg:hidden">
            {index + 1} / {list.length}
          </span>
        ) : null}
        {src ? (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="absolute bottom-3 right-3 grid size-11 place-items-center rounded-full border border-shop-line bg-white/95 text-shop-ink shadow-sm transition-colors hover:border-shop-primary hover:text-shop-primary-ink"
            aria-label="View larger image"
          >
            <Expand className="size-5" strokeWidth={1.75} aria-hidden />
          </button>
        ) : null}
      </div>
      <Dialog open={open} onOpenChange={setOpen} title={name} size="lg">
        <ImageWithFallback src={src} alt={name} sizes="90vw" className="bg-white" />
      </Dialog>
    </div>
  );
}

/* ------------------------------------------------------------------ buy box pieces */

function PackChips({ variants, selected, onSelect }) {
  if (variants.length < 2) return null;
  return (
    <fieldset>
      <legend className="mb-2 text-shop-sm font-semibold text-shop-ink">
        Pack size <span className="font-normal text-shop-muted">· {selected.pack || selected.sku}</span>
      </legend>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-[repeat(auto-fill,minmax(9.5rem,1fr))]">
        {variants.map((v) => {
          const on = v.id === selected.id;
          const out = v.inStock === false;
          return (
            <label
              key={v.id}
              className={cn(
                "relative grid min-h-16 cursor-pointer content-center gap-0.5 rounded-xl border px-3 py-2 text-left transition-[border-color,background-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-shop-primary",
                on ? "border-shop-primary bg-shop-primary-soft shadow-[inset_0_0_0_1px_var(--color-shop-primary)]" : "border-shop-line-strong bg-shop-card hover:border-shop-primary",
                out && !on && "opacity-70"
              )}
            >
              <input type="radio" name="pack" value={v.id} checked={on} onChange={() => onSelect(v)} className="sr-only" />
              {on ? (
                <span className="absolute right-2 top-2 grid size-4 place-items-center rounded-full bg-shop-primary text-white" aria-hidden>
                  <Check className="size-3" strokeWidth={3} />
                </span>
              ) : null}
              <span className={cn("pr-5 text-shop-sm font-semibold", on ? "text-shop-primary-ink" : "text-shop-ink")}>{v.pack || v.sku}</span>
              <span className={cn("text-shop-sm font-semibold tabular-nums", out ? "text-shop-danger-ink" : "text-shop-text")}>{out ? "Out of stock" : formatListing(v.price)}</span>
              {!out && v.unitPrice?.label ? <span className="text-shop-xs tabular-nums text-shop-muted">{v.unitPrice.label}</span> : null}
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}

/** "Buy any quantity… bulk price from 10 packs, then in steps of 5, up to 1,000 per order." */
function rulesSentence(rules, pack) {
  if (!rules) return "";
  const unit = pack ? "packs" : "units";
  if (rules.bulkEligible && rules.bulk) {
    const from = rules.bulkFrom || rules.bulk.min;
    const parts = [`Buy any quantity at the regular price. Bulk prices start at ${from} ${unit}`];
    if (rules.bulk.step > 1) parts.push(`then go up in steps of ${rules.bulk.step}`);
    if (rules.bulk.max) parts.push(`up to ${Number(rules.bulk.max).toLocaleString("en-IN")} per order`);
    return `${parts.join(", ")}.`;
  }
  return rules.max ? `Order up to ${Number(rules.max).toLocaleString("en-IN")} ${unit} per order.` : "";
}

function Coupons({ tenantId }) {
  const q = useCartCoupons({ tenantId });
  const [copied, setCopied] = useState("");
  const rows = (q.data?.coupons || []).filter((c) => String(c.tenantId || c.store?.id || "") === String(tenantId));
  if (q.isPending) return <div className="h-16 rounded-card shop-skeleton" aria-hidden />;
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
    <section aria-labelledby="pdp-coupons" className="grid gap-2.5">
      <div className="flex items-center justify-between gap-3">
        <h2 id="pdp-coupons" className="flex items-center gap-1.5 text-shop-sm font-semibold text-shop-ink">
          <Tag className="size-4 text-shop-saffron-ink" strokeWidth={1.75} aria-hidden /> Offers from this seller
        </h2>
        {rows.length > 2 ? (
          <Link to="/account/coupons" className="inline-flex min-h-11 items-center text-shop-sm font-semibold text-shop-primary-ink hover:underline">
            All {rows.length}
          </Link>
        ) : null}
      </div>
      <ul className="grid gap-2">
        {rows.slice(0, 2).map((c) => {
          const cond = [
            Number(c.minCartValue) > 0 ? `above ${formatListing(c.minCartValue)}` : "",
            c.appliesTo === "bulk" ? "bulk lines only" : c.appliesTo === "regular" ? "regular lines only" : "",
            c.firstOrderOnly ? "first order only" : "",
            c.endsAt ? `till ${formatDate(c.endsAt)}` : "",
          ].filter(Boolean);
          return (
            <li key={c.id} className="flex items-stretch overflow-hidden rounded-xl border border-shop-line bg-shop-card">
              <span className="grid w-16 shrink-0 place-items-center border-r border-dashed border-shop-line-strong bg-shop-saffron-soft px-1 text-center font-display text-shop-sm font-bold leading-tight text-shop-saffron-ink">
                {c.type === "percent" ? (
                  <>
                    {c.value}%<br />
                    <span className="text-shop-xs font-semibold">OFF</span>
                  </>
                ) : (
                  <>
                    {formatListing(c.value)}
                    <br />
                    <span className="text-shop-xs font-semibold">OFF</span>
                  </>
                )}
              </span>
              <div className="min-w-0 flex-1 px-3 py-2">
                <p className="truncate text-shop-sm font-semibold text-shop-ink">{c.name || c.code}</p>
                <p className="line-clamp-2 text-shop-xs text-shop-muted">{c.description || (cond.length ? cond.join(" · ") : "On this seller’s products")}</p>
                {c.applied ? <p className="mt-0.5 text-shop-xs font-semibold text-shop-primary-ink">Applied to your cart</p> : null}
              </div>
              <button
                type="button"
                onClick={() => copy(c.code)}
                className="m-2 inline-flex min-h-10 shrink-0 items-center gap-1.5 self-center rounded-lg border border-dashed border-shop-line-strong bg-shop-page px-2.5 font-mono text-shop-xs font-bold tracking-wide text-shop-ink transition-colors hover:border-shop-primary hover:text-shop-primary-ink"
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

/** Out of stock: restock alert for this pack. 201 = subscribed, 202 = confirm by email. */
function RestockBox({ product, variant }) {
  const { signedIn } = useViewer();
  const alert = useRestockAlert(product);
  const [email, setEmail] = useState("");
  const done = alert.data;
  if (done)
    return (
      <Notice tone={done.pendingConfirmation ? "info" : "success"} icon={done.pendingConfirmation ? BellRing : Check}>
        {done.pendingConfirmation ? `Check your inbox: confirm the email we sent to ${email || "you"} to get the alert.` : `You’re on the list. We’ll email you once when ${variant.pack || "it"} is back in stock.`}
      </Notice>
    );
  return (
    <div className="grid gap-3 rounded-xl border border-shop-danger/30 bg-shop-danger-soft/40 p-4">
      <p className="flex items-center gap-2 text-shop-base font-semibold text-shop-danger-ink">
        <PackageX className="size-5" strokeWidth={1.75} aria-hidden /> Out of stock{variant.pack ? ` in ${variant.pack}` : ""}
      </p>
      {signedIn ? (
        <Button leftIcon={BellRing} loading={alert.isPending} onClick={() => alert.mutate({ variantId: variant.id })}>
          Notify me when it’s back
        </Button>
      ) : (
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            alert.mutate({ email, variantId: variant.id });
          }}
        >
          <Field label="Email me when it’s back" error={alert.error?.fieldError?.("email")} required>
            <Input type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@business.in" />
          </Field>
          <Button type="submit" leftIcon={BellRing} loading={alert.isPending}>
            Notify me
          </Button>
        </form>
      )}
    </div>
  );
}

/** Small icon + two-line fact tiles under the buy card. Only facts the server returned. */
function Assurances({ product }) {
  const delivery = product.delivery || {};
  const returns = product.returns || {};
  const items = [
    returns.enabled && returns.easyReturn
      ? { icon: RotateCcw, title: `${returns.returnWindowDays}-day returns`, sub: "Easy return" }
      : returns.enabled === false || returns.returnable === false
        ? { icon: RotateCcw, title: "Not returnable", sub: "Check before ordering" }
        : null,
    delivery.codEnabled ? { icon: Wallet, title: "Cash on delivery", sub: "Pay when it arrives" } : null,
    delivery.pickupAvailable ? { icon: StoreIcon, title: "Store pickup", sub: "Collect from seller" } : null,
    { icon: FileText, title: "GST invoice", sub: "Claim input credit" },
    product.wholesale.bulkEligible && delivery.leadTimeDays
      ? { icon: Truck, title: `Bulk ships in ${delivery.leadTimeDays} day${delivery.leadTimeDays === 1 ? "" : "s"}`, sub: "After order confirmation" }
      : null,
  ]
    .filter(Boolean)
    .slice(0, 4);
  return (
    <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Order benefits">
      {items.map(({ icon: Icon, title, sub }) => (
        <li key={title} className="flex items-center gap-2.5 rounded-xl border border-shop-line bg-shop-card px-3 py-2.5 sm:flex-col sm:items-start sm:gap-1.5">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
            <Icon className="size-4" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className="block text-shop-sm font-semibold leading-tight text-shop-ink">{title}</span>
            <span className="block text-shop-xs leading-tight text-shop-muted">{sub}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ details */

const SPEC_SKIP = new Set(["features", "ingredients", "nutrition", "manufacturer", "defaultPack", "easyReturn"]);
const humanize = (k) => k.replace(/([a-z])([A-Z])/g, "$1 $2").replace(/[_-]/g, " ").replace(/^./, (c) => c.toUpperCase());

function specRows(product, variant) {
  const attrs = variant?.attributes || {};
  return [
    ["Brand", product.brand],
    ["Category", product.categoryRef?.name],
    ["Pack size", variant?.pack],
    ["SKU", variant?.sku],
    ["HSN code", product.hsn],
    ["GST rate", product.taxRate != null ? `${product.taxRate}%` : ""],
    ["Case quantity", product.wholesale.caseQty > 1 ? `${product.wholesale.caseQty} packs` : ""],
    ["Bulk lead time", product.wholesale.bulkEligible && product.wholesale.leadTimeDays ? `${product.wholesale.leadTimeDays} day${product.wholesale.leadTimeDays === 1 ? "" : "s"}` : ""],
    ["Grade", attrs.grade],
    ["Material", attrs.material],
    ["Colour", attrs.color],
    ["Manufacturer", product.specifications.manufacturer],
    ...Object.entries(product.specifications)
      .filter(([k, v]) => !SPEC_SKIP.has(k) && (typeof v === "string" || typeof v === "number") && String(v).trim())
      .map(([k, v]) => [humanize(k), String(v)]),
  ].filter(([, v]) => v !== undefined && v !== null && String(v).trim() !== "");
}

function Specs({ rows }) {
  return (
    <dl className="grid overflow-hidden rounded-xl border border-shop-line md:grid-cols-2">
      {rows.map(([k, v], i) => (
        <div
          key={k}
          className={cn(
            "grid grid-cols-[minmax(7rem,40%)_minmax(0,1fr)] gap-3 border-shop-line px-4 py-3 text-shop-sm",
            i > 0 && "border-t",
            i === 1 && "md:border-t-0",
            i % 2 === 1 && "md:border-l",
            Math.floor(i / 2) % 2 === 0 ? "bg-shop-page/60" : "bg-shop-card"
          )}
        >
          <dt className="text-shop-muted">{k}</dt>
          <dd className="break-words font-medium text-shop-ink">{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function Description({ product, facts }) {
  const s = product.specifications;
  const features = Array.isArray(s.features) ? s.features : [];
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-10">
      <div className="grid content-start gap-5 text-shop-base leading-relaxed text-shop-text">
        {product.description ? <p className="whitespace-pre-line">{product.description}</p> : <p className="text-shop-muted">The seller hasn’t added a description yet.</p>}
        {features.length ? (
          <div>
            <h3 className="mb-2 font-display text-shop-md font-bold text-shop-ink">Highlights</h3>
            <ul className="grid gap-2 sm:grid-cols-2">
              {features.map((f) => (
                <li key={f} className="flex items-start gap-2 rounded-xl bg-shop-page px-3 py-2 text-shop-sm">
                  <Check className="mt-0.5 size-4 shrink-0 text-shop-primary" strokeWidth={2.5} aria-hidden /> {f}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {s.ingredients ? (
          <div>
            <h3 className="mb-1 font-display text-shop-md font-bold text-shop-ink">Ingredients</h3>
            <p>{s.ingredients}</p>
          </div>
        ) : null}
        {s.nutrition ? (
          <div>
            <h3 className="mb-1 font-display text-shop-md font-bold text-shop-ink">Nutrition / usage</h3>
            <p>{s.nutrition}</p>
          </div>
        ) : null}
      </div>
      {facts.length ? (
        <aside aria-label="Key facts" className="self-start rounded-xl border border-shop-line bg-shop-page/60 p-4">
          <h3 className="text-shop-xs font-semibold uppercase tracking-wider text-shop-muted">Key facts</h3>
          <dl className="mt-2 grid gap-2 text-shop-sm">
            {facts.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4">
                <dt className="text-shop-muted">{k}</dt>
                <dd className="text-right font-medium text-shop-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ rails */

function RecentlyViewed({ current }) {
  const slugs = useRecentlyViewed()
    .filter((s) => s !== current)
    .slice(0, 8);
  const { viewer } = useViewer();
  const results = useQueries({
    queries: slugs.map((slug) => ({ queryKey: shopKeys.product(slug, viewer), queryFn: () => api.lookupProduct(slug), staleTime: 30_000, retry: false })),
  });
  const products = results.map((r) => (r.data ? mapLookup(r.data) : null)).filter(Boolean);
  const pending = results.some((r) => r.isPending);
  if (!slugs.length) return null;
  return <ProductRail title="Recently viewed" products={products} query={{ isPending: pending && !products.length }} count={Math.min(slugs.length, 6)} />;
}

/* ------------------------------------------------------------------ JSON-LD */

function StructuredData({ product }) {
  const prices = product.variants.map((v) => v.price).filter((p) => p != null);
  const anyStock = product.variants.some((v) => v.inStock !== false);
  const data = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description || undefined,
    image: product.images.length ? product.images : undefined,
    sku: product.defaultVariant?.sku || product.sku || undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand } : undefined,
    category: product.categoryRef?.name || undefined,
    offers: prices.length
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...prices),
          highPrice: Math.max(...prices),
          offerCount: prices.length,
          availability: anyStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
          seller: product.seller?.name ? { "@type": "Organization", name: product.seller.name } : undefined,
        }
      : undefined,
    aggregateRating: product.ratingCount > 0 ? { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount } : undefined,
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}

/* ------------------------------------------------------------------ page */

async function shareProduct(name) {
  const url = window.location.href;
  try {
    if (navigator.share) {
      await navigator.share({ title: name, url });
      return;
    }
    await navigator.clipboard.writeText(url);
    toast.success("Link copied", { description: name });
  } catch (e) {
    if (e?.name !== "AbortError") toast("Copy the link from the address bar");
  }
}

export default function ProductDetails() {
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const { product, isPending, error, refetch } = useProduct(slug);
  const cats = useCategories();
  const { cart } = useCartQuery();
  const actions = useCartActions();
  const wish = useWishlist();
  const [localQty, setLocalQty] = useState(1);
  const buyBox = useRef(null);
  const [buyBoxVisible, setBuyBoxVisible] = useState(true);

  useDocumentTitle(product?.name ? displayName(product.name) : error ? "Product not found" : null);
  useEffect(() => {
    if (product?.slug) pushRecentlyViewed(product.slug);
  }, [product?.slug]);

  useEffect(() => {
    const el = buyBox.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([entry]) => setBuyBoxVisible(entry.isIntersecting), { rootMargin: "0px 0px -64px 0px" });
    io.observe(el);
    return () => io.disconnect();
  }, [product?.slug]);

  const vParam = params.get("v");
  const variant = useMemo(() => {
    if (!product) return null;
    return product.variants.find((v) => v.id === vParam) || product.defaultVariant;
  }, [product, vParam]);

  const related = useProducts({ category: product?.category || "" }, { limit: 12, enabled: Boolean(product?.category) });

  if (isPending) return <PdpSkeleton />;
  if (error || !product || !variant) {
    return (
      <div className="msr-gutter py-10">
        <EmptyState
          icon={PackageX}
          title={error?.status === 404 || !product ? "Product not found" : "We couldn’t load this product"}
          description={error?.status === 404 || !product ? "It may have been removed or renamed. Search for it or browse the category." : error?.message}
          action={
            <>
              {error && error.status !== 404 ? (
                <Button variant="secondary" leftIcon={RotateCcw} onClick={() => refetch()}>
                  Try again
                </Button>
              ) : null}
              <Button to="/category/all">Browse products</Button>
            </>
          }
        />
      </div>
    );
  }

  const selectVariant = (v) => {
    setLocalQty(1);
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (v.id === product.defaultVariant?.id) p.delete("v");
        else p.set("v", v.id);
        return p;
      },
      { replace: true, preventScrollReset: true }
    );
  };

  const name = displayName(product.name);
  const sellerName = product.seller?.name ? displayName(product.seller.name) : "";
  const line = cart.findLine(variant.id);
  const lineReady = line && line.cartItemId && !String(line.cartItemId).startsWith("pending");
  const rules = line?.rules || variant.rules || product.rules;
  const qty = line?.qty ?? localQty;
  const out = variant.inStock === false;
  const slabs = product.wholesale.bulkEligible ? variant.slabs : [];
  const slab = slabs.length ? activeSlab(slabs, qty) : null;
  const best = slabs.length ? bestSlab(slabs) : null;
  const eachPrice = line?.unitPrice ?? slab?.unitPrice ?? variant.price;
  const eachUnit = slab?.unitPricePerBaseUnit?.label || variant.unitPrice?.label;
  const margin = variant.mrp != null && eachPrice != null && variant.mrp > eachPrice ? variant.mrp - eachPrice : 0;
  const marginPct = margin > 0 ? Math.round((margin / variant.mrp) * 100) : 0;
  const wished = wish.has(product);
  const path = cats.data?.pathOf(product.category) || (product.categoryRef ? [product.categoryRef] : []);
  const leaf = path[path.length - 1];
  // Bulk rules are already spelled out under the stepper; the sentence covers the rest.
  const sentence = rules?.bulkEligible && rules?.bulk ? "" : rulesSentence(rules, variant.pack);
  const unitWord = variant.pack ? "pack" : "unit";
  const features = (Array.isArray(product.specifications.features) ? product.specifications.features : []).slice(0, 4);
  const rows = specRows(product, variant);
  const facts = rows.filter(([k]) => ["Pack size", "HSN code", "GST rate", "Case quantity", "Bulk lead time", "Manufacturer"].includes(k));

  const openReviews = () => {
    setParams(
      (p) => {
        const n = new URLSearchParams(p);
        n.set("tab", "reviews");
        return n;
      },
      { replace: true, preventScrollReset: true }
    );
    document.getElementById("details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const add = (then) =>
    actions.add.mutate(
      { variantId: variant.id, qty: localQty, product: { ...product, pack: variant.pack, price: variant.price, mrp: variant.mrp }, silent: Boolean(then) },
      then ? { onSuccess: then } : undefined
    );
  const buyNow = () => (line ? navigate("/checkout") : add(() => navigate("/checkout")));

  return (
    <div className="msr-gutter grid grid-cols-[minmax(0,1fr)] gap-8 py-4 pb-28 md:gap-10 md:py-5 md:pb-8">
      <StructuredData product={product} />
      <Breadcrumbs items={[{ label: "Home", to: "/" }, ...path.map((c) => ({ label: displayName(c.name), to: `/category/${c.slug}` })), { label: name }]} />

      <div className="pdp-layout -mt-4 md:-mt-5">
        <Gallery images={product.images} name={name} off={discountPercent(variant.mrp, variant.price)} bulk={Boolean(best && best.unitPrice < variant.price)} />

        <div className="grid min-w-0 content-start gap-5">
          {/* Title block */}
          <header className="grid gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {product.brandRef?.slug ? (
                <Link
                  to={`/category/all?brand=${encodeURIComponent(product.brandRef.slug)}`}
                  className="inline-flex min-h-7 items-center gap-0.5 rounded-full bg-shop-primary-soft px-2.5 text-shop-xs font-bold uppercase tracking-wide text-shop-primary-ink transition-colors hover:bg-shop-primary hover:text-white"
                >
                  {product.brand} <ChevronRight className="size-3.5" aria-hidden />
                </Link>
              ) : product.brand ? (
                <span className="inline-flex min-h-7 items-center rounded-full bg-shop-well px-2.5 text-shop-xs font-bold uppercase tracking-wide text-shop-muted">{product.brand}</span>
              ) : null}
              {leaf ? (
                <Link to={`/category/${leaf.slug}`} className="inline-flex min-h-7 items-center rounded-full border border-shop-line px-2.5 text-shop-xs font-medium text-shop-muted hover:border-shop-line-strong hover:text-shop-ink">
                  {displayName(leaf.name)}
                </Link>
              ) : null}
            </div>
            <div className="flex items-start justify-between gap-3">
              <h1 className="min-w-0 font-display text-shop-xl font-bold leading-tight tracking-tight text-shop-ink text-balance md:text-shop-2xl">{name}</h1>
              <div className="flex shrink-0 gap-1.5">
                <button
                  type="button"
                  onClick={() => shareProduct(name)}
                  aria-label="Share this product"
                  className="grid size-11 place-items-center rounded-full border border-shop-line bg-shop-card text-shop-muted transition-colors hover:border-shop-line-strong hover:text-shop-ink"
                >
                  <Share2 className="size-[1.1rem]" strokeWidth={1.75} aria-hidden />
                </button>
                <button
                  type="button"
                  onClick={() => wish.toggle(product, variant.id)}
                  aria-pressed={wished}
                  aria-label={wished ? "Remove from wishlist" : "Save to wishlist"}
                  className={cn(
                    "grid size-11 place-items-center rounded-full border bg-shop-card transition-colors",
                    wished ? "border-shop-danger/40 text-shop-danger" : "border-shop-line text-shop-muted hover:border-shop-line-strong hover:text-shop-danger"
                  )}
                >
                  <Heart className={cn("size-[1.1rem]", wished && "fill-current")} strokeWidth={1.75} aria-hidden />
                </button>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-shop-sm text-shop-muted">
              {product.ratingCount > 0 ? (
                <>
                  <button
                    type="button"
                    onClick={openReviews}
                    className="-my-2 inline-flex min-h-11 items-center hover:underline"
                    aria-label={`${product.ratingAvg.toFixed(1)} out of 5 from ${product.ratingCount} reviews. Read reviews`}
                  >
                    <RatingStars value={product.ratingAvg} count={product.ratingCount} size="md" />
                  </button>
                  <span aria-hidden className="size-1 rounded-full bg-shop-line-strong" />
                </>
              ) : null}
              {sellerName ? (
                <Link to={product.seller.slug ? `/store/${product.seller.slug}` : "#seller"} className="-my-2 inline-flex min-h-11 items-center gap-1 hover:text-shop-ink">
                  <StoreIcon className="size-4" strokeWidth={1.75} aria-hidden /> Sold by <span className="font-semibold text-shop-text underline-offset-2 hover:underline">{sellerName}</span>
                  {product.seller.verified ? <BadgeCheck className="size-4 text-shop-primary" aria-label="Verified seller" /> : null}
                </Link>
              ) : null}
            </div>
            {features.length ? (
              <ul className="mt-1 flex flex-wrap gap-1.5" aria-label="Highlights">
                {features.map((f) => (
                  <li key={f} className="inline-flex items-center gap-1 rounded-full bg-shop-card px-2.5 py-1 text-shop-xs font-medium text-shop-text ring-1 ring-shop-line">
                    <Check className="size-3.5 text-shop-primary" strokeWidth={2.5} aria-hidden /> {f}
                  </li>
                ))}
              </ul>
            ) : null}
          </header>

          {/* Buy card */}
          <section aria-label="Buy" className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-28px_rgba(11,16,51,0.35)]">
            <div className="grid gap-5 p-4 sm:p-5">
              <div className="grid gap-2">
                <Price price={variant.price} mrp={variant.mrp} unitPrice={variant.unitPrice} taxRate={product.taxRate} showGst size="xl" />
                <div className="flex flex-wrap gap-1.5">
                  {margin > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-shop-primary-soft px-2.5 py-1 text-shop-xs font-semibold text-shop-primary-ink">
                      Retail margin {formatListing(margin)}/{unitWord}
                      {marginPct ? <span className="font-medium opacity-80">({marginPct}% of MRP)</span> : null}
                    </span>
                  ) : null}
                  {variant.offer?.name ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-shop-saffron-soft px-2.5 py-1 text-shop-xs font-semibold text-shop-saffron-ink">
                      <Tag className="size-3.5" strokeWidth={2} aria-hidden /> {variant.offer.name}
                    </span>
                  ) : null}
                  {best && best.unitPrice < variant.price ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-shop-gold-soft px-2.5 py-1 text-shop-xs font-semibold text-shop-gold-ink">
                      <Boxes className="size-3.5" strokeWidth={2} aria-hidden /> As low as {formatListing(best.unitPrice)} at {best.minQty}+
                    </span>
                  ) : null}
                </div>
              </div>

              <PackChips variants={product.variants} selected={variant} onSelect={selectVariant} />

              {slabs.length ? (
                <div className="grid gap-2">
                  <SlabTable slabs={slabs} qty={qty} pack={variant.pack} basePrice={variant.price} className="rounded-xl" />
                  <SlabHint slabs={slabs} qty={qty} next={line ? line.nextSlab : undefined} />
                </div>
              ) : null}

              <div ref={buyBox} id="buy" className="grid gap-3">
                {out ? (
                  <RestockBox key={variant.id} product={product} variant={variant} />
                ) : (
                  <>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                      {line ? (
                        <QtyStepper
                          value={line.qty}
                          rules={rules}
                          disabled={!lineReady}
                          onChange={(n) => actions.setQty.mutate({ cartItemId: line.cartItemId, qty: n })}
                          lineTotal={line.lineTotal}
                          pending={line.pending || cart.pending}
                          label={`Quantity of ${name} in cart`}
                        />
                      ) : (
                        <QtyStepper value={localQty} rules={rules} removable={false} commitDelay={120} onChange={setLocalQty} label={`Quantity of ${name}`} />
                      )}
                      <p className="text-shop-sm text-shop-muted">
                        <span className="font-semibold tabular-nums text-shop-ink">{formatListing(eachPrice)}</span> each
                        {slab && slab.unitPrice < variant.price ? (
                          <span className="ml-1.5 rounded-full bg-shop-gold-soft px-2 py-0.5 text-shop-xs font-semibold text-shop-gold-ink">Bulk price</span>
                        ) : null}
                        {slab && eachUnit ? <span className="block text-shop-xs tabular-nums">{eachUnit}</span> : null}
                      </p>
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      {line ? (
                        <Button variant="secondary" size="lg" to="/cart" leftIcon={ShoppingCart}>
                          In cart · view
                        </Button>
                      ) : (
                        <Button size="lg" leftIcon={ShoppingCart} loading={actions.add.isPending && !actions.add.variables?.silent} onClick={() => add()}>
                          {localQty > 1 ? `Add ${localQty} to cart` : "Add to cart"}
                        </Button>
                      )}
                      <Button
                        size="lg"
                        className="bg-shop-navy text-white hover:bg-shop-navy/90"
                        leftIcon={Zap}
                        loading={actions.add.isPending && actions.add.variables?.silent}
                        onClick={buyNow}
                      >
                        Buy now
                      </Button>
                    </div>
                    {variant.stockStatus === "low" && variant.stock != null ? (
                      <p className="flex items-center gap-1.5 text-shop-sm font-medium text-shop-warning-ink">
                        <span className="size-2 rounded-full bg-current" aria-hidden /> Only {variant.stock} left in stock
                      </p>
                    ) : null}
                  </>
                )}
                {sentence ? <p className="text-shop-xs leading-relaxed text-shop-muted">{sentence}</p> : null}
              </div>
            </div>
            <PincodeCheck variant="inline" product={product} className="rounded-none border-0 border-t border-shop-line bg-shop-page/70 px-4 py-3 sm:px-5" />
          </section>

          <Assurances product={product} />
          <Coupons tenantId={product.tenantId} />

          <div id="seller" className="scroll-mt-36">
            <SellerCard seller={product.seller} className="rounded-[1.25rem]">
              {product.seller?.slug ? (
                <Link
                  to={`/store/${product.seller.slug}`}
                  className="mt-3 inline-flex min-h-11 w-full items-center justify-center gap-1 rounded-full border border-shop-line text-shop-sm font-semibold text-shop-ink transition-colors hover:border-shop-primary hover:bg-shop-primary hover:text-white"
                >
                  Visit store <ChevronRight className="size-4" aria-hidden />
                </Link>
              ) : null}
            </SellerCard>
          </div>
        </div>
      </div>

      <section id="details" aria-label="Product details" className="scroll-mt-36 rounded-[1.25rem] border border-shop-line bg-shop-card px-4 pb-5 pt-2 sm:px-6 sm:pb-6">
        <Tabs
          urlParam="tab"
          aria-label="Product information"
          tabs={[
            { value: "description", label: "Description" },
            { value: "specifications", label: "Specifications" },
            { value: "reviews", label: "Reviews", count: product.ratingCount > 0 ? product.ratingCount : undefined },
          ]}
        >
          <TabPanel value="description">
            <Description product={product} facts={facts} />
          </TabPanel>
          <TabPanel value="specifications">
            <Specs rows={rows} />
          </TabPanel>
          <TabPanel value="reviews">
            <div className="max-w-3xl">
              <ProductReviews slug={product.slug} productName={name} />
            </div>
          </TabPanel>
        </Tabs>
      </section>

      <ProductRail title={leaf ? `More in ${displayName(leaf.name)}` : "Related products"} to={product.category ? `/category/${product.category}` : undefined} query={related} exclude={product.slug} />
      <RecentlyViewed current={product.slug} />

      {/* Phone: sticky add bar above the bottom nav, only while the buy box is off screen. */}
      <div
        className={cn(
          "fixed inset-x-0 bottom-[calc(3.5rem+1px+env(safe-area-inset-bottom))] z-30 border-t border-shop-line bg-shop-card/95 px-4 py-2 shadow-[0_-8px_24px_-16px_rgba(11,16,51,0.35)] backdrop-blur transition-transform md:hidden",
          buyBoxVisible ? "pointer-events-none translate-y-[200%]" : "translate-y-0"
        )}
        aria-hidden={buyBoxVisible || undefined}
        inert={buyBoxVisible ? true : undefined}
      >
        <div className="flex items-center gap-3">
          <ImageWithFallback src={product.images[0]} alt="" fallbackName={name} className="size-11 shrink-0 rounded-lg bg-white ring-1 ring-shop-line [&_span]:text-shop-sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-shop-xs text-shop-muted">{variant.pack ? `${variant.pack} · ${name}` : name}</p>
            {line ? <Money value={line.lineTotal} pending={line.pending || cart.pending} className="text-shop-md font-bold text-shop-ink" /> : <p className="text-shop-md font-bold tabular-nums text-shop-ink">{formatListing(eachPrice)}</p>}
          </div>
          {out ? (
            <Button variant="secondary" leftIcon={BellRing} onClick={() => buyBox.current?.scrollIntoView({ behavior: "smooth", block: "center" })}>
              Notify me
            </Button>
          ) : line ? (
            <QtyStepper value={line.qty} rules={rules} disabled={!lineReady} onChange={(n) => actions.setQty.mutate({ cartItemId: line.cartItemId, qty: n })} label={`Quantity of ${name} in cart`} className="[&>p]:hidden" />
          ) : (
            <Button leftIcon={ShoppingCart} loading={actions.add.isPending} onClick={() => add()}>
              Add {localQty > 1 ? localQty : ""}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
