import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { FIELD, PanelTabs } from "../../shared/components/PanelKit.jsx";

const DEFAULT_PARTNERS = [
  { id: "msp", name: "MS₹ Delivery", fee: 0, isDefault: true },
  { id: "delhivery", name: "Delhivery", fee: 40, isDefault: false },
  { id: "bluedart", name: "Blue Dart", fee: 55, isDefault: false },
];

export default function Settings() {
  const { data, error, loading, reload } = useApi(() => api.getMyTenant(), []);
  const settings = useApi(() => api.getCommerce(), []);
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
  const [pickup, setPickup] = useState({
    contactName: "",
    phone: "",
    addressLine1: "",
    city: "",
    state: "",
    postalCode: "",
    formatted: "",
    latitude: null,
    longitude: null,
    placeId: "",
  });
  const [tab, setTab] = useState("store");
  const [mapQuery, setMapQuery] = useState("");
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
    const addr = data.pickupAddress || {};
    setPickup({
      contactName: addr.contactName || "",
      phone: addr.phone || "",
      addressLine1: addr.addressLine1 || "",
      city: addr.city || "",
      state: addr.state || "",
      postalCode: addr.postalCode || "",
      formatted: addr.formatted || "",
      latitude: addr.latitude ?? null,
      longitude: addr.longitude ?? null,
      placeId: addr.placeId || "",
    });
  }, [data]);

  const pickupQuery = [pickup.addressLine1, pickup.city, pickup.state, pickup.postalCode].filter(Boolean).join(", ");
  useEffect(() => {
    const timer = setTimeout(() => setMapQuery(pickupQuery), 350);
    return () => clearTimeout(timer);
  }, [pickupQuery]);

  useEffect(() => {
    const row = settings.data;
    if (!row || Array.isArray(row)) return;
    const partners = row.deliveryPartners;
    setCommerce({
      feeEnabled: Boolean(row.feeEnabled),
      feeAmount: Number(row.feeAmount) || 0,
      feePercent: Number(row.feePercent) || 0,
      partnerChoice: Boolean(row.deliveryPartnerChoiceEnabled),
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
    <div className={tab === "pickup" ? "max-w-4xl" : "max-w-xl"}>
      <h1 className="text-2xl font-extrabold">Settings</h1>
      <p className="mt-1 text-sm text-msr-muted">Store profile, pickup address, and order fees.</p>
      <PanelTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "store", label: "Store" },
          { id: "pickup", label: "Pickup" },
          { id: "fees", label: "Fees" },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-muted">{msg}</p> : null}
      <PanelState loading={loading} error={error}>
        {tab === "store" ? (
        <form onSubmit={save} className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm">
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
          <button type="submit" disabled={busy} className="rounded-lg bg-msr-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {busy ? "Saving…" : "Save changes"}
          </button>
        </form>
        ) : null}
        {tab === "pickup" ? (
        <form
          className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,20rem)_1fr]"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            try {
              const saved = await api.updateMyTenant({ pickupAddress: pickup });
              const addr = saved.pickupAddress || pickup;
              setPickup((prev) => ({
                ...prev,
                formatted: addr.formatted || prev.formatted,
                latitude: addr.latitude ?? prev.latitude,
                longitude: addr.longitude ?? prev.longitude,
                placeId: addr.placeId || prev.placeId,
              }));
              setMsg("Pickup address saved. Buyers see this pin when they choose store pickup.");
              reload();
            } catch (err) {
              setMsg(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <div className="space-y-3 rounded-xl bg-white p-4 shadow-sm">
            <h2 className="text-lg font-extrabold">Store pickup address</h2>
            <p className="text-sm text-msr-muted">The pin on the right is what buyers see on Google Maps.</p>
            {[
              ["contactName", "Contact name"],
              ["phone", "Phone"],
              ["addressLine1", "Street address"],
              ["city", "City"],
              ["state", "State"],
              ["postalCode", "PIN"],
            ].map(([key, label]) => (
              <label key={key} className="block text-sm font-semibold">
                {label}
                <input
                  value={pickup[key]}
                  onChange={(e) => setPickup((prev) => ({ ...prev, [key]: e.target.value }))}
                  className={`mt-1 font-normal ${FIELD}`}
                />
              </label>
            ))}
            <button type="submit" disabled={busy} className="rounded-lg bg-msr-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
              {busy ? "Saving…" : "Save pickup address"}
            </button>
          </div>
          <div className="overflow-hidden rounded-xl bg-white shadow-sm">
            {mapQuery ? (
              <>
                <iframe
                  title="Store pickup on Google Maps"
                  className="h-80 w-full border-0"
                  loading="lazy"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(mapQuery)}&z=16&output=embed`}
                />
                <div className="flex items-center justify-between gap-3 px-3 py-2">
                  <p className="text-[12px] text-msr-muted">{mapQuery}</p>
                  <a
                    className="shrink-0 text-[12px] font-semibold text-msr-purple"
                    href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(mapQuery)}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </div>
              </>
            ) : (
              <div className="grid h-80 place-items-center px-6 text-center text-[13px] text-msr-muted">
                Enter a street, city, or PIN. The store pin shows on Google Maps here.
              </div>
            )}
          </div>
        </form>
        ) : null}
        {tab === "fees" ? (
        <form
          className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm"
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
          {settings.error ? <p className="text-sm text-msr-danger">{settings.error}</p> : null}
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
          <button type="submit" disabled={busy || !settings.data} className="rounded-lg bg-msr-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-60">
            {busy ? "Saving…" : "Save fee & partners"}
          </button>
        </form>
        ) : null}
      </PanelState>
    </div>
  );
}
