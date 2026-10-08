/**
 * Storefront query keys. Everything that depends on who is looking (prices from buyer price lists,
 * cart, wishlist, coupons) carries the viewer: the user id, or "guest".
 *
 *   import { keys } from "../hooks/keys.js";
 *   keys.shop.search(params, viewer)   keys.shop.product(slug, viewer)   keys.shop.cart(viewer)
 *
 * `keys` is the shared key factory plus `keys.shop`, so one import covers both.
 */
import { keys as sharedKeys } from "../../shared/api/keys.js";

const S = "shop";

export const shopKeys = {
  all: [S],
  /** Product lists (search, tag rails, category listings). Invalidate on login/logout. */
  searches: () => [S, "search"],
  search: (params = {}, viewer = "guest") => [S, "search", viewer, params],
  suggest: (q, viewer = "guest") => [S, "suggest", viewer, q],
  product: (slug, viewer = "guest") => [S, "product", viewer, String(slug || "").toLowerCase()],
  reviews: (slug, page = 1) => [S, "reviews", String(slug || "").toLowerCase(), page],
  reviewEligibility: (slug, viewer) => [S, "review-eligibility", viewer, String(slug || "").toLowerCase()],
  serviceability: (scope, pincode) => [S, "serviceability", scope, pincode],
  categories: () => [S, "categories"],
  brands: () => [S, "brands"],
  settings: (tenantSlug = "") => [S, "settings", tenantSlug],
  store: (idOrSlug) => [S, "store", idOrSlug],
  cms: (slug, tenant = "") => [S, "cms", slug, tenant],
  searchHistory: (viewer = "guest") => [S, "search-history", viewer],
  cart: (viewer = "guest") => [S, "cart", viewer],
  cartCoupons: (viewer = "guest") => [S, "cart-coupons", viewer],
  wishlist: (viewer = "guest") => [S, "wishlist", viewer],
  addresses: (viewer) => [S, "addresses", viewer],
  ledger: (viewer) => [S, "ledger", viewer],
  preview: (viewer, addressId, partnerId, stamp) => [S, "preview", viewer, addressId || "", partnerId || "", stamp],
  paymentOptions: (viewer, addressId, stamp) => [S, "payment-options", viewer, addressId || "", stamp],
  orders: (viewer, query = {}) => [S, "orders", viewer, query],
  order: (id) => [S, "order", String(id)],
  notifications: (viewer) => [S, "notifications", viewer],
  notificationList: (viewer, query = {}) => [S, "notifications", viewer, "list", query],
  notificationUnread: (viewer) => [S, "notifications", viewer, "unread"],
  notificationPrefs: (viewer) => [S, "notifications", viewer, "preferences"],
};

export const keys = { ...sharedKeys, shop: shopKeys };
export default keys;
