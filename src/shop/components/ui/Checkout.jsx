import { CheckCircle2, CreditCard, FileText, Landmark, Smartphone, Wallet } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./Button.jsx";
import { formatExact } from "../../lib/money.js";
import { formatDate } from "../../../shared/lib/format.js";

/**
 * One step of the checkout accordion. Collapsed + done → a one-line summary with "Change".
 *
 *   <CheckoutStep index={1} title="Delivery address" status={step === 1 ? "current" : addr ? "done" : "upcoming"}
 *                 summary={addr && <AddressCard address={addr} compact />} onEdit={() => setStep(1)}>
 *     …form…
 *   </CheckoutStep>
 *
 * status: "current" | "done" | "upcoming". The heading gets focus when the step opens (`autoFocus`).
 */
export function CheckoutStep({ index, title, status = "upcoming", summary, onEdit, children, className, id }) {
  const open = status === "current";
  const headingId = id ? `${id}-title` : undefined;
  return (
    <section id={id} aria-labelledby={headingId} className={cn("overflow-hidden rounded-[1.25rem] border bg-shop-card transition-shadow", open ? "border-shop-primary shadow-[0_18px_40px_-30px_rgba(11,16,51,0.45)]" : "border-shop-line", className)}>
      <div className="flex items-start gap-3 px-4 py-4 sm:px-5">
        <span
          aria-hidden
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full text-shop-sm font-bold",
            status === "done" ? "bg-shop-primary text-white" : open ? "bg-shop-navy text-white" : "bg-shop-well text-shop-muted"
          )}
        >
          {status === "done" ? <CheckCircle2 className="size-4" /> : index}
        </span>
        <div className="min-w-0 flex-1">
          <h2 id={headingId} tabIndex={-1} className={cn("font-display text-shop-md font-bold outline-none", status === "upcoming" ? "text-shop-muted" : "text-shop-ink")}>
            <span className="sr-only">Step {index}: </span>
            {title}
            {status === "done" ? <span className="sr-only"> (completed)</span> : null}
          </h2>
          {status === "done" && summary ? <div className="mt-1.5 text-shop-sm text-shop-text">{summary}</div> : null}
        </div>
        {status === "done" && onEdit ? (
          <Button variant="link" size="sm" onClick={onEdit} aria-label={`Change ${title}`}>
            Change
          </Button>
        ) : null}
      </div>
      {open ? <div className="border-t border-shop-line px-4 py-4 sm:px-5">{children}</div> : null}
    </section>
  );
}

const METHOD_ICONS = { upi: Smartphone, card: CreditCard, netbanking: Landmark, cod: Wallet, purchase_order: FileText, credit_terms: FileText };
const METHOD_HELP = {
  upi: "Pay now with any UPI app",
  card: "Credit or debit card",
  netbanking: "All major banks",
  cod: "Pay cash or UPI when it arrives",
  purchase_order: "Order against your PO; pay on your credit terms",
  credit_terms: "Use your credit line with this seller",
};
/** Payment groups for the checkout payment step. */
export const PAYMENT_GROUPS = [
  { id: "now", title: "Pay now", methods: ["upi", "card", "netbanking"] },
  { id: "delivery", title: "Pay on delivery", methods: ["cod"] },
  { id: "terms", title: "Business terms", methods: ["credit_terms", "purchase_order"] },
];

/**
 * One payment method as a radio card. `option` is a row of GET /checkout/payment-options `methods`
 * ({ method, label, enabled, reason, code, requiresPoNumber }). Disabled methods stay visible with
 * the server's reason.
 */
export function PaymentOption({ option, checked, onSelect, name = "payment", children }) {
  const Icon = METHOD_ICONS[option.method] || Wallet;
  const id = `pay-${option.method}`;
  return (
    <div className={cn("rounded-card border", checked ? "border-shop-primary bg-shop-primary-soft/40" : "border-shop-line", !option.enabled && "bg-shop-well/60")}>
      <label htmlFor={id} className={cn("flex min-h-14 items-start gap-3 px-4 py-3", option.enabled ? "cursor-pointer" : "cursor-not-allowed")}>
        <input id={id} type="radio" name={name} value={option.method} checked={checked} disabled={!option.enabled} onChange={() => onSelect?.(option.method)} className="mt-1 size-5 accent-[var(--shop-primary)]" aria-describedby={`${id}-desc`} />
        <Icon className={cn("mt-0.5 size-5 shrink-0", option.enabled ? "text-shop-ink" : "text-shop-subtle")} strokeWidth={1.75} aria-hidden />
        <span className="min-w-0">
          <span className={cn("block text-shop-base font-semibold", option.enabled ? "text-shop-ink" : "text-shop-muted")}>{option.label}</span>
          <span id={`${id}-desc`} className={cn("block text-shop-xs", option.enabled ? "text-shop-muted" : "text-shop-danger-ink")}>
            {option.enabled ? METHOD_HELP[option.method] || "" : option.reason || "Not available for this order"}
          </span>
        </span>
      </label>
      {checked && children ? <div className="border-t border-shop-line px-4 py-3">{children}</div> : null}
    </div>
  );
}

/**
 * Credit / PO terms for one store (payment-options `groups[].credit`, or ledger/me `stores[]`):
 * available credit, limit, outstanding, advance, payment days, and the due date for this order.
 */
export function CreditTermsPanel({ credit, storeName, orderTotal, className }) {
  if (!credit) return null;
  const due = credit.paymentDays ? new Date(Date.now() + credit.paymentDays * 86_400_000) : null;
  const short = orderTotal != null && credit.spendable != null && Number(orderTotal) > Number(credit.spendable);
  const rows = [
    ["Available to spend", credit.spendable, true],
    ["Credit limit", credit.creditLimit],
    ["Outstanding", credit.outstanding],
    ...(credit.advance ? [["Advance with seller", credit.advance]] : []),
  ];
  return (
    <div className={cn("rounded-card border border-shop-line bg-shop-gold-soft/60 p-3", className)}>
      {storeName ? <p className="mb-2 text-shop-xs font-semibold text-shop-gold-ink">{storeName}</p> : null}
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-shop-sm sm:grid-cols-4">
        {rows.map(([label, value, strong]) => (
          <div key={label}>
            <dt className="text-shop-xs text-shop-muted">{label}</dt>
            <dd className={cn("tabular-nums", strong ? "font-bold text-shop-ink" : "text-shop-text")}>{formatExact(value)}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-2 text-shop-xs text-shop-muted">
        {credit.paymentDays ? `Pay within ${credit.paymentDays} days${due ? ` (by ${formatDate(due)})` : ""}.` : "Payment terms as agreed with the seller."}
        {short ? <span className="font-semibold text-shop-danger-ink"> This order is more than your available credit.</span> : null}
      </p>
    </div>
  );
}
