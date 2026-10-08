import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { AlertTriangle, RotateCcw, Undo2 } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useUrlTableState } from "../hooks/useUrlTableState.js";
import { inr, paymentLabel } from "../lib/format.js";
import { useCan } from "../context/AuthContext.jsx";
import { useApiMutation } from "../hooks/useApiMutation.js";
import { Badge, Button, ConfirmDialog, DataTable, DateTime, EmptyState, FilterBar, Money, StatusPill, Tabs, TabPanel, Tooltip, toast } from "../ui/index.js";
import OrderActions from "./OrderActions.jsx";
import { useFailedRefundCount, useOrderQueueCounts } from "./orderQueues.js";

const TABS = [
  { value: "requested", status: "return_requested", label: "Requests", queue: "return_requested", empty: "No open return requests", hint: "Approve to book a return pickup, or reject with a reason." },
  { value: "approved", status: "return_approved", label: "Awaiting goods", queue: "return_approved", empty: "Nothing on its way back", hint: "Receive the goods and record damaged units." },
  { value: "received", status: "returned", label: "To refund", queue: "returned", empty: "No received returns waiting for a refund", hint: "Refund received returns." },
  { value: "refunded", status: "refunded", label: "Refunded", empty: "No refunded orders" },
  { value: "failed", label: "Failed refunds", empty: "No failed refunds", hint: "Refunds the payment provider rejected. Retry them once the cause is fixed." },
];

function buyerName(o) {
  return o.buyerSnapshot?.company || o.buyerSnapshot?.name || o.buyerId?.name || "—";
}

/**
 * Returns & refunds work queue (both panels).
 *   <ReturnsQueue orderHref={(o) => `/tenant/orders/${o._id}`} />
 *   <ReturnsQueue showTenant orderHref={…} apiClientFor={(o) => api.withTenant(o.tenantId?._id)} />   // super admin
 * Props: orderHref(order) · showTenant (store column) · apiClient · apiClientFor(order) (per-row actions client) ·
 * tenantId (scopes every request via X-Tenant-Id and the cache) · tenantFilter (node rendered in each toolbar) · scope.
 * Tabs live in ?tab= (requested | approved | received | refunded | failed). Actions per row come from
 * orderActions() (approve / reject / receive with damaged qty / refund), each behind its dialog.
 */
export default function ReturnsQueue({ orderHref, showTenant = false, apiClient: apiClientProp, apiClientFor, scope: scopeProp = "default", tenantId, tenantFilter = null }) {
  const [params, setParams] = useSearchParams();
  const apiClient = useMemo(() => apiClientProp || (tenantId ? defaultApi.withTenant(tenantId) : defaultApi), [apiClientProp, tenantId]);
  const scope = `${scopeProp}:${tenantId || "all"}`;
  const { counts } = useOrderQueueCounts({ queues: TABS.filter((t) => t.queue).map((t) => ({ id: t.queue, status: t.status })), apiClient, scope });
  const can = useCan();
  const canRefunds = can(["orders.refund", "orders.update"]);
  const failed = useFailedRefundCount({ apiClient, scope, enabled: canRefunds });
  // ?tab=failed without refund permission (or an unknown tab) falls back to the default tab.
  const visibleTabs = TABS.filter((t) => t.value !== "failed" || canRefunds);
  const current = visibleTabs.find((t) => t.value === params.get("tab")) || visibleTabs[0];
  const setTab = (next) =>
    setParams(
      (prev) => {
        const p = new URLSearchParams(prev);
        if (next === visibleTabs[0].value) p.delete("tab");
        else p.set("tab", next);
        return p;
      },
      { replace: true }
    );

  return (
    <Tabs
      value={current.value}
      onValueChange={setTab}
      aria-label="Return queues"
      tabs={visibleTabs.map((t) => ({
        value: t.value,
        label: t.label,
        count: t.queue ? counts[t.queue] || undefined : t.value === "failed" ? failed.count || undefined : undefined,
      }))}
    >
      {TABS.filter((t) => t.status).map((t) => (
        <TabPanel key={t.value} value={t.value}>
          {current.value === t.value ? <StatusTable tab={t} orderHref={orderHref} showTenant={showTenant} apiClient={apiClient} apiClientFor={apiClientFor} scope={scope} tenantFilter={tenantFilter} /> : null}
        </TabPanel>
      ))}
      <TabPanel value="failed">
        {tenantFilter ? <div className="mb-3 flex flex-wrap gap-2">{tenantFilter}</div> : null}
        {canRefunds && current.value === "failed" ? <FailedRefunds orderHref={orderHref} showTenant={showTenant} apiClient={apiClient} apiClientFor={apiClientFor} scope={scope} /> : null}
      </TabPanel>
    </Tabs>
  );
}

function StatusTable({ tab, orderHref, showTenant, apiClient, apiClientFor, scope, tenantFilter }) {
  const table = useUrlTableState({ filters: ["from", "to"], defaults: { limit: 20 }, prefix: "r_" });
  const query = { ...table.query, status: tab.status };
  const q = useQuery({ queryKey: keys.orders.list({ ...query, scope }), queryFn: () => apiClient.listOrders(query), ...listQueryOptions });
  return (
    <div className="grid gap-3">
      {tab.hint ? <p className="text-ui-sm text-fg-muted">{tab.hint}</p> : null}
      <DataTable
        storageKey={`returns-${tab.value}`}
        exportFilename={`returns-${tab.value}`}
        caption={tab.label}
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={orderHref}
        toolbar={
          <FilterBar table={table} searchPlaceholder="Order no., PO or buyer" dateRange={{ from: "from", to: "to" }}>
            {tenantFilter}
          </FilterBar>
        }
        columns={[
          { id: "number", header: "Order", accessorKey: "orderNumber", primary: true },
          showTenant ? { id: "tenant", header: "Store", accessorFn: (o) => o.tenantId?.name, mobile: "subtitle" } : null,
          { id: "buyer", header: "Customer", accessorFn: buyerName, mobile: "subtitle" },
          {
            id: "reason",
            header: "Return reason",
            cell: (o) => (
              <span className="block max-w-[16rem] truncate" title={o.returnRequest?.note || o.returnRequest?.reason}>
                {o.returnRequest?.reason || <span className="text-fg-subtle">—</span>}
              </span>
            ),
            csv: (o) => o.returnRequest?.reason,
          },
          {
            id: "requested",
            header: tab.status === "returned" ? "Received" : "Requested",
            cell: (o) => <DateTime value={tab.status === "returned" ? o.returnRequest?.receivedAt : o.returnRequest?.requestedAt || o.updatedAt} />,
            mobile: "meta",
          },
          {
            id: "payment",
            header: "Payment",
            cell: (o) => (
              <span className="inline-flex flex-col items-start gap-0.5">
                <StatusPill status={o.paymentStatus} domain="payment" />
                <span className="text-ui-xs text-fg-subtle">{paymentLabel(o.paymentMethod)}</span>
              </span>
            ),
            csv: (o) => o.paymentMethod,
          },
          {
            id: "refund",
            header: "Refund",
            cell: (o) => {
              const r = (o.refunds || [])[o.refunds?.length - 1];
              return r ? <StatusPill status={r.status} /> : <span className="text-fg-subtle">—</span>;
            },
            csv: (o) => (o.refunds || []).map((r) => r.status).join("|"),
          },
          { id: "total", header: "Order total", align: "right", cell: (o) => <Money value={o.total} />, csv: (o) => o.total, mobile: "meta" },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            hideable: false,
            csv: false,
            cell: (o) => <OrderActions order={o} variant="menu" apiClient={apiClientFor ? apiClientFor(o) : apiClient} />,
          },
        ].filter(Boolean)}
        emptyState={<EmptyState icon={Undo2} title={table.activeCount ? "No returns match these filters" : tab.empty} description={table.activeCount ? "Clear the search or date range." : "Returns move through Requests → Awaiting goods → To refund."} compact />}
      />
    </div>
  );
}

/** Failed refund intents from GET /orders/refunds (server-paged), each with a Retry action (orders.refund). */
function FailedRefunds({ orderHref, showTenant, apiClient, apiClientFor, scope }) {
  const can = useCan();
  const canRetry = can("orders.refund");
  const table = useUrlTableState({ filters: [], defaults: { limit: 20 }, prefix: "fr_" });
  const query = { status: "failed", page: table.page, limit: table.limit };
  const q = useQuery({ queryKey: keys.orders.custom("refunds", scope, query), queryFn: () => apiClient.listRefunds(query), ...listQueryOptions });
  const [retrying, setRetrying] = useState(null);
  const retry = useApiMutation(
    (row) => {
      const client = apiClientFor ? apiClientFor({ _id: row.orderId, tenantId: row.tenantId }) : apiClient;
      return client.retryRefund(row.orderId, row.refund.key);
    },
    {
      invalidate: [keys.orders.all, keys.ledger.all, keys.customers.all],
      error: false,
      onSuccess: (order, row) => {
        const r = (order?.refunds || []).find((x) => x.key === row?.refund?.key);
        if (r?.status === "failed") toast.error(`Refund for ${row.orderNumber} failed again`, { description: r.lastError || undefined });
        else toast.success(`Refund for ${row.orderNumber} ${r?.status === "processed" ? "processed" : "sent again"}`);
      },
    }
  );
  const rows = (q.data?.data || []).map((r) => ({ ...r, _id: `${r.orderId}:${r.refund?.key}` }));
  const orderOf = (r) => ({ _id: r.orderId, orderNumber: r.orderNumber, tenantId: r.tenantId });
  return (
    <div className="grid gap-3">
      <p className="flex items-start gap-1.5 text-ui-sm text-fg-muted">
        <AlertTriangle aria-hidden className="mt-0.5 size-4 shrink-0 text-warning-fg" />
        The platform retries failed Razorpay refunds automatically a few times. Retry resets the attempt counter and tries again now.
      </p>
      <DataTable
        caption="Failed refunds"
        storageKey="returns-failed-refunds"
        exportFilename="failed-refunds"
        table={table}
        data={rows}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(r) => orderHref?.(orderOf(r))}
        columns={[
          { id: "number", header: "Order", accessorFn: (r) => r.orderNumber, primary: true },
          showTenant ? { id: "tenant", header: "Store", accessorFn: (r) => r.tenantName || r.tenantId?.name || "" } : null,
          { id: "buyer", header: "Customer", accessorFn: (r) => r.buyer?.company || r.buyer?.name || "—", mobile: "subtitle" },
          { id: "amount", header: "Amount", align: "right", cell: (r) => <Money value={r.refund?.amount} />, csv: (r) => r.refund?.amount, mobile: "meta" },
          { id: "method", header: "Paid via", cell: (r) => <span className="text-fg-muted">{paymentLabel(r.paymentMethod)}</span>, csv: (r) => r.paymentMethod },
          { id: "provider", header: "Provider", cell: (r) => <Badge tone="outline">{r.refund?.provider}</Badge>, csv: (r) => r.refund?.provider, defaultHidden: true },
          { id: "attempts", header: "Attempts", align: "right", accessorFn: (r) => r.refund?.attempts ?? 0 },
          { id: "error", header: "Last error", cell: (r) => <span className="block max-w-[20rem] truncate text-danger-fg" title={r.refund?.lastError}>{r.refund?.lastError || "—"}</span>, csv: (r) => r.refund?.lastError },
          { id: "at", header: "Failed", cell: (r) => <DateTime value={r.refund?.updatedAt} />, csv: (r) => r.refund?.updatedAt, mobile: "meta" },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            hideable: false,
            csv: false,
            cell: (r) =>
              canRetry ? (
                <Button size="xs" leftIcon={RotateCcw} onClick={() => setRetrying(r)}>
                  Retry
                </Button>
              ) : (
                <Tooltip content="Requires orders.refund">
                  <span tabIndex={0} className="inline-flex">
                    <Button size="xs" leftIcon={RotateCcw} disabled>
                      Retry
                    </Button>
                  </span>
                </Tooltip>
              ),
          },
        ].filter(Boolean)}
        emptyState={<EmptyState icon={RotateCcw} title="No failed refunds" description="Every refund went through." compact />}
      />
      <ConfirmDialog
        open={Boolean(retrying)}
        onOpenChange={(o) => !o && setRetrying(null)}
        title={`Retry the refund for ${retrying?.orderNumber || "this order"}?`}
        description={
          retrying
            ? `${inr(retrying.refund?.amount)} is sent to ${retrying.refund?.provider === "razorpay" ? "Razorpay" : "the provider"} again with a fresh attempt counter. Last error: ${retrying.refund?.lastError || "not recorded"}.`
            : ""
        }
        confirmLabel="Retry refund"
        onConfirm={() => retry.mutateAsync(retrying)}
      />
    </div>
  );
}
