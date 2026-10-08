import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, ShoppingBag, X } from "lucide-react";
import { api, describeExport } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { FULFILLMENT_MODES, ORDER_STATUSES, PAYMENT_METHODS, PAYMENT_STATUSES, RETURN_REQUEST_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { paymentLabel } from "../../shared/lib/format.js";
import { Button, DataTable, DateTime, EmptyState, FilterBar, Money, PageHeader, StatusPill, Tooltip, cn, toast } from "../../shared/ui/index.js";
import OrderActions, { BulkOrderActions } from "../../shared/components/OrderActions.jsx";
import { useFailedRefundCount, useOrderQueueCounts } from "../../shared/components/orderQueues.js";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";

const VIEWS = [
  { id: "", label: "All" },
  { id: "pending", label: "To confirm", queue: "to_confirm" },
  { id: "confirmed", label: "To pack", queue: "to_pack" },
  { id: "processing", label: "Processing", queue: "processing" },
  { id: "ready_to_ship", label: "Ready to ship", queue: "ready_to_ship" },
  { id: "shipped", label: "In transit", queue: "in_transit" },
  { id: "delivered", label: "Delivered" },
  { id: "cancelled", label: "Cancelled" },
];

const FILTERS = ["status", "paymentStatus", "paymentMethod", "fulfillmentMode", "refundStatus", "returnStatus", "buyerId", "from", "to"];
const REFUND_STATUSES = ["pending", "processing", "processed", "failed"];
const FULFILLMENT_LABEL = { store_pickup: "Store pickup", delivery_partner: "Delivery partner" };
const RETURN_LABEL = { requested: "Return requested", approved: "Return approved", rejected: "Return rejected", received: "Return received" };

export default function Orders() {
  const can = useCan();
  const table = useUrlTableState({ filters: FILTERS, defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.orders.list(table.query), queryFn: () => api.listOrders(table.query), ...listQueryOptions });
  const { counts } = useOrderQueueCounts();
  const failedRefunds = useFailedRefundCount({ enabled: can(["orders.refund", "orders.update"]) });
  const [exporting, setExporting] = useState(false);
  const buyerId = table.filters.buyerId;
  const buyerRow = buyerId ? q.data?.data?.find((o) => String(o.buyerId?._id || o.buyerId) === String(buyerId)) : null;
  const buyerLabel = buyerRow ? buyerRow.buyerSnapshot?.company || buyerRow.buyerSnapshot?.name || buyerRow.buyerId?.name : null;

  async function exportCsv() {
    setExporting(true);
    try {
      // Same filters, search and sort as the table (GET /reports/export/orders mirrors GET /orders).
      const { page: _page, limit: _limit, ...query } = table.query;
      const res = await api.exportReport("orders", query);
      const info = describeExport(res, "Orders export");
      (info.truncated ? toast.warning : toast.success)(info.title, { description: info.description, duration: info.truncated ? 10_000 : undefined });
    } catch (err) {
      toast.error(err?.message || "Export failed", { description: err?.requestId ? `Reference: ${err.requestId}` : undefined });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Orders"
        description="Confirm, pack, ship and track your store’s orders. Times are IST."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Orders" }]}
        secondaryActions={
          <PermissionGate perm="reports.export">
            <Tooltip content="Exports up to 1,000 orders matching the current search, filters and sort.">
              <Button size="sm" leftIcon={Download} loading={exporting} onClick={exportCsv}>
                Export CSV
              </Button>
            </Tooltip>
          </PermissionGate>
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
        {failedRefunds.count ? (
          <Button size="xs" variant="ghost" className="ml-auto shrink-0 text-danger-fg" to="/tenant/returns?tab=failed">
            {failedRefunds.count} failed refund{failedRefunds.count === 1 ? "" : "s"}
          </Button>
        ) : null}
      </nav>

      <DataTable
        storageKey="tenant-orders"
        exportFilename="orders-page"
        caption="Orders"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(o) => `/tenant/orders/${o._id}`}
        selectable={can(["orders.update", "orders.cancel"])}
        bulkActions={(rows, clear) => <BulkOrderActions rows={rows} onFinished={clear} />}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Order no., PO, buyer name or email"
            facets={[
              { key: "status", title: "Status", multiple: true, options: statusOptions(ORDER_STATUSES) },
              { key: "paymentStatus", title: "Payment", multiple: true, options: statusOptions(PAYMENT_STATUSES) },
              { key: "paymentMethod", title: "Method", multiple: true, options: PAYMENT_METHODS.map((m) => ({ value: m, label: paymentLabel(m) })) },
              { key: "fulfillmentMode", title: "Fulfilment", options: FULFILLMENT_MODES.map((m) => ({ value: m, label: FULFILLMENT_LABEL[m] || m })) },
              { key: "returnStatus", title: "Return", multiple: true, options: RETURN_REQUEST_STATUSES.map((s) => ({ value: s, label: RETURN_LABEL[s] || s })) },
              { key: "refundStatus", title: "Refund", multiple: true, options: statusOptions(REFUND_STATUSES) },
            ]}
            dateRange={{ from: "from", to: "to" }}
          >
            {buyerId ? (
              <Button size="sm" rightIcon={X} onClick={() => table.setFilter("buyerId", "")} aria-label="Clear customer filter">
                Customer: {buyerLabel || "selected"}
              </Button>
            ) : null}
          </FilterBar>
        }
        columns={[
          {
            id: "number",
            header: "Order",
            primary: true,
            sortKey: "orderNumber",
            accessorKey: "orderNumber",
            cell: (o) => (
              <span>
                {o.orderNumber}
                {o.poNumber ? <span className="block text-ui-xs font-normal text-fg-subtle">PO {o.poNumber}</span> : null}
              </span>
            ),
            csv: (o) => o.orderNumber,
          },
          { id: "placed", header: "Placed", sortKey: "createdAt", cell: (o) => <DateTime value={o.createdAt} />, csv: (o) => o.createdAt, mobile: "meta" },
          {
            id: "buyer",
            header: "Customer",
            accessorFn: (o) => o.buyerSnapshot?.company || o.buyerSnapshot?.name || o.buyerId?.name,
            cell: (o) => (
              <span className="block max-w-[14rem] truncate">
                {o.buyerSnapshot?.company || o.buyerSnapshot?.name || o.buyerId?.name || "—"}
                {o.buyerSnapshot?.company && (o.buyerSnapshot?.name || o.buyerId?.name) ? <span className="block truncate text-ui-xs text-fg-subtle">{o.buyerSnapshot?.name || o.buyerId?.name}</span> : null}
              </span>
            ),
            mobile: "subtitle",
          },
          { id: "items", header: "Items", align: "right", accessorFn: (o) => (o.items || []).reduce((n, it) => n + (Number(it.qty) || 0), 0), defaultHidden: true },
          {
            id: "payment",
            header: "Payment",
            cell: (o) => (
              <span className="inline-flex flex-col items-start gap-0.5">
                <StatusPill status={o.paymentStatus} domain="payment" />
                <span className="text-ui-xs text-fg-subtle">{paymentLabel(o.paymentMethod)}</span>
              </span>
            ),
            csv: (o) => `${o.paymentStatus} (${o.paymentMethod})`,
          },
          {
            id: "status",
            header: "Status",
            sortKey: "status",
            cell: (o) => (
              <span className="inline-flex flex-wrap items-center gap-1">
                <StatusPill status={o.status} />
                {(o.refunds || []).some((r) => r.status === "failed") ? <StatusPill status="failed" label="Refund failed" /> : null}
              </span>
            ),
            csv: (o) => o.status,
            mobile: "meta",
          },
          { id: "total", header: "Total", align: "right", sortKey: "grandTotal", cell: (o) => <Money value={o.total} />, csv: (o) => o.total, mobile: "meta" },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            align: "right",
            hideable: false,
            csv: false,
            mobile: "meta",
            cell: (o) => <OrderActions order={o} variant="menu" />,
          },
        ]}
        emptyState={
          <EmptyState
            icon={ShoppingBag}
            title={table.activeCount ? "No orders match these filters" : "No orders yet"}
            description={table.activeCount ? "Try another view or clear the filters." : "Orders appear here as soon as buyers check out from your store."}
            action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : can("products.view") ? <Button size="sm" to="/tenant/products">Review your catalog</Button> : null}
          />
        }
      />
    </>
  );
}
