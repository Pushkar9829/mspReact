/**
 * Shared bits for the Help and Legal pages: placeholder-aware legal facts, the FAQ accordion and
 * the refund/payment policy copy, which mirrors what the backend actually does
 * (mspNode orders/lifecycle.js refundOrder / cancelOrder):
 *   - paid online (UPI, card, net banking via Razorpay) → refunded to the original method via Razorpay;
 *   - purchase order, credit terms and cash on delivery → credited to the buyer's ledger with that seller;
 *   - a credit note is issued for every refund.
 */
import { ChevronDown } from "lucide-react";
import { cn } from "../../components/ui/index.js";
import { isPlaceholder } from "../../config/legal.js";

/** A legal / contact value. Placeholders from config/legal.js are outlined in dev so they can't ship unnoticed. */
export function Fact({ value, className, as: Tag = "span" }) {
  if (!value) return null;
  const todo = isPlaceholder(value);
  return <Tag className={cn(className, todo && import.meta.env.DEV && "rounded-sm outline outline-1 outline-dashed outline-shop-gold")}>{value}</Tag>;
}

/** Accessible accordion built on <details> (keyboard and screen-reader friendly without script). */
export function FaqList({ items, className }) {
  if (!items?.length) return null;
  return (
    <div className={cn("divide-y divide-shop-line overflow-hidden rounded-card border border-shop-line bg-shop-card", className)}>
      {items.map((item, i) => (
        <details key={`${item.q}-${i}`} className="group" id={item.id}>
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-shop-base font-semibold text-shop-ink hover:bg-shop-hover [&::-webkit-details-marker]:hidden">
            {item.q}
            <ChevronDown className="size-5 shrink-0 text-shop-muted transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <div className="px-4 pb-4 text-shop-base leading-relaxed text-shop-text">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

/** Refund rules, one row per payment type. */
export function RefundPolicy({ returnWindowDays, returnsEnabled }) {
  return (
    <div className="grid gap-3 text-shop-base leading-relaxed text-shop-text">
      {returnsEnabled !== false ? (
        <p>
          Products marked <strong>Easy return</strong> can be returned
          {Number(returnWindowDays) > 0 ? ` within ${returnWindowDays} days of delivery` : " within the return window shown on the order"}. Request it from the order page. The seller reviews the request; once it is approved and the items are back with the seller, the refund is issued.
        </p>
      ) : (
        <p>Returns are not open on the marketplace right now. Cancelled orders are refunded as below.</p>
      )}
      <p>Cancelling an order before it ships also refunds anything you paid. How the money comes back depends on how you paid:</p>
      <div className="overflow-hidden rounded-card border border-shop-line">
        <table className="w-full text-left text-shop-sm">
          <caption className="sr-only">Refund method by payment type</caption>
          <thead className="bg-shop-well text-shop-ink">
            <tr>
              <th scope="col" className="px-3 py-2 font-semibold">
                You paid with
              </th>
              <th scope="col" className="px-3 py-2 font-semibold">
                Refund goes to
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-shop-line bg-shop-card">
            <tr>
              <th scope="row" className="px-3 py-2 align-top font-medium text-shop-ink">
                UPI, card or net banking (online)
              </th>
              <td className="px-3 py-2">The original payment method, through Razorpay. Your bank may take a few working days to show it.</td>
            </tr>
            <tr>
              <th scope="row" className="px-3 py-2 align-top font-medium text-shop-ink">
                Purchase order or credit terms
              </th>
              <td className="px-3 py-2">A credit on your account (ledger) with that seller, which reduces what you owe or adds to your available balance. No bank transfer is made.</td>
            </tr>
            <tr>
              <th scope="row" className="px-3 py-2 align-top font-medium text-shop-ink">
                Cash on delivery
              </th>
              <td className="px-3 py-2">A credit on your account (ledger) with that seller, usable on your next orders.</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p className="text-shop-sm text-shop-muted">Every refund comes with a GST credit note from the seller. You can see ledger credits under My account.</p>
    </div>
  );
}
