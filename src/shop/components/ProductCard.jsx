import { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Loader2, Minus, Plus, ShoppingCart } from "lucide-react";
import { discount } from "../data/catalog.js";
import { useCart } from "../context/CartContext.jsx";
import { Price, RatingPill, Skeleton } from "./shopUi.jsx";

export const PRODUCT_GRID =
  "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-5";

function formatReviews(n) {
  const v = Number(n) || 0;
  if (!v) return "";
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return v.toLocaleString("en-IN");
}

export default function ProductCard({ product }) {
  const { add, items, setQty, isWished, toggleWish } = useCart();
  const [busy, setBusy] = useState(false);
  const inCart = items.find((item) => item.id === product.id && item.pack === product.weight);
  const off = discount(product);
  const wished = isWished(product.id);
  const isBestseller = Boolean(product.bestseller) || product.badge === "Best seller";
  const tag = isBestseller ? "Bestseller" : product.deal ? "Deal" : product.newLaunch ? "New" : "";
  const outOfStock = product.stock === 0;

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

      <div className="relative z-10 px-3 pb-3 pt-3 sm:px-3.5 sm:pb-3.5">
        {inCart ? (
          <div className="flex h-9 items-center justify-between overflow-hidden rounded-xl bg-msr-primary text-white">
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                run(() => setQty(product.id, product.weight, inCart.qty - 1));
              }}
              className="grid h-full w-10 place-items-center transition-colors hover:bg-black/10"
              aria-label="Decrease quantity"
            >
              <Minus className="h-4 w-4" />
            </button>
            <span className="text-[13px] font-bold">{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : inCart.qty}</span>
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                run(() => setQty(product.id, product.weight, inCart.qty + 1));
              }}
              className="grid h-full w-10 place-items-center transition-colors hover:bg-black/10"
              aria-label="Increase quantity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            disabled={outOfStock || busy}
            onClick={(e) => {
              stop(e);
              run(() => add(product, 1, product.weight));
            }}
            className="inline-flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-msr-primary bg-white text-[13px] font-semibold text-msr-primary transition-colors hover:bg-msr-primary hover:text-white disabled:border-msr-line disabled:text-msr-subtle disabled:hover:bg-white"
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShoppingCart className="h-4 w-4" strokeWidth={2} />}
            {outOfStock ? "Out of stock" : "Add to cart"}
          </button>
        )}
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
