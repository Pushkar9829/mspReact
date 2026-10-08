import { useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Lock, X } from "lucide-react";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { RESERVATION_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { Alert, Badge, Button, DataTable, DateTime, EmptyState, FilterBar, PageHeader, RelativeTime, StatusPill } from "../../shared/ui/index.js";
import { TenantFilter, TenantRequired, useTenantScope } from "./lib/tenantScope.jsx";
import { attributeSummary, refId } from "./lib/catalogShared.jsx";

const STATUS_HELP = "held → committed (order confirmed) → consumed (shipped); released = hold dropped; restored = stock put back (cancel/return).";

export default function Reservations() {
  const scope = useTenantScope();
  const tenantId = scope.tenantId;
  const table = useUrlTableState({ filters: ["status", "variantId"], defaults: { limit: 20 } });

  const q = useQuery({
    queryKey: keys.reservations.list({ ...table.query, tenant: tenantId }),
    queryFn: () => scope.api.listReservations(table.query),
    enabled: Boolean(tenantId),
    ...listQueryOptions,
  });
  // The reservations endpoint returns bare ids: resolve SKU / warehouse names from the store's lists.
  const variants = useQuery({
    queryKey: keys.variants.list({ tenant: tenantId, all: true }),
    queryFn: () => scope.api.listVariants({ includeArchived: "true" }),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    select: (res) => new Map((Array.isArray(res) ? res : res?.data || []).map((v) => [String(v._id), v])),
  });
  const warehouses = useQuery({
    queryKey: keys.warehouses.list({ tenant: tenantId }),
    queryFn: () => scope.api.listWarehouses(),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    select: (res) => new Map((Array.isArray(res) ? res : res?.data || []).map((w) => [String(w._id), w])),
  });

  const columns = useMemo(
    () => [
      {
        id: "sku",
        header: "SKU",
        primary: true,
        csv: (r) => variants.data?.get(refId(r.variantId))?.sku || refId(r.variantId),
        cell: (r) => {
          const v = variants.data?.get(refId(r.variantId));
          if (!v) return <span className="font-mono text-ui-xs text-fg-subtle">{variants.isPending ? "…" : refId(r.variantId).slice(-8)}</span>;
          return (
            <Link to={`/super-admin/catalog/${refId(v.productId)}`} className="grid hover:underline">
              <span className="font-mono text-ui-sm text-fg">{v.sku}</span>
              {attributeSummary(v.attributes) ? <span className="text-ui-xs text-fg-subtle">{attributeSummary(v.attributes)}</span> : null}
            </Link>
          );
        },
      },
      {
        id: "warehouse",
        header: "Warehouse",
        csv: (r) => warehouses.data?.get(refId(r.warehouseId))?.name || refId(r.warehouseId),
        cell: (r) => {
          const w = warehouses.data?.get(refId(r.warehouseId));
          return w ? (
            <span className="grid">
              <span>{w.name}</span>
              {w.code ? <span className="font-mono text-ui-2xs text-fg-subtle">{w.code}</span> : null}
            </span>
          ) : (
            <span className="font-mono text-ui-xs text-fg-subtle">{refId(r.warehouseId).slice(-8) || "—"}</span>
          );
        },
      },
      {
        id: "qty",
        header: "Qty",
        align: "right",
        csv: (r) => r.qty,
        cell: (r) => (
          <span>
            {Number(r.qty).toLocaleString("en-IN")}
            {r.damagedQty ? <span className="ml-1 text-ui-xs text-danger-fg">({r.damagedQty} damaged)</span> : null}
          </span>
        ),
      },
      { id: "status", header: "Status", mobile: "meta", csv: (r) => r.status, cell: (r) => <StatusPill status={r.status} /> },
      {
        id: "owner",
        header: "Held for",
        mobile: "subtitle",
        csv: (r) => `${r.owner?.type || ""}:${refId(r.owner?.id)}`,
        cell: (r) =>
          r.owner?.type === "order" ? (
            <Link to={`/super-admin/orders/${refId(r.owner.id)}`} className="hover:underline">
              Order {r.reference || refId(r.owner.id).slice(-8)}
            </Link>
          ) : r.owner?.type === "cart" ? (
            <span className="text-fg-muted">Buyer cart{r.reference ? ` · ${r.reference}` : ""}</span>
          ) : (
            <span className="text-fg-subtle">—</span>
          ),
      },
      { id: "expires", header: "Expires", csv: (r) => r.expiresAt || "", cell: (r) => (r.expiresAt ? <DateTime value={r.expiresAt} /> : <span className="text-fg-subtle">—</span>) },
      { id: "created", header: "Created", mobile: "meta", csv: (r) => r.createdAt, cell: (r) => <RelativeTime value={r.createdAt} /> },
      { id: "updated", header: "Last change", csv: (r) => r.updatedAt, cell: (r) => <DateTime value={r.updatedAt} />, defaultHidden: true },
    ],
    [variants.data, variants.isPending, warehouses.data]
  );

  const header = (
    <PageHeader
      title="Stock reservations"
      description="Stock held for buyer carts and orders in one store. Read-only: holds move automatically as carts expire and orders progress."
      breadcrumbs={[{ label: "Reservations" }]}
    />
  );

  if (!tenantId) {
    return (
      <>
        {header}
        <TenantRequired value={tenantId} onChange={scope.setTenant} icon={Lock} description="Reservations are kept per store’s inventory. Pick the store to inspect." />
      </>
    );
  }

  const variantFilter = table.filters.variantId ? variants.data?.get(table.filters.variantId) : null;

  return (
    <>
      {header}
      <div className="grid gap-3">
        <p className="text-ui-xs text-fg-subtle">{STATUS_HELP} Times in IST.</p>
        {variants.error || warehouses.error ? <Alert tone="warning">Some SKU or warehouse names couldn’t be loaded; ids are shown instead.</Alert> : null}
        <DataTable
          storageKey="sa-reservations"
          exportFilename="reservations"
          table={table}
          data={q.data?.data}
          meta={q.data?.meta}
          loading={q.isPending}
          fetching={q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          columns={columns}
          toolbar={
            <FilterBar table={table} search={false} facets={[{ key: "status", title: "Status", options: statusOptions(RESERVATION_STATUSES), multiple: false }]}>
              <TenantFilter value={tenantId} onChange={scope.setTenant} placeholder="Choose tenant" />
              {table.filters.variantId ? (
                <Badge tone="primary" className="gap-1 py-1">
                  SKU: {variantFilter?.sku || table.filters.variantId.slice(-8)}
                  <button type="button" aria-label="Clear SKU filter" className="rounded-xs hover:opacity-70" onClick={() => table.setFilter("variantId", "")}>
                    <X className="size-3" aria-hidden />
                  </button>
                </Badge>
              ) : null}
            </FilterBar>
          }
          emptyState={
            <EmptyState
              icon={Lock}
              title={table.activeCount ? "No reservations match" : "No stock is reserved"}
              description={table.activeCount ? "Try another status or clear the filters." : "Holds appear when buyers add items to carts or place orders."}
              action={
                table.activeCount ? (
                  <Button size="sm" onClick={table.reset}>
                    Clear filters
                  </Button>
                ) : null
              }
            />
          }
        />
      </div>
    </>
  );
}
