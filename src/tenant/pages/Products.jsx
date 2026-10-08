import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Download, ExternalLink, FolderTree, MoreHorizontal, Package, Pencil, Plus, RotateCcw, Send, Tag, Upload, XCircle, EyeOff } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { PRODUCT_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { number } from "../../shared/lib/format.js";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DateTime,
  Dialog,
  DropdownMenu,
  EmptyState,
  FilterBar,
  IconButton,
  MenuItem,
  MenuSeparator,
  Money,
  PageHeader,
  StatusPill,
  toast,
} from "../../shared/ui/index.js";
import CatalogManager from "../../shared/components/CatalogManager.jsx";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";

const rowsOf = (res) => (Array.isArray(res) ? res : res?.data || []);

/** Status-changing operations on a product, each mapped to its endpoint and permission. */
const OPS = {
  publish: { label: "Publish", perm: "products.publish", icon: Send, run: (p) => api.publishProduct(p._id), eligible: (p) => ["draft", "pending_review", "scheduled"].includes(p.status), done: "published" },
  unpublish: { label: "Unpublish (to draft)", perm: "products.edit", icon: EyeOff, run: (p) => api.updateProduct(p._id, { status: "draft" }), eligible: (p) => p.status === "published", done: "moved to draft", tone: "danger" },
  archive: { label: "Archive", perm: "products.delete", icon: Archive, run: (p) => api.archiveProduct(p._id), eligible: (p) => p.status !== "archived", done: "archived", tone: "danger" },
  restore: { label: "Restore as draft", perm: "products.edit", icon: RotateCcw, run: (p) => api.updateProduct(p._id, { status: "draft" }), eligible: (p) => p.status === "archived", done: "restored as draft" },
};

const OP_COPY = {
  publish: "Published products become visible and purchasable in your storefront right away.",
  unpublish: "The products disappear from the storefront until they are published again. Carts holding them can’t check out.",
  archive: "Archived products are hidden everywhere and their stock is no longer sold. You can restore them later from the Archived filter.",
  restore: "The products come back as drafts; publish them when ready.",
};

function ProductCell({ p }) {
  return (
    <span className="flex min-w-0 items-center gap-3">
      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-sunken">
        {p.images?.[0] ? <img src={p.images[0]} alt="" className="size-full object-cover" loading="lazy" /> : <Package aria-hidden className="size-4 text-fg-subtle" />}
      </span>
      <span className="min-w-0">
        <span className="block truncate">{p.name}</span>
        <span className="block truncate font-mono text-ui-xs font-normal text-fg-subtle">{p.primarySku || p.sku}</span>
      </span>
    </span>
  );
}

export default function Products() {
  const can = useCan();
  const queryClient = useQueryClient();
  const table = useUrlTableState({ filters: ["status", "categoryId", "brandId", "bulkEligible"], defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.products.list(table.query), queryFn: () => api.listStaffProducts(table.query), ...listQueryOptions });
  const categories = useQuery({ queryKey: keys.categories.list({}), queryFn: () => api.listCategories(), staleTime: 300_000 });
  const brands = useQuery({ queryKey: keys.brands.list({}), queryFn: () => api.listBrands(), staleTime: 300_000, enabled: can("brands.view") });
  const [manager, setManager] = useState(null);
  const [pending, setPending] = useState(null); // { op, rows, clear }
  const [report, setReport] = useState(null);
  const [exporting, setExporting] = useState(false);

  async function runOp({ op, rows, clear }) {
    const def = OPS[op];
    const eligible = rows.filter(def.eligible);
    const results = [];
    for (const p of eligible) {
      try {
        await def.run(p);
        results.push({ p, ok: true });
      } catch (err) {
        results.push({ p, ok: false, message: err?.message || "Failed" });
      }
    }
    await queryClient.invalidateQueries({ queryKey: keys.products.all });
    const failed = results.filter((r) => !r.ok);
    const skipped = rows.filter((r) => !eligible.includes(r));
    if (rows.length === 1 && failed.length) throw new Error(failed[0].message);
    if (rows.length === 1 && !failed.length && !skipped.length) {
      toast.success(`${rows[0].name} ${def.done}`);
    } else if (!failed.length && !skipped.length) {
      toast.success(`${results.length} products ${def.done}`);
    } else {
      setReport({ label: def.label, results, skipped });
    }
    clear?.();
  }

  async function exportCsv() {
    setExporting(true);
    try {
      const { page: _p, limit: _l, sort: _s, order: _o, ...query } = table.query;
      const res = await api.exportProductsCsv(query);
      toast.success("Products exported", { description: res?.filename });
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const catOptions = rowsOf(categories.data).map((c) => ({ value: String(c._id), label: c.name }));
  const brandOptions = rowsOf(brands.data).map((b) => ({ value: String(b._id), label: b.name }));

  function rowMenu(p) {
    const ops = Object.entries(OPS).filter(([, d]) => d.eligible(p));
    return (
      <DropdownMenu trigger={<IconButton icon={MoreHorizontal} size="xs" label={`Actions for ${p.name}`} />}>
        <MenuItem icon={Pencil} to={`/tenant/products/${p._id}`}>
          {can("products.edit") ? "Edit" : "View"}
        </MenuItem>
        {p.slug && p.status === "published" ? (
          <MenuItem icon={ExternalLink} onSelect={() => window.open(`/product/${p.slug}`, "_blank", "noopener")}>
            View in store
          </MenuItem>
        ) : null}
        {ops.length ? <MenuSeparator /> : null}
        {ops.map(([id, d]) => (
          <MenuItem key={id} icon={d.icon} tone={d.tone} disabled={!can(d.perm)} title={!can(d.perm) ? `Requires ${d.perm}` : undefined} onSelect={() => setPending({ op: id, rows: [p] })}>
            {d.label}
          </MenuItem>
        ))}
      </DropdownMenu>
    );
  }

  const pendingDef = pending ? OPS[pending.op] : null;
  const pendingEligible = pending ? pending.rows.filter(pendingDef.eligible) : [];

  return (
    <>
      <PageHeader
        title="Products"
        description="Your catalog: details, variants and prices. Stock is managed in Inventory."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Products" }]}
        secondaryActions={
          <>
            <DropdownMenu trigger={<Button size="sm">Catalog setup</Button>}>
              <MenuItem icon={FolderTree} onSelect={() => setManager("category")} disabled={!can("categories.view") && !can("categories.create")}>
                Categories
              </MenuItem>
              <MenuItem icon={Tag} onSelect={() => setManager("brand")} disabled={!can("brands.view")}>
                Brands
              </MenuItem>
            </DropdownMenu>
            <PermissionGate perm="products.create" mode="hide">
              <Button size="sm" leftIcon={Upload} to="/tenant/products/import">
                Import
              </Button>
            </PermissionGate>
            <PermissionGate perm={["products.create", "products.edit"]} mode="hide">
              <Button size="sm" leftIcon={Download} loading={exporting} onClick={exportCsv} title="Exports the products matching the current search and filters, in the import format">
                Export
              </Button>
            </PermissionGate>
          </>
        }
        primaryAction={
          <PermissionGate perm="products.create">
            <Button size="sm" variant="primary" leftIcon={Plus} to="/tenant/products/new">
              Add product
            </Button>
          </PermissionGate>
        }
      />

      <DataTable
        storageKey="tenant-products"
        exportFilename="products-page"
        caption="Products"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(p) => `/tenant/products/${p._id}`}
        selectable={can(["products.publish", "products.edit", "products.delete"])}
        bulkActions={(rows, clear) =>
          Object.entries(OPS)
            .filter(([, d]) => can(d.perm) && rows.some(d.eligible))
            .map(([id, d]) => (
              <Button key={id} size="xs" variant={d.tone === "danger" ? "danger-ghost" : "secondary"} leftIcon={d.icon} onClick={() => setPending({ op: id, rows, clear })}>
                {d.label} ({rows.filter(d.eligible).length})
              </Button>
            ))
        }
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Name, SKU, tag or description"
            facets={[
              { key: "status", title: "Status", options: statusOptions(PRODUCT_STATUSES) },
              ...(catOptions.length ? [{ key: "categoryId", title: "Category", options: catOptions }] : []),
              ...(brandOptions.length ? [{ key: "brandId", title: "Brand", options: brandOptions }] : []),
              { key: "bulkEligible", title: "Wholesale", options: [{ value: "true", label: "Bulk eligible" }, { value: "false", label: "Not bulk" }] },
            ]}
          />
        }
        columns={[
          { id: "name", header: "Product", primary: true, accessorKey: "name", cell: (p) => <ProductCell p={p} />, csv: (p) => p.name },
          {
            id: "status",
            header: "Status",
            cell: (p) => (
              <span className="inline-flex flex-col items-start gap-0.5">
                <StatusPill status={p.status} />
                {p.status === "scheduled" && p.scheduledAt ? (
                  <span className="text-ui-xs text-fg-subtle">
                    <DateTime value={p.scheduledAt} />
                  </span>
                ) : null}
                {p.enabled === false ? <Badge tone="warning">Disabled</Badge> : null}
              </span>
            ),
            csv: (p) => p.status,
            mobile: "meta",
          },
          { id: "category", header: "Category", accessorFn: (p) => p.categoryId?.name, mobile: "subtitle" },
          { id: "brand", header: "Brand", accessorFn: (p) => p.brandId?.name, defaultHidden: true },
          { id: "variants", header: "Variants", align: "right", accessorFn: (p) => p.variantsCount },
          {
            id: "price",
            header: "Price",
            align: "right",
            cell: (p) => (
              <span>
                {p.variantsCount > 1 ? <span className="text-ui-xs text-fg-subtle">from </span> : null}
                <Money value={p.sellingPrice} />
              </span>
            ),
            csv: (p) => p.sellingPrice,
            mobile: "meta",
          },
          {
            id: "stock",
            header: "Available",
            align: "right",
            cell: (p) => <span className={p.available === 0 ? "font-medium text-danger-fg" : undefined}>{number(p.available)}</span>,
            csv: (p) => p.available,
            mobile: "meta",
          },
          { id: "updated", header: "Updated", cell: (p) => <DateTime value={p.updatedAt} format="date" />, defaultHidden: true },
          { id: "actions", header: <span className="sr-only">Actions</span>, align: "right", hideable: false, csv: false, cell: (p) => rowMenu(p) },
        ]}
        emptyState={
          <EmptyState
            icon={Package}
            title={table.activeCount ? "No products match these filters" : "No products yet"}
            description={table.activeCount ? "Try a different search or clear the filters." : "Add your first product or import your catalog from a CSV file."}
            action={
              table.activeCount ? (
                <Button size="sm" onClick={table.reset}>
                  Clear filters
                </Button>
              ) : can("products.create") ? (
                <>
                  <Button size="sm" variant="primary" to="/tenant/products/new">
                    Add product
                  </Button>
                  <Button size="sm" to="/tenant/products/import">
                    Import CSV
                  </Button>
                </>
              ) : null
            }
          />
        }
      />

      {manager ? <CatalogManager kind={manager} open onOpenChange={(o) => !o && setManager(null)} /> : null}

      <ConfirmDialog
        open={Boolean(pending)}
        onOpenChange={(o) => !o && setPending(null)}
        title={pending ? (pending.rows.length === 1 ? `${pendingDef.label}: ${pending.rows[0].name}?` : `${pendingDef.label} ${pendingEligible.length} products?`) : ""}
        description={pending ? OP_COPY[pending.op] : ""}
        confirmLabel={pendingDef?.label}
        tone={pendingDef?.tone === "danger" ? "danger" : "primary"}
        onConfirm={() => runOp(pending)}
      >
        {pending && pending.rows.length > pendingEligible.length ? (
          <Alert tone="info">{pending.rows.length - pendingEligible.length} selected product(s) are not eligible and will be skipped.</Alert>
        ) : null}
      </ConfirmDialog>

      <Dialog open={Boolean(report)} onOpenChange={(o) => !o && setReport(null)} title={report ? `${report.label}: results` : ""} footer={<Button variant="primary" onClick={() => setReport(null)}>Done</Button>}>
        {report ? (
          <div className="grid gap-3 text-ui-sm">
            <p>
              {report.results.filter((r) => r.ok).length} updated · {report.results.filter((r) => !r.ok).length} failed · {report.skipped.length} skipped
            </p>
            <ul className="grid max-h-80 gap-1 overflow-y-auto">
              {report.results.map((r) => (
                <li key={r.p._id} className="flex items-start gap-2">
                  {r.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 text-success" /> : <XCircle aria-hidden className="mt-0.5 size-4 text-danger" />}
                  <span>
                    <span className="font-medium">{r.p.name}</span>
                    {r.ok ? "" : ` — ${r.message}`}
                  </span>
                </li>
              ))}
              {report.skipped.map((p) => (
                <li key={p._id} className="text-fg-muted">
                  {p.name} — skipped (not eligible)
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
