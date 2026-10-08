/**
 * /order/:id[?ids=a,b] — confirmation after checkout (one order per seller). Navy success band with
 * the payment state, per-store cards (status / payment pills, items, ETA, invoice availability,
 * actions incl. Pay now when unpaid) with "what happens next", delivery address and next steps.
 * No "Buy again" on orders that were just placed (it is offered when the page is revisited).
 */
import { Link, useLocation, useParams, useSearchParams } from "react-router-dom";
import { useQueries } from "@tanstack/react-query";
import { AlertTriangle, ArrowLeft, ArrowRight, CheckCircle2, Clock, CreditCard, FileText, MapPin, Package, ShoppingBag, Store, Truck } from "lucide-react";
import { Button, EmptyState, Notice, ShopPageHeader, Skeleton } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { Money } from "../components/ui/Price.jsx";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "../hooks/keys.js";
import { useViewer } from "../hooks/index.js";
import { OrderActions } from "../components/buying/OrderActions.jsx";
import { CheckoutProgress } from "../components/buying/CheckoutProgress.jsx";
import { OrderStatusPill, OrderThumbs, PaymentPill, isPickupOrder, orderEta, orderId, orderUnits, paymentLabel, sellerName } from "../components/buying/orderUi.jsx";
import { useLedger } from "../hooks/useCheckout.js";
import { displayName } from "../lib/text.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";

const CARD = "rounded-[1.25rem] border border-shop-line bg-shop-card";

function nextSteps(order, ledgerStore) {
  const steps = [];
  const pickup = isPickupOrder(order);
  if (order.allowedActions?.pay) steps.push({ icon: CreditCard, text: "Complete the payment so the seller can confirm the order." });
  if (order.status === "pending") steps.push({ icon: Store, text: `${sellerName(order)} reviews and confirms the order. You get an email and an in-app update.` });
  steps.push({ icon: Truck, text: pickup ? "We tell you when it is packed and ready to collect from the store." : "Track the shipment here once it is dispatched." });
  if (order.paymentMethod === "purchase_order" || order.paymentMethod === "credit_terms") {
    const days = ledgerStore?.paymentDays;
    steps.push({
      icon: Clock,
      text: days ? `Pay the seller within ${days} days of the invoice; it is added to your account with ${sellerName(order)}.` : `The amount is added to your account with ${sellerName(order)} on your agreed terms.`,
    });
  }
  if (order.paymentMethod === "cod") steps.push({ icon: CreditCard, text: "Keep the exact amount ready (cash or UPI) for the delivery partner." });
  steps.push({ icon: FileText, text: order.allowedActions?.invoice ? "Your GST invoice is ready. Download it from this order any time." : "The GST invoice is issued when the seller confirms; download it from the order." });
  return steps;
}

function NextSteps({ steps }) {
  return (
    <ol className="grid gap-0" aria-label="What happens next">
      {steps.map((s, i) => (
        <li key={s.text} className="relative flex gap-3 pb-3 last:pb-0">
          {i < steps.length - 1 ? <span aria-hidden className="absolute left-[15px] top-8 h-[calc(100%-2rem)] w-0.5 rounded-full bg-shop-line" /> : null}
          <span className="relative z-10 grid size-8 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
            <s.icon className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <span className="pt-1.5 text-shop-sm text-shop-text">{s.text}</span>
        </li>
      ))}
    </ol>
  );
}

function OrderCard({ order, ledgerStores, placed }) {
  const aa = order.allowedActions || {};
  const eta = orderEta(order);
  const id = orderId(order);
  const items = order.items || [];
  const units = orderUnits(order);
  const store = (ledgerStores || []).find((s) => String(s.tenantId?._id || s.tenantId) === String(order.tenantId?._id || order.tenantId));
  return (
    <article aria-labelledby={`o-${id}`} className={cn(CARD, "overflow-hidden shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]")}>
      <header className="flex flex-wrap items-start justify-between gap-3 border-b border-shop-line px-4 py-4 sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
            <Store className="size-4" strokeWidth={2} aria-hidden />
          </span>
          <div className="min-w-0">
            <p className="truncate text-shop-sm font-semibold text-shop-text">{sellerName(order)}</p>
            <h2 id={`o-${id}`} className="font-display text-shop-lg font-bold text-shop-ink">
              Order {order.orderNumber}
            </h2>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <OrderStatusPill status={order.status} />
          <PaymentPill order={order} />
        </div>
      </header>

      <div className="grid gap-4 px-4 py-4 sm:px-5">
        {items.length ? (
          <div className="flex items-center gap-3">
            <OrderThumbs items={items} max={4} />
            <p className="min-w-0 text-shop-sm text-shop-text">
              <span className="line-clamp-2">{items.map((i) => displayName(i.name)).join(", ")}</span>
            </p>
          </div>
        ) : null}

        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 rounded-xl bg-shop-page/60 p-3 text-shop-sm sm:grid-cols-3">
          <div>
            <dt className="text-shop-xs text-shop-muted">Order total</dt>
            <dd className="font-display text-shop-md font-bold tabular-nums text-shop-ink">
              <Money value={order.totals?.grandTotal ?? order.total} />
            </dd>
          </div>
          <div>
            <dt className="text-shop-xs text-shop-muted">Payment</dt>
            <dd className="text-shop-ink">{paymentLabel(order.paymentMethod)}</dd>
          </div>
          <div>
            <dt className="text-shop-xs text-shop-muted">{isPickupOrder(order) ? "Pickup" : "Delivery"}</dt>
            <dd className="text-shop-ink">{eta || "Date confirmed by the seller"}</dd>
          </div>
          <div>
            <dt className="text-shop-xs text-shop-muted">Items</dt>
            <dd className="text-shop-ink">
              {items.length} line{items.length === 1 ? "" : "s"} · {units} unit{units === 1 ? "" : "s"}
            </dd>
          </div>
          {order.poNumber ? (
            <div>
              <dt className="text-shop-xs text-shop-muted">PO number</dt>
              <dd className="font-mono text-shop-ink">{order.poNumber}</dd>
            </div>
          ) : null}
          <div>
            <dt className="text-shop-xs text-shop-muted">GST invoice</dt>
            <dd className="flex items-center gap-1 text-shop-ink">
              <FileText className="size-3.5 text-shop-muted" aria-hidden />
              {aa.invoice ? "Ready to download" : "After confirmation"}
            </dd>
          </div>
        </dl>

        {aa.pay ? (
          <Notice tone="warning" icon={AlertTriangle} title="Payment pending">
            Pay now to send this order to the seller. Unpaid online orders are cancelled automatically after a while.
          </Notice>
        ) : null}

        <div className="flex flex-wrap items-center gap-2">
          <OrderActions order={order} exclude={placed ? ["reorder"] : []} />
          <Button to={`/account/orders/${id}`} variant="link" rightIcon={ArrowRight} className="sm:ml-auto">
            Order details
          </Button>
        </div>
      </div>

      <div className="border-t border-shop-line bg-shop-page/60 px-4 py-4 sm:px-5">
        <h3 className="mb-3 text-shop-sm font-semibold text-shop-ink">What happens next</h3>
        <NextSteps steps={nextSteps(order, store)} />
      </div>
    </article>
  );
}

/** Payment state across the loaded orders, for the band (live order data first, then the checkout result). */
function bandPayment(orders, payment) {
  const unpaid = orders.filter((o) => o.allowedActions?.pay);
  if (unpaid.length) {
    if (payment === "pending" || unpaid.some((o) => o.paymentStatus === "pending")) return { tone: "wait", label: "Confirming your payment" };
    return { tone: "due", label: unpaid.length > 1 ? `Payment pending on ${unpaid.length} orders` : "Payment pending" };
  }
  if (orders.length && orders.every((o) => o.paymentStatus === "paid")) return { tone: "ok", label: "Payment received" };
  return null;
}

export default function OrderConfirmation() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const location = useLocation();
  const { signedIn, ready, user } = useViewer();
  const ids = [...new Set([id, ...(params.get("ids") || "").split(",")].map((x) => String(x || "").trim()).filter(Boolean))].slice(0, 20);
  const placed = Boolean(location.state?.placed);
  const payment = location.state?.payment;
  const ledger = useLedger({ enabled: signedIn });

  const results = useQueries({
    queries: ids.map((oid) => ({ queryKey: shopKeys.order(oid), queryFn: () => api.getOrder(oid), enabled: signedIn })),
  });
  const orders = results.map((r) => r.data).filter(Boolean);
  const loading = results.some((r) => r.isPending);
  const failed = results.filter((r) => r.error);

  const many = ids.length > 1;
  const title = placed ? (many ? `${ids.length} orders placed` : "Order placed") : many ? "Your orders" : orders[0] ? `Order ${orders[0].orderNumber}` : "Your order";
  useDocumentTitle(title);
  const company = user?.profile?.company || user?.name;

  if (ready && !signedIn) {
    return (
      <div className="msr-gutter py-10">
        <ShopPageHeader title="Your order" />
        <EmptyState className="mt-6 rounded-[1.25rem]" icon={Package} title="Sign in to see this order" description="Orders are private to your business account." action={<Button to="/login" state={{ from: location.pathname + location.search }}>Sign in</Button>} />
      </div>
    );
  }

  const unpaid = orders.filter((o) => o.allowedActions?.pay);
  const address = orders[0]?.addressSnapshot;
  const allLoaded = orders.length === ids.length;
  const grand = allLoaded ? orders.reduce((n, o) => n + (Number(o.totals?.grandTotal ?? o.total) || 0), 0) : null;
  const band = bandPayment(orders, payment);
  const single = orders.length === 1 ? orders[0] : null;

  return (
    <div className="msr-gutter pb-12 pt-5 md:pt-6">
      <div className="mx-auto grid max-w-4xl grid-cols-[minmax(0,1fr)] gap-5">
        {placed ? (
          <CheckoutProgress current="done" className="mx-auto max-w-3xl" />
        ) : (
          <Link to="/account/orders" className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-shop-sm font-semibold text-shop-primary-ink hover:underline">
            <ArrowLeft className="size-4" aria-hidden /> All orders
          </Link>
        )}

        {/* Success band */}
        <section aria-labelledby="oc-title" className="relative overflow-hidden rounded-[1.25rem] bg-shop-navy px-5 py-6 text-white shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)] sm:px-7 sm:py-8">
          <div aria-hidden className="pointer-events-none absolute -right-16 -top-16 size-56 rounded-full bg-shop-primary/25 blur-3xl" />
          <div aria-hidden className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-shop-gold/15 blur-3xl" />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start">
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-full ring-8", placed ? "bg-shop-primary text-white ring-shop-primary/20" : "bg-white/10 text-white ring-white/5")}>
              {placed ? <CheckCircle2 className="size-7" strokeWidth={2} aria-hidden /> : <Package className="size-6" strokeWidth={1.75} aria-hidden />}
            </span>
            <div className="min-w-0 flex-1">
              <h1 id="oc-title" className="font-display text-shop-xl font-bold md:text-shop-2xl">
                {title}
              </h1>
              {placed ? (
                <p className="mt-1.5 max-w-2xl text-shop-base text-shop-on-navy-muted">
                  {company ? `Thank you, ${company}. ` : ""}
                  {many ? `Your cart was split into ${ids.length} orders, one per seller. Each seller confirms, ships and invoices its order separately.` : "The seller has your order and will confirm it shortly."} A confirmation is on its way to{" "}
                  <span className="font-semibold text-white">{user?.email || "your email"}</span>.
                </p>
              ) : single ? (
                <p className="mt-1.5 text-shop-base text-shop-on-navy-muted">From {sellerName(single)}</p>
              ) : null}
              <div className="mt-4 flex flex-wrap items-center gap-2">
                {band ? (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-shop-sm font-semibold",
                      band.tone === "ok" ? "bg-shop-primary text-white" : band.tone === "wait" ? "bg-white/10 text-white" : "bg-shop-gold text-shop-ink"
                    )}
                    role="status"
                  >
                    {band.tone === "ok" ? <CheckCircle2 className="size-4" aria-hidden /> : band.tone === "wait" ? <Clock className="size-4" aria-hidden /> : <AlertTriangle className="size-4" aria-hidden />}
                    {band.label}
                  </span>
                ) : null}
                {grand != null && orders.length ? (
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-shop-sm text-white">
                    {many ? "Total across orders" : "Total"} <Money value={grand} className="font-bold" />
                  </span>
                ) : null}
              </div>
            </div>
          </div>
          <div className="relative mt-5 flex flex-wrap gap-2">
            {single ? (
              <Button to={`/account/orders/${orderId(single)}`} className="bg-white text-shop-ink hover:bg-white/90" rightIcon={ArrowRight}>
                Track this order
              </Button>
            ) : (
              <Button to="/account/orders" className="bg-white text-shop-ink hover:bg-white/90" rightIcon={ArrowRight}>
                Track your orders
              </Button>
            )}
            <Button to="/category/all" variant="on-navy" leftIcon={ShoppingBag} className="border border-white/25">
              Continue shopping
            </Button>
          </div>
        </section>

        {placed && unpaid.length && payment && payment !== "paid" ? (
          <Notice tone="warning" icon={AlertTriangle} title={payment === "unavailable" ? "Online payment is unavailable right now" : payment === "pending" ? "We are still confirming your payment" : "Payment not completed"}>
            {payment === "pending"
              ? "If money left your account, the orders update automatically within a few minutes. You will not be charged twice."
              : `${location.state?.paymentError ? `${location.state.paymentError}. ` : ""}Your order${unpaid.length > 1 ? "s are" : " is"} saved. Use “Pay now” below to try again.`}
          </Notice>
        ) : null}

        {failed.length && !orders.length && !loading ? (
          <EmptyState
            className="rounded-[1.25rem]"
            icon={AlertTriangle}
            title="We couldn’t load this order"
            description={failed[0].error?.message}
            action={
              <>
                <Button variant="secondary" onClick={() => failed.forEach((r) => r.refetch())}>
                  Try again
                </Button>
                <Button to="/account/orders">See all orders</Button>
              </>
            }
          />
        ) : null}
        {failed.length && orders.length ? (
          <Notice tone="warning" icon={AlertTriangle} action={<Button size="sm" variant="secondary" to="/account/orders">All orders</Button>}>
            {failed.length === 1 ? "One order" : `${failed.length} orders`} couldn’t be loaded here. They are in your orders list.
          </Notice>
        ) : null}

        {loading && !orders.length ? (
          <div className="grid gap-3" role="status" aria-label="Loading your order">
            <Skeleton className="h-64 rounded-[1.25rem]" />
            <Skeleton className="h-24 rounded-[1.25rem]" />
          </div>
        ) : (
          orders.map((o) => <OrderCard key={orderId(o)} order={o} placed={placed} ledgerStores={ledger.data?.stores} />)
        )}

        {address ? (
          <section aria-label="Delivery address" className={cn(CARD, "flex items-start gap-3 p-4 sm:p-5")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
              <MapPin className="size-4" strokeWidth={2} aria-hidden />
            </span>
            <div className="min-w-0 text-shop-sm">
              <p className="font-semibold text-shop-ink">
                {orders.every(isPickupOrder) ? "Billing address" : "Delivering to"} {address.contactName}
              </p>
              <p className="text-shop-text">{[address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode].filter(Boolean).join(", ")}</p>
              {orders[0]?.buyerSnapshot?.gstin ? (
                <p className="mt-1 text-shop-xs text-shop-muted">
                  Invoiced to {orders[0].buyerSnapshot.company || orders[0].buyerSnapshot.name} · GSTIN <span className="font-mono">{orders[0].buyerSnapshot.gstin}</span>
                </p>
              ) : null}
            </div>
          </section>
        ) : null}

        <div className="flex flex-col gap-2 rounded-[1.25rem] border border-shop-line bg-shop-page/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <p className="text-shop-sm text-shop-text">Every order, invoice and delivery update stays in your account.</p>
          <div className="flex flex-wrap gap-2">
            <Button to="/account/orders" variant="secondary">
              All orders
            </Button>
            <Button to="/category/all" variant="ghost">
              Continue shopping
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
