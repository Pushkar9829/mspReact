import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";

import {
  ArrowLeft,
  ArrowRight,
  Banknote,
  Check,
  ChevronDown,
  CreditCard,
  FileText,
  Lock,
  MapPin,
  NotebookPen,
  ShieldCheck,
  ShoppingBag,
  Smartphone,
  WalletCards,
} from "lucide-react";

import { useCart } from "../context/CartContext.jsx";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { Button, EmptyState, QtyInput, buttonClass, inputClass } from "../components/shopUi.jsx";
import { bulkRulesText, nextSlab, slabRange } from "../components/SlabTable.jsx";
import { qtyRules } from "../lib/qtyRules.js";
import { GstBreakup, SummaryRows } from "../components/OrderSummaryBreakdown.jsx";

const PAYMENTS = [
  {
    id: "upi",
    label: "UPI",
    description: "Google Pay, PhonePe, Paytm & more",
    icon: Smartphone,
  },
  {
    id: "card",
    label: "Card",
    description: "Credit or debit card",
    icon: CreditCard,
  },
  {
    id: "netbanking",
    label: "Net banking",
    description: "All major banks",
    icon: WalletCards,
  },
  {
    id: "cod",
    label: "Cash on delivery",
    description: "Pay when your order arrives",
    icon: Banknote,
  },
  {
    id: "purchase_order",
    label: "Purchase order",
    description: "For approved business orders",
    icon: FileText,
  },
];

const EMPTY_DRAFT = {
  label: "Shop",
  contactName: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

export default function Checkout() {
  const {
    items,
    subtotal,
    discount,
    delivery,
    platformFee,
    partnerFee,
    tax,
    total,
    couponCode,
    refresh,
    live,
    hasBulk,
    setQty,
  } = useCart();
  const [qtyBusy, setQtyBusy] = useState("");
  const [qtyError, setQtyError] = useState("");

  async function changeQty(item, qty) {
    if (qtyBusy) return;
    const key = item.cartItemId || item.id + item.pack;
    setQtyBusy(key);
    setQtyError("");
    try {
      await setQty(item.id, item.pack, qty, item.bulk);
    } catch (err) {
      setQtyError(err.message || "Could not update quantity");
    } finally {
      setQtyBusy("");
    }
  }

  const location = useLocation();
  const navigate = useNavigate();

  const passedAddressId = location.state?.addressId || "";

  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(
    passedAddressId
  );

  const [pay, setPay] = useState("upi");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");

  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);

  const [preview, setPreview] = useState(null);
  const [previewError, setPreviewError] = useState("");
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewNonce, setPreviewNonce] = useState(0);
  const [partnerId, setPartnerId] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // One key per checkout so a double click or network retry can't create duplicate orders.
  const idempotencyKey = useRef("");

  const selected = useMemo(
    () =>
      addresses.find(
        (address) =>
          String(address._id) === String(addressId)
      ) || addresses[0],
    [addresses, addressId]
  );

  /* -------------------------------------------------------
     LOAD ADDRESSES
  ------------------------------------------------------- */

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const list = await api.listAddresses();

        if (cancelled) return;

        const rows = Array.isArray(list)
          ? list
          : list.data || [];

        setAddresses(rows);

        setAddressId((current) => {
          if (
            current &&
            rows.some(
              (address) =>
                String(address._id) === String(current)
            )
          ) {
            return current;
          }

          const defaultAddress =
            rows.find((address) => address.isDefault) ||
            rows[0];

          return defaultAddress?._id || "";
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            err.message || "Could not load addresses"
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  /* -------------------------------------------------------
     CHECKOUT PREVIEW
  ------------------------------------------------------- */

  useEffect(() => {
    if (!addressId) {
      setPreview(null);
      setPreviewError("");
      return undefined;
    }

    let cancelled = false;
    setPreviewLoading(true);

    (async () => {
      try {
        const next = await api.previewCheckout(addressId, partnerId);

        if (!cancelled) {
          setPreview(next);
          setPreviewError(
            next.unavailable?.length
              ? `${next.unavailable[0].name}: ${next.unavailable[0].issue}. Fix it in your cart to continue.`
              : ""
          );
          if (!partnerId && next.deliveryPartner?.id) setPartnerId(next.deliveryPartner.id);
        }
      } catch (err) {
        if (!cancelled) {
          setPreview(null);
          setPreviewError(err.message || "Could not calculate your total for this address");
        }
      } finally {
        if (!cancelled) setPreviewLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressId, partnerId, previewNonce, subtotal]);

  const totals = preview || {
    subtotal,
    couponDiscount: discount,
    deliveryFee: delivery,
    platformFee,
    partnerFee,
    tax,
    grandTotal: total,
  };
  const partners = preview?.deliveryPartners || [];
  const partnerChoice = Boolean(preview?.deliveryPartnerChoiceEnabled);
  const hasDelivery = items.some((item) => item.fulfillmentMode !== "store_pickup");

  const payable = totals.grandTotal || 0;
  const canPlace = live && Boolean(addressId) && Boolean(preview) && !previewError && !previewLoading && !busy && !qtyBusy;

  /* -------------------------------------------------------
     EMPTY CART
  ------------------------------------------------------- */

  if (!items.length) {
    return (
      <div className="msr-gutter py-12 md:py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Nothing to checkout"
          text="Your cart is empty. Add some products before continuing."
          className="mx-auto max-w-xl"
        >
          <Link to="/category/all" className={buttonClass({ size: "lg" })}>
            Browse products
            <ArrowRight className="h-4 w-4" />
          </Link>
        </EmptyState>
      </div>
    );
  }

  /* -------------------------------------------------------
     SAVE ADDRESS
  ------------------------------------------------------- */

  async function saveAddress(e) {
    e.preventDefault();

    setError("");

    try {
      const created = await api.createAddress({
        ...draft,
        isDefault: !addresses.length,
      });

      setAddresses((prev) => [created, ...prev]);
      setAddressId(created._id);

      setDraft(EMPTY_DRAFT);
      setAdding(false);
    } catch (err) {
      setError(
        err.message || "Could not save address"
      );
    }
  }

  /* -------------------------------------------------------
     PLACE ORDER
  ------------------------------------------------------- */

  async function placeOrder() {
    if (!live) {
      setError("Cart is not synced. Go back to the bag and retry before placing the order.");
      return;
    }
    if (!addressId) {
      setError("Please select a delivery address.");
      return;
    }
    if (!preview || previewError) {
      setError(previewError || "Your total is still being calculated.");
      return;
    }

    if (
      pay === "purchase_order" &&
      !poNumber.trim()
    ) {
      setError("Please enter your purchase order number.");
      return;
    }

    setBusy(true);
    setError("");

    try {
      if (!idempotencyKey.current) {
        idempotencyKey.current = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      }

      const result = await api.checkout(
        {
          addressId,
          paymentMethod: pay,
          poNumber:
            pay === "purchase_order"
              ? poNumber.trim()
              : "",
          buyerNotes: notes,
          deliveryPartnerId: partnerId || undefined,
          expectedGrandTotal: preview.grandTotal,
        },
        idempotencyKey.current
      );

      const orders = result?.orders || [];
      const first = orders[0];
      if (!first) {
        setError("The order could not be confirmed. Check your orders page before trying again.");
        return;
      }

      navigate(`/order/${first._id || first.orderNumber}`, { state: { orders } });
      refresh();
    } catch (err) {
      setError(
        err.message || "Could not place order"
      );
      if (err.code === "PRICE_CHANGED" || err.status === 409) {
        setPreviewNonce((n) => n + 1);
        refresh();
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-msr-bg pb-24 md:pb-0">

      <div className="msr-gutter py-6 sm:py-8 lg:py-10">

        <header className="mb-7">
          <Link
            to="/cart"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-msr-muted transition hover:text-msr-ink"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to cart
          </Link>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-msr-primary">
                Secure checkout
              </p>
              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-msr-ink sm:text-3xl">
                Complete your order
              </h1>
              <p className="mt-1 text-sm text-msr-muted">
                Choose your delivery address and payment method.
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs font-semibold text-msr-muted">
              <ShieldCheck className="h-4 w-4 text-msr-success" />
              Secure checkout
            </div>
          </div>

          <ol className="mt-6 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {[
              { n: "1", label: "Address", done: Boolean(addressId) },
              { n: "2", label: "Delivery", done: !hasDelivery || !partnerChoice || Boolean(partnerId || preview?.deliveryPartner) },
              { n: "3", label: "Payment", done: Boolean(pay) },
            ].map((step, i) => (
              <li key={step.label} className="flex shrink-0 items-center gap-2">
                {i ? <span className="mx-1 h-px w-6 bg-msr-line-strong sm:w-10" aria-hidden /> : null}
                <span
                  className={`grid h-7 w-7 place-items-center rounded-full text-[12px] font-bold ${
                    step.done ? "bg-msr-primary text-white" : "bg-msr-surface text-msr-muted"
                  }`}
                >
                  {step.done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : step.n}
                </span>
                <span className={`text-[13px] font-semibold ${step.done ? "text-msr-ink" : "text-msr-muted"}`}>{step.label}</span>
              </li>
            ))}
          </ol>
        </header>

        {/* ==================================================
            ERROR
        ================================================== */}

        {error ? (
          <div className="mb-5 flex items-start gap-3 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-msr-danger">
            <span className="mt-0.5">!</span>
            <p>{error}</p>
          </div>
        ) : null}

        {/* ==================================================
            MAIN
        ================================================== */}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">

          {/* ==================================================
              LEFT
          ================================================== */}

          <div className="space-y-5">

            {/* ==================================================
                DELIVERY ADDRESS
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">

              <SectionHeader
                number="01"
                title="Delivery address"
                description="Where should we deliver your order?"
                icon={MapPin}
              />

              <div className="p-4 sm:p-5">

                {addresses.length ? (
                  <div className="space-y-3">
                    <label className="relative block">
                      <select
                        value={addressId}
                        onChange={(e) => setAddressId(e.target.value)}
                        className="h-12 w-full appearance-none rounded-xl border border-msr-line bg-white px-3 pr-10 text-sm font-semibold text-msr-ink outline-none transition focus:border-msr-primary focus:ring-2 focus:ring-msr-primary/15"
                      >
                        {addresses.map((address) => (
                          <option key={address._id} value={address._id}>
                            {address.label || "Address"}
                            {address.isDefault ? " · Default" : ""}
                            {" · "}
                            {address.city} {address.postalCode}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msr-subtle" />
                    </label>

                    {selected ? (
                      <div className="rounded-xl bg-msr-surface px-3.5 py-3">
                        <p className="text-[12px] leading-5 text-msr-muted">
                          <span className="font-bold text-msr-ink">{selected.contactName}</span>
                          {selected.phone ? ` · ${selected.phone}` : ""}
                          <br />
                          {selected.addressLine1}
                          {selected.addressLine2 ? `, ${selected.addressLine2}` : ""}
                          , {selected.city}, {selected.state} {selected.postalCode}
                        </p>
                      </div>
                    ) : null}
                  </div>
                ) : (
                  <div className="rounded-xl border border-dashed border-msr-line-strong bg-msr-surface px-5 py-8 text-center">
                    <MapPin className="mx-auto h-6 w-6 text-msr-subtle" />

                    <p className="mt-2 text-sm font-bold text-msr-ink">
                      No saved addresses
                    </p>

                    <p className="mt-1 text-xs text-msr-subtle">
                      Add an address to continue.
                    </p>
                  </div>
                )}

                {!adding ? (
                  <button
                    type="button"
                    onClick={() => setAdding(true)}
                    className="
                      mt-4
                      inline-flex items-center gap-1.5
                      text-xs font-extrabold
                      text-msr-primary
                    "
                  >
                    <span className="text-base leading-none">
                      +
                    </span>
                    Add new address
                  </button>
                ) : (
                  <form
                    onSubmit={saveAddress}
                    className="mt-4 rounded-xl border border-msr-line bg-msr-surface p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-msr-ink">
                        Add delivery address
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          setAdding(false)
                        }
                        className="text-xs font-semibold text-msr-muted"
                      >
                        Cancel
                      </button>
                    </div>

                    <div className="grid gap-2.5 sm:grid-cols-2">
                      <Field
                        value={draft.contactName}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            contactName: value,
                          }))
                        }
                        placeholder="Full name"
                        required
                      />

                      <Field
                        value={draft.phone}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            phone: value,
                          }))
                        }
                        placeholder="Phone number"
                        required
                      />
                    </div>

                    <div className="mt-2.5">
                      <Field
                        value={draft.addressLine1}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            addressLine1: value,
                          }))
                        }
                        placeholder="Street address"
                        required
                      />
                    </div>

                    <div className="mt-2.5 grid gap-2.5 sm:grid-cols-3">
                      <Field
                        value={draft.city}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            city: value,
                          }))
                        }
                        placeholder="City"
                        required
                      />

                      <Field
                        value={draft.state}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            state: value,
                          }))
                        }
                        placeholder="State"
                        required
                      />

                      <Field
                        value={draft.postalCode}
                        onChange={(value) =>
                          setDraft((d) => ({
                            ...d,
                            postalCode: value,
                          }))
                        }
                        placeholder="Pincode"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      className="
                        mt-3
                        rounded-lg
                        bg-msr-ink
                        px-4 py-2.5
                        text-xs
                        font-extrabold
                        text-white
                      "
                    >
                      Save address
                    </button>
                  </form>
                )}

              </div>
            </section>

            {hasDelivery && partnerChoice && partners.length ? (
              <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">
                <SectionHeader
                  number="01b"
                  title="Delivery partner"
                  description="Optional. If you skip this, we use our default partner."
                  icon={MapPin}
                />
                <div className="grid gap-2.5 p-4 sm:grid-cols-2 sm:p-5">
                  {partners.map((partner) => {
                    const active = (partnerId || preview?.deliveryPartner?.id) === partner.id;
                    return (
                      <button
                        key={partner.id}
                        type="button"
                        onClick={() => setPartnerId(partner.id)}
                        className={`rounded-xl border p-3.5 text-left transition ${
                          active ? "border-msr-primary bg-msr-primary-soft" : "border-msr-line hover:border-msr-line-strong"
                        }`}
                      >
                        <p className="text-[13px] font-extrabold text-msr-ink">{partner.name}</p>
                        <p className="mt-1 text-[11px] text-msr-muted">
                          {partner.fee ? `${inr(partner.fee)} partner charge` : "No extra partner charge"}
                          {partner.isDefault ? " · Default" : ""}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </section>
            ) : null}

            {/* ==================================================
                PAYMENT
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">

              <SectionHeader
                number="02"
                title="Payment method"
                description={hasBulk ? "Bulk cart detected — purchase order is suggested for business orders" : "Choose how you'd like to pay"}
                icon={CreditCard}
              />

              <div className="p-4 sm:p-5">
                {hasBulk ? (
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-msr-gold/40 bg-msr-gold/15 px-3 py-2 text-[13px] text-msr-ink">
                    <span>This cart has bulk items. A purchase order is suggested for business orders.</span>
                    {pay !== "purchase_order" ? (
                      <button
                        type="button"
                        onClick={() => setPay("purchase_order")}
                        className="text-[12px] font-bold text-msr-primary hover:underline"
                      >
                        Use purchase order
                      </button>
                    ) : null}
                  </div>
                ) : null}
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {PAYMENTS.map((payment) => {
                    const Icon = payment.icon;
                    const active =
                      pay === payment.id;

                    return (
                      <label
                        key={payment.id}
                        className={`
                          relative
                          flex
                          cursor-pointer
                          items-start
                          gap-3
                          rounded-xl
                          border
                          p-3.5
                          transition-all
                          ${
                            active
                              ? "border-msr-primary bg-msr-primary-soft"
                              : "border-msr-line hover:border-msr-line-strong"
                          }
                        `}
                      >
                        <input
                          type="radio"
                          name="payment"
                          value={payment.id}
                          checked={active}
                          onChange={() =>
                            setPay(payment.id)
                          }
                          className="sr-only"
                        />

                        <div
                          className={`
                            grid h-9 w-9
                            shrink-0 place-items-center
                            rounded-lg
                            ${
                              active
                                ? "bg-msr-ink text-white"
                                : "bg-msr-surface text-msr-muted"
                            }
                          `}
                        >
                          <Icon className="h-4 w-4" />
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <p
                              className={`
                                text-[13px] font-extrabold
                                ${
                                  active
                                    ? "text-msr-primary"
                                    : "text-msr-ink"
                                }
                              `}
                            >
                              {payment.label}
                            </p>

                            {active ? (
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-msr-ink text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-0.5 text-[11px] leading-4 text-msr-subtle">
                            {payment.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {pay === "purchase_order" ? (
                  <div className="mt-4 rounded-xl bg-msr-surface p-3.5">
                    <label className="text-xs font-bold text-msr-ink">
                      Purchase order number
                    </label>

                    <input
                      value={poNumber}
                      onChange={(e) =>
                        setPoNumber(e.target.value)
                      }
                      placeholder="Enter PO number"
                      className="
                        mt-2
                        h-11
                        w-full
                        rounded-lg
                        border border-msr-line
                        bg-white
                        px-3
                        text-sm
                        outline-none
                        transition
                        focus:border-msr-primary
                        focus:ring-2
                        focus:ring-msr-primary/15
                      "
                    />
                  </div>
                ) : null}

              </div>
            </section>

            {/* ==================================================
                ORDER NOTES
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-msr-line bg-white">

              <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-msr-surface text-msr-muted">
                  <NotebookPen className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-[14px] font-extrabold text-msr-ink">
                    Delivery instructions
                  </h2>

                  <p className="text-[11px] text-msr-subtle">
                    Optional notes for the delivery partner
                  </p>
                </div>
              </div>

              <div className="px-4 pb-4 sm:px-5 sm:pb-5">
                <textarea
                  value={notes}
                  onChange={(e) =>
                    setNotes(e.target.value)
                  }
                  placeholder="Example: Leave the order with security if I'm unavailable."
                  className="
                    min-h-[88px]
                    w-full
                    resize-none
                    rounded-xl
                    border border-msr-line
                    bg-msr-surface
                    px-3.5
                    py-3
                    text-sm
                    leading-5
                    outline-none
                    transition
                    placeholder:text-msr-subtle
                    focus:border-msr-primary
                    focus:bg-white
                    focus:ring-2
                    focus:ring-msr-primary/15
                  "
                />
              </div>

            </section>
          </div>

          {/* ==================================================
              RIGHT — SUMMARY
          ================================================== */}

          <aside className="xl:sticky xl:top-24">

            <div className="overflow-hidden rounded-2xl border border-msr-line bg-white">

              {/* Summary header */}

              <div className="border-b border-msr-line px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-extrabold text-msr-ink">
                      Order summary
                    </h2>

                    <p className="mt-0.5 text-[11px] text-msr-subtle">
                      {items.length}{" "}
                      {items.length === 1
                        ? "item"
                        : "items"}
                    </p>
                  </div>

                  <Link
                    to="/cart"
                    className="text-[11px] font-bold text-msr-primary"
                  >
                    Edit cart
                  </Link>
                </div>
              </div>

              {/* Products */}

              <div className="px-4 py-4 sm:px-5">
                <ul className="max-h-[360px] space-y-3 overflow-auto pr-1">
                  {items.map((item) => {
                    const key = item.cartItemId || item.id + item.pack;
                    return (
                      <CheckoutItem
                        key={key + (item.bulk ? ":bulk" : "")}
                        item={item}
                        busy={qtyBusy === key}
                        locked={Boolean(qtyBusy) || busy}
                        onQty={(qty) => changeQty(item, qty)}
                      />
                    );
                  })}
                </ul>
                {qtyError ? (
                  <p className="mt-3 rounded-lg bg-msr-danger-soft px-3 py-2 text-[12px] text-msr-danger">{qtyError}</p>
                ) : null}
              </div>

              {/* Coupon */}

              {couponCode &&
              totals.couponDiscount ? (
                <div className="mx-4 rounded-lg bg-msr-success-soft px-3 py-2.5 sm:mx-5">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-msr-success" />

                    <p className="text-[11px] font-bold text-msr-success-ink">
                      {couponCode} applied · you save{" "}
                      {inr(totals.couponDiscount)}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Totals */}

              <div className="border-t border-msr-line px-4 py-4 sm:px-5">

                <SummaryRows
                  items={items}
                  couponCode={couponCode}
                  couponDiscount={totals.couponDiscount}
                  delivery={
                    !preview
                      ? "Select address"
                      : totals.deliveryFee
                        ? inr(totals.deliveryFee)
                        : preview.hasDelivery === false
                          ? "Store pickup"
                          : "FREE"
                  }
                  deliveryTone={!preview ? "muted" : totals.deliveryFee ? "default" : "success"}
                  platformFee={totals.platformFee}
                  partnerFee={totals.partnerFee}
                  partnerLabel={preview?.deliveryPartner?.name ? `${preview.deliveryPartner.name} charge` : "Partner charge"}
                />

                <div className="my-4 border-t border-dashed border-msr-line-strong" />

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-msr-muted">
                      Total payable
                    </p>

                    <p className="mt-1 text-[10px] text-msr-subtle">
                      Prices include GST
                    </p>
                  </div>

                  <p className="text-[22px] font-extrabold tracking-tight text-msr-ink">
                    {inr(payable)}
                  </p>
                </div>

                <GstBreakup items={items} className="mt-3" />

                {/* CTA */}

                {previewError ? (
                  <p className="mt-4 rounded-lg bg-msr-danger-soft px-3 py-2 text-[12px] text-msr-danger">{previewError}</p>
                ) : null}
                <Button size="lg" block className="mt-5" disabled={!canPlace} onClick={placeOrder}>
                  {busy ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Placing order...
                    </>
                  ) : (
                    <>
                      Place order
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>

                {/* Security */}

                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-msr-surface px-3 py-2.5">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-msr-success" />

                  <p className="text-[10px] leading-4 text-msr-subtle">
                    Your order information is securely
                    processed. GST invoice will be available
                    after confirmation.
                  </p>
                </div>

                {!live ? (
                  <p className="mt-3 text-center text-[12px] text-msr-danger">
                    Cart is not synced, so this order cannot be placed yet.
                  </p>
                ) : null}

              </div>
            </div>

          </aside>
        </div>
      </div>

      {/* ======================================================
          MOBILE CHECKOUT BAR
      ====================================================== */}

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-msr-line bg-white/95 p-3 shadow-[0_-5px_20px_rgba(16,24,40,0.08)] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-msr-subtle">
              Total payable
            </p>

            <p className="text-lg font-extrabold text-msr-ink">
              {inr(payable)}
            </p>
          </div>

          <button
            type="button"
            disabled={!canPlace}
            onClick={placeOrder}
            className="
              flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-msr-ink
              px-5
              text-xs
              font-extrabold
              text-white
              disabled:opacity-40
            "
          >
            {busy
              ? "Processing..."
              : "Place order"}

            {!busy ? (
              <ArrowRight className="h-4 w-4" />
            ) : null}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   SECTION HEADER
============================================================ */

function SectionHeader({
  number,
  title,
  description,
  icon: Icon,
}) {
  return (
    <div className="flex items-center gap-3 border-b border-msr-line px-4 py-4 sm:px-5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-msr-primary-soft text-msr-primary">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-extrabold tracking-wider text-msr-subtle">
            {number}
          </span>

          <h2 className="text-[14px] font-extrabold text-msr-ink">
            {title}
          </h2>
        </div>

        <p className="mt-0.5 text-[11px] text-msr-subtle">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CHECKOUT ITEM
============================================================ */

function CheckoutItem({ item, busy, locked, onQty }) {
  const rules = qtyRules(item);
  const slabs = [...(item.tierPrices || [])].sort((a, b) => a.minQty - b.minQty);
  const activeSlab = [...slabs].reverse().find((s) => item.qty >= s.minQty);
  const next = nextSlab(slabs, item.qty);
  return (
    <li className="flex gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-msr-bg">
        <img
          src={item.image || "/products/product.png"}
          alt=""
          className="h-full w-full object-contain p-1"
          onError={(e) => {
            e.currentTarget.src =
              "/products/product.png";
          }}
        />
      </div>

      <div className="min-w-0 flex-1">
        <p className="line-clamp-2 text-[12px] font-bold leading-4 text-msr-ink">
          {item.name}
        </p>

        <p className="mt-0.5 text-[10px] text-msr-subtle">
          {item.pack} · {inr(item.price)} each
          {item.bulk ? <span className="ml-1 rounded bg-msr-gold/30 px-1 font-semibold text-msr-ink">Bulk</span> : null}
        </p>
        {item.issue ? (
          <p className="mt-1 text-[10.5px] font-semibold text-msr-danger">{item.issue}</p>
        ) : (
          <div className={`mt-1.5 flex items-center gap-2 ${locked && !busy ? "pointer-events-none opacity-60" : ""}`}>
            <QtyInput
              value={item.qty}
              onChange={onQty}
              size="sm"
              disabled={locked}
              min={rules.min}
              max={rules.max}
              step={rules.step}
            />
            {busy ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-msr-line border-t-msr-primary" /> : null}
          </div>
        )}
        {item.bulk && !item.issue ? (
          <p className="mt-1 text-[10px] leading-4 text-msr-muted">
            {activeSlab ? (
              <span className="font-semibold text-msr-primary-ink">
                Slab {slabRange(activeSlab)} · {inr(activeSlab.unitPrice)}
              </span>
            ) : null}
            {next ? <span> · add {next.minQty - item.qty} more for {inr(next.unitPrice)}</span> : null}
            <span className="block">{bulkRulesText(item)}</span>
          </p>
        ) : null}
      </div>

      <p className="shrink-0 text-[12px] font-extrabold text-msr-ink">
        {inr(item.lineSubtotal || item.price * item.qty)}
      </p>
    </li>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

function Field({ value, onChange, placeholder, required }) {
  return (
    <input
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={inputClass}
    />
  );
}
