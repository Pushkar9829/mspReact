/**
 * /account/orders/:id — one order: header (number, status + payment, date, seller), progress
 * tracker, actions from `allowedActions` (pay / invoice / buy again / return / cancel), return flow
 * (requested → approved → received → refunded), refunds, items, tracking + status history (IST),
 * server totals and payment facts, delivery address / invoice party, seller and help.
 */
import { Link, useParams } from "react-router-dom";
import { AlertTriangle, ArrowLeft, CalendarDays, CreditCard, FileText, MapPin, MessageCircle, Package, RotateCcw, Store, Truck } from "lucide-react";
import { Badge, Button, EmptyState, ImageWithFallback, Notice, ShopPageHeader, Skeleton } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { Money } from "../components/ui/Price.jsx";
import { useMyOrder } from "../hooks/index.js";
import { ActionReasons, OrderActions, TrackingTimeline } from "../components/buying/OrderActions.jsx";
import { OrderStatusPill, OrderStatusTracker, PaymentPill, RefundList, ReturnProgress, TotalsList, isPickupOrder, orderEta, orderId, orderUnits, paymentLabel, sellerName } from "../components/buying/orderUi.jsx";
import { displayName } from "../lib/text.js";
import { formatDate, formatDateTime } from "../../shared/lib/format.js";

const CARD = "rounded-[1.25rem] border border-shop-line bg-shop-card";

function Section({ title, icon: Icon, children, className, action, id }) {
  return (
    <section className={cn(CARD, "p-4 sm:p-5", className)} aria-labelledby={id}>
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 id={id} className="flex items-center gap-2 font-display text-shop-md font-bold text-shop-ink">
          {Icon ? (
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
              <Icon className="size-4" strokeWidth={2} aria-hidden />
            </span>
          ) : null}
          {title}
        </h2>
        {action}
      </div>
      {children}
    </section>
  );
}

function BackLink() {
  return (
    <Link to="/account/orders" className="inline-flex min-h-11 w-fit items-center gap-1.5 rounded-full text-shop-sm font-semibold text-shop-primary-ink hover:underline">
      <ArrowLeft className="size-4" aria-hidden /> All orders
    </Link>
  );
}

function DetailSkeleton() {
  return (
    <div className="grid gap-4" role="status" aria-label="Loading order">
      <Skeleton className="h-5 w-28" />
      <Skeleton className="h-8 w-64 max-w-full" />
      <Skeleton className="h-28 rounded-[1.25rem]" />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Skeleton className="h-72 rounded-[1.25rem]" />
        <Skeleton className="h-72 rounded-[1.25rem]" />
      </div>
    </div>
  );
}

function Fact({ label, children, mono }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-shop-muted">{label}</dt>
      <dd className={cn("min-w-0 text-right text-shop-ink", mono && "font-mono")}>{children}</dd>
    </div>
  );
}

export default function OrderDetail() {
  const { id } = useParams();
  const q = useMyOrder(id);
  const order = q.data;

  if (q.isPending) return <DetailSkeleton />;
  if (q.error || !order) {
    return (
      <div className="grid gap-4">
        <BackLink />
        <ShopPageHeader title="Order" />
        <EmptyState
          className="rounded-[1.25rem]"
          icon={AlertTriangle}
          title={q.error?.status === 404 ? "Order not found" : "We couldn’t load this order"}
          description={q.error?.status === 404 ? "It may belong to another account." : q.error?.message}
          action={
            <>
              {q.error?.status !== 404 ? (
                <Button variant="secondary" onClick={() => q.refetch()}>
                  Try again
                </Button>
              ) : null}
              <Button to="/account/orders">Back to orders</Button>
            </>
          }
        />
      </div>
    );
  }

  const items = order.items || [];
  const address = order.addressSnapshot || {};
  const buyer = order.buyerSnapshot || {};
  const seller = order.sellerSnapshot || {};
  const pickup = isPickupOrder(order);
  const eta = orderEta(order);
  const units = orderUnits(order);
  const aa = order.allowedActions || {};
  const cancelledAt = order.statusHistory?.filter((h) => h.status === "cancelled").at(-1)?.at;

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <BackLink />
        <ShopPageHeader
          title={`Order ${order.orderNumber}`}
          meta={
            <>
              <OrderStatusPill status={order.status} />
              <PaymentPill order={order} />
              <span className="inline-flex items-center gap-1 text-shop-sm text-shop-muted">
                <CalendarDays className="size-4" aria-hidden /> Placed {formatDateTime(order.createdAt)}
              </span>
              <span className="inline-flex items-center gap-1 text-shop-sm text-shop-muted">
                <Store className="size-4" aria-hidden /> {sellerName(order)}
              </span>
            </>
          }
        />
      </div>

      {aa.pay ? (
        <Notice tone="warning" icon={AlertTriangle} title="Payment pending">
          This order is waiting for payment. Pay now to send it to the seller.
        </Notice>
      ) : null}
      {order.status === "returned_to_origin" ? (
        <Notice tone="danger" title="Delivery failed — returned to the seller">
          The courier couldn’t deliver this order and it went back to the seller. {order.paymentStatus === "paid" || (order.refunds || []).length ? "Your refund is shown below." : "You won’t be charged for it."}
        </Notice>
      ) : null}
      {order.status === "cancelled" ? (
        <Notice tone="danger" title="Order cancelled">
          This order was cancelled{cancelledAt ? ` on ${formatDate(cancelledAt)}` : ""}. {order.paymentStatus === "paid" || (order.refunds || []).length ? "Your refund is shown below." : "Nothing was charged."}
        </Notice>
      ) : null}

      {/* Progress + actions */}
      {order.status !== "cancelled" || aa.reorder || aa.invoice || (order.creditNoteIds || []).length ? (
        <section aria-label="Order status and actions" className={cn(CARD, "overflow-hidden shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]")}>
          {order.status !== "cancelled" ? (
            <div className="p-4 sm:p-5">
              {eta ? (
                <p className="mb-4 flex items-center gap-2 text-shop-sm font-semibold text-shop-primary-ink">
                  <Truck className="size-4" aria-hidden /> {eta}
                </p>
              ) : null}
              <OrderStatusTracker order={order} />
            </div>
          ) : null}
          <div className={cn("grid gap-2 px-4 py-3 sm:px-5", order.status !== "cancelled" && "border-t border-shop-line bg-shop-page/60")}>
            <OrderActions order={order} exclude={["track"]} />
            {order.status !== "cancelled" ? <ActionReasons order={order} /> : null}
            {aa.return && aa.returnUntil ? <p className="text-shop-xs text-shop-muted">Returns open until {formatDate(aa.returnUntil)}.</p> : null}
          </div>
        </section>
      ) : null}

      <ReturnProgress order={order} />
      <RefundList refunds={order.refunds} />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          <Section
            id="od-items"
            icon={Package}
            title={`Items (${items.length})`}
            action={units ? <span className="text-shop-sm text-shop-muted">{units} units</span> : null}
          >
            <ul className="divide-y divide-shop-line">
              {items.map((i, n) => {
                const name = displayName(i.name);
                const href = i.slug ? `/product/${i.slug}${i.variantId ? `?v=${i.variantId}` : ""}` : null;
                const img = <ImageWithFallback src={i.image} alt="" fit="cover" fallbackName={name} className="size-16 shrink-0 rounded-xl sm:size-20" />;
                return (
                  <li key={i._id || n} className="flex gap-3 py-3 first:pt-0 last:pb-0">
                    {href ? (
                      <Link to={href} tabIndex={-1} aria-hidden="true" className="shrink-0">
                        {img}
                      </Link>
                    ) : (
                      img
                    )}
                    <div className="min-w-0 flex-1">
                      {href ? (
                        <Link to={href} className="line-clamp-2 text-shop-sm font-semibold text-shop-ink hover:text-shop-primary-ink hover:underline">
                          {name}
                        </Link>
                      ) : (
                        <p className="line-clamp-2 text-shop-sm font-semibold text-shop-ink">{name}</p>
                      )}
                      <p className="mt-0.5 text-shop-xs text-shop-muted">
                        {i.attributes?.packSize ? `${i.attributes.packSize} · ` : ""}
                        {i.qty} × <Money value={i.unitPrice} />
                        {i.taxRate != null ? ` · GST ${i.taxRate}%` : ""}
                        {i.hsn ? ` · HSN ${i.hsn}` : ""}
                      </p>
                      {i.bulk || i.easyReturn || i.fulfillmentMode === "store_pickup" ? (
                        <p className="mt-1.5 flex flex-wrap gap-1.5">
                          {i.bulk ? (
                            <Badge tone="business" soft>
                              Bulk price
                            </Badge>
                          ) : null}
                          {i.easyReturn ? (
                            <Badge tone="neutral" icon={RotateCcw}>
                              Easy return
                            </Badge>
                          ) : null}
                          {i.fulfillmentMode === "store_pickup" ? <Badge tone="neutral">Store pickup</Badge> : null}
                        </p>
                      ) : null}
                    </div>
                    <Money value={i.lineTotal} className="shrink-0 text-shop-sm font-bold tabular-nums text-shop-ink" />
                  </li>
                );
              })}
            </ul>
          </Section>

          <Section id="od-track" icon={Truck} title="Tracking and history">
            <TrackingTimeline order={order} />
          </Section>
        </div>

        <div className="grid gap-4 lg:sticky lg:top-36">
          <Section id="od-pay" icon={CreditCard} title="Payment and invoice" className="shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
            <TotalsList t={order.totals} couponCode={order.couponCode} />
            <dl className="mt-4 grid gap-1.5 border-t border-shop-line pt-3 text-shop-sm">
              <Fact label="Method">{paymentLabel(order.paymentMethod)}</Fact>
              {order.poNumber ? (
                <Fact label="PO number" mono>
                  {order.poNumber}
                </Fact>
              ) : null}
              {order.paidAt ? <Fact label="Paid">{formatDateTime(order.paidAt)}</Fact> : null}
              <Fact label="GST invoice">
                {order.invoiceNumber ? (
                  <span className="inline-flex items-center gap-1">
                    <FileText className="size-3.5 text-shop-muted" aria-hidden /> {order.invoiceNumber}
                  </span>
                ) : aa.invoice ? (
                  "Ready to download"
                ) : (
                  <span className="text-shop-muted">{order.status === "cancelled" ? "Not issued" : "After the seller confirms"}</span>
                )}
              </Fact>
            </dl>
          </Section>

          <Section id="od-addr" icon={MapPin} title={pickup ? "Pickup and billing" : "Delivery and billing"}>
            <div className="grid gap-3 text-shop-sm">
              {address.contactName || address.addressLine1 ? (
                <div>
                  {address.contactName ? <p className="font-semibold text-shop-ink">{address.contactName}</p> : null}
                  <p className="text-shop-text">{[address.addressLine1, address.addressLine2, address.city, address.state, address.postalCode].filter(Boolean).join(", ")}</p>
                  {address.phone ? <p className="text-shop-xs text-shop-muted">{address.phone}</p> : null}
                </div>
              ) : (
                <p className="text-shop-muted">No address on this order.</p>
              )}
              {buyer.gstin ? (
                <p className="rounded-xl bg-shop-page/60 px-3 py-2 text-shop-xs text-shop-muted">
                  Invoiced to <span className="font-semibold text-shop-text">{buyer.company || buyer.name}</span>
                  <span className="block">
                    GSTIN <span className="font-mono text-shop-text">{buyer.gstin}</span>
                  </span>
                </p>
              ) : null}
              {order.deliveryPartner?.name && !pickup ? <p className="text-shop-xs text-shop-muted">Delivery partner: {order.deliveryPartner.name}</p> : null}
              {order.buyerNotes ? <p className="text-shop-xs text-shop-muted">Your note: {order.buyerNotes}</p> : null}
            </div>
          </Section>

          <Section id="od-seller" icon={Store} title="Seller">
            <div className="grid gap-1 text-shop-sm">
              <p className="font-semibold text-shop-ink">{displayName(seller.legalName) || sellerName(order)}</p>
              {seller.gstin ? <p className="text-shop-xs text-shop-muted">GSTIN {seller.gstin}</p> : null}
              {seller.address ? <p className="text-shop-xs text-shop-muted">{seller.address}</p> : null}
              {seller.phone || seller.email ? <p className="text-shop-xs text-shop-muted">{[seller.phone, seller.email].filter(Boolean).join(" · ")}</p> : null}
              <Button className="mt-3" variant="secondary" block leftIcon={MessageCircle} to={`/account/support?new=1&order=${orderId(order)}`}>
                Get help with this order
              </Button>
            </div>
          </Section>
        </div>
      </div>
    </div>
  );
}
