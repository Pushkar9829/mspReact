import { Link } from "react-router-dom";
import { AlertTriangle, Heart, Store, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { cn } from "./cn.js";
import { ImageWithFallback } from "./Media.jsx";
import { Money } from "./Price.jsx";
import { QtyStepper } from "./QtyStepper.jsx";
import { SlabHint } from "./Slabs.jsx";
import { Badge } from "./Badge.jsx";
import { usePublicStore } from "../../hooks/useCatalog.js";
import { useCartActions } from "../../hooks/useCart.js";
import { useWishlist } from "../../hooks/useWishlist.js";
import { displayName, initialsOf } from "../../lib/text.js";
import { formatExact } from "../../lib/money.js";

/**
 * Progress towards the store's free-delivery threshold (server fields freeDeliveryAbove /
 * freeDeliveryRemaining / freeDelivery on the cart group).
 */
export function FreeDeliveryProgress({ group, className }) {
  const above = Number(group?.freeDeliveryAbove) || 0;
  if (!above || !group?.hasDelivery) return null;
  const remaining = Number(group.freeDeliveryRemaining) || 0;
  const done = group.freeDelivery || remaining <= 0;
  const pct = done ? 100 : Math.max(4, Math.min(100, ((above - remaining) / above) * 100));
  return (
    <div className={cn("grid gap-1.5", className)}>
      <p className="flex items-center gap-1.5 text-shop-sm">
        <Truck className={cn("size-4 shrink-0", done ? "text-shop-primary" : "text-shop-muted")} strokeWidth={1.75} aria-hidden />
        {done ? (
          <span className="font-semibold text-shop-primary-ink">Free delivery unlocked</span>
        ) : (
          <span className="text-shop-text">
            Add <span className="font-semibold tabular-nums">{formatExact(remaining)}</span> more from this seller for free delivery
          </span>
        )}
      </p>
      <div className="h-1.5 overflow-hidden rounded-full bg-shop-well" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct)} aria-label="Progress to free delivery">
        <div className="h-full rounded-full bg-shop-primary transition-[width]" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

const MODE_LABELS = { delivery_partner: "Delivery", store_pickup: "Store pickup" };

/** Delivery vs store pickup for one line; nothing when the product offers one mode. */
export function FulfillmentToggle({ modes = [], value, onChange, disabled, className }) {
  const options = ["delivery_partner", "store_pickup"].filter((m) => modes.includes(m));
  if (options.length < 2) return null;
  return (
    <div role="radiogroup" aria-label="How to receive" className={cn("inline-flex rounded-full border border-shop-line bg-shop-well p-0.5", className)}>
      {options.map((mode) => {
        const active = value === mode;
        return (
          <button
            key={mode}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => !active && onChange(mode)}
            className={cn("min-h-8 rounded-full px-3 text-shop-xs font-semibold pointer-coarse:min-h-10", active ? "bg-shop-card text-shop-ink shadow-shop-hover" : "text-shop-muted hover:text-shop-ink")}
          >
            {MODE_LABELS[mode]}
          </button>
        );
      })}
    </div>
  );
}

/**
 * One cart line: packshot, brand / name / pack, unit price (+ per kg), line total (MRP struck),
 * stepper on the server rules, slab nudge, delivery/pickup toggle and Save for later / Remove.
 * `compact` (mini-cart): smaller, no toggle or secondary actions.
 */
export function CartLine({ line, compact = false, className }) {
  const actions = useCartActions();
  const wish = useWishlist();
  const disabled = !line.cartItemId || line.cartItemId.startsWith("pending");
  const name = displayName(line.name);
  const mrpTotal = line.listPrice && line.unitPrice != null && line.listPrice > line.unitPrice ? line.listPrice * line.qty : 0;
  const remove = () => actions.remove.mutate({ cartItemId: line.cartItemId });
  const saveForLater = async () => {
    const product = { productId: line.productId, slug: line.slug, name: line.name, image: line.image, brand: line.brand, pack: line.pack, price: line.unitPrice, mrp: line.listPrice };
    if (!wish.has(product)) await wish.toggle(product, line.variantId);
    remove();
    toast.success("Moved to your wishlist", { description: name });
  };
  return (
    <li className={cn("flex gap-3 sm:gap-4", compact ? "py-3" : "py-4", className)}>
      <Link to={line.slug ? `/product/${line.slug}` : "#"} className="shrink-0" tabIndex={-1} aria-hidden>
        <ImageWithFallback src={line.image} alt="" fit="cover" fallbackName={name} className={cn("rounded-xl ring-1 ring-shop-line [&_span]:text-shop-lg", compact ? "size-16" : "size-20 sm:size-24")} />
      </Link>
      <div className="grid min-w-0 flex-1 gap-1.5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {line.brand ? <p className="truncate text-shop-xs font-semibold uppercase tracking-wide text-shop-muted">{line.brand}</p> : null}
            <Link to={`/product/${line.slug}`} className="line-clamp-2 text-shop-base font-semibold leading-snug text-shop-ink hover:text-shop-primary-ink">
              {name}
            </Link>
            <p className="mt-0.5 text-shop-xs text-shop-muted">
              {line.pack ? <span className="font-medium text-shop-text">{line.pack}</span> : null}
              {line.unitPrice != null ? (
                <>
                  {line.pack ? " · " : ""}
                  <Money value={line.unitPrice} pending={line.pending} /> each
                </>
              ) : null}
              {line.unitPricePerBaseUnit?.label ? ` · ${line.unitPricePerBaseUnit.label}` : ""}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <Money value={line.lineTotal} pending={line.pending} className={cn("block font-bold text-shop-ink", compact ? "text-shop-base" : "text-shop-md")} />
            {mrpTotal && !line.pending ? (
              <span className="block text-shop-xs tabular-nums text-shop-subtle line-through">
                <span className="sr-only">MRP </span>
                {formatExact(mrpTotal)}
              </span>
            ) : null}
          </div>
        </div>
        {line.issue ? (
          <p className="flex items-center gap-1.5 text-shop-sm font-medium text-shop-danger-ink" role="alert">
            <AlertTriangle className="size-4" aria-hidden /> {line.issue}
          </p>
        ) : null}
        {line.bulk || line.nextSlab || (!compact && line.taxRate) ? (
          <div className="flex flex-wrap items-center gap-1.5">
            {line.bulk ? <Badge tone="business" soft>Bulk price</Badge> : null}
            <SlabHint slabs={line.slabs} qty={line.qty} next={line.nextSlab} className="rounded-full bg-shop-gold-soft px-2 py-0.5" />
            {!compact && line.taxRate ? <span className="hidden text-shop-xs text-shop-muted sm:inline">incl. GST {line.taxRate}%</span> : null}
          </div>
        ) : null}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2">
          <QtyStepper
            value={line.qty}
            rules={line.rules}
            disabled={disabled}
            size={compact ? "sm" : "md"}
            className="max-sm:[&>p]:sr-only"
            label={`Quantity of ${name}`}
            onChange={(qty) => actions.setQty.mutate({ cartItemId: line.cartItemId, qty })}
          />
          {!compact ? (
            <>
              <FulfillmentToggle modes={line.deliveryModes} value={line.fulfillmentMode} disabled={disabled} onChange={(mode) => actions.setMode.mutate({ cartItemId: line.cartItemId, fulfillmentMode: mode })} />
              <div className="ml-auto flex items-center gap-1">
                {line.productId || line.slug ? (
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={saveForLater}
                    className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-shop-xs font-semibold text-shop-muted transition-colors hover:bg-shop-well hover:text-shop-ink disabled:opacity-50 pointer-coarse:min-h-11"
                  >
                    <Heart className="size-4" strokeWidth={1.75} aria-hidden />
                    <span className="hidden sm:inline">Save for later</span>
                    <span className="sr-only sm:hidden">Save {name} for later</span>
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={disabled}
                  onClick={remove}
                  className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-2.5 text-shop-xs font-semibold text-shop-muted transition-colors hover:bg-shop-danger-soft hover:text-shop-danger-ink disabled:opacity-50 pointer-coarse:min-h-11"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} aria-hidden />
                  <span className="hidden sm:inline">Remove</span>
                  <span className="sr-only sm:hidden">Remove {name}</span>
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
    </li>
  );
}

/**
 * Cart lines of one seller: header (store, item count, delivery or pickup ETA), free-delivery
 * progress, lines, and the server's group subtotal / fees / total.
 */
export function CartSellerGroup({ group, compact = false, className }) {
  const store = usePublicStore(group.seller?.name ? null : group.tenantId);
  const name = displayName(group.seller?.name || store.data?.displayName || store.data?.name || "Seller");
  const pickupOnly = group.items.every((l) => l.fulfillmentMode === "store_pickup");
  const units = group.items.reduce((n, l) => n + (Number(l.qty) || 0), 0);
  const eta = group.eta;
  const when = pickupOnly
    ? "Store pickup"
    : eta?.etaDaysMin != null
      ? `Delivery in ${eta.etaDaysMin === eta.etaDaysMax ? eta.etaDaysMin : `${eta.etaDaysMin}–${eta.etaDaysMax}`} days`
      : "Delivery";
  return (
    <section aria-label={`Items from ${name}`} className={cn("overflow-hidden border border-shop-line bg-shop-card", compact ? "rounded-card" : "rounded-[1.25rem]", className)}>
      <header className={cn("flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5 border-b border-shop-line", compact ? "px-3 py-2.5" : "bg-shop-page/60 px-4 py-3 sm:px-5")}>
        <div className="flex min-w-0 items-center gap-2.5">
          {compact ? (
            <Store className="size-4 shrink-0 text-shop-muted" strokeWidth={1.75} aria-hidden />
          ) : (
            <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-navy font-display text-shop-xs font-bold text-white">
              {initialsOf(name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-shop-base font-semibold leading-tight text-shop-ink">{name}</p>
            {!compact ? (
              <p className="text-shop-xs text-shop-muted">
                {group.items.length} item{group.items.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
                {store.data?.pickupCity ? ` · ships from ${store.data.pickupCity}` : ""}
              </p>
            ) : null}
          </div>
        </div>
        <span className={cn("inline-flex items-center gap-1.5 rounded-full text-shop-xs font-semibold", compact ? "text-shop-muted" : "bg-shop-card px-2.5 py-1 text-shop-text ring-1 ring-shop-line")}>
          {pickupOnly ? <Store className="size-3.5" strokeWidth={1.75} aria-hidden /> : <Truck className="size-3.5" strokeWidth={1.75} aria-hidden />}
          {when}
        </span>
      </header>
      {!compact ? <FreeDeliveryProgress group={group} className="border-b border-shop-line px-4 py-3 sm:px-5" /> : null}
      <ul className={cn("divide-y divide-shop-line", compact ? "px-3" : "px-4 sm:px-5")}>
        {group.items.map((line) => (
          <CartLine key={line.key} line={line} compact={compact} />
        ))}
      </ul>
      {!compact ? (
        <dl className="flex flex-wrap items-center justify-end gap-x-5 gap-y-1 border-t border-shop-line bg-shop-page/60 px-4 py-3 text-shop-sm sm:px-5">
          <div className="flex gap-1.5">
            <dt className="text-shop-muted">Items</dt>
            <dd>
              <Money value={group.subtotal} className="font-medium" />
            </dd>
          </div>
          {group.couponDiscount ? (
            <div className="flex gap-1.5 text-shop-primary-ink">
              <dt>Coupon {group.couponCode}</dt>
              <dd>
                − <Money value={group.couponDiscount} />
              </dd>
            </div>
          ) : null}
          {group.fees?.total ? (
            <div className="flex gap-1.5">
              <dt className="text-shop-muted">Delivery & fees</dt>
              <dd>
                <Money value={group.fees.total} />
              </dd>
            </div>
          ) : null}
          <div className="flex gap-1.5">
            <dt className="font-semibold text-shop-ink">Seller total</dt>
            <dd>
              <Money value={group.grandTotal} className="font-bold text-shop-ink" />
            </dd>
          </div>
        </dl>
      ) : null}
    </section>
  );
}
