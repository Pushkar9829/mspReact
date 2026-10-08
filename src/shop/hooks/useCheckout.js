/**
 * Checkout data and the place-order flow.
 *
 *   const co = useCheckout({ addressId, deliveryPartnerId });
 *   co.preview        // POST /checkout/preview (server totals for this address: render ONLY these)
 *   co.paymentOptions // GET /checkout/payment-options (methods enabled/disabled with reasons, credit figures)
 *   co.place({ paymentMethod, poNumber, buyerNotes, prefill })  → { status, orders, payment }
 *   co.placing        // true from click until payment settled (own guard: a second click is ignored)
 *   co.stage          // "idle" | "placing" | "resuming" | "paying" | "verifying"
 *
 * - Idempotency-Key is kept in sessionStorage per cartId, so a reload/retry replays the same order
 *   instead of creating a second one. It is rotated after a successful order or when the cart changes.
 * - expectedGrandTotal is the preview total currently on screen.
 * - On success cart, orders and ledger caches are invalidated.
 */
import { useCallback, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys, shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";
import { useCartQuery } from "./useCart.js";
import { cartStamp } from "../lib/cartModel.js";
import { STORAGE, readJson, writeJson } from "../lib/storage.js";
import { payOnline } from "../lib/razorpay.js";

const ONLINE = new Set(["upi", "card", "netbanking"]);

function newKey() {
  try {
    return crypto.randomUUID();
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

/** Idempotency key for this cart + contents (sessionStorage). */
export function idempotencyKeyFor(cartId, stamp) {
  const slot = STORAGE.idem(cartId);
  const saved = readJson(slot, null, "sessionStorage");
  if (saved?.key && saved.stamp === stamp) return saved.key;
  const key = newKey();
  writeJson(slot, { key, stamp }, "sessionStorage");
  return key;
}

export function resetIdempotencyKey(cartId) {
  writeJson(STORAGE.idem(cartId), null, "sessionStorage");
}

export function useCheckout({ addressId, deliveryPartnerId } = {}) {
  const qc = useQueryClient();
  const { viewer, signedIn, user } = useViewer();
  const { cart, data: rawCart } = useCartQuery();
  const stamp = cartStamp(rawCart);
  const busy = useRef(false);
  const [placing, setPlacing] = useState(false);
  const [stage, setStage] = useState("idle");

  const preview = useQuery({
    queryKey: shopKeys.preview(viewer, addressId, deliveryPartnerId, stamp),
    queryFn: () => api.previewCheckout(addressId, deliveryPartnerId),
    enabled: signedIn && Boolean(addressId) && cart.count > 0 && !cart.pending,
    staleTime: 0,
    retry: false,
  });

  const paymentOptions = useQuery({
    queryKey: shopKeys.paymentOptions(viewer, addressId, stamp),
    queryFn: () => api.getPaymentOptions(addressId),
    enabled: signedIn && cart.count > 0 && !cart.pending,
    staleTime: 0,
    retry: false,
  });

  const place = useCallback(
    async ({ paymentMethod, poNumber, buyerNotes, prefill } = {}) => {
      if (busy.current) return { status: "busy" };
      if (!preview.data) return { status: "no_preview" };
      busy.current = true;
      setPlacing(true);
      setStage("placing");
      const cartId = cart.cartId;
      try {
        const key = idempotencyKeyFor(cartId, stamp);
        const body = {
          addressId,
          paymentMethod,
          expectedGrandTotal: Number(preview.data.grandTotal),
          ...(poNumber ? { poNumber } : {}),
          ...(buyerNotes ? { buyerNotes } : {}),
          ...(deliveryPartnerId ? { deliveryPartnerId } : {}),
        };
        const result = await api.checkout(body, key);
        let payment = null;
        if (ONLINE.has(paymentMethod)) {
          payment = await payOnline({
            api,
            checkout: result,
            prefill: prefill || { name: user?.name, email: user?.email, contact: user?.phone },
            onStage: setStage,
          });
        }
        resetIdempotencyKey(cartId);
        qc.invalidateQueries({ queryKey: shopKeys.cart(viewer) });
        qc.invalidateQueries({ queryKey: [...shopKeys.all, "orders"] });
        qc.invalidateQueries({ queryKey: keys.orders.all });
        qc.invalidateQueries({ queryKey: shopKeys.ledger(viewer) });
        return { status: "placed", orders: result?.orders || [], result, payment };
      } catch (err) {
        // Price / stock changed → the cart is different now: refresh it and the preview.
        if (["PRICE_CHANGED", "CART_CHANGED", "INSUFFICIENT_STOCK", "CART_CONFLICT"].includes(err?.code) || err?.status === 409) {
          qc.invalidateQueries({ queryKey: shopKeys.cart(viewer) });
          qc.invalidateQueries({ queryKey: [...shopKeys.all, "preview", viewer] });
        }
        return { status: "error", error: err };
      } finally {
        busy.current = false;
        setPlacing(false);
        setStage("idle");
      }
    },
    [addressId, deliveryPartnerId, preview.data, cart.cartId, stamp, qc, viewer, user]
  );

  return { cart, preview, paymentOptions, place, placing, stage, stamp };
}

/** Pay for an order placed earlier (order page "Pay now"). */
export async function payForOrder(order, { prefill, onStage } = {}) {
  return payOnline({ api, checkout: { razorpay: null, payableOrderIds: [order._id || order.id] }, prefill, onStage });
}

/** Buyer ledger (GET /ledger/me): outstanding, available, advance, spendable, creditLimit, entries, ledgers[]. */
export function useLedger({ enabled = true } = {}) {
  const { viewer, signedIn } = useViewer();
  return useQuery({ queryKey: shopKeys.ledger(viewer), queryFn: () => api.getLedger(), enabled: signedIn && enabled, staleTime: 60_000 });
}
