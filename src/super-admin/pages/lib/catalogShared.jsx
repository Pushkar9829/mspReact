import { Star } from "lucide-react";
import { Alert, Button, Dialog } from "../../../shared/ui/index.js";
import { cn } from "../../../shared/ui/cn.js";

/** Id of a populated ref or a raw id ("" when missing). */
export function refId(v) {
  if (!v) return "";
  if (typeof v === "object") return String(v._id || v.id || "");
  return String(v);
}

/**
 * Run `fn(row)` over rows with limited concurrency and collect per-row results.
 * Returns { ok: rows[], failed: [{ row, error }], skipped: [{ row, reason }] }.
 * `skip(row)` may return a reason string to leave a row out (reported, not sent).
 */
export async function runBulk(rows, fn, { concurrency = 4, skip } = {}) {
  const ok = [];
  const failed = [];
  const skipped = [];
  const queue = [];
  rows.forEach((row) => {
    const reason = skip?.(row);
    if (reason) skipped.push({ row, reason });
    else queue.push(row);
  });
  let cursor = 0;
  async function worker() {
    while (cursor < queue.length) {
      const row = queue[cursor++];
      try {
        await fn(row);
        ok.push(row);
      } catch (error) {
        failed.push({ row, error });
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, queue.length) }, worker));
  return { ok, failed, skipped };
}

/**
 * Partial-failure report for a bulk action.
 *   <BulkResultDialog result={{ title, ok, failed, skipped }} labelOf={(row) => row.name} onClose={() => setResult(null)} />
 */
export function BulkResultDialog({ result, labelOf = (r) => r?.name || r?._id, onClose }) {
  const open = Boolean(result);
  const failed = result?.failed || [];
  const skipped = result?.skipped || [];
  const ok = result?.ok || [];
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => !o && onClose?.()}
      title={result?.title || "Bulk action finished"}
      description={`${ok.length} succeeded · ${failed.length} failed${skipped.length ? ` · ${skipped.length} skipped` : ""}`}
      footer={<Button onClick={onClose}>Close</Button>}
    >
      <div className="grid gap-3">
        {failed.length ? (
          <Alert tone="danger" title={`${failed.length} could not be updated`}>
            <ul className="mt-1 grid gap-1">
              {failed.map(({ row, error }, i) => (
                <li key={i} className="text-ui-sm">
                  <span className="font-medium">{labelOf(row)}</span> — {error?.message || "Failed"}
                  {error?.requestId ? <span className="ml-1 font-mono text-ui-2xs opacity-70">({error.requestId})</span> : null}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {skipped.length ? (
          <Alert tone="warning" title={`${skipped.length} skipped`}>
            <ul className="mt-1 grid gap-1">
              {skipped.map(({ row, reason }, i) => (
                <li key={i} className="text-ui-sm">
                  <span className="font-medium">{labelOf(row)}</span> — {reason}
                </li>
              ))}
            </ul>
          </Alert>
        ) : null}
        {!failed.length && !skipped.length ? <Alert tone="success">All {ok.length} items were updated.</Alert> : null}
      </div>
    </Dialog>
  );
}

/** Star rating with an accessible label. */
export function Stars({ rating, className }) {
  const n = Math.max(0, Math.min(5, Math.round(Number(rating) || 0)));
  return (
    <span role="img" aria-label={`${n} out of 5 stars`} className={cn("inline-flex items-center gap-0.5", className)}>
      {[1, 2, 3, 4, 5].map((i) => (
        <Star key={i} aria-hidden className={cn("size-3.5", i <= n ? "fill-warning text-warning" : "text-fg-subtle/50")} />
      ))}
    </span>
  );
}

/** "" / null / undefined → undefined; otherwise Number (NaN stays NaN so validation can flag it). */
export function parseNum(v) {
  if (v === "" || v == null) return undefined;
  const n = Number(v);
  return n;
}

/** Number → input string (null/undefined → ""). */
export function numStr(v) {
  return v === null || v === undefined || Number.isNaN(v) ? "" : String(v);
}

export const isInt = (n) => Number.isInteger(n);

/** Human summary of variant attributes ("500 g · Red · flavor: mint"). */
export function attributeSummary(attrs = {}) {
  const parts = [];
  ["packSize", "size", "color", "grade", "material"].forEach((k) => {
    if (attrs?.[k]) parts.push(attrs[k]);
  });
  const custom = attrs?.custom && typeof attrs.custom === "object" ? attrs.custom : {};
  Object.entries(custom).forEach(([k, v]) => parts.push(`${k}: ${v}`));
  return [...new Set(parts)].join(" · ");
}

/** Short label for an offer's discount. */
export function offerDiscountLabel(offer) {
  if (!offer) return "—";
  if (offer.type === "percent") return `${offer.value}% off`;
  if (offer.type === "fixed") return `₹${offer.value} off`;
  if (offer.type === "flash") return `Flash ₹${offer.value} off`;
  return String(offer.value ?? "—");
}
