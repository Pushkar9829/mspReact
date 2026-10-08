/**
 * Server cart quote → view model. No money is computed here: every amount is a server field. The
 * only derived values are display hints (active/next slab when the server has not sent them yet).
 *
 * Quote shape: one line per variant (bulk derived from qty) with real slug, rules, tierPrices,
 * appliedSlab / nextSlab, unitPricePerBaseUnit and hold; groups carry fees/productTax/feeTax/grandTotal.
 */
import { activeSlab, nextSlab, sortSlabs } from "./slabs.js";

const idOf = (v) => (v == null ? null : typeof v === "object" ? String(v._id || v.id || "") || null : String(v));

export const EMPTY_QUOTE = Object.freeze({
  cartId: null,
  groups: [],
  unavailable: [],
  itemCount: 0,
  subtotal: 0,
  tax: 0,
  productTax: 0,
  feeTax: 0,
  deliveryFee: 0,
  platformFee: 0,
  partnerFee: 0,
  couponDiscount: 0,
  grandTotal: 0,
  couponCode: "",
  couponNote: "",
  hasBulk: false,
  codEnabled: false,
});

export function mapLine(i, group = null) {
  const wholesale = i.wholesale || {};
  const slabs = sortSlabs(i.tierPrices || i.slabs);
  const qty = Number(i.qty) || 0;
  return {
    key: idOf(i.cartItemId) || idOf(i.variantId),
    cartItemId: idOf(i.cartItemId),
    tenantId: idOf(i.tenantId) || group?.tenantId || null,
    productId: idOf(i.productId),
    variantId: idOf(i.variantId),
    slug: String(i.slug || "").toLowerCase(),
    sku: i.sku || "",
    name: i.name || "",
    brand: i.brand || "",
    image: i.image || "",
    pack: i.pack || i.attributes?.packSize || i.attributes?.size || "",
    attributes: i.attributes || {},
    qty,
    /** Derived by the server: bulk-eligible product AND qty >= rules.bulkFrom. Display only. */
    bulk: Boolean(i.bulk),
    unitPrice: i.unitPrice ?? null,
    baseUnitPrice: i.baseUnitPrice ?? i.unitPrice ?? null,
    listPrice: i.listPrice ?? null,
    lineSubtotal: i.lineSubtotal ?? null,
    lineTotal: i.lineTotal ?? null,
    couponShare: i.couponShare || 0,
    taxRate: Number(i.taxRate) || 0,
    taxableValue: i.taxableValue ?? null,
    tax: i.tax ?? null,
    slabs,
    /** Server slab progress: appliedSlab { minQty, maxQty, unitPrice }, nextSlab { minQty, unitPrice, saveEach, addQty }. */
    appliedSlab: i.appliedSlab !== undefined ? i.appliedSlab : activeSlab(slabs, qty),
    nextSlab: i.nextSlab !== undefined ? i.nextSlab : nextSlab(slabs, qty),
    wholesale,
    /**
     * Server qty rules for the range the qty is in: { min, step, max, bulkEligible, bulkFrom, bulk: { min, step, max } | null }.
     * Feed min/step/max straight into <QtyStepper>.
     */
    rules: i.rules || null,
    moq: Math.max(1, Number(i.rules?.min ?? wholesale.moq) || 1),
    maxQty: i.rules?.max ?? wholesale.maxQty ?? null,
    packMultiple: Math.max(1, Number(i.rules?.step ?? wholesale.packMultiple) || 1),
    bulkFrom: i.rules?.bulkFrom ?? null,
    bulkEligible: Boolean(i.rules?.bulkEligible ?? wholesale.bulkEligible),
    /** { amount, unit, label: "₹180/kg" } from the server. */
    unitPricePerBaseUnit: i.unitPricePerBaseUnit || null,
    /** Stock hold { expiresAt, reservedQty } | null. */
    hold: i.hold || null,
    fulfillmentMode: i.fulfillmentMode || "delivery_partner",
    deliveryModes: i.deliveryModes?.length ? i.deliveryModes : ["delivery_partner"],
    easyReturn: Boolean(i.easyReturn),
    issue: i.issue || "",
    issueCode: i.issueCode || i.code || "",
    available: i.available ?? null,
    /** Optimistic qty change in flight: money on this line is stale until the server answers. */
    pending: Boolean(i.__pending),
  };
}

export function mapGroup(g) {
  const tenantId = idOf(g.tenantId);
  const seller = g.seller || g.store || null;
  const group = {
    tenantId,
    seller: seller ? { id: idOf(seller) || tenantId, name: seller.displayName || seller.name || "", slug: seller.slug || "" } : { id: tenantId, name: "", slug: "" },
    subtotal: g.subtotal ?? null,
    couponCode: g.couponCode || "",
    couponDiscount: g.couponDiscount || 0,
    taxableValue: g.taxableValue ?? null,
    tax: g.tax ?? null,
    productTax: g.productTax ?? null,
    feeTax: g.feeTax ?? null,
    /** { delivery, platform, partner, total, taxableValue, tax, parts: [{ key, gross, taxableValue, tax }] } */
    fees: g.fees || null,
    grandTotal: g.grandTotal ?? g.total ?? null,
    hasDelivery: Boolean(g.hasDelivery),
    deliveryFee: g.deliveryFee ?? 0,
    platformFee: g.platformFee ?? 0,
    partnerFee: g.partnerFee ?? 0,
    deliveryPartner: g.deliveryPartner || null,
    freeDeliveryAbove: Number(g.freeDeliveryAbove) || 0,
    freeDelivery: Boolean(g.freeDelivery),
    freeDeliveryRemaining: Number(g.freeDeliveryRemaining) || 0,
    codEnabled: Boolean(g.codEnabled),
    total: g.total ?? null,
    eta: g.eta || null,
    serviceability: g.serviceability || null,
  };
  group.items = (g.items || []).map((i) => mapLine(i, group));
  return group;
}

/** Quote (raw server object, possibly with optimistic __pending flags) → view model. */
export function viewCart(raw) {
  const quote = raw || EMPTY_QUOTE;
  const groups = (quote.groups || []).map(mapGroup);
  const unavailable = (quote.unavailable || []).map((i) => mapLine(i));
  const lines = [...groups.flatMap((g) => g.items), ...unavailable];
  return {
    raw: quote,
    cartId: idOf(quote.cartId),
    groups,
    unavailable,
    lines,
    /** Distinct lines (badge count). */
    count: lines.length,
    /** Units across buyable lines (server `itemCount`). */
    units: quote.itemCount ?? 0,
    pending: Boolean(quote.__pending) || lines.some((l) => l.pending),
    /** Earliest live stock hold on a line (ISO) or null. */
    holdExpiresAt: quote.holdExpiresAt || null,
    hasIssues: unavailable.length > 0,
    couponCode: quote.couponCode || "",
    couponNote: quote.couponNote || "",
    codEnabled: Boolean(quote.codEnabled),
    hasBulk: Boolean(quote.hasBulk),
    deliveryPartner: quote.deliveryPartner || null,
    deliveryPartners: quote.deliveryPartners || [],
    deliveryPartnerChoiceEnabled: Boolean(quote.deliveryPartnerChoiceEnabled),
    totals: {
      subtotal: quote.subtotal ?? null,
      couponDiscount: quote.couponDiscount ?? 0,
      deliveryFee: quote.deliveryFee ?? 0,
      platformFee: quote.platformFee ?? 0,
      partnerFee: quote.partnerFee ?? 0,
      tax: quote.tax ?? null,
      productTax: quote.productTax ?? null,
      feeTax: quote.feeTax ?? null,
      taxableValue: quote.taxableValue ?? null,
      /** { delivery, platform, partner, total, tax } */
      fees: quote.fees || null,
      grandTotal: quote.grandTotal ?? null,
    },
    /** The line for a variant (the cart has one line per variant; bulk is derived from qty). */
    findLine(variantId) {
      const id = String(variantId || "");
      return lines.find((l) => l.variantId === id) || null;
    },
  };
}

/** Stable fingerprint of what is in the cart (for preview query keys). */
export function cartStamp(raw) {
  if (!raw) return "empty";
  const parts = [];
  for (const g of raw.groups || []) for (const i of g.items || []) parts.push(`${idOf(i.variantId)}:${i.qty}:${i.fulfillmentMode || ""}`);
  parts.sort();
  return `${parts.join("|")}#${raw.couponCode || ""}`;
}

/** Optimistically set a line's qty (qty 0 removes it). Marks the quote pending. */
export function withLineQty(raw, cartItemId, qty) {
  if (!raw) return raw;
  const id = String(cartItemId);
  const touch = (items) =>
    (items || [])
      .map((i) => (idOf(i.cartItemId) === id ? (qty > 0 ? { ...i, qty, __pending: true } : null) : i))
      .filter(Boolean);
  return {
    ...raw,
    __pending: true,
    groups: (raw.groups || []).map((g) => ({ ...g, items: touch(g.items) })).filter((g) => g.items.length),
    unavailable: touch(raw.unavailable),
  };
}

/** Optimistically add a line (shown with pending money until the server quote arrives). */
export function withAddedLine(raw, { variantId, qty, product }) {
  const existing = (raw?.groups || []).flatMap((g) => g.items || []).find((i) => idOf(i.variantId) === String(variantId));
  if (existing) return withLineQty(raw, idOf(existing.cartItemId), (Number(existing.qty) || 0) + qty);
  const base = raw || { ...EMPTY_QUOTE, groups: [] };
  const tenantId = product?.tenantId || "pending";
  const line = {
    cartItemId: `pending-${variantId}`,
    tenantId,
    productId: product?.productId,
    variantId,
    slug: product?.slug || "",
    name: product?.name || "",
    brand: product?.brand || "",
    image: product?.image || "",
    pack: product?.pack || "",
    qty,
    unitPrice: product?.price ?? null,
    listPrice: product?.mrp ?? null,
    wholesale: product?.wholesale || {},
    __pending: true,
  };
  const groups = [...(base.groups || [])];
  const index = groups.findIndex((g) => String(idOf(g.tenantId)) === String(tenantId));
  if (index >= 0) groups[index] = { ...groups[index], items: [...(groups[index].items || []), line] };
  else groups.push({ tenantId, items: [line] });
  return { ...base, __pending: true, groups };
}
