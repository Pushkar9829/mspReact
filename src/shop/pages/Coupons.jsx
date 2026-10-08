/**
 * /account/coupons — coupons from GET /cart/coupons (works with an empty cart) as tickets grouped
 * by seller: value stub, terms, validity, copy code, what you would save on the current cart.
 * Applying goes through the cart mutation. "Usable now" narrows to codes eligible for this cart.
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { ShoppingCart, Store, Tag } from "lucide-react";
import { Button, EmptyState, Notice, ShopPageHeader, Skeleton } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { useCartCoupons, useCartQuery } from "../hooks/index.js";
import { CouponCard } from "../components/buying/Coupons.jsx";
import { displayName, initialsOf } from "../lib/text.js";

function groupBySeller(coupons) {
  const map = new Map();
  for (const c of coupons) {
    const key = String(c.tenantId || c.store?.id || "");
    if (!map.has(key)) map.set(key, { key, store: c.store, coupons: [] });
    map.get(key).coupons.push(c);
  }
  // Sellers with something usable (or applied) first; the server already sorts within.
  return [...map.values()].sort((a, b) => Number(b.coupons.some((c) => c.eligible || c.applied)) - Number(a.coupons.some((c) => c.eligible || c.applied)));
}

export default function Coupons() {
  const q = useCartCoupons();
  const { cart } = useCartQuery();
  const [filter, setFilter] = useState("all");
  const coupons = q.data?.coupons || [];
  const usable = coupons.filter((c) => c.eligible || c.applied);
  const shown = filter === "usable" ? usable : coupons;
  const groups = groupBySeller(shown);

  return (
    <div className="grid gap-5">
      <ShopPageHeader
        title="Coupons"
        description="Offers from your sellers. A code applies to that seller’s part of your cart."
        actions={
          cart.count ? (
            <Button to="/cart" variant="secondary" leftIcon={ShoppingCart}>
              Go to cart
            </Button>
          ) : null
        }
      />
      {q.error ? (
        <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => q.refetch()}>Retry</Button>}>
          {q.error.message}
        </Notice>
      ) : null}
      {q.isPending ? (
        <div className="grid gap-3 md:grid-cols-2">
          <Skeleton className="h-44 rounded-[1.25rem]" />
          <Skeleton className="h-44 rounded-[1.25rem]" />
        </div>
      ) : !coupons.length ? (
        q.error ? null : (
          <EmptyState icon={Tag} title="No coupons right now" description="Sellers you buy from publish offers here. Check back before your next order." action={<Button to="/deals">See today’s deals</Button>} />
        )
      ) : (
        <>
          {!cart.count ? <Notice tone="info">Your cart is empty. Add items from a seller to see exactly what each code saves.</Notice> : null}

          <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Show coupons">
            {[
              ["all", `All · ${coupons.length}`],
              ["usable", `Usable on your cart · ${usable.length}`],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                aria-pressed={filter === value}
                onClick={() => setFilter(value)}
                className={cn(
                  "min-h-11 rounded-full border px-4 text-shop-sm font-semibold transition-colors",
                  filter === value ? "border-shop-navy bg-shop-navy text-white" : "border-shop-line bg-shop-card text-shop-text hover:border-shop-line-strong"
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {!groups.length ? (
            <EmptyState
              compact
              icon={Tag}
              title="No code fits your cart yet"
              description="Each coupon says what it needs, such as a minimum order with that seller."
              action={
                <Button variant="secondary" onClick={() => setFilter("all")}>
                  Show all coupons
                </Button>
              }
            />
          ) : (
            groups.map((g) => {
              const name = displayName(g.store?.name) || "Seller";
              return (
                <section key={g.key} aria-labelledby={`cp-${g.key}`} className="grid gap-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 id={`cp-${g.key}`} className="flex min-w-0 items-center gap-2.5 font-display text-shop-md font-bold text-shop-ink">
                      <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-navy text-shop-xs font-bold text-white">
                        {initialsOf(name)}
                      </span>
                      <span className="truncate">{name}</span>
                      <span className="rounded-full bg-shop-well px-2 py-0.5 text-shop-xs font-semibold text-shop-text">{g.coupons.length}</span>
                    </h2>
                    {g.store?.slug ? (
                      <Link to={`/store/${g.store.slug}`} className="inline-flex min-h-11 items-center gap-1 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
                        <Store className="size-4" aria-hidden /> Shop this seller
                      </Link>
                    ) : null}
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    {g.coupons.map((c) => (
                      <CouponCard key={c.id} coupon={c} showStore={false} />
                    ))}
                  </div>
                </section>
              );
            })
          )}
        </>
      )}
    </div>
  );
}
