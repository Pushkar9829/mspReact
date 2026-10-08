/** localStorage / sessionStorage that never throws (private mode, blocked storage, SSR). */
function store(kind) {
  try {
    return typeof window === "undefined" ? null : window[kind];
  } catch {
    return null;
  }
}

export function readJson(key, fallback, kind = "localStorage") {
  try {
    const raw = store(kind)?.getItem(key);
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function writeJson(key, value, kind = "localStorage") {
  try {
    if (value === undefined || value === null) store(kind)?.removeItem(key);
    else store(kind)?.setItem(key, JSON.stringify(value));
  } catch {
    /* quota / private mode */
  }
}

export function removeKey(key, kind = "localStorage") {
  try {
    store(kind)?.removeItem(key);
  } catch {
    /* ignore */
  }
}

/** Storage keys used by the storefront (cleared on logout where noted). */
export const STORAGE = {
  /** Guest wishlist: [{ productId, variantId, slug, name, image, price, listPrice, packSize }]. Cleared on logout and after merge. */
  wish: "msr-wish",
  /** Legacy cart mirror (no longer written). Cleared on logout. */
  cart: "msr-cart",
  /** Guest cart identity sent as X-Guest-Key (owned by shared/api/client.js). Rotated on logout. */
  guest: "msr-guest",
  /** Delivery PIN code: { pincode, city?, state?, source: "manual" | "address" }. */
  pincode: "msr-pincode",
  /** Recent searches (lib/recentSearches.js). */
  recent: "msr-recent-searches",
  /** sessionStorage: checkout idempotency key per cart, `msr-idem:<cartId>`. */
  idem: (cartId) => `msr-idem:${cartId || "cart"}`,
  /** sessionStorage: "business prices applied" notice after login. */
  priceNotice: "msr-price-notice",
};
