import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, Boxes, ExternalLink, MoreHorizontal, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { fromIstInputValue, number, toIstInputValue } from "../../shared/lib/format.js";
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  MenuItem,
  Money,
  NativeSelect,
  PageHeader,
  PageSkeleton,
  StatusPill,
  Switch,
  Textarea,
  UnsavedChangesDialog,
  toast,
} from "../../shared/ui/index.js";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";
import { ImagesField, KeyValueRows, intError, isBlank, keyValueErrors } from "./products/fields.jsx";
import { VariantFields, VariantSheet, variantErrors, variantFormFrom, variantPayload } from "./products/VariantSheet.jsx";

const rowsOf = (res) => (Array.isArray(res) ? res : res?.data || []);
const idOf = (v) => (v && typeof v === "object" ? v._id : v) || "";
const GST_SLABS = [0, 5, 12, 18, 28];
const SPEC_KEY = /^.{1,80}$/;

const isSpecScalar = (v) => v == null || ["string", "number", "boolean"].includes(typeof v);
/** Scalars and lists of scalars are editable as text; nested objects / label-value tables are shown read-only and kept as-is. */
const isEditableSpec = (v) => isSpecScalar(v) || (Array.isArray(v) && v.every((x) => isSpecScalar(x) && x != null));
const specText = (v) => (Array.isArray(v) ? v.join(", ") : v == null ? "" : String(v));

function specRowsFrom(specs) {
  return Object.entries(specs || {})
    .filter(([, value]) => isEditableSpec(value))
    .map(([key, value]) => ({ key, value: specText(value), orig: value }));
}
function specFixedFrom(specs) {
  return Object.fromEntries(Object.entries(specs || {}).filter(([, value]) => !isEditableSpec(value)));
}
function specSummary(v) {
  if (Array.isArray(v)) {
    return v
      .map((r) => (r && typeof r === "object" ? `${r.label || r.name || r.key || ""}: ${specText(r.value)}${r.unit ? ` ${r.unit}` : ""}` : specText(r)))
      .join("; ");
  }
  if (v && typeof v === "object") return Object.entries(v).map(([k, x]) => `${k}: ${specText(x)}`).join("; ");
  return specText(v);
}

function formFrom(p, defaultTaxRate) {
  const w = p?.wholesale || {};
  return {
    name: p?.name || "",
    sku: p?.sku || "",
    barcode: p?.barcode || "",
    description: p?.description || "",
    images: p?.images || [],
    tags: (p?.tags || []).join(", "),
    categoryId: idOf(p?.categoryId),
    brandId: idOf(p?.brandId),
    hsn: p?.hsn || "",
    taxRate: p?.taxClass?.rate != null ? String(p.taxClass.rate) : String(defaultTaxRate ?? 18),
    status: p?.status && p.status !== "archived" ? p.status : "draft",
    scheduledAt: toIstInputValue(p?.scheduledAt),
    enabled: p?.enabled !== false,
    easyReturn: Boolean(p?.easyReturn),
    deliveryModes: p?.deliveryModes?.length ? p.deliveryModes : ["delivery_partner"],
    bulkEligible: Boolean(w.bulkEligible),
    moq: String(w.moq ?? 1),
    maxQty: w.maxQty == null ? "" : String(w.maxQty),
    packMultiple: String(w.packMultiple ?? 1),
    caseQty: String(w.caseQty ?? 1),
    leadTimeDays: String(w.leadTimeDays ?? 0),
    specs: specRowsFrom(p?.specifications),
    specsFixed: specFixedFrom(p?.specifications),
  };
}

function validate(f) {
  const e = {};
  if (!f.name.trim()) e.name = "Name is required";
  else if (f.name.length > 200) e.name = "At most 200 characters";
  if (!f.sku.trim()) e.sku = "SKU is required";
  else if (f.sku.length > 80) e.sku = "At most 80 characters";
  if (f.description.length > 20000) e.description = "At most 20,000 characters";
  const tags = f.tags.split(",").map((t) => t.trim()).filter(Boolean);
  if (tags.length > 30) e.tags = "At most 30 tags";
  else if (tags.some((t) => t.length > 60)) e.tags = "Each tag at most 60 characters";
  if (f.hsn.length > 12) e.hsn = "At most 12 characters";
  else if (f.hsn && !/^\d{4,8}$/.test(f.hsn.trim())) e.hsn = "HSN codes are 4–8 digits";
  const rate = Number(f.taxRate);
  if (isBlank(f.taxRate) || !Number.isFinite(rate) || rate < 0 || rate > 100) e.taxRate = "0–100";
  if (f.status === "scheduled") {
    if (!f.scheduledAt) e.scheduledAt = "Pick a publish date and time";
    else if (new Date(fromIstInputValue(f.scheduledAt)).getTime() <= Date.now()) e.scheduledAt = "Must be in the future";
  }
  if (!f.deliveryModes.length) e.deliveryModes = "Choose at least one delivery mode";
  e.moq = intError(f.moq, { min: 1, required: true, label: "MOQ" });
  e.maxQty = intError(f.maxQty, { min: 1 }) || (!isBlank(f.maxQty) && Number(f.maxQty) < Number(f.moq) ? "Must be ≥ MOQ" : undefined);
  e.packMultiple = intError(f.packMultiple, { min: 1, required: true, label: "Pack multiple" });
  e.caseQty = intError(f.caseQty, { min: 1, required: true, label: "Case qty" });
  e.leadTimeDays = intError(f.leadTimeDays, { min: 0, max: 365, required: true, label: "Lead time" });
  e.specs = keyValueErrors(f.specs, SPEC_KEY) || (f.specs.some((r) => Object.hasOwn(f.specsFixed, r.key.trim())) ? "A specification with that name already exists" : undefined);
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

/** Product body from the form. Never contains stock, and prices only on create (via `variant`). */
function payload(f) {
  const rate = Number(f.taxRate);
  const body = {
    name: f.name.trim(),
    sku: f.sku.trim(),
    barcode: f.barcode.trim(),
    description: f.description,
    images: f.images,
    tags: f.tags.split(",").map((t) => t.trim()).filter(Boolean),
    categoryId: f.categoryId || null,
    brandId: f.brandId || null,
    hsn: f.hsn.trim(),
    taxClass: { name: `GST${rate}`, rate },
    status: f.status,
    scheduledAt: f.status === "scheduled" && f.scheduledAt ? fromIstInputValue(f.scheduledAt) : null,
    enabled: f.enabled,
    easyReturn: f.easyReturn,
    deliveryModes: f.deliveryModes,
    wholesale: {
      bulkEligible: f.bulkEligible,
      moq: Number(f.moq),
      maxQty: isBlank(f.maxQty) ? null : Number(f.maxQty),
      packMultiple: Number(f.packMultiple),
      caseQty: Number(f.caseQty),
      leadTimeDays: Number(f.leadTimeDays),
    },
    // Untouched values keep their original type (number, list…); read-only nested specs are passed through.
    specifications: {
      ...f.specsFixed,
      ...Object.fromEntries(f.specs.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.orig !== undefined && r.value.trim() === specText(r.orig).trim() ? r.orig : r.value.trim()])),
    },
  };
  return body;
}

/** Fields changed since load (PATCH sends nothing else). */
function diff(f, initial) {
  const a = payload(f);
  const b = payload(initial);
  const out = {};
  Object.keys(a).forEach((k) => {
    if (JSON.stringify(a[k]) !== JSON.stringify(b[k])) out[k] = a[k];
  });
  return out;
}

const STATUS_HELP = {
  draft: "Hidden from buyers.",
  pending_review: "Hidden; flagged for a teammate with publish rights.",
  scheduled: "Goes live automatically at the chosen time (IST).",
  published: "Visible and purchasable.",
};

function variantSummary(v) {
  const a = v.attributes || {};
  const custom = a.custom ? Object.entries(a.custom).map(([k, val]) => `${k}: ${val}`) : [];
  return [a.packSize || a.size, a.color, a.grade && `Grade ${a.grade}`, a.material, ...custom].filter(Boolean).join(" · ") || "—";
}

/** Keyed by id so /products/:id → /products/new never carries form state over. */
export default function ProductPage() {
  const { id } = useParams();
  return <ProductEditor key={id || "new"} id={id} />;
}

function ProductEditor({ id }) {
  const isNew = !id;
  const can = useCan();
  const navigate = useNavigate();
  const editable = isNew ? can("products.create") : can("products.edit");
  const canPublish = can("products.publish");

  const q = useQuery({ queryKey: keys.products.detail(id), queryFn: () => api.getStaffProduct(id), enabled: !isNew });
  const categories = useQuery({ queryKey: keys.categories.list({}), queryFn: () => api.listCategories(), staleTime: 300_000 });
  const brands = useQuery({ queryKey: keys.brands.list({}), queryFn: () => api.listBrands(), staleTime: 300_000, enabled: can("brands.view") });
  const product = q.data;
  const variants = product?.variants || [];
  const tenantQ = useQuery({ queryKey: keys.myTenant, queryFn: () => api.getMyTenant(), enabled: isNew, staleTime: 300_000 });
  const defaultTaxRate = tenantQ.data?.taxSettings?.defaultTaxRate;
  const blank = useMemo(() => formFrom(null, defaultTaxRate), [defaultTaxRate]);
  const stock = useQuery({
    queryKey: keys.inventory.list({ productId: id, limit: 100 }),
    queryFn: () => api.listInventory({ productId: product._id, limit: 100 }),
    enabled: Boolean(product) && can("inventory.view"),
  });
  const stockByVariant = useMemo(() => {
    const map = {};
    rowsOf(stock.data).forEach((r) => {
      const vid = idOf(r.variantId);
      map[vid] = (map[vid] || 0) + (Number(r.available) || 0);
    });
    return map;
  }, [stock.data]);

  const [form, setForm] = useState(() => formFrom(null));
  const [initial, setInitial] = useState(() => formFrom(null));
  const [variantForm, setVariantForm] = useState(() => variantFormFrom(null));
  const [loadedFor, setLoadedFor] = useState(isNew ? "new" : null);
  const [submitted, setSubmitted] = useState(false);
  const [variantSheet, setVariantSheet] = useState(null); // null | "new" | variant
  const [archiveVariant, setArchiveVariant] = useState(null);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [publishOpen, setPublishOpen] = useState(false);

  // New product: adopt the store's default GST rate once it loads, unless the form was already touched.
  useEffect(() => {
    if (!isNew || defaultTaxRate == null) return;
    setForm((f) => (JSON.stringify(f) === JSON.stringify(formFrom(null)) ? formFrom(null, defaultTaxRate) : f));
  }, [isNew, defaultTaxRate]);

  // Initialise the form once per product (never on background refetches — that would wipe edits).
  useEffect(() => {
    if (!isNew && product && loadedFor !== product._id) {
      const f = formFrom(product);
      setForm(f);
      setInitial(f);
      setLoadedFor(product._id);
    }
  }, [isNew, product, loadedFor]);

  const errors = validate(form);
  const vErrors = isNew ? variantErrors(variantForm, { skuOptional: true }) : {};
  const changes = isNew ? null : diff(form, initial);
  const dirty = isNew ? JSON.stringify(form) !== JSON.stringify(blank) || JSON.stringify(variantForm) !== JSON.stringify(variantFormFrom(null)) : Object.keys(changes).length > 0;

  const save = useApiMutation(
    (body) => (isNew ? api.createProduct(body) : api.updateProduct(id, body)),
    {
      invalidate: [keys.products.all],
      error: false,
      onSuccess: (res) => {
        if (isNew) {
          toast.success("Product created", { description: "Add stock for it in Inventory." });
          setForm(blank);
          setVariantForm(variantFormFrom(null));
          setTimeout(() => navigate(`/tenant/products/${res._id}`, { replace: true }), 0);
        } else {
          toast.success("Product saved");
          const f = formFrom({ ...product, ...res, variants });
          setForm(f);
          setInitial(f);
          setSubmitted(false);
        }
      },
    }
  );
  const publish = useApiMutation(() => api.publishProduct(id), { invalidate: [keys.products.all], success: "Product published" });
  const blocker = useUnsavedChangesGuard(dirty && !save.isPending);

  if (!isNew && q.isPending) return <PageSkeleton />;
  if (!isNew && q.error) {
    return (
      <>
        <PageHeader title="Product" back="/tenant/products" breadcrumbs={[{ label: "Products", to: "/tenant/products" }, { label: "Not available" }]} />
        <ErrorState error={q.error} title={q.error.status === 404 ? "Product not found" : "Couldn’t load this product"} onRetry={q.error.status === 404 ? undefined : q.refetch} />
      </>
    );
  }

  const archived = product?.status === "archived";
  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const shown = submitted ? errors : {};
  const apiErr = save.error;
  const fe = (name) => shown[name] || apiErr?.fieldError?.(name);
  const statusOptions = [
    { value: "draft", label: "Draft" },
    { value: "pending_review", label: "Pending review" },
    { value: "scheduled", label: "Scheduled", disabled: !canPublish },
    { value: "published", label: "Published", disabled: !canPublish && initial.status !== "published" },
  ];

  function submit(e) {
    e?.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length || Object.keys(vErrors).length) {
      toast.error("Fix the highlighted fields");
      return;
    }
    if (isNew) {
      const body = payload(form);
      if (!body.categoryId) delete body.categoryId;
      if (!body.brandId) delete body.brandId;
      if (!body.scheduledAt) delete body.scheduledAt;
      body.variant = variantPayload(variantForm);
      save.mutate(body);
    } else if (dirty) {
      save.mutate(changes);
    }
  }

  const title = isNew ? "Add product" : product.name;
  const catRows = rowsOf(categories.data);
  const brandRows = rowsOf(brands.data);
  const disabled = !editable || archived;

  return (
    <form onSubmit={submit} noValidate>
      <PageHeader
        title={title}
        documentTitle={isNew ? "Add product" : `Product · ${product.name}`}
        back="/tenant/products"
        breadcrumbs={[{ label: "Products", to: "/tenant/products" }, { label: isNew ? "New" : product.name }]}
        meta={!isNew ? <StatusPill status={product.status} /> : null}
        description={!isNew ? `SKU ${product.sku}${product.slug ? ` · /${product.slug}` : ""}` : "Create the product with its first variant. You can add more variants and stock after saving."}
        secondaryActions={
          !isNew ? (
            <>
              {product.slug && product.status === "published" ? (
                <Button size="sm" variant="ghost" leftIcon={ExternalLink} onClick={() => window.open(`/product/${product.slug}`, "_blank", "noopener")}>
                  View in store
                </Button>
              ) : null}
              {can("inventory.view") ? (
                <Button size="sm" leftIcon={Boxes} to={`/tenant/inventory?q=${encodeURIComponent(product.sku)}`}>
                  Stock
                </Button>
              ) : null}
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label="More product actions" variant="secondary" size="sm" />}>
                {archived ? (
                  <MenuItem disabled={!can("products.edit")} onSelect={() => save.mutate({ status: "draft" })}>
                    Restore as draft
                  </MenuItem>
                ) : (
                  <MenuItem icon={Archive} tone="danger" disabled={!can("products.delete")} onSelect={() => setArchiveOpen(true)}>
                    Archive product
                  </MenuItem>
                )}
              </DropdownMenu>
            </>
          ) : null
        }
        primaryAction={
          !isNew && !archived && product.status !== "published" ? (
            <PermissionGate perm="products.publish">
              <Button size="sm" leftIcon={Send} onClick={() => (dirty ? toast.error("Save or discard your changes first") : setPublishOpen(true))}>
                Publish now
              </Button>
            </PermissionGate>
          ) : null
        }
      />

      {archived ? <Alert tone="warning" className="mb-4" title="This product is archived">It’s hidden everywhere. Restore it as a draft to edit or sell it again.</Alert> : null}
      {product?.scheduleError && product?.status !== "scheduled" ? (
        <Alert tone="warning" className="mb-4" title="Scheduled publish didn’t happen">
          {product.scheduleError} The product went back to draft — schedule it again or publish it now.
        </Alert>
      ) : null}
      {!editable && !archived ? <Alert tone="info" className="mb-4">View only — editing requires {isNew ? "products.create" : "products.edit"}.</Alert> : null}
      {apiErr ? (
        <Alert tone="danger" className="mb-4" title="Couldn’t save the product">
          {apiErr.message}
          {apiErr.requestId ? <span className="block font-mono text-ui-2xs opacity-80">Reference: {apiErr.requestId}</span> : null}
        </Alert>
      ) : null}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4">
              <Field label="Name" required error={fe("name")}>
                <Input value={form.name} maxLength={200} disabled={disabled} onChange={(e) => set({ name: e.target.value })} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product SKU" required hint="Unique in your store; saved in upper case." error={fe("sku")}>
                  <Input value={form.sku} maxLength={80} disabled={disabled} className="font-mono" onChange={(e) => set({ sku: e.target.value })} />
                </Field>
                <Field label="Barcode" optional error={fe("barcode")}>
                  <Input value={form.barcode} maxLength={80} disabled={disabled} onChange={(e) => set({ barcode: e.target.value })} />
                </Field>
              </div>
              <Field label="Description" optional hint={`${form.description.length.toLocaleString("en-IN")}/20,000 · plain text, line breaks are kept`} error={fe("description")}>
                <Textarea rows={8} value={form.description} disabled={disabled} onChange={(e) => set({ description: e.target.value })} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Images" description="Upload or choose from your media library. Drag order with the arrows; the first image is the cover." />
            <CardBody>
              <ImagesField value={form.images} disabled={disabled} onChange={(images) => set({ images })} />
              {apiErr?.fieldError?.("images") ? <p className="mt-2 text-ui-xs text-danger-fg">{apiErr.fieldError("images")}</p> : null}
            </CardBody>
          </Card>

          {isNew ? (
            <Card>
              <CardHeader title="First variant & pricing" description="Every product has at least one variant. Add more after saving." />
              <CardBody>
                <VariantFields form={variantForm} setForm={setVariantForm} errors={submitted ? vErrors : {}} apiError={apiErr} disabled={disabled} skuOptional showStatus={false} />
              </CardBody>
            </Card>
          ) : (
            <Card>
              <CardHeader
                title="Variants"
                description="Each variant has its own SKU, prices, quantity slabs and stock."
                actions={
                  !archived ? (
                    <PermissionGate perm="products.create">
                      <Button size="sm" leftIcon={Plus} onClick={() => setVariantSheet("new")}>
                        Add variant
                      </Button>
                    </PermissionGate>
                  ) : null
                }
              />
              {variants.length ? (
                <div className="relative overflow-x-auto">
                  <table className="w-full text-ui-sm">
                    <caption className="sr-only">Variants</caption>
                    <thead className="bg-surface-2 text-ui-xs text-fg-muted">
                      <tr>
                        <th scope="col" className="px-4 py-2 text-left font-medium">Variant</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">List price</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Selling price</th>
                        <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Slabs</th>
                        <th scope="col" className="px-3 py-2 text-right font-medium">Available</th>
                        <th scope="col" className="px-4 py-2 text-right font-medium">
                          <span className="sr-only">Actions</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {variants.map((v) => (
                        <tr key={v._id} className="border-t border-border">
                          <td className="px-4 py-2.5">
                            <p className="flex flex-wrap items-center gap-1.5 font-mono text-ui-xs font-medium text-fg">
                              {v.sku}
                              {v.status !== "active" ? <StatusPill status={v.status} /> : null}
                            </p>
                            <p className="text-ui-xs text-fg-muted">{variantSummary(v)}</p>
                          </td>
                          <td className="px-3 py-2.5 text-right">
                            <Money value={v.listPrice} />
                          </td>
                          <td className="px-3 py-2.5 text-right font-medium">
                            <Money value={v.sellingPrice} />
                          </td>
                          <td className="hidden px-3 py-2.5 text-right tabular-nums sm:table-cell">{v.tierPrices?.length || "—"}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums">{can("inventory.view") ? (stock.isPending ? "…" : number(stockByVariant[v._id] ?? 0)) : "—"}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="flex justify-end gap-1">
                              <IconButton icon={Pencil} size="xs" label={`${can("products.edit") ? "Edit" : "View"} variant ${v.sku}`} onClick={() => setVariantSheet(v)} />
                              <PermissionGate perm="products.delete" mode="hide">
                                <IconButton icon={Trash2} size="xs" label={`Archive variant ${v.sku}`} className="text-danger-fg" onClick={() => setArchiveVariant(v)} disabled={archived} />
                              </PermissionGate>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState title="No live variants" description="Add a variant so buyers can order this product." compact action={can("products.create") ? <Button size="sm" onClick={() => setVariantSheet("new")}>Add variant</Button> : null} />
              )}
            </Card>
          )}

          <Card>
            <CardHeader title="Wholesale rules" description="Applied in checkout for bulk purchases." />
            <CardBody className="grid gap-4">
              <Switch label="Bulk eligible" description="List this product on the bulk store with the rules below." checked={form.bulkEligible} disabled={disabled} onCheckedChange={(v) => set({ bulkEligible: Boolean(v) })} />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Minimum order qty" required error={fe("moq")}>
                  <Input type="number" min={1} step={1} disabled={disabled} value={form.moq} onChange={(e) => set({ moq: e.target.value })} />
                </Field>
                <Field label="Maximum qty" optional error={fe("maxQty")}>
                  <Input type="number" min={1} step={1} disabled={disabled} value={form.maxQty} placeholder="No limit" onChange={(e) => set({ maxQty: e.target.value })} />
                </Field>
                <Field label="Pack multiple" required error={fe("packMultiple")}>
                  <Input type="number" min={1} step={1} disabled={disabled} value={form.packMultiple} onChange={(e) => set({ packMultiple: e.target.value })} />
                </Field>
                <Field label="Units per case" required error={fe("caseQty")}>
                  <Input type="number" min={1} step={1} disabled={disabled} value={form.caseQty} onChange={(e) => set({ caseQty: e.target.value })} />
                </Field>
                <Field label="Lead time (days)" required error={fe("leadTimeDays")}>
                  <Input type="number" min={0} max={365} step={1} disabled={disabled} value={form.leadTimeDays} onChange={(e) => set({ leadTimeDays: e.target.value })} />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Specifications" description="Shown in the product page’s specification table. Lists are saved as comma-separated text." />
            <CardBody>
              <KeyValueRows rows={form.specs} disabled={disabled} onChange={(specs) => set({ specs })} keyLabel="Specification" valueLabel="Value" addLabel="Add specification" max={50 - Object.keys(form.specsFixed).length} />
              {Object.keys(form.specsFixed).length ? (
                <div className="mt-3 grid gap-1">
                  <p className="text-ui-xs text-fg-subtle">Grouped specifications (set by import or API) are shown read-only here and kept unchanged when you save.</p>
                  <dl className="grid gap-1 text-ui-sm">
                    {Object.entries(form.specsFixed).map(([k, v]) => (
                      <div key={k} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] gap-2">
                        <dt className="truncate font-medium text-fg">{k}</dt>
                        <dd className="break-words text-fg-muted">{specSummary(v)}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
              ) : null}
              {fe("specs") ? <p className="mt-2 text-ui-xs text-danger-fg" role="alert">{fe("specs")}</p> : null}
            </CardBody>
          </Card>
        </div>

        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card>
            <CardHeader title="Status & visibility" />
            <CardBody className="grid gap-4">
              <Field label="Status" hint={STATUS_HELP[form.status]} error={fe("status")}>
                <NativeSelect value={form.status} disabled={disabled} onChange={(e) => set({ status: e.target.value })} options={statusOptions} />
              </Field>
              {!canPublish ? <p className="text-ui-xs text-fg-subtle">Publishing and scheduling require products.publish.</p> : null}
              {form.status === "scheduled" ? (
                <Field label="Publish at (IST)" required error={fe("scheduledAt")}>
                  <Input type="datetime-local" disabled={disabled} value={form.scheduledAt} onChange={(e) => set({ scheduledAt: e.target.value })} />
                </Field>
              ) : null}
              <Switch label="Enabled" description="Turn off to hide a published product temporarily." checked={form.enabled} disabled={disabled} onCheckedChange={(v) => set({ enabled: Boolean(v) })} />
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organisation" />
            <CardBody className="grid gap-4">
              <Field label="Category" optional error={fe("categoryId")}>
                <NativeSelect value={form.categoryId} disabled={disabled} onChange={(e) => set({ categoryId: e.target.value })} options={[{ value: "", label: "No category" }, ...catRows.map((c) => ({ value: String(c._id), label: `${c.name}${c.tenantId ? "" : " (global)"}` }))]} />
              </Field>
              <Field label="Brand" optional error={fe("brandId")}>
                <NativeSelect value={form.brandId} disabled={disabled || !can("brands.view")} onChange={(e) => set({ brandId: e.target.value })} options={[{ value: "", label: "No brand" }, ...brandRows.map((b) => ({ value: String(b._id), label: b.name }))]} />
              </Field>
              <Field label="Tags" optional hint="Comma separated, up to 30." error={fe("tags")}>
                <Input value={form.tags} disabled={disabled} onChange={(e) => set({ tags: e.target.value })} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Tax" description="Used on GST invoices." />
            <CardBody className="grid gap-4">
              <Field label="HSN code" optional error={fe("hsn")}>
                <Input value={form.hsn} maxLength={12} inputMode="numeric" disabled={disabled} onChange={(e) => set({ hsn: e.target.value.replace(/\s/g, "") })} />
              </Field>
              <Field label="GST rate" required error={fe("taxRate")}>
                <NativeSelect
                  value={GST_SLABS.includes(Number(form.taxRate)) ? form.taxRate : "custom"}
                  disabled={disabled}
                  onChange={(e) => e.target.value !== "custom" && set({ taxRate: e.target.value })}
                  options={[...GST_SLABS.map((r) => ({ value: String(r), label: `${r}%` })), ...(GST_SLABS.includes(Number(form.taxRate)) ? [] : [{ value: "custom", label: `${form.taxRate}% (custom)` }])]}
                />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fulfilment & returns" />
            <CardBody className="grid gap-3">
              <fieldset className="grid gap-2">
                <legend className="mb-1 text-ui-sm font-medium text-fg">Delivery modes</legend>
                {[
                  ["delivery_partner", "Delivery partner", "Shipped to the buyer’s address"],
                  ["store_pickup", "Store pickup", "Buyer collects from your pickup address"],
                ].map(([value, label, description]) => (
                  <Checkbox
                    key={value}
                    label={label}
                    description={description}
                    disabled={disabled}
                    checked={form.deliveryModes.includes(value)}
                    onCheckedChange={(v) => set({ deliveryModes: v ? [...new Set([...form.deliveryModes, value])] : form.deliveryModes.filter((m) => m !== value) })}
                  />
                ))}
                {fe("deliveryModes") ? <p className="text-ui-xs text-danger-fg" role="alert">{fe("deliveryModes")}</p> : null}
              </fieldset>
              <Switch label="Easy returns" description="Buyers can request a return within the platform return window." checked={form.easyReturn} disabled={disabled} onCheckedChange={(v) => set({ easyReturn: Boolean(v) })} />
            </CardBody>
          </Card>

          {!isNew ? (
            <Card padded>
              <p className="text-ui-sm text-fg-muted">
                Stock isn’t edited here. Use <Button variant="link" size="sm" to={`/tenant/inventory?q=${encodeURIComponent(product.sku)}`}>Inventory</Button> to adjust, set or transfer quantities per warehouse.
              </p>
              {product.ratingCount ? (
                <p className="mt-2 text-ui-sm text-fg-muted">
                  Rating {Number(product.ratingAvg).toFixed(1)} from {product.ratingCount} reviews · <Button variant="link" size="sm" to={`/tenant/reviews?productId=${product._id}`}>Moderate</Button>
                </p>
              ) : null}
            </Card>
          ) : null}
        </div>
      </div>

      {editable && !archived && (dirty || isNew) ? (
        <div className="sticky bottom-0 z-30 mt-6 flex flex-wrap items-center justify-end gap-2 rounded-lg border border-border bg-surface px-4 py-3 shadow-lg">
          <span className="mr-auto text-ui-sm text-fg-muted">{isNew ? "New product — not saved yet" : "Unsaved changes"}</span>
          {!isNew ? (
            <Button
              onClick={() => {
                setForm(initial);
                setSubmitted(false);
                save.reset();
              }}
              disabled={save.isPending}
            >
              Discard
            </Button>
          ) : (
            <Button to="/tenant/products">Cancel</Button>
          )}
          <Button type="submit" variant="primary" loading={save.isPending}>
            {isNew ? "Create product" : "Save"}
          </Button>
        </div>
      ) : null}

      <UnsavedChangesDialog blocker={blocker} />

      {!isNew ? (
        <>
          <VariantSheet productId={id} variant={variantSheet === "new" ? null : variantSheet} open={Boolean(variantSheet)} onOpenChange={(o) => !o && setVariantSheet(null)} canEdit={variantSheet === "new" ? can("products.create") : can("products.edit")} />
          <ConfirmDialog
            open={Boolean(archiveVariant)}
            onOpenChange={(o) => !o && setArchiveVariant(null)}
            title={`Archive variant ${archiveVariant?.sku || ""}?`}
            description="The variant stops selling, its stock rows are archived and pending restock alerts are dropped. Past orders keep their history. The last active variant of a published product can’t be archived."
            confirmLabel="Archive variant"
            tone="danger"
            onConfirm={async () => {
              await api.deleteVariant(archiveVariant._id);
              await Promise.all([q.refetch(), stock.refetch?.()]);
              toast.success("Variant archived");
            }}
          />
          <ConfirmDialog
            open={archiveOpen}
            onOpenChange={setArchiveOpen}
            title={`Archive ${product.name}?`}
            description="The product is hidden from the storefront and can’t be ordered. You can restore it as a draft later."
            confirmLabel="Archive product"
            tone="danger"
            onConfirm={async () => {
              await api.archiveProduct(id);
              await q.refetch();
              toast.success("Product archived");
            }}
          />
          <ConfirmDialog
            open={publishOpen}
            onOpenChange={setPublishOpen}
            title={`Publish ${product.name}?`}
            description={`The product becomes visible and purchasable in your storefront now${variants.some((v) => v.status === "active") ? "" : " — but it has no active variant yet, so buyers can’t add it to cart"}.`}
            confirmLabel="Publish"
            onConfirm={() => publish.mutateAsync()}
          />
        </>
      ) : null}
    </form>
  );
}
