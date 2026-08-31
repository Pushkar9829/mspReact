import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Package } from "lucide-react";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { api } from "../../shared/api.js";
import { formatDate, inr } from "../../shared/lib/format.js";

export default function Orders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(Boolean(user?.token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.token) return undefined;
    let cancelled = false;
    setLoading(true);
    api
      .listOrders()
      .then((res) => {
        if (!cancelled) setOrders(res.data || res || []);
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
  }, [user?.token]);

  if (!user) {
    return (
      <div className="msr-gutter py-16 text-center">
        <h1 className="text-2xl font-extrabold">Your orders</h1>
        <p className="mt-2 text-msr-muted">Sign in to track deliveries and reorders.</p>
        <Link to="/login" state={{ from: "/orders" }} className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="msr-gutter py-8 md:py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Your orders</h1>
      <p className="mt-1 text-sm text-[#8b8ea3]">Track deliveries and reorder staples in a few taps.</p>
      {error ? <p className="mt-4 text-sm text-msr-danger">{error}</p> : null}

      {loading ? <p className="mt-8 text-sm text-[#8b8ea3]">Loading orders…</p> : null}

      {!loading && !orders.length ? (
        <div className="mt-8 rounded-2xl border border-[#eceef4] bg-white px-6 py-12 text-center">
          <Package className="mx-auto h-12 w-12 text-[#cfd3e2]" />
          <p className="mt-4 font-semibold text-[#1a1c3d]">No orders yet</p>
          <p className="mt-1 text-sm text-msr-muted">When you place an order, it will show up here.</p>
          <Link to="/category/all" className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
            Start shopping
          </Link>
        </div>
      ) : null}

      <div className="mt-6 grid gap-4">
        {orders.map((order) => (
          <Link
            key={order._id}
            to={`/order/${order._id}`}
            className="rounded-2xl border border-[#eceef4] bg-white p-5 transition hover:border-[#cfd3ff]"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-extrabold text-[#1a1c3d]">{order.orderNumber}</p>
                <p className="mt-1 text-sm text-[#8b8ea3]">
                  {formatDate(order.createdAt)} · {order.items?.length || 0} item{(order.items?.length || 0) === 1 ? "" : "s"}
                </p>
              </div>
              <div className="text-right">
                <p className="font-extrabold text-[#1a1c3d]">{inr(order.total)}</p>
                <span className="mt-1 inline-block rounded-full bg-[#eef0ff] px-2.5 py-0.5 text-[11px] font-bold capitalize text-[#0b1460]">
                  {order.status}
                </span>
              </div>
            </div>
            {order.items?.[0] ? (
              <p className="mt-3 truncate text-sm text-[#6b7280]">
                {order.items[0].name}
                {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}
              </p>
            ) : null}
          </Link>
        ))}
      </div>
    </div>
  );
}
