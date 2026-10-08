import { request, qs, enc } from "../client.js";

const V = "/api/v1";

/** All inventory/warehouse/pricing routes require a tenant context (platform admin: X-Tenant-Id). */
export const inventoryApi = {
  listInventory: (query = {}) => request(`${V}/inventory${qs({ limit: 20, ...query })}`),
  /**
   * query: { orderId, variantId, warehouseId, reason (comma list), from, to, page, limit }.
   * Rows are populated: variant { _id, sku, attributes }, product { _id, name }, productName,
   * warehouse { _id, name, code }, order { _id, orderNumber, status } | null, orderNumber.
   */
  listInventoryTransactions: (query = {}) => request(`${V}/inventory/transactions${qs({ limit: 20, ...query })}`),
  /**
   * query: { orderId, variantId, warehouseId, status (comma list: held|committed|released|consumed|restored),
   * ownerType (cart|order), from, to, page, limit }. Rows populated like transactions.
   */
  listReservations: (query = {}) => request(`${V}/inventory/reservations${qs({ limit: 20, ...query })}`),
  /**
   * Set the absolute sellable qty (compare-and-set; reserved/committed untouched). inventory.adjust.
   * body: { variantId, warehouseId, qty (int >= 0), reason?: set|adjustment|inward|return (default set), note? }.
   * -> the Inventory row. 409 VARIANT_DELETED when qty > 0 and the variant is deleted.
   */
  setInventoryQuantity: (body) => request(`${V}/inventory/set-quantity`, { method: "POST", body }),
  /** body: { warehouseId, variantId, reason: inward|adjustment|damage|return|incoming, qty (signed int), note? } */
  adjustInventory: (body) => request(`${V}/inventory/adjust`, { method: "POST", body }),
  /** body: { fromWarehouseId, toWarehouseId, variantId, qty (>0), note? } */
  transferInventory: (body) => request(`${V}/inventory/transfer`, { method: "POST", body }),
  /** body: { lowStockThreshold?, incoming? } (inventory.publish) */
  updateInventoryThresholds: (id, body) => request(`${V}/inventory/${enc(id)}`, { method: "PATCH", body }),
  listWarehouses: (query = {}) => request(`${V}/warehouses${qs(query)}`),
  createWarehouse: (body) => request(`${V}/warehouses`, { method: "POST", body }),
  updateWarehouse: (id, body) => request(`${V}/warehouses/${enc(id)}`, { method: "PATCH", body }),

  // Pricing
  /** query: { q (name), status (comma list: draft|active|inactive|pending_approval), page, limit }. Array without page/limit. */
  listPriceLists: (query = {}) => request(`${V}/pricing${qs(query)}`),
  createPriceList: (body) => request(`${V}/pricing`, { method: "POST", body }),
  updatePriceList: (id, body) => request(`${V}/pricing/${enc(id)}`, { method: "PATCH", body }),
  approvePriceList: (id) => request(`${V}/pricing/${enc(id)}/approve`, { method: "POST" }),
  listOffers: (query = {}) => request(`${V}/offers${qs({ limit: 20, ...query })}`),
  createOffer: (body) => request(`${V}/offers`, { method: "POST", body }),
  updateOffer: (id, body) => request(`${V}/offers/${enc(id)}`, { method: "PATCH", body }),
  approveOffer: (id) => request(`${V}/offers/${enc(id)}/approve`, { method: "POST" }),
  /** query: { q, status (active|disabled, comma list), page, limit } */
  listCoupons: (query = {}) => request(`${V}/coupons${qs({ limit: 20, ...query })}`),
  createCoupon: (body) => request(`${V}/coupons`, { method: "POST", body }),
  /** coupons.edit or coupons.create. 409 DUPLICATE_COUPON_CODE. */
  updateCoupon: (id, body) => request(`${V}/coupons/${enc(id)}`, { method: "PATCH", body }),
  /** coupons.disable */
  disableCoupon: (id) => request(`${V}/coupons/${enc(id)}/disable`, { method: "POST" }),
  /** Re-enable a disabled coupon (coupons.edit or coupons.disable). -> the Coupon. */
  enableCoupon: (id) => request(`${V}/coupons/${enc(id)}/enable`, { method: "POST" }),
};
