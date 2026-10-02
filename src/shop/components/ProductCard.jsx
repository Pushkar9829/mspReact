import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, Check, Heart, Loader2, ShoppingCart } from "lucide-react";
import { discount } from "../data/catalog.js";
import { useCart } from "../context/CartContext.jsx";
import { Price, RatingPill, Skeleton } from "./shopUi.jsx";
import { qtyRules } from "../lib/qtyRules.js";

export const PRODUCT_GRID =
  "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

function formatReviews(n) {
  const v = Number(n) || 0;
  if (!v) return "";
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return v.toLocaleString("en-IN");
}

/** `bulk` cards (bulk screen only) add bulk lines with MOQ/slabs; elsewhere items are added one at a time. */
export default function ProductCard({ product, bulk = false }) {
  const { add, items, findLine, isWished, toggleWish } = useCart();
  const [busy, setBusy] = useState(false);
  const inCart = findLine(product.id, product.weight, bulk);
  const otherMode = findLine(product.id, product.weight, !bulk)?.qty || 0;
  const off = discount(product);
  const wished = isWished(product.id);
  const isBestseller = Boolean(product.bestseller) || product.badge === "Best seller";
  const tag = isBestseller ? "Bestseller" : product.deal ? "Deal" : product.newLaunch ? "New" : "";
  const outOfStock = product.stock === 0;
  const elsewhere = items
    .filter((item) => item.bulk && item.id === product.id && item.pack !== product.weight)
    .reduce((n, item) => n + item.qty, 0);
  const stock = product.stock == null ? undefined : product.stock - otherMode;
  const rules = qtyRules(product, { bulk, stock, inCartElsewhere: elsewhere });
  const showBulkLink = !bulk && product.bulkEligible;
  const cannotAdd = outOfStock || rules.max < rules.min;

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  async function run(fn) {
    if (busy) return;
    setBusy(true);
    try {
      await fn();
    } catch {
      /* cart context surfaces the error */
    } finally {
      setBusy(false);
    }
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-msr-line bg-white transition duration-200 hover:-translate-y-0.5 hover:border-msr-line-strong hover:shadow-lift">
      <Link to={`/product/${product.id}`} className="flex flex-1 flex-col" aria-label={`View ${product.name}`}>
        <div className="relative m-2 mb-0 aspect-square overflow-hidden rounded-xl bg-msr-surface">
          <img
            src={product.image || "/products/product.png"}
            alt=""
            loading="lazy"
            className="h-full w-full object-contain p-5 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
            onError={(e) => {
              e.currentTarget.src = "/products/product.png";
            }}
          />
          {off > 0 ? (
            <span className="absolute left-2 top-2 rounded-md bg-msr-success px-1.5 py-0.5 text-[10.5px] font-bold text-white">
              {off}% OFF
            </span>
          ) : null}
          {tag ? (
            <span
              className={`absolute bottom-2 left-2 rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                tag === "Bestseller" ? "bg-msr-brand text-msr-gold" : tag === "Deal" ? "bg-msr-warning-soft text-msr-warning-ink" : "bg-msr-primary-soft text-msr-primary-ink"
              }`}
            >
              {tag}
            </span>
          ) : null}
        </div>

        <div className="flex flex-1 flex-col px-3 pt-2.5 sm:px-3.5">
          {product.brand ? (
            <p className="truncate text-[11px] font-semibold uppercase tracking-wide text-msr-subtle">{product.brand}</p>
          ) : null}
          <h3 className="mt-0.5 line-clamp-2 min-h-[2.5em] text-[13.5px] font-semibold leading-[1.25] text-msr-ink group-hover:text-msr-primary">
            {product.name}
          </h3>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {product.weight ? (
              <span className="rounded-md border border-msr-line bg-msr-surface px-1.5 py-0.5 text-[11px] font-medium text-msr-muted">
                {product.weight}
              </span>
            ) : null}
            <RatingPill value={product.rating} reviews={formatReviews(product.reviews)} />
          </div>
          <Price price={product.price} mrp={product.mrp} size="md" showOff={false} className="mt-2.5" />
        </div>
      </Link>

      <button
        type="button"
        onClick={(e) => {
          stop(e);
          toggleWish(product);
        }}
        className={`absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-white/90 shadow-card backdrop-blur transition ${
          wished ? "text-msr-danger" : "text-msr-subtle hover:text-msr-danger"
        }`}
        aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
        aria-pressed={wished}
      >
        <Heart className={`h-4 w-4 ${wished ? "fill-current" : ""}`} strokeWidth={2} />
      </button>

      <div className="relative z-10 flex gap-1.5 px-3 pb-3 pt-3 sm:px-3.5 sm:pb-3.5">
        <div className="min-w-0 flex-1">
        {inCart ? (
          <Link
            to="/cart"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl bg-msr-success text-[13px] font-semibold text-white transition-colors hover:bg-msr-success/90"
            title={`${inCart.qty} in cart · change quantity in cart or checkout`}
            aria-label={`${product.name} added to cart, view cart`}
          >
            <Check className="h-4 w-4" strokeWidth={2.5} />
            Added
          </Link>
        ) : (
          <button
            type="button"
            disabled={cannotAdd || busy}
            onClick={(e) => {
              stop(e);
              run(() => add(product, rules.min, product.weight, undefined, { bulk }));
            }}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-msr-primary bg-white text-[13px] font-semibold text-msr-primary transition-colors hover:bg-msr-primary hover:text-white disabled:border-msr-line disabled:text-msr-subtle disabled:hover:bg-white"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" strokeWidth={2} />}
            {outOfStock ? "Out of stock" : bulk ? "Bulk add" : "Add"}
          </button>
        )}
        </div>
        {showBulkLink ? (
          <Link
            to={`/bulk#bulk-${product.id}`}
            onClick={(e) => e.stopPropagation()}
            className="inline-flex h-9 shrink-0 items-center gap-1 rounded-xl border border-msr-gold bg-msr-gold/20 px-2.5 text-[12.5px] font-semibold text-msr-ink transition-colors hover:bg-msr-gold/40"
            title="Buy in bulk with slab prices"
            aria-label={`Buy ${product.name} in bulk`}
          >
            <Boxes className="h-4 w-4" strokeWidth={2} />
            Bulk
          </Link>
        ) : null}
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="rounded-2xl border border-msr-line bg-white p-2">
      <Skeleton className="aspect-square w-full rounded-xl" />
      <div className="px-1.5 pb-1.5 pt-3">
        <Skeleton className="h-2.5 w-1/3" />
        <Skeleton className="mt-2 h-3.5 w-4/5" />
        <Skeleton className="mt-1.5 h-3.5 w-3/5" />
        <Skeleton className="mt-3 h-4 w-1/2" />
        <Skeleton className="mt-4 h-9 w-full rounded-xl" />
      </div>
    </div>
  );
}
