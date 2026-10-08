import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { RESERVATION_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import { Badge, Button, DataTable, DateTime, EmptyState, FilterBar, RelativeTime, StatusPill } from "../../../shared/ui/index.js";
import { PREFIX, fmtQty, useWarehouses, warehouseLabel } from "./lib.js";
import { FilterChip } from "./TransactionsTab.jsx";

const shortId = (id) => (id ? `…${String(id).slice(-6)}` : "—");

export function ReservationsTab({ onShowStock }) {
  const table = useUrlTableState({ filters: ["status", "variantId", "warehouseId", "ownerType", "orderId", "from", "to"], defaults: { limit: 20 }, prefix: PREFIX.res });
  const q = useQuery({ queryKey: keys.reservations.list(table.query), queryFn: () => api.listReservations(table.query), ...listQueryOptions });
  const warehouses = useWarehouses();
  const whName = (r) => {
    if (r?.warehouse?.name) return warehouseLabel(r.warehouse);
    const id = r?.warehouseId?._id || r?.warehouseId;
    const w = warehouses.byId[String(id)];
    return w ? warehouseLabel(w) : shortId(id);
  };

  const columns = [
    { id: "created", header: "Created (IST)", primary: true, mobile: "title", cell: (r) => <DateTime value={r.createdAt} />, csv: (r) => r.createdAt },
    {
      id: "owner",
      header: "Held for",
      mobile: "subtitle",
      cell: (r) =>
        r.owner?.type === "order" ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <Link to={`/tenant/orders/${r.order?._id || r.owner.id}`} className="relative z-[1] font-medium text-primary-soft-fg hover:underline">
              Order {r.orderNumber || r.order?.orderNumber || (r.reference && !r.reference.startsWith("cart:") ? r.reference : shortId(r.owner.id))}
            </Link>
            {r.order?.status ? <StatusPill status={r.order.status} /> : null}
          </span>
        ) : r.owner?.type === "cart" ? (
          <span className="text-fg-muted">Buyer cart</span>
        ) : (
          "—"
        ),
      csv: (r) => (r.owner?.type === "order" ? r.orderNumber || r.owner?.id : r.owner?.type || ""),
    },
    { id: "status", header: "Status", cell: (r) => <StatusPill status={r.status} />, csv: (r) => r.status },
    { id: "qty", header: "Qty", align: "right", cell: (r) => <span className="font-semibold">{fmtQty(r.qty)}</span>, csv: (r) => r.qty },
    {
      id: "variant",
      header: "Product / SKU",
      cell: (r) => (
        <span className="block max-w-64">
          {r.productName || r.product?.name ? <span className="block truncate text-ui-sm text-fg">{r.productName || r.product?.name}</span> : null}
          <button type="button" className="relative z-[1] font-mono text-ui-xs text-fg-muted hover:underline" title="Show stock for this variant" onClick={() => onShowStock?.(String(r.variant?._id || r.variantId))}>
            {r.variant?.sku || shortId(r.variantId)}
          </button>
        </span>
      ),
      csv: (r) => `${r.productName || ""} ${r.variant?.sku || r.variantId || ""}`.trim(),
    },
    { id: "warehouse", header: "Warehouse", cell: (r) => whName(r), csv: (r) => whName(r) },
    {
      id: "expires",
      header: "Expires",
      cell: (r) => (r.status === "held" && r.expiresAt ? <RelativeTime value={r.expiresAt} /> : <span className="text-fg-subtle">—</span>),
      csv: (r) => r.expiresAt || "",
    },
    { id: "damaged", header: "Damaged on return", align: "right", cell: (r) => (r.damagedQty ? <Badge tone="danger">{fmtQty(r.damagedQty)}</Badge> : <span className="text-fg-subtle">—</span>), csv: (r) => r.damagedQty, defaultHidden: true, mobile: "hidden" },
    {
      id: "history",
      header: "Last change",
      mobile: "hidden",
      cell: (r) => {
        const last = r.history?.[r.history.length - 1];
        return last ? (
          <span className="text-ui-xs text-fg-muted" title={last.note || undefined}>
            {last.from ? `${last.from} → ` : ""}
            {last.to} · <RelativeTime value={last.at} />
          </span>
        ) : (
          <span className="text-fg-subtle">—</span>
        );
      },
      csv: (r) => (r.history || []).map((h) => `${h.from || ""}>${h.to}@${h.at}`).join(" "),
    },
  ];

  return (
    <DataTable
      storageKey="tenant-inventory-reservations"
      exportFilename="inventory-reservations"
      caption="Stock reservations"
      table={table}
      data={q.data?.data}
      meta={q.data?.meta}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      columns={columns}
      toolbar={
        <FilterBar
          table={table}
          search={false}
          dateRange={{ from: "from", to: "to" }}
          facets={[
            { key: "status", title: "Status", multiple: true, options: statusOptions(RESERVATION_STATUSES) },
            { key: "ownerType", title: "Held for", options: [{ value: "order", label: "Orders" }, { value: "cart", label: "Buyer carts" }] },
            ...(warehouses.list.length > 1 ? [{ key: "warehouseId", title: "Warehouse", options: warehouses.list.map((w) => ({ value: String(w._id), label: warehouseLabel(w) })) }] : []),
          ]}
        >
          {table.filters.variantId ? <FilterChip label={`Variant ${q.data?.data?.[0]?.variant?.sku || shortId(table.filters.variantId)}`} onClear={() => table.setFilter("variantId", "")} /> : null}
          {table.filters.orderId ? <FilterChip label={`Order ${q.data?.data?.[0]?.orderNumber || shortId(table.filters.orderId)}`} onClear={() => table.setFilter("orderId", "")} /> : null}
        </FilterBar>
      }
      emptyState={
        <EmptyState
          icon={Lock}
          title={table.activeCount ? "No reservations match" : "No reservations"}
          description={
            table.activeCount
              ? "Try other filters."
              : "Units are held here while they sit in a buyer's cart (held), once an order is confirmed (committed), and until they ship (consumed)."
          }
          action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : null}
        />
      }
    />
  );
}
