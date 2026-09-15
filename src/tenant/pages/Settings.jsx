import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { FIELD } from "../../shared/components/PanelKit.jsx";

export default function Settings() {
  const { data, error, loading, reload } = useApi(() => api.getMyTenant(), []);
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    gstin: "",
    email: "",
    phone: "",
    website: "",
    minOrderValue: "",
  });
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!data) return;
    setForm({
      name: data.name || "",
      legalName: data.businessProfile?.legalName || "",
      gstin: data.businessProfile?.gstin || "",
      email: data.businessProfile?.email || "",
      phone: data.businessProfile?.phone || "",
      website: data.businessProfile?.website || "",
      minOrderValue: data.orderRules?.minOrderValue ?? "",
    });
  }, [data]);

  function setField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setMsg("");
    try {
      await api.updateMyTenant({
        name: form.name.trim(),
        businessProfile: {
          ...(data?.businessProfile || {}),
          legalName: form.legalName.trim(),
          gstin: form.gstin.trim(),
          email: form.email.trim(),
          phone: form.phone.trim(),
          website: form.website.trim(),
        },
        orderRules: {
          ...(data?.orderRules || {}),
          minOrderValue: Number(form.minOrderValue || 0),
        },
      });
      setMsg("Saved.");
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-xl">
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <p className="mt-1 text-sm text-msr-muted">Store profile, tax, and order rules.</p>
      <PanelState loading={loading} error={error}>
        <form onSubmit={save} className="mt-5 space-y-4 rounded-2xl bg-white p-6 shadow-sm">
          <label className="block text-sm font-semibold">
            Store name
            <input value={form.name} onChange={(e) => setField("name", e.target.value)} className={`mt-1 font-normal ${FIELD}`} />
          </label>
          <label className="block text-sm font-semibold">
            Legal name
            <input value={form.legalName} onChange={(e) => setField("legalName", e.target.value)} className={`mt-1 font-normal ${FIELD}`} />
          </label>
          <label className="block text-sm font-semibold">
            GSTIN
            <input value={form.gstin} onChange={(e) => setField("gstin", e.target.value)} className={`mt-1 font-normal ${FIELD}`} />
          </label>
          <label className="block text-sm font-semibold">
            Support email
            <input value={form.email} onChange={(e) => setField("email", e.target.value)} className={`mt-1 font-normal ${FIELD}`} />
          </label>
          <label className="block text-sm font-semibold">
            Support phone
            <input value={form.phone} onChange={(e) => setField("phone", e.target.value)} className={`mt-1 font-normal ${FIELD}`} />
          </label>
          <label className="block text-sm font-semibold">
            Website
            <input value={form.website} onChange={(e) => setField("website", e.target.value)} className={`mt-1 font-normal ${FIELD}`} />
          </label>
          <label className="block text-sm font-semibold">
            Minimum order value
            <input
              type="number"
              min="0"
              value={form.minOrderValue}
              onChange={(e) => setField("minOrderValue", e.target.value)}
              className={`mt-1 font-normal ${FIELD}`}
            />
          </label>
          {msg ? <p className="text-sm text-msr-muted">{msg}</p> : null}
          <button type="submit" disabled={busy} className="rounded-xl bg-msr-navy px-5 py-3 font-bold text-white disabled:opacity-60">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
      </PanelState>
    </div>
  );
}
