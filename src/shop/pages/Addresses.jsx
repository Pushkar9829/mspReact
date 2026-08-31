import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { api } from "../../shared/api.js";

const EMPTY_DRAFT = {
  label: "Shop",
  contactName: "",
  phone: "",
  addressLine1: "",
  city: "",
  state: "",
  postalCode: "",
};

export default function Addresses() {
  const { user } = useAuth();
  const [addresses, setAddresses] = useState([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(Boolean(user?.token));

  useEffect(() => {
    if (!user?.token) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    api
      .listAddresses()
      .then((list) => {
        if (!cancelled) setAddresses(Array.isArray(list) ? list : list.data || []);
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
        <h1 className="text-2xl font-extrabold">Addresses</h1>
        <p className="mt-2 text-msr-muted">Sign in to save shop and home delivery points.</p>
        <Link to="/login" state={{ from: "/account/addresses" }} className="mt-6 inline-flex rounded-xl bg-[#0b1460] px-5 py-3 text-sm font-semibold text-white">
          Sign in
        </Link>
      </div>
    );
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    try {
      const created = await api.createAddress({ ...draft, isDefault: !addresses.length });
      setAddresses((prev) => [created, ...prev]);
      setDraft(EMPTY_DRAFT);
      setAdding(false);
    } catch (err) {
      setError(err.message);
    }
  }

  async function remove(id) {
    try {
      await api.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => String(a._id) !== String(id)));
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="msr-gutter py-8 md:py-10">
      <h1 className="text-2xl font-extrabold tracking-tight text-[#1a1c3d]">Addresses</h1>
      <p className="mt-1 text-sm text-[#8b8ea3]">Home and shop delivery points</p>
      {error ? <p className="mt-4 text-sm text-msr-danger">{error}</p> : null}
      {loading ? <p className="mt-8 text-sm text-[#8b8ea3]">Loading addresses…</p> : null}

      {!loading && !addresses.length && !adding ? (
        <div className="mt-8 rounded-2xl border border-[#eceef4] bg-white px-6 py-12 text-center">
          <MapPin className="mx-auto h-12 w-12 text-[#cfd3e2]" />
          <p className="mt-4 font-semibold text-[#1a1c3d]">No addresses yet</p>
          <p className="mt-1 text-sm text-msr-muted">Add a shop or home delivery point.</p>
        </div>
      ) : null}

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a._id} className="rounded-2xl border border-[#eceef4] bg-white p-5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-bold text-[#1a1c3d]">
                  {a.contactName}
                  <span className="ml-2 text-[11px] font-semibold uppercase tracking-wide text-[#8b8ea3]">{a.label}</span>
                  {a.isDefault ? <span className="ml-2 text-[11px] font-semibold text-msr-success">Default</span> : null}
                </p>
                <p className="mt-2 leading-6 text-[#6b7280]">
                  {a.addressLine1}
                  {a.addressLine2 ? `, ${a.addressLine2}` : ""}
                  <br />
                  {a.city}, {a.state} {a.postalCode}
                  {a.phone ? (
                    <>
                      <br />
                      {a.phone}
                    </>
                  ) : null}
                </p>
              </div>
              <button type="button" onClick={() => remove(a._id)} className="text-[12px] font-semibold text-msr-danger">
                Remove
              </button>
            </div>
          </li>
        ))}
      </ul>

      {adding ? (
        <form onSubmit={save} className="mt-6 max-w-xl rounded-2xl border border-[#eceef4] bg-white p-5">
          <div className="grid gap-2 sm:grid-cols-2">
            <input className="rounded-md border border-[#eceef4] px-3 py-2.5 text-sm" placeholder="Full name" required value={draft.contactName} onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))} />
            <input className="rounded-md border border-[#eceef4] px-3 py-2.5 text-sm" placeholder="Phone" required value={draft.phone} onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))} />
          </div>
          <input className="mt-2 w-full rounded-md border border-[#eceef4] px-3 py-2.5 text-sm" placeholder="Street address" required value={draft.addressLine1} onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))} />
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            <input className="rounded-md border border-[#eceef4] px-3 py-2.5 text-sm" placeholder="City" required value={draft.city} onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))} />
            <input className="rounded-md border border-[#eceef4] px-3 py-2.5 text-sm" placeholder="State" required value={draft.state} onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))} />
            <input className="rounded-md border border-[#eceef4] px-3 py-2.5 text-sm" placeholder="PIN" required value={draft.postalCode} onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))} />
          </div>
          <div className="mt-3 flex gap-2">
            <button type="submit" className="rounded-md bg-[#0b1460] px-4 py-2 text-sm font-semibold text-white">
              Save address
            </button>
            <button type="button" onClick={() => setAdding(false)} className="px-3 text-sm font-semibold">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button type="button" onClick={() => setAdding(true)} className="mt-6 text-sm font-semibold text-[#0b1460]">
          + Add new address
        </button>
      )}
    </div>
  );
}
