import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { History, X } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useAuth } from "../../../shared/context/AuthContext.jsx";
import { Badge, Button, DataTable, DateTime, EmptyState, FilterBar, cn } from "../../../shared/ui/index.js";
import { PREFIX, TX_REASON_LABELS, TX_REASON_TONES, fmtQty, signed, useWarehouses, warehouseLabel } from "./lib.js";

export function FilterChip({ label, onClear }) {
  return (
    <Badge tone="primary" size="md" className="pr-1">
      {label}
      <button type="button" aria-label={`Clear filter ${label}`} onClick={onClear} className="ml-1 grid size-4 place-items-center rounded-full hover:bg-surface-hover">
        <X aria-hidden className="size-3" />
      </button>
    </Badge>
  );
}

export function TransactionsTab() {
  const { user } = useAuth();
  const table = useUrlTableState({ filters: ["warehouseId", "variantId", "reason", "orderId", "from", "to"], defaults: { limit: 20 }, prefix: PREFIX.tx });
  const q = useQuery({
    queryKey: keys.inventory.custom("transactions", table.query),
    queryFn: () => api.listInventoryTransactions(table.query),
    ...listQueryOptions,
  });
  const warehouses = useWarehouses();
  const rows = q.data?.data;
  const whName = (t) => {
    if (t?.warehouse?.name) return warehouseLabel(t.warehouse);
    const id = t?.warehouseId?._id || t?.warehouseId || t;
    const w = warehouses.byId[String(id)];
    return w ? warehouseLabel(w) : warehouses.allowed ? "Unknown warehouse" : `…${String(id).slice(-6)}`;
  };
  const actor = (id) => (!id ? "System" : String(id) === String(user?.id) ? "You" : "Staff");

  const facets = [
    ...(warehouses.list.length > 1 ? [{ key: "warehouseId", title: "Warehouse", options: warehouses.list.map((w) => ({ value: String(w._id), label: warehouseLabel(w) })) }] : []),
    { key: "reason", title: "Movement", multiple: true, options: Object.entries(TX_REASON_LABELS).map(([value, label]) => ({ value, label })) },
  ];

  const columns = [
    { id: "when", header: "Date (IST)", primary: true, mobile: "title", cell: (t) => <DateTime value={t.createdAt} />, csv: (t) => t.createdAt },
    {
      id: "reason",
      header: "Movement",
      cell: (t) => <Badge tone={TX_REASON_TONES[t.reason] || "neutral"}>{TX_REASON_LABELS[t.reason] || t.reason}</Badge>,
      csv: (t) => t.reason,
      mobile: "subtitle",
    },
    {
      id: "sku",
      header: "Product / SKU",
      cell: (t) => (
        <span className="block max-w-64">
          {t.productName || t.product?.name ? <span className="block truncate text-ui-sm text-fg">{t.productName || t.product?.name}</span> : null}
          <button type="button" className="font-mono text-ui-xs text-fg-muted hover:underline" title="Show only this variant" onClick={() => table.setFilter("variantId", String(t.variant?._id || t.variantId))}>
            {t.variant?.sku || t.sku}
          </button>
        </span>
      ),
      csv: (t) => `${t.productName || ""} ${t.variant?.sku || t.sku || ""}`.trim(),
    },
    { id: "warehouse", header: "Warehouse", cell: (t) => whName(t), csv: (t) => whName(t) },
    {
      id: "order",
      header: "Order",
      cell: (t) =>
        t.order?._id ? (
          <Link to={`/tenant/orders/${t.order._id}`} className="relative z-[1] font-medium text-primary-soft-fg hover:underline">
            {t.order.orderNumber || t.orderNumber}
          </Link>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
      csv: (t) => t.orderNumber || t.order?.orderNumber || "",
      mobile: "hidden",
    },
    {
      id: "qty",
      header: "Qty",
      align: "right",
      cell: (t) => <span className={cn("font-semibold", t.qty > 0 ? "text-success-fg" : t.qty < 0 ? "text-danger-fg" : "text-fg-muted")}>{signed(t.qty)}</span>,
      csv: (t) => t.qty,
    },
    { id: "availableAfter", header: "Available after", align: "right", cell: (t) => fmtQty(t.availableAfter), csv: (t) => t.availableAfter },
    { id: "reservedAfter", header: "Reserved after", align: "right", cell: (t) => fmtQty(t.reservedAfter), csv: (t) => t.reservedAfter, mobile: "hidden" },
    { id: "committedAfter", header: "Committed after", align: "right", cell: (t) => fmtQty(t.committedAfter), csv: (t) => t.committedAfter, mobile: "hidden" },
    { id: "damagedAfter", header: "Damaged after", align: "right", cell: (t) => fmtQty(t.damagedAfter), csv: (t) => t.damagedAfter, defaultHidden: true, mobile: "hidden" },
    {
      id: "details",
      header: "Note / reference",
      cell: (t) =>
        t.note || t.reference ? (
          <div className="max-w-80 text-ui-xs">
            {t.note ? <p className="truncate text-fg" title={t.note}>{t.note}</p> : null}
            {t.reference ? <p className="truncate font-mono text-fg-subtle" title={t.reference}>{t.reference}</p> : null}
          </div>
        ) : (
          <span className="text-fg-subtle">—</span>
        ),
      csv: (t) => [t.note, t.reference].filter(Boolean).join(" | "),
    },
    { id: "actor", header: "By", cell: (t) => <span className="text-fg-muted">{actor(t.actorId)}</span>, csv: (t) => t.actorId || "system", mobile: "hidden" },
  ];

  const sku = table.filters.variantId ? rows?.[0]?.variant?.sku || rows?.[0]?.sku : null;
  const orderNo = table.filters.orderId ? rows?.find((r) => r.order)?.order?.orderNumber : null;

  return (
    <DataTable
      storageKey="tenant-inventory-tx"
      exportFilename="inventory-transactions"
      caption="Inventory transactions, newest first"
      table={table}
      data={rows}
      meta={q.data?.meta}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      columns={columns}
      getRowId={(t) => String(t._id)}
      toolbar={
        <FilterBar table={table} search={false} facets={facets} dateRange={{ from: "from", to: "to" }}>
          {table.filters.orderId ? <FilterChip label={`Order: ${orderNo || `…${table.filters.orderId.slice(-6)}`}`} onClear={() => table.setFilter("orderId", "")} /> : null}
          {table.filters.variantId ? <FilterChip label={`Variant: ${sku || `…${table.filters.variantId.slice(-6)}`}`} onClear={() => table.setFilter("variantId", "")} /> : null}
          {table.filters.warehouseId && warehouses.list.length <= 1 ? <FilterChip label={`Warehouse: ${whName(table.filters.warehouseId)}`} onClear={() => table.setFilter("warehouseId", "")} /> : null}
        </FilterBar>
      }
      emptyState={
        <EmptyState
          icon={History}
          title={table.activeCount ? "No movements for this filter" : "No stock movements yet"}
          description={table.activeCount ? "Nothing matches these filters." : "Receipts, adjustments, transfers, reservations and shipments are logged here."}
          action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : null}
        />
      }
    />
  );
}
