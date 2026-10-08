import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BarChart3, Boxes, ChevronRight, MessageSquare, PackageCheck, ShoppingBag, TrendingUp, Undo2 } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useAuth, useCan } from "../../shared/context/AuthContext.jsx";
import { ORDER_QUEUES, useFailedRefundCount, useOrderQueueCounts } from "../../shared/components/orderQueues.js";
import { cn } from "../../shared/ui/cn.js";
import { AreaChart, Button, Card, CardHeader, CardBody, EmptyState, ErrorState, Money, PageHeader, RelativeTime, Skeleton, SkeletonText, StatCard, StatusPill } from "../../shared/ui/index.js";
import { ChartSkeleton, PanelState, ScopeTag, Segmented, changeProps, countAxis, dayShort, moneyAxis, pctProps } from "./insights/shared.jsx";

const RETURN_QUEUES = new Set(["return_requested", "return_approved", "returned"]);
const queueHref = (q) => (RETURN_QUEUES.has(q.status) ? "/tenant/returns" : `/tenant/orders?status=${q.status}`);

function greeting() {
  const h = Number(new Intl.DateTimeFormat("en-IN", { timeZone: "Asia/Kolkata", hour: "numeric", hour12: false }).format(new Date()));
  return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function Dashboard() {
  const { user } = useAuth();
  const can = useCan();
  const canReports = can("reports.view");
  const canOrders = can("orders.view");
  const canInventory = can("inventory.view");
  const canChat = can("chat.view");

  const overview = useQuery({ queryKey: keys.reports.custom("overview"), queryFn: () => api.reportsOverview(), enabled: canReports });

  // `user.tenant` is the store name (string); older sessions may carry an object.
  const storeName = typeof user?.tenant === "string" ? user.tenant : user?.tenant?.name;
  const firstName = user?.name?.split(" ")[0];
  const title = storeName ? `${greeting()}, ${storeName}` : `${greeting()}${firstName ? `, ${firstName}` : ""}`;
  const nothing = !canReports && !canOrders && !canInventory && !canChat;

  return (
    <>
      <PageHeader
        title={title}
        documentTitle="Dashboard"
        description={canReports ? "Last 30 days · IST (Asia/Kolkata)" : "Your store at a glance"}
        primaryAction={
          canReports ? (
            <Button to="/tenant/reports" leftIcon={BarChart3}>
              View reports
            </Button>
          ) : null
        }
      />

      {nothing ? (
        <Card>
          <EmptyState
            icon={TrendingUp}
            title="Nothing to show yet"
            description="Your role doesn't include access to orders, reports, inventory or support. Ask a store admin if you need more access."
          />
        </Card>
      ) : (
        <div className="grid gap-6">
          {canReports ? <KpiRow overview={overview} /> : null}

          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
              {canReports ? <SalesCard /> : null}
              {canOrders ? <RecentOrders /> : null}
            </div>
            <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
              {canOrders || (canReports && (canInventory || canChat)) ? (
                <NeedsAction overview={overview} canOrders={canOrders} canReports={canReports} canInventory={canInventory} canChat={canChat} />
              ) : null}
              {canReports ? <TopSkus overview={overview} /> : null}
              {canReports && canInventory ? <LowStock overview={overview} /> : null}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ KPIs */

function KpiRow({ overview }) {
  const o = overview.data;
  const p = o?.period;
  const prev = o?.previous;
  const ch = o?.changes || {};
  const loading = overview.isPending;
  const label = `vs previous ${p?.days || 30} days`;
  if (overview.error) {
    return (
      <Card>
        <ErrorState compact title="Couldn’t load your key numbers" error={overview.error} onRetry={() => overview.refetch()} />
      </Card>
    );
  }
  return (
    <section aria-label="Key metrics, last 30 days" className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-6">
      <StatCard label="Net sales" loading={loading} value={<Money value={p?.netSales} whole />} {...pctProps(p?.netSales, prev?.netSales, label)} to="/tenant/reports" />
      <StatCard label="Orders" loading={loading} value={p?.orders != null ? Number(p.orders).toLocaleString("en-IN") : null} {...changeProps(ch.orders, label)} to="/tenant/orders" />
      <StatCard label="GMV" loading={loading} value={<Money value={p?.gmv} whole />} {...changeProps(ch.gmv, label)} />
      <StatCard label="Avg. order value" loading={loading} value={<Money value={p?.aov} whole />} {...changeProps(ch.aov, label)} />
      <StatCard label="Fees collected" loading={loading} value={<Money value={p?.fees?.total} whole />} {...pctProps(p?.fees?.total, prev?.fees?.total, label)} />
      <StatCard label="Customers" loading={loading} value={o?.customers != null ? Number(o.customers).toLocaleString("en-IN") : null} hint="Distinct buyers · all time" to="/tenant/customers" />
    </section>
  );
}

/* ------------------------------------------------------------------ Sales chart */

function SalesCard() {
  const [metric, setMetric] = useState("netSales");
  const sales = useQuery({ queryKey: keys.reports.custom("sales", 30), queryFn: () => api.reportsSales(30) });
  const rows = Array.isArray(sales.data) ? sales.data : [];
  const empty = rows.length > 0 && rows.every((r) => !Number(r.orders));
  const series = metric === "netSales" ? [{ key: "netSales", label: "Net sales" }] : [{ key: "orders", label: "Orders", color: "var(--chart-2)" }];
  return (
    <Card>
      <CardHeader
        title="Sales"
        description="Per IST day, last 30 days. Net sales exclude fees, cancelled/refunded and unpaid online orders."
        actions={
          <Segmented
            label="Chart metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "netSales", label: "Net sales" },
              { value: "orders", label: "Orders" },
            ]}
          />
        }
      />
      <CardBody>
        <PanelState query={sales} skeleton={<ChartSkeleton />}>
          {empty ? (
            <EmptyState compact icon={TrendingUp} title="No sales in the last 30 days" description="Revenue appears here once orders are placed." action={<Button size="sm" to="/tenant/products">Review your catalog</Button>} />
          ) : (
            <AreaChart
              data={rows}
              x="_id"
              series={series}
              format={metric === "netSales" ? moneyAxis : countAxis}
              formatX={dayShort}
              title={metric === "netSales" ? "Net sales per day, last 30 days" : "Orders per day, last 30 days"}
              height={240}
            />
          )}
        </PanelState>
      </CardBody>
    </Card>
  );
}

/* ------------------------------------------------------------------ Needs action */

function CountBadge({ value, loading, tone = "warning" }) {
  if (loading) return <Skeleton className="h-5 w-8 rounded-full" />;
  if (value == null) return <span className="text-ui-sm text-fg-subtle">—</span>;
  const n = Number(value);
  return (
    <span
      className={cn(
        "min-w-7 rounded-full px-2 py-0.5 text-center text-ui-xs font-semibold tabular-nums",
        n === 0 ? "bg-surface-sunken text-fg-subtle" : tone === "danger" ? "bg-danger-soft text-danger-fg" : "bg-warning-soft text-warning-fg"
      )}
    >
      {n.toLocaleString("en-IN")}
    </span>
  );
}

function ActionRow({ to, icon: Icon, label, description, count, loading, tone }) {
  const zero = !loading && Number(count) === 0;
  return (
    <li>
      <Link to={to} className="group flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 sm:px-5">
        {Icon ? <Icon aria-hidden className={cn("size-4 shrink-0", zero ? "text-fg-subtle" : "text-fg-muted")} /> : null}
        <span className="min-w-0 flex-1">
          <span className={cn("block truncate text-ui-sm font-medium", zero ? "text-fg-muted" : "text-fg")}>{label}</span>
          {description ? <span className="block truncate text-ui-xs text-fg-subtle">{description}</span> : null}
        </span>
        <CountBadge value={count} loading={loading} tone={tone} />
        <ChevronRight aria-hidden className="size-4 shrink-0 text-fg-subtle group-hover:text-fg-muted" />
      </Link>
    </li>
  );
}

function NeedsAction({ overview, canOrders, canReports, canInventory, canChat }) {
  const queues = useOrderQueueCounts({ enabled: canOrders, scope: "tenant-dashboard" });
  const can = useCan();
  const canRefunds = can(["orders.refund", "orders.update"]);
  const failed = useFailedRefundCount({ enabled: canRefunds, scope: "tenant-dashboard" });
  const ov = overview.data;
  const ovLoading = overview.isPending;
  return (
    <Card>
      <CardHeader title="Needs action" description="Live counts from your order queues." />
      {queues.error ? (
        <div className="border-b border-border px-4 py-2 text-ui-xs text-danger-fg sm:px-5" role="alert">
          Some queue counts failed to load.{" "}
          <button type="button" className="font-medium underline" onClick={queues.refetch}>
            Retry
          </button>
        </div>
      ) : null}
      <ul className="divide-y divide-border py-1">
        {canOrders
          ? ORDER_QUEUES.map((q) => (
              <ActionRow
                key={q.id}
                to={queueHref(q)}
                icon={RETURN_QUEUES.has(q.status) ? Undo2 : q.status === "pending" ? ShoppingBag : PackageCheck}
                label={q.label}
                description={q.description}
                count={queues.counts[q.id]}
                loading={queues.loading && queues.counts[q.id] == null}
              />
            ))
          : null}
        {canRefunds ? (
          failed.error ? (
            <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-ui-sm sm:px-5">
              <span className="text-fg-muted">Failed refunds couldn’t be checked.</span>
              <Button size="xs" variant="ghost" onClick={() => failed.refetch()}>
                Retry
              </Button>
            </li>
          ) : (
            <ActionRow
              to="/tenant/returns?tab=failed"
              icon={AlertTriangle}
              label="Failed refunds"
              description="Refunds the payment provider rejected — retry them"
              count={failed.count}
              loading={failed.isPending}
              tone="danger"
            />
          )
        ) : null}
        {canReports && canInventory ? (
          <ActionRow to="/tenant/inventory?lowStock=true" icon={Boxes} label="Low stock" description="At or below the low-stock threshold" count={ov?.lowStockCount} loading={ovLoading} />
        ) : null}
        {canReports && canChat ? (
          <ActionRow to="/tenant/support" icon={MessageSquare} label="Open conversations" description="Unassigned, assigned or waiting on customer" count={ov?.openChats} loading={ovLoading} />
        ) : null}
      </ul>
    </Card>
  );
}

/* ------------------------------------------------------------------ Recent orders */

function RecentOrders() {
  const q = useQuery({ queryKey: keys.orders.list({ limit: 8 }), queryFn: () => api.listOrders({ limit: 8 }) });
  const rows = q.data?.data || [];
  return (
    <Card>
      <CardHeader
        title="Recent orders"
        actions={
          <Button size="sm" variant="ghost" to="/tenant/orders" rightIcon={ChevronRight}>
            All orders
          </Button>
        }
      />
      <PanelState query={q} skeleton={<SkeletonText lines={6} className="p-4 sm:p-5" />}>
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((o) => (
              <li key={o._id}>
                <Link to={`/tenant/orders/${o._id}`} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-4 py-3 transition-colors hover:bg-surface-2 focus-visible:bg-surface-2 sm:grid-cols-[8rem_minmax(0,1fr)_auto_7rem] sm:px-5">
                  <span className="font-medium text-fg">{o.orderNumber}</span>
                  <span className="order-3 truncate text-ui-sm text-fg-muted sm:order-none">
                    {o.buyerSnapshot?.name || o.buyerId?.name || "—"} · <RelativeTime value={o.createdAt} />
                  </span>
                  <span className="order-4 justify-self-end sm:order-none sm:justify-self-auto">
                    <StatusPill status={o.status} />
                  </span>
                  <Money value={o.total} className="justify-self-end text-ui-sm font-medium text-fg" />
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={ShoppingBag} title="No orders yet" description="New orders show up here as buyers check out." action={<Button size="sm" to="/tenant/products">Manage products</Button>} />
        )}
      </PanelState>
    </Card>
  );
}

/* ------------------------------------------------------------------ Top SKUs & low stock */

function TopSkus({ overview }) {
  const rows = overview.data?.topSkus || [];
  return (
    <Card>
      <CardHeader title="Top products" description="By revenue (line totals)" actions={<ScopeTag>All time</ScopeTag>} />
      <PanelState query={overview} skeleton={<SkeletonText lines={5} className="p-4 sm:p-5" />}>
        {rows.length ? (
          <ol className="divide-y divide-border">
            {rows.slice(0, 5).map((r, i) => (
              <li key={r._id || i} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="w-4 text-ui-xs tabular-nums text-fg-subtle">{i + 1}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui-sm font-medium text-fg">{r.name || r._id}</span>
                  <span className="block truncate font-mono text-ui-2xs text-fg-subtle">
                    {r._id} · {Number(r.qty || 0).toLocaleString("en-IN")} sold
                  </span>
                </span>
                <Money value={r.revenue} whole className="text-ui-sm text-fg" />
              </li>
            ))}
          </ol>
        ) : (
          <EmptyState compact icon={TrendingUp} title="No sales yet" description="Your best sellers will be ranked here." />
        )}
      </PanelState>
    </Card>
  );
}

function LowStock({ overview }) {
  const rows = overview.data?.lowStock || [];
  const total = overview.data?.lowStockCount;
  return (
    <Card>
      <CardHeader
        title="Low stock"
        description={total > rows.length ? `Showing ${rows.length} of ${total}` : undefined}
        actions={
          <Button size="sm" variant="ghost" to="/tenant/inventory?lowStock=true" rightIcon={ChevronRight}>
            Inventory
          </Button>
        }
      />
      <PanelState query={overview} skeleton={<SkeletonText lines={4} className="p-4 sm:p-5" />}>
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.slice(0, 6).map((r) => (
              <li key={r._id} className="flex items-center gap-3 px-4 py-2.5 sm:px-5">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-ui-sm font-medium text-fg">{r.variantId?.productId?.name || "Unnamed product"}</span>
                  <span className="block truncate font-mono text-ui-2xs text-fg-subtle">{r.variantId?.sku || "—"}</span>
                </span>
                <span className={cn("text-right text-ui-xs tabular-nums", Number(r.available) <= 0 ? "text-danger-fg" : "text-warning-fg")}>
                  <span className="block text-ui-sm font-semibold">{Number(r.available ?? 0).toLocaleString("en-IN")}</span>
                  <span className="text-fg-subtle">min {r.lowStockThreshold ?? "—"}</span>
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={Boxes} title="All stocked up" description="No items are at or below their low-stock threshold." />
        )}
      </PanelState>
    </Card>
  );
}

