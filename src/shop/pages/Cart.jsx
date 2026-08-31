import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ChevronDown, ShoppingBag, Tag, Trash2 } from "lucide-react";
import { useCart } from "../../shared/context/CartContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { getProduct } from "../../shared/data/catalog.js";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { QtyStepper } from "../../shared/components/ui.jsx";

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
  const { items, setQty, remove, subtotal, discount, delivery, tax, total, couponCode, applyCoupon, error, live } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [couponMsg, setCouponMsg] = useState("");
  const [coupons, setCoupons] = useState([]);
  const [showAll, setShowAll] = useState(false);
  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [addrError, setAddrError] = useState("");
  const manualCoupon = useRef(false);
  const couponRef = useRef(couponCode);
  const applyingBest = useRef(false);

  couponRef.current = couponCode;

  const selected = useMemo(
    () => addresses.find((a) => String(a._id) === String(addressId)) || addresses[0],
    [addresses, addressId]
  );

  const best = useMemo(() => coupons.find((c) => c.best && c.eligible) || null, [coupons]);

  useEffect(() => {
    if (!user?.token) return undefined;
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listAddresses();
        if (cancelled) return;
        const rows = Array.isArray(list) ? list : list.data || [];
        setAddresses(rows);
        const def = rows.find((a) => a.isDefault) || rows[0];
        if (def) setAddressId(def._id);
      } catch {
        /* addresses optional on cart */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [user?.token]);

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
            setCouponMsg(saved ? `${nextBest.code} applied · you save ${inr(saved)}` : "");
          } finally {
            applyingBest.current = false;
          }
        }
      } catch {
        /* coupons optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [items.length, subtotal, user?.token]);

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
      setCouponMsg(saved ? `${quoted.couponCode || next} applied · you save ${inr(saved)}` : "Coupon applied");
    } catch (err) {
      setCouponMsg(err.message || "Could not apply coupon");
    }
  }

  async function pickCoupon(row) {
    if (!row?.eligible) return;
    setCouponMsg("");
    try {
      manualCoupon.current = row.code !== best?.code;
      const quoted = await applyCoupon(row.code);
      const saved = quoted?.couponDiscount || 0;
      setCode("");
      setCouponMsg(saved ? `${row.code} applied · you save ${inr(saved)}` : "");
    } catch (err) {
      setCouponMsg(err.message || "Could not apply coupon");
    }
  }

  async function saveAddress(e) {
    e.preventDefault();
    setAddrError("");
    try {
      const created = await api.createAddress({ ...draft, isDefault: !addresses.length });
      setAddresses((prev) => [created, ...prev]);
      setAddressId(created._id);
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    } catch (err) {
      setAddrError(err.message);
    }
  }

  function goCheckout() {
    if (!user) {
      navigate("/login", { state: { from: "/checkout" } });
      return;
    }
    navigate("/checkout", { state: { addressId } });
  }

  if (!items.length) {
    return (
      <div className="msr-gutter py-16 text-center">
        <ShoppingBag className="mx-auto h-12 w-12 text-[#cfd3e2]" />
        <h1 className="mt-4 text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Your cart is empty</h1>
        <p className="mt-2 text-msr-muted">Add staples, snacks and home care to get started.</p>
        <Link to="/category/all" className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
          Continue shopping
        </Link>
      </div>
    );
  }

  const appliedNote =
    couponCode && discount
      ? `${couponCode === best?.code ? "Best coupon " : ""}${couponCode} applied · you save ${inr(discount)}`
      : "";

  return (
    <div className="msr-gutter py-6 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Shopping cart</h1>
        <Link to="/category/all" className="text-sm font-semibold text-[#0b1460]">
          Continue shopping
        </Link>
      </div>
      {error && !live ? <p className="mt-2 text-sm text-msr-danger">{error}</p> : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="min-w-0">
          <div className="hidden grid-cols-[minmax(0,1fr)_7.5rem_7rem_2.25rem] gap-3 border-b border-[#eceef4] pb-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b8ea3] lg:grid">
            <span>Product</span>
            <span>Quantity</span>
            <span>Total</span>
            <span className="sr-only">Remove</span>
          </div>

          <ul>
            {items.map((item) => {
              const product = getProduct(item.id);
              return (
                <li
                  key={(item.cartItemId || item.id) + item.pack}
                  className="grid grid-cols-1 gap-3 border-b border-[#eceef4] py-4 lg:grid-cols-[minmax(0,1fr)_7.5rem_7rem_2.25rem] lg:items-center"
                >
                  <div className="flex gap-3">
                    <Link to={`/product/${item.id}`} className="grid h-16 w-16 shrink-0 place-items-center bg-[#f7f8fc]">
                      <img src={item.image} alt="" className="h-full w-full object-contain" />
                    </Link>
                    <div className="min-w-0">
                      <Link to={`/product/${item.id}`} className="line-clamp-2 font-bold uppercase tracking-wide text-[#1a1c3d] hover:text-msr-accent">
                        {item.name}
                      </Link>
                      <p className="mt-1 text-[12px] text-[#8b8ea3]">
                        Pack: {item.pack}
                        {product?.brand ? ` · ${product.brand}` : ""}
                      </p>
                    </div>
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b8ea3] lg:hidden">Quantity</p>
                    <QtyStepper value={item.qty} onChange={(q) => setQty(item.id, item.pack, q)} size="sm" />
                  </div>

                  <div>
                    <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.14em] text-[#8b8ea3] lg:hidden">Total</p>
                    <p className="text-sm font-semibold text-[#1a1c3d]">{inr(item.lineTotal || item.price * item.qty)}</p>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => remove(item.id, item.pack)}
                      className="grid h-8 w-8 place-items-center text-[#8b8ea3] hover:text-msr-danger"
                      aria-label={`Remove ${item.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>

        <aside className="lg:sticky lg:top-24">
          <div className="border border-[#eceef4] bg-white p-4">
            {user ? (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#1a1c3d]">Delivery to</p>
                  <label className="relative mt-2 block">
                    <select
                      value={addressId}
                      onChange={(e) => setAddressId(e.target.value)}
                      className="h-10 w-full appearance-none rounded-md border border-[#eceef4] bg-white px-3 pr-8 text-sm"
                    >
                      {addresses.length ? (
                        addresses.map((a) => (
                          <option key={a._id} value={a._id}>
                            {a.label} · {a.city} {a.postalCode}
                          </option>
                        ))
                      ) : (
                        <option value="">No saved addresses</option>
                      )}
                    </select>
                    <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8ea3]" />
                  </label>
                  {selected ? (
                    <p className="mt-2 line-clamp-2 text-[12px] leading-5 text-[#6b7280]">
                      {selected.contactName}, {selected.addressLine1}, {selected.city} {selected.postalCode}
                    </p>
                  ) : null}
                  {adding ? (
                    <form onSubmit={saveAddress} className="mt-2 grid gap-2">
                      <input className="rounded-md border border-[#eceef4] px-3 py-2 text-sm" placeholder="Full name" required value={draft.contactName} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} />
                      <input className="rounded-md border border-[#eceef4] px-3 py-2 text-sm" placeholder="Phone" required value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
                      <input className="rounded-md border border-[#eceef4] px-3 py-2 text-sm" placeholder="Street address" required value={draft.addressLine1} onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))} />
                      <div className="grid grid-cols-3 gap-2">
                        <input className="rounded-md border border-[#eceef4] px-3 py-2 text-sm" placeholder="City" required value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
                        <input className="rounded-md border border-[#eceef4] px-3 py-2 text-sm" placeholder="State" required value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))} />
                        <input className="rounded-md border border-[#eceef4] px-3 py-2 text-sm" placeholder="PIN" required value={draft.postalCode} onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))} />
                      </div>
                      {addrError ? <p className="text-xs text-msr-danger">{addrError}</p> : null}
                      <div className="flex gap-2">
                        <button type="submit" className="flex-1 rounded-md bg-[#0b1460] py-2 text-xs font-bold uppercase tracking-wide text-white">
                          Save
                        </button>
                        <button type="button" onClick={() => setAdding(false)} className="px-3 text-xs font-semibold">
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button type="button" onClick={() => setAdding(true)} className="mt-2 text-[12px] font-semibold text-[#0b1460]">
                      + Add new address
                    </button>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-[13px] font-semibold text-[#1a1c3d]">Apply Coupon</p>
                    <button
                      type="button"
                      onClick={() => setShowAll((v) => !v)}
                      className="text-[11px] font-bold uppercase tracking-wide text-[#8b8ea3]"
                    >
                      {showAll ? "Hide" : "See all"}
                    </button>
                  </div>
                  {appliedNote ? <p className="mt-2 text-[12px] text-msr-success">{appliedNote}</p> : null}
                  <form onSubmit={onCoupon} className="mt-3 flex">
                    <label className="relative min-w-0 flex-1">
                      <Tag className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8ea3]" />
                      <input
                        value={code}
                        onChange={(e) => setCode(e.target.value)}
                        placeholder="Enter coupon code"
                        className="h-10 w-full border border-[#eceef4] px-9 text-sm uppercase outline-none"
                      />
                    </label>
                    <button type="submit" className="h-10 border border-l-0 border-[#eceef4] px-3 text-[11px] font-bold uppercase tracking-wide">
                      Apply
                    </button>
                  </form>
                  {couponMsg && couponMsg !== appliedNote ? <p className="mt-2 text-xs text-[#6b7280]">{couponMsg}</p> : null}
                  {showAll ? (
                    <ul className="mt-3 max-h-56 space-y-2 overflow-auto">
                      {coupons.length ? (
                        coupons.map((row) => {
                          const active = couponCode === row.code && discount > 0;
                          return (
                            <li key={row.code} className={`rounded-md border px-3 py-2 ${active ? "border-[#0b1460] bg-[#f7f8ff]" : "border-[#eceef4]"}`}>
                              <div className="flex items-start justify-between gap-2">
                                <div>
                                  <p className="text-sm font-bold text-[#1a1c3d]">{row.code}</p>
                                  <p className="text-[12px] text-[#6b7280]">
                                    {row.name}
                                    {row.minCartValue ? ` · min ${inr(row.minCartValue)}` : ""}
                                  </p>
                                  {row.eligible ? (
                                    <p className="mt-0.5 text-[12px] text-msr-success">Save {inr(row.savings)}</p>
                                  ) : (
                                    <p className="mt-0.5 text-[12px] text-[#8b8ea3]">{row.reason}</p>
                                  )}
                                </div>
                                {row.eligible ? (
                                  <button
                                    type="button"
                                    onClick={() => pickCoupon(row)}
                                    className="shrink-0 text-[11px] font-bold uppercase tracking-wide text-[#0b1460]"
                                  >
                                    {active ? "Applied" : row.best ? "Best" : "Apply"}
                                  </button>
                                ) : null}
                              </div>
                            </li>
                          );
                        })
                      ) : (
                        <li className="text-[12px] text-[#8b8ea3]">No coupons available for this bag.</li>
                      )}
                    </ul>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-[13px] leading-6 text-[#6b7280]">
                Sign in to add a delivery address, apply coupons, and complete checkout.
              </p>
            )}

            <hr className="my-4 border-[#eceef4]" />
            <h2 className="text-[15px] font-bold text-[#1a1c3d]">Bill Summary</h2>
            <dl className="mt-3 space-y-2 text-[13px]">
              <Row label="Item Total" value={inr(subtotal)} />
              <Row label={couponCode && discount ? `Coupon (${couponCode})` : "Coupon"} value={discount ? `− ${inr(discount)}` : "—"} />
              <Row label="Delivery" value={delivery ? inr(delivery) : "Free"} />
              {tax ? <Row label="GST" value={inr(tax)} /> : null}
            </dl>
            <div className="mt-3 flex justify-between border-t border-[#eceef4] pt-3 text-[15px] font-extrabold text-[#1a1c3d]">
              <span>Total</span>
              <span>{inr(total)}</span>
            </div>
            <button
              type="button"
              onClick={goCheckout}
              className="mt-4 block w-full rounded-md bg-[#0b1460] py-3 text-center text-[12px] font-bold uppercase tracking-[0.16em] text-white"
            >
              {user ? "Checkout" : "Sign in to check out"}
            </button>
            <Link to="/wishlist" className="mt-3 block text-center text-[12px] text-[#8b8ea3]">
              View wishlist
            </Link>
          </div>
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-[#6b7280]">{label}</dt>
      <dd className="font-medium text-[#1a1c3d]">{value}</dd>
    </div>
  );
}
