import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQueries, useQuery } from "@tanstack/react-query";
import { AlertTriangle, BadgeCheck, Building2, ChevronRight, MessageSquareWarning, PackageX, Plus, Undo2, Wallet } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { formatDate, inr, parseIstDate } from "../../shared/lib/format.js";
import {
  AreaChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DonutChart,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  Skeleton,
  StatCard,
} from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import { useFailedRefundCount } from "../../shared/components/orderQueues.js";
import { orderColumns, orderHref } from "./lib/orderColumns.jsx";

const P = api.withTenant(null); // platform scope: the overview always covers every store
const HEALTH = [
  { status: "active", label: "Active", color: "var(--success)" },
  { status: "trial", label: "Trial", color: "var(--chart-2)" },
  { status: "pending", label: "Pending", color: "var(--warning)" },
  { status: "suspended", label: "Suspended", color: "var(--danger)" },
  { status: "archived", label: "Archived", color: "var(--fg-subtle)" },
];

/** % change; null when there is nothing to compare with (previous period was 0), like the API's `changes`. */
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
/** StatCard props for a change value: a number shows the arrow, null shows "—". */
function deltaProps(change, label = "vs previous 30 days") {
  return typeof change === "number" ? { delta: change, deltaLabel: label } : { hint: `— ${label}` };
}
const r2 = (n) => Math.round(n * 100) / 100;
/** Sum daily /reports/sales rows into { orders, gmv, netSales, fees, aov }. */
function summarize(rows) {
  const s = rows.reduce(
    (a, d) => ({ orders: a.orders + (d.orders || 0), gmv: r2(a.gmv + (d.gmv || 0)), netSales: r2(a.netSales + (d.netSales || 0)), fees: r2(a.fees + (d.fees || 0)) }),
    { orders: 0, gmv: 0, netSales: 0, fees: 0 }
  );
  return { ...s, aov: s.orders ? r2(s.gmv / s.orders) : 0 };
}
const dayLabel = (day) => formatDate(parseIstDate(day)).replace(/ \d{4}$/, "");

function count(queryKey, queryFn, enabled = true) {
  return { queryKey, queryFn, select: (r) => r?.meta?.total ?? 0, enabled, staleTime: 30_000 };
}

const TONE = { warning: "bg-warning-soft text-warning-fg", info: "bg-info-soft text-info-fg", danger: "bg-danger-soft text-danger-fg" };

function AttentionRow({ icon: Icon, label, hint, value, loading, to, tone = "warning", error }) {
  const hot = typeof value === "number" && value > 0;
  return (
    <li>
      <Link to={to} className="group flex items-center gap-3 rounded-md px-2 py-2.5 outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring">
        <span className={cn("grid size-8 shrink-0 place-items-center rounded-md", hot ? TONE[tone] : "bg-surface-sunken text-fg-subtle")}>
          <Icon aria-hidden className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-ui-sm font-medium text-fg">{label}</span>
          {hint ? <span className="block truncate text-ui-xs text-fg-subtle">{hint}</span> : null}
        </span>
        {loading ? (
          <Skeleton className="h-5 w-8" />
        ) : error ? (
          <span className="text-ui-xs text-danger-fg" title={error.message}>
            error
          </span>
        ) : (
          <span className={cn("min-w-8 rounded-full px-2 text-center text-ui-sm font-semibold tabular-nums", hot ? TONE[tone] : "text-fg-subtle")}>{value ?? "—"}</span>
        )}
        <ChevronRight aria-hidden className="size-4 text-fg-subtle group-hover:text-fg" />
      </Link>
    </li>
  );
}

export default function Overview() {
  const can = useCan();
  const canReports = can("reports.view");

  // The platform overview (no tenant) returns lifetime totals only, so the 30-day period and the 30 days
  // before it come from one 60-day sales series. Changes are null when the previous period is 0 (API rule).
  const overview = useQuery({ queryKey: keys.reports.custom("platform-overview"), queryFn: () => P.reportsOverview(), enabled: canReports });
  const sales = useQuery({ queryKey: keys.reports.custom("sales", { days: 60 }, "platform"), queryFn: () => P.reportsSalesRange({ days: 60 }), enabled: canReports });
  const recent = useQuery({ queryKey: keys.orders.list({ limit: 8, scope: "platform-recent" }), queryFn: () => P.listOrders({ limit: 8 }), enabled: can("orders.view") });
  const users = useQuery({ ...count(keys.users.custom("count", "all"), () => P.listUsers({ limit: 1 }), can("users.view")) });
  const health = useQueries({ queries: HEALTH.map((h) => count(keys.tenants.custom("count", h.status), () => P.listTenants({ status: h.status, limit: 1 }), can("tenants.view"))) });

  const canOrders = can("orders.view");
  const [toConfirm, requested, awaiting, toRefund] = useQueries({
    queries: ["pending", "return_requested", "return_approved", "returned"].map((status) => count(keys.orders.custom("queue-count", "sa:all", status), () => P.listOrders({ status, limit: 1 }), canOrders)),
  });
  const failed = useFailedRefundCount({ apiClient: P, scope: "sa:all", enabled: can(["orders.refund", "orders.update"]) });
  const [escalated, unassigned] = useQueries({
    queries: ["escalated", "unassigned"].map((queue) => count(keys.chats.custom("count", queue), () => P.listChats({ queue, limit: 1 }), can("chat.view"))),
  });
  const offers = useQuery(count(keys.offers.custom("pending-approval-count"), () => P.listPlatformOffers({ status: "pending_approval", limit: 1 }), can("pricing.view")));

  const days = useMemo(() => (Array.isArray(sales.data) ? sales.data : []), [sales.data]);
  const chart = useMemo(() => days.slice(-30).map((d) => ({ x: dayLabel(d._id), gmv: d.gmv, netSales: d.netSales, orders: d.orders })), [days]);
  const healthData = HEALTH.map((h, i) => ({ label: h.label, value: health[i].data || 0, color: h.color }));
  const o = overview.data;
  const cur = useMemo(() => (sales.data ? summarize(days.slice(-30)) : null), [sales.data, days]);
  const prev = useMemo(() => (sales.data ? summarize(days.slice(0, Math.max(0, days.length - 30))) : null), [sales.data, days]);
  const changes = cur && prev ? { gmv: pct(cur.gmv, prev.gmv), orders: pct(cur.orders, prev.orders), aov: pct(cur.aov, prev.aov), netSales: pct(cur.netSales, prev.netSales) } : {};

  return (
    <>
      <PageHeader
        title="Overview"
        description="How the whole marketplace is doing. Last 30 days in IST vs the 30 days before."
        breadcrumbs={[{ label: "Console" }]}
        primaryAction={
          can("tenants.create") ? (
            <Button variant="primary" leftIcon={Plus} to="/super-admin/tenants/new">
              New tenant
            </Button>
          ) : null
        }
        secondaryActions={canReports ? <Button to="/super-admin/analytics">Analytics</Button> : null}
      />

      {canReports ? (
        <section aria-label="Sales KPIs" className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="GMV" value={<Money value={cur?.gmv} whole />} {...deltaProps(changes.gmv)} loading={sales.isPending} to="/super-admin/analytics" />
          <StatCard label="Orders" value={cur ? cur.orders.toLocaleString("en-IN") : null} {...deltaProps(changes.orders)} loading={sales.isPending} to="/super-admin/orders" />
          <StatCard label="Average order value" value={<Money value={cur?.orders ? cur.aov : null} />} {...deltaProps(changes.aov)} loading={sales.isPending} />
          <StatCard label="Net sales" value={<Money value={cur?.netSales} whole />} {...deltaProps(changes.netSales, cur ? `vs previous · fees ${inr(cur.fees, { whole: true })}` : undefined)} loading={sales.isPending} />
        </section>
      ) : null}
      {sales.error ? <ErrorState error={sales.error} onRetry={sales.refetch} compact className="mb-6" /> : null}

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 xl:grid-cols-[minmax(0,1fr)_24rem]">
        {canReports ? (
          <Card>
            <CardHeader title="GMV and net sales" description={o ? `Daily, last 30 days (IST) · all time ${inr(o.gmv, { whole: true })} from ${Number(o.orders || 0).toLocaleString("en-IN")} orders` : "Daily, last 30 days (IST)"} />
            <CardBody>
              {sales.isPending ? (
                <Skeleton className="h-56 w-full" />
              ) : sales.error ? (
                <ErrorState error={sales.error} onRetry={sales.refetch} compact />
              ) : (
                <AreaChart
                  data={chart}
                  x="x"
                  series={[
                    { key: "gmv", label: "GMV" },
                    { key: "netSales", label: "Net sales" },
                  ]}
                  format={(v) => inr(v, { whole: true })}
                  title="Daily GMV and net sales, last 30 days"
                  height={240}
                />
              )}
            </CardBody>
          </Card>
        ) : null}

        <Card>
          <CardHeader title="Needs attention" description="Work waiting on the platform team" />
          <CardBody className="px-2 py-2 sm:px-3">
            <ul className="grid grid-cols-[minmax(0,1fr)]">
              {canOrders ? (
                <>
                  <AttentionRow icon={Undo2} label="Return requests" hint="Approve or reject" value={requested.data} loading={requested.isPending} error={requested.error} to="/super-admin/returns" />
                  <AttentionRow icon={Undo2} label="Awaiting returned goods" hint="Receive and inspect" value={awaiting.data} loading={awaiting.isPending} error={awaiting.error} to="/super-admin/returns?tab=approved" tone="info" />
                  <AttentionRow icon={Wallet} label="Returns to refund" hint="Goods received" value={toRefund.data} loading={toRefund.isPending} error={toRefund.error} to="/super-admin/returns?tab=received" />
                  {can(["orders.refund", "orders.update"]) ? (
                    <AttentionRow icon={AlertTriangle} label="Failed refunds" hint="Refunds the provider rejected — retry them" value={failed.count} loading={failed.isPending} error={failed.error} to="/super-admin/returns?tab=failed" tone="danger" />
                  ) : null}
                  <AttentionRow icon={PackageX} label="Orders to confirm" hint="Pending across stores" value={toConfirm.data} loading={toConfirm.isPending} error={toConfirm.error} to="/super-admin/orders?status=pending" tone="info" />
                </>
              ) : null}
              {can("pricing.view") ? (
                <AttentionRow icon={BadgeCheck} label="Offers awaiting approval" hint="Across every store" value={offers.data} loading={offers.isPending} error={offers.error} to="/super-admin/offers" />
              ) : null}
              {can("chat.view") ? (
                <>
                  <AttentionRow icon={MessageSquareWarning} label="Escalated chats" value={escalated.data} loading={escalated.isPending} error={escalated.error} to="/super-admin/support?queue=escalated" tone="danger" />
                  <AttentionRow icon={MessageSquareWarning} label="Unassigned chats" value={unassigned.data} loading={unassigned.isPending} error={unassigned.error} to="/super-admin/support?queue=unassigned" />
                </>
              ) : null}
              {can("tenants.view") ? <AttentionRow icon={Building2} label="Stores pending activation" value={health[2].data} loading={health[2].isPending} error={health[2].error} to="/super-admin/tenants?status=pending" /> : null}
            </ul>
          </CardBody>
        </Card>
      </div>

      <div className="mb-6 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[22rem_minmax(0,1fr)]">
        {can("tenants.view") ? (
          <Card>
            <CardHeader title="Tenant health" actions={<Button size="sm" variant="ghost" to="/super-admin/tenants">All tenants</Button>} />
            <CardBody>
              {health.some((h) => h.isPending) ? <Skeleton className="h-40 w-full" /> : <DonutChart data={healthData} centerLabel="stores" title="Stores by status" format={(v) => Number(v || 0).toLocaleString("en-IN")} />}
            </CardBody>
          </Card>
        ) : null}
        {canReports ? (
          <section aria-label="Platform totals" className="grid grid-cols-2 content-start gap-3 sm:grid-cols-3">
            <StatCard label="Live stores" value={o?.tenants?.toLocaleString("en-IN")} hint="Active + trial" loading={overview.isPending} to="/super-admin/tenants?status=active" />
            <StatCard label="Users" value={users.data?.toLocaleString("en-IN")} hint="Excludes deleted accounts" loading={users.isPending} to="/super-admin/users" />
            <StatCard label="Buyers" value={o?.buyers?.toLocaleString("en-IN")} loading={overview.isPending} to="/super-admin/users" />
            <StatCard label="Published products" value={o?.products?.toLocaleString("en-IN")} loading={overview.isPending} to="/super-admin/catalog?status=published" />
            <StatCard label="Low-stock SKUs" value={o?.lowStock?.toLocaleString("en-IN")} loading={overview.isPending} />
            <StatCard label="Open chats" value={o?.openChats?.toLocaleString("en-IN")} loading={overview.isPending} to="/super-admin/support" />
          </section>
        ) : null}
      </div>

      {canOrders ? (
        <Card>
          <CardHeader title="Recent orders" actions={<Button size="sm" variant="ghost" to="/super-admin/orders">View all</Button>} />
          <DataTable
            className="[&>div]:rounded-none [&>div]:border-0 [&>div]:shadow-none"
            data={recent.data?.data}
            loading={recent.isPending}
            error={recent.error}
            onRetry={recent.refetch}
            pagination={false}
            skeletonRows={5}
            rowHref={orderHref}
            columns={orderColumns()}
            emptyState={<EmptyState title="No orders yet" description="Orders from every store show up here." compact />}
          />
        </Card>
      ) : null}
    </>
  );
}
