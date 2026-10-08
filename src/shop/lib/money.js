/**
 * Money display rules for the storefront.
 *
 * - Values come from the server (quote / preview / order / catalog fields). Never add up money on
 *   the client: render the server field, or a skeleton while the server quote is pending.
 * - Listings (cards, rails, search): `formatListing` drops ".00" (₹42), keeps real paise (₹41.50).
 * - Cart, checkout, invoices: `formatExact` always shows paise (₹42.00).
 * - null / undefined / NaN → "—" (never ₹0).
 */
const exact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const whole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0, maximumFractionDigits: 0 });

export const DASH = "—";

export function isAmount(value) {
  if (value === null || value === undefined || value === "") return false;
  return Number.isFinite(Number(value));
}

/** ₹1,234.50 */
export function formatExact(value) {
  return isAmount(value) ? exact.format(Number(value)) : DASH;
}

/** ₹1,234 (whole rupees) or ₹1,234.50 when the amount really has paise. */
export function formatListing(value) {
  if (!isAmount(value)) return DASH;
  const n = Math.round(Number(value) * 100) / 100;
  return Number.isInteger(n) ? whole.format(n) : exact.format(n);
}

/** `mode`: "listing" (default) | "exact". */
export function formatMoney(value, mode = "listing") {
  return mode === "exact" ? formatExact(value) : formatListing(value);
}

/** Whole-percent discount of `price` against `mrp` (floored, so we never over-claim). 0 when none. */
export function discountPercent(mrp, price) {
  const m = Number(mrp);
  const p = Number(price);
  if (!Number.isFinite(m) || !Number.isFinite(p) || m <= 0 || p >= m) return 0;
  return Math.floor(((m - p) / m) * 100);
}
