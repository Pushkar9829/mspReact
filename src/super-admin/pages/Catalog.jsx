import { useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, Download, ImageIcon, Package, Plus, Send } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useApiMutation, useInvalidate } from "../../shared/hooks/useApiMutation.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { PRODUCT_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  Dialog,
  EmptyState,
  Field,
  FilterBar,
  FacetFilter,
  Input,
  Money,
  NativeSelect,
  PageHeader,
  RelativeTime,
  StatusPill,
  Tooltip,
  toast,
} from "../../shared/ui/index.js";
import { TenantFilter, TenantLink, useTenantScope } from "./lib/tenantScope.jsx";
import { BulkResultDialog, parseNum, refId, runBulk } from "./lib/catalogShared.jsx";

const BULK_OPTIONS = [
  { value: "true", label: "Bulk eligible" },
  { value: "false", label: "Not bulk eligible" },
];

function Thumb({ src, alt }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-sunken">
      {src ? <img src={src} alt={alt || ""} loading="lazy" className="size-full object-cover" /> : <ImageIcon aria-hidden className="size-4 text-fg-subtle" />}
    </span>
  );
}

export default function Catalog() {
  const can = useCan();
  const navigate = useNavigate();
  const invalidate = useInvalidate();
  const [, setParams] = useSearchParams();
  const scope = useTenantScope();
  const tenantId = scope.tenantId;
  const table = useUrlTableState({ filters: ["status", "categoryId", "brandId", "bulkEligible"], defaults: { limit: 20 } });

  const query = useMemo(() => ({ ...table.query, ...(tenantId ? { tenantId } : {}) }), [table.query, tenantId]);
  const q = useQuery({
    queryKey: keys.products.list({ ...query, scope: "platform" }),
    queryFn: () => scope.api.listStaffProducts(query),
    ...listQueryOptions,
  });

  // Category filter: tenant + shared categories when a tenant is chosen, every category otherwise.
  const categories = useQuery({
    queryKey: keys.categories.list({ tenant: tenantId || "all" }),
    queryFn: () => api.withTenant(null).listCategories(tenantId ? { tenantId } : { scope: "all" }),
    staleTime: 5 * 60_000,
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
  });
  const brands = useQuery({
    queryKey: keys.brands.list({ tenant: tenantId }),
    queryFn: () => api.withTenant(tenantId).listBrands(),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
  });

  function changeTenant(id) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (id) next.set("tenant", id);
      else next.delete("tenant");
      // Category/brand ids are tenant specific.
      next.delete("brandId");
      next.delete("categoryId");
      next.delete("page");
      return next;
    });
  }

  const [confirm, setConfirm] = useState(null); // { kind: "publish" | "archive", rows, clear }
  const [result, setResult] = useState(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function runConfirmed() {
    const { kind, rows, clear } = confirm;
    const res = await runBulk(
      rows,
      (p) => {
        const tApi = api.withTenant(refId(p.tenantId) || null);
        return kind === "publish" ? tApi.publishProduct(p._id) : tApi.deleteProduct(p._id);
      },
      {
        skip: (p) =>
          p.status === "archived"
            ? kind === "publish"
              ? "Archived products must be restored before publishing"
              : "Already archived"
            : kind === "publish" && p.status === "published"
              ? "Already published"
              : null,
      }
    );
    await invalidate(keys.products.all);
    clear?.();
    if (res.failed.length || res.skipped.length) {
      setResult({ ...res, title: kind === "publish" ? "Publish finished" : "Archive finished" });
    } else {
      toast.success(kind === "publish" ? `${res.ok.length} product${res.ok.length === 1 ? "" : "s"} published` : `${res.ok.length} product${res.ok.length === 1 ? "" : "s"} archived`);
    }
  }

  const canExport = can(["products.create", "products.edit"]);
  async function exportCsv() {
    setExporting(true);
    try {
      const f = table.filters;
      await scope.api.exportProductsCsv({
        ...(f.status ? { status: f.status } : {}),
        ...(f.categoryId ? { categoryId: f.categoryId } : {}),
        ...(f.brandId ? { brandId: f.brandId } : {}),
      });
    } catch (err) {
      toast.error(err?.message || "Export failed");
    } finally {
      setExporting(false);
    }
  }

  const categoryOptions = (categories.data || []).map((c) => ({ value: String(c._id), label: c.tenantId ? c.name : `${c.name} (shared)` }));
  const brandOptions = (brands.data || []).map((b) => ({ value: String(b._id), label: b.name }));

  const columns = [
    {
      id: "product",
      header: "Product",
      primary: true,
      accessorFn: (p) => p.name,
      csv: (p) => p.name,
      cell: (p) => (
        <span className="flex min-w-0 items-center gap-3">
          <Thumb src={p.images?.[0]} alt="" />
          <span className="grid min-w-0">
            <span className="truncate">{p.name}</span>
            <span className="truncate font-mono text-ui-xs font-normal text-fg-subtle">{p.sku}</span>
          </span>
        </span>
      ),
    },
    { id: "sku", header: "SKU", accessorKey: "sku", defaultHidden: true, mobile: "hidden" },
    { id: "tenant", header: "Tenant", cell: (p) => <TenantLink tenant={p.tenantId} />, csv: (p) => p.tenantId?.name || refId(p.tenantId), mobile: "subtitle" },
    { id: "category", header: "Category", accessorFn: (p) => p.categoryId?.name, csv: (p) => p.categoryId?.name || "" },
    { id: "brand", header: "Brand", accessorFn: (p) => p.brandId?.name, defaultHidden: true },
    {
      id: "price",
      header: "Price",
      align: "right",
      csv: (p) => p.sellingPrice ?? "",
      cell: (p) => (
        <span className="grid justify-items-end">
          <span>
            {p.variantsCount > 1 && p.sellingPrice != null ? <span className="mr-1 text-ui-xs text-fg-subtle">from</span> : null}
            <Money value={p.sellingPrice} />
          </span>
          {p.variantsCount > 1 ? <span className="text-ui-2xs text-fg-subtle">{p.variantsCount} variants</span> : null}
        </span>
      ),
    },
    { id: "available", header: "Available", align: "right", accessorFn: (p) => p.available, cell: (p) => (p.available == null ? "—" : Number(p.available).toLocaleString("en-IN")), defaultHidden: true },
    {
      id: "status",
      header: "Status",
      mobile: "meta",
      csv: (p) => p.status,
      cell: (p) => (
        <span className="inline-flex flex-wrap items-center gap-1">
          <StatusPill status={p.status} />
          {p.enabled === false ? <Badge tone="neutral">Disabled</Badge> : null}
          {p.wholesale?.bulkEligible ? <Badge tone="info">Bulk</Badge> : null}
        </span>
      ),
    },
    { id: "updated", header: "Updated", mobile: "meta", csv: (p) => p.updatedAt, cell: (p) => <RelativeTime value={p.updatedAt} /> },
  ];

  const createAction =
    tenantId && can("products.create") ? (
      <Button variant="primary" leftIcon={Plus} onClick={() => setCreateOpen(true)}>
        New product
      </Button>
    ) : can("products.create") ? (
      <Tooltip content="Choose a tenant first: products are created inside a store">
        <span tabIndex={0} className="inline-flex">
          <Button variant="primary" leftIcon={Plus} disabled>
            New product
          </Button>
        </span>
      </Tooltip>
    ) : null;

  return (
    <>
      <PageHeader
        title="Catalog"
        description="Products across every store. Pick a tenant to narrow the list, filter by its brands or add a product."
        breadcrumbs={[{ label: "Catalog" }]}
        primaryAction={createAction}
        secondaryActions={
          canExport ? (
            <Tooltip content={tenantId ? "Exports this tenant's products (status filter applied; search and other filters are not)." : "Exports every tenant's products (status filter applied; search and other filters are not)."}>
              <Button leftIcon={Download} loading={exporting} onClick={exportCsv}>
                Export CSV
              </Button>
            </Tooltip>
          ) : null
        }
      />
      <DataTable
        storageKey="sa-catalog"
        exportFilename="catalog-page"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(p) => `/super-admin/catalog/${p._id}`}
        columns={columns}
        selectable={can("products.publish") || can("products.delete")}
        bulkActions={(rows, clear) => (
          <>
            {can("products.publish") ? (
              <Button size="xs" leftIcon={Send} onClick={() => setConfirm({ kind: "publish", rows, clear })}>
                Publish
              </Button>
            ) : null}
            {can("products.delete") ? (
              <Button size="xs" variant="danger-ghost" leftIcon={Archive} onClick={() => setConfirm({ kind: "archive", rows, clear })}>
                Archive
              </Button>
            ) : null}
          </>
        )}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Search name, SKU, tags"
            facets={[
              { key: "status", title: "Status", options: statusOptions(PRODUCT_STATUSES) },
              { key: "bulkEligible", title: "Wholesale", options: BULK_OPTIONS },
            ]}
          >
            <TenantFilter value={tenantId} onChange={changeTenant} />
            {categoryOptions.length ? <FacetFilter title="Category" options={categoryOptions} value={table.filters.categoryId} onChange={(v) => table.setFilter("categoryId", v)} /> : null}
            {tenantId && brandOptions.length ? <FacetFilter title="Brand" options={brandOptions} value={table.filters.brandId} onChange={(v) => table.setFilter("brandId", v)} /> : null}
          </FilterBar>
        }
        emptyState={
          <EmptyState
            icon={Package}
            title={table.activeCount || tenantId ? "No products match" : "No products yet"}
            description={
              table.activeCount
                ? "Try changing or clearing the filters. Archived products only show with the Archived status filter."
                : tenantId
                  ? "This store hasn't added products yet."
                  : "Stores add products from their own panel."
            }
            action={
              table.activeCount ? (
                <Button size="sm" onClick={table.reset}>
                  Clear filters
                </Button>
              ) : tenantId && can("products.create") ? (
                <Button size="sm" variant="primary" leftIcon={Plus} onClick={() => setCreateOpen(true)}>
                  New product
                </Button>
              ) : null
            }
          />
        }
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={confirm?.kind === "publish" ? `Publish ${confirm?.rows.length} product${confirm?.rows.length === 1 ? "" : "s"}?` : `Archive ${confirm?.rows.length} product${confirm?.rows.length === 1 ? "" : "s"}?`}
        description={
          confirm?.kind === "publish"
            ? "They become visible to buyers in their store immediately (if enabled and in stock). Archived products are skipped."
            : "Archived products disappear from the storefront and from the default catalog list, and can't be ordered. Stock and order history are kept; a product can be restored from its page."
        }
        confirmLabel={confirm?.kind === "publish" ? "Publish" : "Archive"}
        tone={confirm?.kind === "archive" ? "danger" : "primary"}
        onConfirm={runConfirmed}
      />
      <BulkResultDialog result={result} labelOf={(p) => `${p.name} (${p.sku})`} onClose={() => setResult(null)} />
      {tenantId ? (
        <CreateProductDialog
          open={createOpen}
          onOpenChange={setCreateOpen}
          tenantId={tenantId}
          categories={categories.data || []}
          brands={brands.data || []}
          canPublish={can("products.publish")}
          onCreated={(p) => navigate(`/super-admin/catalog/${p._id}`)}
        />
      ) : null}
    </>
  );
}

const EMPTY_CREATE = { name: "", sku: "", sellingPrice: "", listPrice: "", packSize: "", categoryId: "", brandId: "", status: "draft" };

function CreateProductDialog({ open, onOpenChange, tenantId, categories, brands, canPublish, onCreated }) {
  const [form, setForm] = useState(EMPTY_CREATE);
  const [errors, setErrors] = useState({});
  const dirty = JSON.stringify(form) !== JSON.stringify(EMPTY_CREATE);
  const create = useApiMutation((body) => api.withTenant(tenantId).createProduct(body), {
    invalidate: [keys.products.all],
    success: "Product created",
    error: false,
    onSuccess: (p) => {
      setForm(EMPTY_CREATE);
      onOpenChange(false);
      onCreated?.(p);
    },
  });
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const err = (k) => errors[k] || create.error?.fieldError?.(k) || (k === "sellingPrice" ? create.error?.fieldError?.("variant.sellingPrice") : undefined);

  function submit(e) {
    e.preventDefault();
    const next = {};
    const selling = parseNum(form.sellingPrice);
    const list = parseNum(form.listPrice);
    if (!form.name.trim()) next.name = "Name is required";
    else if (form.name.trim().length > 200) next.name = "At most 200 characters";
    if (!form.sku.trim()) next.sku = "SKU is required";
    else if (form.sku.trim().length > 80) next.sku = "At most 80 characters";
    if (selling === undefined) next.sellingPrice = "Selling price is required";
    else if (!Number.isFinite(selling) || selling < 0 || selling > 1e9) next.sellingPrice = "Enter a price between 0 and 1,000,000,000";
    if (list !== undefined && (!Number.isFinite(list) || list < 0 || list > 1e9)) next.listPrice = "Enter a price between 0 and 1,000,000,000";
    if (form.packSize.length > 40) next.packSize = "At most 40 characters";
    setErrors(next);
    if (Object.keys(next).length) return;
    const body = {
      name: form.name.trim(),
      sku: form.sku.trim(),
      sellingPrice: selling,
      ...(list !== undefined ? { listPrice: list } : {}),
      ...(form.packSize.trim() ? { packSize: form.packSize.trim() } : {}),
      ...(form.categoryId ? { categoryId: form.categoryId } : {}),
      ...(form.brandId ? { brandId: form.brandId } : {}),
      status: form.status,
    };
    create.mutate(body);
  }

  const generalError = create.error && !Object.keys(create.error.fields || {}).length ? create.error.message : null;

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setErrors({});
        onOpenChange(o);
      }}
      dirty={dirty}
      busy={create.isPending}
      title="New product"
      description={
        <>
          Created as a draft in <TenantLink tenant={tenantId} />. Add variants, images and details on the next page.
        </>
      }
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={create.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="sa-create-product" variant="primary" loading={create.isPending}>
            Create product
          </Button>
        </>
      }
    >
      <form id="sa-create-product" onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Name" required error={err("name")}>
          <Input value={form.name} onChange={set("name")} maxLength={200} autoFocus />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" required error={err("sku")} hint="Stored in upper case; unique within the store.">
            <Input value={form.sku} onChange={set("sku")} maxLength={80} className="font-mono" />
          </Field>
          <Field label="Pack size" optional error={err("packSize")} hint="e.g. 500 g, 1 pc">
            <Input value={form.packSize} onChange={set("packSize")} maxLength={40} />
          </Field>
          <Field label="Selling price" required error={err("sellingPrice")}>
            <Input type="number" inputMode="decimal" min={0} step="0.01" prefix="₹" value={form.sellingPrice} onChange={set("sellingPrice")} />
          </Field>
          <Field label="List price (MRP)" optional error={err("listPrice")} hint="Defaults to the selling price.">
            <Input type="number" inputMode="decimal" min={0} step="0.01" prefix="₹" value={form.listPrice} onChange={set("listPrice")} />
          </Field>
          <Field label="Category" optional error={err("categoryId")}>
            <NativeSelect value={form.categoryId} onChange={set("categoryId")} placeholder="No category" options={categories.map((c) => ({ value: String(c._id), label: c.tenantId ? c.name : `${c.name} (shared)` }))} />
          </Field>
          <Field label="Brand" optional error={err("brandId")}>
            <NativeSelect value={form.brandId} onChange={set("brandId")} placeholder="No brand" options={brands.map((b) => ({ value: String(b._id), label: b.name }))} />
          </Field>
        </div>
        <Field label="Status" error={err("status")} hint={canPublish ? "Published products go live immediately." : "Publishing requires products.publish."}>
          <NativeSelect
            value={form.status}
            onChange={set("status")}
            options={[
              { value: "draft", label: "Draft" },
              { value: "pending_review", label: "Pending review" },
              ...(canPublish ? [{ value: "published", label: "Published" }] : []),
            ]}
          />
        </Field>
        {generalError ? <Alert tone="danger">{generalError}</Alert> : null}
      </form>
    </Dialog>
  );
}
