/**
 * Bulk slab helpers. Slabs come from the server (variant.tierPrices / cart line tierPrices, or the
 * cart line's appliedSlab / nextSlab once the backend sends them). Prices already include offers.
 * Slab rows: { minQty, maxQty|null, unitPrice }.
 */
export function sortSlabs(slabs) {
  return [...(slabs || [])].filter((s) => s && Number(s.minQty) > 0).sort((a, b) => a.minQty - b.minQty);
}

export function slabRange(slab) {
  if (!slab) return "";
  return slab.maxQty == null ? `${slab.minQty}+` : `${slab.minQty}–${slab.maxQty}`;
}

/** The slab `qty` falls in (highest minQty ≤ qty), or null. */
export function activeSlab(slabs, qty) {
  const n = Number(qty) || 0;
  return [...sortSlabs(slabs)].reverse().find((s) => n >= s.minQty && (s.maxQty == null || n <= s.maxQty)) || null;
}

/** First slab above `qty` (to say "Add 6 more for ₹391 each"), or null. */
export function nextSlab(slabs, qty) {
  const n = Number(qty) || 0;
  return sortSlabs(slabs).find((s) => s.minQty > n) || null;
}

/** Lowest slab price (for "₹391 at 50+" hints). */
export function bestSlab(slabs) {
  const rows = sortSlabs(slabs);
  return rows.length ? rows.reduce((best, s) => (s.unitPrice < best.unitPrice ? s : best), rows[0]) : null;
}

/** One-line description of the bulk ordering rules. */
export function bulkRulesText({ moq, packMultiple, orderLimit, maxQty } = {}) {
  const parts = [`Min ${moq || 1}`];
  if (packMultiple > 1) parts.push(`in steps of ${packMultiple}`);
  const max = orderLimit ?? maxQty;
  if (max) parts.push(`max ${max} per order`);
  return parts.join(" · ");
}
