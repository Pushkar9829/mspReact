import { inr } from "../../shared/lib/format.js";

export function slabRange(slab) {
  return slab.maxQty == null ? `${slab.minQty}+` : `${slab.minQty}–${slab.maxQty}`;
}

/** The slab after the one `qty` falls in, so the cart can say how many more unlock a lower price. */
export function nextSlab(slabs, qty) {
  return [...(slabs || [])].sort((a, b) => a.minQty - b.minQty).find((s) => s.minQty > qty) || null;
}

/** Bulk slab prices for one pack size. Prices already include offers, matching what the cart charges. */
export default function SlabTable({ slabs, pack, qty = 0, className = "" }) {
  if (!slabs?.length) return null;
  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);
  const active = qty ? [...sorted].reverse().find((s) => qty >= s.minQty) : null;
  return (
    <div className={`overflow-hidden rounded-lg border border-msr-line ${className}`}>
      <p className="flex items-center justify-between gap-2 bg-msr-surface px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wide text-msr-subtle">
        <span>Bulk price{pack ? ` · per ${pack}` : ""}</span>
        <span className="normal-case tracking-normal">Qty</span>
      </p>
      <ul className="divide-y divide-msr-line">
        {sorted.map((slab) => {
          const on = active === slab;
          return (
            <li
              key={`${slab.minQty}-${slab.maxQty}`}
              className={`flex items-center justify-between gap-2 px-2.5 py-1.5 text-[12px] ${on ? "bg-msr-primary-soft" : ""}`}
            >
              <span className="whitespace-nowrap font-bold text-msr-ink">{inr(slab.unitPrice)}</span>
              <span className={`whitespace-nowrap ${on ? "font-semibold text-msr-primary-ink" : "text-msr-muted"}`}>
                {slabRange(slab)} {pack ? "packs" : "units"}
                {on ? " · selected" : ""}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** Compact horizontal slabs for a cart line; the slab `qty` falls in is marked selected. */
export function SlabStrip({ slabs, qty = 0, pack, className = "" }) {
  if (!slabs?.length) return null;
  const sorted = [...slabs].sort((a, b) => a.minQty - b.minQty);
  const active = [...sorted].reverse().find((s) => qty >= s.minQty) || null;
  return (
    <div className={className}>
      <p className="mb-1.5 text-[10.5px] font-bold uppercase tracking-wide text-msr-subtle">
        Bulk slabs{pack ? ` · per ${pack}` : ""}
      </p>
      <ul className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {sorted.map((slab) => {
          const on = active === slab;
          return (
            <li
              key={`${slab.minQty}-${slab.maxQty}`}
              className={`relative rounded-lg border px-2.5 py-1.5 ${
                on ? "border-msr-primary bg-msr-primary-soft" : "border-msr-line bg-white"
              }`}
            >
              <span className="block text-[13px] font-extrabold text-msr-ink">{inr(slab.unitPrice)}</span>
              <span className={`block text-[11px] ${on ? "font-semibold text-msr-primary-ink" : "text-msr-muted"}`}>
                {slabRange(slab)} packs
              </span>
              {on ? (
                <span className="absolute right-1.5 top-1.5 rounded bg-msr-primary px-1 py-px text-[9.5px] font-bold uppercase text-white">
                  Selected
                </span>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}

/** One-line description of the bulk ordering rules. */
export function bulkRulesText({ moq, packMultiple, orderLimit }) {
  const parts = [`Min ${moq || 1}`];
  if (packMultiple > 1) parts.push(`in steps of ${packMultiple}`);
  if (orderLimit) parts.push(`max ${orderLimit} per order (all pack sizes)`);
  return parts.join(" · ");
}
