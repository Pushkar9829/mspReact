import { useEffect, useState } from "react";
import { Link, useLocation, useNavigate, useParams } from "react-router-dom";
import { CheckCircle2, RotateCcw, Store, Truck } from "lucide-react";
import { api } from "../../shared/api.js";
import { formatDate, formatEta, inr } from "../../shared/lib/format.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [orders, setOrders] = useState(location.state?.orders || []);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
    if (orders.length || !user?.token) return undefined;
    let cancelled = false;
    api
      .getOrder(id)
      .then((order) => {
        if (!cancelled) setOrders([order]);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      });
    return () => {
      cancelled = true;
    };
  }, [id, user?.token, orders.length]);

  const primary = orders[0];
  const addr = primary?.addressSnapshot;
  const payLabel = {
    upi: "UPI",
    card: "Card",
    netbanking: "Net banking",
    cod: "Cash on delivery",
    purchase_order: "Purchase order",
    credit_terms: "Credit terms",
  };

  return (
    <div className="msr-gutter py-10 md:py-14">
      <div className="mx-auto max-w-2xl text-center">
        <CheckCircle2 className="mx-auto h-14 w-14 text-msr-success" />
        <h1 className="mt-4 text-3xl font-extrabold tracking-tight text-[#1a1c3d]">Order placed</h1>
        <p className="mt-2 text-[#6b7280]">Thanks for shopping with MS₹. We’ll send updates as your order moves.</p>
      </div>

      {error && !primary ? <p className="mx-auto mt-6 max-w-2xl text-center text-sm text-msr-danger">{error}</p> : null}

      <div className="mx-auto mt-8 max-w-2xl space-y-4">
        {(orders.length ? orders : [{ orderNumber: id, total: 0, items: [] }]).map((order) => (
          <article key={order._id || order.orderNumber} className="rounded-2xl border border-[#eceef4] bg-white p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[12px] font-bold uppercase tracking-[0.14em] text-msr-accent">Order</p>
                <p className="mt-1 text-lg font-extrabold text-[#1a1c3d]">{order.orderNumber || id}</p>
                {order.createdAt ? <p className="mt-1 text-sm text-[#8b8ea3]">{formatDate(order.createdAt)}</p> : null}
              </div>
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-[12px] font-bold capitalize text-msr-success">
                {order.status || "pending"}
              </span>
            </div>

            {order.items?.length ? (
              <div className="mt-5 space-y-4 border-t border-[#eceef4] pt-4">
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

            <dl className="mt-4 space-y-2 border-t border-[#eceef4] pt-4 text-sm">
              {order.deliveryFee ? (
                <div className="flex justify-between text-[#6b7280]">
                  <dt>Delivery</dt>
                  <dd>{inr(order.deliveryFee)}</dd>
                </div>
              ) : null}
              {order.platformFee ? (
                <div className="flex justify-between text-[#6b7280]">
                  <dt>Platform fee</dt>
                  <dd>{inr(order.platformFee)}</dd>
                </div>
              ) : null}
              {order.partnerFee || order.deliveryPartner?.name ? (
                <div className="flex justify-between text-[#6b7280]">
                  <dt>{order.deliveryPartner?.name ? `${order.deliveryPartner.name} charge` : "Partner charge"}</dt>
                  <dd>{order.partnerFee ? inr(order.partnerFee) : "FREE"}</dd>
                </div>
              ) : null}
              <div className="flex justify-between text-base font-extrabold text-[#1a1c3d]">
                <dt>Total</dt>
                <dd>{inr(order.total)}</dd>
              </div>
            </dl>
            {order.paymentMethod ? (
              <p className="mt-2 text-sm text-[#6b7280]">Paid via {payLabel[order.paymentMethod] || order.paymentMethod}</p>
            ) : null}
            {order.etaFrom ? (
              <p className="mt-1 text-sm text-[#6b7280]">ETA {formatEta(order.etaFrom, order.etaTo)}</p>
            ) : null}
          </article>
        ))}

        {addr ? (
          <div className="rounded-2xl border border-[#eceef4] bg-white p-6 text-sm">
            <h2 className="font-bold text-[#1a1c3d]">Delivering to</h2>
            <p className="mt-2 leading-6 text-[#6b7280]">
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
            <button
              type="button"
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
              className="inline-flex items-center gap-2 rounded-xl bg-msr-gold px-5 py-3 text-sm font-semibold text-[#0b1460] disabled:opacity-60"
            >
              <RotateCcw className="h-4 w-4" />
              {busyId === primary._id ? "Adding…" : "Buy again"}
            </button>
          ) : null}
          <Link to="/account/orders" className="rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
            View orders
          </Link>
          <Link to="/" className="rounded-xl border border-[#eceef4] px-5 py-3 text-sm font-semibold">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function FulfillmentGroup({ title, icon: Icon, items }) {
  if (!items?.length) return null;
  return (
    <div>
      <p className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-[0.12em] text-msr-accent">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <ul className="mt-2 space-y-3">
        {items.map((item) => (
          <li key={`${item.sku}-${item.variantId || item.pack}-${item.qty}`} className="flex justify-between gap-3 text-sm">
            <span>
              <span className="font-medium text-[#1a1c3d]">{item.name}</span>
              <span className="block text-[#8b8ea3]">
                {item.attributes?.packSize || item.attributes?.size || item.sku} × {item.qty}
                {item.easyReturn ? " · Easy return" : ""}
              </span>
            </span>
            <span className="font-semibold">{inr(item.lineTotal)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
