import { cn } from "../../../shared/ui/cn.js";
import { ErrorState, Skeleton, SkeletonText } from "../../../shared/ui/index.js";
import { TZ, inr, parseIstDate } from "../../../shared/lib/format.js";

/**
 * Helpers shared by the tenant Dashboard, Reports and Analytics pages.
 * All money math stays on the server: the only client arithmetic is the % change between two
 * server-computed numbers (current vs previous period).
 */

/** % change between two server values; null when there is no previous baseline (avoid fake "+100%"). */
export function pctChange(current, previous) {
  const c = Number(current);
  const p = Number(previous);
  if (!Number.isFinite(c) || !Number.isFinite(p) || p === 0) return null;
  return ((c - p) / p) * 100;
}

/** Hint for a KPI tile delta: says why there is no % when the previous period was empty. */
export function deltaHint(previous, label = "vs previous 30 days") {
  return Number(previous) ? label : "No data in the previous 30 days";
}

/**
 * StatCard props for a server-computed change (`overview.changes.orders|gmv|aov`, a % or null).
 * null (no baseline in the previous period) renders "—" instead of a fake percentage.
 *   <StatCard {...changeProps(o.changes?.aov, "vs previous 30 days")} />
 */
export function changeProps(change, label = "vs previous period") {
  const n = change == null || change === "" ? null : Number(change);
  if (n == null || !Number.isFinite(n)) return { delta: undefined, hint: `— ${label} (no baseline)` };
  return { delta: n, hint: label };
}

/** Same as changeProps, computing the % from two server values (net sales, fees). */
export function pctProps(current, previous, label = "vs previous period") {
  return changeProps(pctChange(current, previous), label);
}

const shortDay = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short" });
const longDay = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** "YYYY-MM-DD" (IST calendar day from the API) → "6 Oct". */
export function dayShort(day) {
  const d = parseIstDate(day);
  return d ? shortDay.format(d) : day || "";
}

/** "YYYY-MM-DD" (IST) → "Tue, 6 Oct 2026". */
export function dayLong(day) {
  const d = parseIstDate(day);
  return d ? longDay.format(d) : day || "";
}

/** Chart axis/tooltip formatter for money (whole rupees). */
export const moneyAxis = (v) => inr(v, { whole: true });
export const countAxis = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString("en-IN", { maximumFractionDigits: 1 }) : "—");

/** "ORDER_CREATED" → "Order created". */
export function eventLabel(event) {
  if (!event) return "—";
  const s = String(event).toLowerCase().replaceAll("_", " ");
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Per-panel query switch: skeleton while pending, compact error with retry, else children. */
export function PanelState({ query, skeleton, children }) {
  if (query.isPending) return skeleton || <SkeletonText lines={4} />;
  if (query.error) return <ErrorState compact error={query.error} onRetry={() => query.refetch()} />;
  return children;
}

export function ChartSkeleton({ className }) {
  return <Skeleton className={cn("h-52 w-full rounded-md", className)} />;
}

/** Small segmented control (radio semantics) for switching a chart metric. */
export function Segmented({ value, onChange, options, label }) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-md bg-surface-sunken p-0.5">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              "rounded-sm px-2.5 py-1 text-ui-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-primary",
              on ? "bg-surface text-fg shadow-xs" : "text-fg-muted hover:text-fg"
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

/** Small "All time" / range tag shown in card headers so scope is never ambiguous. */
export function ScopeTag({ children }) {
  return <span className="rounded-sm bg-surface-sunken px-1.5 py-0.5 text-ui-2xs font-medium uppercase tracking-wide text-fg-muted">{children}</span>;
}
