import { prettyStatus } from "../auth.js";

export const TENANT_STATUSES = ["active", "trial", "pending", "suspended", "archived"];
export const USER_STATUSES = ["active", "pending", "suspended", "locked"];
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
  "refunded",
];
export const PAYMENT_STATUSES = ["unpaid", "pending", "paid", "failed", "refunded"];
export const CMS_STATUSES = ["draft", "review", "published", "unpublished"];
export const CMS_TYPES = ["home", "landing", "faq", "policy", "terms", "privacy", "shipping", "custom"];
export const CHAT_STATUSES = ["open", "unassigned", "assigned", "waiting_customer", "resolved", "closed"];
export const ROLE_SCOPES = ["platform", "tenant"];
export const PRODUCT_STATUSES = ["draft", "pending_review", "published", "scheduled", "archived"];
export const OFFER_STATUSES = ["draft", "active", "inactive", "pending_approval"];
export const COUPON_STATUSES = ["active", "disabled"];

export const NEXT_ORDER_STATUSES = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_to_ship", "cancelled"],
  ready_to_ship: ["shipped", "cancelled"],
  shipped: ["out_for_delivery"],
  out_for_delivery: ["delivered"],
  delivered: ["return_requested"],
  return_requested: ["refunded"],
};

export function statusOptions(list) {
  return list.map((value) => ({ value, label: prettyStatus(value) }));
}

export function rowId(row) {
  return row?._id || row?.id;
}

export function metaOf(res) {
  return res?.meta || { total: 0, page: 1, limit: 20, pages: 0 };
}
