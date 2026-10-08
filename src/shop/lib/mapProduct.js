/**
 * API product → storefront product.
 *
 * Identity: `id` and `slug` are the product's real public slug (URLs: /product/:slug). `sku` is kept
 * separately and never used as an identifier. No invented data: rating only when the server has
 * reviews (ratingCount > 0), stock only when the server sent availability (else `null` = unknown).
 *
 * Works with GET /products/search rows, GET /products/lookup responses, and the richer shapes the
 * backend is adding (seller, per-variant stock, slabs) without changes.
 */
import { discountPercent } from "./money.js";
import { packOfVariant, unitPrice } from "./units.js";
import { sortSlabs } from "./slabs.js";

const idOf = (v) => (v == null ? null : typeof v === "object" ? String(v._id || v.id || "") || null : String(v));
const num = (v) => (v === null || v === undefined || v === "" || !Number.isFinite(Number(v)) ? null : Number(v));

export function packOf(variant) {
  return String(variant?.attributes?.packSize || variant?.attributes?.size || variant?.pack || "").trim();
}

/** Seller from whatever the API sent: `seller`, populated `tenantId`, or `store`. */
export function mapSeller(doc) {
  const s = doc?.seller || doc?.store || (doc?.tenantId && typeof doc.tenantId === "object" ? doc.tenantId : null);
  if (s) {
    return {
      id: idOf(s),
      name: s.displayName || s.name || "",
      slug: s.slug || "",
      city: s.city || s.pickupCity || s.pickupAddress?.city || "",
      rating: num(s.rating ?? s.ratingAvg),
      ratingCount: Number(s.ratingCount) || 0,
      state: s.state || "",
      logo: s.logo || "",
      verified: Boolean(s.verified ?? s.gstVerified),
      gstin: s.gstin || "",
    };
  }
  const id = idOf(doc?.tenantId);
  return id ? { id, name: "", slug: "", city: "", rating: null, verified: false, gstin: "" } : null;
}

export function mapVariant(v, product = {}) {
  if (!v) return null;
  const attributes = v.attributes || {};
  const pack = packOf(v);
  const price = num(v.sellingPrice ?? v.price);
  const mrp = num(v.listPrice ?? v.mrp) ?? price;
  const parsed = packOfVariant(attributes);
  const stock = num(v.available ?? v.stock);
  const serverUnit = v.unitPricePerBaseUnit;
  return {
    id: idOf(v._id || v.id),
    sku: v.sku || "",
    pack,
    attributes,
    price,
    mrp,
    /** Catalog price before an offer, when the server reports it. */
    basePrice: num(v.catalogSellingPrice) ?? price,
    offer: v.offer || null,
    discountPct: num(v.discountPct) ?? discountPercent(mrp, price),
    /** { value, per, label: "₹180/kg" } — server `unitPricePerBaseUnit`, else derived from the pack text. */
    unitPrice: serverUnit?.label ? { value: serverUnit.amount, per: serverUnit.unit, label: serverUnit.label } : unitPrice(price, parsed),
    /** Charged slabs [{ minQty, maxQty, unitPrice, catalogUnitPrice, unitPricePerBaseUnit }]. */
    slabs: product.bulkEligible === false ? [] : sortSlabs(v.tierPrices),
    /** Server qty rules { min, step, max, bulkEligible, bulkFrom, bulk } (null on older APIs). */
    rules: v.rules || null,
    /** null = unknown. */
    stock,
    inStock: v.inStock != null ? Boolean(v.inStock) : stock == null ? null : stock > 0,
    /** "in_stock" | "low" | "out" | null */
    stockStatus: v.stockStatus || (v.outOfStock ? "out" : v.lowStock ? "low" : null),
  };
}

export function mapProduct(doc) {
  if (!doc) return null;
  const spec = doc.specifications && typeof doc.specifications === "object" && !Array.isArray(doc.specifications) ? doc.specifications : {};
  const wholesale = doc.wholesale || {};
  const bulkEligible = Boolean(wholesale.bulkEligible);
  const variants = (doc.variants || []).map((v) => mapVariant(v, { bulkEligible })).filter(Boolean);
  const defaultPack = spec.defaultPack || "";
  const defaultVariant = variants.find((v) => v.pack && v.pack === defaultPack) || variants[0] || null;
  const images = [...new Set((doc.images || []).filter(Boolean))];
  const tags = (doc.tags || []).map((t) => String(t).toLowerCase());
  const ratingCount = Number(doc.ratingCount) || 0;
  const ratingAvg = ratingCount > 0 ? Number(doc.ratingAvg) || 0 : null;
  const variantStocks = variants.map((v) => v.stock).filter((s) => s != null);
  const stock = num(doc.available) ?? (variantStocks.length ? variantStocks.reduce((a, b) => a + b, 0) : null);
  const inStock = doc.inStock != null ? Boolean(doc.inStock) : stock == null ? null : stock > 0;
  const brand = doc.brandId && typeof doc.brandId === "object" ? { id: idOf(doc.brandId), name: doc.brandId.name || "", slug: doc.brandId.slug || "" } : doc.brand && typeof doc.brand === "object" ? { id: idOf(doc.brand), name: doc.brand.name, slug: doc.brand.slug } : null;
  const category =
    doc.categoryId && typeof doc.categoryId === "object"
      ? { id: idOf(doc.categoryId), name: doc.categoryId.name || "", slug: doc.categoryId.slug || "", parentId: idOf(doc.categoryId.parentId) }
      : null;
  const deliveryModes = Array.isArray(doc.deliveryModes) && doc.deliveryModes.length ? doc.deliveryModes : ["delivery_partner"];
  const slug = String(doc.slug || "").toLowerCase();
  const price = defaultVariant?.price ?? null;
  const mrp = defaultVariant?.mrp ?? price;
  const deal = tags.includes("deal") || (doc.offers || []).length > 0;
  const newLaunch = tags.includes("new");
  const bestseller = tags.includes("bestseller");

  return {
    id: slug,
    slug,
    sku: doc.sku || "",
    productId: idOf(doc._id || doc.id),
    tenantId: idOf(doc.tenantId),
    name: doc.name || "",
    description: doc.description || "",
    /** Brand name (string). Full ref: brandRef { id, name, slug }. */
    brand: brand?.name || "",
    brandRef: brand,
    /** Category slug (string). Full ref: categoryRef { id, name, slug, parentId }. */
    category: category?.slug || "",
    categoryRef: category,
    images,
    image: images[0] || "",
    variants,
    defaultVariant,
    price,
    mrp,
    discountPct: num(doc.discountPct) ?? discountPercent(mrp, price),
    unitPrice: defaultVariant?.unitPrice || (doc.unitPricePerBaseUnit?.label ? { value: doc.unitPricePerBaseUnit.amount, per: doc.unitPricePerBaseUnit.unit, label: doc.unitPricePerBaseUnit.label } : null),
    /** Lowest / highest effective price across variants (server `price: { min, max }`). */
    priceRange: doc.price && typeof doc.price === "object" ? doc.price : null,
    /** Product-level qty rules { bulkEligible, moq, packMultiple, maxQty, bulkFrom, caseQty, leadTimeDays, min, step, max, bulk }. */
    rules: doc.rules || null,
    stockStatus: doc.stockStatus || null,
    /** Lookup only: { enabled, easyReturn, returnable, returnWindowDays }. */
    returns: doc.returns || null,
    /** Lookup only: { freeDeliveryAbove, etaDaysMin, etaDaysMax, zones, codEnabled, pickupAvailable, leadTimeDays, … }. */
    delivery: doc.delivery || null,
    ratingAvg,
    ratingCount,
    stock,
    inStock,
    seller: mapSeller(doc),
    taxRate: num(doc.taxClass?.rate) ?? 0,
    hsn: doc.hsn || "",
    wholesale: {
      bulkEligible,
      moq: Math.max(1, Number(wholesale.moq) || 1),
      maxQty: num(wholesale.maxQty),
      packMultiple: Math.max(1, Number(wholesale.packMultiple) || 1),
      caseQty: Math.max(1, Number(wholesale.caseQty) || 1),
      leadTimeDays: Number(wholesale.leadTimeDays) || 0,
    },
    deliveryModes,
    easyReturn: Boolean(doc.easyReturn ?? spec.easyReturn),
    tags,
    flags: { deal, newLaunch, bestseller },
    offers: doc.offers || [],
    specifications: spec,
    pickupAddress: doc.pickupAddress || null,

    /* ---- legacy fields read by pages that have not been rebuilt yet (do not use in new code) ---- */
    categoryName: category?.name || "",
    weight: defaultVariant?.pack || "",
    packs: variants.map((v) => v.pack).filter(Boolean),
    packPrices: variants.filter((v) => v.pack).map((v) => ({ pack: v.pack, price: v.price, mrp: v.mrp, variantId: v.id, stock: v.stock, tierPrices: v.slabs })),
    rating: ratingAvg || 0,
    reviews: ratingCount,
    gallery: images,
    orderLimit: num(wholesale.maxQty),
    moq: Math.max(1, Number(wholesale.moq) || 1),
    packMultiple: Math.max(1, Number(wholesale.packMultiple) || 1),
    bulkEligible,
    slabs: bulkEligible ? defaultVariant?.slabs || [] : [],
    features: Array.isArray(spec.features) ? spec.features : [],
    ingredients: spec.ingredients || "",
    nutrition: spec.nutrition || "",
    manufacturer: spec.manufacturer || "",
    deal,
    newLaunch,
    bestseller,
    badge: bestseller ? "Best seller" : "",
  };
}

/** GET /products/lookup → product (with every variant, stock and seller pickup address). */
export function mapLookup(res) {
  if (!res?.product) return null;
  const raw = typeof res.product.toObject === "function" ? res.product.toObject() : res.product;
  return mapProduct({
    ...raw,
    seller: res.store || res.seller || raw.store || raw.seller,
    returns: res.returns || raw.returns,
    delivery: res.delivery || raw.delivery,
    rules: res.rules || raw.rules,
    variants: res.variants || (res.variant ? [res.variant] : raw.variants || []),
    available: res.available ?? raw.available,
    pickupAddress: res.pickupAddress || null,
  });
}

/** Category row → { id, slug, name, icon, image, parentId, sortOrder }. */
export function mapCategory(doc) {
  if (!doc) return null;
  return {
    id: idOf(doc._id || doc.id),
    slug: doc.slug,
    name: doc.name,
    icon: doc.icon || "",
    emoji: doc.icon || "",
    image: doc.image || "",
    parentId: idOf(doc.parentId),
    sortOrder: Number(doc.sortOrder) || 0,
    description: doc.seo?.description || "",
  };
}

/* ---- legacy helpers kept for older pages ---- */
export const mapApiProduct = mapProduct;

export function discount(product) {
  return discountPercent(product?.mrp, product?.price);
}

export function priceForPack(product, pack) {
  const v = product?.variants?.find((row) => row.pack === pack);
  return { price: v?.price ?? product?.price ?? 0, mrp: v?.mrp ?? product?.mrp ?? 0 };
}
