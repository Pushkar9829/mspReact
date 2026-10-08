/**
 * Buyer orders.
 *   const list = useMyOrders({ status, page, limit })     // { data, meta } — server-paged (status is a comma list)
 *   const { data: order } = useMyOrder(id)               // incl. `totals` and `allowedActions`
 *       allowedActions: { cancel, return, reorder, invoice, track, pay, returnUntil, reasons: { cancel?, return?, invoice? } }
 *   const a = useOrderActions(id)  → a.cancel.mutate(note)  a.requestReturn.mutate({ reason, note })
 *   useOrderTracking(id, { enabled: order.allowedActions.track })
 * Buy again: useReorder() in hooks/useCart.js. Pay now: payForOrder(order) in hooks/useCheckout.js.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../shared/api/index.js";
import { keys, shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";

export function useMyOrders(query = {}) {
  const { viewer, signedIn } = useViewer();
  return useQuery({
    queryKey: shopKeys.orders(viewer, query),
    queryFn: () => api.listOrders({ limit: 10, ...query }),
    enabled: signedIn,
    placeholderData: keepPreviousData,
  });
}

export function useMyOrder(id) {
  const { signedIn } = useViewer();
  return useQuery({ queryKey: shopKeys.order(id), queryFn: () => api.getOrder(id), enabled: signedIn && Boolean(id) });
}

export function useOrderTracking(id, { enabled = true } = {}) {
  return useQuery({ queryKey: [...shopKeys.order(id), "tracking"], queryFn: () => api.getTracking(id), enabled: Boolean(id) && enabled, staleTime: 60_000 });
}

export function useOrderActions(id) {
  const qc = useQueryClient();
  const settle = () => {
    qc.invalidateQueries({ queryKey: shopKeys.order(id) });
    qc.invalidateQueries({ queryKey: [...shopKeys.all, "orders"] });
    qc.invalidateQueries({ queryKey: keys.orders.all });
  };
  const cancel = useMutation({
    mutationFn: (note) => api.cancelOrder(id, note),
    onSuccess: () => toast.success("Order cancelled"),
    onError: (err) => toast.error(err?.message || "Could not cancel the order"),
    onSettled: settle,
  });
  const requestReturn = useMutation({
    mutationFn: (body) => api.requestReturn(id, body),
    onSuccess: () => toast.success("Return requested", { description: "The seller will review it. Refunds follow once the items are received." }),
    onError: (err) => toast.error(err?.message || "Could not request a return"),
    onSettled: settle,
  });
  return { cancel, requestReturn, downloadInvoice: (filename) => api.downloadInvoicePdf(id, filename) };
}
