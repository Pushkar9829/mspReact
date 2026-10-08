/**
 * Quantity model from the server's `rules` ({ min, step, max, bulkEligible, bulkFrom,
 * bulk: { min, step, max } | null }, on search/lookup variants and cart lines).
 *
 * One cart line per variant; "bulk" is derived from qty. Below `bulkFrom` any qty ≥ 1 is valid
 * (step 1); from `bulkFrom` on, the pack multiple (`bulk.step`) and the order max (`bulk.max`) apply.
 *
 *   const m = qtyModel(line.rules);
 *   m.next(qty, +1)   m.next(qty, -1)  (0 = remove)   m.snap(typed)   m.isBulk(qty)
 */
export function qtyModel(rules) {
  const r = rules || {};
  const bulk = r.bulkEligible && r.bulk ? r.bulk : null;
  const bulkFrom = bulk ? Math.max(1, Number(r.bulkFrom ?? bulk.min) || 1) : Infinity;
  const bulkStep = bulk ? Math.max(1, Number(bulk.step) || 1) : 1;
  const bulkMax = bulk && bulk.max != null ? Number(bulk.max) : Infinity;
  const regularMax = !bulk && r.max != null ? Number(r.max) : Infinity;
  const max = bulk ? bulkMax : regularMax;

  const isBulk = (q) => Boolean(bulk) && q >= bulkFrom;
  const capped = (q) => (Number.isFinite(max) ? Math.min(q, max) : q);

  function snap(raw) {
    const n = Math.floor(Number(raw));
    if (!Number.isFinite(n)) return null;
    if (n <= 0) return 0;
    if (!isBulk(n)) return capped(n);
    const stepped = Math.max(bulkFrom, Math.ceil(n / bulkStep) * bulkStep);
    return capped(stepped);
  }

  function next(cur, dir) {
    const q = Number(cur) || 0;
    if (dir > 0) {
      const n = isBulk(q) ? q + bulkStep : q + 1;
      return snap(n);
    }
    if (isBulk(q)) {
      const n = q - bulkStep;
      return n >= bulkFrom ? n : bulkFrom - 1;
    }
    return Math.max(0, q - 1);
  }

  return {
    min: 1,
    max,
    bulkFrom: Number.isFinite(bulkFrom) ? bulkFrom : null,
    bulkStep,
    isBulk,
    snap,
    next,
    stepAt: (q) => (isBulk(q) ? bulkStep : 1),
    describe: () =>
      bulk
        ? [`Bulk price from ${bulkFrom}`, bulkStep > 1 ? `then in steps of ${bulkStep}` : "", Number.isFinite(bulkMax) ? `max ${bulkMax} per order` : ""].filter(Boolean).join(" · ")
        : "",
  };
}

/** @deprecated legacy pages: { bulk, step, moq, min, max } for a product or old cart line. */
export function qtyRules(item, { stock, inCartElsewhere = 0, bulk } = {}) {
  const stockCap = stock != null && Number.isFinite(Number(stock)) ? Math.max(0, Number(stock)) : Infinity;
  const isBulk = (bulk ?? Boolean(item?.bulk)) && Boolean(item?.bulkEligible);
  if (!isBulk) return { bulk: false, step: 1, moq: 1, min: 1, max: stockCap };
  const step = Math.max(1, Number(item.packMultiple) || 1);
  const moq = Math.max(1, Number(item.moq) || 1);
  const min = Math.ceil(moq / step) * step;
  const limit = Number(item.orderLimit) > 0 ? Number(item.orderLimit) - inCartElsewhere : Infinity;
  const cap = Math.min(limit, stockCap);
  const max = Number.isFinite(cap) ? Math.max(0, Math.floor(cap / step) * step) : Infinity;
  return { bulk: true, step, moq, min, max };
}

/** @deprecated legacy pages: next qty for a +/− press (0 = remove). */
export function stepQty(rules, current, direction) {
  const cur = Number(current) || 0;
  if (direction > 0) return Math.min(cur < rules.min ? rules.min : cur + rules.step, rules.max);
  const next = cur - rules.step;
  return next < rules.min ? 0 : next;
}
