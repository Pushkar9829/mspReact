/**
 * /bulk — how wholesale buying works (slabs, MOQ / pack multiples, credit terms) with a worked
 * example from a real product, the buyer's own credit status, and the bulk-eligible listing
 * (server search, bulkEligible=true; cards add at the bulk quantity).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Boxes, CalendarClock, FileText, Info, Layers, Wallet } from "lucide-react";
import { useLedger, useProducts, useViewer } from "../hooks/index.js";
import { Money, ShopSheet, Skeleton, SlabTable } from "../components/ui/index.js";
import { ProductListing } from "./discovery/ProductListing.jsx";

const FIXED = { bulk: true };
const EXAMPLE_QUERY = { bulk: true };

function Step({ icon: Icon, title, children }) {
  return (
    <li className="flex gap-3 rounded-card border border-shop-line bg-shop-card p-4">
      <span className="grid size-10 shrink-0 place-items-center rounded-full bg-shop-gold-soft text-shop-gold-ink">
        <Icon className="size-5" strokeWidth={1.75} aria-hidden />
      </span>
      <div className="min-w-0 text-shop-sm text-shop-text">
        <h3 className="text-shop-base font-semibold text-shop-ink">{title}</h3>
        <div className="mt-1 grid gap-1.5">{children}</div>
      </div>
    </li>
  );
}

/** A real bulk-eligible product's slabs as the worked example. */
function SlabExample() {
  const q = useProducts(EXAMPLE_QUERY, { limit: 1 });
  const p = q.products[0];
  const v = p?.defaultVariant;
  if (q.isPending) return <Skeleton className="h-48 w-full rounded-card" />;
  if (!p || !v?.slabs?.length) return null;
  const rules = v.rules || p.rules || {};
  const step = rules.bulk?.step || p.wholesale.packMultiple;
  return (
    <figure className="grid content-start gap-2">
      <SlabTable slabs={v.slabs} pack={v.pack} basePrice={v.price} caption="Example: bulk prices" />
      <figcaption className="text-shop-xs text-shop-muted">
        <Link to={`/product/${p.slug}`} className="font-semibold text-shop-primary-ink hover:underline">
          {p.name} · {v.pack}
        </Link>
        {rules.bulkFrom ? ` — bulk prices from ${rules.bulkFrom} packs${step > 1 ? `, then in steps of ${step}` : ""}.` : null}
      </figcaption>
    </figure>
  );
}

function CreditStatus() {
  const { signedIn } = useViewer();
  const ledger = useLedger();
  if (!signedIn)
    return (
      <p>
        <Link to="/register" className="font-semibold text-shop-primary-ink hover:underline">
          Register your business
        </Link>{" "}
        or{" "}
        <Link to="/login" state={{ from: "/bulk" }} className="font-semibold text-shop-primary-ink hover:underline">
          sign in
        </Link>{" "}
        to see whether a seller has enabled terms for you.
      </p>
    );
  if (ledger.isPending) return <Skeleton className="h-10 w-full" />;
  const stores = (ledger.data?.stores || []).filter((s) => s.creditEnabled || s.purchaseOrderEnabled);
  if (!stores.length) return <p>No seller has enabled credit terms for your account yet. Ask your seller to set them up after your first orders.</p>;
  return (
    <ul className="grid gap-1.5">
      {stores.map((s) => (
        <li key={s.tenantId} className="rounded-well bg-shop-gold-soft px-3 py-2 text-shop-gold-ink">
          <span className="font-semibold">{s.store?.name || "Seller"}</span>:{" "}
          {[s.creditEnabled ? "credit terms" : "", s.purchaseOrderEnabled ? "purchase orders" : ""].filter(Boolean).join(" and ")}
          {s.paymentDays ? `, pay within ${s.paymentDays} days` : ""}. Available now <Money value={s.spendable} mode="listing" className="font-semibold" />
        </li>
      ))}
    </ul>
  );
}

/** Full explanation — opened on demand so the products come first. */
function HowItWorks({ open, onOpenChange }) {
  return (
    <ShopSheet open={open} onOpenChange={onOpenChange} title="How bulk buying works" side="auto" size="lg">
      <div className="grid gap-4">
        <SlabExample />
        <ol className="grid gap-3">
          <Step icon={Layers} title="Slab prices drop as you buy more">
            <p>Bulk-eligible products have price slabs. Your cart picks the slab from the quantity automatically — add more and every pack in the line gets the lower price.</p>
          </Step>
          <Step icon={Boxes} title="Minimum quantity and pack multiples">
            <p>Below the bulk quantity you can buy any number of packs at the regular price. From the bulk quantity, quantities go in steps of the case size, up to the seller’s per-order maximum. Steppers snap to these rules for you.</p>
          </Step>
          <Step icon={CalendarClock} title="Lead time">
            <p>Some sellers need extra days to pack bulk lines. Any lead time is added to the delivery estimate for your PIN code.</p>
          </Step>
          <Step icon={Wallet} title="Credit terms and purchase orders">
            <p>Sellers can approve your business for credit terms or purchase orders: order now, pay within the agreed days. Only methods you’re approved for can be selected at checkout.</p>
            <CreditStatus />
          </Step>
          <Step icon={FileText} title="GST invoices">
            <p>Every order gets a GST invoice from the seller. Add your GSTIN at checkout to claim input tax credit.</p>
          </Step>
        </ol>
      </div>
    </ShopSheet>
  );
}

const PERKS = [
  { icon: Layers, title: "Slab prices", text: "Lower price as qty grows" },
  { icon: Boxes, title: "Case packs", text: "Steppers snap to the case" },
  { icon: Wallet, title: "Credit & POs", text: "For approved businesses" },
  { icon: FileText, title: "GST invoice", text: "Input tax credit" },
];

/** Compact strip above the products: four perks, credit status and a link to the full explanation. */
function BulkIntro() {
  const [open, setOpen] = useState(false);
  return (
    <section aria-label="Why buy in bulk" className="grid gap-3 rounded-[1.1rem] border border-shop-gold/40 bg-shop-gold-soft/60 p-3 sm:p-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
      <ul className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {PERKS.map((p) => (
          <li key={p.title} className="flex items-center gap-2.5 rounded-xl bg-shop-card/80 px-3 py-2 ring-1 ring-shop-gold/25">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-shop-gold-soft text-shop-gold-ink">
              <p.icon className="size-4" strokeWidth={1.9} aria-hidden />
            </span>
            <span className="min-w-0 leading-tight">
              <span className="block truncate text-shop-sm font-semibold text-shop-ink">{p.title}</span>
              <span className="block text-shop-xs text-shop-muted">{p.text}</span>
            </span>
          </li>
        ))}
      </ul>
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => setOpen(true)} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-shop-ink px-4 text-shop-sm font-semibold text-white hover:bg-shop-navy-2 pointer-coarse:h-11">
          <Info className="size-4" aria-hidden /> How bulk buying works
        </button>
        <CreditPill />
      </div>
      <HowItWorks open={open} onOpenChange={setOpen} />
    </section>
  );
}

/** One-line credit status for the strip. */
function CreditPill() {
  const { signedIn } = useViewer();
  const ledger = useLedger();
  if (!signedIn)
    return (
      <Link to="/login" state={{ from: "/bulk" }} className="inline-flex h-10 items-center rounded-full px-3 text-shop-sm font-semibold text-shop-gold-ink hover:bg-shop-gold-soft pointer-coarse:h-11">
        Sign in for business prices
      </Link>
    );
  if (ledger.isPending) return <Skeleton className="h-8 w-40 rounded-full" />;
  const stores = (ledger.data?.stores || []).filter((s) => s.creditEnabled || s.purchaseOrderEnabled);
  if (!stores.length) return null;
  const spendable = stores.reduce((n, s) => n + (Number(s.spendable) || 0), 0);
  return (
    <Link to="/account/credit" className="inline-flex h-10 items-center gap-1.5 rounded-full bg-shop-card px-3.5 text-shop-sm text-shop-ink ring-1 ring-shop-gold/40 hover:ring-shop-gold pointer-coarse:h-11">
      <Wallet className="size-4 text-shop-gold-ink" aria-hidden /> Credit available <Money value={spendable} mode="listing" className="font-semibold" />
    </Link>
  );
}

export default function BulkBuy() {
  return (
    <ProductListing
      fixed={FIXED}
      hide={["bulk", "category"]}
      bulkCards
      title="Bulk & case-pack buying"
      documentTitle="Bulk buying"
      description="Case-pack quantities with slab prices, GST invoices and credit terms for approved businesses."
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Bulk buying" }]}
      intro={<BulkIntro />}
      emptyTitle="No bulk-priced products right now"
    />
  );
}
