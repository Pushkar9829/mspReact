import { useEffect, useId, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Minus, Plus } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { rowsOf } from "../../../shared/auth.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { Alert, Button, Combobox, ConfirmDialog, Dialog, Field, Input, NativeSelect, RadioGroup, Skeleton, Textarea, cn } from "../../../shared/ui/index.js";
import {
  ADJUST_REASONS,
  STOCK_KEYS,
  adjustPreview,
  fmtQty,
  parseWhole,
  productOf,
  signed,
  useStockRow,
  useWarehouses,
  variantIdOf,
  variantSummary,
  warehouseIdOf,
  warehouseLabel,
} from "./lib.js";

const MAX_QTY = 1_000_000;
const NOTE_MAX = 500;

/* ------------------------------------------------------------------ shared bits */

/** "Available 96 → 106" lines. */
export function StockPreview({ lines = [], loading, error, title = "After this change" }) {
  if (loading) return <Skeleton className="h-14 w-full" />;
  if (!lines.length) return null;
  return (
    <div className={cn("grid gap-1.5 rounded-md border px-3 py-2.5", error ? "border-danger/40 bg-danger-soft" : "border-border bg-surface-2")} aria-live="polite">
      <p className="text-ui-xs font-medium text-fg-muted">{title}</p>
      {lines.map((l) => {
        const diff = l.after - l.before;
        return (
          <div key={l.label} className="flex flex-wrap items-center gap-2 text-ui-sm tabular-nums">
            <span className="min-w-24 text-fg-muted">{l.label}</span>
            <span className="text-fg">{fmtQty(l.before)}</span>
            <ArrowRight aria-hidden className="size-3.5 text-fg-subtle" />
            <span className={cn("font-semibold", l.after < 0 ? "text-danger-fg" : "text-fg")}>{fmtQty(l.after)}</span>
            {diff ? <span className={cn("text-ui-xs", diff > 0 ? "text-success-fg" : "text-danger-fg")}>({signed(diff)})</span> : null}
            <span className="sr-only">{`${l.label} changes from ${l.before} to ${l.after}`}</span>
          </div>
        );
      })}
      {error ? <p className="text-ui-xs text-danger-fg">{error}</p> : null}
    </div>
  );
}

/** Product / variant / warehouse header shown at the top of every row dialog. */
export function StockRowSummary({ row }) {
  const product = productOf(row);
  const img = product?.images?.[0];
  const summary = variantSummary(row?.variantId);
  return (
    <div className="flex items-center gap-3 rounded-md border border-border bg-surface-2 p-2.5">
      <div className="size-10 shrink-0 overflow-hidden rounded-md border border-border bg-surface-sunken">{img ? <img src={img} alt="" className="size-full object-cover" loading="lazy" /> : null}</div>
      <div className="min-w-0 text-ui-sm">
        <p className="truncate font-medium text-fg">{product?.name || row?.sku}</p>
        <p className="truncate text-ui-xs text-fg-muted">
          <span className="font-mono">{row?.sku}</span>
          {summary ? ` · ${summary}` : ""}
          {row?.warehouseId?.name ? ` · ${warehouseLabel(row.warehouseId)}` : ""}
        </p>
      </div>
    </div>
  );
}

function GeneralError({ error }) {
  if (!error) return null;
  const fieldCount = Object.keys(error.fields || {}).length;
  if (fieldCount && error.code === "VALIDATION_ERROR") return null;
  return (
    <Alert tone="danger" title={error.code === "INSUFFICIENT_STOCK" ? "Not enough stock" : error.code === "VARIANT_DELETED" ? "This variant was deleted" : undefined}>
      {error.message}
      {error.code === "VARIANT_DELETED" ? " Restore the variant on the product page before adding sellable stock." : ""}
      {error.requestId ? <span className="mt-1 block font-mono text-ui-2xs opacity-80">Reference: {error.requestId}</span> : null}
    </Alert>
  );
}

function qtyError(text, { min = 1, max = MAX_QTY, label = "Quantity" } = {}) {
  if (String(text).trim() === "") return `${label} is required`;
  const n = parseWhole(text);
  if (!Number.isInteger(n)) return `${label} must be a whole number`;
  if (n < min) return min === 1 ? `${label} must be at least 1` : `${label} must be at least ${min}`;
  if (n > max) return `${label} must be at most ${fmtQty(max)}`;
  return null;
}

function SignToggle({ value, onChange, disabled }) {
  return (
    <div role="radiogroup" aria-label="Direction" className="inline-flex rounded-md border border-border-strong p-0.5">
      {[
        { v: 1, label: "Add", icon: Plus },
        { v: -1, label: "Remove", icon: Minus },
      ].map((o) => (
        <button
          key={o.v}
          type="button"
          role="radio"
          aria-checked={value === o.v}
          disabled={disabled}
          onClick={() => onChange(o.v)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-sm px-2.5 text-ui-sm font-medium outline-none focus-visible:outline-2 focus-visible:outline-ring",
            value === o.v ? "bg-primary text-fg-on-primary" : "text-fg-muted hover:bg-surface-hover hover:text-fg"
          )}
        >
          <o.icon aria-hidden className="size-3.5" />
          {o.label}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ Adjust */

/**
 * Adjust stock. With `row` the variant + warehouse are fixed; without it the user picks
 * product → variant → warehouse (page-level "Adjust stock").
 */
export function AdjustDialog({ open, onOpenChange, row }) {
  const formId = useId();
  const can = useCan();
  const warehouses = useWarehouses();
  const [reason, setReason] = useState("inward");
  const [sign, setSign] = useState(1);
  const [qtyText, setQtyText] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  // picker mode
  const [productId, setProductId] = useState("");
  const [productName, setProductName] = useState("");
  const [variantId, setVariantId] = useState("");
  const [warehouseId, setWarehouseId] = useState("");
  const [pickedRow, setPickedRow] = useState(null);

  const pickByProduct = !row && can("products.view");

  const adjust = useApiMutation((body) => api.adjustInventory(body), { invalidate: STOCK_KEYS, success: "Stock adjusted", error: false });

  useEffect(() => {
    if (!open) return;
    setReason("inward");
    setSign(1);
    setQtyText("");
    setNote("");
    setTouched(false);
    setProductId("");
    setProductName("");
    setVariantId("");
    setWarehouseId("");
    setPickedRow(null);
    adjust.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const variants = useQuery({
    queryKey: keys.variants.list({ productId }),
    queryFn: () => api.listVariants({ productId }),
    enabled: Boolean(open && pickByProduct && productId),
  });
  const variantRows = rowsOf(variants.data);
  useEffect(() => {
    if (variantRows.length === 1 && !variantId) setVariantId(variantRows[0]._id);
  }, [variantRows, variantId]);
  useEffect(() => {
    if (!row && !warehouseId && warehouses.list.length === 1) setWarehouseId(warehouses.list[0]._id);
  }, [row, warehouseId, warehouses.list]);

  const vId = row ? variantIdOf(row) : pickByProduct ? variantId : variantIdOf(pickedRow);
  const wId = row ? warehouseIdOf(row) : pickByProduct ? warehouseId : warehouseIdOf(pickedRow);
  const current = useStockRow(vId, wId, open);
  const base = current.data !== undefined ? current.data : row || pickedRow;

  const meta = ADJUST_REASONS.find((r) => r.value === reason) || ADJUST_REASONS[0];
  const effectiveSign = meta.sign === "any" ? sign : 1;
  const qErr = qtyError(qtyText);
  const qty = qErr ? NaN : effectiveSign * parseWhole(qtyText);
  const preview = adjustPreview(base, reason, qty);
  const noteErr = note.length > NOTE_MAX ? `Note must be at most ${NOTE_MAX} characters` : null;
  const pickErr = !vId ? "Choose a product variant" : !wId ? "Choose a warehouse" : null;
  const blocking = qErr || noteErr || pickErr || preview.error;
  const dirty = Boolean(qtyText || note || productId || pickedRow);

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (blocking || adjust.isPending) return;
    adjust.mutate(
      { warehouseId: wId, variantId: vId, reason, qty, ...(note.trim() ? { note: note.trim() } : {}) },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  const variantOptions = variantRows.map((v) => ({
    value: v._id,
    label: `${v.sku}${variantSummary(v) ? ` — ${variantSummary(v)}` : ""}${v.status && v.status !== "active" ? ` (${v.status})` : ""}`,
  }));
  const whOptions = warehouses.list.map((w) => ({ value: w._id, label: `${warehouseLabel(w)}${w.status === "inactive" ? " — inactive" : ""}` }));

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Adjust stock"
      description="Record a stock movement. Every adjustment is written to the transaction history."
      dirty={dirty}
      busy={adjust.isPending}
      size="md"
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={adjust.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={adjust.isPending} disabled={touched && Boolean(blocking)}>
            Save adjustment
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4" noValidate>
        {row ? (
          <StockRowSummary row={row} />
        ) : pickByProduct ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Product" required className="sm:col-span-2" error={touched && !productId ? "Choose a product" : undefined}>
              <Combobox
                value={productId}
                selectedLabel={productName}
                onChange={(v, o) => {
                  setProductId(v);
                  setProductName(o?.label || "");
                  setVariantId("");
                }}
                queryKey={keys.products.custom("picker")}
                search={(q) => api.listStaffProducts({ q: q || undefined, limit: 20 })}
                mapOption={(p) => ({ value: p._id, label: p.name, description: `${p.sku || ""}${p.status ? ` · ${p.status}` : ""}` })}
                placeholder="Search products…"
                searchPlaceholder="Product name or SKU"
                emptyText="No products match"
              />
            </Field>
            <Field label="Variant" required name="variantId" errors={adjust.error} error={touched && productId && !variantId ? "Choose a variant" : undefined}>
              <NativeSelect value={variantId} onChange={(e) => setVariantId(e.target.value)} disabled={!productId || variants.isPending} placeholder={productId ? (variants.isPending ? "Loading…" : "Select variant") : "Pick a product first"} options={variantOptions} />
            </Field>
            <Field label="Warehouse" required name="warehouseId" errors={adjust.error} error={touched && !warehouseId ? "Choose a warehouse" : undefined}>
              <NativeSelect value={warehouseId} onChange={(e) => setWarehouseId(e.target.value)} placeholder="Select warehouse" options={whOptions} disabled={!warehouses.allowed} />
            </Field>
            {!warehouses.allowed ? <Alert tone="warning" className="sm:col-span-2">Choosing a warehouse requires warehouses.view.</Alert> : null}
          </div>
        ) : (
          <Field label="Stock item" required hint="Search by product name or SKU" error={touched && !pickedRow ? "Choose a stock item" : undefined}>
            <Combobox
              value={pickedRow?._id || ""}
              selectedLabel={pickedRow ? `${productOf(pickedRow)?.name || pickedRow.sku} — ${pickedRow.warehouseId?.name || ""}` : ""}
              onChange={(_v, o) => setPickedRow(o?.row || null)}
              queryKey={keys.inventory.custom("picker")}
              search={(q) => api.listInventory({ q: q || undefined, limit: 20 })}
              mapOption={(r) => ({ value: r._id, row: r, label: `${productOf(r)?.name || r.sku} — ${r.sku}`, description: `${warehouseLabel(r.warehouseId)} · ${fmtQty(r.available)} available` })}
              placeholder="Search stock…"
              searchPlaceholder="Product name or SKU"
            />
          </Field>
        )}

        <Field label="Reason" name="reason" errors={adjust.error}>
          <RadioGroup value={reason} onValueChange={setReason} options={ADJUST_REASONS.map((r) => ({ value: r.value, label: r.label, description: r.description }))} />
        </Field>

        <div className="grid gap-1.5">
          <Field
            label={reason === "damage" ? "Units to mark damaged" : reason === "incoming" ? "Incoming units" : "Quantity"}
            name="qty"
            errors={adjust.error}
            error={touched ? qErr : undefined}
            required
            hint={meta.sign === "any" ? "Choose Add or Remove, then enter how many units." : "Whole units, at least 1."}
          >
            <div className="flex flex-wrap items-center gap-2">
              {meta.sign === "any" ? <SignToggle value={sign} onChange={setSign} disabled={adjust.isPending} /> : null}
              <Input inputMode="numeric" autoComplete="off" value={qtyText} onChange={(e) => setQtyText(e.target.value.replace(/[^\d]/g, ""))} className="w-32" placeholder="0" aria-label="Quantity" />
            </div>
          </Field>
        </div>

        <StockPreview lines={preview.lines} error={preview.error} loading={Boolean(vId && wId && current.isPending && !row)} />

        <Field label="Note" optional name="note" errors={adjust.error} error={noteErr || undefined} hint="Shown in the transaction history, e.g. a GRN or stock-take reference.">
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} maxLength={NOTE_MAX + 50} />
        </Field>

        <GeneralError error={adjust.error} />
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Set quantity */

const SET_REASONS = [
  { value: "set", label: "Stock count", description: "A physical count or cycle count." },
  { value: "adjustment", label: "Correction", description: "Fixing an earlier mistake." },
  { value: "inward", label: "Stock received", description: "New units arrived and you counted the shelf." },
  { value: "return", label: "Customer return", description: "Units came back outside the order return flow." },
];

/**
 * Set the absolute sellable quantity (POST /inventory/set-quantity). The server does a compare-and-set
 * and never touches reserved or committed units, so there is no client-side delta to go stale.
 */
export function SetQuantityDialog({ open, onOpenChange, row }) {
  const formId = useId();
  const [target, setTarget] = useState("");
  const [reason, setReason] = useState("set");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const save = useApiMutation((body) => api.setInventoryQuantity(body), {
    invalidate: STOCK_KEYS,
    error: false,
    success: (res) => `Available set to ${fmtQty(res?.available)}`,
  });
  const current = useStockRow(variantIdOf(row), warehouseIdOf(row), open);

  useEffect(() => {
    if (!open) return;
    setTarget(row ? String(row.available ?? "") : "");
    setReason("set");
    setNote("");
    setTouched(false);
    setConfirming(false);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?._id]);

  const base = current.data !== undefined ? current.data : row;
  const available = Number(base?.available) || 0;
  const tErr = qtyError(target, { min: 0, max: 10_000_000, label: "New quantity" });
  const noteErr = note.length > NOTE_MAX ? `Note must be at most ${NOTE_MAX} characters` : null;
  const t = parseWhole(target);
  const same = Number.isInteger(t) && t === available;
  const dirty = row ? String(row.available ?? "") !== target || Boolean(note) : false;
  const lines = row && Number.isInteger(t) ? [{ label: "Available", before: available, after: t }] : [];

  function review(e) {
    e.preventDefault();
    setTouched(true);
    if (tErr || noteErr || !row || same) return;
    save.reset();
    setConfirming(true);
  }

  async function apply() {
    await save.mutateAsync({ variantId: variantIdOf(row), warehouseId: warehouseIdOf(row), qty: t, reason, ...(note.trim() ? { note: note.trim() } : {}) });
    setConfirming(false);
    onOpenChange(false);
  }

  return (
    <>
      <Dialog
        open={open && !confirming}
        onOpenChange={onOpenChange}
        title="Set available quantity"
        description="Use after a stock count. Reserved and committed units are not affected."
        dirty={dirty}
        busy={save.isPending}
        footer={
          <>
            <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
              Cancel
            </Button>
            <Button type="submit" form={formId} variant="primary" disabled={touched && Boolean(tErr || noteErr || same)}>
              Review change
            </Button>
          </>
        }
      >
        <form id={formId} onSubmit={review} className="grid gap-4" noValidate>
          {row ? <StockRowSummary row={row} /> : null}
          <Field label="New available quantity" required error={touched ? tErr : undefined} hint="Counted sellable units on the shelf, excluding reserved and committed units.">
            <Input inputMode="numeric" autoComplete="off" value={target} onChange={(e) => setTarget(e.target.value.replace(/[^\d]/g, ""))} className="w-40" autoFocus />
          </Field>
          <StockPreview lines={lines} loading={current.isPending && !row} title="Current → new" />
          {same && touched ? <Alert tone="info">Available is already {fmtQty(available)}. Nothing to change.</Alert> : null}
          <Field label="Reason">
            <RadioGroup value={reason} onValueChange={setReason} orientation="horizontal" options={SET_REASONS} />
          </Field>
          <Field label="Note" optional error={noteErr || undefined} hint="Shown in the transaction history.">
            <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Cycle count 6 Oct" />
          </Field>
        </form>
      </Dialog>
      <ConfirmDialog
        open={open && confirming}
        onOpenChange={(v) => !v && setConfirming(false)}
        title={`Set available to ${Number.isInteger(t) ? fmtQty(t) : "—"}?`}
        description={`${row?.sku || "This item"} in ${row?.warehouseId?.name || "this warehouse"}: available ${fmtQty(available)} → ${Number.isInteger(t) ? fmtQty(t) : "—"}. The server sets the exact number, even if orders changed the count since you opened this.`}
        confirmLabel="Set quantity"
        tone={Number.isInteger(t) && t < available ? "danger" : "primary"}
        onConfirm={apply}
      >
        {save.error ? <GeneralError error={save.error} /> : null}
      </ConfirmDialog>
    </>
  );
}

/* ------------------------------------------------------------------ Transfer */

export function TransferDialog({ open, onOpenChange, row }) {
  const formId = useId();
  const warehouses = useWarehouses();
  const [to, setTo] = useState("");
  const [qtyText, setQtyText] = useState("");
  const [note, setNote] = useState("");
  const [touched, setTouched] = useState(false);
  const transfer = useApiMutation((body) => api.transferInventory(body), { invalidate: STOCK_KEYS, success: "Stock transferred", error: false });

  const fromId = warehouseIdOf(row);
  const vId = variantIdOf(row);
  const destinations = useMemo(() => warehouses.list.filter((w) => String(w._id) !== String(fromId)), [warehouses.list, fromId]);

  useEffect(() => {
    if (!open) return;
    setTo("");
    setQtyText("");
    setNote("");
    setTouched(false);
    transfer.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);
  useEffect(() => {
    if (open && !to && destinations.length === 1) setTo(String(destinations[0]._id));
  }, [open, to, destinations]);

  const source = useStockRow(vId, fromId, open);
  const dest = useStockRow(vId, to, open);
  const fromAvail = Number((source.data ?? row)?.available) || 0;
  const toAvail = Number(dest.data?.available) || 0;
  const qErr = qtyError(qtyText);
  const qty = qErr ? NaN : parseWhole(qtyText);
  const overErr = Number.isInteger(qty) && qty > fromAvail ? `Only ${fmtQty(fromAvail)} available in ${row?.warehouseId?.name || "the source warehouse"}.` : null;
  const toErr = !to ? "Choose a destination warehouse" : String(to) === String(fromId) ? "Destination must differ from the source" : null;
  const noteErr = note.length > NOTE_MAX ? `Note must be at most ${NOTE_MAX} characters` : null;
  const blocking = qErr || overErr || toErr || noteErr;
  const toName = warehouses.byId[String(to)]?.name || "Destination";

  const lines = Number.isInteger(qty)
    ? [
        { label: row?.warehouseId?.name || "Source", before: fromAvail, after: fromAvail - qty },
        ...(to ? [{ label: toName, before: toAvail, after: toAvail + qty }] : []),
      ]
    : [];

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (blocking || transfer.isPending) return;
    transfer.mutate(
      { fromWarehouseId: fromId, toWarehouseId: to, variantId: vId, qty, ...(note.trim() ? { note: note.trim() } : {}) },
      { onSuccess: () => onOpenChange(false) }
    );
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Transfer stock"
      description="Move available units between your warehouses. Reserved and committed units stay where they are."
      dirty={Boolean(qtyText || note || to)}
      busy={transfer.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={transfer.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={transfer.isPending} disabled={touched && Boolean(blocking)}>
            Transfer
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4" noValidate>
        {row ? <StockRowSummary row={row} /> : null}
        {!warehouses.allowed ? (
          <Alert tone="warning">Choosing a destination requires warehouses.view.</Alert>
        ) : !warehouses.isPending && !destinations.length ? (
          <Alert tone="info">You only have one warehouse. Create another warehouse to transfer stock.</Alert>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="From">
            <Input value={warehouseLabel(row?.warehouseId)} readOnly disabled />
          </Field>
          <Field label="To" required name="toWarehouseId" errors={transfer.error} error={touched ? toErr : undefined}>
            <NativeSelect
              value={to}
              onChange={(e) => setTo(e.target.value)}
              placeholder="Select warehouse"
              disabled={!destinations.length}
              options={destinations.map((w) => ({ value: String(w._id), label: `${warehouseLabel(w)}${w.status === "inactive" ? " — inactive" : ""}` }))}
            />
          </Field>
        </div>
        <Field label="Units to move" required name="qty" errors={transfer.error} error={touched ? qErr || overErr : overErr || undefined} hint={`${fmtQty(fromAvail)} available to move`}>
          <Input inputMode="numeric" autoComplete="off" value={qtyText} onChange={(e) => setQtyText(e.target.value.replace(/[^\d]/g, ""))} className="w-32" />
        </Field>
        <StockPreview lines={lines} error={overErr} loading={Boolean(to && dest.isPending)} />
        <Field label="Note" optional name="note" errors={transfer.error} error={noteErr || undefined}>
          <Textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Rebalance for festive demand" />
        </Field>
        <GeneralError error={transfer.error} />
      </form>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ Thresholds */

export function ThresholdsDialog({ open, onOpenChange, row }) {
  const formId = useId();
  const initial = { lowStockThreshold: String(row?.lowStockThreshold ?? 0), incoming: String(row?.incoming ?? 0) };
  const [form, setForm] = useState(initial);
  const [touched, setTouched] = useState(false);
  const save = useApiMutation((body) => api.updateInventoryThresholds(row._id, body), { invalidate: STOCK_KEYS, success: "Thresholds saved", error: false });

  useEffect(() => {
    if (!open) return;
    setForm({ lowStockThreshold: String(row?.lowStockThreshold ?? 0), incoming: String(row?.incoming ?? 0) });
    setTouched(false);
    save.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, row?._id]);

  const lErr = qtyError(form.lowStockThreshold, { min: 0, label: "Threshold" });
  const iErr = qtyError(form.incoming, { min: 0, label: "Incoming" });
  const changed = {};
  if (!lErr && parseWhole(form.lowStockThreshold) !== Number(row?.lowStockThreshold ?? 0)) changed.lowStockThreshold = parseWhole(form.lowStockThreshold);
  if (!iErr && parseWhole(form.incoming) !== Number(row?.incoming ?? 0)) changed.incoming = parseWhole(form.incoming);
  const dirty = form.lowStockThreshold !== initial.lowStockThreshold || form.incoming !== initial.incoming;
  const available = Number(row?.available) || 0;
  const threshold = lErr ? null : parseWhole(form.lowStockThreshold);
  const willBeLow = threshold != null && (available <= 0 || (threshold > 0 && available <= threshold));

  function submit(e) {
    e.preventDefault();
    setTouched(true);
    if (lErr || iErr || !Object.keys(changed).length || save.isPending) return;
    save.mutate(changed, { onSuccess: () => onOpenChange(false) });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Edit thresholds"
      description="Low-stock alerts fire once when available stock drops to the threshold."
      dirty={dirty}
      busy={save.isPending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={save.isPending}>
            Cancel
          </Button>
          <Button type="submit" form={formId} variant="primary" loading={save.isPending} disabled={!Object.keys(changed).length || Boolean(lErr || iErr)}>
            Save
          </Button>
        </>
      }
    >
      <form id={formId} onSubmit={submit} className="grid gap-4" noValidate>
        {row ? <StockRowSummary row={row} /> : null}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Low-stock threshold" name="lowStockThreshold" errors={save.error} error={touched || lErr ? lErr : undefined} hint="0 turns the alert off (out of stock still counts as low).">
            <Input inputMode="numeric" autoComplete="off" value={form.lowStockThreshold} onChange={(e) => setForm({ ...form, lowStockThreshold: e.target.value.replace(/[^\d]/g, "") })} />
          </Field>
          <Field label="Incoming units" name="incoming" errors={save.error} error={touched || iErr ? iErr : undefined} hint="Expected units on order. Informational only.">
            <Input inputMode="numeric" autoComplete="off" value={form.incoming} onChange={(e) => setForm({ ...form, incoming: e.target.value.replace(/[^\d]/g, "") })} />
          </Field>
        </div>
        {threshold != null ? (
          <p className="text-ui-sm text-fg-muted">
            With {fmtQty(available)} available this item will be {willBeLow ? <strong className="text-warning-fg">flagged as low stock</strong> : <strong className="text-fg">in stock</strong>}.
          </p>
        ) : null}
        <GeneralError error={save.error} />
      </form>
    </Dialog>
  );
}
