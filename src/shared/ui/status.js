import { prettyStatus } from "../auth.js";

/**
 * The one status → tone map (order, payment, product, variant, tenant, user, offer, coupon, CMS,
 * chat, review, reservation, notification, return request, invoice).
 * Tones: success | info | warning | danger | neutral | accent | primary.
 * Domain-specific overrides: STATUS_TONES_BY_DOMAIN[domain][status].
 */
export const STATUS_TONES = {
  // positive / done
  active: "success",
  published: "success",
  delivered: "success",
  paid: "success",
  resolved: "success",
  committed: "success",
  consumed: "neutral",
  issued: "success",
  received: "success",
  approved: "success",
  // in-flight
  confirmed: "info",
  processing: "info",
  ready_to_ship: "info",
  shipped: "info",
  out_for_delivery: "info",
  assigned: "info",
  open: "info",
  held: "info",
  trial: "accent",
  scheduled: "accent",
  review: "warning",
  // attention needed
  pending: "warning",
  pending_review: "warning",
  pending_approval: "warning",
  unpaid: "warning",
  unassigned: "warning",
  waiting_customer: "warning",
  return_requested: "warning",
  requested: "warning",
  return_approved: "accent",
  returned: "neutral",
  // negative / terminal
  refunded: "neutral",
  cancelled: "danger",
  returned_to_origin: "danger",
  failed: "danger",
  suspended: "danger",
  locked: "danger",
  rejected: "danger",
  dead: "danger",
  // inert
  draft: "neutral",
  inactive: "neutral",
  disabled: "neutral",
  archived: "neutral",
  unpublished: "neutral",
  closed: "neutral",
  hidden: "neutral",
  released: "neutral",
  restored: "neutral",
  deleted: "neutral",
};

export const STATUS_TONES_BY_DOMAIN = {
  payment: { pending: "warning", refunded: "accent", failed: "danger" },
  review: { published: "success", hidden: "warning" },
  returnRequest: { approved: "info", received: "success", rejected: "danger" },
};

const LABELS = {
  out_for_delivery: "Out for delivery",
  ready_to_ship: "Ready to ship",
  waiting_customer: "Waiting on customer",
  pending_review: "Pending review",
  pending_approval: "Pending approval",
  return_requested: "Return requested",
  return_approved: "Return approved",
  returned_to_origin: "Returned to seller (RTO)",
};

export function statusTone(status, domain) {
  const key = String(status || "");
  return STATUS_TONES_BY_DOMAIN[domain]?.[key] || STATUS_TONES[key] || "neutral";
}

export function statusLabel(status) {
  const key = String(status || "");
  return LABELS[key] || prettyStatus(key);
}
