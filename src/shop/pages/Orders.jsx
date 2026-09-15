import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronRight, Package, RotateCcw } from "lucide-react";
import { api } from "../../shared/api.js";
import { formatDate, formatEta, inr } from "../../shared/lib/format.js";
import { AccountEmpty, AccountHead } from "../components/accountUi.jsx";

const STATUS = {
  pending: "bg-amber-50 text-amber-800",
  confirmed: "bg-[#eef0ff] text-msr-navy",
  processing: "bg-[#eef0ff] text-msr-navy",
  ready_to_ship: "bg-[#fffaf0] text-[#8a6a12]",
  shipped: "bg-[#eef8e8] text-[#3d6b12]",
  out_for_delivery: "bg-[#eef8e8] text-[#3d6b12]",
  delivered: "bg-[#eef8e8] text-[#3d6b12]",
  cancelled: "bg-red-50 text-msr-danger",
  return_requested: "bg-amber-50 text-amber-800",
  refunded: "bg-[#f4f5f9] text-[#6b6f7e]",
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "open", label: "In progress" },
  { id: "shipped", label: "Shipped" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const OPEN = new Set(["pending", "confirmed", "processing", "ready_to_ship"]);
const SHIPPED = new Set(["shipped", "out_for_delivery"]);

function matchesFilter(status, filter) {
  if (filter === "all") return true;
  if (filter === "open") return OPEN.has(status);
  if (filter === "shipped") return SHIPPED.has(status);
  return status === filter;
}

export default function Orders() {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    let cancelled = false;
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
  }, []);

  const visible = useMemo(
    () => orders.filter((order) => matchesFilter(order.status, filter)),
    [orders, filter],
  );

  async function reorder(id, e) {
    e.preventDefault();
    e.stopPropagation();
    setBusyId(id);
    setError("");
    try {
      await api.reorder(id);
      navigate("/cart");
    } catch (err) {
      setError(err.message || "Could not reorder.");
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <AccountHead title="Orders" subtitle="Track deliveries and restock from past orders." />
      {error ? <p className="mt-4 text-sm text-msr-danger">{error}</p> : null}

      {!loading && orders.length ? (
        <div className="mt-5 flex gap-2 overflow-x-auto no-scrollbar">
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-bold transition ${
                filter === item.id
                  ? "bg-msr-navy text-white"
                  : "bg-white text-msr-navy ring-1 ring-[#ece6d4] hover:ring-[#ead9a0]"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      ) : null}

      {loading ? <p className="mt-8 text-sm text-[#8b8ea3]">Loading orders…</p> : null}

      {!loading && !orders.length ? (
        <AccountEmpty icon={Package} title="No orders yet" text="When you place an order, it will show up here.">
          <Link to="/category/all" className="inline-flex rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white">
            Start shopping
          </Link>
        </AccountEmpty>
      ) : null}

      {!loading && orders.length && !visible.length ? (
        <p className="mt-8 text-sm text-[#8b8ea3]">No orders in this status.</p>
      ) : null}

      <div className="mt-6 grid gap-3">
        {visible.map((order) => {
          const thumbs = (order.items || []).slice(0, 3);
          const extra = Math.max(0, (order.items?.length || 0) - thumbs.length);
          return (
            <Link
              key={order._id}
              to={`/order/${order._id}`}
              className="group rounded-2xl border border-[#ece6d4] bg-white p-5 shadow-[0_8px_24px_rgba(8,10,61,0.04)] transition hover:ring-1 hover:ring-[#ead9a0]"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-extrabold text-msr-navy">{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-[#8b8ea3]">
                    {formatDate(order.createdAt)} · {order.items?.length || 0} item
                    {(order.items?.length || 0) === 1 ? "" : "s"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-extrabold text-msr-navy">{inr(order.total)}</p>
                  <span
                    className={`mt-1 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize ${
                      STATUS[order.status] || "bg-[#eef0ff] text-msr-navy"
                    }`}
                  >
                    {String(order.status || "").replaceAll("_", " ")}
                  </span>
                </div>
              </div>

              {thumbs.length ? (
                <div className="mt-4 flex items-center gap-2">
                  {thumbs.map((item) => (
                    <img
                      key={`${item.sku}-${item.qty}`}
                      src={item.image || "/products/product.png"}
                      alt=""
                      className="h-12 w-12 rounded-xl bg-msr-bg object-contain p-1 ring-1 ring-[#ece6d4]"
                    />
                  ))}
                  {extra ? (
                    <span className="grid h-12 min-w-12 place-items-center rounded-xl bg-[#fffaf0] px-2 text-[12px] font-bold text-[#8a6a12]">
                      +{extra}
                    </span>
                  ) : null}
                  <p className="ml-1 min-w-0 flex-1 truncate text-sm text-[#6b7280]">
                    {order.items[0].name}
                    {order.items.length > 1 ? ` + ${order.items.length - 1} more` : ""}
                  </p>
                </div>
              ) : null}

              {order.etaFrom ? (
                <p className="mt-3 text-[12px] text-[#8b8ea3]">ETA {formatEta(order.etaFrom, order.etaTo)}</p>
              ) : null}

              <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={(e) => reorder(order._id, e)}
                  disabled={busyId === order._id}
                  className="inline-flex items-center gap-1.5 rounded-full border border-[#ece6d4] px-4 py-1.5 text-[12px] font-bold text-msr-navy disabled:opacity-60"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                  {busyId === order._id ? "Adding…" : "Reorder"}
                </button>
                <span className="inline-flex items-center text-[12px] font-bold text-msr-navy">
                  View details
                  <ChevronRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
