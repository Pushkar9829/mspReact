import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, RotateCcw, Store, Truck } from "lucide-react";
import { api } from "../../shared/api.js";
import { formatDate, formatEta, inr2, paymentLabel } from "../../shared/lib/format.js";
import { INVOICEABLE } from "../../shared/components/OrderDetail.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { Button, buttonClass } from "../components/shopUi.jsx";

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const placed = location.state?.orders || [];
  const [orders, setOrders] = useState(placed);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [loading, setLoading] = useState(!placed.length);

  useEffect(() => {
    if (orders.length) {
      setLoading(false);
      return undefined;
    }
    if (!user?.token) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    setLoading(true);
    api
      .getOrder(id)
      .then((order) => {
        if (!cancelled) setOrders(order ? [order] : []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.token, orders.length]);

  const primary = orders[0];
  const addr = primary?.addressSnapshot;

  if (loading) {
    return (
      <div className="msr-gutter py-20 text-center">
        <p className="text-sm text-msr-muted">Loading order…</p>
      </div>
    );
  }

  if (!primary) {
    return (
      <div className="msr-gutter py-16 text-center">
        <h1 className="text-3xl font-extrabold tracking-tight text-msr-ink">Order not available</h1>
        <p className="mx-auto mt-2 max-w-md text-msr-muted">
          {error || (user?.token ? "We could not find this order." : "Sign in to view this order.")}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          {!user?.token ? (
            <Link to="/login" state={{ from: `/order/${id}` }} className={buttonClass()}>
              Sign in
            </Link>
          ) : null}
          <Link to="/account/orders" className={buttonClass({ variant: "secondary" })}>
            View orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="msr-gutter py-10 md:py-14">
      <div className="mx-auto max-w-2xl text-center">
        {placed.length ? (
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-msr-success-soft text-msr-success">
            <CheckCircle2 className="h-9 w-9" />
          </span>
        ) : null}
        <h1 className={`text-3xl font-extrabold tracking-tight text-msr-ink ${placed.length ? "mt-4" : ""}`}>
          {placed.length ? "Order placed" : "Order details"}
        </h1>
        <p className="mt-2 text-msr-muted">
          {placed.length
            ? "Thanks for shopping with MS₹. We’ll send updates as your order moves."
            : "Pickup, delivery, fees and payment for this order."}
        </p>
        {error ? <p className="mt-2 text-sm text-msr-danger">{error}</p> : null}
      </div>

      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        {orders.map((order) => (
          <article key={order._id || order.orderNumber} className="rounded-2xl border border-msr-line bg-white p-6 shadow-card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-msr-primary">Order</p>
                <p className="mt-1 text-lg font-extrabold text-msr-ink">{order.orderNumber || id}</p>
                {order.createdAt ? <p className="mt-1 text-sm text-msr-subtle">{formatDate(order.createdAt)}</p> : null}
              </div>
              <span className="rounded-full bg-msr-success-soft px-3 py-1 text-[12px] font-bold capitalize text-msr-success-ink">
                {order.status || "pending"}
              </span>
            </div>

            {order.items?.length ? (
              <div className="mt-5 space-y-4 border-t border-msr-line pt-4">
                <FulfillmentGroup
                  title="Store pickup"
                  icon={Store}
                  items={order.items.filter((item) => item.fulfillmentMode === "store_pickup")}
                />
                <FulfillmentGroup
                  title="Delivery partner"
                  icon={Truck}
                  items={order.items.filter((item) => item.fulfillmentMode !== "store_pickup")}
                />
              </div>
            ) : null}

            <dl className="mt-4 space-y-2 border-t border-msr-line pt-4 text-sm">
              <div className="flex justify-between text-msr-muted">
                <dt>Subtotal</dt>
                <dd>{inr2(order.subtotal)}</dd>
              </div>
              {order.couponDiscount ? (
                <div className="flex justify-between text-msr-success-ink">
                  <dt>Coupon{order.couponCode ? ` (${order.couponCode})` : ""}</dt>
                  <dd>−{inr2(order.couponDiscount)}</dd>
                </div>
              ) : null}
              {order.deliveryFee ? (
                <div className="flex justify-between text-msr-muted">
                  <dt>Delivery</dt>
                  <dd>{inr2(order.deliveryFee)}</dd>
                </div>
              ) : null}
              {order.partnerFee ? (
                <div className="flex justify-between text-msr-muted">
                  <dt>{order.deliveryPartner?.name ? `${order.deliveryPartner.name} charge` : "Partner charge"}</dt>
                  <dd>{inr2(order.partnerFee)}</dd>
                </div>
              ) : null}
              {order.platformFee ? (
                <div className="flex justify-between text-msr-muted">
                  <dt>Platform fee</dt>
                  <dd>{inr2(order.platformFee)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-extrabold text-msr-ink">
                <dt>Total</dt>
                <dd>{inr2(order.total)}</dd>
              </div>
              <div className="flex justify-between text-[12px] text-msr-subtle">
                <dt>GST included in prices</dt>
                <dd>{inr2(order.tax)}</dd>
              </div>
            </dl>
            {order.paymentMethod ? (
              <p className="mt-2 text-sm text-msr-muted">
                Payment: {paymentLabel(order.paymentMethod)} ({order.paymentStatus || "unpaid"})
                {order.poNumber ? ` · PO ${order.poNumber}` : ""}
              </p>
            ) : null}
            {order.buyerNotes ? <p className="mt-1 text-sm text-msr-muted">Notes: {order.buyerNotes}</p> : null}
            {order.etaFrom ? <p className="mt-1 text-sm text-msr-muted">ETA {formatEta(order.etaFrom, order.etaTo)}</p> : null}
            {order._id && INVOICEABLE.includes(order.status) ? (
              <Link to={`/invoice/${order._id}`} className="mt-2 inline-block text-sm font-semibold text-msr-primary underline">
                View GST invoice{order.invoiceNumber ? ` (${order.invoiceNumber})` : ""}
              </Link>
            ) : order.status === "pending" ? (
              <p className="mt-2 text-[12px] text-msr-subtle">Your GST invoice is issued once the seller confirms the order.</p>
            ) : null}
            {order._id && !placed.length ? (
              <ReturnPanel
                order={order}
                onUpdated={async () => {
                  const fresh = await api.getOrder(order._id);
                  setOrders((prev) => prev.map((o) => (o._id === order._id ? fresh : o)));
                }}
              />
            ) : null}
          </article>
        ))}

        {addr ? (
          <div className="rounded-2xl border border-msr-line bg-white p-6 text-sm shadow-card">
            <h2 className="font-bold text-msr-ink">Delivering to</h2>
            <p className="mt-2 leading-6 text-msr-muted">
              {addr.contactName}
              <br />
              {addr.addressLine1}
              {addr.addressLine2 ? `, ${addr.addressLine2}` : ""}
              <br />
              {addr.city}, {addr.state} {addr.postalCode}
            </p>
          </div>
        ) : null}

        <div className="flex flex-wrap justify-center gap-3">
          {primary?._id ? (
            <Button
              variant="gold"
              disabled={busyId === primary._id}
              onClick={async () => {
                setBusyId(primary._id);
                setError("");
                try {
                  await api.reorder(primary._id);
                  navigate("/cart");
                } catch (err) {
                  setError(err.message || "Could not add items again.");
                } finally {
                  setBusyId("");
                }
              }}
            >
              <RotateCcw className="h-4 w-4" />
              {busyId === primary._id ? "Adding…" : "Buy again"}
            </Button>
          ) : null}
          <Link to="/account/orders" className={buttonClass()}>
            View orders
          </Link>
          <Link to="/" className={buttonClass({ variant: "secondary" })}>
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

const RETURN_REASONS = [
  "Damaged or defective item",
  "Wrong item delivered",
  "Item missing from the order",
  "Quality not as expected",
  "Expired or near expiry",
  "Other",
];

function ReturnPanel({ order, onUpdated }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(RETURN_REASONS[0]);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const request = order.returnRequest || {};

  if (request.status === "requested") {
    return (
      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
        Return requested ({request.reason}). The store will review it and refund once approved.
      </p>
    );
  }
  if (request.status === "approved") {
    return <p className="mt-3 rounded-lg bg-msr-success-soft px-3 py-2 text-sm text-msr-success-ink">Return approved and refunded.</p>;
  }
  if (request.status === "rejected") {
    return (
      <p className="mt-3 rounded-lg bg-msr-danger-soft px-3 py-2 text-sm text-msr-danger">
        Return rejected by the store{request.decisionNote ? `: ${request.decisionNote}` : "."}
      </p>
    );
  }
  if (!order.returnUntil || new Date(order.returnUntil).getTime() < Date.now()) return null;

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.requestReturn(order._id, { reason, note });
      setOpen(false);
      await onUpdated();
    } catch (err) {
      setError(err.message || "Could not request a return");
    } finally {
      setBusy(false);
    }
  }

  const easyItems = (order.items || []).filter((item) => item.easyReturn);
  return (
    <div className="mt-4 rounded-xl border border-msr-line p-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-msr-muted">
          Return available until <span className="font-semibold text-msr-ink">{formatDate(order.returnUntil)}</span>
          {easyItems.length < (order.items || []).length ? ` · only “Easy return” items (${easyItems.length})` : ""}
        </p>
        {!open ? (
          <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
            Request return
          </Button>
        ) : null}
      </div>
      {open ? (
        <form className="mt-3 grid gap-2" onSubmit={submit}>
          <label className="text-[12px] font-semibold text-msr-muted">
            Reason
            <select value={reason} onChange={(e) => setReason(e.target.value)} className="mt-1 w-full rounded-lg border border-msr-line px-3 py-2 text-sm text-msr-ink">
              {RETURN_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            maxLength={1000}
            placeholder="Anything the store should know (optional)"
            className="rounded-lg border border-msr-line px-3 py-2 text-sm"
          />
          {error ? <p className="text-[12px] text-msr-danger">{error}</p> : null}
          <div className="flex gap-2">
            <Button size="sm" type="submit" disabled={busy}>
              {busy ? "Sending…" : "Send return request"}
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
              Cancel
            </Button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

function FulfillmentGroup({ title, icon: Icon, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-msr-primary">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <ul className="mt-2 space-y-3">
        {items.map((item) => (
          <li key={`${item.sku}-${item.variantId || item.pack}-${item.bulk ? "bulk" : "unit"}-${item.qty}`} className="flex justify-between gap-3 text-sm">
            <span>
              <span className="font-medium text-msr-ink">{item.name}</span>
              <span className="block text-msr-subtle">
                {item.attributes?.packSize || item.attributes?.size || item.sku} × {item.qty} @ {inr2(item.unitPrice)}
                {item.easyReturn ? " · Easy return" : ""}
              </span>
            </span>
            <span className="font-semibold text-msr-ink">{inr2(item.lineSubtotal ?? item.unitPrice * item.qty)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
