import { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useCart } from "../../shared/context/CartContext.jsx";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { ChevronDown, ShieldCheck } from "lucide-react";

const PAYMENTS = [
  { id: "upi", label: "UPI" },
  { id: "card", label: "Card" },
  { id: "netbanking", label: "Net banking" },
  { id: "cod", label: "Cash on delivery" },
  { id: "purchase_order", label: "Purchase order" },
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
  const { items, subtotal, discount, delivery, tax, total, couponCode, refresh, live } = useCart();
  const location = useLocation();
  const navigate = useNavigate();
  const passedAddressId = location.state?.addressId || "";

  const [addresses, setAddresses] = useState([]);
  const [addressId, setAddressId] = useState(passedAddressId);
  const [pay, setPay] = useState("upi");
  const [poNumber, setPoNumber] = useState("");
  const [notes, setNotes] = useState("");
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [preview, setPreview] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const selected = useMemo(
    () => addresses.find((a) => String(a._id) === String(addressId)) || addresses[0],
    [addresses, addressId]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const list = await api.listAddresses();
        if (cancelled) return;
        const rows = Array.isArray(list) ? list : list.data || [];
        setAddresses(rows);
        setAddressId((current) => {
          if (current && rows.some((a) => String(a._id) === String(current))) return current;
          const def = rows.find((a) => a.isDefault) || rows[0];
          return def?._id || "";
        });
      } catch (err) {
        if (!cancelled) setError(err.message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!addressId) return;
    let cancelled = false;
    (async () => {
      try {
        const next = await api.previewCheckout(addressId);
        if (!cancelled) setPreview(next);
      } catch {
        if (!cancelled) setPreview(null);
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

  if (!items.length) {
    return (
      <div className="msr-gutter py-16 text-center">
        <h1 className="text-2xl font-extrabold">Nothing to checkout</h1>
        <Link to="/category/all" className="mt-4 inline-block font-semibold text-msr-accent">
          Browse products
        </Link>
      </div>
    );
  }

  async function saveAddress(e) {
    e.preventDefault();
    setError("");
    try {
      const created = await api.createAddress({ ...draft, isDefault: !addresses.length });
      setAddresses((prev) => [created, ...prev]);
      setAddressId(created._id);
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function placeOrder() {
    if (!addressId) {
      setError("Select a delivery address");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const key = `chk-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const result = await api.checkout(
        {
          addressId,
          paymentMethod: pay,
          poNumber: pay === "purchase_order" ? poNumber : "",
          buyerNotes: notes,
        },
        key
      );
      const orders = result.orders || [];
      const first = orders[0];
      await refresh();
      navigate(`/order/${first?._id || first?.orderNumber}`, { state: { orders } });
    } catch (err) {
      setError(err.message || "Could not place order");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="msr-gutter py-6 md:py-8">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-[12px] font-bold uppercase tracking-[0.16em] text-msr-accent">Checkout</p>
          <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Place your order</h1>
        </div>
        <Link to="/cart" className="text-sm font-semibold text-[#0b1460]">
          Back to cart
        </Link>
      </div>

      {error ? <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-msr-danger">{error}</p> : null}

      <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="space-y-4">
          <section className="border border-[#eceef4] bg-white p-4">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#1a1c3d]">Delivery to</h2>
            <label className="relative mt-3 block">
              <select
                value={addressId}
                onChange={(e) => setAddressId(e.target.value)}
                className="h-11 w-full appearance-none rounded-md border border-[#eceef4] bg-white px-3 pr-8 text-sm"
              >
                {addresses.length ? (
                  addresses.map((a) => (
                    <option key={a._id} value={a._id}>
                      {a.label} · {a.contactName} · {a.city} {a.postalCode}
                    </option>
                  ))
                ) : (
                  <option value="">No saved addresses</option>
                )}
              </select>
              <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8b8ea3]" />
            </label>
            {selected ? (
              <p className="mt-2 text-[13px] leading-5 text-[#6b7280]">
                {selected.addressLine1}
                {selected.addressLine2 ? `, ${selected.addressLine2}` : ""}, {selected.city}, {selected.state} {selected.postalCode}
                {selected.phone ? ` · ${selected.phone}` : ""}
              </p>
            ) : (
              <p className="mt-2 text-[13px] text-[#8b8ea3]">Add an address to continue.</p>
            )}
            {adding ? (
              <form onSubmit={saveAddress} className="mt-3 grid gap-2">
                <div className="grid gap-2 sm:grid-cols-2">
                  <Field value={draft.contactName} onChange={(v) => setDraft((d) => ({ ...d, contactName: v }))} placeholder="Full name" required />
                  <Field value={draft.phone} onChange={(v) => setDraft((d) => ({ ...d, phone: v }))} placeholder="Phone" required />
                </div>
                <Field value={draft.addressLine1} onChange={(v) => setDraft((d) => ({ ...d, addressLine1: v }))} placeholder="Street address" required />
                <div className="grid gap-2 sm:grid-cols-3">
                  <Field value={draft.city} onChange={(v) => setDraft((d) => ({ ...d, city: v }))} placeholder="City" required />
                  <Field value={draft.state} onChange={(v) => setDraft((d) => ({ ...d, state: v }))} placeholder="State" required />
                  <Field value={draft.postalCode} onChange={(v) => setDraft((d) => ({ ...d, postalCode: v }))} placeholder="Pincode" required />
                </div>
                <div className="flex gap-2">
                  <button type="submit" className="rounded-md bg-[#0b1460] px-4 py-2 text-sm font-semibold text-white">
                    Save address
                  </button>
                  <button type="button" onClick={() => setAdding(false)} className="px-3 py-2 text-sm font-semibold">
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <button type="button" onClick={() => setAdding(true)} className="mt-2 text-[12px] font-semibold text-[#0b1460]">
                + Add new address
              </button>
            )}
          </section>

          <section className="border border-[#eceef4] bg-white p-4">
            <h2 className="text-[13px] font-bold uppercase tracking-[0.12em] text-[#1a1c3d]">Payment</h2>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
              {PAYMENTS.map((p) => (
                <label
                  key={p.id}
                  className={`flex cursor-pointer items-center gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    pay === p.id ? "border-[#0b1460] bg-[#f7f8ff] font-semibold" : "border-[#eceef4]"
                  }`}
                >
                  <input type="radio" className="accent-[#0b1460]" checked={pay === p.id} onChange={() => setPay(p.id)} />
                  {p.label}
                </label>
              ))}
            </div>
            {pay === "purchase_order" ? (
              <input
                value={poNumber}
                onChange={(e) => setPoNumber(e.target.value)}
                placeholder="PO number"
                className="mt-3 w-full rounded-md border border-[#eceef4] px-3 py-2.5 text-sm"
              />
            ) : null}
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Delivery notes (optional)"
              className="mt-3 min-h-[64px] w-full rounded-md border border-[#eceef4] px-3 py-2.5 text-sm"
            />
          </section>
        </div>

        <aside className="lg:sticky lg:top-24">
          <div className="border border-[#eceef4] bg-white p-4">
            <h2 className="text-[15px] font-bold text-[#1a1c3d]">Bill Summary</h2>
            <ul className="mt-3 max-h-40 space-y-2 overflow-auto border-b border-[#eceef4] pb-3">
              {items.map((item) => (
                <li key={(item.cartItemId || item.id) + item.pack} className="flex gap-2 text-[13px]">
                  <img src={item.image} alt="" className="h-10 w-10 shrink-0 object-contain bg-[#f7f8fc]" />
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-1 font-medium text-[#1a1c3d]">{item.name}</p>
                    <p className="text-[12px] text-[#8b8ea3]">
                      {item.pack} × {item.qty}
                    </p>
                  </div>
                  <span className="shrink-0 font-semibold">{inr(item.lineTotal || item.price * item.qty)}</span>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-2 text-[13px]">
              <Row label="Item Total" value={inr(totals.subtotal)} />
              {totals.couponDiscount ? (
                <Row label={couponCode ? `Coupon (${couponCode})` : "Coupon"} value={`− ${inr(totals.couponDiscount)}`} />
              ) : null}
              {totals.tax ? <Row label="GST" value={inr(totals.tax)} /> : null}
              <Row label="Delivery" value={totals.deliveryFee ? inr(totals.deliveryFee) : "Free"} />
            </dl>
            <div className="mt-3 flex justify-between border-t border-[#eceef4] pt-3 text-[15px] font-extrabold text-[#1a1c3d]">
              <span>Total</span>
              <span>{inr(payable)}</span>
            </div>
            <button
              type="button"
              disabled={busy || !addressId}
              onClick={placeOrder}
              className="mt-4 w-full rounded-md bg-[#0b1460] py-3.5 text-[12px] font-bold uppercase tracking-[0.16em] text-white disabled:opacity-40"
            >
              {busy ? "Placing order…" : "Place order"}
            </button>
            <p className="mt-3 flex items-center gap-2 text-xs text-[#8b8ea3]">
              <ShieldCheck className="h-4 w-4 text-msr-success" /> GST invoice after confirmation
            </p>
            {!live ? <p className="mt-2 text-[11px] text-[#8b8ea3]">Using local cart if the API is offline.</p> : null}
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

function Field({ value, onChange, placeholder, required }) {
  return (
    <input
      value={value}
      required={required}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="rounded-md border border-[#eceef4] px-3 py-2.5 text-sm outline-none focus:border-msr-accent"
    />
  );
}
