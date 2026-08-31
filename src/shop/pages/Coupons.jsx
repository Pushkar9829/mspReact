import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Tag } from "lucide-react";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";

export default function Coupons() {
  const { user } = useAuth();
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(Boolean(user?.token));
  const [error, setError] = useState("");

  useEffect(() => {
    if (!user?.token) {
      setLoading(false);
      return undefined;
    }
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
  }, [user?.token]);

  if (!user) {
    return (
      <div className="msr-gutter py-16 text-center">
        <h1 className="text-2xl font-extrabold">Coupons</h1>
        <p className="mt-2 text-msr-muted">Sign in to see offers for your bag.</p>
        <Link to="/login" state={{ from: "/account/coupons" }} className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="msr-gutter py-8 md:py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Coupons</h1>
      <p className="mt-1 text-sm text-[#8b8ea3]">Available offers for your current bag</p>
      {error ? <p className="mt-4 text-sm text-msr-danger">{error}</p> : null}
      {loading ? <p className="mt-8 text-sm text-[#8b8ea3]">Loading coupons…</p> : null}

      {!loading && !coupons.length ? (
        <div className="mt-8 rounded-2xl border border-[#eceef4] bg-white px-6 py-12 text-center">
          <Tag className="mx-auto h-12 w-12 text-[#cfd3e2]" />
          <p className="mt-4 font-semibold text-[#1a1c3d]">No coupons yet</p>
          <p className="mt-1 text-sm text-msr-muted">Add items to your bag to see available coupons.</p>
          <Link to="/category/all" className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
            Continue shopping
          </Link>
        </div>
      ) : null}

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {coupons.map((row) => (
          <li key={row.code} className="rounded-2xl border border-[#eceef4] bg-white p-5">
            <p className="font-extrabold tracking-wide text-[#1a1c3d]">{row.code}</p>
            <p className="mt-1 text-sm text-[#6b7280]">
              {row.name}
              {row.minCartValue ? ` · min ${inr(row.minCartValue)}` : ""}
            </p>
            {row.eligible ? (
              <p className="mt-2 text-sm font-semibold text-msr-success">Save {inr(row.savings)}</p>
            ) : (
              <p className="mt-2 text-sm text-[#8b8ea3]">{row.reason}</p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
