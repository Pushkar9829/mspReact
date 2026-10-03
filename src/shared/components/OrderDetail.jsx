import { Link } from "react-router-dom";
import { inr, inr2, paymentLabel } from "../lib/format.js";

const FULFILLMENT = {
  store_pickup: "Store pickup",
  delivery_partner: "Delivery partner",
};

export const INVOICEABLE = [
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "return_requested",
  "refunded",
];

function Row({ label, value, strong }) {
  return (
    <>
      <dt className={strong ? "font-bold text-msr-navy" : "text-msr-muted"}>{label}</dt>
      <dd className={`text-right ${strong ? "font-bold text-msr-navy" : "text-msr-navy"}`}>{value}</dd>
    </>
  );
}

/** Subtotal, coupon, GST included, each fee and total for a saved order. */
export function OrderTotals({ order, className = "" }) {
  if (!order) return null;
  return (
    <dl className={`mt-3 ml-auto grid max-w-xs grid-cols-[1fr_auto] gap-y-1 text-sm ${className}`}>
      <Row label="Subtotal" value={inr2(order.subtotal)} />
      {order.couponDiscount ? (
        <Row label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`} value={`−${inr2(order.couponDiscount)}`} />
      ) : null}
      {order.deliveryFee ? <Row label="Delivery" value={inr2(order.deliveryFee)} /> : null}
      {order.partnerFee ? (
        <Row label={order.deliveryPartner?.name ? `Partner (${order.deliveryPartner.name})` : "Partner fee"} value={inr2(order.partnerFee)} />
      ) : null}
      {order.platformFee ? <Row label="Platform fee" value={inr2(order.platformFee)} /> : null}
      <Row label="Total" value={inr2(order.total)} strong />
      <Row label="GST included" value={inr2(order.tax)} />
    </dl>
  );
}

export function trackingForShip(status) {
  if (status !== "shipped") return {};
  const trackingNumber = window.prompt("Tracking number. Cancel to stop. Leave blank to ship without tracking.");
  if (trackingNumber === null) return null;
  const trimmed = trackingNumber.trim();
  if (!trimmed) return {};
  const carrier = window.prompt("Carrier") || "";
  return { trackingNumber: trimmed, carrier: carrier.trim() };
}

function ReturnRequestBox({ request, busy, onApprove, onReject }) {
  if (!request?.status) return null;
  const tone =
    request.status === "requested"
      ? "border-amber-200 bg-amber-50"
      : request.status === "approved"
        ? "border-msr-success/20 bg-msr-success-soft"
        : "border-msr-danger/20 bg-msr-danger-soft";
  return (
    <div className={`mt-3 rounded-xl border p-3 text-sm ${tone}`}>
      <p className="font-bold text-msr-navy">
        {request.status === "requested" ? "Return requested" : request.status === "approved" ? "Return approved (refunded)" : "Return rejected"}
      </p>
      <p className="mt-1 text-msr-navy">
        Reason: {request.reason}
        {request.requestedAt ? <span className="text-msr-muted"> · {new Date(request.requestedAt).toLocaleDateString("en-IN")}</span> : null}
      </p>
      {request.note ? <p className="mt-1 text-msr-muted">“{request.note}”</p> : null}
      {request.decisionNote ? <p className="mt-1 text-msr-muted">Store note: {request.decisionNote}</p> : null}
      {request.status === "requested" && (onApprove || onReject) ? (
        <div className="mt-2 flex gap-2">
          {onApprove ? (
            <button type="button" disabled={busy} onClick={onApprove} className="rounded-lg bg-msr-navy px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50">
              Approve &amp; refund
            </button>
          ) : null}
          {onReject ? (
            <button type="button" disabled={busy} onClick={onReject} className="rounded-lg border border-msr-danger px-3 py-1.5 text-xs font-bold text-msr-danger disabled:opacity-50">
              Reject
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

export function OrderDetailPanel({ detail, busy = false, onApproveReturn, onRejectReturn }) {
  if (!detail) return null;
  const buyer = detail.buyerId?.name || detail.buyerId?.email || "Buyer";
  return (
    <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-bold">{detail.orderNumber}</h2>
          <p className="mt-1 text-sm text-msr-muted">
            {buyer}
            {detail.buyerId?.email && detail.buyerId?.name ? ` · ${detail.buyerId.email}` : ""}
            {" · "}
            {detail.addressSnapshot?.city || ""} {detail.addressSnapshot?.postalCode || ""}
          </p>
        </div>
        <p className="text-sm font-bold">{inr(detail.total)}</p>
      </div>
      <p className="mt-2 text-sm text-msr-muted">
        Payment: <span className="font-semibold text-msr-navy">{paymentLabel(detail.paymentMethod)}</span> ({detail.paymentStatus || "unpaid"})
        {detail.poNumber ? <> · PO <span className="font-semibold text-msr-navy">{detail.poNumber}</span></> : null}
        {detail.invoiceNumber ? <> · Invoice <span className="font-semibold text-msr-navy">{detail.invoiceNumber}</span></> : null}
      </p>
      {INVOICEABLE.includes(detail.status) ? (
        <Link
          to={`/invoice/${detail._id || detail.orderNumber}`}
          className="mt-2 inline-block text-sm font-semibold text-msr-primary underline"
        >
          View GST invoice
        </Link>
      ) : null}
      <ul className="mt-3 grid gap-2 text-sm">
        {(detail.items || []).map((item) => (
          <li key={item._id || `${item.sku}-${item.qty}`} className="flex justify-between gap-3 border-b border-msr-border py-2">
            <span>
              {item.name} · {item.sku} × {item.qty} @ {inr2(item.unitPrice)}
              <span className="block text-xs text-msr-muted">
                {FULFILLMENT[item.fulfillmentMode] || "Delivery partner"}
                {item.easyReturn ? " · Easy return" : ""}
                {item.taxRate ? ` · GST ${item.taxRate}% incl.` : ""}
              </span>
            </span>
            <span className="font-semibold">{inr2(item.lineSubtotal ?? item.unitPrice * item.qty)}</span>
          </li>
        ))}
      </ul>
      <OrderTotals order={detail} />
      <ReturnRequestBox
        request={detail.returnRequest}
        busy={busy}
        onApprove={onApproveReturn ? () => onApproveReturn(detail) : null}
        onReject={onRejectReturn ? () => onRejectReturn(detail) : null}
      />
      {detail.buyerNotes ? (
        <p className="mt-3 text-sm text-msr-muted">
          Buyer notes: <span className="text-msr-navy">{detail.buyerNotes}</span>
        </p>
      ) : null}
      {detail.fulfillments?.length ? (
        <ul className="mt-3 space-y-1 text-sm text-msr-muted">
          {detail.fulfillments.map((row, index) => (
            <li key={row.trackingNumber || index}>
              Shipped{row.carrier ? ` via ${row.carrier}` : ""}
              {row.trackingNumber ? ` · ${row.trackingNumber}` : ""}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
