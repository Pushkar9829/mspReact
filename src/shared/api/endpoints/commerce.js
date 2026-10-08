import { request, enc, qs, guestKey } from "../client.js";

const V = "/api/v1";

/** Storefront: cart, checkout, addresses, wishlist, location. */
export const commerceApi = {
  geocode: (body) => request(`${V}/location/geocode`, { method: "POST", body }),
  getCart: () => request(`${V}/cart`),
  addCartItem: (body) => request(`${V}/cart/items`, { method: "POST", body }),
  updateCartItem: (id, qty) => request(`${V}/cart/items/${id}`, { method: "PATCH", body: { qty } }),
  setCartItemMode: (id, fulfillmentMode) => request(`${V}/cart/items/${id}`, { method: "PATCH", body: { fulfillmentMode } }),
  removeCartItem: (id) => request(`${V}/cart/items/${id}`, { method: "DELETE" }),
  applyCoupon: (code) => request(`${V}/cart/coupon`, { method: "POST", body: { code: code || "" } }),
  /** query: { tenantId? } (store being browsed). Works with an empty cart and for guests. */
  listCartCoupons: (query = {}) => request(`${V}/cart/coupons${qs(query)}`),
  mergeCart: () => request(`${V}/cart/merge`, { method: "POST", headers: { "X-Guest-Key": guestKey() } }),
  listAddresses: () => request(`${V}/addresses`),
  createAddress: (body) => request(`${V}/addresses`, { method: "POST", body }),
  updateAddress: (id, body) => request(`${V}/addresses/${id}`, { method: "PATCH", body }),
  deleteAddress: (id) => request(`${V}/addresses/${id}`, { method: "DELETE" }),
  previewCheckout: (addressId, deliveryPartnerId) =>
    request(`${V}/checkout/preview`, { method: "POST", body: { addressId, ...(deliveryPartnerId ? { deliveryPartnerId } : {}) } }),
  checkout: (body, idempotencyKey) => request(`${V}/checkout`, { method: "POST", headers: { "Idempotency-Key": idempotencyKey }, body }),
  verifyRazorpayPayment: (body) => request(`${V}/checkout/verify`, { method: "POST", body }),
  resumePayment: (orderId) => request(`${V}/checkout/pay`, { method: "POST", body: { orderId } }),
  listWishlist: () => request(`${V}/wishlist`),
  /** body: { productId, variantId? } (strict: nothing else). */
  saveWish: (body) => request(`${V}/wishlist`, { method: "PUT", body }),
  /** key: productId (preferred) or slug. */
  removeWish: (key) => request(`${V}/wishlist/${enc(key)}`, { method: "DELETE" }),

  // Storefront additions (additive; older callers unaffected)
  /**
   * Payment methods per store group for the buyer's cart. → { addressId, grandTotal, hasIssues,
   * groups: [{ tenantId, store { id, name, slug }, total, credit { creditEnabled, purchaseOrderEnabled, paymentDays,
   * spendable, available, advance, outstanding, creditLimit } | null, methods }], methods: [{ method, label, enabled, reason,
   * code, requiresPoNumber }], defaultMethod }.
   */
  getPaymentOptions: (addressId) => request(`${V}/checkout/payment-options${qs({ addressId })}`),
  /** Delivery check for one store: → { serviceable, zone { name, etaDaysMin, etaDaysMax, deliveryFee } | null }. */
  checkStoreServiceability: ({ tenantId, postalCode }) => request(`${V}/location/serviceability${qs({ tenantId, postalCode })}`),
  /** PIN / city lookup (public). → { query, suggestions: [{ latitude, longitude, provider, approximate, formatted, city?, state? }] } */
  suggestLocation: (query = {}) => request(`${V}/location/suggest${qs(query)}`),
  /** Save the buyer's delivery location on their profile. body: { city?, state?, postalCode?, country? } */
  setMyLocation: (body) => request(`${V}/location/me`, { method: "PUT", body }),
  /** PIN → { pincode, city, district, state, stateCode, approximate, found, source } (public; approximate = a guess, let users edit). */
  lookupPincode: (pin) => request(`${V}/location/pincode/${enc(pin)}`),
  /** Buyer restock alerts. query: { page, limit, status: active|pending_confirmation|notified } → { data, meta }. */
  listMyRestockAlerts: (query = {}) => request(`${V}/products/restock-alerts/mine${qs({ limit: 20, ...query })}`),
  deleteRestockAlert: (id) => request(`${V}/products/restock-alerts/${enc(id)}`, { method: "DELETE" }),
};
