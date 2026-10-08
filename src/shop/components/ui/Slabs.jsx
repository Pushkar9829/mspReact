import { Boxes } from "lucide-react";
import { cn } from "./cn.js";
import { formatListing } from "../../lib/money.js";
import { activeSlab, bestSlab, nextSlab, slabRange, sortSlabs } from "../../lib/slabs.js";

/**
 * Bulk slab table with the active slab highlighted (from `qty`, or the server's `appliedSlab`).
 *   <SlabTable slabs={variant.slabs} qty={qty} pack="500 g" basePrice={variant.price} />
 */
export function SlabTable({ slabs, qty = 0, appliedSlab, pack, basePrice, className, caption = "Bulk prices" }) {
  const rows = sortSlabs(slabs);
  if (!rows.length) return null;
  const active = appliedSlab || activeSlab(rows, qty);
  const isActive = (s) => active && s.minQty === active.minQty;
  return (
    <div className={cn("overflow-hidden rounded-card border border-shop-line", className)}>
      <table className="w-full text-shop-sm">
        <caption className="bg-shop-gold-soft px-3 py-2 text-left text-shop-sm font-semibold text-shop-gold-ink">
          <span className="inline-flex items-center gap-1.5">
            <Boxes className="size-4" strokeWidth={1.75} aria-hidden />
            {caption}
            {pack ? <span className="font-normal">· per {pack}</span> : null}
          </span>
        </caption>
        <thead className="sr-only">
          <tr>
            <th scope="col">Quantity</th>
            <th scope="col">Price each</th>
            <th scope="col">Saving</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-shop-line">
          {rows.map((s) => {
            const on = isActive(s);
            const save = basePrice && basePrice > s.unitPrice ? Math.floor(((basePrice - s.unitPrice) / basePrice) * 100) : 0;
            return (
              <tr key={`${s.minQty}-${s.maxQty}`} className={cn(on && "bg-shop-primary-soft")} aria-current={on ? "true" : undefined}>
                <td className="px-3 py-2 tabular-nums text-shop-text">
                  {slabRange(s)} {pack ? "packs" : "units"}
                </td>
                <td className="px-3 py-2 text-right font-semibold tabular-nums text-shop-ink">{formatListing(s.unitPrice)} each</td>
                <td className="w-24 px-3 py-2 text-right text-shop-xs">
                  {on ? <span className="font-semibold text-shop-primary-ink">Your price</span> : save ? <span className="text-shop-muted">save {save}%</span> : null}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/**
 * One-line slab nudge. With `qty` (cart/PDP): "Add 6 more for ₹391 each". Without (cards): "₹391 at 50+".
 * Pass the cart line's server `nextSlab` ({ minQty, unitPrice, saveEach, addQty }) as `next`.
 */
export function SlabHint({ slabs, qty, next: serverNext, className, compact = false }) {
  const rows = sortSlabs(slabs);
  if (!rows.length && !serverNext) return null;
  if (qty != null) {
    const next = serverNext !== undefined ? serverNext : nextSlab(rows, qty);
    if (!next) return null;
    const more = next.addQty ?? next.minQty - qty;
    return (
      <p className={cn("text-shop-xs font-medium text-shop-gold-ink", className)}>
        {compact ? (
          <>
            +{more} for {formatListing(next.unitPrice)} each
          </>
        ) : (
          <>
            Add {more} more for {formatListing(next.unitPrice)} each
          </>
        )}
      </p>
    );
  }
  const best = bestSlab(rows);
  if (!best) return null;
  return (
    <p className={cn("inline-flex items-center gap-1 text-shop-xs font-medium text-shop-gold-ink", className)}>
      <Boxes className="size-3.5" strokeWidth={1.75} aria-hidden />
      <span className="tabular-nums">
        {formatListing(best.unitPrice)} at {best.minQty}+
      </span>
    </p>
  );
}
