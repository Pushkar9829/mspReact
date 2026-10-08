/**
 * Coupons from GET /cart/coupons (eligible / savings / reason / applied / best), applied ONLY
 * through the cart mutation (useCartActions().applyCoupon) and only when the buyer asks.
 *
 *   <CouponPanel />          // cart: applied code, best suggestion, other eligible codes, manual entry
 *   <CouponCard coupon={c} /> // coupons page (ticket: value stub, conditions, copy code, Apply)
 */
import { useId, useState } from "react";
import { BadgePercent, Check, Copy, Store, Tag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "../ui/Button.jsx";
import { Input } from "../ui/form.jsx";
import { cn } from "../ui/cn.js";
import { Money } from "../ui/Price.jsx";
import { Skeleton } from "../ui/Skeletons.jsx";
import { useCartActions, useCartCoupons, useCartQuery } from "../../hooks/useCart.js";
import { formatListing } from "../../lib/money.js";
import { formatDate } from "../../../shared/lib/format.js";
import { displayName } from "../../lib/text.js";

export function couponHeadline(c) {
  if (c.type === "percent") return `${c.value}% off`;
  if (c.type === "fixed" || c.type === "flat" || c.type === "amount") return `${formatListing(c.value)} off`;
  return c.name || c.code;
}

export function couponTerms(c) {
  return [
    Number(c.minCartValue) > 0 ? `On orders over ${formatListing(c.minCartValue)}` : "No minimum order",
    c.appliesTo === "bulk" ? "bulk-price items only" : c.appliesTo === "regular" ? "regular-price items only" : "",
    c.firstOrderOnly ? "first order with this seller" : "",
    c.targeted ? "for your account" : "",
  ]
    .filter(Boolean)
    .join(" · ");
}

/** Ticket stub text: "10%" / "₹50" over "OFF". */
export function CouponStub({ coupon: c, className }) {
  const pct = c.type === "percent";
  return (
    <span className={cn("relative grid w-[4.75rem] shrink-0 place-items-center border-r-2 border-dashed border-shop-line-strong bg-shop-saffron-soft px-1.5 py-3 text-center text-shop-saffron-ink sm:w-24", className)}>
      <span className="font-display font-extrabold leading-none">
        <span className={cn("block", pct ? "text-shop-2xl" : String(formatListing(c.value)).length > 5 ? "text-shop-md" : "text-shop-xl")}>{pct ? `${c.value}%` : formatListing(c.value)}</span>
        <span className="mt-1 block text-shop-xs font-bold tracking-[0.18em]">OFF</span>
      </span>
      {/* punched notches */}
      <span aria-hidden className="absolute -right-2 -top-2 size-4 rounded-full border border-shop-line bg-shop-page" />
      <span aria-hidden className="absolute -bottom-2 -right-2 size-4 rounded-full border border-shop-line bg-shop-page" />
    </span>
  );
}

/** One coupon as a ticket (value stub, conditions, copy-code, Apply / Remove). */
export function CouponCard({ coupon: c, className, showStore = true }) {
  const actions = useCartActions();
  const { cart } = useCartQuery();
  const applying = actions.applyCoupon.isPending && actions.applyCoupon.variables === c.code;
  const removing = actions.removeCoupon.isPending;
  const canApply = c.eligible && !c.applied;
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const apply = () => {
    setError("");
    actions.applyCoupon.mutate(c.code, {
      onSuccess: (quote) => {
        if (quote?.couponCode?.toUpperCase() !== c.code.toUpperCase() && quote?.couponNote) setError(quote.couponNote);
      },
      onError: (err) => setError(err?.message || "This code cannot be used"),
    });
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(c.code);
      setCopied(true);
      toast.success(`Copied ${c.code}`, { description: "Apply it in your cart." });
      setTimeout(() => setCopied(false), 2500);
    } catch {
      toast(`Code: ${c.code}`);
    }
  };
  return (
    <article
      className={cn(
        "flex h-full flex-col overflow-hidden rounded-[1.25rem] border bg-shop-card",
        c.applied ? "border-shop-primary ring-1 ring-shop-primary" : c.best ? "border-shop-primary/60" : "border-shop-line",
        className
      )}
      aria-label={`Coupon ${c.code}`}
    >
      <div className="flex flex-1 items-stretch">
        <CouponStub coupon={c} />
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-3 sm:p-4">
          <div className="flex flex-wrap items-center gap-1.5">
            {c.applied ? (
              <span className="inline-flex items-center gap-1 rounded-full bg-shop-primary-soft px-2 py-0.5 text-shop-xs font-semibold text-shop-primary-ink">
                <Check className="size-3.5" aria-hidden /> Applied
              </span>
            ) : c.best ? (
              <span className="rounded-full bg-shop-primary-soft px-2 py-0.5 text-shop-xs font-semibold text-shop-primary-ink">Best for your cart</span>
            ) : null}
            {c.targeted ? <span className="rounded-full bg-shop-gold-soft px-2 py-0.5 text-shop-xs font-semibold text-shop-gold-ink">Just for you</span> : null}
          </div>
          <p className="font-display text-shop-base font-bold leading-snug text-shop-ink">{c.name || couponHeadline(c)}</p>
          {c.description ? <p className="line-clamp-2 text-shop-sm text-shop-muted">{c.description}</p> : null}
          <p className="text-shop-xs text-shop-muted">{couponTerms(c)}</p>
          <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-shop-xs text-shop-muted">
            {showStore && c.store?.name ? (
              <span className="inline-flex items-center gap-1">
                <Store className="size-3.5" aria-hidden /> {displayName(c.store.name)}
              </span>
            ) : null}
            {c.endsAt ? <span>Valid till {formatDate(c.endsAt)}</span> : null}
          </p>
          <button
            type="button"
            onClick={copy}
            aria-label={`Copy coupon code ${c.code}`}
            className="mt-1 inline-flex min-h-10 w-fit max-w-full items-center gap-1.5 rounded-lg border border-dashed border-shop-line-strong bg-shop-page px-2.5 font-mono text-shop-sm font-bold tracking-wide text-shop-ink transition-colors hover:border-shop-primary hover:text-shop-primary-ink pointer-coarse:min-h-11"
          >
            {copied ? <Check className="size-3.5 shrink-0 text-shop-primary" aria-hidden /> : <Copy className="size-3.5 shrink-0" aria-hidden />}
            <span className="truncate">{c.code}</span>
          </button>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-shop-line bg-shop-page/60 px-3 py-2 sm:px-4">
        <p className={cn("min-w-0 text-shop-sm", c.eligible ? "text-shop-primary-ink" : "text-shop-muted")}>
          {c.applied ? (
            <span className="inline-flex items-center gap-1 font-semibold">
              Saving <Money value={c.savings} />
            </span>
          ) : c.eligible && Number(c.savings) > 0 ? (
            <>
              You save <Money value={c.savings} className="font-semibold" />
            </>
          ) : cart.count === 0 ? (
            "Add items from this seller to use it"
          ) : (
            c.reason || "Not for this cart yet"
          )}
        </p>
        {c.applied ? (
          <Button variant="ghost" size="sm" loading={removing} onClick={() => actions.removeCoupon.mutate()}>
            Remove
          </Button>
        ) : canApply ? (
          <Button variant={c.best ? "primary" : "secondary"} size="sm" disabled={cart.pending} loading={applying} onClick={apply}>
            Apply
          </Button>
        ) : null}
      </div>
      {error ? (
        <p role="alert" className="border-t border-shop-line px-3 py-2 text-shop-xs font-medium text-shop-danger-ink sm:px-4">
          {error}
        </p>
      ) : null}
    </article>
  );
}

/** Cart coupon section. Never applies anything on its own; suggests the best eligible code. */
export function CouponPanel({ className }) {
  const { cart } = useCartQuery();
  const q = useCartCoupons();
  const actions = useCartActions();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const inputId = useId();
  const coupons = q.data?.coupons || [];
  const applied = coupons.find((c) => c.applied) || (cart.couponCode ? { code: cart.couponCode, applied: true } : null);
  const best = q.data?.best && !q.data.best.applied && q.data.best.eligible ? q.data.best : null;
  const others = coupons.filter((c) => c.eligible && !c.applied && c.code !== best?.code);
  const blocked = coupons.filter((c) => !c.eligible && c.inCart && !c.applied).slice(0, 2);

  // Every apply in the panel reports a failure in one place: the line under the code field.
  function apply(value, { fromField = false } = {}) {
    setError("");
    actions.applyCoupon.mutate(value, {
      // A code the quote did not take comes back as cart.couponNote, which the panel already shows.
      onSuccess: (quote) => {
        if (fromField && quote?.couponCode?.toUpperCase() === value) setCode("");
      },
      onError: (err) => setError(err?.message || "This code cannot be used"),
    });
  }

  function submit(e) {
    e.preventDefault();
    const value = code.trim().toUpperCase();
    if (!value) {
      setError("Enter a coupon code");
      return;
    }
    apply(value, { fromField: true });
  }

  return (
    <section aria-labelledby={`${inputId}-h`} className={cn("rounded-[1.25rem] border border-shop-line bg-shop-card p-4", className)}>
      <h2 id={`${inputId}-h`} className="flex items-center gap-2 font-display text-shop-md font-bold text-shop-ink">
        <BadgePercent className="size-5 text-shop-saffron-ink" strokeWidth={1.75} aria-hidden /> Coupons
      </h2>

      {applied ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control bg-shop-primary-soft px-3 py-2">
          <p className="text-shop-sm text-shop-primary-ink">
            <span className="font-mono font-semibold">{applied.code}</span> applied
            {Number(cart.totals.couponDiscount) > 0 ? (
              <>
                {" "}
                · you save <Money value={cart.totals.couponDiscount} pending={cart.pending} className="font-semibold" />
              </>
            ) : null}
          </p>
          <Button variant="ghost" loading={actions.removeCoupon.isPending} onClick={() => actions.removeCoupon.mutate()}>
            Remove
          </Button>
        </div>
      ) : null}
      {cart.couponNote ? <p className="mt-2 text-shop-sm text-shop-warning-ink" role="status">{cart.couponNote}</p> : null}

      {q.isPending ? (
        <Skeleton className="mt-3 h-14 w-full" />
      ) : best ? (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 rounded-control border border-dashed border-shop-primary px-3 py-2">
          <p className="min-w-0 text-shop-sm">
            <span className="font-semibold text-shop-ink">Best for this cart: </span>
            <span className="font-mono font-semibold text-shop-ink">{best.code}</span>
            <span className="text-shop-muted">
              {" "}
              · save <Money value={best.savings} className="font-semibold text-shop-primary-ink" />
              {best.store?.name ? ` on ${best.store.name}` : ""}
            </span>
          </p>
          <Button loading={actions.applyCoupon.isPending && actions.applyCoupon.variables === best.code} disabled={cart.pending} onClick={() => apply(best.code)}>
            {applied ? "Switch" : "Apply"}
          </Button>
        </div>
      ) : null}

      {others.length ? (
        <ul className="mt-2 grid gap-1">
          {others.slice(0, 3).map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-2 text-shop-sm">
              <span className="min-w-0 truncate">
                <span className="font-mono font-semibold text-shop-ink">{c.code}</span>
                <span className="text-shop-muted">
                  {" "}
                  · save <Money value={c.savings} />
                </span>
              </span>
              <Button variant="link" disabled={cart.pending} onClick={() => apply(c.code)}>
                Apply
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {blocked.length ? (
        <ul className="mt-2 grid gap-0.5 text-shop-xs text-shop-muted">
          {blocked.map((c) => (
            <li key={c.id}>
              <Tag className="mr-1 inline size-3" aria-hidden />
              <span className="font-mono">{c.code}</span>: {c.reason}
            </li>
          ))}
        </ul>
      ) : null}

      <form onSubmit={submit} className="mt-3 flex gap-2" noValidate>
        <label htmlFor={inputId} className="sr-only">
          Coupon code
        </label>
        <Input
          id={inputId}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError("");
          }}
          placeholder="Have a code?"
          autoComplete="off"
          spellCheck={false}
          maxLength={40}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${inputId}-err` : undefined}
          className="uppercase"
        />
        <Button type="submit" variant="secondary" loading={actions.applyCoupon.isPending && actions.applyCoupon.variables === code.trim().toUpperCase()} disabled={cart.pending}>
          Apply
        </Button>
      </form>
      {error ? (
        <p id={`${inputId}-err`} role="alert" className="mt-1.5 text-shop-xs font-medium text-shop-danger-ink">
          {error}
        </p>
      ) : null}
    </section>
  );
}
