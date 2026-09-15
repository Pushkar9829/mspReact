import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

import {
  ChevronDown,
  Check,
  MapPin,
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
import { QtyStepper } from "../components/shopUi.jsx";

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
    subtotal,
    discount,
    delivery,
    tax,
    total,
    couponCode,
    applyCoupon,
    error,
    live,
  } = useCart();

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
    if (!items.length) return undefined;

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

  /* -------------------------------------------------------
     EMPTY CART
  ------------------------------------------------------- */

  if (!items.length) {
    return (
      <div className="min-h-[70vh] bg-[#f7f8fa]">
        <div className="msr-gutter flex min-h-[70vh] items-center justify-center py-16">
          <div className="w-full max-w-md text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-white shadow-sm">
              <ShoppingBag className="h-9 w-9 text-[#c6cad8]" />
            </div>

            <h1 className="mt-6 text-2xl font-extrabold tracking-tight text-[#171a38]">
              Your cart is empty
            </h1>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-6 text-[#777c90]">
              Your everyday essentials are waiting.
              Explore groceries, snacks, household items and
              more.
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
                shadow-[0_5px_15px_rgba(11,20,96,0.18)]
                transition
                hover:-translate-y-0.5
                hover:bg-[#111b78]
              "
            >
              Continue shopping
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const appliedNote =
    couponCode && discount
      ? `${couponCode === bestCoupon?.code ? "Best coupon · " : ""}${couponCode} applied · you save ${inr(discount)}`
      : "";

  return (
    <div className="min-h-screen bg-[#f7f8fa]">
      <div className="msr-gutter py-6 sm:py-8 lg:py-10">

        {/* ==================================================
            HEADER
        ================================================== */}

        <div className="mb-7 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[#9296a7]">
              Shopping bag
            </p>

            <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#171a38] sm:text-3xl">
              Your cart
            </h1>

            <p className="mt-1 text-sm text-[#777c90]">
              {items.length}{" "}
              {items.length === 1 ? "item" : "items"} in your
              shopping bag
            </p>
          </div>

          <Link
            to="/category/all"
            className="
              inline-flex items-center gap-1.5
              text-sm font-bold
              text-[#0b1460]
              transition
              hover:text-msr-accent
            "
          >
            Continue shopping
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {error && !live ? (
          <div className="mb-5 rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-msr-danger">
            {error}
          </div>
        ) : null}

        {/* ==================================================
            MAIN LAYOUT
        ================================================== */}

        <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_390px]">

          {/* ==================================================
              LEFT — CART
          ================================================== */}

          <section className="min-w-0">

            <div className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white">

              {/* Cart heading */}

              <div className="flex items-center justify-between border-b border-[#eef0f4] px-4 py-4 sm:px-5">
                <div>
                  <h2 className="text-[15px] font-extrabold text-[#171a38]">
                    Cart items
                  </h2>

                  <p className="mt-0.5 text-xs text-[#9296a7]">
                    Review your items before checkout
                  </p>
                </div>

                <span className="rounded-full bg-[#f3f4f8] px-2.5 py-1 text-[11px] font-bold text-[#686d82]">
                  {items.length}
                </span>
              </div>

              {/* Products */}

              <ul className="divide-y divide-[#eef0f4]">
                {items.map((item) => {
                  const product = getProduct(item.id);

                  return (
                    <li
                      key={
                        (item.cartItemId || item.id) +
                        item.pack
                      }
                      className="group p-4 sm:p-5"
                    >
                      <div className="flex gap-3.5 sm:gap-5">

                        {/* Image */}

                        <Link
                          to={`/product/${item.id}`}
                          className="
                            relative
                            grid h-[92px] w-[92px]
                            shrink-0 place-items-center
                            overflow-hidden
                            rounded-xl
                            bg-[#f7f8fa]
                            sm:h-[112px] sm:w-[112px]
                          "
                        >
                          <img
                            src={
                              item.image ||
                              product?.image ||
                              "/products/product.png"
                            }
                            alt={item.name}
                            className="
                              h-full w-full
                              object-contain
                              p-2
                              transition-transform
                              duration-300
                              group-hover:scale-105
                            "
                            onError={(e) => {
                              e.currentTarget.src =
                                "/products/product.png";
                            }}
                          />
                        </Link>

                        {/* Details */}

                        <div className="flex min-w-0 flex-1 flex-col">

                          <div className="flex items-start justify-between gap-3">

                            <div className="min-w-0">

                              <Link
                                to={`/product/${item.id}`}
                                className="
                                  line-clamp-2
                                  text-[14px]
                                  font-bold
                                  leading-5
                                  text-[#171a38]
                                  transition-colors
                                  hover:text-msr-accent
                                  sm:text-[15px]
                                "
                              >
                                {item.name}
                              </Link>

                              <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1">
                                <span className="text-[12px] font-medium text-[#777c90]">
                                  {item.pack}
                                </span>

                                {product?.brand ? (
                                  <>
                                    <span className="text-[#d3d5dc]">
                                      •
                                    </span>

                                    <span className="text-[12px] text-[#777c90]">
                                      {product.brand}
                                    </span>
                                  </>
                                ) : null}
                              </div>

                            </div>

                            {/* Remove */}

                            <button
                              type="button"
                              onClick={() =>
                                remove(
                                  item.id,
                                  item.pack
                                )
                              }
                              className="
                                grid h-8 w-8
                                shrink-0
                                place-items-center
                                rounded-lg
                                text-[#a0a4b2]
                                transition
                                hover:bg-red-50
                                hover:text-msr-danger
                              "
                              aria-label={`Remove ${item.name}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>

                          </div>

                          {/* Bottom */}

                          <div className="mt-auto flex items-end justify-between gap-3 pt-4">

                            {/* Price */}

                            <div>
                              <p className="text-[15px] font-extrabold text-[#171a38] sm:text-[16px]">
                                {inr(
                                  item.lineTotal ||
                                    item.price * item.qty
                                )}
                              </p>

                              {item.qty > 1 ? (
                                <p className="mt-0.5 text-[10px] text-[#9296a7]">
                                  {inr(item.price)} each
                                </p>
                              ) : null}
                            </div>

                            {/* Quantity */}

                            <QtyStepper
                              value={item.qty}
                              onChange={(q) =>
                                setQty(
                                  item.id,
                                  item.pack,
                                  q
                                )
                              }
                              size="sm"
                            />

                          </div>

                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Continue shopping */}

              <div className="border-t border-[#eef0f4] bg-[#fafbfc] px-4 py-3 sm:px-5">
                <Link
                  to="/category/all"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#0b1460]"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Add more items
                </Link>
              </div>

            </div>

          </section>

          {/* ==================================================
              RIGHT — CHECKOUT
          ================================================== */}

          <aside className="min-w-0 xl:sticky xl:top-24">

            <div className="space-y-4">

              {/* ==================================================
                  DELIVERY
              ================================================== */}

              {user ? (
                <div className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white">

                  <div className="border-b border-[#eef0f4] px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#f0f2ff]">
                        <MapPin className="h-4 w-4 text-[#0b1460]" />
                      </div>

                      <div>
                        <h2 className="text-[14px] font-extrabold text-[#171a38]">
                          Delivery address
                        </h2>

                        <p className="text-[11px] text-[#9296a7]">
                          Where should we deliver?
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="p-4">

                    {addresses.length ? (
                      <label className="relative block">
                        <select
                          value={addressId}
                          onChange={(e) =>
                            setAddressId(e.target.value)
                          }
                          className="
                            h-12
                            w-full
                            appearance-none
                            rounded-xl
                            border
                            border-[#e4e6ec]
                            bg-white
                            px-3
                            pr-10
                            text-sm
                            font-semibold
                            text-[#252942]
                            outline-none
                            transition
                            focus:border-[#0b1460]
                            focus:ring-2
                            focus:ring-[#0b1460]/10
                          "
                        >
                          {addresses.map((address) => (
                            <option
                              key={address._id}
                              value={address._id}
                            >
                              {address.label} ·{" "}
                              {address.city}{" "}
                              {address.postalCode}
                            </option>
                          ))}
                        </select>

                        <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#85899b]" />
                      </label>
                    ) : (
                      <div className="rounded-xl border border-dashed border-[#dfe1e8] bg-[#fafbfc] px-4 py-4 text-center">
                        <MapPin className="mx-auto h-5 w-5 text-[#a4a8b6]" />

                        <p className="mt-2 text-xs font-semibold text-[#686d82]">
                          No saved address
                        </p>
                      </div>
                    )}

                    {selectedAddress ? (
                      <div className="mt-3 rounded-xl bg-[#f8f9fb] px-3.5 py-3">
                        <div className="flex items-start gap-2">
                          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-msr-success" />

                          <p className="text-[12px] leading-5 text-[#686d82]">
                            <span className="font-bold text-[#303449]">
                              {selectedAddress.contactName}
                            </span>
                            <br />
                            {selectedAddress.addressLine1},{" "}
                            {selectedAddress.city}{" "}
                            {selectedAddress.postalCode}
                          </p>
                        </div>
                      </div>
                    ) : null}

                    {!addingAddress ? (
                      <button
                        type="button"
                        onClick={() => setAddingAddress(true)}
                        className="
                          mt-3
                          inline-flex
                          items-center
                          gap-1
                          text-xs
                          font-bold
                          text-[#0b1460]
                        "
                      >
                        <Plus className="h-3.5 w-3.5" />
                        Add new address
                      </button>
                    ) : (
                      <form
                        onSubmit={saveAddress}
                        className="mt-3 space-y-2.5 rounded-xl border border-[#e9eaf0] bg-[#fafbfc] p-3"
                      >
                        <input
                          className="h-10 w-full rounded-lg border border-[#e4e6ec] bg-white px-3 text-sm outline-none focus:border-[#0b1460]"
                          placeholder="Full name"
                          required
                          value={draft.contactName}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              contactName:
                                e.target.value,
                            }))
                          }
                        />

                        <input
                          className="h-10 w-full rounded-lg border border-[#e4e6ec] bg-white px-3 text-sm outline-none focus:border-[#0b1460]"
                          placeholder="Phone"
                          required
                          value={draft.phone}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              phone: e.target.value,
                            }))
                          }
                        />

                        <input
                          className="h-10 w-full rounded-lg border border-[#e4e6ec] bg-white px-3 text-sm outline-none focus:border-[#0b1460]"
                          placeholder="Street address"
                          required
                          value={draft.addressLine1}
                          onChange={(e) =>
                            setDraft((d) => ({
                              ...d,
                              addressLine1:
                                e.target.value,
                            }))
                          }
                        />

                        <div className="grid grid-cols-3 gap-2">
                          <input
                            className="h-10 min-w-0 rounded-lg border border-[#e4e6ec] bg-white px-2 text-sm outline-none focus:border-[#0b1460]"
                            placeholder="City"
                            required
                            value={draft.city}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                city: e.target.value,
                              }))
                            }
                          />

                          <input
                            className="h-10 min-w-0 rounded-lg border border-[#e4e6ec] bg-white px-2 text-sm outline-none focus:border-[#0b1460]"
                            placeholder="State"
                            required
                            value={draft.state}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                state: e.target.value,
                              }))
                            }
                          />

                          <input
                            className="h-10 min-w-0 rounded-lg border border-[#e4e6ec] bg-white px-2 text-sm outline-none focus:border-[#0b1460]"
                            placeholder="PIN"
                            required
                            value={draft.postalCode}
                            onChange={(e) =>
                              setDraft((d) => ({
                                ...d,
                                postalCode:
                                  e.target.value,
                              }))
                            }
                          />
                        </div>

                        {addrError ? (
                          <p className="text-xs text-msr-danger">
                            {addrError}
                          </p>
                        ) : null}

                        <div className="flex gap-2 pt-1">
                          <button
                            type="submit"
                            className="
                              flex-1
                              rounded-lg
                              bg-[#0b1460]
                              py-2.5
                              text-xs
                              font-bold
                              text-white
                            "
                          >
                            Save address
                          </button>

                          <button
                            type="button"
                            onClick={() =>
                              setAddingAddress(false)
                            }
                            className="
                              grid w-10
                              place-items-center
                              rounded-lg
                              border
                              border-[#e4e6ec]
                              bg-white
                            "
                            aria-label="Cancel"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </form>
                    )}

                  </div>
                </div>
              ) : (
                <div className="rounded-2xl border border-[#e9eaf0] bg-white p-4">
                  <div className="flex gap-3">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-[#f0f2ff]">
                      <ShoppingBag className="h-4 w-4 text-[#0b1460]" />
                    </div>

                    <div>
                      <p className="text-sm font-bold text-[#171a38]">
                        Sign in to continue
                      </p>

                      <p className="mt-1 text-xs leading-5 text-[#777c90]">
                        Save your address, apply coupons and
                        complete your order.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* ==================================================
                  COUPONS
              ================================================== */}

              {user ? (
                <div className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white">

                  <div className="flex items-center justify-between border-b border-[#eef0f4] px-4 py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="grid h-8 w-8 place-items-center rounded-lg bg-[#fff6e5]">
                        <Tag className="h-4 w-4 text-[#a56a00]" />
                      </div>

                      <div>
                        <h2 className="text-[14px] font-extrabold text-[#171a38]">
                          Offers & coupons
                        </h2>

                        <p className="text-[11px] text-[#9296a7]">
                          Save more on your order
                        </p>
                      </div>
                    </div>

                    {coupons.length ? (
                      <button
                        type="button"
                        onClick={() =>
                          setShowAllCoupons(
                            (value) => !value
                          )
                        }
                        className="text-[11px] font-bold text-[#0b1460]"
                      >
                        {showAllCoupons
                          ? "Hide"
                          : `${coupons.length} offers`}
                      </button>
                    ) : null}
                  </div>

                  <div className="p-4">

                    {appliedNote ? (
                      <div className="mb-3 flex items-center gap-2 rounded-lg bg-[#eef8e8] px-3 py-2.5">
                        <Check className="h-4 w-4 shrink-0 text-msr-success" />

                        <p className="text-[11px] font-semibold text-[#47720f]">
                          {appliedNote}
                        </p>
                      </div>
                    ) : null}

                    <form
                      onSubmit={onCoupon}
                      className="flex overflow-hidden rounded-xl border border-[#dfe2e9] focus-within:border-[#0b1460] focus-within:ring-2 focus-within:ring-[#0b1460]/10"
                    >
                      <div className="relative min-w-0 flex-1">
                        <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a0a4b2]" />

                        <input
                          value={code}
                          onChange={(e) =>
                            setCode(e.target.value)
                          }
                          placeholder="Enter coupon code"
                          className="
                            h-11
                            w-full
                            bg-white
                            px-9
                            text-sm
                            font-semibold
                            uppercase
                            outline-none
                            placeholder:normal-case
                            placeholder:font-normal
                            placeholder:text-[#a0a4b2]
                          "
                        />
                      </div>

                      <button
                        type="submit"
                        className="
                          bg-[#f5f6f9]
                          px-4
                          text-xs
                          font-extrabold
                          text-[#0b1460]
                          transition
                          hover:bg-[#0b1460]
                          hover:text-white
                        "
                      >
                        Apply
                      </button>
                    </form>

                    {couponMsg &&
                    couponMsg !== appliedNote ? (
                      <p className="mt-2 text-[11px] font-medium text-[#777c90]">
                        {couponMsg}
                      </p>
                    ) : null}

                    {showAllCoupons ? (
                      <ul className="mt-3 space-y-2">
                        {coupons.length ? (
                          coupons.map((row) => {
                            const active =
                              couponCode === row.code &&
                              discount > 0;

                            return (
                              <li
                                key={row.code}
                                className={`
                                  rounded-xl
                                  border
                                  px-3 py-3
                                  ${
                                    active
                                      ? "border-[#0b1460] bg-[#f6f7ff]"
                                      : "border-[#eceef3]"
                                  }
                                `}
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-extrabold text-[#171a38]">
                                        {row.code}
                                      </p>

                                      {row.best ? (
                                        <span className="rounded-full bg-[#eef8e8] px-1.5 py-0.5 text-[8px] font-extrabold uppercase text-[#47720f]">
                                          Best
                                        </span>
                                      ) : null}
                                    </div>

                                    <p className="mt-0.5 text-[11px] text-[#777c90]">
                                      {row.name}
                                    </p>

                                    {row.eligible ? (
                                      <p className="mt-1 text-[11px] font-semibold text-msr-success">
                                        Save {inr(row.savings)}
                                      </p>
                                    ) : (
                                      <p className="mt-1 text-[11px] text-[#9a9eac]">
                                        {row.reason}
                                      </p>
                                    )}
                                  </div>

                                  {row.eligible ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        pickCoupon(row)
                                      }
                                      className="shrink-0 text-[10px] font-extrabold text-[#0b1460]"
                                    >
                                      {active
                                        ? "Applied"
                                        : "Apply"}
                                    </button>
                                  ) : null}
                                </div>
                              </li>
                            );
                          })
                        ) : (
                          <li className="py-2 text-center text-xs text-[#9296a7]">
                            No coupons available for this order.
                          </li>
                        )}
                      </ul>
                    ) : null}

                  </div>
                </div>
              ) : null}

              {/* ==================================================
                  BILL SUMMARY
              ================================================== */}

              <div className="overflow-hidden rounded-2xl border border-[#e9eaf0] bg-white">

                <div className="px-4 py-4">
                  <h2 className="text-[15px] font-extrabold text-[#171a38]">
                    Bill summary
                  </h2>

                  <dl className="mt-4 space-y-3">
                    <SummaryRow
                      label={`Item total (${items.length})`}
                      value={inr(subtotal)}
                    />

                    <SummaryRow
                      label={
                        couponCode && discount
                          ? `Coupon (${couponCode})`
                          : "Coupon discount"
                      }
                      value={
                        discount
                          ? `− ${inr(discount)}`
                          : "—"
                      }
                      success={Boolean(discount)}
                    />

                    <SummaryRow
                      label="Delivery"
                      value={
                        delivery
                          ? inr(delivery)
                          : "FREE"
                      }
                      success={!delivery}
                    />

                    {tax ? (
                      <SummaryRow
                        label="GST"
                        value={inr(tax)}
                      />
                    ) : null}
                  </dl>

                  <div className="my-4 border-t border-dashed border-[#dfe2e8]" />

                  <div className="flex items-end justify-between gap-3">
                    <div>
                      <p className="text-[13px] font-semibold text-[#777c90]">
                        Total amount
                      </p>

                      <p className="mt-1 text-[10px] text-[#a0a4b2]">
                        Inclusive of applicable taxes
                      </p>
                    </div>

                    <p className="text-xl font-extrabold tracking-tight text-[#171a38]">
                      {inr(total)}
                    </p>
                  </div>

                  {/* Checkout */}

                  <button
                    type="button"
                    onClick={goCheckout}
                    className="
                      mt-5
                      flex h-12 w-full
                      items-center justify-center
                      gap-2
                      rounded-xl
                      bg-[#0b1460]
                      text-sm
                      font-extrabold
                      text-white
                      shadow-[0_6px_18px_rgba(11,20,96,0.18)]
                      transition-all
                      hover:-translate-y-0.5
                      hover:bg-[#111b78]
                      hover:shadow-[0_9px_24px_rgba(11,20,96,0.22)]
                      active:translate-y-0
                    "
                  >
                    {user
                      ? "Proceed to checkout"
                      : "Sign in to checkout"}

                    <ArrowRight className="h-4 w-4" />
                  </button>

                  <p className="mt-3 text-center text-[10px] leading-4 text-[#a0a4b2]">
                    Secure checkout · Your order is protected
                  </p>
                </div>

              </div>

            </div>
          </aside>
        </div>
      </div>
    </div>
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
      <dt className="min-w-0 text-[#777c90]">
        {label}
      </dt>

      <dd
        className={
          success
            ? "shrink-0 font-bold text-msr-success"
            : "shrink-0 font-semibold text-[#303449]"
        }
      >
        {value}
      </dd>
    </div>
  );
}
