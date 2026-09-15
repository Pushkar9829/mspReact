import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Ticket, Tag } from "lucide-react";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { AccountEmpty, AccountHead, accountField } from "../components/accountUi.jsx";

function offerLabel(row) {
  if (row.type === "percent") return `${row.value}% off`;
  if (row.type === "fixed") return `${inr(row.value)} off`;
  return row.name;
}

export default function Coupons() {
  const navigate = useNavigate();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [code, setCode] = useState("");

  useEffect(() => {
    let cancelled = false;
    api
      .listCartCoupons()
      .then((res) => {
        if (!cancelled) setCoupons(res.coupons || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  async function apply(couponCode) {
    setBusy(couponCode);
    setError("");
    try {
      await api.applyCoupon(couponCode);
      navigate("/cart");
    } catch (err) {
      setError(err.message || "Could not apply coupon.");
    } finally {
      setBusy("");
    }
  }

  async function applyTyped(e) {
    e.preventDefault();
    const next = code.trim().toUpperCase();
    if (!next) return;
    await apply(next);
  }

  return (
    <div>
      <AccountHead title="Coupons" subtitle="Offers available for your current bag — apply a code or pick one below." />
      {error ? <p className="mt-4 text-sm text-msr-danger">{error}</p> : null}

      <form onSubmit={applyTyped} className="mt-5 flex flex-col gap-2 sm:flex-row">
        <input
          className={`${accountField} flex-1 uppercase tracking-[0.12em]`}
          placeholder="Enter coupon code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
        />
        <button
          type="submit"
          disabled={!code.trim() || Boolean(busy)}
          className="h-11 shrink-0 rounded-full bg-msr-navy px-5 text-sm font-bold text-white disabled:opacity-50"
        >
          {busy && busy === code.trim().toUpperCase() ? "Applying…" : "Apply code"}
        </button>
      </form>

      {loading ? <p className="mt-8 text-sm text-[#8b8ea3]">Loading coupons…</p> : null}

      {!loading && !coupons.length ? (
        <AccountEmpty
          icon={Tag}
          title="No coupons yet"
          text="Add items to your bag to see tenant offers, or enter a code above."
        >
          <Link to="/category/all" className="inline-flex rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white">
            Continue shopping
          </Link>
        </AccountEmpty>
      ) : null}

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {coupons.map((row) => (
          <li key={row.code}>
            <article className="relative overflow-hidden rounded-2xl border border-dashed border-[#ead9a0] bg-[#fffaf0] p-5">
              {row.best ? (
                <span className="absolute right-4 top-4 rounded-full bg-msr-gold px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-msr-navy">
                  Best
                </span>
              ) : null}
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-[#8a6a12] ring-1 ring-[#ead9a0]">
                  <Ticket className="h-5 w-5" />
                </span>
                <div className="min-w-0">
                  <p className="font-extrabold tracking-[0.14em] text-msr-navy">{row.code}</p>
                  <p className="mt-1 text-sm font-semibold text-[#8a6a12]">{offerLabel(row)}</p>
                  <p className="mt-1 text-sm text-[#6b7280]">
                    {row.name}
                    {row.minCartValue ? ` · min ${inr(row.minCartValue)}` : ""}
                  </p>
                </div>
              </div>
              {row.eligible ? (
                <p className="mt-3 text-sm font-semibold text-msr-success">Save {inr(row.savings)} on this bag</p>
              ) : (
                <p className="mt-3 text-sm text-[#8b8ea3]">{row.reason}</p>
              )}
              <button
                type="button"
                disabled={!row.eligible || busy === row.code}
                onClick={() => apply(row.code)}
                className="mt-4 rounded-full bg-msr-navy px-4 py-2 text-[12px] font-bold text-white disabled:opacity-40"
              >
                {busy === row.code ? "Applying…" : "Apply to bag"}
              </button>
            </article>
          </li>
        ))}
      </ul>
    </div>
  );
}
