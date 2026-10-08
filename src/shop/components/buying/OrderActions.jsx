/**
 * Buyer order actions, driven ONLY by the server's `order.allowedActions`
 * ({ cancel, return, reorder, invoice, track, pay, returnUntil, reasons }).
 *
 *   <OrderActions order={detail} />                 // full set (order detail / confirmation)
 *   <OrderActions order={detail} compact />         // row: smaller buttons
 *
 * Cancel (reason + confirm), return request (reason + note; whole order, per the API), buy again
 * (review sheet with added / skipped before going to the cart), invoice PDF, credit notes, tracking
 * timeline and pay now (Razorpay, resumed with POST /checkout/pay).
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CircleX, CreditCard, FileText, MapPinned, Receipt, RotateCcw, ShoppingCart, Undo2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "../../../shared/api/index.js";
import { formatDate, formatDateTime } from "../../../shared/lib/format.js";
import { Button } from "../ui/Button.jsx";
import { ShopSheet } from "../ui/Overlays.jsx";
import { Field, Radio, Textarea } from "../ui/form.jsx";
import { Notice } from "../ui/Layout.jsx";
import { Money } from "../ui/Price.jsx";
import { RowSkeleton } from "../ui/Skeletons.jsx";
import { cn } from "../ui/cn.js";
import { useOrderActions, useOrderTracking } from "../../hooks/useOrders.js";
import { reorderResult, useReorder } from "../../hooks/useCart.js";
import { payForOrder } from "../../hooks/useCheckout.js";
import { shopKeys } from "../../hooks/keys.js";
import { useViewer } from "../../hooks/useViewer.js";
import { orderId, orderStatusLabel } from "./orderUi.jsx";
import { displayName } from "../../lib/text.js";

const CANCEL_REASONS = ["Ordered by mistake", "Need to change items or quantities", "Found a better price", "Delivery date is too late", "Other"];
const RETURN_REASONS = ["Damaged or leaking", "Wrong item delivered", "Expired or close to expiry", "Items missing", "Quality not as expected", "Other"];

/* ------------------------------------------------------------------ pay */

export function usePayOrder(order) {
  const qc = useQueryClient();
  const { user } = useViewer();
  const [stage, setStage] = useState("idle");
  const id = orderId(order);
  async function pay() {
    if (stage !== "idle") return null;
    setStage("starting");
    try {
      const res = await payForOrder(order, { prefill: { name: user?.name, email: user?.email, contact: user?.phone }, onStage: setStage });
      if (res.status === "paid") toast.success("Payment received", { description: "Thank you. The seller has been notified." });
      else if (res.status === "pending") toast.info("We are confirming your payment", { description: "This can take a minute. The order updates on its own; you will not be charged twice." });
      else if (res.status === "dismissed") toast(res.lastError ? `Payment failed: ${res.lastError.description || "try another method"}` : "Payment not completed", { description: "You can pay any time from this order." });
      else if (res.status === "failed") toast.error("Payment failed", { description: res.error?.message || "No money was taken. Try again or choose another method." });
      else if (res.status === "unavailable") toast.error("Online payment is not available right now", { description: res.error?.message || "Try again in a few minutes, or contact the seller." });
      return res;
    } finally {
      setStage("idle");
      qc.invalidateQueries({ queryKey: shopKeys.order(id) });
      qc.invalidateQueries({ queryKey: [...shopKeys.all, "orders"] });
    }
  }
  const label = { starting: "Starting…", resuming: "Opening payment…", paying: "Waiting for payment…", verifying: "Confirming…" }[stage];
  return { pay, busy: stage !== "idle", label };
}

/* ------------------------------------------------------------------ sheets */

function ReasonForm({ id, reasons, reason, setReason, note, setNote, noteLabel, noteRequired }) {
  return (
    <div className="grid gap-4">
      <fieldset>
        <legend className="mb-1 text-shop-sm font-semibold text-shop-ink">Reason</legend>
        <div className="grid">
          {reasons.map((r) => (
            <Radio key={r} name={`${id}-reason`} label={r} value={r} checked={reason === r} onChange={() => setReason(r)} />
          ))}
        </div>
      </fieldset>
      <Field label={noteLabel} optional={!noteRequired} required={noteRequired}>
        <Textarea name="note" rows={3} maxLength={900} value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </div>
  );
}

export function CancelSheet({ order, open, onOpenChange }) {
  const a = useOrderActions(orderId(order));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const needNote = reason === "Other";
  const ready = reason && (!needNote || note.trim());
  const submit = () => {
    if (!ready) return;
    a.cancel.mutate([reason, note.trim()].filter(Boolean).join(": ").slice(0, 1000), { onSuccess: () => onOpenChange(false) });
  };
  return (
    <ShopSheet
      open={open}
      onOpenChange={(v) => !a.cancel.isPending && onOpenChange(v)}
      title={`Cancel order ${order.orderNumber}?`}
      description={`${order.items?.length || 0} item(s). Stock is released and any payment is refunded.`}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={a.cancel.isPending}>
            Keep order
          </Button>
          <Button variant="danger" loading={a.cancel.isPending} disabled={!ready} onClick={submit}>
            Cancel order
          </Button>
        </div>
      }
    >
      <ReasonForm id="cancel" reasons={CANCEL_REASONS} reason={reason} setReason={setReason} note={note} setNote={setNote} noteLabel="Anything the seller should know?" noteRequired={needNote} />
      {["purchase_order", "credit_terms"].includes(order.paymentMethod) ? (
        <Notice className="mt-4" tone="info">The order amount is credited back to your account with this seller. No bank transfer is made.</Notice>
      ) : order.paymentStatus === "paid" ? (
        <Notice className="mt-4" tone="info">The refund goes back to your original payment method through Razorpay. Your bank may take a few working days to show it.</Notice>
      ) : null}
      {a.cancel.error ? <Notice className="mt-4" tone="danger">{a.cancel.error.message}</Notice> : null}
    </ShopSheet>
  );
}

export function ReturnSheet({ order, open, onOpenChange }) {
  const a = useOrderActions(orderId(order));
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const until = order.allowedActions?.returnUntil || order.returnUntil;
  const easy = (order.items || []).filter((i) => i.easyReturn);
  const needNote = reason === "Other" || reason === "Items missing";
  const ready = reason && (!needNote || note.trim());
  const submit = () => {
    if (!ready) return;
    a.requestReturn.mutate({ reason, ...(note.trim() ? { note: note.trim() } : {}) }, { onSuccess: () => onOpenChange(false) });
  };
  return (
    <ShopSheet
      open={open}
      onOpenChange={(v) => !a.requestReturn.isPending && onOpenChange(v)}
      title="Request a return"
      description={until ? `Order ${order.orderNumber} · return by ${formatDate(until)}` : `Order ${order.orderNumber}`}
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={a.requestReturn.isPending}>
            Not now
          </Button>
          <Button loading={a.requestReturn.isPending} disabled={!ready} onClick={submit}>
            Request return
          </Button>
        </div>
      }
    >
      <div className="grid gap-4">
        {easy.length ? (
          <div className="rounded-xl border border-shop-line bg-shop-page/60 p-3 text-shop-sm">
            <p className="font-semibold text-shop-ink">Items eligible for return</p>
            <ul className="mt-1 list-disc pl-5 text-shop-text">
              {easy.map((i) => (
                <li key={i._id || i.variantId}>
                  {displayName(i.name)} {i.attributes?.packSize ? `(${i.attributes.packSize})` : ""} × {i.qty}
                </li>
              ))}
            </ul>
            <p className="mt-2 text-shop-xs text-shop-muted">The request covers this order. Say in the note which items and how many, if not all.</p>
          </div>
        ) : null}
        <ReasonForm id="return" reasons={RETURN_REASONS} reason={reason} setReason={setReason} note={note} setNote={setNote} noteLabel="Details (items, quantities, what is wrong)" noteRequired={needNote} />
        <Notice tone="info">The seller reviews the request. Once they receive and check the items, a credit note is issued and the refund follows.</Notice>
        {a.requestReturn.error ? <Notice tone="danger">{a.requestReturn.error.message}</Notice> : null}
      </div>
    </ShopSheet>
  );
}

function ReorderList({ label, tone, rows, render }) {
  if (!rows.length) return null;
  return (
    <section aria-label={label} className="mt-4 first:mt-0">
      <p className={cn("text-shop-sm font-semibold", tone)}>{label}</p>
      <ul className="mt-1 divide-y divide-shop-line text-shop-sm">
        {rows.map((i, n) => (
          <li key={`${i.variantId || i.name}-${n}`} className="flex justify-between gap-3 py-2">
            {render(i)}
          </li>
        ))}
      </ul>
    </section>
  );
}

/**
 * Buy again: the server's answer before going to the cart — added lines, lines whose quantity was
 * fitted to today's pack / stock rules (`adjusted`, ordered → added, with the reason) and skipped
 * lines. `result` comes from reorderResult() (hooks/useCart.js).
 */
export function ReorderSheet({ result, open, onOpenChange }) {
  const navigate = useNavigate();
  const added = result?.added || [];
  const adjusted = result?.adjusted || [];
  const skipped = result?.skipped || [];
  const adjustedIds = new Set(adjusted.map((i) => String(i.variantId)));
  const plain = added.filter((i) => !adjustedIds.has(String(i.variantId)));
  const slugOf = new Map(added.map((i) => [String(i.variantId), i.slug]));
  const name = (i) =>
    i.slug || slugOf.get(String(i.variantId)) ? (
      <Link to={`/product/${i.slug || slugOf.get(String(i.variantId))}${i.variantId ? `?v=${i.variantId}` : ""}`} className="min-w-0 text-shop-text hover:underline" onClick={() => onOpenChange(false)}>
        {displayName(i.name)}
      </Link>
    ) : (
      <span className="min-w-0 text-shop-text">{displayName(i.name)}</span>
    );
  return (
    <ShopSheet
      open={open}
      onOpenChange={onOpenChange}
      title={added.length ? `${added.length} item${added.length === 1 ? "" : "s"} added to your cart` : "Nothing was added to your cart"}
      description="Prices and stock are today’s. Review your cart before checkout."
      footer={
        <div className="flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Stay here
          </Button>
          {added.length ? (
            <Button leftIcon={ShoppingCart} onClick={() => navigate("/cart")}>
              Review cart
            </Button>
          ) : (
            <Button onClick={() => navigate("/category/all")}>Browse products</Button>
          )}
        </div>
      }
    >
      {result?.error && !added.length ? <Notice tone="warning" className="mb-4">{result.error}</Notice> : null}
      <ReorderList
        label="Added"
        tone="text-shop-ink"
        rows={plain}
        render={(i) => (
          <>
            {name(i)}
            <span className="shrink-0 tabular-nums text-shop-muted">× {i.qty}</span>
          </>
        )}
      />
      <ReorderList
        label="Quantity changed"
        tone="text-shop-warning-ink"
        rows={adjusted}
        render={(i) => (
          <>
            <span className="grid min-w-0">
              {name(i)}
              {i.reason ? <span className="text-shop-xs text-shop-muted">{i.reason}</span> : null}
            </span>
            <span className="shrink-0 text-right tabular-nums">
              <span className="block text-shop-xs text-shop-muted line-through" aria-label={`Ordered ${i.orderedQty}`}>
                × {i.orderedQty}
              </span>
              <span className="block font-semibold text-shop-ink" aria-label={`Added ${i.qty}`}>
                × {i.qty}
              </span>
            </span>
          </>
        )}
      />
      <ReorderList
        label="Not added"
        tone="text-shop-danger-ink"
        rows={skipped}
        render={(i) => (
          <span className="grid min-w-0">
            {name(i)}
            {i.reason ? <span className="text-shop-xs text-shop-muted">{i.reason}</span> : null}
          </span>
        )}
      />
    </ShopSheet>
  );
}

function CreditNotesSheet({ order, open, onOpenChange }) {
  const id = orderId(order);
  const q = useQuery({ queryKey: [...shopKeys.order(id), "credit-notes"], queryFn: () => api.getCreditNotes(id), enabled: open });
  const rows = Array.isArray(q.data) ? q.data : q.data?.data || [];
  const [busy, setBusy] = useState("");
  async function download(note) {
    const key = String(note._id || note.creditNoteNumber);
    setBusy(key);
    try {
      await api.downloadCreditNotePdf(id, key, `${note.creditNoteNumber || "credit-note"}.pdf`);
    } catch (err) {
      toast.error(err?.message || "Could not download the credit note");
    } finally {
      setBusy("");
    }
  }
  return (
    <ShopSheet open={open} onOpenChange={onOpenChange} title="Credit notes" description={`Order ${order.orderNumber}`}>
      {q.isPending ? (
        <RowSkeleton />
      ) : q.error ? (
        <Notice tone="danger">{q.error.message}</Notice>
      ) : rows.length ? (
        <ul className="grid gap-2">
          {rows.map((cn_) => (
            <li key={cn_._id} className="grid gap-2 rounded-xl border border-shop-line p-3 text-shop-sm sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
              <div className="min-w-0">
                <p className="flex justify-between gap-2 font-semibold text-shop-ink">
                  <span>{cn_.creditNoteNumber}</span>
                  <Money value={cn_.totals?.grandTotal} />
                </p>
                <p className="text-shop-xs text-shop-muted">
                  Issued {formatDate(cn_.issuedAt)} · against invoice {cn_.invoiceNumber || "—"}
                  {cn_.reason ? ` · ${cn_.reason}` : ""}
                </p>
              </div>
              <Button variant="secondary" leftIcon={FileText} aria-label={`Download credit note ${cn_.creditNoteNumber} as PDF`} loading={busy === String(cn_._id || cn_.creditNoteNumber)} onClick={() => download(cn_)}>
                PDF
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-shop-sm text-shop-muted">No credit notes for this order.</p>
      )}
    </ShopSheet>
  );
}

/** Status history (IST) + carrier shipments with scans. */
export function TrackingTimeline({ order, enabled = true }) {
  const id = orderId(order);
  const t = useOrderTracking(id, { enabled: enabled && Boolean(order.allowedActions?.track) });
  const history = [...(order.statusHistory || [])].sort((a, b) => new Date(b.at) - new Date(a.at));
  const shipments = t.data?.shipments || [];
  return (
    <div className="grid gap-4">
      {shipments.map((s, i) => (
        <div key={`${s.trackingNumber}-${i}`} className="rounded-xl border border-shop-line bg-shop-page/60 p-3 text-shop-sm">
          <p className="font-semibold text-shop-ink">
            {s.kind === "return" ? "Return shipment" : "Shipment"} · {s.carrier || "Courier"}
          </p>
          <p className="text-shop-xs text-shop-muted">
            Tracking no. <span className="font-mono text-shop-text">{s.trackingNumber || "—"}</span>
            {s.shippedAt ? ` · shipped ${formatDate(s.shippedAt)}` : ""}
            {s.cancelledAt ? " · cancelled" : ""}
          </p>
          {(s.events || []).length ? (
            <ol className="mt-2 grid gap-1.5 border-l border-shop-line pl-3">
              {[...s.events].reverse().map((e, n) => (
                <li key={n} className="text-shop-xs">
                  <span className="font-medium text-shop-ink">{e.status}</span>
                  {e.location ? <span className="text-shop-muted"> · {e.location}</span> : null}
                  <span className="block text-shop-subtle">{formatDateTime(e.at)}</span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-1 text-shop-xs text-shop-muted">No courier scans yet.</p>
          )}
        </div>
      ))}
      {!history.length && !shipments.length ? <p className="text-shop-sm text-shop-muted">{t.isFetching ? "Loading tracking…" : "No updates yet. You will see each step here as the seller moves the order along."}</p> : null}
      <ol className="grid gap-0" aria-label="Order history">
        {history.map((h, i) => (
          <li key={h._id || i} className="relative flex gap-3 pb-4 last:pb-0">
            <span aria-hidden className={cn("relative z-10 mt-1 size-3 shrink-0 rounded-full border-2", i === 0 ? "border-shop-primary bg-shop-primary" : "border-shop-line-strong bg-shop-card")} />
            {i < history.length - 1 ? <span aria-hidden className="absolute left-[5px] top-4 h-full w-px bg-shop-line" /> : null}
            <span className="min-w-0">
              <span className={cn("block text-shop-sm", i === 0 ? "font-semibold text-shop-ink" : "text-shop-text")}>{orderStatusLabel(h.status)}</span>
              <span className="block text-shop-xs text-shop-muted">{formatDateTime(h.at)}</span>
              {h.note && !/seed/i.test(h.note) ? <span className="block text-shop-xs text-shop-muted">{h.note}</span> : null}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

function TrackSheet({ order, open, onOpenChange }) {
  return (
    <ShopSheet open={open} onOpenChange={onOpenChange} title="Track order" description={`Order ${order.orderNumber} · ${orderStatusLabel(order.status)}`}>
      <TrackingTimeline order={order} enabled={open} />
    </ShopSheet>
  );
}

/* ------------------------------------------------------------------ bar */

/**
 * Action buttons for one order. `exclude`: actions to leave out (e.g. ["reorder"] on the order
 * that was just placed, ["track"] where the timeline is already on the page).
 */
export function OrderActions({ order, compact = false, exclude = [], className }) {
  const aa = order?.allowedActions || {};
  const id = orderId(order);
  const [sheet, setSheet] = useState(null);
  const [reorderOutcome, setReorderOutcome] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const reorder = useReorder();
  const payer = usePayOrder(order);
  const size = "md"; // 44 px tap targets in rows too
  const on = (k) => aa[k] && !exclude.includes(k);

  async function invoice() {
    setDownloading(true);
    try {
      await api.downloadInvoicePdf(id, `invoice-${order.invoiceNumber || order.orderNumber}.pdf`);
    } catch (err) {
      toast.error(err?.message || "Could not download the invoice");
    } finally {
      setDownloading(false);
    }
  }

  const buttons = [];
  if (on("pay")) buttons.push(<Button key="pay" size={size} leftIcon={CreditCard} loading={payer.busy} onClick={payer.pay}>{payer.label || "Pay now"}</Button>);
  if (on("track")) buttons.push(<Button key="track" size={size} variant="secondary" leftIcon={MapPinned} onClick={() => setSheet("track")}>{compact ? "Track" : "Track order"}</Button>);
  if (on("invoice")) buttons.push(<Button key="inv" size={size} variant="secondary" leftIcon={FileText} loading={downloading} onClick={invoice} aria-label={compact ? `Download GST invoice for order ${order.orderNumber} (PDF)` : undefined}>{compact ? "Invoice" : "Invoice PDF"}</Button>);
  if ((order.creditNoteIds || []).length && !exclude.includes("creditNotes")) buttons.push(<Button key="cn" size={size} variant="secondary" leftIcon={Receipt} onClick={() => setSheet("creditNotes")}>Credit notes</Button>);
  if (on("reorder"))
    buttons.push(
      <Button
        key="re"
        size={size}
        variant="secondary"
        leftIcon={RotateCcw}
        loading={reorder.isPending}
        onClick={() =>
          reorder.mutate(id, {
            onSettled: (res, err) => {
              setReorderOutcome(reorderResult(err || res));
              setSheet("reorder");
            },
          })
        }
      >
        Buy again
      </Button>
    );
  if (on("return")) buttons.push(<Button key="ret" size={size} variant="secondary" leftIcon={Undo2} onClick={() => setSheet("return")}>Request return</Button>);
  if (on("cancel")) buttons.push(<Button key="can" size={size} variant="ghost" className="text-shop-danger-ink" leftIcon={CircleX} onClick={() => setSheet("cancel")}>Cancel order</Button>);

  if (!buttons.length && !reorderOutcome) return null;
  return (
    <>
      <div className={cn("flex flex-wrap items-center gap-2", className)}>{buttons}</div>
      {sheet === "cancel" ? <CancelSheet order={order} open onOpenChange={(v) => !v && setSheet(null)} /> : null}
      {sheet === "return" ? <ReturnSheet order={order} open onOpenChange={(v) => !v && setSheet(null)} /> : null}
      {sheet === "track" ? <TrackSheet order={order} open onOpenChange={(v) => !v && setSheet(null)} /> : null}
      {sheet === "creditNotes" ? <CreditNotesSheet order={order} open onOpenChange={(v) => !v && setSheet(null)} /> : null}
      <ReorderSheet result={reorderOutcome} open={sheet === "reorder"} onOpenChange={(v) => !v && setSheet(null)} />
    </>
  );
}

/** Small "why not" line for actions the server refused (return window ended, etc.). */
export function ActionReasons({ order, keys: which = ["return", "invoice"], className }) {
  const reasons = order?.allowedActions?.reasons || {};
  const lines = which.filter((k) => reasons[k] && !(k === "return" && !["delivered"].includes(order.status))).map((k) => reasons[k]);
  if (!lines.length) return null;
  return <p className={cn("text-shop-xs text-shop-muted", className)}>{lines.join(" · ")}</p>;
}
