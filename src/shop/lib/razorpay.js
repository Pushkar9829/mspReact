/**
 * Razorpay Checkout, done carefully.
 *
 *   const result = await payOnline({ checkout, prefill, api });
 *   // result.status: "paid" | "pending" (verification still running; orders will update) |
 *   //                "dismissed" (buyer closed the modal) | "failed" (last error in result.error) |
 *   //                "unavailable" (script failed to load / online payment off) | "nothing_to_pay"
 *
 * - The promise does NOT settle on `payment.failed`: Razorpay keeps the modal open so the buyer can
 *   retry with another method. The failure is remembered and reported if the modal is then closed.
 * - Script load failure is distinguished ("unavailable") from a dismissal.
 * - After the handler fires, /checkout/verify is retried (network errors / 5xx), then the order's
 *   paymentStatus is polled (the webhook may confirm it first). It never re-opens payment, which
 *   is what caused double charges.
 * - `checkout.razorpay === null` with `payableOrderIds` (the provider was down at order time):
 *   payment is resumed with POST /checkout/pay for the first payable order.
 */
const SCRIPT = "https://checkout.razorpay.com/v1/checkout.js";
let scriptPromise = null;

export function loadRazorpay() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  if (!scriptPromise) {
    scriptPromise = new Promise((resolve) => {
      const el = document.createElement("script");
      el.src = SCRIPT;
      el.async = true;
      el.onload = () => resolve(Boolean(window.Razorpay));
      el.onerror = () => {
        scriptPromise = null; // allow a retry later
        el.remove();
        resolve(false);
      };
      document.body.appendChild(el);
    });
  }
  return scriptPromise;
}

/**
 * Open the modal. Resolves { status: "authorized", response } | { status: "dismissed", lastError } |
 * { status: "unavailable" }.
 */
export async function openRazorpay({ keyId, orderId, amount, currency = "INR", name = "MS₹", description = "Wholesale order", prefill = {}, notes, theme = "#0F7A4A" }) {
  const loaded = await loadRazorpay();
  if (!loaded || !window.Razorpay) return { status: "unavailable", reason: "SCRIPT_LOAD_FAILED" };
  return new Promise((resolve) => {
    let settled = false;
    let lastError = null;
    const finish = (value) => {
      if (settled) return;
      settled = true;
      resolve(value);
    };
    const rz = new window.Razorpay({
      key: keyId,
      amount,
      currency,
      order_id: orderId,
      name,
      description,
      prefill: {
        name: prefill.name || undefined,
        email: prefill.email || undefined,
        contact: prefill.contact || prefill.phone || undefined,
      },
      notes,
      theme: { color: theme },
      retry: { enabled: true },
      handler: (response) => finish({ status: "authorized", response }),
      modal: {
        ondismiss: () => finish({ status: "dismissed", lastError }),
        escape: true,
        confirm_close: true,
      },
    });
    rz.on("payment.failed", (event) => {
      // Keep the modal open: the buyer can try another method.
      lastError = event?.error || { description: "Payment failed" };
    });
    rz.open();
  });
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const retryable = (err) => !err?.status || err.status >= 500 || err.code === "NETWORK_ERROR";

/** Verify with retries, then poll the orders until paid (or give up → "pending"). */
export async function confirmPayment({ api, response, orderIds = [], verifyAttempts = 3, pollMs = 2000, pollAttempts = 10 }) {
  let lastErr = null;
  for (let i = 0; i < verifyAttempts; i += 1) {
    try {
      const res = await api.verifyRazorpayPayment(response);
      return { status: "paid", orders: res?.orders || [] };
    } catch (err) {
      lastErr = err;
      if (!retryable(err)) break;
      await sleep(800 * (i + 1));
    }
  }
  // Verification failed or is unreachable: the webhook may still confirm the payment.
  for (let i = 0; i < pollAttempts && orderIds.length; i += 1) {
    try {
      const orders = await Promise.all(orderIds.map((id) => api.getOrder(id)));
      if (orders.every((o) => o?.paymentStatus === "paid")) return { status: "paid", orders };
      if (orders.some((o) => o?.paymentStatus === "failed")) return { status: "failed", orders, error: lastErr };
    } catch {
      /* keep polling */
    }
    await sleep(pollMs);
  }
  return { status: "pending", error: lastErr };
}

/**
 * Full online payment for a checkout response ({ orders, razorpay, payableOrderIds }).
 * `prefill`: { name, email, contact }.
 */
export async function payOnline({ api, checkout, prefill, onStage }) {
  const orderIds = (checkout?.payableOrderIds || []).map(String);
  let razorpay = checkout?.razorpay || null;
  if (!razorpay) {
    if (!orderIds.length) return { status: "nothing_to_pay" };
    onStage?.("resuming");
    try {
      const resumed = await api.resumePayment(orderIds[0]);
      razorpay = resumed?.razorpay || null;
    } catch (err) {
      return { status: "unavailable", error: err };
    }
    if (!razorpay) return { status: "unavailable" };
  }
  onStage?.("paying");
  const opened = await openRazorpay({ ...razorpay, prefill });
  if (opened.status !== "authorized") return { ...opened, orderIds };
  onStage?.("verifying");
  const confirmed = await confirmPayment({ api, response: opened.response, orderIds });
  return { ...confirmed, orderIds };
}

/** @deprecated Use payOnline. Kept for older pages: resolves the Razorpay response or null. */
export async function openRazorpayCheckout(options) {
  const res = await openRazorpay(options);
  return res.status === "authorized" ? res.response : null;
}
