import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ChevronDown,
  Check,
  MapPin,
  ShieldCheck,
  ShoppingBag,
  Tag,
  Trash2,
  ArrowRight,
  Plus,
  X,
} from "lucide-react";

import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { getProduct } from "../data/catalog.js";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { Button, EmptyState, QtyStepper, buttonClass, inputClass } from "../components/shopUi.jsx";
import { qtyRules } from "../lib/qtyRules.js";
import { SlabStrip, bulkRulesText, nextSlab } from "../components/SlabTable.jsx";
import { GstBreakup, SummaryRows } from "../components/OrderSummaryBreakdown.jsx";

const EMPTY_DRAFT = {
  label: "Shop",
  contactName: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

export default function Cart() {
  const {
    items,
    setQty,
    remove,
    mrp,
    subtotal,
    discount,
    delivery,
    platformFee,
    partnerFee,
    tax,
    total,
    couponCode,
    applyCoupon,
    error,
    clearError,
    hasIssues,
    live,
    refresh,
  } = useCart();
  const [busyLine, setBusyLine] = useState("");

  async function lineAction(key, fn) {
    if (busyLine) return;
    setBusyLine(key);
    try {
      await fn();
    } catch {
      /* error is shown in the banner and the cart is re-synced */
    } finally {
      setBusyLine("");
    }
  }

  const { user } = useAuth();
  const navigate = useNavigate();

  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [showAllCoupons, setShowAllCoupons] = useState(false);

  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [addingAddress, setAddingAddress] = useState(false);

  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [addrError, setAddrError] = useState("");

  const manualCoupon = useRef(false);
  const couponRef = useRef(couponCode);
  const applyingBest = useRef(false);

  couponRef.current = couponCode;

  const selectedAddress = useMemo(
    () =>
      addresses.find(
        (address) => String(address._id) === String(addressId)
      ) || addresses[0],
    [addresses, addressId]
  );

  const bestCoupon = useMemo(
    () =>
      coupons.find(
        (coupon) => coupon.best && coupon.eligible
      ) || null,
    [coupons]
  );

  /* -------------------------------------------------------
     LOAD ADDRESSES
  ------------------------------------------------------- */

  useEffect(() => {
    if (!user?.token) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const list = await api.listAddresses();

        if (cancelled) return;

        const rows = Array.isArray(list)
          ? list
          : list.data || [];

        setAddresses(rows);

        const defaultAddress =
          rows.find((address) => address.isDefault) ||
          rows[0];

        if (defaultAddress) {
          setAddressId(defaultAddress._id);
        }
      } catch {
        // Address loading is optional on cart
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [user?.token]);

  /* -------------------------------------------------------
     LOAD COUPONS
  ------------------------------------------------------- */

  useEffect(() => {
    if (user?.token || !live || !couponCode) return;
    applyCoupon("").catch(() => {});
  }, [user?.token, live, couponCode]);

  useEffect(() => {
    // Guests can't see or remove coupons, so never apply one silently for them.
    if (!items.length || !user?.token) return undefined;

    let cancelled = false;

    (async () => {
      try {
        const data = await api.listCartCoupons();

        if (cancelled) return;

        const rows = data.coupons || [];

        setCoupons(rows);

        const nextBest = data.best;

        if (
          !manualCoupon.current &&
          !applyingBest.current &&
          nextBest?.code &&
          couponRef.current !== nextBest.code
        ) {
          applyingBest.current = true;

          try {
            const quoted = await applyCoupon(nextBest.code);

            if (cancelled) return;

            const saved = quoted?.couponDiscount || 0;

            setCouponMsg(
              saved
                ? `${nextBest.code} applied · you save ${inr(saved)}`
                : ""
            );
          } finally {
            applyingBest.current = false;
          }
        }
      } catch {
        // Coupons are optional
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [items.length, subtotal, user?.token]);

  /* -------------------------------------------------------
     COUPON
  ------------------------------------------------------- */

  async function onCoupon(e) {
    e.preventDefault();

    const next = code.trim();

    if (!next) {
      setCouponMsg("");
      return;
    }

    setCouponMsg("");

    try {
      manualCoupon.current = true;

      const quoted = await applyCoupon(next);

      const saved = quoted?.couponDiscount || 0;

      setCode("");

      setCouponMsg(
        saved
          ? `${quoted.couponCode || next} applied · you save ${inr(saved)}`
          : "Coupon applied"
      );
    } catch (err) {
      setCouponMsg(
        err.message || "Could not apply coupon"
      );
    }
  }

  async function pickCoupon(row) {
    if (!row?.eligible) return;

    setCouponMsg("");

    try {
      manualCoupon.current =
        row.code !== bestCoupon?.code;

      const quoted = await applyCoupon(row.code);

      const saved = quoted?.couponDiscount || 0;

      setCode("");

      setCouponMsg(
        saved
          ? `${row.code} applied · you save ${inr(saved)}`
          : ""
      );
    } catch (err) {
      setCouponMsg(
        err.message || "Could not apply coupon"
      );
    }
  }

  /* -------------------------------------------------------
     ADDRESS
  ------------------------------------------------------- */

  async function saveAddress(e) {
    e.preventDefault();

    setAddrError("");

    try {
      const created = await api.createAddress({
        ...draft,
        isDefault: !addresses.length,
      });

      setAddresses((prev) => [created, ...prev]);
      setAddressId(created._id);

      setDraft(EMPTY_DRAFT);
      setAddingAddress(false);
    } catch (err) {
      setAddrError(
        err.message || "Could not save address"
      );
    }
  }

  /* -------------------------------------------------------
     CHECKOUT
  ------------------------------------------------------- */

  function goCheckout() {
    if (!live) return;
    if (!user) {
      navigate("/login", {
        state: {
          from: "/checkout",
        },
      });

      return;
    }

    navigate("/checkout", {
      state: {
        addressId,
      },
    });
  }

  if (!items.length) {
    return (
      <div className="msr-gutter py-12 md:py-16">
        <EmptyState
          icon={ShoppingBag}
          title="Your cart is empty"
          text="Your everyday essentials are waiting. Explore groceries, snacks, household items and more."
          className="mx-auto max-w-xl"
        >
          <Link to="/category/all" className={buttonClass({ size: "lg" })}>
            Start shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
          <Link to="/deals" className={buttonClass({ variant: "secondary", size: "lg" })}>
            View deals
          </Link>
        </EmptyState>
      </div>
    );
  }

  const appliedNote =
    couponCode && discount
      ? `${couponCode === bestCoupon?.code ? "Best coupon · " : ""}${couponCode} applied · you save ${inr(discount)}`
      : "";
  const productSavings = Math.max(0, mrp - subtotal);
  const totalSavings = productSavings + (discount || 0);
  const unitCount = items.reduce((n, i) => n + i.qty, 0);
  const productCount = new Set(items.map((i) => i.id)).size;

  return (
    <div className="msr-gutter py-6 md:py-8">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold tracking-tight text-msr-ink">Shopping cart</h1>
          <p className="mt-1 text-sm text-msr-muted">
            {productCount} {productCount === 1 ? "product" : "products"}
            {items.length > productCount ? ` in ${items.length} pack sizes` : ""} · {unitCount} {unitCount === 1 ? "pack" : "packs"}
          </p>
        </div>
        <Link to="/category/all" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-msr-primary hover:underline">
          Continue shopping
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {error ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-msr-danger/20 bg-msr-danger-soft px-4 py-3 text-sm text-msr-danger">
          <span>{error}</span>
          {live ? (
            <button type="button" onClick={() => clearError()} className="font-bold text-msr-ink hover:underline">
              Dismiss
            </button>
          ) : (
            <button type="button" onClick={() => refresh()} className="font-bold text-msr-ink hover:underline">
              Retry
            </button>
          )}
        </div>
      ) : null}

      {hasIssues ? (
        <div className="mb-4 rounded-xl border border-msr-warning/30 bg-msr-warning-soft px-4 py-3 text-sm text-msr-warning-ink">
          Some items can't be ordered right now. Update or remove them to continue to checkout.
        </div>
      ) : null}

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <section className="min-w-0 space-y-4">
          <div className="overflow-hidden rounded-2xl border border-msr-line bg-white">
            <ul className="divide-y divide-msr-line">
              {items.map((item) => {
                const product = getProduct(item.id);
                const lineKey = (item.cartItemId || item.id) + item.pack + (item.bulk ? ":bulk" : "");
                const rules = qtyRules(item);
                const lineMrp = (item.mrp || item.price) * item.qty;
                const lineAmount = item.lineSubtotal || item.price * item.qty;
                const lineOff = item.mrp && item.mrp > item.price ? Math.round(((item.mrp - item.price) / item.mrp) * 100) : 0;
                const lineBusy = busyLine === lineKey;
                return (
                  <li key={lineKey} className={`group p-4 sm:p-5 ${item.issue ? "bg-msr-danger-soft/40" : ""}`}>
                    <div className="flex gap-4">
                      <Link
                        to={`/product/${item.id}`}
                        className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-xl bg-msr-surface sm:h-28 sm:w-28"
                      >
                        <img
                          src={item.image || product?.image || "/products/product.png"}
                          alt={item.name}
                          className="h-full w-full object-contain p-2 mix-blend-multiply transition-transform duration-300 group-hover:scale-105"
                          onError={(e) => {
                            e.currentTarget.src = "/products/product.png";
                          }}
                        />
                      </Link>

                      <div className="flex min-w-0 flex-1 flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {product?.brand ? (
                              <p className="text-[11px] font-semibold uppercase tracking-wide text-msr-subtle">{product.brand}</p>
                            ) : null}
                            <Link
                              to={`/product/${item.id}`}
                              className="line-clamp-2 text-[14px] font-semibold leading-snug text-msr-ink hover:text-msr-primary sm:text-[15px]"
                            >
                              {item.name}
                            </Link>
                            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                              {item.pack ? (
                                <span className="rounded-md border border-msr-line bg-msr-surface px-1.5 py-0.5 text-[11px] font-medium text-msr-muted">
                                  {item.pack}
                                </span>
                              ) : null}
                              {item.bulk ? (
                                <span className="rounded-md bg-msr-gold/30 px-1.5 py-0.5 text-[11px] font-semibold text-msr-ink">
                                  Bulk
                                </span>
                              ) : null}
                              {item.fulfillmentMode === "store_pickup" ? (
                                <span className="rounded-md bg-msr-primary-soft px-1.5 py-0.5 text-[11px] font-semibold text-msr-primary-ink">
                                  Store pickup
                                </span>
                              ) : null}
                              {item.easyReturn ? (
                                <span className="rounded-md bg-msr-success-soft px-1.5 py-0.5 text-[11px] font-semibold text-msr-success-ink">
                                  Easy return
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => lineAction(lineKey, () => remove(item.id, item.pack, item.bulk))}
                            disabled={Boolean(busyLine)}
                            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-msr-subtle transition hover:bg-msr-danger-soft hover:text-msr-danger disabled:opacity-40"
                            aria-label={`Remove ${item.name}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        {item.issue ? (
                          <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-3">
                            <p className="text-[12.5px] font-semibold text-msr-danger">
                              {item.issue} · {item.qty} in cart
                            </p>
                            <Button
                              size="sm"
                              variant="secondary"
                              disabled={Boolean(busyLine)}
                              onClick={() => lineAction(lineKey, () => remove(item.id, item.pack, item.bulk))}
                            >
                              Remove
                            </Button>
                          </div>
                        ) : (
                          <div className="mt-auto flex flex-wrap items-end justify-between gap-3 pt-3">
                            <div className={lineBusy || (busyLine && !lineBusy) ? "pointer-events-none opacity-60" : ""}>
                              <QtyStepper
                                value={item.qty}
                                onChange={(q) => lineAction(lineKey, () => setQty(item.id, item.pack, q, item.bulk))}
                                size="sm"
                                min={rules.min}
                                max={rules.max}
                                step={rules.step}
                              />
                            </div>
                            <div className="text-right">
                              <p className="flex items-baseline justify-end gap-2">
                                {lineOff ? <span className="text-[12px] text-msr-subtle line-through">{inr(lineMrp)}</span> : null}
                                <span className="text-[16px] font-extrabold text-msr-ink">{inr(lineAmount)}</span>
                              </p>
                              <p className="mt-0.5 text-[11px] text-msr-subtle">
                                {inr(item.price)} each
                                {item.taxRate ? ` · incl. ${item.taxRate}% GST` : ""}
                                {lineOff ? <span className="ml-1.5 font-semibold text-msr-success">{lineOff}% off</span> : null}
                              </p>
                            </div>
                          </div>
                        )}
                        {!item.issue && rules.bulk ? <BulkLineNote item={item} /> : null}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="border-t border-msr-line bg-msr-surface/60 px-4 py-3 sm:px-5">
              <Link to="/category/all" className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-msr-primary hover:underline">
                <Plus className="h-4 w-4" />
                Add more items
              </Link>
            </div>
          </div>
        </section>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-32">
          {user ? (
            <Panel icon={MapPin} title="Deliver to">
              {addresses.length ? (
                <label className="relative block">
                  <select
                    value={addressId}
                    onChange={(e) => setAddressId(e.target.value)}
                    className={`${inputClass} cursor-pointer appearance-none pr-10 font-semibold`}
                  >
                    {addresses.map((address) => (
                      <option key={address._id} value={address._id}>
                        {address.label} · {address.city} {address.postalCode}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msr-subtle" />
                </label>
              ) : (
                <p className="rounded-xl border border-dashed border-msr-line-strong bg-msr-surface px-4 py-3 text-center text-[12.5px] text-msr-muted">
                  No saved address yet
                </p>
              )}

              {selectedAddress ? (
                <p className="mt-3 text-[12.5px] leading-5 text-msr-muted">
                  <span className="font-semibold text-msr-ink">{selectedAddress.contactName}</span>
                  <br />
                  {selectedAddress.addressLine1}, {selectedAddress.city} {selectedAddress.postalCode}
                </p>
              ) : null}

              {!addingAddress ? (
                <button
                  type="button"
                  onClick={() => setAddingAddress(true)}
                  className="mt-3 inline-flex items-center gap-1 text-[12.5px] font-semibold text-msr-primary hover:underline"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add new address
                </button>
              ) : (
                <form onSubmit={saveAddress} className="mt-3 space-y-2 rounded-xl border border-msr-line bg-msr-surface p-3">
                  <input
                    className={SMALL_INPUT}
                    placeholder="Full name"
                    required
                    value={draft.contactName}
                    onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                  />
                  <input
                    className={SMALL_INPUT}
                    placeholder="Phone"
                    required
                    value={draft.phone}
                    onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                  />
                  <input
                    className={SMALL_INPUT}
                    placeholder="Street address"
                    required
                    value={draft.addressLine1}
                    onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))}
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <input
                      className={SMALL_INPUT}
                      placeholder="City"
                      required
                      value={draft.city}
                      onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                    />
                    <input
                      className={SMALL_INPUT}
                      placeholder="State"
                      required
                      value={draft.state}
                      onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                    />
                    <input
                      className={SMALL_INPUT}
                      placeholder="PIN"
                      required
                      value={draft.postalCode}
                      onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
                    />
                  </div>
                  {addrError ? <p className="text-xs text-msr-danger">{addrError}</p> : null}
                  <div className="flex gap-2 pt-1">
                    <Button type="submit" size="sm" className="flex-1">
                      Save address
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => setAddingAddress(false)} aria-label="Cancel">
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              )}
            </Panel>
          ) : (
            <div className="flex gap-3 rounded-2xl border border-msr-line bg-white p-4">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-msr-primary-soft text-msr-primary">
                <ShoppingBag className="h-4 w-4" />
              </span>
              <span>
                <span className="block text-sm font-bold text-msr-ink">Sign in to continue</span>
                <span className="mt-0.5 block text-[12.5px] leading-5 text-msr-muted">Save addresses, apply coupons and complete your order.</span>
              </span>
            </div>
          )}

          {user ? (
            <Panel
              icon={Tag}
              iconTone="success"
              title="Offers & coupons"
              action={
                coupons.length ? (
                  <button
                    type="button"
                    onClick={() => setShowAllCoupons((value) => !value)}
                    className="text-[12px] font-semibold text-msr-primary hover:underline"
                  >
                    {showAllCoupons ? "Hide" : `View ${coupons.length} offers`}
                  </button>
                ) : null
              }
            >
              {appliedNote ? (
                <div className="mb-3 flex items-center gap-2 rounded-lg bg-msr-success-soft px-3 py-2.5">
                  <Check className="h-4 w-4 shrink-0 text-msr-success" />
                  <p className="text-[12px] font-semibold text-msr-success-ink">{appliedNote}</p>
                </div>
              ) : null}

              <form
                onSubmit={onCoupon}
                className="flex overflow-hidden rounded-xl border border-msr-line-strong focus-within:border-msr-primary focus-within:ring-4 focus-within:ring-msr-primary/10"
              >
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Enter coupon code"
                  className="h-11 min-w-0 flex-1 bg-white px-3.5 text-sm font-semibold uppercase outline-none placeholder:font-normal placeholder:normal-case placeholder:text-msr-subtle"
                />
                <button type="submit" className="px-4 text-[13px] font-bold text-msr-primary transition hover:bg-msr-primary-soft">
                  Apply
                </button>
              </form>

              {couponMsg && couponMsg !== appliedNote ? <p className="mt-2 text-[12px] text-msr-muted">{couponMsg}</p> : null}

              {showAllCoupons ? (
                <ul className="mt-3 space-y-2">
                  {coupons.length ? (
                    coupons.map((row) => {
                      const active = couponCode === row.code && discount > 0;
                      return (
                        <li
                          key={row.code}
                          className={`rounded-xl border border-dashed px-3 py-3 ${
                            active ? "border-msr-success bg-msr-success-soft/60" : "border-msr-line-strong"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <p className="font-mono text-[12.5px] font-bold text-msr-ink">{row.code}</p>
                                {row.best ? (
                                  <span className="rounded bg-msr-success px-1.5 py-0.5 text-[9px] font-bold uppercase text-white">Best</span>
                                ) : null}
                              </div>
                              <p className="mt-0.5 text-[12px] text-msr-muted">{row.name}</p>
                              {row.eligible ? (
                                <p className="mt-1 text-[12px] font-semibold text-msr-success">Save {inr(row.savings)}</p>
                              ) : (
                                <p className="mt-1 text-[12px] text-msr-subtle">{row.reason}</p>
                              )}
                            </div>
                            {row.eligible ? (
                              <button
                                type="button"
                                onClick={() => pickCoupon(row)}
                                disabled={active}
                                className="shrink-0 rounded-lg px-2 py-1 text-[12px] font-bold text-msr-primary hover:bg-msr-primary-soft disabled:text-msr-success disabled:hover:bg-transparent"
                              >
                                {active ? "Applied" : "Apply"}
                              </button>
                            ) : null}
                          </div>
                        </li>
                      );
                    })
                  ) : (
                    <li className="py-2 text-center text-[12px] text-msr-subtle">No coupons available for this order.</li>
                  )}
                </ul>
              ) : null}
            </Panel>
          ) : null}

          <div className="overflow-hidden rounded-2xl border border-msr-line bg-white">
            <div className="p-5">
              <h2 className="text-[15px] font-bold text-msr-ink">Order summary</h2>
              <div className="mt-4">
                <SummaryRows
                  items={items}
                  couponCode={couponCode}
                  couponDiscount={discount}
                  delivery={delivery ? inr(delivery) : "Calculated at checkout"}
                  deliveryTone={delivery ? "default" : "muted"}
                  platformFee={platformFee}
                  partnerFee={partnerFee}
                />
              </div>

              <div className="my-4 border-t border-dashed border-msr-line-strong" />

              <div className="flex items-end justify-between gap-3">
                <div>
                  <p className="text-[14px] font-bold text-msr-ink">Total amount</p>
                  <p className="mt-0.5 text-[11px] text-msr-subtle">
                    Includes {tax ? `${inr(tax)} ` : ""}GST · delivery added at checkout
                  </p>
                </div>
                <p className="text-[22px] font-extrabold tracking-tight text-msr-ink">{inr(total)}</p>
              </div>

              {live ? <GstBreakup items={items} className="mt-3" /> : null}

              {totalSavings > 0 ? (
                <p className="mt-3 rounded-lg bg-msr-success-soft px-3 py-2 text-center text-[12.5px] font-semibold text-msr-success-ink">
                  You save {inr(totalSavings)} vs MRP {inr(mrp)}
                  {discount ? ` (incl. ${inr(discount)} coupon)` : ""}
                </p>
              ) : null}

              <Button size="lg" block className="mt-4" onClick={goCheckout} disabled={!live || hasIssues || Boolean(busyLine)}>
                {!live ? "Waiting for cart sync" : hasIssues ? "Fix cart items to continue" : user ? "Proceed to checkout" : "Sign in to checkout"}
                <ArrowRight className="h-4 w-4" />
              </Button>

              <p className="mt-3 flex items-center justify-center gap-1.5 text-[11.5px] text-msr-subtle">
                <ShieldCheck className="h-3.5 w-3.5" />
                Secure checkout · 100% genuine products
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}

const SMALL_INPUT =
  "h-10 w-full min-w-0 rounded-lg border border-msr-line-strong bg-white px-3 text-sm outline-none placeholder:text-msr-subtle focus:border-msr-primary";

function Panel({ icon: Icon, iconTone = "primary", title, action, children }) {
  return (
    <div className="overflow-hidden rounded-2xl border border-msr-line bg-white">
      <div className="flex items-center justify-between gap-3 border-b border-msr-line px-4 py-3.5">
        <div className="flex items-center gap-2.5">
          <span
            className={`grid h-8 w-8 place-items-center rounded-lg ${
              iconTone === "success" ? "bg-msr-success-soft text-msr-success" : "bg-msr-primary-soft text-msr-primary"
            }`}
          >
            <Icon className="h-4 w-4" />
          </span>
          <h2 className="text-[14px] font-bold text-msr-ink">{title}</h2>
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  );
}

function BulkLineNote({ item }) {
  const next = nextSlab(item.tierPrices, item.qty);
  return (
    <div className="mt-3 border-t border-dashed border-msr-line pt-3">
      <SlabStrip slabs={item.tierPrices} qty={item.qty} pack={item.pack} />
      <p className="mt-2 text-[11px] leading-4 text-msr-muted">
        {bulkRulesText(item)}
        {next ? (
          <span className="ml-1 font-semibold text-msr-primary-ink">
            · Add {next.minQty - item.qty} more for {inr(next.unitPrice)} each
          </span>
        ) : null}
      </p>
    </div>
  );
}
