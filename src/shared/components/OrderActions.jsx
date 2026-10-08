import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, MoreHorizontal, XCircle } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { useCan } from "../context/AuthContext.jsx";
import { orderActions, isOnlinePayment } from "../lib/panel.js";
import { paymentLabel } from "../lib/format.js";
import {
  Alert,
  Button,
  Dialog,
  DropdownMenu,
  Field,
  IconButton,
  Input,
  MenuItem,
  MenuSeparator,
  Money,
  Textarea,
  Tooltip,
  cn,
  toast,
} from "../ui/index.js";

/* Which order fields each action may collect (mirrors the backend validators). */
const TRACKING_ACTIONS = new Set(["ready_to_ship", "ship"]);
const FORWARD_IDS = ["confirm", "process", "ready_to_ship", "ship", "out_for_delivery", "deliver"];

const SUCCESS = {
  confirm: "Order confirmed",
  process: "Order moved to processing",
  ready_to_ship: "Order marked ready to ship",
  ship: "Order marked shipped",
  out_for_delivery: "Order out for delivery",
  deliver: "Order marked delivered",
  cancel: "Order cancelled",
  approve_return: "Return approved",
  reject_return: "Return rejected",
  receive_return: "Return received",
  refund: "Refund started",
};

/* Orders this tab changed in the last few seconds: lets live-update listeners tell "you did this"
   apart from "someone else changed the order" (the socket echoes our own transitions too). */
const localChanges = new Map();
export function markLocalOrderChange(id) {
  if (id) localChanges.set(String(id), Date.now());
}
export function isRecentLocalOrderChange(id, windowMs = 15_000) {
  const at = localChanges.get(String(id));
  return Boolean(at && Date.now() - at < windowMs);
}

/** Invalidate everything an order transition can affect. */
export function invalidateOrder(queryClient, id) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: keys.orders.all }),
    queryClient.invalidateQueries({ queryKey: keys.inventory.all }),
    queryClient.invalidateQueries({ queryKey: keys.reservations.all }),
    queryClient.invalidateQueries({ queryKey: keys.ledger.all }),
    queryClient.invalidateQueries({ queryKey: keys.reports.all }),
    queryClient.invalidateQueries({ queryKey: keys.customers.all }),
    id ? queryClient.invalidateQueries({ queryKey: keys.orders.detail(id) }) : null,
    queryClient.invalidateQueries({ queryKey: keys.legacy }),
  ]);
}

/** Plain-language outcome of a refund for this order's payment method. */
export function refundOutcome(order) {
  if (!order) return "";
  if (isOnlinePayment(order)) {
    return order.paymentStatus === "paid"
      ? `Paid online (${paymentLabel(order.paymentMethod)}): a Razorpay refund to the original method is queued. Banks take 5–7 working days; failures show on the order and can be retried by support.`
      : "The online payment was never captured, so no money moves; the order is closed and a credit note issued.";
  }
  if (order.paymentMethod === "credit_terms" || order.paymentMethod === "purchase_order") {
    return "Credit / PO order: the amount is credited back to the buyer’s ledger account with your store and a GST credit note is issued.";
  }
  if (order.paymentMethod === "cod") {
    return order.paymentStatus === "paid"
      ? "Cash on delivery: a GST credit note is issued, but the cash must be returned to the buyer outside the platform."
      : "Cash on delivery not collected: the order is closed and a credit note issued.";
  }
  return "A GST credit note is issued for the refunded amount.";
}

/** What cancelling does to the money side of this order. */
export function cancelOutcome(order) {
  if (!order) return "";
  if (isOnlinePayment(order) && order.paymentStatus === "paid") {
    return `Paid online (${paymentLabel(order.paymentMethod)}): the full amount is refunded to the original payment method via Razorpay.`;
  }
  if (order.paymentMethod === "credit_terms" || order.paymentMethod === "purchase_order") {
    return "Credit / PO order: the debited amount is credited back to the buyer’s ledger account.";
  }
  return "No payment was captured for this order, so no refund is needed.";
}

/**
 * Dialog that runs one action from `orderActions()`: note (required where the API requires it),
 * tracking number/carrier for ready-to-ship/ship, per-line damaged quantity for receive-return,
 * typed confirmation for refunds. Errors stay inline; the dialog closes on success.
 */
export function OrderActionDialog({ order, action, open, onOpenChange, apiClient = defaultApi, onDone }) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const [tracking, setTracking] = useState({ trackingNumber: "", carrier: "" });
  const [damaged, setDamaged] = useState({});
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (open) {
      setNote("");
      setTracking({ trackingNumber: "", carrier: "" });
      setDamaged({});
      setTyped("");
      setError(null);
    }
  }, [open, action?.id]);

  if (!action) return null;
  const c = action.confirm || {};
  const noteReq = c.note?.required;
  const items = order?.items || [];
  const damagedErrors = {};
  items.forEach((it) => {
    const v = damaged[it._id];
    if (v === undefined || v === "") return;
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) damagedErrors[it._id] = "Whole number ≥ 0";
    else if (n > it.qty) damagedErrors[it._id] = `At most ${it.qty}`;
  });
  const typedOk = !c.typed || typed.trim() === c.typed;
  const valid = (!noteReq || note.trim()) && typedOk && !Object.keys(damagedErrors).length && note.length <= 1000;
  const dirty = Boolean(note || tracking.trackingNumber || tracking.carrier || Object.keys(damaged).length || typed);

  async function submit(e) {
    e.preventDefault();
    if (!valid || pending) return;
    setPending(true);
    setError(null);
    const extra = {};
    if (note.trim()) extra.note = note.trim();
    if (TRACKING_ACTIONS.has(action.id)) {
      if (tracking.trackingNumber.trim()) extra.trackingNumber = tracking.trackingNumber.trim();
      if (tracking.carrier.trim()) extra.carrier = tracking.carrier.trim();
    }
    if (action.id === "receive_return") {
      const rows = items
        .map((it) => ({ itemId: String(it._id), damagedQty: Number(damaged[it._id] || 0) }))
        .filter((r) => r.damagedQty > 0);
      if (rows.length) extra.items = rows;
    }
    try {
      markLocalOrderChange(order._id);
      const res = await action.call(apiClient, order._id, extra);
      await invalidateOrder(queryClient, order._id);
      toast.success(SUCCESS[action.id] || "Order updated", { description: order.orderNumber });
      onOpenChange(false);
      onDone?.(res, action);
    } catch (err) {
      setError(err);
    } finally {
      setPending(false);
    }
  }

  const fieldErr = (name) => (typeof error?.fieldError === "function" ? error.fieldError(name) : undefined);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title={c.title || action.label}
      description={c.body}
      size={action.id === "receive_return" ? "lg" : "md"}
      dirty={dirty}
      busy={pending}
      footer={
        <>
          <Button onClick={() => onOpenChange(false)} disabled={pending}>
            Keep order as is
          </Button>
          <Button type="submit" form={`order-action-${action.id}`} variant={action.tone === "danger" ? "danger" : "primary"} loading={pending} disabled={!valid}>
            {c.cta || action.label}
          </Button>
        </>
      }
    >
      <form id={`order-action-${action.id}`} onSubmit={submit} className="grid gap-4">
        <p className="text-ui-sm text-fg-muted">
          Order <span className="font-medium text-fg">{order.orderNumber}</span> · <Money value={order.total} /> · {paymentLabel(order.paymentMethod)}
        </p>

        {action.id === "refund" ? (
          <Alert tone="warning" title="Refund amount is computed by the server">
            <p>
              The full refundable amount for this order (order total <Money value={order.total} />, less anything already refunded) is returned. {refundOutcome(order)}
            </p>
          </Alert>
        ) : null}
        {action.id === "cancel" ? <Alert tone="warning">{cancelOutcome(order)}</Alert> : null}

        {TRACKING_ACTIONS.has(action.id) ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Tracking number" optional hint={action.id === "ready_to_ship" ? "Leave empty to book a Delhivery AWB automatically (where configured)." : "Shown to the buyer."} error={fieldErr("trackingNumber")}>
              <Input value={tracking.trackingNumber} maxLength={80} onChange={(e) => setTracking({ ...tracking, trackingNumber: e.target.value })} autoComplete="off" />
            </Field>
            <Field label="Carrier" optional hint="e.g. Delhivery, Blue Dart, own fleet" error={fieldErr("carrier")}>
              <Input value={tracking.carrier} maxLength={80} onChange={(e) => setTracking({ ...tracking, carrier: e.target.value })} />
            </Field>
          </div>
        ) : null}

        {action.id === "receive_return" ? (
          <div className="grid gap-2">
            <p className="text-ui-sm font-medium text-fg">Inspection: damaged units per line</p>
            <div className="overflow-x-auto rounded-md border border-border">
              <table className="w-full text-ui-sm">
                <thead className="bg-surface-2 text-ui-xs text-fg-muted">
                  <tr>
                    <th scope="col" className="px-3 py-2 text-left font-medium">Item</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Returned</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Damaged</th>
                    <th scope="col" className="px-3 py-2 text-right font-medium">Back to stock</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it) => {
                    const d = Number(damaged[it._id] || 0);
                    const bad = damagedErrors[it._id];
                    return (
                      <tr key={it._id} className="border-t border-border">
                        <td className="px-3 py-2">
                          <p className="font-medium text-fg">{it.name}</p>
                          <p className="font-mono text-ui-xs text-fg-subtle">{it.sku}</p>
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums">{it.qty}</td>
                        <td className="px-3 py-2 text-right">
                          <Input
                            type="number"
                            inputMode="numeric"
                            min={0}
                            max={it.qty}
                            step={1}
                            size="sm"
                            className="ml-auto w-20 text-right"
                            aria-label={`Damaged units of ${it.name}`}
                            aria-invalid={bad ? true : undefined}
                            value={damaged[it._id] ?? ""}
                            placeholder="0"
                            onChange={(e) => setDamaged({ ...damaged, [it._id]: e.target.value })}
                          />
                          {bad ? <p className="mt-1 text-ui-2xs text-danger-fg" role="alert">{bad}</p> : null}
                        </td>
                        <td className="px-3 py-2 text-right tabular-nums text-fg-muted">{bad ? "—" : Math.max(0, it.qty - d)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <p className="text-ui-xs text-fg-subtle">Undamaged units are restocked to the warehouse they shipped from; damaged units are booked as damaged stock.</p>
          </div>
        ) : null}

        {c.note ? (
          <Field label={c.note.label || "Note"} required={noteReq} optional={!noteReq} error={fieldErr("note")} hint={`${note.length}/1000`}>
            <Textarea rows={3} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        ) : null}

        {c.typed ? (
          <Field label={<>Type <span className="font-mono font-semibold text-fg">{c.typed}</span> to confirm</>}>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} autoComplete="off" spellCheck={false} />
          </Field>
        ) : null}

        {error ? (
          <Alert tone="danger" title="Couldn’t update the order">
            {error.message}
            {error.code === "INVALID_STATE" || error.status === 409 ? " The order may have changed in the meantime — close this dialog to see its latest state." : ""}
            {error.requestId ? <span className="mt-1 block font-mono text-ui-2xs opacity-80">Reference: {error.requestId}</span> : null}
          </Alert>
        ) : null}
      </form>
    </Dialog>
  );
}

/**
 * Action bar (detail page) or row menu (lists) for an order, driven by `orderActions(order, can)`.
 *
 *   <OrderActions order={order} />                       // primary + secondary buttons, "More" menu
 *   <OrderActions order={row} variant="menu" />          // ⋯ menu for table rows
 *   <OrderActions order={order} apiClient={api.withTenant(order.tenantId?._id)} />  // super admin
 *
 * Disabled actions (e.g. confirm on an unpaid online order) are shown disabled with the reason.
 * Actions the user lacks permission for are omitted (see lib/panel.js).
 */
export default function OrderActions({ order, variant = "bar", apiClient = defaultApi, onDone, size = "sm", className, extraMenuItems }) {
  const can = useCan();
  const actions = useMemo(() => orderActions(order, can), [order, can]);
  const [active, setActive] = useState(null);
  const current = actions.find((a) => a.id === active) || null;

  const dialog = <OrderActionDialog order={order} action={current} open={Boolean(current)} onOpenChange={(o) => !o && setActive(null)} apiClient={apiClient} onDone={onDone} />;

  if (variant === "menu") {
    if (!actions.length && !extraMenuItems) return null;
    return (
      <>
        <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${order.orderNumber}`} size="xs" />}>
          {extraMenuItems}
          {extraMenuItems && actions.length ? <MenuSeparator /> : null}
          {actions.map((a) => (
            <MenuItem key={a.id} tone={a.tone} disabled={a.disabled} onSelect={() => setActive(a.id)} title={a.reason}>
              {a.label}
              {a.reason ? <span className="sr-only"> (unavailable: {a.reason})</span> : null}
            </MenuItem>
          ))}
        </DropdownMenu>
        {dialog}
      </>
    );
  }

  if (!actions.length) return null;
  const forward = actions.filter((a) => FORWARD_IDS.includes(a.id) || ["approve_return", "receive_return"].includes(a.id));
  const primary = forward[0];
  const secondary = forward.slice(1);
  const danger = actions.filter((a) => !forward.includes(a));
  const btn = (a, variantName) => {
    const b = (
      <Button key={a.id} size={size} variant={variantName} disabled={a.disabled} onClick={() => setActive(a.id)}>
        {a.label}
      </Button>
    );
    return a.reason ? (
      <Tooltip key={a.id} content={a.reason}>
        <span tabIndex={0} className="inline-flex rounded-md outline-none focus-visible:outline-2 focus-visible:outline-ring">
          {b}
        </span>
      </Tooltip>
    ) : (
      b
    );
  };

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {danger.length ? (
        <DropdownMenu
          trigger={
            <Button size={size} rightIcon={ChevronDown}>
              More actions
            </Button>
          }
        >
          {danger.map((a) => (
            <MenuItem key={a.id} tone={a.tone} disabled={a.disabled} onSelect={() => setActive(a.id)}>
              {a.label}
            </MenuItem>
          ))}
        </DropdownMenu>
      ) : null}
      {secondary.map((a) => btn(a, "secondary"))}
      {primary ? btn(primary, primary.tone === "danger" ? "danger" : "primary") : null}
      {dialog}
    </div>
  );
}

/* ------------------------------------------------------------------ bulk */

const BULK_IDS = ["confirm", "process", "ready_to_ship", "ship", "deliver", "cancel"];

/**
 * Bulk transitions for selected orders with a partial-failure report.
 *   bulkActions={(rows, clear) => <BulkOrderActions rows={rows} onFinished={clear} />}
 * Only actions available for at least one selected order are offered; ineligible orders are skipped
 * and listed. Requests run one at a time (each is an atomic server transition).
 */
export function BulkOrderActions({ rows = [], apiClient = defaultApi, onFinished }) {
  const can = useCan();
  const queryClient = useQueryClient();
  const [pick, setPick] = useState(null);
  const [note, setNote] = useState("");
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState(null);

  const options = BULK_IDS.map((id) => {
    const eligible = rows.filter((o) => orderActions(o, can).some((a) => a.id === id && !a.disabled));
    const sample = rows.map((o) => orderActions(o, can).find((a) => a.id === id)).find(Boolean);
    return { id, label: sample?.label, action: sample, eligible };
  }).filter((o) => o.eligible.length);

  const chosen = options.find((o) => o.id === pick);

  async function run() {
    if (!chosen) return;
    setRunning(true);
    const results = [];
    for (const order of chosen.eligible) {
      const action = orderActions(order, can).find((a) => a.id === chosen.id);
      try {
        markLocalOrderChange(order._id);
        await action.call(apiClient, order._id, note.trim() ? { note: note.trim() } : {});
        results.push({ order, ok: true });
      } catch (err) {
        results.push({ order, ok: false, message: err?.message || "Failed" });
      }
    }
    const skipped = rows.filter((o) => !chosen.eligible.includes(o));
    await invalidateOrder(queryClient);
    setRunning(false);
    setPick(null);
    setNote("");
    setReport({ label: chosen.label, results, skipped });
    const ok = results.filter((r) => r.ok).length;
    if (ok === results.length && !skipped.length) toast.success(`${chosen.label}: ${ok} order${ok === 1 ? "" : "s"} updated`);
  }

  if (!options.length) return <span className="text-ui-xs">No bulk action applies to the selected orders</span>;

  return (
    <>
      {options.map((o) => (
        <Button key={o.id} size="xs" variant={o.action?.tone === "danger" ? "danger-ghost" : "secondary"} onClick={() => setPick(o.id)}>
          {o.label} ({o.eligible.length})
        </Button>
      ))}
      <Dialog
        open={Boolean(chosen)}
        onOpenChange={(open) => !open && !running && setPick(null)}
        busy={running}
        title={chosen ? `${chosen.label}: ${chosen.eligible.length} order${chosen.eligible.length === 1 ? "" : "s"}?` : ""}
        description={chosen?.action?.confirm?.body}
        footer={
          <>
            <Button onClick={() => setPick(null)} disabled={running}>
              Cancel
            </Button>
            <Button variant={chosen?.action?.tone === "danger" ? "danger" : "primary"} loading={running} onClick={run}>
              {chosen?.label}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 text-ui-sm">
          {chosen && rows.length > chosen.eligible.length ? (
            <Alert tone="info">{rows.length - chosen.eligible.length} selected order(s) are not in a state for this action and will be skipped.</Alert>
          ) : null}
          {chosen?.action?.confirm?.note ? (
            <Field label={`${chosen.action.confirm.note.label || "Note"} (applied to every order)`} optional>
              <Textarea rows={2} maxLength={1000} value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
          ) : null}
          {["ready_to_ship", "ship"].includes(chosen?.id) ? <p className="text-ui-xs text-fg-subtle">Tracking numbers can’t be entered in bulk; Delhivery AWBs are booked automatically where configured.</p> : null}
        </div>
      </Dialog>
      <Dialog
        open={Boolean(report)}
        onOpenChange={(open) => {
          if (!open) {
            setReport(null);
            onFinished?.();
          }
        }}
        title={report ? `${report.label}: results` : ""}
        footer={
          <Button
            variant="primary"
            onClick={() => {
              setReport(null);
              onFinished?.();
            }}
          >
            Done
          </Button>
        }
      >
        {report ? (
          <div className="grid gap-3 text-ui-sm">
            <p>
              {report.results.filter((r) => r.ok).length} updated · {report.results.filter((r) => !r.ok).length} failed · {report.skipped.length} skipped
            </p>
            <ul className="grid max-h-80 gap-1 overflow-y-auto">
              {report.results.map((r) => (
                <li key={r.order._id} className="flex items-start gap-2">
                  {r.ok ? <CheckCircle2 aria-hidden className="mt-0.5 size-4 text-success" /> : <XCircle aria-hidden className="mt-0.5 size-4 text-danger" />}
                  <span>
                    <span className="font-medium">{r.order.orderNumber}</span>
                    {r.ok ? " — updated" : ` — ${r.message}`}
                  </span>
                </li>
              ))}
              {report.skipped.map((o) => (
                <li key={o._id} className="flex items-start gap-2 text-fg-muted">
                  <span aria-hidden className="mt-1.5 size-2 rounded-full bg-fg-subtle" />
                  <span>
                    <span className="font-medium">{o.orderNumber}</span> — skipped (not eligible)
                  </span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Dialog>
    </>
  );
}
