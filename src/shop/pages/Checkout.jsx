/**
 * /checkout — stepped accordion: Address → Delivery → Payment → Review. Each finished step
 * collapses to a summary with "Change".
 *
 * - Money is the server preview only (POST /checkout/preview): per store group productTax, feeTax,
 *   fees, grandTotal. expectedGrandTotal = the preview total on screen (useCheckout).
 * - Payment methods from GET /checkout/payment-options, grouped Pay now / Pay on delivery /
 *   Business terms; disabled methods keep the server reason; credit figures per store.
 * - Place order via useCheckout().place (idempotency key in sessionStorage, own busy guard,
 *   Razorpay: dismiss / failure / verify retry / polling / resume when razorpay is null).
 * - Field errors (ApiError.fields + client checks) are shown inline, focused and scrolled into view.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowLeft, ArrowRight, Building2, ChevronDown, Lock, MailWarning, MapPin, Plus, ShieldCheck, ShoppingCart, Store, Truck } from "lucide-react";
import {
  AddressCard,
  Button,
  Card,
  Checkbox,
  CheckoutStep,
  CreditTermsPanel,
  EmptyState,
  Field,
  ImageWithFallback,
  Input,
  Notice,
  PAYMENT_GROUPS,
  PaymentOption,
  RowSkeleton,
  ShopPageHeader,
  Skeleton,
  Textarea,
  toast,
} from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { Money } from "../components/ui/Price.jsx";
import { useAddresses, useCartActions, useCheckout, usePublicSettings, usePublicStore, useViewer } from "../hooks/index.js";
import { AddressSheet, MAX_ADDRESSES } from "../components/buying/AddressSheet.jsx";
import { TotalsList, refundPolicyText } from "../components/buying/orderUi.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { api } from "../../shared/api/index.js";
import { formatEta } from "../../shared/lib/format.js";
import { formatListing } from "../lib/money.js";
import { displayName } from "../lib/text.js";
import { CheckoutProgress } from "../components/buying/CheckoutProgress.jsx";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { gstinError } from "../lib/indianAddress.js";

const STEPS = ["address", "delivery", "payment", "review"];
const STEP_TITLES = { address: "Delivery address", delivery: "Delivery options", payment: "Payment", review: "Review and place order" };
const ONLINE = new Set(["upi", "card", "netbanking"]);
const TERMS = new Set(["purchase_order", "credit_terms"]);
const CHANGED_CODES = new Set(["PRICE_CHANGED", "CART_CHANGED", "TOTAL_MISMATCH", "GRAND_TOTAL_MISMATCH", "INSUFFICIENT_STOCK", "CART_CONFLICT"]);

function focusField(name) {
  requestAnimationFrame(() => {
    const el = document.querySelector(`[data-checkout-field="${name}"] input, [data-checkout-field="${name}"] textarea, [name="${name}"]`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  });
}

/* ------------------------------------------------------------------ email verification */

function VerifyEmailNotice({ user, reloadUser, compact = false }) {
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  async function resend() {
    setBusy(true);
    try {
      await api.resendVerification();
      setSent(true);
    } catch (err) {
      toast.error(err?.message || "Could not send the email");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Notice
      tone="warning"
      icon={MailWarning}
      title="Verify your email to place orders"
      action={
        compact ? null : (
          <div className="flex flex-col gap-1 sm:flex-row">
            <Button size="sm" variant="secondary" loading={busy} disabled={sent} onClick={resend}>
              {sent ? "Link sent" : "Resend link"}
            </Button>
            <Button size="sm" variant="ghost" onClick={() => reloadUser().catch(() => {})}>
              I’ve verified
            </Button>
          </div>
        )
      }
    >
      Sellers ship to verified business accounts only. We sent a link to <span className="font-semibold">{user?.email}</span>. Your cart and choices are kept while you verify.
    </Notice>
  );
}

/* ------------------------------------------------------------------ delivery per store */

function StoreDelivery({ group, storeName, onPickup, onDelivery, busy, pincode }) {
  const store = usePublicStore(group.store?.city ? null : group.tenantId);
  const name = storeName || store.data?.displayName || store.data?.name || "Seller";
  const items = group.items || [];
  const pickupCapable = items.length > 0 && items.every((i) => (i.deliveryModes || []).includes("store_pickup"));
  const deliveryCapable = items.some((i) => (i.deliveryModes || ["delivery_partner"]).includes("delivery_partner"));
  const allPickup = items.length > 0 && items.every((i) => i.fulfillmentMode === "store_pickup");
  const serviceable = group.serviceability?.serviceable !== false;
  const eta = group.eta;
  const etaText = eta?.etaFrom ? formatEta(eta.etaFrom, eta.etaTo) : eta?.etaDaysMin != null ? `${eta.etaDaysMin}–${eta.etaDaysMax} days` : "";
  return (
    <div className="rounded-card border border-shop-line p-3 sm:p-4">
      <p className="flex items-center gap-2 text-shop-base font-semibold text-shop-ink">
        <Store className="size-4 text-shop-muted" aria-hidden /> {name}
        <span className="text-shop-xs font-normal text-shop-muted">
          · {items.length} item{items.length === 1 ? "" : "s"}
        </span>
      </p>
      {pickupCapable && deliveryCapable ? (
        <div role="radiogroup" aria-label={`How to receive items from ${name}`} className="mt-3 grid gap-2 sm:grid-cols-2">
          {[
            { key: "delivery", label: "Deliver to my address", icon: Truck, active: !allPickup, onClick: onDelivery, help: !serviceable ? "Not delivered to this PIN" : etaText ? `Arrives ${etaText}` : "ETA confirmed by the seller" },
            { key: "pickup", label: "Pick up from store", icon: Store, active: allPickup, onClick: onPickup, help: group.store?.city || store.data?.pickupCity ? `From ${group.store?.city || store.data.pickupCity} · no delivery fee` : "No delivery fee" },
          ].map((o) => (
            <button
              key={o.key}
              type="button"
              role="radio"
              aria-checked={o.active}
              aria-label={`${o.label}: ${o.help}`}
              disabled={busy}
              onClick={() => !o.active && o.onClick()}
              className={cn("flex min-h-14 items-start gap-3 rounded-control border p-3 text-left", o.active ? "border-shop-primary bg-shop-primary-soft/50" : "border-shop-line hover:border-shop-line-strong")}
            >
              <o.icon className={cn("mt-0.5 size-5 shrink-0", o.active ? "text-shop-primary-ink" : "text-shop-muted")} strokeWidth={1.75} aria-hidden />
              <span>
                <span className="block text-shop-sm font-semibold text-shop-ink">{o.label}</span>
                <span className="block text-shop-xs text-shop-muted">{o.help}</span>
              </span>
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-2 flex items-center gap-2 text-shop-sm text-shop-text">
          {allPickup ? <Store className="size-4 text-shop-muted" aria-hidden /> : <Truck className="size-4 text-shop-muted" aria-hidden />}
          {allPickup ? `Store pickup${group.store?.city || store.data?.pickupCity ? ` from ${group.store?.city || store.data?.pickupCity}` : ""}` : etaText ? `Delivery · arrives ${etaText}` : "Delivery"}
        </p>
      )}
      {!allPickup && !serviceable ? (
        <Notice tone="danger" className="mt-3" icon={AlertTriangle}>
          {name} does not deliver to PIN {pincode || "this address"} yet. {pickupCapable ? "Choose store pickup or " : "Choose "}another address.
        </Notice>
      ) : null}
      {!allPickup && Number(group.fees?.delivery ?? group.deliveryFee) > 0 ? (
        <p className="mt-2 text-shop-xs text-shop-muted">
          Delivery fee <Money value={group.fees?.delivery ?? group.deliveryFee} /> (GST included)
        </p>
      ) : null}
    </div>
  );
}

/* ------------------------------------------------------------------ review per store */

function StoreReview({ group, storeName }) {
  const store = usePublicStore(storeName ? null : group.tenantId);
  const name = storeName || store.data?.displayName || store.data?.name || "Seller";
  const allPickup = (group.items || []).every((i) => i.fulfillmentMode === "store_pickup");
  const eta = group.eta;
  return (
    <section aria-label={`Order from ${name}`} className="rounded-card border border-shop-line">
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-shop-line px-3 py-2.5 sm:px-4">
        <p className="flex items-center gap-2 text-shop-sm font-semibold text-shop-ink">
          <Store className="size-4 text-shop-muted" aria-hidden /> {name}
        </p>
        <p className="text-shop-xs text-shop-muted">{allPickup ? "Store pickup" : eta?.etaFrom ? `Arrives ${formatEta(eta.etaFrom, eta.etaTo)}` : "Delivery"}</p>
      </header>
      <ul className="divide-y divide-shop-line px-3 sm:px-4">
        {(group.items || []).map((i) => (
          <li key={i.cartItemId || i.variantId} className="flex gap-3 py-2.5">
            <ImageWithFallback src={i.image} alt="" className="size-12 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="line-clamp-2 text-shop-sm font-medium text-shop-ink">{i.name}</p>
              <p className="text-shop-xs text-shop-muted">
                {i.pack ? `${i.pack} · ` : ""}
                {i.qty} × <Money value={i.unitPrice} />
                {i.taxRate ? ` · GST ${i.taxRate}%` : ""}
                {i.bulk ? " · bulk price" : ""}
              </p>
              {i.issue ? <p className="text-shop-xs font-medium text-shop-danger-ink">{i.issue}</p> : null}
            </div>
            <Money value={i.lineTotal} className="shrink-0 text-shop-sm font-semibold text-shop-ink" />
          </li>
        ))}
      </ul>
      <div className="border-t border-shop-line px-3 py-3 sm:px-4">
        <TotalsList t={group} totalLabel={`Total for ${name}`} />
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ summary items */

/** The cart lines in the summary: thumbnails always visible, the full list on demand. */
function ItemsPreview({ cart }) {
  const [open, setOpen] = useState(false);
  const lines = cart.groups.flatMap((g) => g.items);
  if (!lines.length) return null;
  return (
    <div className="overflow-hidden rounded-xl border border-shop-line">
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} className="flex min-h-12 w-full items-center gap-3 px-3 py-2 text-left hover:bg-shop-page">
        <span className="flex -space-x-2">
          {lines.slice(0, 4).map((l) => (
            <ImageWithFallback key={l.key} src={l.image} alt="" fit="cover" fallbackName={displayName(l.name)} className="size-9 rounded-lg bg-white ring-2 ring-shop-card [&_span]:text-[0.6rem]" />
          ))}
        </span>
        <span className="min-w-0 flex-1 text-shop-sm font-semibold text-shop-ink">
          {lines.length} item{lines.length === 1 ? "" : "s"}
          {lines.length > 4 ? <span className="font-normal text-shop-muted"> · +{lines.length - 4} more</span> : null}
        </span>
        <span className="text-shop-xs font-semibold text-shop-primary-ink">{open ? "Hide" : "View"}</span>
        <ChevronDown className={cn("size-4 shrink-0 text-shop-muted transition-transform", open && "rotate-180")} aria-hidden />
      </button>
      {open ? (
        <ul className="max-h-72 divide-y divide-shop-line overflow-y-auto border-t border-shop-line px-3">
          {lines.map((l) => (
            <li key={l.key} className="flex items-center gap-2.5 py-2">
              <ImageWithFallback src={l.image} alt="" fit="cover" fallbackName={displayName(l.name)} className="size-10 shrink-0 rounded-lg bg-white ring-1 ring-shop-line [&_span]:text-[0.65rem]" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-shop-xs font-semibold text-shop-ink">{displayName(l.name)}</p>
                <p className="text-shop-xs text-shop-muted">
                  {l.pack ? `${l.pack} · ` : ""}Qty {l.qty}
                </p>
              </div>
              <Money value={l.lineTotal} pending={l.pending} className="shrink-0 text-shop-xs font-semibold text-shop-ink" />
            </li>
          ))}
        </ul>
      ) : null}
      <Link to="/cart" className="flex min-h-10 items-center justify-center gap-1 border-t border-shop-line text-shop-xs font-semibold text-shop-primary-ink hover:bg-shop-page">
        <ArrowLeft className="size-3.5" aria-hidden /> Edit cart
      </Link>
    </div>
  );
}

/* ------------------------------------------------------------------ page */

export default function Checkout() {
  const navigate = useNavigate();
  const { user, isBuyer } = useViewer();
  const { reloadUser, updateProfile } = useAuth();
  const { addresses, defaultAddress, isPending: addressesPending } = useAddresses();
  const settings = usePublicSettings();
  const cartActions = useCartActions();

  useDocumentTitle("Checkout");
  const [step, setStep] = useState("address");
  const [addressId, setAddressId] = useState("");
  const [partnerId, setPartnerId] = useState("");
  const [method, setMethod] = useState("");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [sheet, setSheet] = useState(null); // null | "new" | address
  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const placedRef = useRef(false);

  const profile = user?.profile || {};
  const [business, setBusiness] = useState(Boolean(profile.gstin));
  const [gstin, setGstin] = useState(profile.gstin || "");
  const [legalName, setLegalName] = useState(profile.company || "");

  // Default address once loaded (and re-pick if the chosen one was deleted).
  useEffect(() => {
    if (!addressesPending && (!addressId || !addresses.some((a) => a.id === addressId)) && defaultAddress) setAddressId(defaultAddress.id);
  }, [addressesPending, addresses, defaultAddress, addressId]);

  const co = useCheckout({ addressId, deliveryPartnerId: partnerId || undefined });
  const { cart, preview, paymentOptions } = co;
  const pv = preview.data;
  const po = paymentOptions.data;
  const address = addresses.find((a) => a.id === addressId) || null;
  const verified = user?.emailVerified !== false;
  const emailBlocked = !verified || preview.error?.code === "EMAIL_NOT_VERIFIED" || paymentOptions.error?.code === "EMAIL_NOT_VERIFIED";

  const methods = po?.methods || [];
  const selected = methods.find((m) => m.method === method) || null;
  useEffect(() => {
    if (!po) return;
    const current = po.methods?.find((m) => m.method === method);
    if (current?.enabled) return;
    const def = po.methods?.find((m) => m.method === po.defaultMethod && m.enabled) || po.methods?.find((m) => m.enabled);
    setMethod(def ? def.method : "");
  }, [po]); // eslint-disable-line react-hooks/exhaustive-deps

  // Focus the heading of the step that opens.
  const lastStep = useRef(step);
  const quietStep = useRef(false);
  useEffect(() => {
    if (lastStep.current === step) return;
    lastStep.current = step;
    if (quietStep.current) {
      quietStep.current = false;
      return;
    }
    const h = document.getElementById(`co-${step}-title`);
    if (h) {
      h.focus({ preventScroll: true });
      h.closest("section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [step]);

  const idx = STEPS.indexOf(step);
  const statusOf = (s) => (s === step ? "current" : STEPS.indexOf(s) < idx ? "done" : "upcoming");

  const groups = pv?.groups || [];
  const storeNames = useMemo(() => new Map((po?.groups || []).map((g) => [String(g.tenantId), g.store?.displayName || g.store?.name || ""])), [po]);
  const nameOf = (g) => g.store?.displayName || g.store?.name || storeNames.get(String(g.tenantId)) || "";
  const unserviceable = groups.filter((g) => g.serviceability?.serviceable === false && !(g.items || []).every((i) => i.fulfillmentMode === "store_pickup"));
  const hasIssues = (pv?.unavailable || []).length > 0 || groups.some((g) => (g.items || []).some((i) => i.issue));
  const gstinChanged = business ? gstin.trim().toUpperCase() !== (profile.gstin || "") || legalName.trim() !== (profile.company || "") : Boolean(profile.gstin);

  const deliveryOk = Boolean(pv) && !unserviceable.length;
  const paymentOk = Boolean(selected?.enabled) && (!selected?.requiresPoNumber || poNumber.trim());
  const canPlace = Boolean(addressId) && deliveryOk && paymentOk && !hasIssues && !emailBlocked && !cart.pending && !preview.isFetching && !co.placing;

  // First load: open the first step that still needs an answer. A saved address with valid invoice
  // details skips step 1; one delivery option per seller (and no partner choice) skips step 2.
  const autoStep = useRef(false);
  useEffect(() => {
    if (autoStep.current || addressesPending || emailBlocked) return;
    if (!addressId) {
      // The default address is picked by the effect above on the next render.
      if (!defaultAddress) autoStep.current = true;
      return;
    }
    if (preview.error) {
      autoStep.current = true;
      return;
    }
    if (business && Object.keys(validateBusiness()).length) {
      autoStep.current = true;
      return;
    }
    if (!pv) return;
    autoStep.current = true;
    const choice =
      groups.some((g) => {
        const items = g.items || [];
        return items.length > 0 && items.every((i) => (i.deliveryModes || []).includes("store_pickup")) && items.some((i) => (i.deliveryModes || ["delivery_partner"]).includes("delivery_partner"));
      }) ||
      (pv.hasDelivery && pv.deliveryPartnerChoiceEnabled && (pv.deliveryPartners || []).length > 1);
    quietStep.current = true;
    setStep(!deliveryOk || choice ? "delivery" : "payment");
  }, [addressesPending, addressId, pv, preview.error, emailBlocked]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---------- step transitions ---------- */

  function validateBusiness() {
    if (!business) return {};
    const e = {};
    const g = gstin.trim().toUpperCase();
    if (!g) e.gstin = "Enter your GSTIN, or untick “Invoice to my business”";
    else if (g !== (profile.gstin || "")) {
      const msg = gstinError(g);
      if (msg) e.gstin = msg;
    }
    if (!legalName.trim()) e.legalName = "Enter the legal business name for the invoice";
    return e;
  }

  function next(from) {
    if (from === "address") {
      if (!addressId) {
        setErrors({ address: "Choose or add a delivery address" });
        return;
      }
      const e = validateBusiness();
      setErrors(e);
      if (Object.keys(e).length) return focusField(Object.keys(e)[0]);
      setStep("delivery");
    } else if (from === "delivery") {
      if (!deliveryOk) return;
      setStep("payment");
    } else if (from === "payment") {
      if (!selected?.enabled) {
        setErrors({ method: "Choose how you want to pay" });
        return;
      }
      if (selected.requiresPoNumber && !poNumber.trim()) {
        setErrors({ poNumber: "Enter your purchase order (PO) number" });
        return focusField("poNumber");
      }
      setErrors({});
      setStep("review");
    }
  }

  function setGroupMode(group, mode) {
    for (const i of group.items || []) {
      if (i.fulfillmentMode !== mode && (i.deliveryModes || []).includes(mode)) cartActions.setMode.mutate({ cartItemId: i.cartItemId, fulfillmentMode: mode });
    }
  }

  /* ---------- place order ---------- */

  async function placeOrder() {
    setBanner(null);
    const be = validateBusiness();
    if (Object.keys(be).length) {
      setErrors(be);
      setStep("address");
      return focusField(Object.keys(be)[0]);
    }
    if (!selected?.enabled || (selected.requiresPoNumber && !poNumber.trim())) {
      setStep("payment");
      setErrors(selected?.requiresPoNumber ? { poNumber: "Enter your purchase order (PO) number" } : { method: "Choose how you want to pay" });
      return focusField("poNumber");
    }
    if (!canPlace) return;

    // Invoice details live on the profile (the order snapshots them).
    if (gstinChanged) {
      try {
        const g = gstin.trim().toUpperCase();
        // Only a changed GSTIN is sent (the API re-validates it; an older stored value must not block the name).
        await updateProfile({ profile: business ? { ...(g !== (profile.gstin || "") ? { gstin: g } : {}), company: legalName.trim() } : { gstin: "" } });
      } catch (err) {
        const f = err?.fields || {};
        const e = { gstin: f["profile.gstin"] || f.gstin, legalName: f["profile.company"] || f.company };
        setErrors(Object.fromEntries(Object.entries(e).filter(([, v]) => v)));
        setStep("address");
        setBanner({ tone: "danger", text: err?.message || "We couldn’t save your invoice details." });
        return;
      }
    }

    const r = await co.place({ paymentMethod: method, poNumber: poNumber.trim() || undefined, buyerNotes: notes.trim() || undefined });
    if (r.status === "busy") return;
    if (r.status === "no_preview") {
      setBanner({ tone: "warning", text: "Your total is still updating. Try again in a moment." });
      return;
    }
    if (r.status === "error") {
      const err = r.error || {};
      const f = err.fields || {};
      if (f.poNumber) {
        setErrors({ poNumber: f.poNumber });
        setStep("payment");
        return focusField("poNumber");
      }
      if (f.addressId) {
        setErrors({ address: f.addressId });
        setStep("address");
        return;
      }
      if (f.buyerNotes) {
        setErrors({ notes: f.buyerNotes });
        return focusField("notes");
      }
      if (err.code === "EMAIL_NOT_VERIFIED") {
        reloadUser().catch(() => {});
        setBanner({ tone: "warning", text: "Verify your email before placing the order." });
        return;
      }
      if (CHANGED_CODES.has(err.code) || err.status === 409) {
        setBanner({ tone: "warning", text: `${err.message || "Something in your cart changed."} We refreshed the prices and stock. Please check the new total before placing the order.` });
        setStep("review");
        return;
      }
      if (err.code === "INSUFFICIENT_CREDIT" || err.code === "TERMS_NOT_ENABLED" || err.code === "COD_DISABLED" || err.code === "PAYMENT_UNAVAILABLE") {
        setErrors({ method: err.message });
        setStep("payment");
        return;
      }
      setBanner({ tone: "danger", text: err.message || "We couldn’t place your order. Nothing was charged. Please try again." });
      return;
    }
    // Placed.
    placedRef.current = true;
    const ids = (r.orders || []).map((o) => String(o._id || o.id)).filter(Boolean);
    const pay = r.payment?.status || null;
    if (pay === "paid") toast.success("Payment received");
    navigate(ids.length ? `/order/${ids[0]}${ids.length > 1 ? `?ids=${ids.join(",")}` : ""}` : "/account/orders", {
      replace: true,
      state: { placed: true, payment: pay, paymentError: r.payment?.error?.message || r.payment?.lastError?.description || "" },
    });
  }

  /* ---------- guards ---------- */

  if (user && !isBuyer) {
    return (
      <div className="msr-gutter py-10">
        <ShopPageHeader title="Checkout" />
        <EmptyState className="mt-6" icon={Lock} title="Checkout is for buyer accounts" description="You are signed in with a staff account. Sign in with a buyer account to place orders." action={<Button to="/cart" variant="secondary">Back to cart</Button>} />
      </div>
    );
  }
  if (cart.count === 0 && !placedRef.current && !co.placing) {
    return (
      <div className="msr-gutter py-10">
        <ShopPageHeader title="Checkout" />
        <EmptyState className="mt-6" icon={ShoppingCart} title="Your cart is empty" description="Add products to your cart to check out." action={<Button to="/category/all">Browse products</Button>} />
      </div>
    );
  }

  const placeLabel = co.stage === "paying" ? "Waiting for payment…" : co.stage === "verifying" ? "Confirming payment…" : co.stage === "resuming" ? "Opening payment…" : co.placing ? "Placing order…" : ONLINE.has(method) ? "Place order and pay" : "Place order";
  const total = pv?.grandTotal ?? cart.totals.grandTotal;
  const pending = preview.isFetching || cart.pending || (!pv && Boolean(addressId) && !preview.error);

  const mobileAction =
    step === "review"
      ? { label: placeLabel, onClick: placeOrder, disabled: !canPlace, loading: co.placing }
      : { label: step === "address" ? "Continue to delivery" : step === "delivery" ? "Continue to payment" : "Review order", onClick: () => next(step), disabled: (step === "delivery" && !deliveryOk) || (step !== "address" && emailBlocked && step === "payment"), loading: false };

  return (
    <div className="msr-gutter pb-36 pt-5 md:pt-6 lg:pb-12">
      <CheckoutProgress current={step === "payment" || step === "review" ? "payment" : "details"} className="mx-auto max-w-3xl" />
      <div className="mt-6 flex flex-wrap items-end justify-between gap-x-4 gap-y-1">
        <h1 className="font-display text-shop-xl font-bold text-shop-ink md:text-shop-2xl">Checkout</h1>
        <p className="flex items-center gap-1.5 text-shop-xs font-medium text-shop-muted">
          <ShieldCheck className="size-4 text-shop-primary" strokeWidth={1.75} aria-hidden /> Secure checkout · prices and stock re-checked when you order
        </p>
      </div>

      <div className="mt-5 grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-4">
          {emailBlocked ? <VerifyEmailNotice user={user} reloadUser={reloadUser} /> : null}
          {banner ? (
            <Notice tone={banner.tone} icon={AlertTriangle}>
              {banner.text}
            </Notice>
          ) : null}

          {/* 1. Address */}
          <CheckoutStep
            id="co-address"
            index={1}
            title={STEP_TITLES.address}
            status={statusOf("address")}
            onEdit={() => setStep("address")}
            summary={
              <div className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-1">
                {address ? <AddressCard address={address} compact className="min-w-0 p-3" /> : null}
                <p className="flex items-center gap-1.5 text-shop-xs text-shop-muted">
                  <Building2 className="size-3.5" aria-hidden />
                  {business ? `GST invoice to ${legalName || "your business"} · ${gstin}` : "Invoice without GSTIN"}
                </p>
              </div>
            }
          >
            {addressesPending ? (
              <div className="grid gap-2">
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : (
              <div className="grid gap-3">
                {addresses.length ? (
                  <div role="radiogroup" aria-label="Delivery address" aria-describedby={errors.address ? "co-address-err" : undefined} className="grid gap-2 md:grid-cols-2">
                    {addresses.map((a) => (
                      <AddressCard key={a.id} address={a} name="co-address" selectable checked={a.id === addressId} onSelect={() => setAddressId(a.id)} onEdit={() => setSheet(a)} />
                    ))}
                  </div>
                ) : (
                  <EmptyState compact icon={MapPin} title="Add your shop or godown address" description="We need a delivery address for the invoice, even for store pickup." />
                )}
                {errors.address ? (
                  <p id="co-address-err" role="alert" className="text-shop-sm font-medium text-shop-danger-ink">
                    {errors.address}
                  </p>
                ) : null}
                <div>
                  <Button variant="secondary" leftIcon={Plus} onClick={() => setSheet("new")} disabled={addresses.length >= MAX_ADDRESSES}>
                    Add a new address
                  </Button>
                  {addresses.length >= MAX_ADDRESSES ? <p className="mt-1 text-shop-xs text-shop-muted">You have {MAX_ADDRESSES} addresses, the maximum. Remove one in your account to add another.</p> : null}
                </div>

                <div className="rounded-card border border-shop-line bg-shop-page p-3">
                  <Checkbox
                    label="Invoice to my business (GST)"
                    description="Your GSTIN goes on each seller’s tax invoice so you can claim input tax credit."
                    checked={business}
                    onChange={(e) => {
                      setBusiness(e.target.checked);
                      setErrors((x) => ({ ...x, gstin: undefined, legalName: undefined }));
                    }}
                  />
                  {business ? (
                    <div className="mt-2 grid gap-4 sm:grid-cols-2">
                      <div data-checkout-field="gstin">
                        <Field label="GSTIN" error={errors.gstin} hint="15 characters, e.g. 27ABCDE1234F1Z5" required>
                          <Input
                            name="gstin"
                            autoCapitalize="characters"
                            autoComplete="off"
                            spellCheck={false}
                            maxLength={15}
                            value={gstin}
                            onChange={(e) => {
                              setGstin(e.target.value.toUpperCase().replace(/[^0-9A-Z]/g, ""));
                              setErrors((x) => ({ ...x, gstin: undefined }));
                            }}
                            className="uppercase tracking-wider"
                          />
                        </Field>
                      </div>
                      <div data-checkout-field="legalName">
                        <Field label="Legal business name" error={errors.legalName} required>
                          <Input
                            name="legalName"
                            autoComplete="organization"
                            maxLength={120}
                            value={legalName}
                            onChange={(e) => {
                              setLegalName(e.target.value);
                              setErrors((x) => ({ ...x, legalName: undefined }));
                            }}
                          />
                        </Field>
                      </div>
                    </div>
                  ) : profile.gstin ? (
                    <p className="mt-1 text-shop-xs text-shop-muted">Your saved GSTIN ({profile.gstin}) will be removed from your profile when you place this order.</p>
                  ) : null}
                  {gstinChanged && business ? <p className="mt-2 text-shop-xs text-shop-muted">We’ll save these details to your business profile for next time.</p> : null}
                </div>

                <div className="hidden justify-end md:flex">
                  <Button rightIcon={ArrowRight} onClick={() => next("address")}>
                    Continue to delivery
                  </Button>
                </div>
              </div>
            )}
          </CheckoutStep>

          {/* 2. Delivery */}
          <CheckoutStep
            id="co-delivery"
            index={2}
            title={STEP_TITLES.delivery}
            status={statusOf("delivery")}
            onEdit={() => setStep("delivery")}
            summary={
              <p className="text-shop-sm">
                {groups
                  .map((g) => {
                    const pickup = (g.items || []).every((i) => i.fulfillmentMode === "store_pickup");
                    return `${nameOf(g) || "Seller"}: ${pickup ? "store pickup" : g.eta?.etaFrom ? `arrives ${formatEta(g.eta.etaFrom, g.eta.etaTo)}` : "delivery"}`;
                  })
                  .join(" · ") || "Delivery"}
                {pv?.deliveryPartner?.name && pv?.hasDelivery ? ` · via ${pv.deliveryPartner.name}` : ""}
              </p>
            }
          >
            {preview.error && !emailBlocked ? (
              <Notice tone="danger" icon={AlertTriangle} action={<Button size="sm" variant="secondary" onClick={() => preview.refetch()}>Retry</Button>}>
                {preview.error.message || "We couldn’t check delivery for this address."}
              </Notice>
            ) : !pv ? (
              <div className="grid gap-2">
                <RowSkeleton />
                <RowSkeleton />
              </div>
            ) : (
              <div className="grid gap-3">
                {groups.map((g) => (
                  <StoreDelivery key={g.tenantId} group={g} storeName={nameOf(g)} pincode={address?.postalCode} busy={cartActions.setMode.isPending} onPickup={() => setGroupMode(g, "store_pickup")} onDelivery={() => setGroupMode(g, "delivery_partner")} />
                ))}
                {pv.hasDelivery && pv.deliveryPartnerChoiceEnabled && (pv.deliveryPartners || []).length > 1 ? (
                  <fieldset className="rounded-card border border-shop-line p-3 sm:p-4">
                    <legend className="px-1 text-shop-sm font-semibold text-shop-ink">Delivery partner</legend>
                    <div className="grid gap-2 sm:grid-cols-3">
                      {pv.deliveryPartners.map((p) => {
                        const active = (partnerId || pv.deliveryPartner?.id) === p.id;
                        return (
                          <label key={p.id} className={cn("flex min-h-14 cursor-pointer items-start gap-3 rounded-control border p-3", active ? "border-shop-primary bg-shop-primary-soft/50" : "border-shop-line")}>
                            <input type="radio" name="co-partner" aria-label={`${p.name}, ${Number(p.fee) > 0 ? `${formatListing(p.fee)} per seller` : "no partner charge"}`} className="mt-1 size-5 accent-[var(--shop-primary)]" checked={active} onChange={() => setPartnerId(p.id)} />
                            <span>
                              <span className="block text-shop-sm font-semibold text-shop-ink">{p.name}</span>
                              <span className="block text-shop-xs text-shop-muted">{Number(p.fee) > 0 ? `${formatListing(p.fee)} per seller` : "No partner charge"}</span>
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                ) : null}
                <div className="hidden justify-end md:flex">
                  <Button rightIcon={ArrowRight} disabled={!deliveryOk || preview.isFetching} onClick={() => next("delivery")}>
                    Continue to payment
                  </Button>
                </div>
              </div>
            )}
          </CheckoutStep>

          {/* 3. Payment */}
          <CheckoutStep
            id="co-payment"
            index={3}
            title={STEP_TITLES.payment}
            status={statusOf("payment")}
            onEdit={() => setStep("payment")}
            summary={
              <p className="text-shop-sm">
                {selected?.label || "—"}
                {poNumber ? ` · PO ${poNumber}` : ""}
              </p>
            }
          >
            {emailBlocked ? (
              <VerifyEmailNotice user={user} reloadUser={reloadUser} compact />
            ) : paymentOptions.isPending ? (
              <div className="grid gap-2">
                <Skeleton className="h-14 w-full" />
                <Skeleton className="h-14 w-full" />
              </div>
            ) : paymentOptions.error ? (
              <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => paymentOptions.refetch()}>Retry</Button>}>
                {paymentOptions.error.message}
              </Notice>
            ) : (
              <div className="grid gap-5">
                {errors.method ? (
                  <p role="alert" className="text-shop-sm font-medium text-shop-danger-ink">
                    {errors.method}
                  </p>
                ) : null}
                {/* Groups the buyer can use come first; a group that is off entirely (not terms, whose
                    reasons matter) folds into one muted line instead of a stack of dead radios. */}
                {[...PAYMENT_GROUPS]
                  .map((grp) => ({ grp, rows: grp.methods.map((m) => methods.find((x) => x.method === m)).filter(Boolean) }))
                  .filter(({ rows }) => rows.length)
                  .sort((x, y) => Number(y.rows.some((r) => r.enabled)) - Number(x.rows.some((r) => r.enabled)))
                  .map(({ grp, rows }) => {
                  const allOff = rows.every((r) => !r.enabled);
                  if (allOff && grp.id !== "terms") {
                    return (
                      <p key={grp.id} className="flex flex-wrap items-baseline gap-x-2 rounded-xl border border-dashed border-shop-line px-3 py-2.5 text-shop-xs text-shop-muted">
                        <span className="font-semibold text-shop-text">{grp.title}</span>
                        <span>
                          {rows.map((r) => r.label || r.method).join(", ")} · {rows[0].reason || "Not available for this order"}
                        </span>
                      </p>
                    );
                  }
                  return (
                    <fieldset key={grp.id} className="grid gap-2">
                      <legend className="mb-1 text-shop-sm font-semibold text-shop-ink">{grp.title}</legend>
                      {grp.id === "terms" && allOff && !rows.some((r) => /limit|balance|overdue/i.test(r.reason || "")) ? (
                        <p className="text-shop-xs text-shop-muted">
                          Want to buy on credit or against a PO?{" "}
                          <Link to="/account/support?new=1" className="font-semibold text-shop-primary-ink underline-offset-2 hover:underline">
                            Ask the seller to enable terms
                          </Link>
                          .
                        </p>
                      ) : null}
                      {rows.map((opt) => (
                        <PaymentOption
                          key={opt.method}
                          option={opt}
                          checked={method === opt.method}
                          onSelect={(m) => {
                            setMethod(m);
                            setErrors({});
                          }}
                        >
                          {ONLINE.has(opt.method) ? (
                            <p className="text-shop-xs text-shop-muted">After you place the order, a secure Razorpay window opens. If you close it, you can pay later from the order page; the order is kept for you.</p>
                          ) : opt.method === "cod" ? (
                            <p className="text-shop-xs text-shop-muted">Pay cash or UPI to the delivery partner. Keep the exact amount ready.</p>
                          ) : TERMS.has(opt.method) ? (
                            <div className="grid gap-3">
                              {(po.groups || []).map((g) => (
                                <CreditTermsPanel key={g.tenantId} credit={g.credit} storeName={(po.groups || []).length > 1 ? g.store?.displayName || g.store?.name : undefined} orderTotal={g.grandTotal ?? g.total} />
                              ))}
                              {opt.requiresPoNumber ? (
                                <div data-checkout-field="poNumber">
                                  <Field label="Purchase order (PO) number" error={errors.poNumber} hint="Printed on every seller’s invoice" required>
                                    <Input
                                      name="poNumber"
                                      autoComplete="off"
                                      maxLength={80}
                                      value={poNumber}
                                      onChange={(e) => {
                                        setPoNumber(e.target.value);
                                        setErrors((x) => ({ ...x, poNumber: undefined }));
                                      }}
                                    />
                                  </Field>
                                </div>
                              ) : null}
                            </div>
                          ) : null}
                        </PaymentOption>
                      ))}
                    </fieldset>
                  );
                })}
                <div className="hidden justify-end md:flex">
                  <Button rightIcon={ArrowRight} onClick={() => next("payment")}>
                    Review order
                  </Button>
                </div>
              </div>
            )}
          </CheckoutStep>

          {/* 4. Review */}
          <CheckoutStep id="co-review" index={4} title={STEP_TITLES.review} status={statusOf("review")}>
            {!pv ? (
              <RowSkeleton />
            ) : (
              <div className="grid gap-4">
                {hasIssues ? (
                  <Notice tone="danger" icon={AlertTriangle} action={<Button size="sm" variant="secondary" to="/cart">Fix in cart</Button>}>
                    Some items can’t be ordered right now. Update your cart to continue.
                  </Notice>
                ) : null}
                {groups.length > 1 ? <p className="text-shop-sm text-shop-muted">You are placing {groups.length} orders, one per seller. Each seller ships and invoices separately.</p> : null}
                {groups.map((g) => (
                  <StoreReview key={g.tenantId} group={g} storeName={nameOf(g)} />
                ))}
                <div data-checkout-field="notes">
                  <Field label="Note for the seller" optional error={errors.notes} hint="Delivery timing, unloading, landmark…">
                    <Textarea name="notes" rows={2} maxLength={1000} value={notes} onChange={(e) => setNotes(e.target.value)} />
                  </Field>
                </div>
                <p className="rounded-well bg-shop-well px-3 py-2 text-shop-xs text-shop-muted">
                  <span className="font-semibold text-shop-text">Returns and refunds. </span>
                  {refundPolicyText(settings.data)}{" "}
                  <Link to="/pages/refunds" className="font-semibold text-shop-primary-ink underline-offset-2 hover:underline">
                    Full policy
                  </Link>
                </p>
                <div className="hidden md:block">
                  <Button size="lg" block loading={co.placing} disabled={!canPlace} onClick={placeOrder}>
                    {placeLabel}
                    {!co.placing && pv ? (
                      <span className="tabular-nums">
                        {" "}
                        · <Money value={pv.grandTotal} pending={pending} />
                      </span>
                    ) : null}
                  </Button>
                  <p className="mt-2 text-center text-shop-xs text-shop-muted">By placing the order you agree to the sellers’ terms of sale.</p>
                </div>
              </div>
            )}
          </CheckoutStep>
        </div>

        {/* Summary */}
        <aside aria-label="Order summary" className="hidden lg:sticky lg:top-36 lg:block">
          <Card className="rounded-[1.25rem] p-4 shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)] sm:p-5">
            <h2 className="font-display text-shop-md font-bold text-shop-ink">Order summary</h2>
            <p className="mt-1 text-shop-xs text-shop-muted">
              {cart.units} units · {cart.groups.length} seller{cart.groups.length === 1 ? "" : "s"}
              {pv ? "" : " · add an address for delivery fees"}
            </p>
            <div className="mt-3">
              <ItemsPreview cart={cart} />
            </div>
            <TotalsList className="mt-3" t={pv || cart.totals} couponCode={pv?.couponCode ?? cart.couponCode} pending={pending} totalLabel={pv ? "Total payable" : "Estimated total"} />
            {step === "review" ? (
              <Button className="mt-4" size="lg" block loading={co.placing} disabled={!canPlace} onClick={placeOrder}>
                {placeLabel}
              </Button>
            ) : (
              <Button className="mt-4" variant="secondary" block onClick={() => next(step)} disabled={step === "delivery" && !deliveryOk}>
                {mobileAction.label}
              </Button>
            )}
            <p className="mt-3 flex items-center justify-center gap-1.5 text-shop-xs text-shop-muted">
              <Lock className="size-3.5" aria-hidden /> Prices and stock are re-checked when you place the order.
            </p>
          </Card>
        </aside>
      </div>

      {/* Phone / tablet sticky CTA (the bottom nav is hidden on /checkout). */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-shop-line bg-shop-card/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-shop-pop backdrop-blur lg:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-shop-xs text-shop-muted">{pv ? "Total payable" : "Estimated total"}</p>
            <p className="text-shop-lg font-bold text-shop-ink">
              <Money value={total} pending={pending} />
            </p>
          </div>
          <Button className="w-48 shrink-0 sm:w-60" size="md" loading={mobileAction.loading} disabled={mobileAction.disabled} onClick={mobileAction.onClick}>
            {mobileAction.label}
          </Button>
        </div>
      </div>

      {sheet ? (
        <AddressSheet
          open
          address={sheet === "new" ? null : sheet}
          onOpenChange={(v) => !v && setSheet(null)}
          onSaved={(a) => {
            if (a?.id) setAddressId(a.id);
            setErrors((x) => ({ ...x, address: undefined }));
          }}
        />
      ) : null}
    </div>
  );
}
