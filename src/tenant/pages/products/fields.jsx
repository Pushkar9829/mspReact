import { useState } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, Link2, Plus, Trash2, X } from "lucide-react";
import { Button, Field, IconButton, Input, cn } from "../../../shared/ui/index.js";
import { MediaPickerDialog } from "../../../shared/components/MediaLibrary.jsx";
import { useCan } from "../../../shared/context/AuthContext.jsx";

/* ------------------------------------------------------------------ validation helpers */

export const ATTR_KEY = /^[A-Za-z][A-Za-z0-9 _-]{0,39}$/;
export const FIXED_ATTRS = ["size", "color", "grade", "material", "packSize", "unit"];
export const ATTR_LABELS = { size: "Size", color: "Colour", grade: "Grade", material: "Material", packSize: "Pack size", unit: "Unit" };

export const isBlank = (v) => v === "" || v === null || v === undefined;
export const toNum = (v) => (isBlank(v) ? undefined : Number(v));
export function moneyError(v, { required = false, label = "Price" } = {}) {
  if (isBlank(v)) return required ? `${label} is required` : undefined;
  const n = Number(v);
  if (!Number.isFinite(n)) return "Enter a number";
  if (n < 0) return "Can’t be negative";
  if (n > 1e9) return "Too large";
  // String check — `n * 100` float maths rejects valid prices like 1.13 or 4.35.
  if (!/^\d*\.?\d{0,2}$/.test(String(v).trim())) return "At most 2 decimals";
  return undefined;
}
export function intError(v, { min = 0, max = 1e9, required = false, label = "Value" } = {}) {
  if (isBlank(v)) return required ? `${label} is required` : undefined;
  const n = Number(v);
  if (!Number.isInteger(n)) return "Whole number";
  if (n < min) return `At least ${min}`;
  if (n > max) return `At most ${max}`;
  return undefined;
}

/* ------------------------------------------------------------------ images */

/**
 * Ordered image list (max 30) from the media library or by URL. First image = cover.
 */
export function ImagesField({ value = [], onChange, disabled, max = 30 }) {
  const can = useCan();
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const canPick = can(["media.upload", "products.create"]);

  function move(i, dir) {
    const next = [...value];
    const j = i + dir;
    if (j < 0 || j >= next.length) return;
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  }
  function addUrl(e) {
    e?.preventDefault?.();
    const v = url.trim();
    if (!v) return;
    if (!/^(https?:\/\/|\/)/i.test(v)) return setUrlError("Use an https:// or /uploads/ URL");
    if (v.length > 1000) return setUrlError("URL is too long");
    if (value.includes(v)) return setUrlError("Already added");
    if (value.length >= max) return setUrlError(`At most ${max} images`);
    onChange([...value, v]);
    setUrl("");
    setUrlError("");
  }

  return (
    <div className="grid gap-3">
      {value.length ? (
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-4 lg:grid-cols-5" aria-label="Product images">
          {value.map((src, i) => (
            <li key={src} className={cn("group relative overflow-hidden rounded-md border bg-surface-sunken", i === 0 ? "border-primary" : "border-border")}>
              <img src={src} alt={`Image ${i + 1}`} className="aspect-square w-full object-cover" loading="lazy" />
              {i === 0 ? <span className="absolute left-1.5 top-1.5 rounded-sm bg-primary px-1.5 text-ui-2xs font-medium text-fg-on-primary">Cover</span> : null}
              {!disabled ? (
                <div className="absolute inset-x-0 bottom-0 flex justify-between bg-surface/90 p-1 opacity-100 sm:opacity-0 sm:transition-opacity sm:group-focus-within:opacity-100 sm:group-hover:opacity-100">
                  <IconButton icon={ArrowLeft} size="xs" label={`Move image ${i + 1} earlier`} disabled={i === 0} onClick={() => move(i, -1)} />
                  <IconButton icon={Trash2} size="xs" label={`Remove image ${i + 1}`} className="text-danger-fg" onClick={() => onChange(value.filter((_, j) => j !== i))} />
                  <IconButton icon={ArrowRight} size="xs" label={`Move image ${i + 1} later`} disabled={i === value.length - 1} onClick={() => move(i, 1)} />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-md border border-dashed border-border-strong px-4 py-6 text-center text-ui-sm text-fg-muted">No images yet. The first image is used as the cover.</p>
      )}
      {!disabled ? (
        <div className="flex flex-wrap items-start gap-2">
          {canPick ? (
            <Button size="sm" leftIcon={ImagePlus} onClick={() => setOpen(true)} disabled={value.length >= max}>
              Add from media library
            </Button>
          ) : null}
          <div className="grid min-w-0 flex-1 basis-60 gap-1">
            <div className="flex gap-2">
              <Input
                size="sm"
                value={url}
                onChange={(e) => {
                  setUrl(e.target.value);
                  setUrlError("");
                }}
                onKeyDown={(e) => e.key === "Enter" && addUrl(e)}
                placeholder="…or paste an image URL"
                aria-label="Image URL"
                aria-invalid={urlError ? true : undefined}
                prefix={<Link2 aria-hidden />}
                className="flex-1"
              />
              <Button size="sm" onClick={addUrl} disabled={!url.trim()}>
                Add
              </Button>
            </div>
            {urlError ? <p className="text-ui-xs text-danger-fg" role="alert">{urlError}</p> : null}
          </div>
        </div>
      ) : null}
      <p className="text-ui-xs text-fg-subtle">
        {value.length}/{max} images
      </p>
      {canPick ? (
        <MediaPickerDialog
          open={open}
          onOpenChange={setOpen}
          multiple
          folder="catalog"
          title="Add product images"
          onPick={(urls) => onChange([...value, ...urls.filter((u) => !value.includes(u))].slice(0, max))}
        />
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ key/value rows */

/**
 * Editable key/value rows (custom variant attributes, specifications).
 * rows: [{ key, value }]. keyPattern validates keys.
 */
export function KeyValueRows({ rows, onChange, disabled, keyLabel = "Name", valueLabel = "Value", addLabel = "Add attribute", max = 20, keyPattern, keyHint }) {
  const keys = rows.map((r) => r.key.trim());
  return (
    <div className="grid gap-2">
      {rows.map((row, i) => {
        const k = row.key.trim();
        const keyErr = !k && row.value ? "Name required" : k && keyPattern && !keyPattern.test(k) ? keyHint || "Invalid name" : k && keys.indexOf(k) !== i ? "Duplicate" : undefined;
        return (
          <div key={i} className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_auto] items-start gap-2">
            <div className="grid gap-1">
              <Input size="sm" value={row.key} disabled={disabled} maxLength={40} aria-label={`${keyLabel} ${i + 1}`} aria-invalid={keyErr ? true : undefined} placeholder={keyLabel} onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, key: e.target.value } : r)))} />
              {keyErr ? <p className="text-ui-2xs text-danger-fg" role="alert">{keyErr}</p> : null}
            </div>
            <Input size="sm" value={row.value} disabled={disabled} maxLength={120} aria-label={`${valueLabel} ${i + 1}`} placeholder={valueLabel} onChange={(e) => onChange(rows.map((r, j) => (j === i ? { ...r, value: e.target.value } : r)))} />
            {!disabled ? <IconButton icon={X} size="sm" label={`Remove row ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} /> : <span />}
          </div>
        );
      })}
      {!disabled && rows.length < max ? (
        <Button size="xs" variant="ghost" leftIcon={Plus} className="justify-self-start" onClick={() => onChange([...rows, { key: "", value: "" }])}>
          {addLabel}
        </Button>
      ) : null}
    </div>
  );
}

export function keyValueErrors(rows, keyPattern) {
  const seen = new Set();
  for (const r of rows) {
    const k = r.key.trim();
    if (!k && !String(r.value).trim()) continue;
    if (!k) return "Every row needs a name";
    if (keyPattern && !keyPattern.test(k)) return `Invalid name “${k}”`;
    if (seen.has(k)) return `Duplicate name “${k}”`;
    seen.add(k);
  }
  return undefined;
}

/* ------------------------------------------------------------------ tier prices */

export function TierPricesEditor({ rows, onChange, disabled }) {
  return (
    <div className="grid gap-2">
      {rows.length ? (
        <div className="grid grid-cols-[1fr_1fr_1.2fr_auto] gap-2 text-ui-xs font-medium text-fg-muted">
          <span>Min qty</span>
          <span>Max qty</span>
          <span>Unit price (₹)</span>
          <span className="sr-only">Remove</span>
        </div>
      ) : (
        <p className="text-ui-sm text-fg-muted">No quantity slabs. Add slabs to give wholesale buyers a lower unit price for larger quantities.</p>
      )}
      {rows.map((r, i) => {
        const minErr = intError(r.minQty, { min: 1, required: true, label: "Min" });
        const maxErr = intError(r.maxQty, { min: 1 }) || (!isBlank(r.maxQty) && !minErr && Number(r.maxQty) < Number(r.minQty) ? "≥ min" : undefined);
        const priceErr = moneyError(r.unitPrice, { required: true });
        return (
          <div key={i} className="grid grid-cols-[1fr_1fr_1.2fr_auto] items-start gap-2">
            <Field error={minErr} labelHidden label={`Slab ${i + 1} min qty`}>
              <Input size="sm" type="number" min={1} step={1} disabled={disabled} value={r.minQty} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, minQty: e.target.value } : x)))} />
            </Field>
            <Field error={maxErr} labelHidden label={`Slab ${i + 1} max qty`}>
              <Input size="sm" type="number" min={1} step={1} disabled={disabled} placeholder="No max" value={r.maxQty} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, maxQty: e.target.value } : x)))} />
            </Field>
            <Field error={priceErr} labelHidden label={`Slab ${i + 1} unit price`}>
              <Input size="sm" type="number" min={0} step="0.01" disabled={disabled} prefix="₹" value={r.unitPrice} onChange={(e) => onChange(rows.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))} />
            </Field>
            {!disabled ? <IconButton icon={X} size="sm" label={`Remove slab ${i + 1}`} onClick={() => onChange(rows.filter((_, j) => j !== i))} /> : <span />}
          </div>
        );
      })}
      {!disabled && rows.length < 20 ? (
        <Button size="xs" variant="ghost" leftIcon={Plus} className="justify-self-start" onClick={() => onChange([...rows, { minQty: rows.length ? String((Number(rows[rows.length - 1].maxQty) || Number(rows[rows.length - 1].minQty) || 0) + 1) : "", maxQty: "", unitPrice: "" }])}>
          Add slab
        </Button>
      ) : null}
    </div>
  );
}

export function tierRowsFrom(list = []) {
  return (list || []).map((t) => ({ minQty: String(t.minQty ?? ""), maxQty: t.maxQty == null ? "" : String(t.maxQty), unitPrice: String(t.unitPrice ?? "") }));
}

export function tierPayload(rows) {
  return rows.map((r) => ({ minQty: Number(r.minQty), maxQty: isBlank(r.maxQty) ? null : Number(r.maxQty), unitPrice: Number(r.unitPrice) }));
}

export function tierErrors(rows) {
  for (const r of rows) {
    if (intError(r.minQty, { min: 1, required: true }) || intError(r.maxQty, { min: 1 }) || moneyError(r.unitPrice, { required: true })) return "Fix the quantity slabs";
    if (!isBlank(r.maxQty) && Number(r.maxQty) < Number(r.minQty)) return "Fix the quantity slabs";
  }
  return undefined;
}
