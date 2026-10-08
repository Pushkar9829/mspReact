import { useMemo, useState } from "react";
import { useQueries, useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { useUnsavedChangesGuard } from "../../../shared/hooks/useUnsavedChangesGuard.js";
import { rowsOf } from "../../../shared/auth.js";
import { fromIstInputValue, toIstInputValue } from "../../../shared/lib/format.js";
import { Badge, Combobox, ConfirmDialog, DateTime, Input, MenuItem, Sheet, UnsavedChangesDialog } from "../../../shared/ui/index.js";

/* ------------------------------------------------------------------ constants */

export const APPLIES_TO_OPTIONS = [
  { value: "all", label: "All purchases", description: "Single and bulk purchases" },
  { value: "regular", label: "Single purchases only", description: "Not applied to bulk purchases" },
  { value: "bulk", label: "Bulk purchases only", description: "Only bulk purchases" },
];

export function appliesToLabel(value) {
  if (value === "regular") return "Single only";
  if (value === "bulk") return "Bulk only";
  return "All purchases";
}

export const MONEY_MAX = 1e9;
export const shortId = (id) => (id ? `…${String(id).slice(-6)}` : "");

/* ------------------------------------------------------------------ number / date helpers */

/** "" → null, otherwise Number (NaN when not numeric). */
export function toNumber(value) {
  if (value === "" || value == null) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : Number.NaN;
}

export function numStr(value) {
  return value == null ? "" : String(value);
}

export const toLocal = (iso) => (iso ? toIstInputValue(iso) : "");
export const fromLocal = (local) => (local ? fromIstInputValue(local) : "");

/** IST "YYYY-MM-DDTHH:mm" n days from now (rounded to the minute). */
export function localFromNow(days = 0) {
  return toIstInputValue(new Date(Date.now() + days * 86_400_000));
}

/** Validity phase from optional start/end (dates only, no money). */
export function validityPhase(startsAt, endsAt, now = Date.now()) {
  const s = startsAt ? new Date(startsAt).getTime() : null;
  const e = endsAt ? new Date(endsAt).getTime() : null;
  if (e != null && e <= now) return "expired";
  if (s != null && s > now) return "upcoming";
  return "live";
}

const PHASE = {
  live: { tone: "success", label: "Live window" },
  upcoming: { tone: "info", label: "Upcoming" },
  expired: { tone: "neutral", label: "Expired" },
};

export function ValidityCell({ startsAt, endsAt }) {
  const phase = validityPhase(startsAt, endsAt);
  const p = PHASE[phase];
  return (
    <div className="grid gap-0.5">
      <span>
        <Badge tone={p.tone}>{!startsAt && !endsAt ? "No time limit" : p.label}</Badge>
      </span>
      {startsAt || endsAt ? (
        <span className="text-ui-xs text-fg-subtle">
          {startsAt ? <DateTime value={startsAt} /> : "Any time"} → {endsAt ? <DateTime value={endsAt} /> : "no end"}
        </span>
      ) : null}
    </div>
  );
}

export function validityCsv(row) {
  return `${row.startsAt || ""} → ${row.endsAt || ""}`;
}

/** Shallow diff of two payloads (arrays/objects compared by JSON). Returns only changed keys of `next`. */
export function changedFields(initial, next) {
  const out = {};
  Object.keys(next).forEach((key) => {
    if (JSON.stringify(initial[key] ?? null) !== JSON.stringify(next[key] ?? null)) out[key] = next[key];
  });
  return out;
}

/** Message of an ApiError that has no inline field to show it on. */
export function generalError(error, fieldNames) {
  if (!error) return "";
  const fields = Object.keys(error.fields || {});
  const shown = fields.some((f) => fieldNames.some((n) => f === n || f.startsWith(`${n}.`)));
  return shown ? "" : error.message;
}

/* ------------------------------------------------------------------ menu helper */

/** Row-menu item: disabled with a "Requires …" hint when the permission is missing. */
export function GatedMenuItem({ allowed, perm, children, ...props }) {
  return (
    <MenuItem {...props} disabled={!allowed || props.disabled} title={!allowed ? `Requires ${perm}` : undefined}>
      {children}
      {!allowed ? <span className="ml-2 text-ui-2xs text-fg-subtle">Requires {perm}</span> : null}
    </MenuItem>
  );
}

/* ------------------------------------------------------------------ form sheet with discard guard */

/**
 * Sheet for a controlled create/edit form. When the form is dirty, closing (Escape, ×, Cancel)
 * asks to discard; navigating away is blocked by useUnsavedChangesGuard.
 * `footer` may be a function receiving `requestClose` (for a Cancel button that uses the same guard).
 */
export function FormSheet({ open, onClose, title, description, dirty, busy, footer, children, size = "lg" }) {
  const [confirming, setConfirming] = useState(false);
  const blocker = useUnsavedChangesGuard(open && dirty && !busy);
  function request(next) {
    if (next) return;
    if (dirty) setConfirming(true);
    else onClose();
  }
  return (
    <>
      <Sheet
        open={open}
        onOpenChange={request}
        title={title}
        description={description}
        dirty={dirty}
        busy={busy}
        size={size}
        footer={typeof footer === "function" ? footer(() => request(false)) : footer}
      >
        {children}
      </Sheet>
      <ConfirmDialog
        open={confirming}
        onOpenChange={setConfirming}
        title="Discard unsaved changes?"
        description="Your changes to this form haven’t been saved. If you close it now they will be lost."
        confirmLabel="Discard changes"
        cancelLabel="Keep editing"
        tone="danger"
        onConfirm={() => onClose()}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}

/* ------------------------------------------------------------------ datetime field */

export function DateTimeInput({ value, onChange, ...props }) {
  return <Input type="datetime-local" value={value} onChange={(e) => onChange(e.target.value)} suffix={<span className="text-ui-2xs">IST</span>} {...props} />;
}

/* ------------------------------------------------------------------ lookups (id → label) */

/**
 * Small id → name maps used for chips and table labels. Each is a single capped request,
 * only enabled where needed. Customers come from /reports/customers (buyers of this store),
 * which needs `reports.view`, `orders.view` or `ledger.view` (same as the backend route).
 */
export function useLookups({ products = false, categories = false, customers = false, variants = false } = {}) {
  const can = useCan();
  const canCustomers = can(["reports.view", "orders.view", "ledger.view"]);
  const productsQ = useQuery({
    queryKey: keys.products.custom("lookup", 100),
    queryFn: () => api.listStaffProducts({ limit: 100 }),
    enabled: products,
    staleTime: 5 * 60_000,
  });
  const categoriesQ = useQuery({
    queryKey: keys.categories.custom("lookup"),
    queryFn: () => api.listCategories(),
    enabled: categories,
    staleTime: 5 * 60_000,
  });
  const customersQ = useQuery({
    queryKey: ["reports", "customers", "lookup", 100],
    queryFn: () => api.reportsCustomers({ limit: 100 }),
    enabled: customers && canCustomers,
    staleTime: 5 * 60_000,
  });
  const variantsQ = useQuery({
    queryKey: keys.variants.custom("lookup"),
    queryFn: () => api.listVariants(),
    enabled: variants,
    staleTime: 60_000,
  });

  return useMemo(() => {
    const productMap = new Map(rowsOf(productsQ.data).map((p) => [String(p._id), p]));
    const categoryMap = new Map(rowsOf(categoriesQ.data).map((c) => [String(c._id), c]));
    const customerMap = new Map(rowsOf(customersQ.data).map((c) => [String(c.id), c]));
    const variantMap = new Map(rowsOf(variantsQ.data).map((v) => [String(v._id), v]));
    return {
      productMap,
      categoryMap,
      customerMap,
      variantMap,
      canCustomers,
      // Once the capped list has loaded, chips for products outside it are fetched one by one.
      resolveProduct: productsQ.isFetched ? productResolver : undefined,
      productName: (id) => productMap.get(String(id))?.name,
      categoryName: (id) => categoryMap.get(String(id))?.name,
      customerName: (id) => {
        const c = customerMap.get(String(id));
        return c ? c.name + (c.company ? ` (${c.company})` : "") : undefined;
      },
    };
  }, [productsQ.data, productsQ.isFetched, categoriesQ.data, customersQ.data, variantsQ.data, canCustomers]);
}

/** Label resolver for one product id (used by MultiPicker for ids outside the lookup list). */
export const productResolver = (id) => ({
  queryKey: keys.products.detail(id),
  queryFn: () => api.getStaffProduct(id),
  select: (p) => p?.name,
});

/* ------------------------------------------------------------------ pickers */

export const productSearch = (q) => api.listStaffProducts({ q: q || undefined, limit: 20 });
export const mapProduct = (p) => ({ value: String(p._id), label: p.name, description: p.primarySku || p.sku });
export const customerSearch = (q) => api.reportsCustomers({ q: q || undefined, limit: 20 });
export const mapCustomer = (c) => ({ value: String(c.id), label: c.name, description: [c.company, c.email].filter(Boolean).join(" · ") });

/**
 * Multi-select built on the async Combobox: picked ids render as removable chips.
 * `nameOf(id)` resolves labels for ids that were not picked in this session (e.g. existing data);
 * `resolve(id)` (optional) returns query options whose `select` yields the label for ids neither
 * source knows; unknown ids show a short id.
 */
export function MultiPicker({ value = [], onChange, search, options, queryKey, mapOption, nameOf, resolve, placeholder = "Add…", searchPlaceholder, emptyText, disabled, "aria-label": ariaLabel }) {
  const [known, setKnown] = useState({});
  const selectedKey = value.map(String).join(",");
  const selected = new Set(value.map(String));
  const map = useMemo(() => {
    const fn = mapOption || ((o) => o);
    const taken = new Set(selectedKey.split(",").filter(Boolean));
    return (row) => {
      const o = fn(row);
      return { ...o, disabled: o.disabled || taken.has(String(o.value)) };
    };
  }, [mapOption, selectedKey]);
  const staticOptions = useMemo(() => (options ? options.map(map) : undefined), [options, map]);
  const unresolved = resolve ? value.map(String).filter((id) => !known[id] && !nameOf?.(id)) : [];
  const resolved = useQueries({
    queries: unresolved.map((id) => ({ ...resolve(id), staleTime: 5 * 60_000, retry: false })),
  });
  const fetchedName = Object.fromEntries(unresolved.map((id, i) => [id, resolved[i]?.data]));
  return (
    <div className="grid gap-2">
      <Combobox
        value=""
        aria-label={ariaLabel}
        onChange={(id, option) => {
          if (!id || selected.has(String(id))) return;
          if (option?.label) setKnown((k) => ({ ...k, [id]: option.label }));
          onChange([...value, String(id)]);
        }}
        search={search}
        options={staticOptions}
        queryKey={queryKey}
        mapOption={search ? map : undefined}
        placeholder={placeholder}
        searchPlaceholder={searchPlaceholder}
        emptyText={emptyText}
        disabled={disabled}
      />
      {value.length ? (
        <ul className="flex flex-wrap gap-1.5" aria-label="Selected">
          {value.map((id) => {
            const label = known[id] || nameOf?.(id) || fetchedName[String(id)];
            return (
              <li key={id} className="inline-flex max-w-full items-center gap-1 rounded-full border border-border bg-surface-2 py-0.5 pl-2.5 pr-1 text-ui-xs text-fg">
                <span className={label ? "truncate" : "truncate font-mono text-fg-muted"} title={String(id)}>
                  {label || shortId(id)}
                </span>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => onChange(value.filter((v) => String(v) !== String(id)))}
                  aria-label={`Remove ${label || id}`}
                  className="grid size-5 place-items-center rounded-full text-fg-subtle hover:bg-surface-hover hover:text-fg disabled:opacity-50"
                >
                  <X aria-hidden className="size-3" />
                </button>
              </li>
            );
          })}
        </ul>
      ) : null}
    </div>
  );
}
