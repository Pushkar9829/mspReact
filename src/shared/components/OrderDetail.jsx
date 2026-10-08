import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, Download, ExternalLink, FileText, MapPin, Package, Receipt, RotateCcw, Truck, Undo2, User } from "lucide-react";
import { api as defaultApi } from "../api/index.js";
import { keys } from "../api/keys.js";
import { useCan } from "../context/AuthContext.jsx";
import { useApiMutation } from "../hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../hooks/useUnsavedChangesGuard.js";
import { INVOICEABLE_STATUSES, isOnlinePayment, needsPayment } from "../lib/panel.js";
import { formatEta, inr, paymentLabel } from "../lib/format.js";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  ConfirmDialog,
  DateTime,
  DescriptionList,
  EmptyState,
  KeyValue,
  Money,
  RelativeTime,
  SkeletonText,
  StatusPill,
  Textarea,
  Timeline,
  UnsavedChangesDialog,
  cn,
  toast,
} from "../ui/index.js";

/** Statuses that have a GST invoice (issued on confirm). Kept for the storefront import. */
export const INVOICEABLE = INVOICEABLE_STATUSES;

const FULFILLMENT = { store_pickup: "Store pickup", delivery_partner: "Delivery partner" };
const RETURN_LABEL = {
  requested: "Return requested",
  approved: "Return approved — awaiting goods",
  rejected: "Return rejected",
  received: "Return received — ready to refund",
};
const RETURN_TONE = { requested: "warning", approved: "info", rejected: "danger", received: "success" };
const REFUND_PROVIDER = { razorpay: "Razorpay", ledger: "Ledger credit", manual: "Manual" };

function attrSummary(attributes = {}) {
  const a = attributes || {};
  const custom = a.custom && typeof a.custom === "object" ? Object.entries(a.custom).map(([k, v]) => `${k}: ${v}`) : [];
  return [a.packSize || a.size, a.color, a.grade && `Grade ${a.grade}`, a.material, ...custom].filter(Boolean).join(" · ");
}

function TotalRow({ label, children, strong, muted }) {
  return (
    <div className={cn("flex items-baseline justify-between gap-6", strong && "border-t border-border pt-2 text-ui font-semibold text-fg", muted && "text-fg-muted")}>
      <dt>{label}</dt>
      <dd className="tabular-nums">{children}</dd>
    </div>
  );
}

/** Server totals for a saved order (never recomputed client-side). */
export function OrderTotals({ order, className }) {
  if (!order) return null;
  return (
    <dl className={cn("ml-auto grid w-full max-w-sm gap-1.5 text-ui-sm text-fg", className)}>
      <TotalRow label="Items subtotal">
        <Money value={order.subtotal} />
      </TotalRow>
      {order.couponDiscount ? (
        <TotalRow label={`Coupon${order.couponCode ? ` (${order.couponCode})` : ""}`}>
          −<Money value={order.couponDiscount} />
        </TotalRow>
      ) : null}
      {order.deliveryFee ? (
        <TotalRow label="Delivery fee">
          <Money value={order.deliveryFee} />
        </TotalRow>
      ) : null}
      {order.partnerFee ? (
        <TotalRow label={order.deliveryPartner?.name ? `Delivery partner (${order.deliveryPartner.name})` : "Delivery partner fee"}>
          <Money value={order.partnerFee} />
        </TotalRow>
      ) : null}
      {order.platformFee ? (
        <TotalRow label="Platform fee">
          <Money value={order.platformFee} />
        </TotalRow>
      ) : null}
      <TotalRow label="Order total" strong>
        <Money value={order.total} />
      </TotalRow>
      <TotalRow label={order.taxInclusive === false ? "GST (added)" : "GST included in total"} muted>
        <Money value={order.tax} />
      </TotalRow>
      {order.feeTax ? (
        <TotalRow label="of which GST on fees" muted>
          <Money value={order.feeTax} />
        </TotalRow>
      ) : null}
      {order.taxableValue ? (
        <TotalRow label="Taxable value" muted>
          <Money value={order.taxableValue} />
        </TotalRow>
      ) : null}
    </dl>
  );
}

export function OrderItemsCard({ order, productHref }) {
  const items = order?.items || [];
  return (
    <Card>
      <CardHeader title="Items" description={`${items.length} line${items.length === 1 ? "" : "s"} · ${items.reduce((n, it) => n + (Number(it.qty) || 0), 0)} units`} />
      <div className="overflow-x-auto">
        <table className="w-full text-ui-sm">
          <caption className="sr-only">Order items</caption>
          <thead className="bg-surface-2 text-ui-xs text-fg-muted">
            <tr>
              <th scope="col" className="px-4 py-2 text-left font-medium">Product</th>
              <th scope="col" className="hidden px-3 py-2 text-left font-medium sm:table-cell">HSN</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Qty</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium sm:table-cell">Unit price</th>
              <th scope="col" className="hidden px-3 py-2 text-right font-medium md:table-cell">GST</th>
              <th scope="col" className="px-4 py-2 text-right font-medium">Line total</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it) => {
              const href = productHref?.(it);
              return (
                <tr key={it._id} className="border-t border-border align-top">
                  <td className="px-4 py-3">
                    <div className="flex items-start gap-3">
                      <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-md border border-border bg-surface-sunken">
                        {it.image ? <img src={it.image} alt="" className="size-full object-cover" loading="lazy" /> : <Package aria-hidden className="size-4 text-fg-subtle" />}
                      </span>
                      <div className="min-w-0">
                        {href ? (
                          <Link to={href} className="font-medium text-fg hover:underline">
                            {it.name}
                          </Link>
                        ) : (
                          <p className="font-medium text-fg">{it.name}</p>
                        )}
                        <p className="font-mono text-ui-xs text-fg-subtle">{it.sku}</p>
                        {attrSummary(it.attributes) ? <p className="text-ui-xs text-fg-muted">{attrSummary(it.attributes)}</p> : null}
                        <div className="mt-1 flex flex-wrap gap-1">
                          {it.bulk ? <Badge tone="accent">Bulk</Badge> : null}
                          {it.fulfillmentMode ? <Badge tone="outline">{FULFILLMENT[it.fulfillmentMode] || it.fulfillmentMode}</Badge> : null}
                          {it.easyReturn ? <Badge tone="info">Returnable</Badge> : null}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="hidden px-3 py-3 font-mono text-ui-xs text-fg-muted sm:table-cell">{it.hsn || "—"}</td>
                  <td className="px-3 py-3 text-right tabular-nums">{it.qty}</td>
                  <td className="hidden px-3 py-3 text-right sm:table-cell">
                    <Money value={it.unitPrice} />
                    {it.listPrice && it.listPrice > it.unitPrice ? (
                      <span className="block text-ui-xs text-fg-subtle line-through">
                        <Money value={it.listPrice} />
                      </span>
                    ) : null}
                  </td>
                  <td className="hidden px-3 py-3 text-right text-fg-muted md:table-cell">
                    {it.taxRate != null ? `${it.taxRate}%` : "—"}
                    {it.tax != null ? (
                      <span className="block text-ui-xs">
                        <Money value={it.tax} />
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-3 text-right font-medium">
                    <Money value={it.lineTotal} />
                    {it.couponShare ? (
                      <span className="block text-ui-xs font-normal text-fg-subtle">
                        incl. −<Money value={it.couponShare} /> coupon
                      </span>
                    ) : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <CardBody className="border-t border-border">
        <OrderTotals order={order} />
      </CardBody>
    </Card>
  );
}

export function ReturnRequestCard({ order }) {
  const r = order?.returnRequest;
  if (!r?.status) return null;
  return (
    <Alert tone={RETURN_TONE[r.status] || "info"} title={RETURN_LABEL[r.status] || "Return"} icon={Undo2}>
      <dl className="mt-1 grid gap-1">
        <div>
          <dt className="inline font-medium">Reason: </dt>
          <dd className="inline">{r.reason || "—"}</dd>
        </div>
        {r.note ? (
          <div>
            <dt className="inline font-medium">Buyer note: </dt>
            <dd className="inline">“{r.note}”</dd>
          </div>
        ) : null}
        {r.decisionNote ? (
          <div>
            <dt className="inline font-medium">Store note: </dt>
            <dd className="inline">{r.decisionNote}</dd>
          </div>
        ) : null}
        <div className="flex flex-wrap gap-x-4 text-ui-xs opacity-90">
          {r.requestedAt ? (
            <span>
              Requested <DateTime value={r.requestedAt} />
            </span>
          ) : null}
          {r.decidedAt ? (
            <span>
              Decided <DateTime value={r.decidedAt} />
            </span>
          ) : null}
          {r.receivedAt ? (
            <span>
              Received <DateTime value={r.receivedAt} />
            </span>
          ) : null}
        </div>
      </dl>
    </Alert>
  );
}

/** Refund intents (Razorpay / ledger) with their status; failed ones are highlighted and can be retried (orders.refund). */
export function RefundsCard({ order, apiClient = defaultApi }) {
  const can = useCan();
  const canRetry = can("orders.refund");
  const [retrying, setRetrying] = useState(null);
  const retry = useApiMutation((r) => apiClient.retryRefund(order._id, r.key), {
    invalidate: [keys.orders.all, keys.ledger.all, keys.customers.all],
    error: false,
    onSuccess: (next, r) => {
      const after = (next?.refunds || []).find((x) => x.key === r.key);
      if (after?.status === "failed") toast.error("The refund failed again", { description: after.lastError || undefined });
      else toast.success(after?.status === "processed" ? "Refund processed" : "Refund sent again");
    },
  });
  const refunds = order?.refunds || [];
  if (!refunds.length) return null;
  return (
    <Card>
      <CardHeader title="Refunds" description="Refund intents created for this order and their provider status." />
      <ul className="divide-y divide-border">
        {refunds.map((r) => (
          <li key={r._id || r.key} className="grid gap-1 px-4 py-3 sm:px-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Money value={r.amount} className="font-medium" />
                <span className="text-ui-sm text-fg-muted">via {REFUND_PROVIDER[r.provider] || r.provider}</span>
              </div>
              <StatusPill status={r.status} label={r.status === "processed" ? "Processed" : undefined} />
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-ui-xs text-fg-subtle">
              {r.providerRefundId ? (
                <span>
                  Ref <Code copy>{r.providerRefundId}</Code>
                </span>
              ) : null}
              <span>Attempts: {r.attempts ?? 0}</span>
              {r.processedAt ? (
                <span>
                  Processed <DateTime value={r.processedAt} />
                </span>
              ) : r.createdAt ? (
                <span>
                  Created <DateTime value={r.createdAt} />
                </span>
              ) : null}
            </div>
            {r.status === "failed" ? (
              <div className="flex flex-wrap items-start justify-between gap-2 rounded-md bg-danger-soft px-2.5 py-1.5 text-ui-xs text-danger-fg" role="alert">
                <p className="flex min-w-0 flex-1 items-start gap-1.5">
                  <AlertTriangle aria-hidden className="mt-0.5 size-3.5 shrink-0" />
                  <span>
                    Refund failed{r.lastError ? `: ${r.lastError}` : ""}. Automatic retries have stopped; retry it once the cause is fixed.
                  </span>
                </p>
                {canRetry && r.key ? (
                  <Button size="xs" leftIcon={RotateCcw} onClick={() => setRetrying(r)}>
                    Retry refund
                  </Button>
                ) : null}
              </div>
            ) : null}
            {r.reason ? <p className="text-ui-xs text-fg-muted">Reason: {r.reason}</p> : null}
          </li>
        ))}
      </ul>
      <ConfirmDialog
        open={Boolean(retrying)}
        onOpenChange={(o) => !o && setRetrying(null)}
        title="Retry this refund?"
        description={retrying ? `${inr(retrying.amount)} is sent to ${REFUND_PROVIDER[retrying.provider] || retrying.provider} again with a fresh attempt counter. Last error: ${retrying.lastError || "not recorded"}.` : ""}
        confirmLabel="Retry refund"
        onConfirm={() => retry.mutateAsync(retrying)}
      />
    </Card>
  );
}

/** Shipments (forward / return / cancelled AWBs) with carrier events and live tracking. */
export function TrackingCard({ order, apiClient = defaultApi }) {
  const hasShipments = (order?.fulfillments || []).length > 0;
  const q = useQuery({
    queryKey: keys.orders.sub(order._id, "tracking"),
    queryFn: () => apiClient.getTracking(order._id),
    enabled: hasShipments,
    staleTime: 60_000,
  });
  const shipments = q.data?.shipments || (order.fulfillments || []).map((f) => ({ ...f, live: null }));
  return (
    <Card>
      <CardHeader title="Shipping & tracking" description={order.deliveryPartner?.name ? `Delivery partner: ${order.deliveryPartner.name}` : undefined} />
      <CardBody className="grid gap-4">
        {!hasShipments ? (
          <p className="text-ui-sm text-fg-muted">No shipment yet. A tracking number is recorded when the order is marked ready to ship or shipped.</p>
        ) : q.isPending ? (
          <SkeletonText lines={3} />
        ) : (
          shipments.map((s, i) => {
            const cancelled = Boolean(s.cancelledAt);
            const live = s.live;
            const events = [...(s.events || [])];
            return (
              <div key={`${s.trackingNumber}-${i}`} className={cn("grid gap-2 rounded-md border border-border p-3", cancelled && "opacity-70")}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <Truck aria-hidden className="size-4 text-fg-subtle" />
                    <Badge tone={s.kind === "return" ? "accent" : "info"}>{s.kind === "return" ? "Return pickup" : "Forward"}</Badge>
                    {cancelled ? <Badge tone="danger">Cancelled AWB</Badge> : null}
                    <span className="text-ui-sm font-medium text-fg">{s.carrier || "Carrier"}</span>
                    {s.trackingNumber ? <Code copy>{s.trackingNumber}</Code> : <span className="text-ui-xs text-fg-subtle">No AWB</span>}
                  </div>
                  {s.status ? <StatusPill status={String(s.status).toLowerCase().replace(/\s+/g, "_")} /> : null}
                </div>
                <div className="flex flex-wrap gap-x-4 text-ui-xs text-fg-subtle">
                  {s.shippedAt ? (
                    <span>
                      Shipped <DateTime value={s.shippedAt} />
                    </span>
                  ) : null}
                  {cancelled ? (
                    <span>
                      Cancelled <DateTime value={s.cancelledAt} />
                    </span>
                  ) : null}
                  {live?.status ? <span>Live status: {typeof live.status === "string" ? live.status : live.status?.Status || "—"}</span> : null}
                </div>
                {s.liveError ? <p className="text-ui-xs text-warning-fg">Live tracking unavailable: {s.liveError}</p> : null}
                {events.length ? (
                  <Timeline items={events.map((e) => ({ title: e.status || "Scan", at: e.at, description: [e.location, e.note].filter(Boolean).join(" · "), tone: "info" }))} />
                ) : (
                  <p className="text-ui-xs text-fg-subtle">No carrier scans yet.</p>
                )}
              </div>
            );
          })
        )}
        {q.error ? <p className="text-ui-xs text-warning-fg">Couldn’t refresh tracking: {q.error.message}</p> : null}
      </CardBody>
    </Card>
  );
}

/** Invoice (view in panel, PDF) and credit notes. */
export function DocumentsCard({ order, apiClient = defaultApi, invoiceHref }) {
  const invoiceable = INVOICEABLE_STATUSES.includes(order.status) || Boolean(order.invoiceNumber);
  const creditNotes = useQuery({
    queryKey: keys.orders.sub(order._id, "credit-notes"),
    queryFn: () => apiClient.getCreditNotes(order._id),
    enabled: invoiceable,
    staleTime: 60_000,
  });
  const [downloading, setDownloading] = useState(false);
  const [dlError, setDlError] = useState("");
  const notes = Array.isArray(creditNotes.data) ? creditNotes.data : [];

  async function download() {
    setDownloading(true);
    setDlError("");
    try {
      await apiClient.downloadInvoicePdf(order._id, `${order.invoiceNumber || order.orderNumber}.pdf`);
    } catch (err) {
      setDlError(err?.message || "Download failed");
    } finally {
      setDownloading(false);
    }
  }

  return (
    <Card>
      <CardHeader title="Documents" />
      <CardBody className="grid gap-3">
        {invoiceable ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Receipt aria-hidden className="size-4 text-fg-subtle" />
              <div>
                <p className="text-ui-sm font-medium text-fg">Tax invoice</p>
                <p className="text-ui-xs text-fg-subtle">{order.invoiceNumber || "Issued on confirmation"}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {invoiceHref ? (
                <Button size="xs" to={invoiceHref} leftIcon={FileText}>
                  View
                </Button>
              ) : null}
              <Button size="xs" leftIcon={Download} loading={downloading} onClick={download}>
                PDF
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-ui-sm text-fg-muted">The GST invoice is issued when the order is confirmed.</p>
        )}
        {dlError ? <p className="text-ui-xs text-danger-fg" role="alert">{dlError}</p> : null}
        {creditNotes.isPending && invoiceable ? <SkeletonText lines={1} /> : null}
        {notes.length ? (
          <ul className="grid gap-2 border-t border-border pt-3">
            {notes.map((cn_) => (
              <li key={cn_._id} className="flex flex-wrap items-center justify-between gap-2 text-ui-sm">
                <div>
                  <p className="font-medium text-fg">Credit note {cn_.creditNoteNumber}</p>
                  <p className="text-ui-xs text-fg-subtle">
                    <DateTime value={cn_.issuedAt} format="date" /> · against {cn_.invoiceNumber}
                    {cn_.reason ? ` · ${cn_.reason}` : ""}
                  </p>
                </div>
                <Money value={cn_.totals?.grandTotal} className="font-medium" />
              </li>
            ))}
          </ul>
        ) : null}
        {creditNotes.error && creditNotes.error.status !== 404 ? <p className="text-ui-xs text-warning-fg">Credit notes unavailable: {creditNotes.error.message}</p> : null}
      </CardBody>
    </Card>
  );
}

export function OrderSummaryCard({ order, showTenant }) {
  const online = isOnlinePayment(order);
  return (
    <Card padded>
      <DescriptionList
        items={[
          showTenant ? { label: "Store", value: order.tenantId?.name } : null,
          { label: "Status", value: <StatusPill status={order.status} /> },
          {
            label: "Payment",
            value: (
              <span className="inline-flex flex-wrap items-center gap-1.5">
                <StatusPill status={order.paymentStatus} domain="payment" />
                <span className="text-fg-muted">{paymentLabel(order.paymentMethod)}</span>
              </span>
            ),
          },
          order.paidAt ? { label: "Paid", value: <DateTime value={order.paidAt} /> } : null,
          online && order.razorpayPaymentId ? { label: "Razorpay payment", value: <Code copy>{order.razorpayPaymentId}</Code> } : null,
          order.poNumber ? { label: "PO number", value: <Code copy>{order.poNumber}</Code> } : null,
          { label: "Placed", value: <DateTime value={order.createdAt} /> },
          order.etaFrom ? { label: "Estimated delivery", value: formatEta(order.etaFrom, order.etaTo) } : null,
          order.deliveredAt ? { label: "Delivered", value: <DateTime value={order.deliveredAt} /> } : null,
          order.returnUntil
            ? {
                label: "Return window",
                value: (
                  <span>
                    until <DateTime value={order.returnUntil} /> <span className="text-fg-subtle">({order.returnWindowDays} days)</span>
                  </span>
                ),
              }
            : null,
          order.couponCode ? { label: "Coupon", value: <Code>{order.couponCode}</Code> } : null,
        ]}
      />
    </Card>
  );
}

export function CustomerCard({ order, customerHref }) {
  const b = order.buyerSnapshot || {};
  const buyer = order.buyerId && typeof order.buyerId === "object" ? order.buyerId : {};
  const a = order.addressSnapshot || {};
  const href = customerHref?.(buyer._id || order.buyerId);
  return (
    <Card>
      <CardHeader title="Customer" actions={href ? <Button size="xs" variant="ghost" to={href} rightIcon={ExternalLink}>Profile</Button> : null} />
      <CardBody className="grid gap-4 text-ui-sm">
        <div className="flex items-start gap-2">
          <User aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <div className="min-w-0">
            <p className="font-medium text-fg">{b.name || buyer.name || "Buyer"}</p>
            {b.company ? <p className="text-fg-muted">{b.company}</p> : null}
            {b.email || buyer.email ? <a href={`mailto:${b.email || buyer.email}`} className="block truncate text-primary-soft-fg hover:underline">{b.email || buyer.email}</a> : null}
            {b.phone || buyer.phone ? <a href={`tel:${b.phone || buyer.phone}`} className="block text-fg-muted hover:underline">{b.phone || buyer.phone}</a> : null}
            <p className="text-ui-xs text-fg-subtle">GSTIN: {b.gstin || "Unregistered"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <MapPin aria-hidden className="mt-0.5 size-4 shrink-0 text-fg-subtle" />
          <address className="not-italic text-fg-muted">
            {a.contactName ? <span className="block font-medium text-fg">{a.contactName}</span> : null}
            {[a.addressLine1, a.addressLine2, a.landmark].filter(Boolean).join(", ")}
            <span className="block">{[a.city, a.state, a.postalCode].filter(Boolean).join(", ")}</span>
            {a.phone ? <span className="block">{a.phone}</span> : null}
          </address>
        </div>
        {order.buyerNotes ? (
          <KeyValue label="Buyer notes" value={<span className="whitespace-pre-line">{order.buyerNotes}</span>} />
        ) : null}
      </CardBody>
    </Card>
  );
}

/** Internal seller notes (orders.update). */
export function SellerNotesCard({ order, apiClient = defaultApi }) {
  const can = useCan();
  const editable = can("orders.update");
  const [value, setValue] = useState(order.sellerNotes || "");
  const [base, setBase] = useState(order.sellerNotes || "");
  if ((order.sellerNotes || "") !== base && value === base) {
    // Server copy changed (refetch) and the user has no local edits: follow it.
    setBase(order.sellerNotes || "");
    setValue(order.sellerNotes || "");
  }
  const dirty = value !== base;
  const save = useApiMutation((sellerNotes) => apiClient.updateOrder(order._id, { sellerNotes }), {
    invalidate: [keys.orders.detail(order._id)],
    success: "Notes saved",
    onSuccess: (res) => {
      setBase(res?.sellerNotes ?? value);
      setValue(res?.sellerNotes ?? value);
    },
  });
  const blocker = useUnsavedChangesGuard(dirty && !save.isPending);
  return (
    <Card>
      <CardHeader title="Internal notes" description="Visible to your team only." />
      <CardBody>
        <form
          className="grid gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (dirty) save.mutate(value);
          }}
        >
          <label htmlFor={`notes-${order._id}`} className="sr-only">
            Internal notes
          </label>
          <Textarea id={`notes-${order._id}`} rows={3} maxLength={2000} value={value} disabled={!editable} onChange={(e) => setValue(e.target.value)} placeholder={editable ? "Packing instructions, follow-ups…" : "No notes"} />
          {editable ? (
            <div className="flex items-center justify-between gap-2">
              <span className="text-ui-xs text-fg-subtle">{value.length}/2000</span>
              <div className="flex gap-2">
                {dirty ? (
                  <Button size="xs" variant="ghost" onClick={() => setValue(base)}>
                    Discard
                  </Button>
                ) : null}
                <Button size="xs" type="submit" variant="primary" disabled={!dirty} loading={save.isPending}>
                  Save notes
                </Button>
              </div>
            </div>
          ) : null}
        </form>
      </CardBody>
      <UnsavedChangesDialog blocker={blocker} />
    </Card>
  );
}

export function OrderTimeline({ order }) {
  const history = order?.statusHistory || [];
  return (
    <Card>
      <CardHeader title="Timeline" />
      <CardBody>
        <Timeline items={history.map((h) => ({ status: h.status, at: h.at, note: h.note }))} />
      </CardBody>
    </Card>
  );
}

/**
 * Full order detail body (both panels). The page renders the PageHeader + <OrderActions>.
 *
 *   <OrderDetail order={order}
 *     invoiceHref={`/tenant/orders/${order._id}/invoice`}
 *     customerHref={(buyerId) => `/tenant/customers/${buyerId}`}
 *     productHref={(item) => `/tenant/products/${item.productId}`}
 *     apiClient={api}            // super admin: api.withTenant(order.tenantId._id)
 *     showTenant />              // super admin: show the store
 */
export default function OrderDetail({ order, apiClient = defaultApi, invoiceHref, customerHref, productHref, showTenant = false }) {
  if (!order) return <EmptyState title="Order not found" />;
  const failed = (order.refunds || []).filter((r) => r.status === "failed");
  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        {needsPayment(order) && order.status === "pending" ? (
          <Alert tone="warning" title="Awaiting online payment">
            This {paymentLabel(order.paymentMethod)} order can’t be confirmed until the payment is captured. Unpaid orders are cancelled automatically after the payment window.
          </Alert>
        ) : null}
        {failed.length ? (
          <Alert tone="danger" title={`${failed.length} refund${failed.length === 1 ? "" : "s"} failed`}>
            {failed.map((r) => (
              <span key={r._id || r.key} className="block">
                <Money value={r.amount} /> via {REFUND_PROVIDER[r.provider] || r.provider}
                {r.lastError ? ` — ${r.lastError}` : ""}
              </span>
            ))}
            <span className="mt-1 block text-ui-xs">See Refunds below to retry.</span>
          </Alert>
        ) : null}
        <ReturnRequestCard order={order} />
        <OrderItemsCard order={order} productHref={productHref} />
        <RefundsCard order={order} apiClient={apiClient} />
        <TrackingCard order={order} apiClient={apiClient} />
        <OrderTimeline order={order} />
      </div>
      <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-6">
        <OrderSummaryCard order={order} showTenant={showTenant} />
        <CustomerCard order={order} customerHref={customerHref} />
        <DocumentsCard order={order} apiClient={apiClient} invoiceHref={invoiceHref} />
        <SellerNotesCard order={order} apiClient={apiClient} />
      </div>
    </div>
  );
}

/** @deprecated Legacy name used by older pages; renders <OrderDetail order={detail} />. Return actions now live in <OrderActions>. */
export function OrderDetailPanel({ detail }) {
  return <OrderDetail order={detail} />;
}
