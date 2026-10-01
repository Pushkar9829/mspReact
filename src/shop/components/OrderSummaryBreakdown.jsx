import { inr2 } from "../../shared/lib/format.js";
import { orderBreakdown } from "../lib/orderBreakdown.js";

function packs(n) {
  return `${n} ${n === 1 ? "pack" : "packs"}`;
}

function Row({ label, value, tone = "default", sub = false, strong = false }) {
  const valueTone =
    tone === "success" ? "text-msr-success" : tone === "muted" ? "text-msr-muted" : "text-msr-ink";
  return (
    <div className={`flex items-center justify-between gap-4 ${sub ? "pl-3 text-[12px]" : "text-[13px]"}`}>
      <dt className={`min-w-0 ${sub ? "text-msr-subtle" : strong ? "font-semibold text-msr-ink" : "text-msr-muted"}`}>
        {sub ? <span className="mr-1 text-msr-line-strong">└</span> : null}
        {label}
      </dt>
      <dd className={`shrink-0 ${strong ? "font-bold" : "font-semibold"} ${valueTone}`}>{value}</dd>
    </div>
  );
}

/**
 * Order summary rows: MRP → product discount → bulk slab saving → item total (regular / bulk),
 * then coupon and each fee on its own row.
 */
export function SummaryRows({
  items,
  couponCode = "",
  couponDiscount = 0,
  delivery,
  deliveryTone = "default",
  platformFee = 0,
  partnerFee = 0,
  partnerLabel = "Partner charge",
}) {
  const b = orderBreakdown(items);
  const both = b.regular.lines > 0 && b.bulk.lines > 0;
  return (
    <dl className="space-y-2.5">
      <Row label={`MRP total (${packs(b.regular.units + b.bulk.units)})`} value={inr2(b.mrp)} />
      {b.productDiscount > 0 ? <Row label="Product discount" value={`− ${inr2(b.productDiscount)}`} tone="success" /> : null}
      {b.slabSaving > 0 ? <Row label="Bulk slab savings" value={`− ${inr2(b.slabSaving)}`} tone="success" /> : null}
      <Row label="Item total" value={inr2(b.subtotal)} strong />
      {both || b.bulk.lines ? (
        <>
          {b.regular.lines ? <Row sub label={`Regular items (${packs(b.regular.units)})`} value={inr2(b.regular.amount)} /> : null}
          {b.bulk.lines ? <Row sub label={`Bulk items (${packs(b.bulk.units)})`} value={inr2(b.bulk.amount)} /> : null}
        </>
      ) : null}
      {couponDiscount > 0 ? (
        <Row label={`Coupon${couponCode ? ` (${couponCode})` : ""}`} value={`− ${inr2(couponDiscount)}`} tone="success" />
      ) : null}
      <Row label="Delivery" value={delivery} tone={deliveryTone} />
      {platformFee > 0 ? <Row label="Platform fee" value={inr2(platformFee)} /> : null}
      {partnerFee > 0 ? <Row label={partnerLabel} value={inr2(partnerFee)} /> : null}
    </dl>
  );
}

/** GST already included in the item prices, split by rate (after coupon). */
export function GstBreakup({ items, className = "" }) {
  const b = orderBreakdown(items);
  if (!b.tax) return null;
  return (
    <div className={`rounded-lg bg-msr-surface px-3 py-2.5 ${className}`}>
      <p className="text-[10.5px] font-bold uppercase tracking-wide text-msr-subtle">GST breakup · included in prices</p>
      <dl className="mt-1.5 space-y-1 text-[12px]">
        {b.gstRows.map((row) => (
          <div key={row.rate} className="flex items-center justify-between gap-3">
            <dt className="text-msr-muted">
              {row.rate ? `GST ${row.rate}%` : "Exempt"} on {inr2(row.taxableValue)}
            </dt>
            <dd className="font-semibold text-msr-ink">{inr2(row.tax)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-3 border-t border-msr-line pt-1">
          <dt className="text-msr-muted">Taxable value + GST</dt>
          <dd className="font-semibold text-msr-ink">
            {inr2(b.taxableValue)} + {inr2(b.tax)}
          </dd>
        </div>
      </dl>
    </div>
  );
}
