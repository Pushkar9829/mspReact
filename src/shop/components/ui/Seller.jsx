import { Link } from "react-router-dom";
import { BadgeCheck, MapPin, Star, Store, Truck } from "lucide-react";
import { BrandMonogram } from "./Media.jsx";
import { formatListing } from "../../lib/money.js";
import { normalizeState } from "../../lib/indianAddress.js";
import { cn } from "./cn.js";
import { usePublicStore } from "../../hooks/useCatalog.js";
import { displayName } from "../../lib/text.js";

/**
 * "Sold by …" line for cards and cart groups. Renders nothing when the seller is unknown (the
 * search API does not send seller names yet; it will).
 */
export function SellerBadge({ seller, className, prefix = "Sold by" }) {
  if (!seller?.name) return null;
  return (
    <p className={cn("flex min-w-0 items-center gap-1 text-shop-xs text-shop-muted", className)}>
      <Store className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
      <span className="truncate">
        {prefix} <span className="font-medium text-shop-text">{seller.name}</span>
      </span>
      {seller.verified ? <BadgeCheck className="size-3.5 shrink-0 text-shop-primary" strokeWidth={2} aria-label="Verified seller" /> : null}
    </p>
  );
}

/**
 * Seller card for the PDP / cart: name, verification, pickup city and delivery-zone ETAs (from
 * GET /tenants/public/:idOrSlug).
 */
export function SellerCard({ seller, className, children }) {
  const store = usePublicStore(seller?.slug || seller?.id);
  const info = store.data;
  const name = seller?.name || info?.displayName || info?.name;
  if (!seller && !info) return null;
  const zones = info?.deliveryZones || [];
  const eta = zones.length
    ? { min: Math.min(...zones.map((z) => z.etaDaysMin ?? Infinity)), max: Math.max(...zones.map((z) => z.etaDaysMax ?? 0)) }
    : null;
  return (
    <section aria-label="Seller" className={cn("rounded-card border border-shop-line bg-shop-card p-4", className)}>
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
          <Store className="size-5" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-shop-xs text-shop-muted">Sold and invoiced by</p>
          <p className="flex items-center gap-1 truncate text-shop-md font-semibold text-shop-ink">
            {name || "Marketplace seller"}
            {seller?.verified ? <BadgeCheck className="size-4 text-shop-primary" aria-label="Verified seller" /> : null}
          </p>
          <ul className="mt-1.5 grid gap-1 text-shop-sm text-shop-muted">
            {info?.pickupCity || seller?.city ? (
              <li className="flex items-center gap-1.5">
                <MapPin className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Ships from {info?.pickupCity || seller.city}
              </li>
            ) : null}
            {eta && Number.isFinite(eta.min) ? (
              <li className="flex items-center gap-1.5">
                <Truck className="size-4 shrink-0" strokeWidth={1.75} aria-hidden />
                Delivers in {eta.min === eta.max ? eta.min : `${eta.min}–${eta.max}`} days in its zones
              </li>
            ) : null}
            {seller?.gstin ? <li className="tabular-nums">GSTIN {seller.gstin}</li> : <li>GST invoice with every order</li>}
          </ul>
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * One store from the public directory (GET /tenants/public): logo or monogram, city, rating (only
 * with reviews), product count, delivery modes and minimum order. Links to /store/:slug.
 */
export function StoreTile({ store, className }) {
  const modes = store.deliveryModes || [];
  const facts = [
    store.productCount != null ? `${store.productCount} product${store.productCount === 1 ? "" : "s"}` : null,
    modes.includes("delivery_partner") ? "Delivery" : null,
    modes.includes("store_pickup") ? "Pickup" : null,
    store.minOrderValue > 0 ? `Min. order ${formatListing(store.minOrderValue)}` : null,
  ].filter(Boolean);
  return (
    <Link
      to={`/store/${store.slug}`}
      className={cn("flex min-h-24 items-center gap-3 rounded-card border border-shop-line bg-shop-card p-4 transition-shadow hover:shadow-shop-hover", className)}
    >
      <span aria-hidden="true" className="contents">
        <BrandMonogram name={store.name} logo={store.logo} size="lg" />
      </span>
      <span className="grid min-w-0 gap-0.5">
        <span className="line-clamp-2 text-shop-md font-semibold text-shop-ink">{displayName(store.name)}</span>
        {store.city || store.state ? (
          <span className="flex items-center gap-1 text-shop-sm text-shop-muted">
            <MapPin className="size-3.5 shrink-0" strokeWidth={1.75} aria-hidden />
            <span className="truncate">{[store.city, normalizeState(store.state)].filter(Boolean).join(", ")}</span>
          </span>
        ) : null}
        {store.rating != null && store.ratingCount > 0 ? (
          <span className="flex items-center gap-1 text-shop-xs text-shop-text">
            <Star className="size-3.5 shrink-0 fill-current text-shop-gold-ink" aria-hidden />
            <span className="tabular-nums">{Number(store.rating).toFixed(1)}</span>
            <span className="text-shop-muted">({store.ratingCount} review{store.ratingCount === 1 ? "" : "s"})</span>
          </span>
        ) : null}
        {facts.length ? <span className="truncate text-shop-xs text-shop-muted">{facts.join(" · ")}</span> : null}
      </span>
    </Link>
  );
}
