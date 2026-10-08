/**
 * /cart — lines grouped by seller (CartSellerGroup: delivery/pickup, free-delivery progress,
 * steppers on the server rules, slab nudges, server group totals), unavailable lines explained,
 * stock-hold notice, coupons (explicit apply, best suggested), summary-only right column and a
 * sticky total + checkout bar on phones (the bottom nav is hidden on /cart).
 * Money: server quote fields only; skeletons while an optimistic change is in flight.
 */
import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, BadgePercent, Clock, FileText, LockKeyhole, ShieldCheck, ShoppingCart, Sparkles, Trash2 } from "lucide-react";
import {
  Button,
  CartSellerGroup,
  EmptyState,
  ImageWithFallback,
  Notice,
  PRODUCT_GRID,
  ProductCard,
  ProductCardSkeleton,
  RowSkeleton,
  ShopPageHeader,
  Skeleton,
} from "../components/ui/index.js";
import { useCartActions, useCartQuery, useProducts, useViewer } from "../hooks/index.js";
import { CouponPanel } from "../components/buying/Coupons.jsx";
import { TotalsList } from "../components/buying/orderUi.jsx";
import { Money } from "../components/ui/Price.jsx";
import { CheckoutProgress } from "../components/buying/CheckoutProgress.jsx";
import { ProductRail } from "./discovery/Rail.jsx";
import { formatTime } from "../../shared/lib/format.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";

function useNow(ms = 30_000) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), ms);
    return () => clearInterval(t);
  }, [ms]);
  return now;
}

function HoldNotice({ at }) {
  const now = useNow();
  if (!at) return null;
  const ms = new Date(at).getTime() - now;
  if (!Number.isFinite(ms)) return null;
  if (ms <= 0) {
    return (
      <Notice tone="warning" icon={Clock} title="Stock reservation ended">
        We check stock again when you check out. Popular items can sell out in the meantime.
      </Notice>
    );
  }
  const mins = Math.max(1, Math.round(ms / 60_000));
  return (
    <Notice tone="info" icon={Clock}>
      Stock for some items is reserved for you until <span className="font-semibold">{formatTime(at)}</span> ({mins} min). Check out before then to keep it.
    </Notice>
  );
}

function UnavailableLines({ lines }) {
  const actions = useCartActions();
  if (!lines.length) return null;
  return (
    <section aria-labelledby="unavail-h" className="rounded-card border border-shop-line bg-shop-card">
      <header className="flex items-start gap-2 border-b border-shop-line bg-shop-danger-soft px-4 py-3 text-shop-danger-ink">
        <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
        <div>
          <h2 id="unavail-h" className="text-shop-base font-semibold">
            {lines.length === 1 ? "1 item can’t be ordered right now" : `${lines.length} items can’t be ordered right now`}
          </h2>
          <p className="text-shop-sm">They are not included in your total. Remove them or change the quantity to continue.</p>
        </div>
      </header>
      <ul className="divide-y divide-shop-line px-4">
        {lines.map((l) => (
          <li key={l.key} className="flex items-center gap-3 py-3">
            <ImageWithFallback src={l.image} alt="" className="size-14 shrink-0 opacity-70" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-shop-sm font-semibold text-shop-ink">{l.name}</p>
              <p className="text-shop-xs text-shop-muted">
                {l.pack ? `${l.pack} · ` : ""}Qty {l.qty}
              </p>
              <p className="text-shop-xs font-medium text-shop-danger-ink">{l.issue || "Out of stock or no longer sold"}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Remove ${l.name}`}
              disabled={!l.cartItemId}
              onClick={() => actions.remove.mutate({ cartItemId: l.cartItemId })}
            >
              <Trash2 className="size-5" aria-hidden />
            </Button>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Popular products: a rail under a filled cart, a grid under an empty one. */
function Suggestions({ rail = false }) {
  const s = useProducts({ sort: "rating" }, { limit: rail ? 16 : 8 });
  const { cart } = useCartQuery();
  if (!s.isPending && !s.products.length) return null;
  if (rail) {
    // Leave out what is already in the cart.
    const inCart = new Set(cart.lines.map((l) => l.slug));
    const products = s.products.filter((p) => !inCart.has(p.slug));
    if (!s.isPending && !products.length) return null;
    return (
      <div className="mt-10">
        <ProductRail title="Retailers also stock" icon={Sparkles} to="/category/all" products={products} query={{ isPending: s.isPending }} />
      </div>
    );
  }
  return (
    <section aria-labelledby="sugg-h" className="mt-8">
      <h2 id="sugg-h" className="mb-4 font-display text-shop-lg font-bold text-shop-ink">
        Popular with retailers
      </h2>
      <div className={PRODUCT_GRID}>
        {s.isPending ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={i} />) : s.products.slice(0, 8).map((p) => <ProductCard key={p.id} product={p} />)}
      </div>
    </section>
  );
}

function CheckoutCta({ cart, signedIn, block = true, size = "lg", className }) {
  const navigate = useNavigate();
  const blocked = cart.pending || !cart.groups.length;
  if (!signedIn) {
    return (
      <Button size={size} block={block} className={className} leftIcon={LockKeyhole} onClick={() => navigate("/login", { state: { from: "/checkout" } })}>
        Sign in to check out
      </Button>
    );
  }
  return (
    <Button size={size} block={block} className={className} rightIcon={ArrowRight} disabled={blocked} onClick={() => navigate("/checkout")}>
      {cart.pending ? "Updating…" : "Proceed to checkout"}
    </Button>
  );
}

/** What the buyer saves against MRP on the lines that will be ordered (server unit and list prices). */
function mrpSavings(cart) {
  let save = 0;
  for (const g of cart.groups) for (const l of g.items) if (l.listPrice && l.unitPrice != null && l.listPrice > l.unitPrice) save += (l.listPrice - l.unitPrice) * l.qty;
  return Math.round(save * 100) / 100;
}

/** Price details card: totals, MRP savings, the checkout button (desktop) and trust notes. */
function SummaryCard({ cart, signedIn, withCta }) {
  const save = cart.pending ? 0 : mrpSavings(cart);
  return (
    <section aria-labelledby="cart-sum-h" className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
      <div className="p-4 sm:p-5">
        <h2 id="cart-sum-h" className="font-display text-shop-md font-bold text-shop-ink">
          Price details
        </h2>
        <TotalsList className="mt-3" t={cart.totals} couponCode={cart.couponCode} pending={cart.pending} totalLabel="Estimated total" />
        {save > 0 ? (
          <p className="mt-3 flex items-center gap-2 rounded-xl bg-shop-primary-soft px-3 py-2 text-shop-sm font-semibold text-shop-primary-ink">
            <BadgePercent className="size-4 shrink-0" strokeWidth={2} aria-hidden />
            <span>
              You save <Money value={save} mode="listing" /> on MRP
            </span>
          </p>
        ) : null}
        {withCta ? <CheckoutCta cart={cart} signedIn={signedIn} className="mt-4" /> : null}
        <p className="mt-3 text-shop-xs text-shop-muted">Delivery fees and dates are confirmed for your address at checkout.</p>
      </div>
      <ul className="grid gap-1.5 border-t border-shop-line bg-shop-page/60 px-4 py-3 text-shop-xs text-shop-muted sm:px-5">
        <li className="flex items-center gap-2">
          <ShieldCheck className="size-4 shrink-0 text-shop-primary" strokeWidth={1.75} aria-hidden /> Secure payments · prices re-checked at order time
        </li>
        <li className="flex items-center gap-2">
          <FileText className="size-4 shrink-0 text-shop-primary" strokeWidth={1.75} aria-hidden /> GST invoice from every seller
        </li>
      </ul>
    </section>
  );
}

export default function Cart() {
  const { cart, isPending, isError, error, refetch } = useCartQuery();
  const { signedIn } = useViewer();
  const location = useLocation();
  const sellers = cart.groups.length;
  const units = cart.units;
  const items = cart.lines.length - cart.unavailable.length;
  useDocumentTitle(cart.count ? `Cart (${items})` : "Your cart");

  if (isPending) {
    return (
      <div className="msr-gutter py-6" role="status" aria-label="Loading your cart">
        <Skeleton className="h-6 w-full max-w-xl" />
        <Skeleton className="mt-5 h-8 w-48" />
        <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div className="grid gap-3">
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </div>
          <Skeleton className="h-80 rounded-[1.25rem]" />
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="msr-gutter py-10">
        <ShopPageHeader title="Your cart" />
        <EmptyState className="mt-6" icon={AlertTriangle} title="We couldn’t load your cart" description={error?.message} action={<Button onClick={() => refetch()}>Try again</Button>} />
      </div>
    );
  }

  if (!cart.count) {
    return (
      <div className="msr-gutter py-6 md:py-8">
        <ShopPageHeader title="Your cart" />
        <EmptyState
          className="mt-5 rounded-[1.25rem] border border-shop-line bg-shop-card py-10"
          icon={ShoppingCart}
          title="Your cart is empty"
          description="Stock up at business prices: bulk slabs, GST invoices and credit terms with your sellers."
          action={
            <>
              <Button to="/category/all">Browse products</Button>
              {signedIn ? (
                <Button to="/account/orders" variant="secondary">
                  Buy again from past orders
                </Button>
              ) : (
                <Button to="/login" state={{ from: location.pathname }} variant="secondary">
                  Sign in for your prices
                </Button>
              )}
            </>
          }
        />
        <Suggestions />
      </div>
    );
  }

  return (
    <div className="msr-gutter pb-32 pt-5 md:pt-6 lg:pb-10">
      <CheckoutProgress current="cart" className="mx-auto max-w-3xl" />

      <header className="mt-6 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="font-display text-shop-xl font-bold text-shop-ink md:text-shop-2xl">
            Your cart{" "}
            <span className="align-middle text-shop-base font-semibold text-shop-muted">
              ({items} item{items === 1 ? "" : "s"})
            </span>
          </h1>
          <p className="mt-1 text-shop-sm text-shop-muted">
            {units} unit{units === 1 ? "" : "s"} from {sellers} seller{sellers === 1 ? "" : "s"}
            {sellers > 1 ? " · each seller ships and invoices separately" : ""}
          </p>
        </div>
        <Link to="/category/all" className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-1 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
          <ArrowLeft className="size-4" aria-hidden /> Continue shopping
        </Link>
      </header>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-start">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {!signedIn ? (
            <Notice tone="business" icon={ShieldCheck} title="Have a business account?" action={<Button size="sm" variant="secondary" to="/login" state={{ from: "/cart" }}>Sign in</Button>}>
              Sign in to see your negotiated prices and credit terms. Your cart comes with you.
            </Notice>
          ) : null}
          <HoldNotice at={cart.holdExpiresAt} />
          <UnavailableLines lines={cart.unavailable} />
          {cart.groups.map((g) => (
            <CartSellerGroup key={g.tenantId} group={g} />
          ))}
          <div className="grid gap-4 lg:hidden">
            <CouponPanel />
            <SummaryCard cart={cart} signedIn={signedIn} />
          </div>
        </div>

        <aside aria-label="Order summary" className="hidden lg:sticky lg:top-36 lg:grid lg:gap-4">
          <SummaryCard cart={cart} signedIn={signedIn} withCta />
          <CouponPanel />
        </aside>
      </div>

      <Suggestions rail />

      {/* Phone / tablet: sticky total + checkout (the bottom nav is hidden on /cart). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-shop-line bg-shop-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-shop-pop backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-shop-xs text-shop-muted">
              Total · {items} item{items === 1 ? "" : "s"}
            </p>
            <p className="text-shop-lg font-bold text-shop-ink">
              <Money value={cart.totals.grandTotal} pending={cart.pending} />
            </p>
          </div>
          <div className="w-48 shrink-0 sm:w-60">
            <CheckoutCta cart={cart} signedIn={signedIn} size="md" />
          </div>
        </div>
      </div>
    </div>
  );
}
