import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ShoppingBag } from "lucide-react";
import { api, describeExport } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { FULFILLMENT_MODES, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, RETURN_REQUEST_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { paymentLabel } from "../../shared/lib/format.js";
import { Button, DataTable, EmptyState, FilterBar, PageHeader, Tooltip, toast } from "../../shared/ui/index.js";
import { cn } from "../../shared/ui/cn.js";
import OrderActions, { BulkOrderActions } from "../../shared/components/OrderActions.jsx";
import { useOrderQueueCounts } from "../../shared/components/orderQueues.js";
import { TenantFilter, useTenantScope } from "./lib/tenantScope.jsx";
import { orderColumns, orderHref } from "./lib/orderColumns.jsx";

const VIEWS = [
  { id: "", label: "All" },
  { id: "pending", label: "To confirm", queue: "to_confirm" },
  { id: "confirmed", label: "To pack", queue: "to_pack" },
  { id: "processing", label: "Processing", queue: "processing" },
  { id: "ready_to_ship", label: "Ready to ship", queue: "ready_to_ship" },
  { id: "shipped", label: "In transit", queue: "in_transit" },
  { id: "return_requested", label: "Return requests", queue: "return_requested" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const tenantOf = (o) => String(o.tenantId?._id || o.tenantId || "");
const FILTERS = ["status", "paymentStatus", "paymentMethod", "fulfillmentMode", "refundStatus", "returnStatus", "from", "to"];
const REFUND_STATUSES = ["pending", "processing", "processed", "failed"];

export default function Orders() {
  const can = useCan();
  const scope = useTenantScope();
  const table = useUrlTableState({ filters: FILTERS, defaults: { limit: 20 } });
  const q = useQuery({
    queryKey: keys.orders.list({ ...table.query, tenant: scope.tenantId }),
    queryFn: () => scope.api.listOrders(table.query),
    ...listQueryOptions,
  });
  const { counts } = useOrderQueueCounts({ apiClient: scope.api, scope: `sa:${scope.tenantId || "all"}` });
  const [exporting, setExporting] = useState(false);

  async function exportCsv() {
    setExporting(true);
    try {
      // The export takes the same filters, search and sort as the list (up to 1,000 rows).
      const { page, limit, ...query } = table.query;
      const res = await scope.api.exportReport("orders", query);
      const info = describeExport(res, "Orders export");
      (info.truncated ? toast.warning : toast.success)(info.title, { description: info.description });
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const columns = useMemo(
    () =>
      orderColumns({
        showTenant: !scope.tenantId,
        sortable: true,
        extra: [
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            hideable: false,
            csv: false,
            align: "right",
            width: 48,
            mobile: "hidden",
            cell: (o) => <OrderActions order={o} variant="menu" apiClient={api.withTenant(tenantOf(o) || null)} />,
          },
        ],
      }),
    [scope.tenantId]
  );

  return (
    <>
      <PageHeader
        title="Orders"
        description="Orders across every store. Times are IST; totals are the server’s figures."
        breadcrumbs={[{ label: "Console", to: "/super-admin" }, { label: "Orders" }]}
        secondaryActions={
          can("reports.export") ? (
            <Tooltip content={`Exports up to 1,000 orders matching the current filters, search and sort${scope.tenantId ? " for this store" : ""}.`}>
              <Button size="sm" leftIcon={Download} loading={exporting} onClick={exportCsv}>
                Export CSV
              </Button>
            </Tooltip>
          ) : null
        }
      />

      <nav aria-label="Order views" className="-mt-1 mb-4 flex gap-1 overflow-x-auto no-scrollbar">
        {VIEWS.map((v) => {
          const active = (table.filters.status || "") === v.id;
          const count = v.queue ? counts[v.queue] : null;
          return (
            <button
              key={v.id || "all"}
              type="button"
              aria-pressed={active}
              onClick={() => table.setFilter("status", v.id)}
              className={cn(
                "inline-flex shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-ui-sm font-medium transition-colors",
                active ? "bg-primary-soft text-primary-soft-fg" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
              )}
            >
              {v.label}
              {count ? <span className={cn("rounded-full px-1.5 text-ui-2xs tabular-nums", active ? "bg-surface text-fg" : "bg-surface-sunken")}>{count}</span> : null}
            </button>
          );
        })}
      </nav>

      <DataTable
        storageKey="sa-orders"
        exportFilename="orders-page"
        caption="Orders"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={orderHref}
        selectable={can(["orders.update", "orders.cancel", "orders.refund"])}
        bulkActions={(rows, clear) => <BulkOrderActions rows={rows} apiClient={api.withTenant(null)} onFinished={clear} />}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Order no., PO, buyer name or email"
            facets={[
              { key: "status", title: "Status", options: statusOptions(ORDER_STATUSES), multiple: true },
              { key: "paymentStatus", title: "Payment", options: statusOptions(PAYMENT_STATUSES), multiple: true },
              { key: "paymentMethod", title: "Method", options: PAYMENT_METHODS.map((m) => ({ value: m, label: paymentLabel(m) })), multiple: true },
              { key: "fulfillmentMode", title: "Fulfilment", options: statusOptions(FULFILLMENT_MODES) },
              { key: "refundStatus", title: "Refund", options: statusOptions(REFUND_STATUSES), multiple: true },
              { key: "returnStatus", title: "Return", options: statusOptions(RETURN_REQUEST_STATUSES), multiple: true },
            ]}
            dateRange={{ from: "from", to: "to" }}
          >
            <TenantFilter value={scope.tenantId} onChange={scope.setTenant} />
          </FilterBar>
        }
        columns={columns}
        emptyState={
          table.activeCount || scope.tenantId ? undefined : <EmptyState icon={ShoppingBag} title="No orders yet" description="Orders appear here as buyers check out on any store." />
        }
      />
    </>
  );
}
