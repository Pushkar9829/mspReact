import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeftRight, Boxes, Gauge, History, MoreHorizontal, PencilRuler, SlidersHorizontal, X } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { Badge, Button, DataTable, DropdownMenu, EmptyState, FilterBar, IconButton, MenuItem, MenuSeparator } from "../../../shared/ui/index.js";
import { PREFIX, fmtQty, productOf, useWarehouses, variantIdOf, variantSummary, warehouseIdOf, warehouseLabel } from "./lib.js";
import { AdjustDialog, SetQuantityDialog, ThresholdsDialog, TransferDialog } from "./StockDialogs.jsx";

function LevelBadge({ row }) {
  if ((Number(row.available) || 0) <= 0) return <Badge tone="danger" dot>Out of stock</Badge>;
  if (row.isLow) return <Badge tone="warning" dot>Low</Badge>;
  return <Badge tone="success" dot>In stock</Badge>;
}

function ProductCell({ row }) {
  const product = productOf(row);
  const img = product?.images?.[0];
  const summary = variantSummary(row.variantId);
  return (
    <div className="flex min-w-0 items-center gap-3">
      <div className="size-9 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken">{img ? <img src={img} alt="" className="size-full object-cover" loading="lazy" /> : null}</div>
      <div className="min-w-0">
        {product?._id ? (
          <Link to={`/tenant/products/${product._id}`} className="block max-w-72 truncate font-medium text-fg hover:underline">
            {product.name}
          </Link>
        ) : (
          <span className="block truncate font-medium text-fg">{row.sku}</span>
        )}
        {summary ? <span className="block max-w-72 truncate text-ui-xs text-fg-muted">{summary}</span> : null}
      </div>
    </div>
  );
}

function Num({ value, muted, tone }) {
  const n = Number(value) || 0;
  return <span className={n === 0 && muted ? "text-fg-subtle" : tone || "text-fg"}>{fmtQty(n)}</span>;
}

export function StockTab({ onViewHistory }) {
  const can = useCan();
  const table = useUrlTableState({ filters: ["warehouseId", "lowStock", "variantId"], defaults: { limit: 20 }, prefix: PREFIX.stock });
  const q = useQuery({ queryKey: keys.inventory.list(table.query), queryFn: () => api.listInventory(table.query), ...listQueryOptions });
  const warehouses = useWarehouses();
  const [dialog, setDialog] = useState(null); // { kind, row }
  // Keep the row while the dialog animates out.
  const close = (open) => !open && setDialog((d) => (d ? { ...d, kind: null } : d));

  const rows = q.data?.data;
  const variantChip = table.filters.variantId ? rows?.[0]?.sku || "selected variant" : null;

  const facets = [
    ...(warehouses.list.length > 1
      ? [{ key: "warehouseId", title: "Warehouse", options: warehouses.list.map((w) => ({ value: String(w._id), label: warehouseLabel(w) })) }]
      : []),
    { key: "lowStock", title: "Stock level", options: [{ value: "true", label: "Low or out of stock" }] },
  ];

  const columns = [
    { id: "product", header: "Product", primary: true, mobile: "title", cell: (r) => <ProductCell row={r} />, csv: (r) => productOf(r)?.name || "" },
    { id: "sku", header: "SKU", accessorKey: "sku", cell: (r) => <span className="font-mono text-ui-xs">{r.sku}</span>, mobile: "subtitle" },
    { id: "warehouse", header: "Warehouse", accessorFn: (r) => r.warehouseId?.name, cell: (r) => <span title={r.warehouseId?.city || undefined}>{warehouseLabel(r.warehouseId)}</span>, csv: (r) => r.warehouseId?.code || r.warehouseId?.name },
    { id: "available", header: "Available", align: "right", cell: (r) => <span className="font-semibold"><Num value={r.available} tone={(Number(r.available) || 0) <= 0 ? "text-danger-fg" : r.isLow ? "text-warning-fg" : undefined} /></span>, csv: (r) => r.available },
    { id: "reserved", header: "Reserved", align: "right", cell: (r) => <Num value={r.reserved} muted />, csv: (r) => r.reserved },
    { id: "committed", header: "Committed", align: "right", cell: (r) => <Num value={r.committed} muted />, csv: (r) => r.committed },
    { id: "incoming", header: "Incoming", align: "right", cell: (r) => <Num value={r.incoming} muted />, csv: (r) => r.incoming },
    { id: "damaged", header: "Damaged", align: "right", cell: (r) => <Num value={r.damaged} muted tone={r.damaged ? "text-danger-fg" : undefined} />, csv: (r) => r.damaged, mobile: "hidden" },
    { id: "threshold", header: "Threshold", align: "right", cell: (r) => (r.lowStockThreshold ? <Num value={r.lowStockThreshold} /> : <span className="text-fg-subtle">Off</span>), csv: (r) => r.lowStockThreshold, mobile: "hidden" },
    { id: "level", header: "Status", cell: (r) => <LevelBadge row={r} />, csv: (r) => ((Number(r.available) || 0) <= 0 ? "out_of_stock" : r.isLow ? "low" : "in_stock") },
    {
      id: "actions",
      header: "",
      hideable: false,
      csv: false,
      width: 48,
      align: "right",
      cell: (r) => (
        <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${r.sku} in ${r.warehouseId?.name || "warehouse"}`} size="sm" />}>
          <PermissionGate perm="inventory.adjust" mode="hide">
            <MenuItem icon={SlidersHorizontal} onSelect={() => setDialog({ kind: "adjust", row: r })}>
              Adjust…
            </MenuItem>
          </PermissionGate>
          <PermissionGate perm="inventory.adjust" mode="hide">
            <MenuItem icon={PencilRuler} onSelect={() => setDialog({ kind: "set", row: r })}>
              Set quantity…
            </MenuItem>
          </PermissionGate>
          <PermissionGate perm="inventory.transfer" mode="hide">
            <MenuItem icon={ArrowLeftRight} onSelect={() => setDialog({ kind: "transfer", row: r })}>
              Transfer…
            </MenuItem>
          </PermissionGate>
          <PermissionGate perm="inventory.publish" mode="hide">
            <MenuItem icon={Gauge} onSelect={() => setDialog({ kind: "thresholds", row: r })}>
              Edit thresholds…
            </MenuItem>
          </PermissionGate>
          {can(["inventory.adjust", "inventory.transfer", "inventory.publish"]) ? <MenuSeparator /> : null}
          <MenuItem icon={History} onSelect={() => onViewHistory({ variantId: variantIdOf(r), warehouseId: warehouseIdOf(r) })}>
            View history
          </MenuItem>
        </DropdownMenu>
      ),
    },
  ];

  const filtered = table.activeCount > 0;

  return (
    <>
      <DataTable
        storageKey="tenant-inventory-stock"
        exportFilename="inventory-page"
        caption="Stock levels by product variant and warehouse"
        table={table}
        data={rows}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        columns={columns}
        toolbar={
          <FilterBar table={table} searchPlaceholder="Search product or SKU" facets={facets}>
            {variantChip ? (
              <Badge tone="primary" size="md" className="pr-1">
                Variant: {variantChip}
                <button type="button" aria-label="Clear variant filter" onClick={() => table.setFilter("variantId", "")} className="ml-1 grid size-4 place-items-center rounded-full hover:bg-surface-hover">
                  <X aria-hidden className="size-3" />
                </button>
              </Badge>
            ) : null}
          </FilterBar>
        }
        emptyState={
          filtered ? (
            <EmptyState
              icon={Boxes}
              title={table.filters.lowStock ? "Nothing is running low" : "No stock matches"}
              description={table.filters.lowStock ? "Every item in this view is above its low-stock threshold." : "Try a different search or clear the filters."}
              action={<Button size="sm" onClick={table.reset}>Clear filters</Button>}
            />
          ) : (
            <EmptyState
              icon={Boxes}
              title="No stock yet"
              description="Stock rows appear when you receive units for a product variant in a warehouse."
              action={
                <PermissionGate perm="inventory.adjust">
                  <Button size="sm" variant="primary" onClick={() => setDialog({ kind: "adjust", row: null })}>
                    Receive stock
                  </Button>
                </PermissionGate>
              }
            />
          )
        }
      />
      <AdjustDialog open={dialog?.kind === "adjust"} onOpenChange={close} row={dialog?.row || null} />
      <SetQuantityDialog open={dialog?.kind === "set"} onOpenChange={close} row={dialog?.row} />
      <TransferDialog open={dialog?.kind === "transfer"} onOpenChange={close} row={dialog?.row} />
      <ThresholdsDialog open={dialog?.kind === "thresholds"} onOpenChange={close} row={dialog?.row} />
    </>
  );
}
