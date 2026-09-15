import { useEffect, useMemo, useState } from "react";
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
  Smartphone,
  WalletCards,
} from "lucide-react";

import { useCart } from "../context/CartContext.jsx";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";

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
    tax,
    total,
    couponCode,
    refresh,
    live,
  } = useCart();

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

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
      return undefined;
    }

    let cancelled = false;

    (async () => {
      try {
        const next = await api.previewCheckout(addressId);

        if (!cancelled) {
          setPreview(next);
        }
      } catch {
        if (!cancelled) {
          setPreview(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [addressId]);

  const totals = preview || {
    subtotal,
    couponDiscount: discount,
    deliveryFee: delivery,
    tax,
    grandTotal: total,
  };

  const payable = totals.grandTotal || 0;

  /* -------------------------------------------------------
     EMPTY CART
  ------------------------------------------------------- */

  if (!items.length) {
    return (
      <div className="min-h-[70vh] bg-[#f7f8fa]">
        <div className="msr-gutter flex min-h-[70vh] items-center justify-center py-16">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white shadow-sm">
              <ShoppingBagIcon />
            </div>

            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-[#171a38]">
              Nothing to checkout
            </h1>

            <p className="mt-2 text-sm text-[#777c90]">
              Your cart is empty. Add some products before
              continuing.
            </p>

            <Link
              to="/category/all"
              className="
                mt-7 inline-flex items-center gap-2
                rounded-xl
                bg-[#0b1460]
                px-6 py-3
                text-sm font-bold
                text-white
                transition
                hover:-translate-y-0.5
              "
            >
              Browse products
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
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
    if (!addressId) {
      setError("Please select a delivery address.");
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
      const key = `chk-${Date.now()}-${Math.random()
        .toString(36)
        .slice(2, 8)}`;

      const result = await api.checkout(
        {
          addressId,
          paymentMethod: pay,
          poNumber:
            pay === "purchase_order"
              ? poNumber
              : "",
          buyerNotes: notes,
        },
        key
      );

      const orders = result.orders || [];
      const first = orders[0];

      await refresh();

      navigate(
        `/order/${first?._id || first?.orderNumber}`,
        {
          state: { orders },
        }
      );
    } catch (err) {
      setError(
        err.message || "Could not place order"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#f7f8fa]">

      <div className="msr-gutter py-6 sm:py-8 lg:py-10">

        {/* ==================================================
            HEADER
        ================================================== */}

        <header className="mb-7">
          <Link
            to="/cart"
            className="
              inline-flex items-center gap-1.5
              text-xs font-bold
              text-[#777c90]
              transition
              hover:text-[#0b1460]
            "
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to cart
          </Link>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-msr-accent">
                Secure checkout
              </p>

              <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#171a38] sm:text-3xl">
                Complete your order
              </h1>

              <p className="mt-1 text-sm text-[#777c90]">
                Choose your delivery address and payment
                method.
              </p>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-[#777c90]">
              <ShieldCheck className="h-4 w-4 text-msr-success" />
              Secure checkout
            </div>
          </div>
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

            <section className="overflow-hidden rounded-2xl border border-[#e7e9ef] bg-white">

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
                        className="h-12 w-full appearance-none rounded-xl border border-[#e4e6ec] bg-white px-3 pr-10 text-sm font-semibold text-[#252942] outline-none transition focus:border-[#0b1460] focus:ring-2 focus:ring-[#0b1460]/10"
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
                      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85899b]" />
                    </label>

                    {selected ? (
                      <div className="rounded-xl bg-[#f8f9fb] px-3.5 py-3">
                        <p className="text-[12px] leading-5 text-[#686d82]">
                          <span className="font-bold text-[#303449]">{selected.contactName}</span>
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
                  <div className="rounded-xl border border-dashed border-[#dfe2e8] bg-[#fafbfc] px-5 py-8 text-center">
                    <MapPin className="mx-auto h-6 w-6 text-[#a4a8b6]" />

                    <p className="mt-2 text-sm font-bold text-[#4e5367]">
                      No saved addresses
                    </p>

                    <p className="mt-1 text-xs text-[#9296a7]">
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
                      text-[#0b1460]
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
                    className="mt-4 rounded-xl border border-[#e7e9ef] bg-[#fafbfc] p-4"
                  >
                    <div className="mb-3 flex items-center justify-between">
                      <h3 className="text-sm font-extrabold text-[#171a38]">
                        Add delivery address
                      </h3>

                      <button
                        type="button"
                        onClick={() =>
                          setAdding(false)
                        }
                        className="text-xs font-semibold text-[#777c90]"
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
                        bg-[#0b1460]
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

            {/* ==================================================
                PAYMENT
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-[#e7e9ef] bg-white">

              <SectionHeader
                number="02"
                title="Payment method"
                description="Choose how you'd like to pay"
                icon={CreditCard}
              />

              <div className="p-4 sm:p-5">

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
                              ? "border-[#0b1460] bg-[#f7f8ff]"
                              : "border-[#e7e9ef] hover:border-[#cfd3df]"
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
                                ? "bg-[#0b1460] text-white"
                                : "bg-[#f4f5f8] text-[#6f7487]"
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
                                    ? "text-[#0b1460]"
                                    : "text-[#303449]"
                                }
                              `}
                            >
                              {payment.label}
                            </p>

                            {active ? (
                              <span className="grid h-5 w-5 place-items-center rounded-full bg-[#0b1460] text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            ) : null}
                          </div>

                          <p className="mt-0.5 text-[11px] leading-4 text-[#9296a7]">
                            {payment.description}
                          </p>
                        </div>
                      </label>
                    );
                  })}
                </div>

                {pay === "purchase_order" ? (
                  <div className="mt-4 rounded-xl bg-[#fafbfc] p-3.5">
                    <label className="text-xs font-bold text-[#4e5367]">
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
                        border border-[#e1e3e9]
                        bg-white
                        px-3
                        text-sm
                        outline-none
                        transition
                        focus:border-[#0b1460]
                        focus:ring-2
                        focus:ring-[#0b1460]/10
                      "
                    />
                  </div>
                ) : null}

              </div>
            </section>

            {/* ==================================================
                ORDER NOTES
            ================================================== */}

            <section className="overflow-hidden rounded-2xl border border-[#e7e9ef] bg-white">

              <div className="flex items-center gap-3 px-4 py-4 sm:px-5">
                <div className="grid h-9 w-9 place-items-center rounded-lg bg-[#f4f5f8] text-[#666b7e]">
                  <NotebookPen className="h-4 w-4" />
                </div>

                <div>
                  <h2 className="text-[14px] font-extrabold text-[#171a38]">
                    Delivery instructions
                  </h2>

                  <p className="text-[11px] text-[#9296a7]">
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
                    border border-[#e1e3e9]
                    bg-[#fafbfc]
                    px-3.5
                    py-3
                    text-sm
                    leading-5
                    outline-none
                    transition
                    placeholder:text-[#a4a8b6]
                    focus:border-[#0b1460]
                    focus:bg-white
                    focus:ring-2
                    focus:ring-[#0b1460]/10
                  "
                />
              </div>

            </section>
          </div>

          {/* ==================================================
              RIGHT — SUMMARY
          ================================================== */}

          <aside className="xl:sticky xl:top-24">

            <div className="overflow-hidden rounded-2xl border border-[#e7e9ef] bg-white">

              {/* Summary header */}

              <div className="border-b border-[#eef0f4] px-4 py-4 sm:px-5">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-[15px] font-extrabold text-[#171a38]">
                      Order summary
                    </h2>

                    <p className="mt-0.5 text-[11px] text-[#9296a7]">
                      {items.length}{" "}
                      {items.length === 1
                        ? "item"
                        : "items"}
                    </p>
                  </div>

                  <Link
                    to="/cart"
                    className="text-[11px] font-bold text-[#0b1460]"
                  >
                    Edit cart
                  </Link>
                </div>
              </div>

              {/* Products */}

              <div className="px-4 py-4 sm:px-5">
                <ul className="max-h-[270px] space-y-3 overflow-auto pr-1">
                  {items.map((item) => (
                    <CheckoutItem
                      key={
                        (item.cartItemId ||
                          item.id) + item.pack
                      }
                      item={item}
                    />
                  ))}
                </ul>
              </div>

              {/* Coupon */}

              {couponCode &&
              totals.couponDiscount ? (
                <div className="mx-4 rounded-lg bg-[#eef8e8] px-3 py-2.5 sm:mx-5">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-msr-success" />

                    <p className="text-[11px] font-bold text-[#47720f]">
                      {couponCode} applied · you save{" "}
                      {inr(totals.couponDiscount)}
                    </p>
                  </div>
                </div>
              ) : null}

              {/* Totals */}

              <div className="border-t border-[#eef0f4] px-4 py-4 sm:px-5">

                <dl className="space-y-3">
                  <SummaryRow
                    label="Item total"
                    value={inr(totals.subtotal)}
                  />

                  {totals.couponDiscount ? (
                    <SummaryRow
                      label="Coupon discount"
                      value={`− ${inr(
                        totals.couponDiscount
                      )}`}
                      success
                    />
                  ) : null}

                  <SummaryRow
                    label="Delivery"
                    value={
                      totals.deliveryFee
                        ? inr(totals.deliveryFee)
                        : "FREE"
                    }
                    success={!totals.deliveryFee}
                  />

                  {totals.tax ? (
                    <SummaryRow
                      label="GST"
                      value={inr(totals.tax)}
                    />
                  ) : null}
                </dl>

                <div className="my-4 border-t border-dashed border-[#dfe2e8]" />

                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[13px] font-semibold text-[#777c90]">
                      Total payable
                    </p>

                    <p className="mt-1 text-[10px] text-[#a0a4b2]">
                      Inclusive of applicable taxes
                    </p>
                  </div>

                  <p className="text-[22px] font-extrabold tracking-tight text-[#171a38]">
                    {inr(payable)}
                  </p>
                </div>

                {/* CTA */}

                <button
                  type="button"
                  disabled={busy || !addressId}
                  onClick={placeOrder}
                  className="
                    mt-5
                    flex
                    h-12
                    w-full
                    items-center
                    justify-center
                    gap-2
                    rounded-xl
                    bg-[#0b1460]
                    px-4
                    text-sm
                    font-extrabold
                    text-white
                    shadow-[0_7px_20px_rgba(11,20,96,0.18)]
                    transition-all
                    hover:-translate-y-0.5
                    hover:bg-[#111b78]
                    hover:shadow-[0_10px_25px_rgba(11,20,96,0.22)]
                    active:translate-y-0
                    disabled:cursor-not-allowed
                    disabled:opacity-40
                    disabled:hover:translate-y-0
                  "
                >
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
                </button>

                {/* Security */}

                <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-[#fafbfc] px-3 py-2.5">
                  <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0 text-msr-success" />

                  <p className="text-[10px] leading-4 text-[#9296a7]">
                    Your order information is securely
                    processed. GST invoice will be available
                    after confirmation.
                  </p>
                </div>

                {!live ? (
                  <p className="mt-3 text-center text-[10px] text-[#a0a4b2]">
                    Using local cart data while the API is
                    offline.
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

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-[#e4e6ec] bg-white/95 p-3 shadow-[0_-5px_20px_rgba(16,24,40,0.08)] backdrop-blur md:hidden">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold text-[#9296a7]">
              Total payable
            </p>

            <p className="text-lg font-extrabold text-[#171a38]">
              {inr(payable)}
            </p>
          </div>

          <button
            type="button"
            disabled={busy || !addressId}
            onClick={placeOrder}
            className="
              flex
              h-11
              items-center
              justify-center
              gap-2
              rounded-xl
              bg-[#0b1460]
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
    <div className="flex items-center gap-3 border-b border-[#eef0f4] px-4 py-4 sm:px-5">
      <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f0f2ff] text-[#0b1460]">
        <Icon className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="text-[9px] font-extrabold tracking-wider text-[#9296a7]">
            {number}
          </span>

          <h2 className="text-[14px] font-extrabold text-[#171a38]">
            {title}
          </h2>
        </div>

        <p className="mt-0.5 text-[11px] text-[#9296a7]">
          {description}
        </p>
      </div>
    </div>
  );
}

/* ============================================================
   CHECKOUT ITEM
============================================================ */

function CheckoutItem({ item }) {
  return (
    <li className="flex gap-3">
      <div className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-lg bg-[#f7f8fa]">
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
        <p className="line-clamp-2 text-[12px] font-bold leading-4 text-[#303449]">
          {item.name}
        </p>

        <p className="mt-0.5 text-[10px] text-[#9296a7]">
          {item.pack} × {item.qty}
        </p>
      </div>

      <p className="shrink-0 text-[12px] font-extrabold text-[#303449]">
        {inr(
          item.lineTotal ||
            item.price * item.qty
        )}
      </p>
    </li>
  );
}

/* ============================================================
   SUMMARY ROW
============================================================ */

function SummaryRow({
  label,
  value,
  success = false,
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-[13px]">
      <dt className="text-[#777c90]">
        {label}
      </dt>

      <dd
        className={
          success
            ? "font-bold text-msr-success"
            : "font-semibold text-[#303449]"
        }
      >
        {value}
      </dd>
    </div>
  );
}

/* ============================================================
   FORM FIELD
============================================================ */

function Field({
  value,
  onChange,
  placeholder,
  required,
}) {
  return (
    <input
      value={value}
      required={required}
      onChange={(e) =>
        onChange(e.target.value)
      }
      placeholder={placeholder}
      className="
        h-11
        w-full
        rounded-lg
        border border-[#e1e3e9]
        bg-white
        px-3
        text-sm
        outline-none
        transition
        placeholder:text-[#a4a8b6]
        focus:border-[#0b1460]
        focus:ring-2
        focus:ring-[#0b1460]/10
      "
    />
  );
}

/* ============================================================
   EMPTY CART ICON
============================================================ */

function ShoppingBagIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className="h-9 w-9 text-[#c6cad8]"
      stroke="currentColor"
      strokeWidth="1.6"
    >
      <path
        d="M6 8h12l1 12H5L6 8Z"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M9 8a3 3 0 0 1 6 0"
        strokeLinecap="round"
      />
    </svg>
  );
}
