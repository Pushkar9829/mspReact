import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { FIELD } from "../../shared/components/PanelKit.jsx";

const DEFAULT_PARTNERS = [
  { id: "msp", name: "MS₹ Delivery", fee: 0, isDefault: true },
  { id: "delhivery", name: "Delhivery", fee: 40, isDefault: false },
  { id: "bluedart", name: "Blue Dart", fee: 55, isDefault: false },
];

function settingValue(rows, key, fallback) {
  const row = (rows || []).find((item) => item.key === key);
  return row ? row.value : fallback;
}

export default function Settings() {
  const { data, error, loading, reload } = useApi(() => api.getMyTenant(), []);
  const settings = useApi(() => api.listSettings(), []);
  const [form, setForm] = useState({
    name: "",
    legalName: "",
    gstin: "",
    email: "",
    phone: "",
    website: "",
    minOrderValue: "",
  });
  const [commerce, setCommerce] = useState({
    feeEnabled: false,
    feeAmount: 10,
    feePercent: 0,
    partnerChoice: true,
    partners: DEFAULT_PARTNERS,
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

  useEffect(() => {
    const rows = Array.isArray(settings.data) ? settings.data : [];
    if (!rows.length && !settings.data) return;
    const partners = settingValue(rows, "platform.deliveryPartners", DEFAULT_PARTNERS);
    setCommerce({
      feeEnabled: Boolean(settingValue(rows, "platform.feeEnabled", false)),
      feeAmount: Number(settingValue(rows, "platform.feeAmount", 10)) || 0,
      feePercent: Number(settingValue(rows, "platform.feePercent", 0)) || 0,
      partnerChoice: Boolean(settingValue(rows, "platform.deliveryPartnerChoiceEnabled", true)),
      partners: Array.isArray(partners) && partners.length ? partners : DEFAULT_PARTNERS,
    });
  }, [settings.data]);

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
        <form
          className="mt-5 space-y-4 rounded-2xl bg-white p-6 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            try {
              await Promise.all([
                api.upsertSetting("platform.feeEnabled", commerce.feeEnabled),
                api.upsertSetting("platform.feeAmount", Number(commerce.feeAmount) || 0),
                api.upsertSetting("platform.feePercent", Number(commerce.feePercent) || 0),
                api.upsertSetting("platform.deliveryPartnerChoiceEnabled", commerce.partnerChoice),
                api.upsertSetting("platform.deliveryPartners", commerce.partners),
              ]);
              setMsg("Commerce settings saved.");
              settings.reload();
            } catch (err) {
              setMsg(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="text-lg font-extrabold">Platform fee & delivery partners</h2>
          <p className="text-sm text-msr-muted">Shown on checkout and order confirmation. Partner choice is optional for the buyer.</p>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={commerce.feeEnabled}
              onChange={(e) => setCommerce((prev) => ({ ...prev, feeEnabled: e.target.checked }))}
              className="h-4 w-4"
            />
            Charge platform fee
          </label>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm font-semibold">
              Flat fee (₹)
              <input
                type="number"
                min="0"
                value={commerce.feeAmount}
                onChange={(e) => setCommerce((prev) => ({ ...prev, feeAmount: e.target.value }))}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Percent of subtotal
              <input
                type="number"
                min="0"
                step="0.1"
                value={commerce.feePercent}
                onChange={(e) => setCommerce((prev) => ({ ...prev, feePercent: e.target.value }))}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
          </div>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={commerce.partnerChoice}
              onChange={(e) => setCommerce((prev) => ({ ...prev, partnerChoice: e.target.checked }))}
              className="h-4 w-4"
            />
            Let customer choose a delivery partner
          </label>
          <div className="space-y-3">
            {commerce.partners.map((partner, index) => (
              <div key={partner.id || index} className="grid gap-2 rounded-xl border border-[#eceef4] p-3 sm:grid-cols-[1fr_110px_auto]">
                <input
                  value={partner.name}
                  onChange={(e) =>
                    setCommerce((prev) => ({
                      ...prev,
                      partners: prev.partners.map((row, i) => (i === index ? { ...row, name: e.target.value } : row)),
                    }))
                  }
                  className={FIELD}
                />
                <input
                  type="number"
                  min="0"
                  value={partner.fee}
                  onChange={(e) =>
                    setCommerce((prev) => ({
                      ...prev,
                      partners: prev.partners.map((row, i) => (i === index ? { ...row, fee: Number(e.target.value) || 0 } : row)),
                    }))
                  }
                  className={FIELD}
                />
                <label className="flex items-center gap-2 text-xs font-semibold">
                  <input
                    type="radio"
                    name="defaultPartner"
                    checked={Boolean(partner.isDefault)}
                    onChange={() =>
                      setCommerce((prev) => ({
                        ...prev,
                        partners: prev.partners.map((row, i) => ({ ...row, isDefault: i === index })),
                      }))
                    }
                  />
                  Default
                </label>
              </div>
            ))}
          </div>
          <button type="submit" disabled={busy} className="rounded-xl bg-msr-navy px-5 py-3 font-bold text-white disabled:opacity-60">
            {busy ? "Saving…" : "Save fee & partners"}
          </button>
        </form>
      </PanelState>
    </div>
  );
}
