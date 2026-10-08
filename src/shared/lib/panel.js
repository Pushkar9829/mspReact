import { prettyStatus } from "../auth.js";

/*
 * Status lists and the order state machine — mirror of mspNode:
 *   config/constants.js, orders/statuses.js (ALLOWED_TRANSITIONS), orders/lifecycle.js,
 *   users/validators.js (ADMIN_STATUSES).
 * Keep these in sync with the backend; pages must not hard-code their own lists.
 */

export const TENANT_STATUSES = ["active", "trial", "pending", "suspended", "archived"];
/** Statuses an admin may set (locked/deleted are system-managed and rejected by the API). */
export const USER_STATUSES = ["active", "pending", "suspended"];
/** Every status a user can have (for display / filters). */
export const USER_STATUSES_ALL = ["active", "pending", "suspended", "locked", "deleted"];
export const ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
  "return_requested",
  "return_approved",
  "returned",
  "refunded",
  "returned_to_origin",
];
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"];
export const PAYMENT_METHODS = ["upi", "card", "netbanking", "cod", "purchase_order", "credit_terms"];
export const ONLINE_PAYMENT_METHODS = ["upi", "card", "netbanking"];
export const FULFILLMENT_MODES = ["store_pickup", "delivery_partner"];
export const CMS_STATUSES = ["draft", "review", "published", "unpublished"];
export const CMS_TYPES = ["home", "landing", "faq", "policy", "terms", "privacy", "shipping", "custom"];
export const CHAT_STATUSES = ["open", "unassigned", "assigned", "waiting_customer", "resolved", "closed"];
export const ROLE_SCOPES = ["platform", "tenant"];
export const PRODUCT_STATUSES = ["draft", "pending_review", "published", "scheduled", "archived"];
/** Statuses a product may be saved with (archive = DELETE /products/:id). */
export const PRODUCT_EDITABLE_STATUSES = ["draft", "pending_review", "scheduled", "published"];
export const VARIANT_STATUSES = ["active", "inactive", "archived"];
export const OFFER_STATUSES = ["draft", "active", "inactive", "pending_approval"];
export const COUPON_STATUSES = ["active", "disabled"];
export const REVIEW_STATUSES = ["published", "hidden"];
export const RESERVATION_STATUSES = ["held", "committed", "released", "consumed", "restored"];
export const NOTIFICATION_STATUSES = ["scheduled", "published", "cancelled"];
export const RETURN_REQUEST_STATUSES = ["requested", "approved", "rejected", "received"];
export const INVENTORY_ADJUST_REASONS = ["inward", "adjustment", "damage", "return", "incoming"];

/** Backend ALLOWED_TRANSITIONS (orders/statuses.js). */
export const ORDER_TRANSITIONS = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["out_for_delivery", "delivered", "returned_to_origin"],
  out_for_delivery: ["delivered", "returned_to_origin"],
  delivered: ["return_requested", "refunded"],
  return_requested: ["return_approved", "delivered"],
  return_approved: ["returned"],
  returned: ["refunded"],
};

/** Transitions allowed through POST /orders/:id/status (forward fulfilment only). */
export const STATUS_ENDPOINT_TRANSITIONS = {
  pending: ["confirmed"],
  confirmed: ["processing"],
  processing: ["ready_to_ship"],
  ready_to_ship: ["shipped"],
  shipped: ["out_for_delivery", "delivered"],
  out_for_delivery: ["delivered"],
};

/** @deprecated use nextStatuses(order, can) / orderActions(order, can). Forward /status moves only. */
export const NEXT_ORDER_STATUSES = STATUS_ENDPOINT_TRANSITIONS;

export const CANCELLABLE_STATUSES = ["pending", "confirmed", "processing", "ready_to_ship"];
export const REFUNDABLE_STATUSES = ["delivered", "returned"];
/** Orders that have a GST invoice (issued on confirm). */
export const INVOICEABLE_STATUSES = [
  "confirmed",
  "processing",
  "ready_to_ship",
  "shipped",
  "out_for_delivery",
  "delivered",
  "return_requested",
  "return_approved",
  "returned",
  "refunded",
  "returned_to_origin",
];
/** Statuses that make up the returns queue. */
export const RETURN_QUEUE_STATUSES = ["return_requested", "return_approved", "returned"];

export function isOnlinePayment(order) {
  return ONLINE_PAYMENT_METHODS.includes(order?.paymentMethod);
}

/** Online orders must be paid before they can be confirmed (backend: PAYMENT_REQUIRED). */
export function needsPayment(order) {
  return isOnlinePayment(order) && order?.paymentStatus !== "paid";
}

const has = (can, perms) => (typeof can === "function" ? perms.some((p) => can(p)) : false);

/**
 * Statuses the user may move this order to via POST /orders/:id/status.
 * Respects the backend transitions, payment (no confirm on unpaid online orders) and orders.update.
 */
export function nextStatuses(order, can) {
  if (!order || !has(can, ["orders.update"])) return [];
  return (STATUS_ENDPOINT_TRANSITIONS[order.status] || []).filter((s) => !(s === "confirmed" && needsPayment(order)));
}

const ACTIONS = [
  {
    id: "confirm",
    label: "Confirm order",
    from: ["pending"],
    endpoint: { method: "POST", path: "/status", body: { status: "confirmed" } },
    call: (api, id, extra) => api.updateOrderStatus(id, "confirmed", extra),
    perms: ["orders.update"],
    confirm: {
      title: "Confirm this order?",
      body: "Stock is committed and the GST invoice is issued. The buyer is notified.",
      cta: "Confirm order",
    },
    blockedReason: (o) => (needsPayment(o) ? "Online payment has not been received yet." : null),
  },
  {
    id: "process",
    label: "Start processing",
    from: ["confirmed"],
    endpoint: { method: "POST", path: "/status", body: { status: "processing" } },
    call: (api, id, extra) => api.updateOrderStatus(id, "processing", extra),
    perms: ["orders.update"],
    confirm: { title: "Mark as processing?", body: "The order moves to packing.", cta: "Start processing" },
  },
  {
    id: "ready_to_ship",
    label: "Ready to ship",
    from: ["processing"],
    endpoint: { method: "POST", path: "/status", body: { status: "ready_to_ship" }, fields: ["trackingNumber", "carrier"] },
    call: (api, id, extra) => api.updateOrderStatus(id, "ready_to_ship", extra),
    perms: ["orders.update"],
    confirm: {
      title: "Mark ready to ship?",
      body: "For Delhivery orders this books the shipment and generates an AWB. You can enter a tracking number instead for manual shipping.",
      cta: "Mark ready & book",
    },
  },
  {
    id: "ship",
    label: "Mark shipped",
    from: ["ready_to_ship"],
    endpoint: { method: "POST", path: "/status", body: { status: "shipped" }, fields: ["trackingNumber", "carrier"] },
    call: (api, id, extra) => api.updateOrderStatus(id, "shipped", extra),
    perms: ["orders.update"],
    confirm: { title: "Mark as shipped?", body: "Committed stock is consumed and the buyer gets the tracking details.", cta: "Mark shipped" },
  },
  {
    id: "out_for_delivery",
    label: "Out for delivery",
    from: ["shipped"],
    endpoint: { method: "POST", path: "/status", body: { status: "out_for_delivery" } },
    call: (api, id, extra) => api.updateOrderStatus(id, "out_for_delivery", extra),
    perms: ["orders.update"],
    confirm: { title: "Mark out for delivery?", body: "The buyer is notified.", cta: "Out for delivery" },
  },
  {
    id: "deliver",
    label: "Mark delivered",
    from: ["shipped", "out_for_delivery"],
    endpoint: { method: "POST", path: "/status", body: { status: "delivered" } },
    call: (api, id, extra) => api.updateOrderStatus(id, "delivered", extra),
    perms: ["orders.update"],
    confirm: {
      title: "Mark as delivered?",
      body: "Cash-on-delivery orders are marked paid. The return window starts now.",
      cta: "Mark delivered",
    },
  },
  {
    id: "return_to_origin",
    label: "Returned to seller (RTO)",
    from: ["shipped", "out_for_delivery"],
    tone: "danger",
    endpoint: { method: "POST", path: "/status", body: { status: "returned_to_origin" }, fields: ["note"] },
    call: (api, id, extra) => api.updateOrderStatus(id, "returned_to_origin", extra),
    perms: ["orders.update"],
    confirm: {
      title: "Mark as returned to seller?",
      body: "Use this when the delivery failed and the parcel came back. Stock goes back to available, a credit-order debit is reversed, paid online orders are refunded and a credit note is issued. This cannot be undone.",
      cta: "Mark returned (RTO)",
      note: { label: "Reason (shown to the buyer)", required: false },
    },
  },
  {
    id: "cancel",
    label: "Cancel order",
    from: CANCELLABLE_STATUSES,
    tone: "danger",
    endpoint: { method: "POST", path: "/cancel", fields: ["note"] },
    call: (api, id, extra) => api.cancelOrder(id, extra?.note),
    perms: ["orders.cancel", "orders.update"],
    confirm: {
      title: "Cancel this order?",
      body: "Reserved stock is released and promotions are restored. Paid online orders are refunded to the original payment method; ledger orders are credited back. This cannot be undone.",
      cta: "Cancel order",
      note: { label: "Reason (shown to the buyer)", required: false },
    },
  },
  {
    id: "approve_return",
    label: "Approve return",
    from: ["return_requested"],
    endpoint: { method: "POST", path: "/return/approve", fields: ["note"] },
    call: (api, id, extra) => api.approveReturn(id, extra?.note),
    perms: ["returns.manage", "orders.refund"],
    confirm: {
      title: "Approve the return?",
      body: "The buyer is told to send the goods back (a return pickup is booked where supported). Refund happens after you receive the goods.",
      cta: "Approve return",
      note: { label: "Note to buyer", required: false },
    },
  },
  {
    id: "reject_return",
    label: "Reject return",
    from: ["return_requested"],
    tone: "danger",
    endpoint: { method: "POST", path: "/return/reject", fields: ["note"] },
    call: (api, id, extra) => api.rejectReturn(id, extra?.note),
    perms: ["returns.manage", "orders.refund"],
    confirm: {
      title: "Reject the return?",
      body: "The order goes back to Delivered. The buyer sees your reason.",
      cta: "Reject return",
      note: { label: "Reason (required)", required: true },
    },
  },
  {
    id: "receive_return",
    label: "Receive return",
    from: ["return_approved"],
    endpoint: { method: "POST", path: "/return/receive", fields: ["note", "items[{itemId,damagedQty}]"] },
    call: (api, id, extra) => api.receiveReturn(id, extra || {}),
    perms: ["returns.manage", "orders.refund"],
    confirm: {
      title: "Mark the return as received?",
      body: "Undamaged units go back into stock; record damaged quantities per item. You can refund afterwards.",
      cta: "Receive return",
      note: { label: "Inspection note", required: false },
      items: true,
    },
  },
  {
    id: "refund",
    label: "Refund",
    from: REFUNDABLE_STATUSES,
    tone: "danger",
    endpoint: { method: "POST", path: "/refund", fields: ["note"] },
    call: (api, id, extra) => api.refundOrder(id, extra?.note),
    perms: ["orders.refund"],
    confirm: {
      title: "Refund this order?",
      body: "The full refundable amount computed by the server is returned: online payments via Razorpay (may take a few days; failures are listed on the order), credit/PO orders as a ledger credit with a credit note. This cannot be undone.",
      cta: "Refund order",
      note: { label: "Refund note", required: false },
      typed: "REFUND",
    },
  },
];

/**
 * Dedicated actions available on an order for this user.
 * Each: { id, label, tone?, endpoint: { method, path, body?, fields? }, perms, confirm: { title, body, cta, note?, items?, typed? },
 *         call(api, orderId, extra) → Promise, disabled: boolean, reason?: string }
 * Actions the user lacks permission for are omitted; actions blocked by state (e.g. unpaid) are
 * returned with `disabled: true` and a `reason` so the UI can explain.
 */
export function orderActions(order, can) {
  if (!order) return [];
  return ACTIONS.filter((a) => a.from.includes(order.status) && has(can, a.perms)).map((a) => {
    const reason = a.blockedReason?.(order) || null;
    return { ...a, disabled: Boolean(reason), reason: reason || undefined };
  });
}

export function statusOptions(list) {
  return list.map((value) => ({ value, label: prettyStatus(value) }));
}

export function rowId(row) {
  return row?._id || row?.id;
}

export function metaOf(res) {
  return res?.meta || { total: 0, page: 1, limit: 20, pages: 0 };
}
