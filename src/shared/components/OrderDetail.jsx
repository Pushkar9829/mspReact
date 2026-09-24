import { inr } from "../lib/format.js";

const FULFILLMENT = {
  store_pickup: "Store pickup",
  delivery_partner: "Delivery partner",
};

export function trackingForShip(status) {
  if (status !== "shipped") return {};
  const trackingNumber = window.prompt("Tracking number. Cancel to stop. Leave blank to ship without tracking.");
  if (trackingNumber === null) return null;
  const trimmed = trackingNumber.trim();
  if (!trimmed) return {};
  const carrier = window.prompt("Carrier") || "";
  return { trackingNumber: trimmed, carrier: carrier.trim() };
}

export function OrderDetailPanel({ detail }) {
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
      <dl className="mt-3 grid gap-1 text-sm text-msr-muted sm:grid-cols-2">
        {detail.platformFee ? (
          <div>
            <dt className="inline">Platform fee </dt>
            <dd className="inline font-semibold text-msr-navy">{inr(detail.platformFee)}</dd>
          </div>
        ) : null}
        {detail.deliveryFee ? (
          <div>
            <dt className="inline">Delivery </dt>
            <dd className="inline font-semibold text-msr-navy">{inr(detail.deliveryFee)}</dd>
          </div>
        ) : null}
        {detail.partnerFee || detail.deliveryPartner?.name ? (
          <div>
            <dt className="inline">{detail.deliveryPartner?.name || "Partner"} </dt>
            <dd className="inline font-semibold text-msr-navy">{detail.partnerFee ? inr(detail.partnerFee) : "FREE"}</dd>
          </div>
        ) : null}
      </dl>
      <ul className="mt-3 grid gap-2 text-sm">
        {(detail.items || []).map((item) => (
          <li key={item._id || `${item.sku}-${item.qty}`} className="flex justify-between gap-3 border-b border-msr-border py-2">
            <span>
              {item.name} · {item.sku} × {item.qty}
              <span className="block text-xs text-msr-muted">
                {FULFILLMENT[item.fulfillmentMode] || "Delivery partner"}
                {item.easyReturn ? " · Easy return" : ""}
              </span>
            </span>
            <span className="font-semibold">{inr(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
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
