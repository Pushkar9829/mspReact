/**
 * Quantity rules for a product or cart line. MOQ, pack multiple and max qty apply only to bulk
 * lines (bought from the bulk screen); regular lines move one unit at a time. Cart lines carry
 * their own `bulk` flag; for products pass `{ bulk: true }` to get the bulk rules.
 */
export function qtyRules(item, { stock, inCartElsewhere = 0, bulk } = {}) {
  const stockCap = stock != null && Number.isFinite(Number(stock)) ? Math.max(0, Number(stock)) : Infinity;
  const isBulk = (bulk ?? Boolean(item?.bulk)) && Boolean(item?.bulkEligible);
  if (!isBulk) {
    return { bulk: false, step: 1, moq: 1, min: 1, max: stockCap };
  }
  const step = Math.max(1, Number(item.packMultiple) || 1);
  const moq = Math.max(1, Number(item.moq) || 1);
  const min = Math.ceil(moq / step) * step;
  const limit = Number(item.orderLimit) > 0 ? Number(item.orderLimit) - inCartElsewhere : Infinity;
  const cap = Math.min(limit, stockCap);
  const max = Number.isFinite(cap) ? Math.max(0, Math.floor(cap / step) * step) : Infinity;
  return { bulk: true, step, moq, min, max };
}

/** Next quantity for a +/− press; returns 0 when − goes below the minimum (remove). */
export function stepQty(rules, current, direction) {
  const cur = Number(current) || 0;
  if (direction > 0) {
    const next = cur < rules.min ? rules.min : cur + rules.step;
    return Math.min(next, rules.max);
  }
  const next = cur - rules.step;
  return next < rules.min ? 0 : next;
}
