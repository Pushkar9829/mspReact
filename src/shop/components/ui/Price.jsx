import { cn } from "./cn.js";
import { discountPercent, formatExact, formatListing } from "../../lib/money.js";
import { Skeleton } from "./Skeletons.jsx";

/**
 * Price block. Server values only.
 *
 *   <Price price={v.price} mrp={v.mrp} unitPrice={v.unitPrice} />                 // listing: ₹42  ₹48  12% off · ₹84/kg
 *   <Price price={line.lineTotal} mode="exact" pending={line.pending} />           // cart: ₹1,260.00
 *   <Price price={v.price} mrp={v.mrp} taxRate={18} size="lg" showGst />           // PDP: "incl. GST 18%"
 *
 * mode: "listing" (whole rupees unless real paise) | "exact" (always paise).
 * `pending` renders a skeleton instead of a stale amount (optimistic cart updates).
 * Discount shows as one "% off" badge-text; MRP is struck through only when higher than the price.
 */
export function Price({ price, mrp, unitPrice, taxRate, showGst = false, showDiscount = true, mode = "listing", size = "md", pending = false, perLabel, className, align = "start" }) {
  const fmt = mode === "exact" ? formatExact : formatListing;
  const off = discountPercent(mrp, price);
  const main = { sm: "text-shop-base", md: "text-shop-md", lg: "text-shop-2xl", xl: "text-shop-3xl" }[size] || "text-shop-md";
  if (pending) {
    return (
      <div className={cn("grid gap-1", align === "end" && "justify-items-end", className)} aria-busy="true">
        <Skeleton className={cn("w-20", size === "lg" || size === "xl" ? "h-8" : "h-5")} />
        <span className="sr-only">Updating price</span>
      </div>
    );
  }
  return (
    <div className={cn("min-w-0", align === "end" && "text-right", className)} data-money>
      <p className={cn("flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 leading-tight", align === "end" && "justify-end")}>
        <span className={cn(main, "font-bold tabular-nums text-shop-ink")}>
          {fmt(price)}
          {perLabel ? <span className="text-shop-sm font-medium text-shop-muted">{perLabel}</span> : null}
        </span>
        {off > 0 ? (
          <span className="text-shop-sm tabular-nums text-shop-subtle line-through">
            <span className="sr-only">MRP </span>
            {fmt(mrp)}
          </span>
        ) : null}
        {showDiscount && off > 0 ? <span className="text-shop-sm font-semibold text-shop-saffron-ink">{off}% off</span> : null}
      </p>
      {unitPrice?.label || (showGst && taxRate != null) ? (
        <p className="mt-0.5 text-shop-xs text-shop-muted">
          {unitPrice?.label ? <span className="tabular-nums">{unitPrice.label}</span> : null}
          {unitPrice?.label && showGst && taxRate != null ? " · " : null}
          {showGst && taxRate != null ? (Number(taxRate) > 0 ? `incl. GST ${taxRate}%` : "GST exempt") : null}
        </p>
      ) : null}
    </div>
  );
}

/** Inline amount (no block): <Money value={x} mode="exact" />. */
export function Money({ value, mode = "exact", pending = false, className }) {
  // A <span> so it can sit inside <p>/<dd> (a <div> there is invalid HTML).
  if (pending) return <span aria-hidden className={cn("shop-skeleton inline-block h-4 w-16 rounded-well align-middle", className)} />;
  return <span className={cn("tabular-nums", className)} data-money>{mode === "exact" ? formatExact(value) : formatListing(value)}</span>;
}

export default Price;
