import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Archive, MoreHorizontal, Pencil, Plus, Trash2 } from "lucide-react";
import { keys } from "../../../shared/api/keys.js";
import { useApiMutation, useInvalidate } from "../../../shared/hooks/useApiMutation.js";
import { VARIANT_STATUSES } from "../../../shared/lib/panel.js";
import {
  Alert,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  Dialog,
  DropdownMenu,
  EmptyState,
  ErrorState,
  Field,
  IconButton,
  Input,
  MenuItem,
  Money,
  NativeSelect,
  Skeleton,
  StatusPill,
  Tooltip,
  toast,
} from "../../../shared/ui/index.js";
import { attributeSummary, numStr, parseNum } from "./catalogShared.jsx";

const FIXED_TEXT_ATTRS = [
  { key: "packSize", label: "Pack size", max: 40, hint: "e.g. 500 g" },
  { key: "size", label: "Size", max: 60 },
  { key: "color", label: "Colour", max: 60 },
  { key: "grade", label: "Grade", max: 60 },
  { key: "material", label: "Material", max: 60 },
  { key: "unit", label: "Unit", max: 20, hint: "e.g. pc, g, kg" },
];
const ATTR_KEY = /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/;
const RESERVED_ATTR_KEYS = ["size", "color", "grade", "material", "packSize", "unit", "weight", "dimensions", "custom"];
const MONEY_MAX = 1e9;

function fromVariant(v) {
  const a = v?.attributes || {};
  const custom = a.custom && typeof a.custom === "object" ? Object.entries(a.custom).map(([key, value]) => ({ key, value: String(value ?? "") })) : [];
  return {
    sku: v?.sku || "",
    barcode: v?.barcode || "",
    status: v?.status === "inactive" ? "inactive" : "active",
    listPrice: numStr(v?.listPrice),
    sellingPrice: numStr(v?.sellingPrice),
    attrs: Object.fromEntries(FIXED_TEXT_ATTRS.map(({ key }) => [key, a[key] || ""])),
    weight: v ? numStr(a.weight) : "",
    custom,
    tiers: (v?.tierPrices || []).map((t) => ({ minQty: numStr(t.minQty), maxQty: numStr(t.maxQty), unitPrice: numStr(t.unitPrice) })),
  };
}

const EMPTY_FORM = { ...fromVariant(null), attrs: { ...fromVariant(null).attrs, unit: "pc" } };

/** Canonical API body from the form (numbers parsed; invalid numbers stay NaN for validation). */
function toBody(form) {
  const attributes = {};
  FIXED_TEXT_ATTRS.forEach(({ key }) => {
    attributes[key] = form.attrs[key].trim();
  });
  const weight = parseNum(form.weight);
  if (weight !== undefined) attributes.weight = weight;
  const custom = {};
  form.custom.forEach((row) => {
    if (row.key.trim()) custom[row.key.trim()] = row.value;
  });
  if (Object.keys(custom).length) attributes.custom = custom;
  return {
    sku: form.sku.trim(),
    barcode: form.barcode.trim(),
    status: form.status,
    listPrice: parseNum(form.listPrice),
    sellingPrice: parseNum(form.sellingPrice),
    attributes,
    tierPrices: form.tiers.map((t) => ({
      minQty: parseNum(t.minQty),
      maxQty: parseNum(t.maxQty) ?? null,
      unitPrice: parseNum(t.unitPrice),
    })),
  };
}

function validate(form) {
  const e = {};
  const body = toBody(form);
  if (!body.sku) e.sku = "SKU is required";
  else if (body.sku.length > 80) e.sku = "At most 80 characters";
  if (body.barcode.length > 80) e.barcode = "At most 80 characters";
  const money = (v) => v !== undefined && Number.isFinite(v) && v >= 0 && v <= MONEY_MAX;
  if (body.listPrice === undefined) e.listPrice = "List price is required";
  else if (!money(body.listPrice)) e.listPrice = "Enter an amount between 0 and 1,000,000,000";
  if (body.sellingPrice === undefined) e.sellingPrice = "Selling price is required";
  else if (!money(body.sellingPrice)) e.sellingPrice = "Enter an amount between 0 and 1,000,000,000";
  FIXED_TEXT_ATTRS.forEach(({ key, max }) => {
    if (form.attrs[key].length > max) e[`attributes.${key}`] = `At most ${max} characters`;
  });
  const w = parseNum(form.weight);
  if (w !== undefined && (!Number.isFinite(w) || w < 0)) e["attributes.weight"] = "Enter 0 or more";
  const seen = new Set();
  form.custom.forEach((row, i) => {
    const k = row.key.trim();
    if (!k && !row.value) return;
    if (!k) e[`custom.${i}.key`] = "Name required";
    else if (!ATTR_KEY.test(k)) e[`custom.${i}.key`] = "Start with a letter; letters, digits, space, _ or - (max 40)";
    else if (RESERVED_ATTR_KEYS.includes(k)) e[`custom.${i}.key`] = "Use the field above for this attribute";
    else if (seen.has(k)) e[`custom.${i}.key`] = "Duplicate name";
    seen.add(k);
    if (row.value.length > 120) e[`custom.${i}.value`] = "At most 120 characters";
  });
  if (seen.size > 20) e.custom = "At most 20 custom attributes";
  if (form.tiers.length > 20) e.tiers = "At most 20 price slabs";
  let prevMin = 0;
  body.tierPrices.forEach((t, i) => {
    if (t.minQty === undefined || !Number.isInteger(t.minQty) || t.minQty < 1) e[`tiers.${i}.minQty`] = "Whole number ≥ 1";
    else if (t.minQty <= prevMin) e[`tiers.${i}.minQty`] = "Must be higher than the previous slab";
    if (t.maxQty != null && (!Number.isInteger(t.maxQty) || t.maxQty < (t.minQty || 1))) e[`tiers.${i}.maxQty`] = "Whole number ≥ min qty";
    if (!money(t.unitPrice)) e[`tiers.${i}.unitPrice`] = "Enter a price";
    if (Number.isInteger(t.minQty)) prevMin = t.minQty;
  });
  return e;
}

const same = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

/** PATCH body: only changed fields; attributes per key (the API merges them), custom/tiers whole. */
function patchBody(initialForm, form) {
  const a = toBody(initialForm);
  const b = toBody(form);
  const out = {};
  ["sku", "barcode", "status", "listPrice", "sellingPrice"].forEach((k) => {
    if (!same(a[k], b[k])) out[k] = b[k];
  });
  const attrs = {};
  [...FIXED_TEXT_ATTRS.map((x) => x.key), "weight", "custom"].forEach((k) => {
    if (same(a.attributes[k], b.attributes[k])) return;
    if (b.attributes[k] !== undefined) attrs[k] = b.attributes[k];
    // Removed on the form: {} clears every custom attribute, null clears the weight.
    else if (k === "custom") attrs.custom = {};
    else if (k === "weight") attrs.weight = null;
  });
  if (Object.keys(attrs).length) out.attributes = attrs;
  if (!same(a.tierPrices, b.tierPrices)) out.tierPrices = b.tierPrices;
  return out;
}

function VariantDialog({ open, onOpenChange, variant, productId, tenantApi, onSaved }) {
  const initial = useMemo(() => (variant ? fromVariant(variant) : EMPTY_FORM), [variant]);
  const [form, setForm] = useState(initial);
  const [errors, setErrors] = useState({});
  const [lastKey, setLastKey] = useState(null);
  const openKey = open ? `${variant?._id || "new"}:${variant?.updatedAt || ""}` : null;
  if (openKey !== lastKey) {
    // Re-initialise when the dialog opens for another variant (render-phase reset, no effect flicker).
    setLastKey(openKey);
    if (openKey) {
      setForm(initial);
      setErrors({});
    }
  }
  const dirty = !same(form, initial);
  const save = useApiMutation(
    (body) => (variant ? tenantApi.updateVariant(variant._id, body) : tenantApi.createVariant({ productId, ...body })),
    {
      invalidate: [keys.variants.all, keys.products.all, keys.inventory.all],
      success: variant ? "Variant saved" : "Variant added",
      error: false,
      onSuccess: () => {
        onOpenChange(false);
        onSaved?.();
      },
    }
  );
  const err = (k) => errors[k] || save.error?.fieldError?.(k);
  const body = toBody(form);
  const priceWarning =
    Number.isFinite(body.sellingPrice) && Number.isFinite(body.listPrice) && body.sellingPrice > body.listPrice ? "Selling price is higher than the list price (MRP)." : null;

  function submit(e) {
    e.preventDefault();
    const next = validate(form);
    setErrors(next);
    if (Object.keys(next).length) return;
    if (variant) {
      const patch = patchBody(initial, form);
      if (!Object.keys(patch).length) return onOpenChange(false);
      save.mutate(patch);
    } else {
      const { tierPrices, ...rest } = body;
      save.mutate({ ...rest, ...(tierPrices.length ? { tierPrices } : {}) });
    }
  }

  const setAttr = (k, v) => setForm((f) => ({ ...f, attrs: { ...f.attrs, [k]: v } }));
  const setRow = (list, i, patch) => setForm((f) => ({ ...f, [list]: f[list].map((r, j) => (j === i ? { ...r, ...patch } : r)) }));
  const removeRow = (list, i) => setForm((f) => ({ ...f, [list]: f[list].filter((_, j) => j !== i) }));
  const generalError = save.error && !Object.keys(save.error.fields || {}).length ? save.error.message : null;

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      dirty={dirty}
      busy={save.isPending}
      size="lg"
      title={variant ? `Edit variant ${variant.sku}` : "Add variant"}
      description="Prices are per variant. Stock is managed in the store's inventory."
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form="sa-variant-form" variant="primary" loading={save.isPending} disabled={variant ? !dirty : false}>
            {variant ? "Save variant" : "Add variant"}
          </Button>
        </>
      }
    >
      <form id="sa-variant-form" onSubmit={submit} noValidate className="grid gap-5">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="SKU" required error={err("sku")} className="sm:col-span-2">
            <Input value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} maxLength={80} className="font-mono" />
          </Field>
          <Field label="Status" error={err("status")}>
            <NativeSelect value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} options={VARIANT_STATUSES.filter((s) => s !== "archived").map((s) => ({ value: s, label: s === "active" ? "Active" : "Inactive" }))} />
          </Field>
          <Field label="List price (MRP)" required error={err("listPrice")}>
            <Input type="number" inputMode="decimal" min={0} step="0.01" prefix="₹" value={form.listPrice} onChange={(e) => setForm({ ...form, listPrice: e.target.value })} />
          </Field>
          <Field label="Selling price" required error={err("sellingPrice")}>
            <Input type="number" inputMode="decimal" min={0} step="0.01" prefix="₹" value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </Field>
          <Field label="Barcode" optional error={err("barcode")}>
            <Input value={form.barcode} onChange={(e) => setForm({ ...form, barcode: e.target.value })} maxLength={80} />
          </Field>
        </div>
        {priceWarning ? <Alert tone="warning">{priceWarning}</Alert> : null}

        <fieldset className="grid gap-3">
          <legend className="mb-2 text-ui-sm font-semibold text-fg">Attributes</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            {FIXED_TEXT_ATTRS.map(({ key, label, max, hint }) => (
              <Field key={key} label={label} optional hint={hint} error={err(`attributes.${key}`)}>
                <Input value={form.attrs[key]} onChange={(e) => setAttr(key, e.target.value)} maxLength={max} />
              </Field>
            ))}
            <Field label="Weight" optional hint="Grams" error={err("attributes.weight")}>
              <Input type="number" inputMode="decimal" min={0} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
            </Field>
          </div>
          <div className="grid gap-2">
            <p className="text-ui-sm font-medium text-fg">Custom attributes</p>
            {form.custom.map((row, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_auto] items-start gap-2">
                <Field label={`Attribute ${i + 1} name`} labelHidden error={err(`custom.${i}.key`)}>
                  <Input size="sm" placeholder="e.g. flavor" value={row.key} onChange={(e) => setRow("custom", i, { key: e.target.value })} maxLength={40} />
                </Field>
                <Field label={`Attribute ${i + 1} value`} labelHidden error={err(`custom.${i}.value`)}>
                  <Input size="sm" placeholder="Value" value={row.value} onChange={(e) => setRow("custom", i, { value: e.target.value })} maxLength={120} />
                </Field>
                <IconButton icon={Trash2} size="sm" variant="ghost" label={`Remove attribute ${row.key || i + 1}`} onClick={() => removeRow("custom", i)} />
              </div>
            ))}
            {err("custom") ? <p className="text-ui-xs text-danger-fg" role="alert">{err("custom")}</p> : null}
            <div>
              <Button size="xs" leftIcon={Plus} onClick={() => setForm((f) => ({ ...f, custom: [...f.custom, { key: "", value: "" }] }))} disabled={form.custom.length >= 20}>
                Add attribute
              </Button>
            </div>
          </div>
        </fieldset>

        <fieldset className="grid gap-2">
          <legend className="mb-1 text-ui-sm font-semibold text-fg">Quantity price slabs</legend>
          <p className="text-ui-xs text-fg-subtle">Unit price applied from a minimum quantity. Slabs must be in ascending order; leave “max” empty for no upper limit.</p>
          {form.tiers.map((t, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
              <Field label={`Slab ${i + 1} min qty`} labelHidden error={err(`tiers.${i}.minQty`)}>
                <Input size="sm" type="number" min={1} step={1} placeholder="Min qty" value={t.minQty} onChange={(e) => setRow("tiers", i, { minQty: e.target.value })} />
              </Field>
              <Field label={`Slab ${i + 1} max qty`} labelHidden error={err(`tiers.${i}.maxQty`)}>
                <Input size="sm" type="number" min={1} step={1} placeholder="Max (optional)" value={t.maxQty} onChange={(e) => setRow("tiers", i, { maxQty: e.target.value })} />
              </Field>
              <Field label={`Slab ${i + 1} unit price`} labelHidden error={err(`tiers.${i}.unitPrice`)}>
                <Input size="sm" type="number" min={0} step="0.01" prefix="₹" placeholder="Unit price" value={t.unitPrice} onChange={(e) => setRow("tiers", i, { unitPrice: e.target.value })} />
              </Field>
              <IconButton icon={Trash2} size="sm" variant="ghost" label={`Remove slab ${i + 1}`} onClick={() => removeRow("tiers", i)} />
            </div>
          ))}
          {err("tiers") || err("tierPrices") ? <p className="text-ui-xs text-danger-fg" role="alert">{err("tiers") || err("tierPrices")}</p> : null}
          <div>
            <Button size="xs" leftIcon={Plus} onClick={() => setForm((f) => ({ ...f, tiers: [...f.tiers, { minQty: "", maxQty: "", unitPrice: "" }] }))} disabled={form.tiers.length >= 20}>
              Add slab
            </Button>
          </div>
        </fieldset>
        {generalError ? <Alert tone="danger">{generalError}</Alert> : null}
      </form>
    </Dialog>
  );
}

/**
 * Variants of one product (list / add / edit / archive) with read-only stock per variant.
 * `tenantApi` must be bound to the product's tenant (api.withTenant(product.tenantId)).
 */
export function VariantsSection({ product, tenantId, tenantApi, can }) {
  const invalidate = useInvalidate();
  const productId = product._id;
  const archivedProduct = product.status === "archived";
  const q = useQuery({
    queryKey: keys.variants.list({ productId, tenant: tenantId }),
    queryFn: () => tenantApi.listVariants({ productId }),
    select: (res) => (Array.isArray(res) ? res : res?.data || []),
  });
  const variants = q.data || [];
  const ids = variants.map((v) => String(v._id));
  const stock = useQuery({
    queryKey: keys.inventory.list({ variants: ids, tenant: tenantId }),
    enabled: can("inventory.view") && ids.length > 0,
    queryFn: async () => {
      const res = await Promise.all(ids.map((id) => tenantApi.listInventory({ variantId: id, limit: 100 })));
      const out = {};
      res.forEach((r, i) => {
        const rows = r?.data || [];
        out[ids[i]] = {
          available: rows.reduce((s, x) => s + (Number(x.available) || 0), 0),
          reserved: rows.reduce((s, x) => s + (Number(x.reserved) || 0), 0),
          warehouses: rows.length,
        };
      });
      return out;
    },
  });

  const [editing, setEditing] = useState(null); // variant | "new" | null
  const [archiving, setArchiving] = useState(null);

  const canCreate = can("products.create");
  const canEdit = can("products.edit");
  const canDelete = can("products.delete");

  return (
    <Card>
      <CardHeader
        title="Variants & prices"
        description="Each variant has its own SKU, prices and quantity slabs. Archiving a variant zeroes its stock."
        actions={
          canCreate ? (
            archivedProduct ? (
              <Tooltip content="Restore the product to add variants">
                <span tabIndex={0} className="inline-flex">
                  <Button size="sm" leftIcon={Plus} disabled>
                    Add variant
                  </Button>
                </span>
              </Tooltip>
            ) : (
              <Button size="sm" leftIcon={Plus} onClick={() => setEditing("new")}>
                Add variant
              </Button>
            )
          ) : null
        }
      />
      {q.isPending ? (
        <div className="grid gap-2 p-4">
          <Skeleton className="h-8" />
          <Skeleton className="h-8" />
        </div>
      ) : q.error ? (
        <ErrorState error={q.error} onRetry={q.refetch} compact />
      ) : !variants.length ? (
        <EmptyState compact title="No live variants" description="A product needs at least one active variant to be sold." action={canCreate && !archivedProduct ? <Button size="sm" leftIcon={Plus} onClick={() => setEditing("new")}>Add variant</Button> : null} />
      ) : (
        <ul className="divide-y divide-border">
          {variants.map((v) => {
            const s = stock.data?.[String(v._id)];
            return (
              <li key={v._id} className="grid grid-cols-[minmax(0,1fr)] gap-2 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center sm:gap-4 sm:px-5">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-ui-sm font-medium text-fg">{v.sku}</span>
                    <StatusPill status={v.status} />
                  </div>
                  <p className="truncate text-ui-xs text-fg-muted">{attributeSummary(v.attributes) || "No attributes"}</p>
                  {v.tierPrices?.length ? (
                    <p className="text-ui-xs text-fg-subtle">
                      Slabs:{" "}
                      {v.tierPrices.map((t, i) => (
                        <span key={i}>
                          {i ? ", " : ""}
                          {t.minQty}
                          {t.maxQty ? `–${t.maxQty}` : "+"} @ <Money value={t.unitPrice} />
                        </span>
                      ))}
                    </p>
                  ) : null}
                </div>
                <div className="flex gap-6 text-ui-sm sm:justify-end">
                  <div className="grid text-right">
                    <span className="text-ui-2xs text-fg-subtle">Price</span>
                    <span>
                      <Money value={v.sellingPrice} />
                      {v.listPrice != null && v.listPrice !== v.sellingPrice ? (
                        <span className="ml-1 text-ui-xs text-fg-subtle line-through">
                          <Money value={v.listPrice} />
                        </span>
                      ) : null}
                    </span>
                  </div>
                  <div className="grid text-right">
                    <span className="text-ui-2xs text-fg-subtle">Available</span>
                    <span className="tabular-nums">
                      {!can("inventory.view") ? (
                        <span className="text-fg-subtle">—</span>
                      ) : stock.isPending ? (
                        <Skeleton className="h-4 w-10" />
                      ) : s ? (
                        <>
                          {s.available.toLocaleString("en-IN")}
                          {s.reserved ? <span className="ml-1 text-ui-xs text-fg-subtle">({s.reserved} held)</span> : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </span>
                  </div>
                </div>
                <div className="flex justify-end">
                  {canEdit || canDelete || can("inventory.view") ? (
                    <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${v.sku}`} size="sm" variant="ghost" />}>
                      {canEdit ? (
                        <MenuItem icon={Pencil} onSelect={() => setEditing(v)}>
                          Edit variant
                        </MenuItem>
                      ) : null}
                      {can("inventory.view") ? (
                        <MenuItem to={`/super-admin/reservations?tenant=${tenantId}&variantId=${v._id}`}>View stock holds</MenuItem>
                      ) : null}
                      {canDelete ? (
                        <MenuItem tone="danger" icon={Archive} onSelect={() => setArchiving(v)}>
                          Archive variant
                        </MenuItem>
                      ) : null}
                    </DropdownMenu>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {stock.error ? (
        <p className="border-t border-border px-5 py-2 text-ui-xs text-fg-subtle">Stock couldn’t be loaded: {stock.error.message}</p>
      ) : null}

      <VariantDialog
        open={Boolean(editing)}
        onOpenChange={(o) => !o && setEditing(null)}
        variant={editing && editing !== "new" ? editing : null}
        productId={productId}
        tenantApi={tenantApi}
      />
      <ConfirmDialog
        open={Boolean(archiving)}
        onOpenChange={(o) => !o && setArchiving(null)}
        title={`Archive variant ${archiving?.sku}?`}
        description="Buyers can no longer order it, its stock in every warehouse is zeroed and pending back-in-stock alerts are dropped. Order history is kept. The last active variant of a published product can't be archived."
        confirmLabel="Archive variant"
        tone="danger"
        onConfirm={async () => {
          await tenantApi.deleteVariant(archiving._id);
          await invalidate(keys.variants.all, keys.products.all, keys.inventory.all);
          toast.success("Variant archived");
        }}
      />
      {!archivedProduct && variants.length ? (
        <p className="border-t border-border px-5 py-2 text-ui-xs text-fg-subtle">
          Stock is adjusted in the store’s inventory, not here.{" "}
          {can("inventory.view") ? (
            <Link className="text-primary-soft-fg hover:underline" to={`/super-admin/reservations?tenant=${tenantId}`}>
              View this store’s stock holds
            </Link>
          ) : null}
        </p>
      ) : null}
    </Card>
  );
}
