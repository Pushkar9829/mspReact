import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { CheckCircle2 } from "lucide-react";
import { api } from "../../shared/api.js";
import { formatDate, formatEta, inr } from "../../shared/lib/format.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";

export default function OrderConfirmation() {
  const { id } = useParams();
  const location = useLocation();
  const { user } = useAuth();
  const [orders, setOrders] = useState(location.state?.orders || []);
  const [error, setError] = useState("");

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
              <ul className="mt-5 space-y-3 border-t border-[#eceef4] pt-4">
                {order.items.map((item) => (
                  <li key={item.sku + item.qty} className="flex justify-between gap-3 text-sm">
                    <span>
                      <span className="font-medium text-[#1a1c3d]">{item.name}</span>
                      <span className="block text-[#8b8ea3]">
                        {item.attributes?.packSize || item.attributes?.size || item.sku} × {item.qty}
                      </span>
                    </span>
                    <span className="font-semibold">{inr(item.lineTotal)}</span>
                  </li>
                ))}
              </ul>
            ) : null}

            <div className="mt-4 flex justify-between border-t border-[#eceef4] pt-4 text-base font-extrabold">
              <span>Total</span>
              <span>{inr(order.total)}</span>
            </div>
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
          <Link to="/orders" className="rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
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
