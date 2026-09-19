import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { FIELD, PanelToolbar } from "../../shared/components/PanelKit.jsx";

function parseValue(raw) {
  const text = String(raw ?? "").trim();
  if (text === "true") return true;
  if (text === "false") return false;
  if (/^-?\d+(\.\d+)?$/.test(text)) return Number(text);
  if ((text.startsWith("{") && text.endsWith("}")) || (text.startsWith("[") && text.endsWith("]"))) {
    try {
      return JSON.parse(text);
    } catch {
      return raw;
    }
  }
  return raw;
}

function displayValue(value) {
  if (value == null) return "";
  if (typeof value === "string") return value;
  return JSON.stringify(value);
}

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
  const { q, setQ, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(
    () => api.listSettings(query.q ? { q: query.q } : {}),
    [query.q]
  );
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [commerce, setCommerce] = useState({
    feeEnabled: false,
    feeAmount: 10,
    feePercent: 0,
    partnerChoice: true,
    partners: DEFAULT_PARTNERS,
  });

  useEffect(() => {
    if (Array.isArray(data)) {
      setRows(data);
      const partners = settingValue(data, "platform.deliveryPartners", DEFAULT_PARTNERS);
      setCommerce({
        feeEnabled: Boolean(settingValue(data, "platform.feeEnabled", false)),
        feeAmount: Number(settingValue(data, "platform.feeAmount", 10)) || 0,
        feePercent: Number(settingValue(data, "platform.feePercent", 0)) || 0,
        partnerChoice: Boolean(settingValue(data, "platform.deliveryPartnerChoiceEnabled", true)),
        partners: Array.isArray(partners) && partners.length ? partners : DEFAULT_PARTNERS,
      });
    }
  }, [data]);

  async function save(key, value) {
    setMsg("");
    try {
      const updated = await api.upsertSetting(key, parseValue(value));
      setRows((prev) => {
        const exists = prev.some((row) => row.key === key);
        if (!exists) return [...prev, updated].sort((a, b) => a.key.localeCompare(b.key));
        return prev.map((row) => (row.key === key ? updated : row));
      });
      setMsg("Saved.");
    } catch (err) {
      setMsg(err.message);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-extrabold">Platform settings</h1>
      <p className="mt-1 text-sm text-msr-muted">Platform-scoped keys only. Blur a field or add a new key to save.</p>
      <PanelToolbar search={q} onSearch={setQ} searchPlaceholder="Setting key" onReset={reset} />
      <PanelState loading={loading && !data} error={error}>
        <form
          className="mt-4 space-y-4 rounded-2xl bg-white p-6 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            try {
              await Promise.all([
                api.upsertSetting("platform.feeEnabled", Boolean(commerce.feeEnabled)),
                api.upsertSetting("platform.feeAmount", Number(commerce.feeAmount) || 0),
                api.upsertSetting("platform.feePercent", Number(commerce.feePercent) || 0),
                api.upsertSetting("platform.deliveryPartnerChoiceEnabled", Boolean(commerce.partnerChoice)),
                api.upsertSetting("platform.deliveryPartners", commerce.partners),
              ]);
              setMsg("Commerce settings saved.");
              reload();
            } catch (err) {
              setMsg(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="text-lg font-extrabold">Platform fee & delivery partners</h2>
          <p className="text-sm font-normal text-msr-muted">Buyer sees these charges on checkout and order confirmation. Partner pick is optional.</p>
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
              <div key={partner.id || index} className="grid gap-2 rounded-xl border border-msr-border p-3 sm:grid-cols-[1fr_110px_auto]">
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
          <button type="submit" disabled={busy} className="rounded-xl bg-msr-navy px-5 py-3 font-bold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save fee & partners"}
          </button>
        </form>
        <form
          className="mt-4 space-y-4 rounded-2xl bg-white p-6 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            const form = new FormData(e.currentTarget);
            const key = String(form.get("key") || "").trim();
            const value = String(form.get("value") || "").trim();
            if (!key) return;
            setBusy(true);
            await save(key, value);
            setBusy(false);
            e.currentTarget.reset();
            reload();
          }}
        >
          {(rows.length ? rows : []).map((row) => (
            <label key={row._id || row.key} className="block text-sm font-semibold">
              {row.key}
              <input
                defaultValue={displayValue(row.value)}
                onBlur={(e) => {
                  if (displayValue(row.value) !== e.target.value) save(row.key, e.target.value);
                }}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
          ))}
          {!rows.length ? <p className="text-sm text-msr-muted">No platform settings yet.</p> : null}
          <div className="grid gap-2 border-t border-msr-border pt-4">
            <p className="text-xs font-bold uppercase tracking-wide text-msr-muted">Add key</p>
            <input name="key" placeholder="setting key" className={FIELD} />
            <input name="value" placeholder="value (JSON allowed)" className={FIELD} />
            <button type="submit" disabled={busy} className="rounded-xl bg-msr-navy px-5 py-3 font-bold text-white disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
          {msg ? <p className="text-sm text-msr-muted">{msg}</p> : null}
        </form>
      </PanelState>
    </div>
  );
}
