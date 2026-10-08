import { request, qs, enc, downloadFile, fetchBlob } from "../client.js";

const O = "/api/v1/orders";
const R = "/api/v1/reports";
const noteBody = (note) => (note ? { note } : {});

export const ordersApi = {
  /**
   * query (staff): {
   *   q (order/PO/tracking no.; buyer name, email, phone, company),
   *   status, paymentStatus, paymentMethod, refundStatus, returnStatus  (comma lists),
   *   fulfillmentMode (store_pickup | delivery_partner), queue ("returns"), buyerId,
   *   from, to (YYYY-MM-DD IST days or ISO), sort (createdAt | grandTotal | status | orderNumber),
   *   order (asc | desc), page, limit (max 100)
   * }. An invalid enum value -> 400 VALIDATION_ERROR.
   */
  listOrders: (query = {}) => request(`${O}${qs({ limit: 50, ...query })}`),
  /**
   * Refund intents across the store's orders (orders.refund or orders.update; staff), newest first.
   * query: { status (comma list of pending|processing|processed|failed; default failed), page, limit }.
   * Rows: { orderId, orderNumber, tenantId, buyerId, buyer, orderStatus, paymentStatus, paymentMethod, total, refund }.
   */
  listRefunds: (query = {}) => request(`${O}/refunds${qs({ limit: 20, ...query })}`),
  /** Re-run one FAILED refund intent (orders.refund). -> the updated Order. 404 unknown key, 409 not failed. */
  retryRefund: (orderId, key) => request(`${O}/${enc(orderId)}/refunds/${enc(key)}/retry`, { method: "POST" }),
  getOrder: (id) => request(`${O}/${enc(id)}`),
  getInvoice: (id) => request(`${O}/${enc(id)}/invoice`),
  /** Downloads the GST invoice PDF. */
  downloadInvoicePdf: (id, filename) => downloadFile(`${O}/${enc(id)}/invoice.pdf`, filename || `invoice-${id}.pdf`),
  /** Invoice PDF as a Blob (inline preview: URL.createObjectURL(blob), revoke when done). */
  invoicePdfBlob: (id) => fetchBlob(`${O}/${enc(id)}/invoice.pdf`),
  getCreditNotes: (id) => request(`${O}/${enc(id)}/credit-notes`),
  /** Downloads one credit note as a PDF. noteId: the note's id or its number. */
  downloadCreditNotePdf: (id, noteId, filename) =>
    downloadFile(`${O}/${enc(id)}/credit-notes/${enc(noteId)}.pdf`, filename || `credit-note-${noteId}.pdf`),
  getTracking: (id) => request(`${O}/${enc(id)}/tracking`),
  reorder: (id) => request(`${O}/${enc(id)}/reorder`, { method: "POST" }),
  /** body: { sellerNotes } */
  updateOrder: (id, body) => request(`${O}/${enc(id)}`, { method: "PATCH", body }),
  /**
   * Forward transitions (confirmed, processing, ready_to_ship, shipped, out_for_delivery, delivered;
   * cancelled/refunded are accepted too but prefer the dedicated endpoints).
   * extra: { note?, trackingNumber?, carrier? }. Return statuses must use the return endpoints.
   */
  updateOrderStatus: (id, status, extra = {}) => request(`${O}/${enc(id)}/status`, { method: "POST", body: { status, ...extra } }),
  cancelOrder: (id, note) => request(`${O}/${enc(id)}/cancel`, { method: "POST", body: noteBody(note) }),
  refundOrder: (id, note) => request(`${O}/${enc(id)}/refund`, { method: "POST", body: noteBody(note) }),
  /** Buyer only. body: { reason, note? } */
  requestReturn: (id, body) => request(`${O}/${enc(id)}/return`, { method: "POST", body }),
  approveReturn: (id, note) => request(`${O}/${enc(id)}/return/approve`, { method: "POST", body: noteBody(note) }),
  /** note is required (1..1000 chars). */
  rejectReturn: (id, note) => request(`${O}/${enc(id)}/return/reject`, { method: "POST", body: { note } }),
  /** body: { note?, items?: [{ itemId, damagedQty }] } */
  receiveReturn: (id, body = {}) => request(`${O}/${enc(id)}/return/receive`, { method: "POST", body }),

  // Customer insight (reports.view, orders.view or ledger.view; tenant context required).
  /**
   * One buyer as seen by the store: { customer, stats, orders: { data, meta }, ledger (account + last 10 entries) | null }.
   * query: { page, limit } page through the orders. 404 when the buyer never ordered here and isn't a home-store buyer.
   */
  getCustomerReport: (userId, query = {}) => request(`${R}/customers/${enc(userId)}${qs({ limit: 10, ...query })}`),
  /**
   * Customers list. query: { q, sort (spend | orders | lastOrderAt | name), order, from, to, days, page, limit }.
   * Rows carry orders, revenueOrders, spend, aov, first/lastOrderAt, homeStore and ledger { creditLimit, outstanding, available, advance } | null.
   */
  listCustomersReport: (query = {}) => request(`${R}/customers${qs({ limit: 20, ...query })}`),
  /** Store overview for a range. query: { from, to } (IST days) or { days }. See period/previous/changes/scope. */
  reportsOverviewRange: (query = {}) => request(`${R}/overview${qs(query)}`),
  /** Daily sales [{ _id: "YYYY-MM-DD", orders, gmv, aov, netSales, fees }]. query: { from, to } or { days } (max 731-day range). */
  reportsSalesRange: (query = {}) => request(`${R}/sales${qs(query)}`),
};
