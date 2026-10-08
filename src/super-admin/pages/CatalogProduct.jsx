import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArrowDown, ArrowUp, ExternalLink, ImageIcon, ImagePlus, Plus, RotateCcw, Send, Star, Trash2, X } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useApiMutation, useInvalidate } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { FULFILLMENT_MODES } from "../../shared/lib/panel.js";
import { fromIstInputValue, toIstInputValue } from "../../shared/lib/format.js";
import { MediaPickerDialog } from "../../shared/components/MediaLibrary.jsx";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Checkbox,
  ConfirmDialog,
  DateTime,
  DescriptionList,
  ErrorState,
  Field,
  IconButton,
  Input,
  NativeSelect,
  PageHeader,
  PageSkeleton,
  StatusPill,
  Switch,
  Textarea,
  Tooltip,
  UnsavedChangesDialog,
  toast,
  useTenantQuery,
} from "../../shared/ui/index.js";
import { TenantLink } from "./lib/tenantScope.jsx";
import { numStr, parseNum, refId } from "./lib/catalogShared.jsx";
import { VariantsSection } from "./lib/catalogVariants.jsx";

const FULFILLMENT_LABELS = { store_pickup: "Store pickup", delivery_partner: "Delivery partner" };
const STATUS_LABELS = { draft: "Draft", pending_review: "Pending review", scheduled: "Scheduled", published: "Published", archived: "Archived" };
const SCALAR = (v) => v === null || ["string", "number", "boolean"].includes(typeof v);

/* ------------------------------------------------------------------ form model */

function initForm(p) {
  const specs = Object.entries(p.specifications || {}).map(([key, value]) => ({
    key,
    value: SCALAR(value) ? (value == null ? "" : String(value)) : Array.isArray(value) ? value.join(", ") : JSON.stringify(value),
    converted: !SCALAR(value),
  }));
  const w = p.wholesale || {};
  return {
    name: p.name || "",
    sku: p.sku || "",
    barcode: p.barcode || "",
    description: p.description || "",
    specs,
    images: [...(p.images || [])],
    tags: (p.tags || []).join(", "),
    categoryId: refId(p.categoryId),
    brandId: refId(p.brandId),
    taxName: p.taxClass?.name || "",
    taxRate: numStr(p.taxClass?.rate),
    hsn: p.hsn || "",
    status: p.status || "draft",
    enabled: p.enabled !== false,
    scheduledAt: p.scheduledAt ? toIstInputValue(p.scheduledAt) : "",
    easyReturn: Boolean(p.easyReturn),
    deliveryModes: [...(p.deliveryModes || [])],
    wholesale: {
      bulkEligible: Boolean(w.bulkEligible),
      moq: numStr(w.moq),
      maxQty: numStr(w.maxQty),
      packMultiple: numStr(w.packMultiple),
      caseQty: numStr(w.caseQty),
      leadTimeDays: numStr(w.leadTimeDays),
    },
  };
}

function splitTags(s) {
  return [...new Set(String(s || "").split(",").map((t) => t.trim()).filter(Boolean))];
}

/** Form → canonical PATCH-shaped body (whole nested objects: the API $sets them as a unit). */
function toBody(f) {
  const specifications = {};
  f.specs.forEach((r) => {
    if (r.key.trim()) specifications[r.key.trim()] = r.value;
  });
  const w = f.wholesale;
  return {
    name: f.name.trim(),
    sku: f.sku.trim(),
    barcode: f.barcode.trim(),
    description: f.description,
    specifications,
    images: f.images,
    tags: splitTags(f.tags),
    categoryId: f.categoryId || null,
    brandId: f.brandId || null,
    taxClass: { name: f.taxName.trim(), rate: parseNum(f.taxRate) },
    hsn: f.hsn.trim(),
    status: f.status,
    enabled: f.enabled,
    scheduledAt: f.scheduledAt ? fromIstInputValue(f.scheduledAt) : null,
    easyReturn: f.easyReturn,
    deliveryModes: f.deliveryModes,
    wholesale: {
      bulkEligible: w.bulkEligible,
      moq: parseNum(w.moq),
      maxQty: parseNum(w.maxQty) ?? null,
      packMultiple: parseNum(w.packMultiple),
      caseQty: parseNum(w.caseQty),
      leadTimeDays: parseNum(w.leadTimeDays),
    },
  };
}

function validate(f, { canPublish, original }) {
  const e = {};
  const b = toBody(f);
  if (!b.name) e.name = "Name is required";
  else if (b.name.length > 200) e.name = "At most 200 characters";
  if (!b.sku) e.sku = "SKU is required";
  else if (b.sku.length > 80) e.sku = "At most 80 characters";
  if (b.barcode.length > 80) e.barcode = "At most 80 characters";
  if (b.description.length > 20000) e.description = "At most 20,000 characters";
  if (b.hsn.length > 12) e.hsn = "At most 12 characters";
  if (b.taxClass.name.length > 40) e["taxClass.name"] = "At most 40 characters";
  if (b.taxClass.rate === undefined) e["taxClass.rate"] = "Enter the GST rate (0 if exempt)";
  else if (!Number.isFinite(b.taxClass.rate) || b.taxClass.rate < 0 || b.taxClass.rate > 100) e["taxClass.rate"] = "Between 0 and 100";
  if (b.tags.length > 30) e.tags = "At most 30 tags";
  else if (b.tags.some((t) => t.length > 60)) e.tags = "Each tag can be at most 60 characters";
  if (b.images.length > 30) e.images = "At most 30 images";
  const seen = new Set();
  f.specs.forEach((r, i) => {
    const k = r.key.trim();
    if (!k && !r.value) return;
    if (!k) e[`specs.${i}.key`] = "Name required";
    else if (k.length > 80) e[`specs.${i}.key`] = "At most 80 characters";
    else if (seen.has(k)) e[`specs.${i}.key`] = "Duplicate name";
    seen.add(k);
    if (r.value.length > 120) e[`specs.${i}.value`] = "At most 120 characters";
  });
  if (!b.deliveryModes.length) e.deliveryModes = "Choose at least one fulfilment mode";
  const intIn = (v, min, max) => v !== undefined && Number.isInteger(v) && v >= min && v <= max;
  const w = b.wholesale;
  if (!intIn(w.moq, 1, 1e9)) e["wholesale.moq"] = "Whole number ≥ 1";
  if (!intIn(w.packMultiple, 1, 1e9)) e["wholesale.packMultiple"] = "Whole number ≥ 1";
  if (!intIn(w.caseQty, 1, 1e9)) e["wholesale.caseQty"] = "Whole number ≥ 1";
  if (!intIn(w.leadTimeDays, 0, 365)) e["wholesale.leadTimeDays"] = "Whole number of days, 0–365";
  if (w.maxQty != null && (!Number.isInteger(w.maxQty) || w.maxQty < 1)) e["wholesale.maxQty"] = "Whole number ≥ 1, or empty for no limit";
  else if (w.maxQty != null && intIn(w.moq, 1, 1e9) && w.maxQty < w.moq) e["wholesale.maxQty"] = "Must be at least the minimum order quantity";
  if (b.status === "scheduled" && !b.scheduledAt) e.scheduledAt = "Pick when to publish (IST)";
  if (b.status !== original.status && ["published", "scheduled"].includes(b.status) && !canPublish) e.status = "Requires products.publish";
  return e;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

function changed(base, current) {
  const out = {};
  Object.keys(current).forEach((k) => {
    if (!same(base[k], current[k])) out[k] = current[k];
  });
  return out;
}

/* ------------------------------------------------------------------ page */

export default function CatalogProduct() {
  const { id } = useParams();
  const can = useCan();
  const invalidate = useInvalidate();
  const queryClient = useQueryClient();

  // Platform scope (no X-Tenant-Id) so the topbar tenant can't hide another store's product.
  const q = useQuery({ queryKey: keys.products.detail(id), queryFn: () => api.withTenant(null).getStaffProduct(id) });
  const product = q.data;
  const tenantId = refId(product?.tenantId);
  const tenantApi = useMemo(() => api.withTenant(tenantId || null), [tenantId]);
  const tenant = useTenantQuery(tenantId);

  // The media picker's cache key isn't tenant-scoped: drop cached media when the store changes.
  useEffect(() => {
    if (tenantId) queryClient.removeQueries({ queryKey: keys.media.all });
  }, [tenantId, queryClient]);

  const categories = useQuery({
    queryKey: keys.categories.list({ tenant: tenantId }),
    queryFn: () => api.withTenant(null).listCategories({ tenantId }),
    enabled: Boolean(tenantId),
    staleTime: 5 * 60_000,
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
  });
  const brands = useQuery({
    queryKey: keys.brands.list({ tenant: tenantId }),
    queryFn: () => tenantApi.listBrands(),
    enabled: Boolean(tenantId) && can("brands.view"),
    staleTime: 5 * 60_000,
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
  });

  /* form state: initialised from the product only (never from async lookups) */
  const [form, setForm] = useState(null);
  const [base, setBase] = useState(null);
  const [loadedKey, setLoadedKey] = useState(null);
  const [stale, setStale] = useState(false);
  const [errors, setErrors] = useState({});
  const productKey = product ? `${product._id}:${product.updatedAt}` : null;
  const dirty = Boolean(form && base) && !same(form, base);

  function reloadFromServer() {
    const f = initForm(product);
    setForm(f);
    setBase(f);
    setLoadedKey(productKey);
    setStale(false);
    setErrors({});
  }

  const save = useApiMutation((body) => tenantApi.updateProduct(id, body), {
    invalidate: [keys.products.all],
    success: "Product saved",
    error: false,
  });

  useEffect(() => {
    if (!product || productKey === loadedKey) return;
    const sameProduct = loadedKey && loadedKey.split(":")[0] === String(product._id);
    if (dirty && sameProduct && !save.isPending) {
      setStale(true); // someone else saved; don't wipe the user's edits (our own save refetches while pending)
      return;
    }
    const f = initForm(product);
    setForm(f);
    setBase(f);
    setLoadedKey(productKey);
    setStale(false);
    setErrors({});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [productKey]);

  const blocker = useUnsavedChangesGuard(dirty && !save.isPending);

  const [confirm, setConfirm] = useState(null); // "publish" | "archive" | "restore"
  const [pickerOpen, setPickerOpen] = useState(false);

  if (q.isPending) return <PageSkeleton />;
  if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
  if (!form) return <PageSkeleton />;

  const canEdit = can("products.edit");
  const canPublish = can("products.publish");
  const canDelete = can("products.delete");
  const archived = product.status === "archived";
  const readOnly = !canEdit || archived;
  const tenantName = tenant.data?.name || "Tenant";
  const set = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const setW = (k) => (e) => setForm((f) => ({ ...f, wholesale: { ...f.wholesale, [k]: e.target.value } }));
  const err = (k) => errors[k] || save.error?.fieldError?.(k);
  const convertedSpecs = form.specs.filter((r) => r.converted).map((r) => r.key);
  const specsChanged = !same(toBody(form).specifications, toBody(base).specifications);

  function submit(e) {
    e?.preventDefault();
    if (save.isPending) return;
    const next = validate(form, { canPublish, original: product });
    setErrors(next);
    if (Object.keys(next).length) {
      toast.error("Fix the highlighted fields");
      return;
    }
    const patch = changed(toBody(base), toBody(form));
    if (!Object.keys(patch).length) return;
    save.mutate(patch);
  }

  function moveImage(i, d) {
    setForm((f) => {
      const images = [...f.images];
      const j = i + d;
      if (j < 0 || j >= images.length) return f;
      [images[i], images[j]] = [images[j], images[i]];
      return { ...f, images };
    });
  }

  const statusOptions = ["draft", "pending_review", "scheduled", "published"].map((s) => ({
    value: s,
    label: STATUS_LABELS[s] + ((s === "published" || s === "scheduled") && !canPublish && product.status !== s ? " (requires products.publish)" : ""),
    disabled: (s === "published" || s === "scheduled") && !canPublish && product.status !== s,
  }));
  if (archived) statusOptions.push({ value: "archived", label: "Archived", disabled: true });

  const storeHref = product.slug ? `/product/${encodeURIComponent(product.slug)}` : null;
  const liveInStore = product.status === "published" && product.enabled !== false;
  const generalError = save.error && !Object.keys(save.error.fields || {}).length ? save.error.message : null;

  const categoryOptions = (categories.data || []).map((c) => ({ value: String(c._id), label: c.tenantId ? c.name : `${c.name} (shared)` }));
  if (form.categoryId && !categoryOptions.some((o) => o.value === form.categoryId)) {
    categoryOptions.push({ value: form.categoryId, label: product.categoryId?.name || "Current category" });
  }
  const brandOptions = (brands.data || []).map((b) => ({ value: String(b._id), label: b.name }));
  if (form.brandId && !brandOptions.some((o) => o.value === form.brandId)) {
    brandOptions.push({ value: form.brandId, label: product.brandId?.name || "Current brand" });
  }

  return (
    <>
      <PageHeader
        title={product.name}
        back="/super-admin/catalog"
        meta={
          <>
            <StatusPill status={product.status} />
            {product.enabled === false ? <Badge tone="neutral">Disabled</Badge> : null}
          </>
        }
        description={
          <span className="inline-flex flex-wrap items-center gap-x-2">
            <span className="font-mono">{product.sku}</span>
            <span aria-hidden>·</span>
            <TenantLink tenant={tenant.data || tenantId} />
          </span>
        }
        breadcrumbs={[
          { label: "Catalog", to: "/super-admin/catalog" },
          { label: tenantName, to: `/super-admin/catalog?tenant=${tenantId}` },
          { label: product.name },
        ]}
        secondaryActions={
          <>
            {storeHref ? (
              liveInStore ? (
                <Button leftIcon={ExternalLink} asChild>
                  <a href={storeHref} target="_blank" rel="noreferrer">
                    <ExternalLink aria-hidden />
                    View in store
                  </a>
                </Button>
              ) : (
                <Tooltip content="Only published, enabled products are visible in the store">
                  <span tabIndex={0} className="inline-flex">
                    <Button leftIcon={ExternalLink} disabled>
                      View in store
                    </Button>
                  </span>
                </Tooltip>
              )
            ) : null}
            {archived ? (
              canEdit ? (
                <Button leftIcon={RotateCcw} onClick={() => setConfirm("restore")}>
                  Restore
                </Button>
              ) : null
            ) : canDelete ? (
              <Button variant="danger-ghost" leftIcon={Archive} onClick={() => setConfirm("archive")}>
                Archive
              </Button>
            ) : null}
          </>
        }
        primaryAction={
          !archived && product.status !== "published" ? (
            canPublish ? (
              <Button variant="primary" leftIcon={Send} onClick={() => setConfirm("publish")} disabled={dirty}>
                Publish
              </Button>
            ) : (
              <Tooltip content="Requires products.publish">
                <span tabIndex={0} className="inline-flex">
                  <Button variant="primary" leftIcon={Send} disabled>
                    Publish
                  </Button>
                </span>
              </Tooltip>
            )
          ) : null
        }
      />

      {archived ? (
        <Alert tone="warning" title="This product is archived" className="mb-4">
          It is hidden from the store and from the default catalog list, and can’t be edited. {canEdit ? "Restore it to a draft to make changes." : ""}
        </Alert>
      ) : null}
      {stale ? (
        <Alert tone="warning" title="This product changed since you started editing" className="mb-4" action={<Button size="sm" onClick={reloadFromServer}>Discard my edits and reload</Button>}>
          Saving now overwrites the fields you changed.
        </Alert>
      ) : null}

      <form onSubmit={submit} noValidate className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <fieldset disabled={readOnly} className="grid min-w-0 content-start gap-6">
          <Card>
            <CardHeader title="Details" />
            <CardBody className="grid gap-4">
              <Field label="Name" required error={err("name")}>
                <Input value={form.name} onChange={(e) => set("name")(e.target.value)} maxLength={200} />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Product SKU" required error={err("sku")} hint="Upper-cased on save. Variant SKUs are edited below.">
                  <Input value={form.sku} onChange={(e) => set("sku")(e.target.value)} maxLength={80} className="font-mono" />
                </Field>
                <Field label="Barcode" optional error={err("barcode")}>
                  <Input value={form.barcode} onChange={(e) => set("barcode")(e.target.value)} maxLength={80} />
                </Field>
              </div>
              <Field label="Description" optional error={err("description")} hint={`${form.description.length.toLocaleString("en-IN")} / 20,000`}>
                <Textarea rows={6} value={form.description} onChange={(e) => set("description")(e.target.value)} maxLength={20000} />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader
              title="Images"
              description="The first image is the cover. Picked from this store’s media library."
              actions={
                !readOnly && can(["media.upload", "products.create"]) ? (
                  <Button size="sm" leftIcon={ImagePlus} onClick={() => setPickerOpen(true)} disabled={form.images.length >= 30}>
                    Add images
                  </Button>
                ) : null
              }
            />
            <CardBody>
              {form.images.length ? (
                <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4" aria-label="Product images">
                  {form.images.map((url, i) => (
                    <li key={`${url}-${i}`} className="overflow-hidden rounded-lg border border-border bg-surface">
                      <div className="relative aspect-square bg-surface-sunken">
                        <img src={url} alt={`Image ${i + 1}`} loading="lazy" className="size-full object-cover" />
                        {i === 0 ? <Badge tone="primary" className="absolute left-2 top-2">Cover</Badge> : null}
                      </div>
                      {!readOnly ? (
                        <div className="flex items-center justify-between gap-1 border-t border-border px-1.5 py-1">
                          <IconButton icon={ArrowUp} size="xs" variant="ghost" label={`Move image ${i + 1} earlier`} disabled={i === 0} onClick={() => moveImage(i, -1)} />
                          <IconButton icon={ArrowDown} size="xs" variant="ghost" label={`Move image ${i + 1} later`} disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)} />
                          <IconButton icon={X} size="xs" variant="ghost" className="text-danger-fg" label={`Remove image ${i + 1}`} onClick={() => set("images")(form.images.filter((_, j) => j !== i))} />
                        </div>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border-strong px-4 py-8 text-center">
                  <ImageIcon aria-hidden className="size-6 text-fg-subtle" />
                  <p className="text-ui-sm text-fg-muted">No images yet.</p>
                </div>
              )}
              {err("images") ? <p role="alert" className="mt-2 text-ui-xs text-danger-fg">{err("images")}</p> : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Organisation & tax" />
            <CardBody className="grid gap-4 sm:grid-cols-2">
              <Field label="Category" optional error={err("categoryId")} hint="This store’s categories and shared ones.">
                <NativeSelect value={form.categoryId} onChange={(e) => set("categoryId")(e.target.value)} placeholder={categories.isPending ? "Loading…" : "No category"} options={categoryOptions} />
              </Field>
              <Field label="Brand" optional error={err("brandId")} hint={can("brands.view") ? "This store’s brands." : "Requires brands.view to list brands."}>
                <NativeSelect value={form.brandId} onChange={(e) => set("brandId")(e.target.value)} placeholder={brands.isPending && can("brands.view") ? "Loading…" : "No brand"} options={brandOptions} />
              </Field>
              <Field label="Tags" optional className="sm:col-span-2" error={err("tags")} hint="Comma separated, up to 30.">
                <Input value={form.tags} onChange={(e) => set("tags")(e.target.value)} />
              </Field>
              <Field label="Tax class" optional error={err("taxClass.name")} hint="e.g. GST18">
                <Input value={form.taxName} onChange={(e) => set("taxName")(e.target.value)} maxLength={40} />
              </Field>
              <Field label="GST rate" required error={err("taxClass.rate")}>
                <Input type="number" inputMode="decimal" min={0} max={100} step="0.01" suffix="%" value={form.taxRate} onChange={(e) => set("taxRate")(e.target.value)} />
              </Field>
              <Field label="HSN code" optional error={err("hsn")}>
                <Input value={form.hsn} onChange={(e) => set("hsn")(e.target.value)} maxLength={12} className="font-mono" />
              </Field>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Specifications" description="Shown on the product page as a table." />
            <CardBody className="grid gap-2">
              {convertedSpecs.length ? (
                <Alert tone="info">
                  {convertedSpecs.join(", ")} {convertedSpecs.length === 1 ? "is a list" : "are lists"}; the API only accepts text values, so {convertedSpecs.length === 1 ? "it is" : "they are"} saved as comma-separated text
                  {specsChanged ? " with this save." : " if you change any specification."}
                </Alert>
              ) : null}
              {form.specs.map((r, i) => (
                <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)_auto] items-start gap-2">
                  <Field label={`Specification ${i + 1} name`} labelHidden error={err(`specs.${i}.key`)}>
                    <Input size="sm" value={r.key} placeholder="Name" maxLength={80} onChange={(e) => set("specs")(form.specs.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))} />
                  </Field>
                  <Field label={`Specification ${i + 1} value`} labelHidden error={err(`specs.${i}.value`)}>
                    <Input size="sm" value={r.value} placeholder="Value" maxLength={120} onChange={(e) => set("specs")(form.specs.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))} />
                  </Field>
                  {!readOnly ? <IconButton icon={Trash2} size="sm" variant="ghost" label={`Remove specification ${r.key || i + 1}`} onClick={() => set("specs")(form.specs.filter((_, j) => j !== i))} /> : <span />}
                </div>
              ))}
              {err("specifications") ? <p role="alert" className="text-ui-xs text-danger-fg">{err("specifications")}</p> : null}
              {!readOnly ? (
                <div>
                  <Button size="xs" leftIcon={Plus} onClick={() => set("specs")([...form.specs, { key: "", value: "" }])}>
                    Add specification
                  </Button>
                </div>
              ) : !form.specs.length ? (
                <p className="text-ui-sm text-fg-subtle">None.</p>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Wholesale" description="Rules applied to bulk purchases at checkout." />
            <CardBody className="grid gap-4">
              <Switch
                label="Bulk eligible"
                description="Lists the product on the bulk-buy page and applies the MOQ, maximum and pack rules."
                checked={form.wholesale.bulkEligible}
                onCheckedChange={(v) => setForm((f) => ({ ...f, wholesale: { ...f.wholesale, bulkEligible: Boolean(v) } }))}
                disabled={readOnly}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Minimum order qty" required error={err("wholesale.moq")}>
                  <Input type="number" min={1} step={1} value={form.wholesale.moq} onChange={setW("moq")} />
                </Field>
                <Field label="Maximum qty" optional error={err("wholesale.maxQty")} hint="Empty = no limit">
                  <Input type="number" min={1} step={1} value={form.wholesale.maxQty} onChange={setW("maxQty")} />
                </Field>
                <Field label="Pack multiple" required error={err("wholesale.packMultiple")}>
                  <Input type="number" min={1} step={1} value={form.wholesale.packMultiple} onChange={setW("packMultiple")} />
                </Field>
                <Field label="Case qty" required error={err("wholesale.caseQty")}>
                  <Input type="number" min={1} step={1} value={form.wholesale.caseQty} onChange={setW("caseQty")} />
                </Field>
                <Field label="Lead time" required error={err("wholesale.leadTimeDays")}>
                  <Input type="number" min={0} max={365} step={1} suffix="days" value={form.wholesale.leadTimeDays} onChange={setW("leadTimeDays")} />
                </Field>
              </div>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Fulfilment & returns" />
            <CardBody className="grid gap-4">
              <fieldset className="grid gap-2" aria-describedby={err("deliveryModes") ? "dm-err" : undefined}>
                <legend className="mb-1 text-ui-sm font-medium text-fg">Fulfilment modes</legend>
                {FULFILLMENT_MODES.map((m) => (
                  <Checkbox
                    key={m}
                    label={FULFILLMENT_LABELS[m] || m}
                    checked={form.deliveryModes.includes(m)}
                    disabled={readOnly}
                    onCheckedChange={(v) => set("deliveryModes")(v ? [...new Set([...form.deliveryModes, m])] : form.deliveryModes.filter((x) => x !== m))}
                  />
                ))}
                {err("deliveryModes") ? <p id="dm-err" role="alert" className="text-ui-xs text-danger-fg">{err("deliveryModes")}</p> : null}
              </fieldset>
              <Switch label="Easy returns" description="Buyers can request a return within the store’s return window." checked={form.easyReturn} onCheckedChange={(v) => set("easyReturn")(Boolean(v))} disabled={readOnly} />
            </CardBody>
          </Card>

          {generalError ? <Alert tone="danger">{generalError}</Alert> : null}
        </fieldset>

        {/* Sidebar */}
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
          <Card>
            <CardHeader title="Publishing" />
            <CardBody className="grid gap-4">
              <Field label="Status" error={err("status")} hint={canPublish ? "Use Archive to retire a product." : "Publishing and scheduling require products.publish."}>
                <NativeSelect value={form.status} onChange={(e) => set("status")(e.target.value)} options={statusOptions} disabled={readOnly} />
              </Field>
              {form.status === "scheduled" ? (
                <Field label="Publish at (IST)" required error={err("scheduledAt")} hint="The product goes live automatically at this time.">
                  <Input type="datetime-local" value={form.scheduledAt} onChange={(e) => set("scheduledAt")(e.target.value)} disabled={readOnly} />
                </Field>
              ) : null}
              <Switch
                label="Enabled"
                description="When off, buyers can’t see or order it, even when published."
                checked={form.enabled}
                onCheckedChange={(v) => set("enabled")(Boolean(v))}
                disabled={readOnly}
              />
              {!readOnly ? (
                <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
                  <Button onClick={reloadFromServer} disabled={!dirty || save.isPending}>
                    Discard
                  </Button>
                  <Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty}>
                    Save changes
                  </Button>
                </div>
              ) : null}
            </CardBody>
          </Card>

          <Card padded>
            <DescriptionList
              items={[
                { label: "Store", value: <TenantLink tenant={tenant.data || tenantId} /> },
                { label: "Slug", value: product.slug ? <span className="break-all font-mono text-ui-xs">{product.slug}</span> : null },
                { label: "Created", value: <DateTime value={product.createdAt} /> },
                { label: "Last updated", value: <DateTime value={product.updatedAt} /> },
                product.scheduledAt ? { label: "Scheduled for", value: <DateTime value={product.scheduledAt} /> } : null,
              ]}
            />
          </Card>

          <Card>
            <CardHeader title="Reviews" />
            <CardBody className="grid gap-2">
              <p className="flex items-center gap-2 text-ui-sm text-fg">
                <Star aria-hidden className="size-4 fill-warning text-warning" />
                {product.ratingCount ? (
                  <>
                    <span className="font-semibold tabular-nums">{Number(product.ratingAvg || 0).toFixed(1)}</span>
                    <span className="text-fg-muted">from {product.ratingCount} published review{product.ratingCount === 1 ? "" : "s"}</span>
                  </>
                ) : (
                  <span className="text-fg-muted">No published reviews</span>
                )}
              </p>
              {can(["reviews.moderate", "products.edit"]) ? (
                <Link to={`/super-admin/reviews?productId=${product._id}&tenant=${tenantId}`} className="text-ui-sm text-primary-soft-fg hover:underline">
                  Moderate reviews (incl. hidden)
                </Link>
              ) : null}
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Stock" />
            <CardBody className="text-ui-sm text-fg-muted">
              Stock isn’t edited on this page. Per-variant availability is shown under Variants; the store adjusts quantities in its inventory.
            </CardBody>
          </Card>
        </div>
      </form>

      <div className="mt-6">
        <VariantsSection product={product} tenantId={tenantId} tenantApi={tenantApi} can={can} />
      </div>

      {/* Sticky save bar on small screens / long forms */}
      {dirty && !readOnly ? (
        <div className="sticky bottom-0 z-20 -mx-4 mt-6 flex flex-wrap items-center justify-between gap-2 border-t border-border bg-surface px-4 py-3 shadow-lg sm:mx-0 sm:rounded-lg sm:border">
          <span className="text-ui-sm text-fg-muted">You have unsaved changes</span>
          <div className="flex gap-2">
            <Button onClick={reloadFromServer} disabled={save.isPending}>
              Discard
            </Button>
            <Button variant="primary" loading={save.isPending} onClick={submit}>
              Save changes
            </Button>
          </div>
        </div>
      ) : null}

      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        multiple
        folder="catalog"
        apiClient={tenantApi}
        title={`Add images from ${tenantName}’s library`}
        onPick={(urls) => set("images")([...form.images, ...urls.filter((u) => !form.images.includes(u))].slice(0, 30))}
      />

      <ConfirmDialog
        open={confirm === "publish"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Publish ${product.name}?`}
        description={`It becomes visible to buyers of ${tenantName} immediately${product.enabled === false ? " once it is enabled" : ""}, at the variant prices below.`}
        confirmLabel="Publish"
        onConfirm={async () => {
          await tenantApi.publishProduct(product._id);
          await invalidate(keys.products.all);
          toast.success("Product published");
        }}
      />
      <ConfirmDialog
        open={confirm === "archive"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Archive ${product.name}?`}
        description="It disappears from the storefront and the default catalog list and can’t be ordered. Variants, stock and order history are kept, and the product can be restored to a draft later."
        confirmLabel="Archive product"
        tone="danger"
        onConfirm={async () => {
          await tenantApi.deleteProduct(product._id);
          await invalidate(keys.products.all);
          toast.success("Product archived");
        }}
      />
      <ConfirmDialog
        open={confirm === "restore"}
        onOpenChange={(o) => !o && setConfirm(null)}
        title={`Restore ${product.name}?`}
        description="It returns as a draft: still hidden from buyers until it is published again."
        confirmLabel="Restore as draft"
        onConfirm={async () => {
          await tenantApi.updateProduct(product._id, { status: "draft" });
          await invalidate(keys.products.all);
          toast.success("Product restored as draft");
        }}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
