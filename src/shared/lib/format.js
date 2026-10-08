/**
 * Formatting helpers. Everything is rendered in the business timezone (Asia/Kolkata) and INR.
 * Null/undefined render as "—" (never as ₹0.00 or "Invalid date").
 */
export const TZ = "Asia/Kolkata";
export const DASH = "—";
const IST_OFFSET_MIN = 330;

const inrFmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const inrWhole = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const numFmt = new Intl.NumberFormat("en-IN");
const compactFmt = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });

function isBlank(value) {
  return value === null || value === undefined || value === "" || (typeof value === "number" && !Number.isFinite(value));
}

/** ₹1,23,456.00 — "—" for null/undefined/"" (0 stays ₹0.00). */
export function inr(value, { whole = false, fallback = DASH } = {}) {
  if (isBlank(value)) return fallback;
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return (whole ? inrWhole : inrFmt).format(n);
}

export const inr2 = (value) => inr(value);

/** Paise (integer) → ₹ string. */
export function inrPaise(paise) {
  return isBlank(paise) ? DASH : inr(Number(paise) / 100);
}

export function number(value, fallback = DASH) {
  return isBlank(value) || !Number.isFinite(Number(value)) ? fallback : numFmt.format(Number(value));
}

export function compactNumber(value, fallback = DASH) {
  return isBlank(value) || !Number.isFinite(Number(value)) ? fallback : compactFmt.format(Number(value));
}

export function percent(value, digits = 1, fallback = DASH) {
  if (isBlank(value) || !Number.isFinite(Number(value))) return fallback;
  return `${Number(value).toFixed(digits)}%`;
}

export const PAYMENT_LABELS = {
  upi: "UPI",
  card: "Card",
  netbanking: "Net banking",
  cod: "Cash on delivery",
  purchase_order: "Purchase order",
  credit_terms: "Credit terms",
};

export function paymentLabel(method) {
  return PAYMENT_LABELS[method] || method || DASH;
}

/* ------------------------------------------------------------------ dates (IST) */

function toDate(value) {
  if (isBlank(value)) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

const fmtCache = new Map();
function fmt(options) {
  const key = JSON.stringify(options);
  if (!fmtCache.has(key)) fmtCache.set(key, new Intl.DateTimeFormat("en-IN", { timeZone: TZ, ...options }));
  return fmtCache.get(key);
}

/** 6 Oct 2026 */
export function formatDate(value, fallback = "") {
  const d = toDate(value);
  return d ? fmt({ day: "numeric", month: "short", year: "numeric" }).format(d) : fallback;
}

/** 6 Oct 2026, 09:15 pm */
export function formatDateTime(value, fallback = "") {
  const d = toDate(value);
  return d ? fmt({ day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(d) : fallback;
}

/** 09:15 pm */
export function formatTime(value, fallback = "") {
  const d = toDate(value);
  return d ? fmt({ hour: "2-digit", minute: "2-digit" }).format(d) : fallback;
}

export function formatEta(from, to) {
  if (!from) return "";
  const a = formatDate(from);
  const b = formatDate(to);
  return b && b !== a ? `${a} – ${b}` : a;
}

const rtf = new Intl.RelativeTimeFormat("en-IN", { numeric: "auto" });
const UNITS = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
  ["second", 1],
];

/** "3 minutes ago", "in 2 days", "just now". */
export function relativeTime(value, now = Date.now(), fallback = "") {
  const d = toDate(value);
  if (!d) return fallback;
  const diff = (d.getTime() - now) / 1000;
  if (Math.abs(diff) < 45) return "just now";
  for (const [unit, secs] of UNITS) {
    if (Math.abs(diff) >= secs || unit === "second") return rtf.format(Math.round(diff / secs), unit);
  }
  return fallback;
}

/** Calendar parts of an instant in IST: { year, month (1-12), day, hour, minute }. */
export function istParts(value) {
  const d = toDate(value);
  if (!d) return null;
  const shifted = new Date(d.getTime() + IST_OFFSET_MIN * 60_000);
  return {
    year: shifted.getUTCFullYear(),
    month: shifted.getUTCMonth() + 1,
    day: shifted.getUTCDate(),
    hour: shifted.getUTCHours(),
    minute: shifted.getUTCMinutes(),
  };
}

const pad = (n) => String(n).padStart(2, "0");

/** UTC ISO / Date → "YYYY-MM-DDTHH:mm" in IST, for <input type="datetime-local">. */
export function toIstInputValue(value) {
  const p = istParts(value);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}T${pad(p.hour)}:${pad(p.minute)}` : "";
}

/** "YYYY-MM-DDTHH:mm" typed as IST → UTC ISO string ("" when empty/invalid). */
export function fromIstInputValue(local) {
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(String(local || ""));
  if (!m) return "";
  const utc = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5]) - IST_OFFSET_MIN * 60_000;
  return new Date(utc).toISOString();
}

/** UTC ISO / Date → "YYYY-MM-DD" (IST calendar day), for <input type="date">. */
export function toIstDateValue(value) {
  const p = istParts(value);
  return p ? `${p.year}-${pad(p.month)}-${pad(p.day)}` : "";
}

/**
 * Parse a date-only string "YYYY-MM-DD" as an IST day. Returns the UTC instant of IST midnight
 * (or of 23:59:59.999 IST with `{ endOfDay: true }`) as a Date, or null.
 */
export function parseIstDate(dateOnly, { endOfDay = false } = {}) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateOnly || ""));
  if (!m) return null;
  const base = Date.UTC(+m[1], +m[2] - 1, +m[3]) - IST_OFFSET_MIN * 60_000;
  return new Date(endOfDay ? base + 24 * 3600_000 - 1 : base);
}

/** Today in IST as "YYYY-MM-DD". */
export function istToday() {
  return toIstDateValue(new Date());
}

/** "YYYY-MM-DD" n days before today (IST). */
export function istDaysAgo(n) {
  return toIstDateValue(new Date(Date.now() - n * 24 * 3600_000));
}
