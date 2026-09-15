import { useEffect, useState } from "react";
import { MapPin, Pencil, Plus, Star, Trash2 } from "lucide-react";
import { api } from "../../shared/api.js";
import { AccountCard, AccountEmpty, AccountField, AccountHead, accountField } from "../components/accountUi.jsx";

const EMPTY_DRAFT = {
  label: "Home",
  contactName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  state: "",
  postalCode: "",
};

export default function Addresses() {
  const [addresses, setAddresses] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editingId, setEditingId] = useState("");
  const [draft, setDraft] = useState(EMPTY_DRAFT);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");

  useEffect(() => {
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
  }, []);

  function openCreate() {
    setEditingId("");
    setDraft(EMPTY_DRAFT);
    setFormOpen(true);
  }

  function openEdit(address) {
    setEditingId(address._id);
    setDraft({
      label: address.label || "Home",
      contactName: address.contactName || "",
      phone: address.phone || "",
      addressLine1: address.addressLine1 || "",
      addressLine2: address.addressLine2 || "",
      city: address.city || "",
      state: address.state || "",
      postalCode: address.postalCode || "",
    });
    setFormOpen(true);
  }

  async function save(e) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const payload = {
        ...draft,
        addressLine2: draft.addressLine2?.trim() || undefined,
      };
      if (editingId) {
        const updated = await api.updateAddress(editingId, payload);
        setAddresses((prev) => prev.map((a) => (String(a._id) === String(editingId) ? updated : a)));
      } else {
        const created = await api.createAddress({ ...payload, isDefault: !addresses.length });
        setAddresses((prev) => [created, ...prev]);
      }
      setFormOpen(false);
      setEditingId("");
      setDraft(EMPTY_DRAFT);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  async function remove(id) {
    if (!window.confirm("Remove this address?")) return;
    setBusyId(id);
    setError("");
    try {
      await api.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => String(a._id) !== String(id)));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  async function makeDefault(id) {
    setBusyId(id);
    setError("");
    try {
      const updated = await api.updateAddress(id, { isDefault: true });
      setAddresses((prev) =>
        prev.map((a) => ({
          ...(String(a._id) === String(id) ? updated : a),
          isDefault: String(a._id) === String(id),
        })),
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId("");
    }
  }

  return (
    <div>
      <AccountHead
        title="Addresses"
        subtitle="Home and shop delivery points used at checkout."
        action={
          !formOpen ? (
            <button
              type="button"
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 rounded-full bg-msr-navy px-4 py-2.5 text-sm font-bold text-white"
            >
              <Plus className="h-4 w-4" />
              Add address
            </button>
          ) : null
        }
      />

      {error ? <p className="mt-4 text-sm text-msr-danger">{error}</p> : null}
      {loading ? <p className="mt-8 text-sm text-[#8b8ea3]">Loading addresses…</p> : null}

      {!loading && !addresses.length && !formOpen ? (
        <AccountEmpty icon={MapPin} title="No addresses yet" text="Add a shop or home delivery point for faster checkout.">
          <button
            type="button"
            onClick={openCreate}
            className="inline-flex items-center gap-1.5 rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white"
          >
            <Plus className="h-4 w-4" />
            Add address
          </button>
        </AccountEmpty>
      ) : null}

      <ul className="mt-6 grid gap-3 md:grid-cols-2">
        {addresses.map((a) => (
          <li key={a._id}>
            <AccountCard className={a.isDefault ? "ring-1 ring-[#ead9a0]" : ""}>
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-[#fffaf0] text-[#8a6a12]">
                  <MapPin className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-extrabold text-msr-navy">{a.contactName}</p>
                    <span className="rounded-full bg-[#fffaf0] px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-[#8a6a12]">
                      {a.label || "Home"}
                    </span>
                    {a.isDefault ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-msr-success">
                        <Star className="h-3 w-3 fill-current" />
                        Default
                      </span>
                    ) : null}
                  </div>
                  <p className="mt-2 text-sm leading-6 text-[#6b7280]">
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
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                {!a.isDefault ? (
                  <button
                    type="button"
                    disabled={busyId === a._id}
                    onClick={() => makeDefault(a._id)}
                    className="rounded-full border border-[#ece6d4] px-3 py-1.5 text-[12px] font-bold text-msr-navy disabled:opacity-60"
                  >
                    Set default
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => openEdit(a)}
                  className="inline-flex items-center gap-1 rounded-full border border-[#ece6d4] px-3 py-1.5 text-[12px] font-bold text-msr-navy"
                >
                  <Pencil className="h-3.5 w-3.5" />
                  Edit
                </button>
                <button
                  type="button"
                  disabled={busyId === a._id}
                  onClick={() => remove(a._id)}
                  className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-[12px] font-bold text-msr-danger disabled:opacity-60"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Remove
                </button>
              </div>
            </AccountCard>
          </li>
        ))}
      </ul>

      {formOpen ? (
        <form onSubmit={save} className="mt-6">
          <AccountCard>
            <h2 className="text-sm font-extrabold text-msr-navy">{editingId ? "Edit address" : "Add address"}</h2>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <AccountField label="Label">
                <input
                  className={accountField}
                  placeholder="Home / Shop"
                  value={draft.label}
                  onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
                />
              </AccountField>
              <AccountField label="Full name">
                <input
                  className={accountField}
                  required
                  value={draft.contactName}
                  onChange={(e) => setDraft((d) => ({ ...d, contactName: e.target.value }))}
                />
              </AccountField>
              <AccountField label="Phone" className="sm:col-span-2">
                <input
                  className={accountField}
                  required
                  value={draft.phone}
                  onChange={(e) => setDraft((d) => ({ ...d, phone: e.target.value }))}
                />
              </AccountField>
            </div>
            <AccountField label="Street address" className="mt-3">
              <input
                className={accountField}
                required
                value={draft.addressLine1}
                onChange={(e) => setDraft((d) => ({ ...d, addressLine1: e.target.value }))}
              />
            </AccountField>
            <AccountField label="Landmark / line 2" className="mt-3">
              <input
                className={accountField}
                placeholder="Optional"
                value={draft.addressLine2}
                onChange={(e) => setDraft((d) => ({ ...d, addressLine2: e.target.value }))}
              />
            </AccountField>
            <div className="mt-3 grid gap-3 sm:grid-cols-3">
              <AccountField label="City">
                <input
                  className={accountField}
                  required
                  value={draft.city}
                  onChange={(e) => setDraft((d) => ({ ...d, city: e.target.value }))}
                />
              </AccountField>
              <AccountField label="State">
                <input
                  className={accountField}
                  required
                  value={draft.state}
                  onChange={(e) => setDraft((d) => ({ ...d, state: e.target.value }))}
                />
              </AccountField>
              <AccountField label="PIN">
                <input
                  className={accountField}
                  required
                  value={draft.postalCode}
                  onChange={(e) => setDraft((d) => ({ ...d, postalCode: e.target.value }))}
                />
              </AccountField>
            </div>
            <div className="mt-5 flex gap-2">
              <button
                type="submit"
                disabled={saving}
                className="rounded-full bg-msr-navy px-5 py-2.5 text-sm font-bold text-white disabled:opacity-60"
              >
                {saving ? "Saving…" : "Save address"}
              </button>
              <button type="button" onClick={() => setFormOpen(false)} className="px-3 text-sm font-bold text-[#6b7280]">
                Cancel
              </button>
            </div>
          </AccountCard>
        </form>
      ) : null}
    </div>
  );
}
