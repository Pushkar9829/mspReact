import { useEffect, useRef } from "react";
import { useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { useSocketEvent } from "../realtime/socket.js";

/**
 * Order work queues shared by the dashboards, the orders list and the returns queue.
 * Counts come from `meta.total` of `GET /orders?status=…&limit=1` (server-side counting).
 */
export const ORDER_QUEUES = [
  { id: "to_confirm", label: "To confirm", status: "pending", description: "New orders waiting for confirmation" },
  { id: "to_pack", label: "To pack", status: "confirmed", description: "Confirmed, not yet processing" },
  { id: "processing", label: "Processing", status: "processing", description: "Being packed" },
  { id: "ready_to_ship", label: "Ready to ship", status: "ready_to_ship", description: "Waiting for pickup / dispatch" },
  { id: "in_transit", label: "In transit", status: "shipped", description: "Shipped, not yet delivered" },
  { id: "return_requested", label: "Return requests", status: "return_requested", description: "Buyer asked to return" },
  { id: "return_approved", label: "Awaiting return", status: "return_approved", description: "Approved, goods on the way back" },
  { id: "returned", label: "To refund", status: "returned", description: "Goods received, refund pending" },
];

/** Refund-queue row (GET /orders/refunds) → the legacy `{ order, refund }` shape used by older callers. */
export function refundRowToLegacy(row) {
  return {
    order: {
      _id: row.orderId,
      orderNumber: row.orderNumber,
      tenantId: row.tenantId,
      buyerId: row.buyerId,
      buyerSnapshot: row.buyer || {},
      status: row.orderStatus,
      paymentStatus: row.paymentStatus,
      paymentMethod: row.paymentMethod,
      total: row.total,
    },
    refund: row.refund || {},
  };
}

/**
 * Failed refunds from `GET /orders/refunds?status=failed` (server-side, newest first; up to `limit`).
 * Resolves `[{ order, refund }]` (kept for older callers such as the super-admin overview).
 */
export async function fetchFailedRefunds(apiClient = defaultApi, { limit = 100 } = {}) {
  const res = await apiClient.listRefunds({ status: "failed", limit });
  return (res?.data || []).map(refundRowToLegacy);
}

/** `useFailedRefunds({ enabled, apiClient })` → useQuery result whose data is [{ order, refund }] (first 100). */
export function useFailedRefunds({ enabled = true, apiClient = defaultApi, scope = "default" } = {}) {
  return useQuery({
    queryKey: keys.orders.custom("failed-refunds", scope),
    queryFn: () => fetchFailedRefunds(apiClient),
    enabled,
    staleTime: 30_000,
  });
}

/** Number of failed refunds (server count via `meta.total`): `{ count, isPending, error, refetch }`. */
export function useFailedRefundCount({ enabled = true, apiClient = defaultApi, scope = "default" } = {}) {
  const q = useQuery({
    queryKey: keys.orders.custom("failed-refunds-count", scope),
    queryFn: () => apiClient.listRefunds({ status: "failed", limit: 1 }),
    enabled,
    staleTime: 30_000,
  });
  const total = q.data?.meta?.total;
  return { count: typeof total === "number" ? total : null, isPending: q.isPending && enabled, error: q.error, refetch: q.refetch };
}

/**
 * Counts per queue: `{ counts: { to_confirm: 3, … }, loading, error, refetch }`.
 * `queues` defaults to every ORDER_QUEUES entry.
 */
export function useOrderQueueCounts({ queues = ORDER_QUEUES, enabled = true, apiClient = defaultApi, scope = "default" } = {}) {
  const results = useQueries({
    queries: queues.map((q) => ({
      queryKey: keys.orders.custom("queue-count", scope, q.status),
      queryFn: () => apiClient.listOrders({ status: q.status, limit: 1 }),
      enabled,
      staleTime: 30_000,
    })),
  });
  const counts = {};
  queues.forEach((q, i) => {
    const total = results[i]?.data?.meta?.total;
    counts[q.id] = typeof total === "number" ? total : null;
  });
  return {
    counts,
    loading: results.some((r) => r.isPending),
    error: results.find((r) => r.error)?.error || null,
    refetch: () => results.forEach((r) => r.refetch()),
  };
}

/**
 * Live order updates: listens to the socket `order:updated` event (store staff get their store's
 * orders, platform admins every order) and invalidates every order query (lists, queue counts,
 * failed refunds, details) plus customer stats. Bursts are coalesced into one refetch per 400 ms.
 * Mount once per panel shell. `onUpdate(payload)` is optional.
 */
export function useOrderLiveUpdates({ enabled = true, onUpdate } = {}) {
  const queryClient = useQueryClient();
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useSocketEvent(
    "order:updated",
    (payload) => {
      onUpdate?.(payload);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        queryClient.invalidateQueries({ queryKey: keys.orders.all });
        queryClient.invalidateQueries({ queryKey: keys.customers.all });
      }, 400);
    },
    { enabled }
  );
}
