const r2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/**
 * Splits buyable cart lines into MRP → product discount → bulk slab saving → amount, separately for
 * regular and bulk lines, plus the GST (included in prices) grouped by rate.
 */
export function orderBreakdown(items) {
  const lines = (items || []).filter((i) => !i.issue);
  const part = () => ({ lines: 0, units: 0, amount: 0 });
  const regular = part();
  const bulk = part();
  let mrp = 0;
  let productDiscount = 0;
  let slabSaving = 0;
  const gst = new Map();

  for (const i of lines) {
    const qty = Number(i.qty) || 0;
    const unit = Number(i.price) || 0;
    const base = Math.max(unit, Number(i.basePrice ?? unit) || 0);
    const list = Math.max(base, Number(i.mrp ?? base) || 0);
    const amount = Number(i.lineSubtotal ?? unit * qty) || 0;
    const bucket = i.bulk ? bulk : regular;
    bucket.lines += 1;
    bucket.units += qty;
    bucket.amount += amount;
    mrp += list * qty;
    productDiscount += (list - base) * qty;
    slabSaving += (base - unit) * qty;

    const rate = Number(i.taxRate) || 0;
    const row = gst.get(rate) || { rate, taxableValue: 0, tax: 0 };
    row.taxableValue += Number(i.taxableValue) || 0;
    row.tax += Number(i.tax) || 0;
    gst.set(rate, row);
  }

  const gstRows = [...gst.values()]
    .filter((row) => row.taxableValue || row.tax)
    .sort((a, b) => a.rate - b.rate)
    .map((row) => ({ ...row, taxableValue: r2(row.taxableValue), tax: r2(row.tax) }));

  return {
    mrp: r2(mrp),
    productDiscount: r2(productDiscount),
    slabSaving: r2(slabSaving),
    regular: { ...regular, amount: r2(regular.amount) },
    bulk: { ...bulk, amount: r2(bulk.amount) },
    subtotal: r2(regular.amount + bulk.amount),
    gstRows,
    taxableValue: r2(gstRows.reduce((s, row) => s + row.taxableValue, 0)),
    tax: r2(gstRows.reduce((s, row) => s + row.tax, 0)),
  };
}
