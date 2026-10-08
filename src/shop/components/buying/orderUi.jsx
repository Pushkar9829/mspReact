/**
 * Buyer order display helpers (status pills, labels, server totals, return flow). Pages under
 * /account and the confirmation page share these so the copy and tones never drift.
 * Money: render server fields only (order `totals`, checkout/preview group fields).
 */
import { Check } from "lucide-react";
import { cn } from "../ui/cn.js";
import { Money } from "../ui/Price.jsx";
import { ImageWithFallback } from "../ui/Media.jsx";
import { displayName } from "../../lib/text.js";
import { formatDate, formatEta, paymentLabel } from "../../../shared/lib/format.js";

/* ------------------------------------------------------------------ statuses */

export const ORDER_STATUS_LABELS = {
  pending: "Awaiting confirmation",
  confirmed: "Confirmed",
  processing: "Packing",
  ready_to_ship: "Ready to ship",
  shipped: "Shipped",
  out_for_delivery: "Out for delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return requested",
  return_approved: "Return approved",
  returned: "Returned",
  refunded: "Refunded",
  returned_to_origin: "Returned to seller",
};

/** Filter chips on the orders list (value = comma list sent to ?status=). */
export const ORDER_STATUS_FILTERS = [
  { value: "", label: "All" },
  { value: "pending,confirmed,processing,ready_to_ship", label: "Open" },
  { value: "shipped,out_for_delivery", label: "On the way" },
  { value: "delivered", label: "Delivered" },
  { value: "return_requested,return_approved", label: "Returns in progress" },
  { value: "returned,refunded", label: "Returned / refunded" },
  { value: "cancelled,returned_to_origin", label: "Cancelled" },
];

export const OPEN_STATUSES = ["pending", "confirmed", "processing", "ready_to_ship", "shipped", "out_for_delivery"];

const TONE_CLASS = {
  success: "bg-shop-primary-soft text-shop-primary-ink",
  info: "bg-shop-info-soft text-shop-info-ink",
  warning: "bg-shop-warning-soft text-shop-warning-ink",
  danger: "bg-shop-danger-soft text-shop-danger-ink",
  business: "bg-shop-gold-soft text-shop-gold-ink",
  neutral: "bg-shop-well text-shop-text",
};

const ORDER_TONES = {
  pending: "warning",
  confirmed: "info",
  processing: "info",
  ready_to_ship: "info",
  shipped: "info",
  out_for_delivery: "info",
  delivered: "success",
  cancelled: "danger",
  returned_to_origin: "danger",
  return_requested: "warning",
  return_approved: "info",
  returned: "neutral",
  refunded: "neutral",
};

const PAYMENT_TONES = { paid: "success", unpaid: "warning", pending: "warning", failed: "danger", refunded: "neutral" };

/** Buyer-facing payment state for an order (method-aware: PO/credit "unpaid" means "on terms"). */
export function paymentState(order) {
  const method = order?.paymentMethod;
  const status = order?.paymentStatus || "unpaid";
  if (status === "paid") return { label: "Paid", tone: "success" };
  if (status === "refunded") return { label: "Refunded", tone: "neutral" };
  if (status === "failed") return { label: "Payment failed", tone: "danger" };
  if (method === "cod") return { label: order?.status === "cancelled" ? "Not charged" : "Pay on delivery", tone: "neutral" };
  if (method === "purchase_order" || method === "credit_terms") return { label: order?.status === "cancelled" ? "Not charged" : "On credit terms", tone: "business" };
  if (order?.status === "cancelled") return { label: "Not charged", tone: "neutral" };
  return { label: status === "pending" ? "Payment processing" : "Payment due", tone: "warning" };
}

export function orderStatusLabel(status) {
  return ORDER_STATUS_LABELS[status] || String(status || "").replaceAll("_", " ");
}

export function Pill({ tone = "neutral", children, className }) {
  return (
    <span className={cn("inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2.5 text-shop-xs font-semibold", TONE_CLASS[tone] || TONE_CLASS.neutral, className)}>
      {children}
    </span>
  );
}

export function OrderStatusPill({ status, className }) {
  return (
    <Pill tone={ORDER_TONES[status] || "neutral"} className={className}>
      <span className="sr-only">Order status: </span>
      {orderStatusLabel(status)}
    </Pill>
  );
}

export function PaymentPill({ order, className }) {
  const p = paymentState(order);
  return (
    <Pill tone={p.tone} className={className}>
      <span className="sr-only">Payment: </span>
      {p.label}
    </Pill>
  );
}

export { paymentLabel };

/** Store name on an order (populated tenantId or the seller snapshot). */
export function sellerName(order) {
  const t = order?.tenantId;
  return displayName(order?.sellerSnapshot?.name || (t && typeof t === "object" ? t.name : "")) || "Seller";
}

export function orderId(order) {
  return String(order?._id || order?.id || "");
}

/** ETA copy for an order. */
export function orderEta(order) {
  if (!order) return "";
  if (order.status === "delivered" && order.deliveredAt) return `Delivered ${formatDate(order.deliveredAt)}`;
  if (["cancelled", "returned", "refunded", "return_requested", "return_approved", "returned_to_origin"].includes(order.status)) return "";
  if (order.etaFrom) return `Expected ${formatEta(order.etaFrom, order.etaTo)}`;
  return "";
}

export function isPickupOrder(order) {
  const items = order?.items || [];
  return items.length > 0 && items.every((i) => i.fulfillmentMode === "store_pickup");
}

/** Total units across an order's lines. */
export function orderUnits(order) {
  return (order?.items || []).reduce((n, i) => n + (Number(i.qty) || 0), 0);
}

/* ------------------------------------------------------------------ thumbnails */

/**
 * Overlapping item thumbnails for an order card: up to `max` images then a "+N" tile.
 *   <OrderThumbs items={order.items} />
 */
export function OrderThumbs({ items = [], max = 3, className, tileClassName = "size-12 sm:size-14" }) {
  if (!items.length) return null;
  const shown = items.slice(0, max);
  const more = items.length - shown.length;
  return (
    <div className={cn("flex shrink-0 -space-x-3", className)} aria-hidden>
      {shown.map((i, n) => (
        <ImageWithFallback key={i._id || i.variantId || n} src={i.image} alt="" fit="cover" fallbackName={displayName(i.name)} className={cn("rounded-xl border-2 border-shop-card shadow-sm", tileClassName)} />
      ))}
      {more > 0 ? <span className={cn("grid shrink-0 place-items-center rounded-xl border-2 border-shop-card bg-shop-well text-shop-xs font-bold text-shop-text", tileClassName)}>+{more}</span> : null}
    </div>
  );
}

/* ------------------------------------------------------------------ status tracker */

const DELIVERY_FLOW = [
  { key: "placed", label: "Placed", statuses: ["pending"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "packed", label: "Packed", statuses: ["processing", "ready_to_ship"] },
  { key: "shipped", label: "On the way", statuses: ["shipped", "out_for_delivery"] },
  { key: "delivered", label: "Delivered", statuses: ["delivered"] },
];
const PICKUP_FLOW = [
  { key: "placed", label: "Placed", statuses: ["pending"] },
  { key: "confirmed", label: "Confirmed", statuses: ["confirmed"] },
  { key: "packed", label: "Packing", statuses: ["processing"] },
  { key: "ready", label: "Ready for pickup", statuses: ["ready_to_ship", "shipped", "out_for_delivery"] },
  { key: "delivered", label: "Collected", statuses: ["delivered"] },
];
const AFTER_DELIVERY = ["return_requested", "return_approved", "returned", "refunded"];

/**
 * Order progress (placed → delivered) from `status` + `statusHistory` dates. Vertical on phones,
 * horizontal from `sm`. Nothing for cancelled orders (the page explains those).
 */
export function OrderStatusTracker({ order, className }) {
  if (!order || order.status === "cancelled" || order.status === "returned_to_origin") return null;
  const flow = isPickupOrder(order) ? PICKUP_FLOW : DELIVERY_FLOW;
  const at = AFTER_DELIVERY.includes(order.status) ? flow.length - 1 : Math.max(0, flow.findIndex((s) => s.statuses.includes(order.status)));
  const finished = order.status === "delivered" || AFTER_DELIVERY.includes(order.status);
  const history = order.statusHistory || [];
  const dateOf = (step, i) => {
    const hit = history.filter((h) => step.statuses.includes(h.status)).at(-1)?.at;
    if (hit) return hit;
    if (i === 0) return order.createdAt;
    if (step.key === "delivered") return order.deliveredAt;
    return null;
  };
  return (
    <ol className={cn("grid gap-0 sm:grid-cols-5 sm:gap-2", className)} aria-label="Order progress">
      {flow.map((s, i) => {
        const done = i < at || (finished && i === at);
        const now = i === at && !finished;
        const date = i <= at ? dateOf(s, i) : null;
        return (
          <li key={s.key} className="relative flex gap-3 pb-4 last:pb-0 sm:block sm:pb-0" aria-current={now ? "step" : undefined}>
            {i < flow.length - 1 ? (
              <span aria-hidden className={cn("absolute left-[11px] top-7 h-[calc(100%-1.75rem)] w-0.5 rounded-full sm:left-8 sm:-right-1 sm:top-[11px] sm:h-0.5 sm:w-auto", i < at || finished ? "bg-shop-primary" : "bg-shop-line-strong")} />
            ) : null}
            <span
              aria-hidden
              className={cn(
                "relative z-10 grid size-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold tabular-nums",
                done ? "bg-shop-primary text-white" : now ? "bg-shop-navy text-white ring-4 ring-shop-navy/10" : "bg-shop-card text-shop-muted ring-1 ring-shop-line-strong"
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className="min-w-0 sm:mt-2 sm:block">
              <span className={cn("block text-shop-sm", now ? "font-semibold text-shop-ink" : done ? "font-medium text-shop-ink" : "text-shop-muted")}>
                {now ? orderStatusLabel(order.status) : s.label}
                <span className="sr-only">{done ? " (done)" : now ? " (current)" : " (not yet)"}</span>
              </span>
              {date ? <span className="block text-shop-xs text-shop-muted">{formatDate(date)}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/* ------------------------------------------------------------------ totals */

function Row({ label, children, strong, tone }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <dt className={cn(strong ? "font-semibold text-shop-ink" : "text-shop-muted")}>{label}</dt>
      <dd className={cn("shrink-0 tabular-nums", strong ? "text-shop-md font-bold text-shop-ink" : "font-medium text-shop-ink", tone === "saving" && "text-shop-primary-ink")}>{children}</dd>
    </div>
  );
}

/**
 * Server totals block. `t` is an order `totals`, a checkout/preview group, or a cart/preview quote
 * ({ subtotal, couponDiscount, couponCode?, fees{ delivery, platform, partner, total }, productTax, feeTax, grandTotal }).
 * Nothing is added up here.
 */
export function TotalsList({ t, pending = false, couponCode, totalLabel = "Total", className, showGst = true }) {
  if (!t) return null;
  const fees = t.fees || {};
  const code = couponCode ?? t.couponCode;
  const delivery = fees.delivery ?? t.deliveryFee;
  const platform = fees.platform ?? t.platformFee;
  const partner = fees.partner ?? t.partnerFee;
  return (
    <div className={cn("grid gap-3", className)}>
      <dl className="grid gap-1.5 text-shop-sm">
        <Row label="Items">
          <Money value={t.subtotal} pending={pending} />
        </Row>
        {Number(t.couponDiscount) > 0 ? (
          <Row label={`Coupon${code ? ` ${code}` : ""}`} tone="saving">
            − <Money value={t.couponDiscount} pending={pending} />
          </Row>
        ) : null}
        <Row label="Delivery">{Number(delivery) > 0 ? <Money value={delivery} pending={pending} /> : pending ? <Money pending /> : <span className="text-shop-primary-ink">Free</span>}</Row>
        {Number(partner) > 0 ? (
          <Row label="Delivery partner charge">
            <Money value={partner} pending={pending} />
          </Row>
        ) : null}
        {Number(platform) > 0 ? (
          <Row label="Platform fee">
            <Money value={platform} pending={pending} />
          </Row>
        ) : null}
        <div className="my-1 border-t border-shop-line" />
        <Row label={totalLabel} strong>
          <Money value={t.grandTotal ?? t.total} pending={pending} />
        </Row>
      </dl>
      {showGst && (t.productTax != null || t.tax != null) ? (
        <dl className="grid gap-1 rounded-well bg-shop-well px-3 py-2 text-shop-xs">
          <p className="font-semibold text-shop-muted">GST included in the total</p>
          <div className="flex justify-between gap-3">
            <dt className="text-shop-muted">GST on items</dt>
            <dd className="tabular-nums text-shop-ink">
              <Money value={t.productTax ?? t.tax} pending={pending} />
            </dd>
          </div>
          {Number(t.feeTax) > 0 ? (
            <div className="flex justify-between gap-3">
              <dt className="text-shop-muted">GST on delivery and fees</dt>
              <dd className="tabular-nums text-shop-ink">
                <Money value={t.feeTax} pending={pending} />
              </dd>
            </div>
          ) : null}
        </dl>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ return flow */

const RETURN_STEPS = [
  { key: "requested", label: "Return requested", help: "The seller reviews your request." },
  { key: "approved", label: "Approved", help: "Hand the items back to the seller or their courier." },
  { key: "returned", label: "Items received", help: "The seller checks the items and issues a credit note." },
  { key: "refunded", label: "Refunded", help: "Money goes back the way you paid (credit orders: to your account with the seller)." },
];

/** Where the return is: { stage, rejected, refundStatus } or null when no return was requested. */
export function returnStage(order) {
  const rr = order?.returnRequest;
  if (!rr?.status) return null;
  if (rr.status === "rejected") return { stage: -1, rejected: true, note: rr.decisionNote };
  const refunds = order.refunds || [];
  const refundDone = order.status === "refunded" || refunds.some((r) => r.status === "processed");
  const refundPending = refunds.some((r) => ["pending", "processing", "failed"].includes(r.status));
  let stage = 0;
  if (rr.status === "approved" || order.status === "return_approved") stage = 1;
  if (rr.status === "received" || order.status === "returned") stage = 2;
  if (refundDone) stage = 3;
  return { stage, rejected: false, refundPending, note: rr.decisionNote };
}

export function ReturnProgress({ order, className }) {
  const r = returnStage(order);
  if (!r) return null;
  const rr = order.returnRequest || {};
  if (r.rejected) {
    return (
      <div className={cn("rounded-[1.25rem] border border-shop-line bg-shop-danger-soft p-4 text-shop-sm text-shop-danger-ink", className)} role="status">
        <p className="font-semibold">Return not accepted</p>
        <p className="mt-1">{r.note || "The seller declined this return. Contact support if you think this is wrong."}</p>
      </div>
    );
  }
  return (
    <div className={cn("rounded-[1.25rem] border border-shop-line bg-shop-card p-4 sm:p-5", className)}>
      <p className="font-display text-shop-md font-bold text-shop-ink">Return</p>
      {rr.reason ? (
        <p className="mt-1 text-shop-sm text-shop-muted">
          Reason: <span className="text-shop-text">{rr.reason}</span>
          {rr.requestedAt ? ` · requested ${formatDate(rr.requestedAt)}` : ""}
        </p>
      ) : null}
      <ol className="mt-3 grid gap-3 sm:grid-cols-4">
        {RETURN_STEPS.map((s, i) => {
          const done = i <= r.stage;
          const current = i === r.stage;
          return (
            <li key={s.key} className="flex gap-2 sm:block" aria-current={current ? "step" : undefined}>
              <span className={cn("grid size-6 shrink-0 place-items-center rounded-full text-shop-xs font-bold", done ? "bg-shop-primary text-white" : "bg-shop-well text-shop-muted")} aria-hidden>
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span className="min-w-0 sm:mt-1.5 sm:block">
                <span className={cn("block text-shop-sm font-semibold", done ? "text-shop-ink" : "text-shop-muted")}>
                  {s.label}
                  <span className="sr-only">{done ? " (done)" : " (not yet)"}</span>
                </span>
                {current ? <span className="block text-shop-xs text-shop-muted">{i === 2 && r.refundPending ? "Refund is being processed." : s.help}</span> : null}
              </span>
            </li>
          );
        })}
      </ol>
      {r.note ? <p className="mt-3 text-shop-xs text-shop-muted">Seller note: {r.note}</p> : null}
    </div>
  );
}

const REFUND_LABEL = { pending: "Queued", processing: "Processing", processed: "Refunded", failed: "Retrying" };
const REFUND_TONE = { pending: "warning", processing: "info", processed: "success", failed: "warning" };

export function RefundList({ refunds = [], className }) {
  if (!refunds.length) return null;
  return (
    <div className={cn("rounded-[1.25rem] border border-shop-line bg-shop-card p-4 sm:p-5", className)}>
      <p className="font-display text-shop-md font-bold text-shop-ink">Refunds</p>
      <ul className="mt-2 divide-y divide-shop-line text-shop-sm">
        {refunds.map((r) => (
          <li key={r.key || r._id} className="flex flex-wrap items-center justify-between gap-2 py-2">
            <span className="min-w-0">
              <span className="font-semibold text-shop-ink">
                <Money value={r.amount} />
              </span>
              <span className="text-shop-muted">
                {" "}
                · {r.provider === "ledger" ? "to your account with the seller" : r.provider === "manual" ? "by the seller" : "to your original payment method"}
                {r.processedAt ? ` · ${formatDate(r.processedAt)}` : r.createdAt ? ` · started ${formatDate(r.createdAt)}` : ""}
              </span>
            </span>
            <Pill tone={REFUND_TONE[r.status] || "neutral"}>{REFUND_LABEL[r.status] || r.status}</Pill>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-shop-xs text-shop-muted">Bank refunds usually reach you in 5–7 working days after they show as refunded.</p>
    </div>
  );
}

/** Copy for the refund-policy disclosure at checkout / on orders. */
export function refundPolicyText(settings) {
  const days = settings?.returnWindowDays;
  const returns = settings?.returnsEnabled === false ? "Returns are not offered right now." : `Items marked “Easy return” can be returned within ${days ?? 7} days of delivery.`;
  return `${returns} Refunds for UPI, card and net banking go back to the original method; orders on purchase order or credit terms are credited to your account with the seller; for cash on delivery the seller settles the refund with you.`;
}
