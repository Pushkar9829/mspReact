/**
 * Cards beside the hero carousel:
 *  - DeliveryCard: PIN code check (drives serviceability and ETA everywhere).
 *  - AccountCard: guests get the business-account pitch; signed-in buyers get a welcome, their
 *    available credit (from /ledger/me) and one-tap shortcuts. Replaces the old welcome notice.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, FileText, Heart, MapPin, Package, RotateCcw, ShieldCheck, Truck, Wallet, XCircle } from "lucide-react";
import { Button, cn, Skeleton } from "../../components/ui/index.js";
import { useLedger, usePincode } from "../../hooks/index.js";
import { isValidPin } from "../../lib/indianAddress.js";
import { formatListing } from "../../lib/money.js";

function initials(name) {
  const p = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] || "") + (p[1]?.[0] || "")).toUpperCase() || "M";
}

export function DeliveryCard({ className }) {
  const { pincode, city, setPincode, serviceability: s } = usePincode();
  const [editing, setEditing] = useState(!pincode);
  const [value, setValue] = useState(pincode || "");
  const [error, setError] = useState("");
  const showForm = editing || !pincode;

  return (
    <div className={cn("relative overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card p-5", className)}>
      <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 size-28 rounded-full bg-shop-primary-soft" />
      <div className="relative flex items-center gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-full bg-shop-primary text-white">
          <Truck className="size-5" strokeWidth={1.9} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="text-shop-xs font-semibold uppercase tracking-wider text-shop-subtle">Delivery</p>
          <p className="truncate font-display text-shop-md font-bold text-shop-ink">
            {pincode ? (
              <>
                {city ? `${city} · ` : ""}
                <span className="tabular-nums">{pincode}</span>
              </>
            ) : (
              "Where should we deliver?"
            )}
          </p>
        </div>
        {pincode && !showForm ? (
          <button
            type="button"
            onClick={() => {
              setValue(pincode);
              setEditing(true);
            }}
            className="ml-auto inline-flex min-h-11 shrink-0 items-center rounded-full px-3 text-shop-sm font-semibold text-shop-primary-ink hover:bg-shop-primary-soft"
            aria-label={`Change delivery PIN code ${pincode}`}
          >
            Change
          </button>
        ) : null}
      </div>

      {showForm ? (
        <form
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            if (!isValidPin(value)) return setError("Enter a valid 6-digit PIN code");
            setPincode(value);
            setEditing(false);
            setError("");
          }}
          className="relative mt-4 grid gap-1.5"
        >
          <label htmlFor="hero-pin" className="sr-only">
            Delivery PIN code
          </label>
          <div className="flex gap-2">
            <div className="relative min-w-0 flex-1">
              <MapPin className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-shop-muted" aria-hidden />
              <input
                id="hero-pin"
                value={value}
                onChange={(e) => {
                  setValue(e.target.value.replace(/\D/g, "").slice(0, 6));
                  setError("");
                }}
                inputMode="numeric"
                autoComplete="postal-code"
                maxLength={6}
                placeholder="6-digit PIN code"
                aria-invalid={Boolean(error)}
                aria-describedby={error ? "hero-pin-err" : "hero-pin-hint"}
                className="h-11 w-full rounded-full border border-shop-line-strong bg-shop-page pl-9 pr-3 text-shop-base tabular-nums tracking-wider text-shop-ink focus:border-shop-primary focus:bg-white focus:outline-none aria-[invalid=true]:border-shop-danger"
              />
            </div>
            <Button type="submit" className="rounded-full">
              Check
            </Button>
          </div>
          {error ? (
            <p id="hero-pin-err" role="alert" className="text-shop-xs font-medium text-shop-danger-ink">
              {error}
            </p>
          ) : (
            <p id="hero-pin-hint" className="text-shop-xs text-shop-muted">
              See which sellers and products deliver to you.
            </p>
          )}
        </form>
      ) : (
        <p className="relative mt-3 min-h-6 text-shop-sm" aria-live="polite">
          {s.status === "checking" ? (
            <Skeleton className="inline-block h-4 w-44 align-middle" />
          ) : s.status === "serviceable" ? (
            <Link to="/category/all" className="inline-flex items-center gap-1.5 font-medium text-shop-primary-ink hover:underline">
              <CheckCircle2 className="size-4" aria-hidden />
              {s.productCount} product{s.productCount === 1 ? "" : "s"} deliver here
              <ArrowRight className="size-3.5" aria-hidden />
            </Link>
          ) : s.status === "unserviceable" ? (
            <span className="inline-flex items-center gap-1.5 font-medium text-shop-danger-ink">
              <XCircle className="size-4" aria-hidden /> No sellers deliver here yet
            </span>
          ) : null}
        </p>
      )}
    </div>
  );
}

function Shortcut({ to, icon: Icon, label }) {
  return (
    <Link
      to={to}
      className="flex min-h-11 flex-1 flex-col items-center justify-center gap-1 rounded-xl border border-shop-line bg-shop-page px-2 py-2 text-shop-xs font-semibold text-shop-ink transition-colors hover:border-shop-primary hover:bg-shop-primary-soft hover:text-shop-primary-ink"
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden />
      {label}
    </Link>
  );
}

export function AccountCard({ signedIn, isBuyer, user, className }) {
  const ledger = useLedger({ enabled: signedIn && isBuyer });

  if (!signedIn) {
    return (
      <div className={cn("relative overflow-hidden rounded-[1.25rem] bg-shop-gold-soft p-5 ring-1 ring-shop-gold/40", className)}>
        <div aria-hidden className="pointer-events-none absolute -bottom-10 -right-10 size-36 rounded-full bg-shop-gold/25 blur-xl" />
        <p className="relative text-shop-xs font-semibold uppercase tracking-wider text-shop-gold-ink">Business account</p>
        <p className="relative mt-1 font-display text-shop-lg font-bold leading-snug text-shop-ink">Sign in for your business prices</p>
        <ul className="relative mt-3 grid gap-1.5">
          {[
            [FileText, "GST invoice with your GSTIN"],
            [Wallet, "Credit terms and purchase orders"],
            [RotateCcw, "Reorder past orders in one tap"],
          ].map(([Icon, t]) => (
            <li key={t} className="flex items-center gap-2 text-shop-sm text-shop-text">
              <Icon className="size-4 shrink-0 text-shop-gold-ink" strokeWidth={2} aria-hidden /> {t}
            </li>
          ))}
        </ul>
        <div className="relative mt-4 flex gap-2">
          <Button to="/login" state={{ from: "/" }} className="flex-1 rounded-full">
            Sign in
          </Button>
          <Button to="/register" variant="secondary" className="flex-1 rounded-full">
            Create account
          </Button>
        </div>
      </div>
    );
  }

  const first = String(user?.name || "").split(" ")[0];
  const stores = ledger.data?.stores || [];
  const creditStores = stores.filter((s) => s.creditEnabled || s.purchaseOrderEnabled);
  const spendable = creditStores.reduce((sum, s) => sum + (Number(s.spendable) || 0), 0);

  return (
    <div className={cn("rounded-[1.25rem] border border-shop-line bg-shop-card p-5", className)}>
      <div className="flex items-center gap-3">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-gradient-to-br from-shop-gold to-[#f3d27e] font-display text-shop-base font-bold text-shop-navy">
          {initials(user?.name)}
        </span>
        <div className="min-w-0">
          <p className="text-shop-xs text-shop-muted">Welcome back</p>
          <p className="truncate font-display text-shop-md font-bold text-shop-ink">{first || user?.name}</p>
        </div>
      </div>

      {isBuyer ? (
        <Link
          to="/account/credit"
          className="mt-4 flex items-center gap-3 rounded-xl bg-shop-navy px-4 py-3 text-white transition-colors hover:bg-shop-navy-2"
        >
          <ShieldCheck className="size-5 shrink-0 text-shop-gold" strokeWidth={1.9} aria-hidden />
          <span className="min-w-0 flex-1">
            {ledger.isPending ? (
              <Skeleton className="h-4 w-32 bg-white/20" />
            ) : creditStores.length ? (
              <>
                <span className="block text-shop-xs text-shop-on-navy-muted">Credit available</span>
                <span className="block font-display text-shop-lg font-bold tabular-nums">{formatListing(spendable)}</span>
              </>
            ) : (
              <>
                <span className="block text-shop-sm font-semibold">Business prices are on</span>
                <span className="block text-shop-xs text-shop-on-navy-muted">Ask a seller for credit terms</span>
              </>
            )}
          </span>
          <ArrowRight className="size-4 shrink-0 text-shop-on-navy-muted" aria-hidden />
        </Link>
      ) : null}

      <div className="mt-3 flex gap-2">
        <Shortcut to="/account/orders" icon={Package} label="Orders" />
        <Shortcut to="/account/orders?view=buy-again" icon={RotateCcw} label="Buy again" />
        <Shortcut to="/account/wishlist" icon={Heart} label="Wishlist" />
      </div>
    </div>
  );
}
