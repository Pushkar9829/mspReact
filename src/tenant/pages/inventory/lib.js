import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { rowsOf } from "../../../shared/auth.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";

/** URL param prefixes, one per table on the page (the stock table owns the bare names). */
export const PREFIX = { stock: "", tx: "tx_", res: "rs_", wh: "wh_" };

/** Strict whole-number parse ("12", "-3"); anything else → NaN. Mirrors zod `.int()`. */
export function parseWhole(value) {
  const s = String(value ?? "").trim();
  return /^-?\d+$/.test(s) ? Number(s) : NaN;
}

export function fmtQty(n) {
  return Number.isFinite(Number(n)) ? Number(n).toLocaleString("en-IN") : "—";
}

export function signed(n) {
  const v = Number(n) || 0;
  return v > 0 ? `+${fmtQty(v)}` : v < 0 ? `−${fmtQty(Math.abs(v))}` : "0";
}

const ATTR_SKIP = new Set(["dimensions", "weight", "unit", "custom"]);

/** "10 kg · Red · Grade A" from variant.attributes (incl. custom attributes), de-duplicated. */
export function variantSummary(variant) {
  const attrs = variant?.attributes || {};
  const out = [];
  const push = (label, v) => {
    if (v == null || v === "" || typeof v === "object") return;
    const text = label === "grade" ? `Grade ${v}` : String(v);
    if (!out.includes(text)) out.push(text);
  };
  Object.entries(attrs).forEach(([k, v]) => !ATTR_SKIP.has(k) && push(k, v));
  const custom = attrs.custom;
  if (Array.isArray(custom)) custom.forEach((c) => c && push("custom", c.value != null ? `${c.key || c.name || ""}${c.key || c.name ? ": " : ""}${c.value}` : c));
  else if (custom && typeof custom === "object") Object.entries(custom).forEach(([k, v]) => push("custom", `${k}: ${v}`));
  if (!out.length && attrs.unit) out.push(String(attrs.unit));
  return out.join(" · ");
}

export function productOf(row) {
  return row?.variantId?.productId || null;
}

export function variantIdOf(row) {
  return row?.variantId?._id || row?.variantId || "";
}

export function warehouseIdOf(row) {
  return row?.warehouseId?._id || row?.warehouseId || "";
}

/** Warehouses (plain array). Disabled without warehouses.view; callers fall back to populated rows. */
export function useWarehouses() {
  const can = useCan();
  const allowed = can("warehouses.view");
  const q = useQuery({
    queryKey: keys.warehouses.list({}),
    queryFn: () => api.listWarehouses(),
    enabled: allowed,
    staleTime: 60_000,
  });
  const list = Array.isArray(q.data) ? q.data : rowsOf(q.data);
  const byId = Object.fromEntries(list.map((w) => [String(w._id), w]));
  return { ...q, allowed, list, byId };
}

export function warehouseLabel(w) {
  if (!w) return "—";
  return w.code ? `${w.name} (${w.code})` : w.name;
}

/** Fetch the current stock row for a variant in a warehouse (null when none exists yet → all zero). */
export async function fetchStockRow(variantId, warehouseId) {
  const res = await api.listInventory({ variantId, warehouseId, limit: 1 });
  return rowsOf(res)[0] || null;
}

export function useStockRow(variantId, warehouseId, enabled = true) {
  return useQuery({
    queryKey: keys.inventory.custom("row", String(variantId || ""), String(warehouseId || "")),
    queryFn: () => fetchStockRow(variantId, warehouseId),
    enabled: Boolean(enabled && variantId && warehouseId),
  });
}

/** Everything a stock mutation can affect. */
export const STOCK_KEYS = [keys.inventory.all, keys.reservations.all];

export const ADJUST_REASONS = [
  {
    value: "inward",
    label: "Stock received",
    description: "New units arrived (purchase, production). Adds to available stock.",
    sign: "positive",
    counter: "available",
  },
  {
    value: "return",
    label: "Customer return",
    description: "Sellable units came back from a buyer outside the order return flow. Adds to available.",
    sign: "positive",
    counter: "available",
  },
  {
    value: "damage",
    label: "Mark as damaged",
    description: "Moves units out of available into damaged. They can no longer be sold.",
    sign: "positive",
    counter: "damage",
  },
  {
    value: "adjustment",
    label: "Correction",
    description: "Count correction after a stock take. Use + to add or − to remove available units.",
    sign: "any",
    counter: "available",
  },
  {
    value: "incoming",
    label: "Incoming (expected)",
    description: "Units on order but not yet received. Changes the incoming count only, not sellable stock.",
    sign: "any",
    counter: "incoming",
  },
];

export const TX_REASON_LABELS = {
  inward: "Stock received",
  adjustment: "Adjustment",
  damage: "Marked damaged",
  return: "Customer return",
  incoming: "Incoming updated",
  transfer_in: "Transfer in",
  transfer_out: "Transfer out",
  reserve: "Reserved",
  release: "Released",
  commit: "Committed",
  consume: "Shipped",
  restore: "Restored",
  set: "Quantity set",
  archive: "Archived",
  reown: "Moved to order",
};

export const TX_REASON_TONES = {
  inward: "success",
  return: "success",
  transfer_in: "info",
  transfer_out: "info",
  damage: "danger",
  archive: "neutral",
  adjustment: "warning",
  set: "warning",
  incoming: "accent",
  reserve: "neutral",
  release: "neutral",
  commit: "neutral",
  consume: "neutral",
  restore: "neutral",
  reown: "neutral",
};

/**
 * Counter changes an adjust would make: [{ label, before, after }] plus an error message when
 * the backend would reject it (INSUFFICIENT_STOCK). `row` may be null (no stock row yet = zeros).
 */
export function adjustPreview(row, reason, qty) {
  const available = Number(row?.available) || 0;
  const incoming = Number(row?.incoming) || 0;
  const damaged = Number(row?.damaged) || 0;
  if (!Number.isInteger(qty) || qty === 0) return { lines: [], error: null };
  if (reason === "incoming") {
    const after = incoming + qty;
    return { lines: [{ label: "Incoming", before: incoming, after }], error: after < 0 ? `Incoming is only ${fmtQty(incoming)}.` : null };
  }
  if (reason === "damage") {
    const after = available - qty;
    return {
      lines: [
        { label: "Available", before: available, after },
        { label: "Damaged", before: damaged, after: damaged + qty },
      ],
      error: after < 0 ? `Only ${fmtQty(available)} available to mark as damaged.` : null,
    };
  }
  const after = available + qty;
  return { lines: [{ label: "Available", before: available, after }], error: after < 0 ? `Only ${fmtQty(available)} available.` : null };
}
