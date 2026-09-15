import { Link } from "react-router-dom";
import { ShoppingCart, Star } from "lucide-react";
import { inr } from "../../shared/lib/format.js";
import { discount } from "../data/catalog.js";
import { useCart } from "../context/CartContext.jsx";

export const PRODUCT_GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4";

function formatReviews(n) {
  const v = Number(n) || 0;
  if (v >= 10000) return `${Math.round(v / 1000)}k`;
  if (v >= 1000) return `${(v / 1000).toFixed(1).replace(/\.0$/, "")}k`;
  return v.toLocaleString("en-IN");
}

export default function ProductCard({ product }) {
  const { add, items, setQty } = useCart();
  const inCart = items.find((item) => item.id === product.id && item.pack === product.weight);
  const off = discount(product);
  const saved = Math.max(0, (product.mrp || 0) - (product.price || 0));
  const isBestseller = Boolean(product.bestseller) || product.badge === "Best seller";

  function stop(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  return (
    <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[#e8e9ef] bg-white text-left transition-all duration-300 hover:-translate-y-1.5 hover:border-[#dfe1ea] hover:shadow-[0_14px_32px_rgba(16,24,40,0.12)]">
      <Link to={`/product/${product.id}`} className="flex flex-1 flex-col" aria-label={`View ${product.name}`}>
        <div className="product-card-shine relative aspect-square overflow-hidden bg-[#f7f7f8]">
          <img
            src={product.image || "/products/product.png"}
            alt=""
            className="h-full w-full object-contain p-4 transition-transform duration-500 group-hover:scale-110"
            onError={(e) => {
              e.currentTarget.src = "/products/product.png";
            }}
          />
          {off > 0 ? (
            <span className="product-off-badge absolute left-0 top-0 rounded-br-xl bg-msr-success px-2.5 py-1.5 text-[10px] font-extrabold text-white sm:text-[11px]">
              {off}% OFF
            </span>
          ) : null}
          <div className="absolute right-2 top-2 flex flex-col items-end gap-1.5">
            {isBestseller ? (
              <span className="rounded-md bg-msr-navy px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-msr-gold shadow-sm">
                Bestseller
              </span>
            ) : null}
            {product.deal ? (
              <span className="rounded-md bg-[#fff3d6] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#8a5a00]">
                Deal
              </span>
            ) : null}
            {product.newLaunch && !product.deal ? (
              <span className="rounded-md bg-[#fffaf0] px-2 py-1 text-[9px] font-bold uppercase tracking-wide text-[#8a6a12]">
                New
              </span>
            ) : null}
          </div>
        </div>

        <div className="flex flex-1 flex-col px-3 pt-3 sm:px-3.5">
          <h3 className="line-clamp-2 text-[13px] font-semibold leading-snug text-[#171a38] group-hover:text-msr-navy sm:text-[14px]">
            {product.name}
          </h3>
          <div className="mt-1 flex items-center justify-between gap-2">
            <p className="truncate text-[12px] font-medium text-[#8a8e9f]">{product.weight}</p>
            {product.rating ? (
              <p className="flex shrink-0 items-center gap-1 text-[11px] font-semibold text-[#1a1c3d]">
                <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                {Number(product.rating).toFixed(1)}
                <span className="font-medium text-[#8b8ea3]">({formatReviews(product.reviews)})</span>
              </p>
            ) : null}
          </div>
        </div>
      </Link>

      <div className="relative z-10 flex items-end justify-between gap-2 px-3 pb-3 pt-2 sm:px-3.5 sm:pb-3.5">
          <div className="min-w-0 text-left">
            <p className="flex items-baseline gap-1.5 leading-none">
              <span className="text-[17px] font-extrabold tracking-tight text-[#111633] sm:text-[18px]">
                {inr(product.price)}
              </span>
              {off > 0 ? <span className="text-[12px] font-medium text-[#9aa0b5] line-through">{inr(product.mrp)}</span> : null}
            </p>
            {saved > 0 ? (
              <p className="mt-1 text-[11px] font-semibold text-msr-success">You save {inr(saved)}</p>
            ) : null}
          </div>

          {inCart ? (
            <div className="relative z-20 flex h-8 shrink-0 items-center overflow-hidden rounded-lg bg-msr-navy text-white">
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  setQty(product.id, product.weight, inCart.qty - 1);
                }}
                className="grid h-full w-7 place-items-center text-base hover:bg-white/10"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="min-w-5 text-center text-[12px] font-bold">{inCart.qty}</span>
              <button
                type="button"
                onClick={(e) => {
                  stop(e);
                  setQty(product.id, product.weight, inCart.qty + 1);
                }}
                className="grid h-full w-7 place-items-center text-base hover:bg-white/10"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={(e) => {
                stop(e);
                add(product, 1, product.weight);
              }}
              className="relative z-20 inline-flex h-8 shrink-0 items-center gap-1 rounded-lg border border-msr-navy bg-white px-2.5 text-[12px] font-bold text-msr-navy transition duration-200 hover:scale-105 hover:bg-msr-navy hover:text-white active:scale-95"
            >
              <ShoppingCart className="h-3.5 w-3.5" strokeWidth={2} />
              Add
            </button>
          )}
      </div>
    </article>
  );
}
