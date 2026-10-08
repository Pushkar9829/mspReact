/**
 * Cart: one query + serialized mutations.
 *
 *   const { cart, isPending } = useCartQuery();          // cart = view model (lib/cartModel.js)
 *   const actions = useCartActions();
 *   actions.add.mutate({ variantId, qty, mode?: "bulk" | "regular", fulfillmentMode?, product? })
 *     (one line per variant: adding to an existing line adds to its qty; mode "bulk" starts a NEW line at bulkFrom)
 *   actions.setQty.mutate({ cartItemId, qty })          // qty 0 removes
 *   actions.remove.mutate({ cartItemId })
 *   actions.setMode.mutate({ cartItemId, fulfillmentMode })
 *   actions.applyCoupon.mutate(code) / actions.removeCoupon.mutate()
 *
 * Rules
 * - Every mutation runs in the scope `{ id: "cart" }`, so they execute one at a time, in order.
 * - Qty changes are optimistic: the line shows the new qty at once and its money is marked
 *   `pending` (render a skeleton, not a stale amount). On success the server quote replaces the
 *   cache (setQueryData); on error the previous quote is restored and a toast explains why.
 * - 409 CART_CONFLICT (cart changed in another tab) → refetch.
 * - Guests use the X-Guest-Key cart (sent automatically by the API client).
 */
import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";
import { viewCart, withAddedLine, withLineQty } from "../lib/cartModel.js";
import { openMiniCart } from "../lib/events.js";

const CART_SCOPE = { id: "cart" };

export function useCartQuery({ enabled = true } = {}) {
  const { viewer, ready } = useViewer();
  const query = useQuery({
    queryKey: shopKeys.cart(viewer),
    queryFn: () => api.getCart(),
    enabled: ready && enabled,
    staleTime: 15_000,
  });
  const cart = useMemo(() => viewCart(query.data), [query.data]);
  return { ...query, cart };
}

function isConflict(err) {
  return err?.status === 409 || err?.code === "CART_CONFLICT";
}

function useCartMutation(mutationFn, { optimistic, successToast, onDone, errorToast = true } = {}) {
  const qc = useQueryClient();
  const { viewer } = useViewer();
  const key = shopKeys.cart(viewer);
  return useMutation({
    scope: CART_SCOPE,
    mutationFn,
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: key });
      const prev = qc.getQueryData(key);
      if (optimistic) qc.setQueryData(key, (cur) => optimistic(cur, vars));
      return { prev };
    },
    onError: (err, _vars, ctx) => {
      if (ctx && "prev" in ctx) qc.setQueryData(key, ctx.prev);
      if (isConflict(err)) {
        qc.invalidateQueries({ queryKey: key });
        toast.error(err?.message || "Your cart changed in another tab. We refreshed it.");
      } else if (errorToast) {
        toast.error(err?.message || "Could not update your cart");
      }
    },
    onSuccess: (quote, vars) => {
      if (quote && typeof quote === "object" && Array.isArray(quote.groups)) qc.setQueryData(key, quote);
      else qc.invalidateQueries({ queryKey: key });
      if (successToast) successToast(quote, vars);
      onDone?.(quote, vars);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: shopKeys.cartCoupons(viewer) });
      qc.invalidateQueries({ queryKey: [...shopKeys.all, "preview", viewer] });
      qc.invalidateQueries({ queryKey: [...shopKeys.all, "payment-options", viewer] });
    },
  });
}

export function useCartActions() {
  const add = useCartMutation(
    async ({ variantId, slug, pack, qty = 1, mode, bulk, fulfillmentMode }) => {
      let id = variantId;
      if (!id && slug) {
        const looked = await api.lookupProduct(slug, pack);
        id = looked?.variant?._id;
      }
      if (!id) throw new Error("Choose a pack size first");
      const m = mode || (bulk ? "bulk" : undefined);
      return api.addCartItem({ variantId: id, qty, ...(fulfillmentMode ? { fulfillmentMode } : {}), ...(m ? { mode: m } : {}) });
    },
    {
      optimistic: (cur, vars) => (vars.variantId ? withAddedLine(cur, vars) : cur),
      successToast: (_q, vars) => {
        if (vars.silent) return;
        toast.success(vars.product?.name ? `Added ${vars.product.name}` : "Added to cart", {
          action: { label: "View cart", onClick: () => openMiniCart() },
        });
      },
    }
  );
  const setQty = useCartMutation(
    ({ cartItemId, qty }) => (qty < 1 ? api.removeCartItem(cartItemId) : api.updateCartItem(cartItemId, qty)),
    { optimistic: (cur, { cartItemId, qty }) => withLineQty(cur, cartItemId, qty) }
  );
  const remove = useCartMutation(({ cartItemId }) => api.removeCartItem(cartItemId), {
    optimistic: (cur, { cartItemId }) => withLineQty(cur, cartItemId, 0),
  });
  const setMode = useCartMutation(({ cartItemId, fulfillmentMode }) => api.setCartItemMode(cartItemId, fulfillmentMode));
  // Coupon errors are shown inline next to the code (Coupons.jsx), never as a toast as well.
  const applyCoupon = useCartMutation((code) => api.applyCoupon(code), { errorToast: false });
  const removeCoupon = useCartMutation(() => api.applyCoupon(""));
  const busy = add.isPending || setQty.isPending || remove.isPending || setMode.isPending || applyCoupon.isPending || removeCoupon.isPending;
  return { add, setQty, remove, setMode, applyCoupon, removeCoupon, busy };
}

/** Query + actions in one. */
export function useShopCart() {
  const q = useCartQuery();
  const actions = useCartActions();
  return { ...q, actions };
}

/**
 * Coupons for the viewer (works with an empty cart and for guests). `tenantId` = the store being browsed.
 * → { cartEmpty, coupons: [{ id, code, name, description, type, value, minCartValue, appliesTo, store, inCart,
 *     appliesToCart, eligible, savings, reason, applied, best, … }], best }
 */
export function useCartCoupons({ enabled = true, tenantId } = {}) {
  const { viewer, ready } = useViewer();
  return useQuery({
    queryKey: [...shopKeys.cartCoupons(viewer), tenantId || ""],
    queryFn: () => api.listCartCoupons(tenantId ? { tenantId } : undefined),
    enabled: ready && enabled,
    staleTime: 30_000,
  });
}

/**
 * Buy again: POST /orders/:id/reorder → the server quote goes straight into the cart cache.
 * The response also carries `added`, `adjusted` (qty fitted to today's pack/stock rules, with a
 * reason) and `skipped`. When nothing could be added the server answers 409 REORDER_UNAVAILABLE with
 * the same lists: use `reorderResult(err)` to show them. Callers show the outcome (ReorderSheet).
 */
export function useReorder() {
  const qc = useQueryClient();
  const { viewer } = useViewer();
  return useMutation({
    scope: CART_SCOPE,
    mutationFn: (orderId) => api.reorder(orderId),
    onSuccess: (res) => {
      if (res && Array.isArray(res.groups)) qc.setQueryData(shopKeys.cart(viewer), res);
      else qc.invalidateQueries({ queryKey: shopKeys.cart(viewer) });
    },
  });
}

/** { added, adjusted, skipped, error } from a reorder response or a thrown error (409 REORDER_UNAVAILABLE). */
export function reorderResult(resOrErr) {
  if (resOrErr instanceof Error) {
    const d = resOrErr.data || {};
    return { added: d.added || [], adjusted: d.adjusted || [], skipped: d.skipped || [], error: resOrErr.message || "These items can’t be added right now." };
  }
  return { added: resOrErr?.added || [], adjusted: resOrErr?.adjusted || [], skipped: resOrErr?.skipped || [], error: "" };
}
