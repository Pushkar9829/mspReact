/**
 * /account/orders — server-paginated order list. Filters live in the URL (?status=…&period=…&q=…&page=).
 * Row actions come only from each row's `allowedActions` (sent with GET /orders: no per-row fetch).
 * The card is not one big link: the order number and "Details" link to the order, the action
 * buttons act in place.
 */
import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { CalendarDays, ChevronLeft, ChevronRight, FileText, Package, Search, ShoppingBag, Store, X } from "lucide-react";
import { Button, EmptyState, Input, Notice, Select, ShopPageHeader, Skeleton } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { Money } from "../components/ui/Price.jsx";
import { useMyOrders } from "../hooks/index.js";
import { OrderActions } from "../components/buying/OrderActions.jsx";
import { ORDER_STATUS_FILTERS, OrderStatusPill, OrderThumbs, PaymentPill, orderEta, orderId, orderUnits, sellerName } from "../components/buying/orderUi.jsx";
import { displayName } from "../lib/text.js";
import { formatDate, istDaysAgo } from "../../shared/lib/format.js";

const PERIODS = [
  { value: "", label: "Any time" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 3 months" },
  { value: "365", label: "Last 12 months" },
];

function OrderCard({ order }) {
  const id = orderId(order);
  const items = order.items || [];
  const eta = orderEta(order);
  const units = orderUnits(order);
  const names = items.map((i) => displayName(i.name)).filter(Boolean);
  return (
    <li className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card transition-shadow hover:shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
      <div className="grid gap-3 p-4 sm:grid-cols-[auto_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:p-5">
        <OrderThumbs items={items} className="hidden sm:flex" />
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <h2 className="font-display text-shop-md font-bold text-shop-ink">
              <Link to={`/account/orders/${id}`} className="rounded hover:text-shop-primary-ink hover:underline">
                Order {order.orderNumber}
              </Link>
            </h2>
            <OrderStatusPill status={order.status} />
            <PaymentPill order={order} />
          </div>
          <p className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-shop-xs text-shop-muted">
            <span className="inline-flex items-center gap-1">
              <Store className="size-3.5" aria-hidden /> {sellerName(order)}
            </span>
            <span className="inline-flex items-center gap-1">
              <CalendarDays className="size-3.5" aria-hidden /> Placed {formatDate(order.createdAt)}
            </span>
            {order.poNumber ? (
              <span className="inline-flex items-center gap-1">
                <FileText className="size-3.5" aria-hidden /> PO <span className="font-mono">{order.poNumber}</span>
              </span>
            ) : null}
          </p>
          <div className="mt-3 flex items-center gap-3 sm:mt-2">
            <OrderThumbs items={items} className="sm:hidden" tileClassName="size-12" />
            <p className="min-w-0 text-shop-sm text-shop-text">
              <span className="line-clamp-1">{names.join(", ") || "No items"}</span>
              <span className="block text-shop-xs text-shop-muted">
                {items.length} item{items.length === 1 ? "" : "s"}
                {units ? ` · ${units} unit${units === 1 ? "" : "s"}` : ""}
                {eta ? <span className="font-medium text-shop-primary-ink"> · {eta}</span> : null}
              </span>
            </p>
          </div>
        </div>
        <div className="flex items-baseline justify-between gap-2 border-t border-shop-line pt-3 sm:block sm:border-0 sm:pt-0 sm:text-right">
          <p className="text-shop-xs text-shop-muted">Order total</p>
          <p className="font-display text-shop-lg font-bold tabular-nums text-shop-ink">
            <Money value={order.total ?? order.totals?.grandTotal} />
          </p>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 border-t border-shop-line bg-shop-page/60 px-4 py-3 sm:px-5">
        <OrderActions order={order} compact />
        <Button to={`/account/orders/${id}`} size="md" variant="link" className="ml-auto" rightIcon={ChevronRight} aria-label={`Details of order ${order.orderNumber}`}>
          Details
        </Button>
      </div>
    </li>
  );
}

function OrderCardSkeleton() {
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card" aria-hidden>
      <div className="flex gap-4 p-4 sm:p-5">
        <Skeleton className="hidden size-14 rounded-xl sm:block" />
        <div className="grid flex-1 gap-2">
          <Skeleton className="h-5 w-48 max-w-full" />
          <Skeleton className="h-3.5 w-64 max-w-full" />
          <Skeleton className="h-3.5 w-40 max-w-full" />
        </div>
        <Skeleton className="hidden h-8 w-24 sm:block" />
      </div>
      <div className="flex gap-2 border-t border-shop-line bg-shop-page/60 px-4 py-3 sm:px-5">
        <Skeleton className="h-11 w-28 rounded-full" />
        <Skeleton className="h-11 w-28 rounded-full" />
      </div>
    </div>
  );
}

export default function Orders() {
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const period = params.get("period") || "";
  const q = params.get("q") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);

  const query = { page, limit: 10, ...(status ? { status } : {}), ...(period ? { from: istDaysAgo(Number(period)) } : {}), ...(q ? { q } : {}) };
  const list = useMyOrders(query);
  const rows = list.data?.data || [];
  const meta = list.data?.meta || {};
  const filtered = Boolean(status || period || q);
  const statusLabel = ORDER_STATUS_FILTERS.find((f) => f.value === status)?.label;

  const update = (patch) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => (v ? p.set(k, v) : p.delete(k)));
        if (!("page" in patch)) p.delete("page");
        return p;
      },
      { preventScrollReset: true }
    );
  const clearAll = () => setParams({}, { preventScrollReset: true });

  return (
    <div className="grid gap-5">
      <ShopPageHeader
        title="Your orders"
        description="Track deliveries, download GST invoices, request returns and buy again."
        actions={
          <Button to="/category/all" variant="secondary" leftIcon={ShoppingBag}>
            Shop products
          </Button>
        }
      />

      <div className="grid gap-3 rounded-[1.25rem] border border-shop-line bg-shop-card p-3 sm:p-4">
        <div className="no-scrollbar -mx-3 flex gap-2 overflow-x-auto px-3 sm:mx-0 sm:flex-wrap sm:px-0" role="group" aria-label="Filter by status">
          {ORDER_STATUS_FILTERS.map((f) => {
            const active = status === f.value;
            return (
              <button
                key={f.label}
                type="button"
                aria-pressed={active}
                onClick={() => update({ status: f.value })}
                className={cn(
                  "min-h-11 shrink-0 rounded-full border px-4 text-shop-sm font-semibold transition-colors",
                  active ? "border-shop-navy bg-shop-navy text-white" : "border-shop-line bg-shop-card text-shop-text hover:border-shop-line-strong hover:bg-shop-page"
                )}
              >
                {f.label}
              </button>
            );
          })}
        </div>
        <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_200px]">
          <form
            role="search"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: term.trim() });
            }}
            className="flex gap-2"
          >
            <label htmlFor="orders-q" className="sr-only">
              Search orders
            </label>
            <Input
              id="orders-q"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Order, PO or tracking no."
              prefix={<Search className="size-4" aria-hidden />}
              maxLength={100}
            />
            <Button type="submit" variant="secondary">
              Search
            </Button>
          </form>
          <div>
            <label htmlFor="orders-period" className="sr-only">
              Order date
            </label>
            <Select id="orders-period" value={period} onChange={(e) => update({ period: e.target.value })} options={PERIODS} />
          </div>
        </div>
        {filtered ? (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-shop-line pt-3 text-shop-sm text-shop-muted">
            <span aria-live="polite">
              {list.isPending ? "Searching…" : `${meta.total ?? rows.length} order${(meta.total ?? rows.length) === 1 ? "" : "s"}`}
              {statusLabel && status ? ` · ${statusLabel}` : ""}
              {q ? ` · “${q}”` : ""}
            </span>
            <Button variant="ghost" size="sm" leftIcon={X} className="pointer-coarse:min-h-11" onClick={clearAll}>
              Clear filters
            </Button>
          </div>
        ) : null}
      </div>

      {list.error ? (
        <Notice tone="danger" action={<Button variant="secondary" onClick={() => list.refetch()}>Retry</Button>}>
          {list.error.message}
        </Notice>
      ) : null}

      {list.isPending ? (
        <div className="grid gap-3" role="status" aria-label="Loading orders">
          <OrderCardSkeleton />
          <OrderCardSkeleton />
          <OrderCardSkeleton />
        </div>
      ) : rows.length ? (
        <ul className={cn("grid gap-3", list.isPlaceholderData && "opacity-60 transition-opacity")} aria-busy={list.isFetching || undefined} aria-label="Orders">
          {rows.map((o) => (
            <OrderCard key={orderId(o)} order={o} />
          ))}
        </ul>
      ) : list.error ? null : filtered ? (
        <EmptyState
          compact
          className="rounded-[1.25rem]"
          icon={Search}
          title="No orders match these filters"
          description="Try another status or date range, or search by order, PO or tracking number."
          action={
            <Button variant="secondary" leftIcon={X} onClick={clearAll}>
              Clear filters
            </Button>
          }
        />
      ) : (
        <EmptyState
          className="rounded-[1.25rem] border-solid border-shop-line"
          icon={Package}
          title="No orders yet"
          description="When you place an order, you can track it, download GST invoices and buy again from here."
          action={
            <>
              <Button to="/category/all">Start shopping</Button>
              <Button to="/bulk" variant="secondary">
                Bulk buy
              </Button>
            </>
          }
        />
      )}

      {meta.pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-between gap-2">
          <Button variant="secondary" leftIcon={ChevronLeft} disabled={page <= 1} onClick={() => update({ page: String(page - 1) })}>
            Newer
          </Button>
          <span className="text-shop-sm text-shop-muted">
            Page {meta.page ?? page} of {meta.pages}
          </span>
          <Button variant="secondary" rightIcon={ChevronRight} disabled={page >= meta.pages} onClick={() => update({ page: String(page + 1) })}>
            Older
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
