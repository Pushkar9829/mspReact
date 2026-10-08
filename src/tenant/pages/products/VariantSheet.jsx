import { useEffect, useState } from "react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { Alert, Button, ConfirmDialog, Field, FormSection, Input, NativeSelect, Sheet } from "../../../shared/ui/index.js";
import {
  ATTR_KEY,
  ATTR_LABELS,
  FIXED_ATTRS,
  KeyValueRows,
  TierPricesEditor,
  intError,
  isBlank,
  keyValueErrors,
  moneyError,
  tierErrors,
  tierPayload,
  tierRowsFrom,
} from "./fields.jsx";

export function variantFormFrom(v) {
  const a = v?.attributes || {};
  const custom = a.custom && typeof a.custom === "object" ? Object.entries(a.custom).map(([key, value]) => ({ key, value: String(value) })) : [];
  return {
    sku: v?.sku || "",
    barcode: v?.barcode || "",
    listPrice: v?.listPrice != null ? String(v.listPrice) : "",
    sellingPrice: v?.sellingPrice != null ? String(v.sellingPrice) : "",
    status: v?.status === "inactive" ? "inactive" : "active",
    attrs: Object.fromEntries(FIXED_ATTRS.map((k) => [k, a[k] ? String(a[k]) : ""])),
    weight: a.weight != null ? String(a.weight) : "",
    dims: { l: a.dimensions?.l != null ? String(a.dimensions.l) : "", w: a.dimensions?.w != null ? String(a.dimensions.w) : "", h: a.dimensions?.h != null ? String(a.dimensions.h) : "" },
    custom,
    tiers: tierRowsFrom(v?.tierPrices),
  };
}

export function variantErrors(f, { skuOptional = false } = {}) {
  const e = {};
  if (!f.sku.trim() && !skuOptional) e.sku = "SKU is required";
  if (f.sku.length > 80) e.sku = "At most 80 characters";
  e.listPrice = moneyError(f.listPrice, { required: true, label: "MRP / list price" });
  e.sellingPrice = moneyError(f.sellingPrice, { required: true, label: "Selling price" });
  if (!e.listPrice && !e.sellingPrice && Number(f.sellingPrice) > Number(f.listPrice)) e.sellingPrice = "Selling price is above the list price";
  if (!isBlank(f.weight) && (!Number.isFinite(Number(f.weight)) || Number(f.weight) < 0)) e.weight = "Enter grams ≥ 0";
  ["l", "w", "h"].forEach((k) => {
    if (!isBlank(f.dims[k]) && (!Number.isFinite(Number(f.dims[k])) || Number(f.dims[k]) < 0)) e.dims = "Dimensions must be ≥ 0";
  });
  e.custom = keyValueErrors(f.custom, ATTR_KEY);
  if (f.custom.filter((r) => r.key.trim()).length > 20) e.custom = "At most 20 custom attributes";
  e.tiers = tierErrors(f.tiers);
  Object.keys(e).forEach((k) => e[k] === undefined && delete e[k]);
  return e;
}

/** Full variant body (POST /variants or the `variant` of POST /products). */
export function variantPayload(f) {
  const attributes = {};
  FIXED_ATTRS.forEach((k) => {
    attributes[k] = f.attrs[k].trim();
  });
  if (!isBlank(f.weight)) attributes.weight = Number(f.weight);
  const dims = {};
  ["l", "w", "h"].forEach((k) => {
    if (!isBlank(f.dims[k])) dims[k] = Number(f.dims[k]);
  });
  if (Object.keys(dims).length) attributes.dimensions = dims;
  const custom = Object.fromEntries(f.custom.filter((r) => r.key.trim()).map((r) => [r.key.trim(), r.value.trim()]));
  if (Object.keys(custom).length) attributes.custom = custom;
  const body = {
    listPrice: Number(f.listPrice),
    sellingPrice: Number(f.sellingPrice),
    status: f.status,
    attributes,
    tierPrices: tierPayload(f.tiers),
  };
  if (f.sku.trim()) body.sku = f.sku.trim();
  if (f.barcode.trim()) body.barcode = f.barcode.trim();
  return body;
}

/** Only the fields that changed (PATCH /variants/:id). */
function variantPatch(f, initial) {
  const full = variantPayload(f);
  const base = variantPayload(initial);
  const out = {};
  Object.keys(full).forEach((k) => {
    if (JSON.stringify(full[k]) !== JSON.stringify(base[k])) out[k] = full[k];
  });
  if (initial.barcode && !f.barcode.trim()) out.barcode = "";
  // Clearing: omitted keys are left untouched by the API, so send explicit "clear" values.
  if (out.attributes) {
    if (!isBlank(initial.weight) && isBlank(f.weight)) out.attributes.weight = null;
    if (base.attributes.dimensions && !full.attributes.dimensions) out.attributes.dimensions = null;
    if (base.attributes.custom && !full.attributes.custom) out.attributes.custom = {};
  }
  return out;
}

/** Variant fields (shared by the create-product form and the variant sheet). */
export function VariantFields({ form, setForm, errors = {}, apiError, disabled, skuOptional, showStatus = true }) {
  const fe = (name) => errors[name] || apiError?.fieldError?.(name);
  return (
    <div className="grid gap-0">
      <FormSection title="Identity" description="SKU must be unique in your store. Barcode is optional (EAN/UPC).">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="SKU" required={!skuOptional} optional={skuOptional} hint={skuOptional ? "Defaults to the product SKU." : "Saved in upper case."} error={fe("sku")}>
            <Input value={form.sku} maxLength={80} disabled={disabled} onChange={(e) => setForm({ ...form, sku: e.target.value })} autoComplete="off" className="font-mono" />
          </Field>
          <Field label="Barcode" optional error={fe("barcode")}>
            <Input value={form.barcode} maxLength={80} disabled={disabled} onChange={(e) => setForm({ ...form, barcode: e.target.value })} inputMode="numeric" />
          </Field>
          {showStatus ? (
            <Field label="Status" error={fe("status")} hint="Inactive variants can’t be bought.">
              <NativeSelect value={form.status} disabled={disabled} onChange={(e) => setForm({ ...form, status: e.target.value })} options={[{ value: "active", label: "Active" }, { value: "inactive", label: "Inactive" }]} />
            </Field>
          ) : null}
        </div>
      </FormSection>
      <FormSection title="Pricing" description="Prices include GST. The selling price is what buyers pay; the list price (MRP) is shown struck through.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="List price / MRP" required error={fe("listPrice")}>
            <Input type="number" min={0} step="0.01" prefix="₹" disabled={disabled} value={form.listPrice} onChange={(e) => setForm({ ...form, listPrice: e.target.value })} />
          </Field>
          <Field label="Selling price" required error={fe("sellingPrice")}>
            <Input type="number" min={0} step="0.01" prefix="₹" disabled={disabled} value={form.sellingPrice} onChange={(e) => setForm({ ...form, sellingPrice: e.target.value })} />
          </Field>
        </div>
        <Field label="Quantity slabs (wholesale)" optional error={fe("tiers") || apiError?.fieldError?.("tierPrices")}>
          <TierPricesEditor rows={form.tiers} disabled={disabled} onChange={(tiers) => setForm({ ...form, tiers })} />
        </Field>
      </FormSection>
      <FormSection title="Attributes" description="Shown as options on the product page. Add your own attributes (e.g. Flavour, Voltage).">
        <div className="grid gap-4 sm:grid-cols-3">
          {FIXED_ATTRS.map((k) => (
            <Field key={k} label={ATTR_LABELS[k]} optional error={apiError?.fieldError?.(`attributes.${k}`)}>
              <Input value={form.attrs[k]} maxLength={k === "unit" ? 20 : k === "packSize" ? 40 : 60} disabled={disabled} onChange={(e) => setForm({ ...form, attrs: { ...form.attrs, [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
        <Field label="Custom attributes" optional hint="Names start with a letter; letters, digits, space, - or _ (max 40). Up to 20." error={fe("custom") || apiError?.fieldError?.("attributes.custom")}>
          <KeyValueRows rows={form.custom} disabled={disabled} onChange={(custom) => setForm({ ...form, custom })} keyPattern={ATTR_KEY} keyHint="Start with a letter; letters, digits, space, - or _" addLabel="Add custom attribute" />
        </Field>
      </FormSection>
      <FormSection title="Shipping" description="Used to quote courier charges and book shipments.">
        <div className="grid gap-4 sm:grid-cols-4">
          <Field label="Weight (g)" optional error={fe("weight")}>
            <Input type="number" min={0} step="1" disabled={disabled} value={form.weight} onChange={(e) => setForm({ ...form, weight: e.target.value })} />
          </Field>
          {["l", "w", "h"].map((k) => (
            <Field key={k} label={{ l: "Length (cm)", w: "Width (cm)", h: "Height (cm)" }[k]} optional error={k === "l" ? fe("dims") : undefined}>
              <Input type="number" min={0} step="0.1" disabled={disabled} value={form.dims[k]} onChange={(e) => setForm({ ...form, dims: { ...form.dims, [k]: e.target.value } })} />
            </Field>
          ))}
        </div>
      </FormSection>
    </div>
  );
}

/**
 * Create / edit one variant of a product.
 *   <VariantSheet productId open onOpenChange variant={null | row} canEdit />
 */
export function VariantSheet({ productId, variant, open, onOpenChange, canEdit = true }) {
  const isNew = !variant;
  const [form, setForm] = useState(() => variantFormFrom(variant));
  const [initial, setInitial] = useState(() => variantFormFrom(variant));
  const [submitted, setSubmitted] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  useEffect(() => {
    if (open) {
      const f = variantFormFrom(variant);
      setForm(f);
      setInitial(f);
      setSubmitted(false);
    }
  }, [open, variant]);

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const errors = variantErrors(form);
  const save = useApiMutation((body) => (isNew ? api.createVariant({ productId, ...body }) : api.updateVariant(variant._id, body)), {
    invalidate: [keys.products.detail(productId), keys.products.lists(), keys.variants.all, keys.inventory.all],
    success: isNew ? "Variant added" : "Variant saved",
    error: false,
    onSuccess: () => onOpenChange(false),
  });

  function submit(e) {
    e.preventDefault();
    setSubmitted(true);
    if (Object.keys(errors).length) return;
    const body = isNew ? variantPayload(form) : variantPatch(form, initial);
    if (!Object.keys(body).length) return onOpenChange(false);
    save.mutate(body);
  }

  function requestClose(next) {
    if (next) return onOpenChange(true);
    if (dirty && !save.isPending) setConfirmClose(true);
    else onOpenChange(false);
  }

  const shownErrors = submitted ? errors : {};
  const apiErr = save.error;
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={requestClose}
        size="xl"
        title={isNew ? "Add variant" : `Edit variant ${variant.sku}`}
        description={isNew ? "A variant is a sellable option of this product with its own SKU, price and stock." : "Changes apply to new carts and orders immediately."}
        dirty={dirty}
        busy={save.isPending}
        footer={
          canEdit ? (
            <>
              {submitted && Object.keys(errors).length ? <span className="mr-auto text-ui-sm text-danger-fg">Fix the highlighted fields</span> : null}
              <Button onClick={() => requestClose(false)} disabled={save.isPending}>
                Cancel
              </Button>
              <Button type="submit" form="variant-form" variant="primary" loading={save.isPending} disabled={!dirty && !isNew}>
                {isNew ? "Add variant" : "Save variant"}
              </Button>
            </>
          ) : null
        }
      >
        <form id="variant-form" onSubmit={submit} noValidate>
          {apiErr ? (
            <Alert tone="danger" className="mb-4" title={apiErr.code === "DUPLICATE" ? "SKU already in use" : "Couldn’t save the variant"}>
              {apiErr.message}
            </Alert>
          ) : null}
          {isNew ? <Alert tone="info" className="mb-4">New variants start with no stock. Add stock in Inventory after saving.</Alert> : null}
          <VariantFields form={form} setForm={setForm} errors={shownErrors} apiError={apiErr} disabled={!canEdit} />
        </form>
      </Sheet>
      <ConfirmDialog
        open={confirmClose}
        onOpenChange={setConfirmClose}
        title="Discard variant changes?"
        description="Your edits to this variant will be lost."
        confirmLabel="Discard"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => onOpenChange(false)}
      />
    </>
  );
}
