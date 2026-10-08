/**
 * Small building blocks shared by the "My account" pages (overview, credit, coupons…).
 *   <AccountSection icon title description action footer>…</AccountSection>
 *   <IconCircle icon tone="primary|gold|saffron|info|danger|neutral" />
 *   <CreditMeter store={ledgerStoreRow} />     // limit / used / available bar from GET /ledger/me stores[]
 *   const { copied, copy } = useCopyCode();    // clipboard with toast fallback
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "../ui/cn.js";
import { Money } from "../ui/Price.jsx";

const CIRCLE_TONES = {
  primary: "bg-shop-primary-soft text-shop-primary-ink",
  gold: "bg-shop-gold-soft text-shop-gold-ink",
  saffron: "bg-shop-saffron-soft text-shop-saffron-ink",
  info: "bg-shop-info-soft text-shop-info-ink",
  danger: "bg-shop-danger-soft text-shop-danger-ink",
  neutral: "bg-shop-well text-shop-text",
};

export function IconCircle({ icon: Icon, tone = "primary", className, size = "md" }) {
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-full", size === "lg" ? "size-11" : size === "sm" ? "size-8" : "size-9", CIRCLE_TONES[tone] || CIRCLE_TONES.primary, className)}>
      <Icon className={size === "lg" ? "size-5" : "size-4"} strokeWidth={1.9} />
    </span>
  );
}

/** Card section with a header row (icon circle, title, optional "View" link) and an optional footer band. */
export function AccountSection({ icon, tone, title, description, to, linkLabel = "View all", action, footer, children, className, bodyClassName, id }) {
  return (
    <section aria-labelledby={id} aria-label={id ? undefined : title} className={cn("flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card", className)}>
      <header className="flex items-start justify-between gap-3 px-4 pt-4 sm:px-5">
        <div className="flex min-w-0 items-start gap-3">
          {icon ? <IconCircle icon={icon} tone={tone} /> : null}
          <div className="min-w-0">
            <h2 id={id} className="font-display text-shop-md font-bold text-shop-ink">
              {title}
            </h2>
            {description ? <p className="mt-0.5 text-shop-sm text-shop-muted">{description}</p> : null}
          </div>
        </div>
        {action ||
          (to ? (
            <Link to={to} className="-mt-2 inline-flex min-h-11 shrink-0 items-center gap-0.5 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
              {linkLabel}
              <ChevronRight className="size-4" aria-hidden />
              <span className="sr-only"> {title}</span>
            </Link>
          ) : null)}
      </header>
      <div className={cn("flex-1 px-4 pb-4 pt-3 sm:px-5", bodyClassName)}>{children}</div>
      {footer ? <div className="border-t border-shop-line bg-shop-page/60 px-4 py-3 sm:px-5">{footer}</div> : null}
    </section>
  );
}

/** Used share of a credit line, for the meter. Display-only arithmetic on server fields. */
export function creditUsage(s) {
  const limit = Number(s?.creditLimit) || 0;
  const used = Math.max(0, Number(s?.outstanding) || 0);
  const pct = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  return { limit, used, pct, over: limit > 0 && used > limit };
}

/** Limit / used / available for one seller's credit line (stores[] row of GET /ledger/me). */
export function CreditMeter({ store: s, className, compact = false }) {
  const { limit, used, pct, over } = creditUsage(s);
  const advance = Number(s?.advance) || 0;
  const bar = over || pct >= 90 ? "bg-shop-danger" : pct >= 70 ? "bg-shop-gold" : "bg-shop-primary";
  return (
    <div className={cn("grid gap-2", className)}>
      <div className="flex flex-wrap items-end justify-between gap-x-3 gap-y-1">
        <div>
          <p className="text-shop-xs font-medium text-shop-muted">Available to spend</p>
          <p className={cn("font-display font-bold tabular-nums text-shop-ink", compact ? "text-shop-lg" : "text-shop-2xl")}>
            <Money value={s?.spendable} />
          </p>
        </div>
        {limit > 0 ? (
          <p className="text-shop-xs text-shop-muted">
            Used <Money value={used} className="font-semibold text-shop-text" /> of <Money value={limit} className="font-semibold text-shop-text" />
          </p>
        ) : null}
      </div>
      {limit > 0 ? (
        <div
          role="meter"
          aria-label="Credit used"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={pct}
          aria-valuetext={`${pct}% of the credit limit used`}
          className="h-2 overflow-hidden rounded-full bg-shop-well"
        >
          <div className={cn("h-full rounded-full transition-[width] duration-500", bar)} style={{ width: `${Math.max(pct, used > 0 ? 3 : 0)}%` }} />
        </div>
      ) : null}
      {!compact ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-shop-sm sm:grid-cols-4">
          <div>
            <dt className="text-shop-xs text-shop-muted">Credit limit</dt>
            <dd className="font-semibold tabular-nums text-shop-ink">
              <Money value={limit} />
            </dd>
          </div>
          <div>
            <dt className="text-shop-xs text-shop-muted">Outstanding</dt>
            <dd className={cn("font-semibold tabular-nums", used > 0 ? "text-shop-ink" : "text-shop-text")}>
              <Money value={used} />
            </dd>
          </div>
          <div>
            <dt className="text-shop-xs text-shop-muted">Unused credit</dt>
            <dd className="font-semibold tabular-nums text-shop-ink">
              <Money value={s?.available} />
            </dd>
          </div>
          {advance > 0 ? (
            <div>
              <dt className="text-shop-xs text-shop-muted">Advance with seller</dt>
              <dd className="font-semibold tabular-nums text-shop-primary-ink">
                <Money value={advance} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
      {over ? <p className="text-shop-xs font-semibold text-shop-danger-ink">Outstanding is above your credit limit. Pay the seller to free up credit.</p> : null}
    </div>
  );
}

/** Copy a coupon code; falls back to a toast showing the code when the clipboard is blocked. */
export function useCopyCode() {
  const [copied, setCopied] = useState("");
  const copy = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(code);
      toast.success(`Copied ${code}`, { description: "Apply it in your cart." });
      setTimeout(() => setCopied((c) => (c === code ? "" : c)), 2500);
    } catch {
      toast(`Code: ${code}`);
    }
  };
  return { copied, copy };
}
