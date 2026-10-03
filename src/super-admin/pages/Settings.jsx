import { useEffect, useState } from "react";
import { api } from "../../shared/api.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { FIELD, PanelTabs, PanelToolbar } from "../../shared/components/PanelKit.jsx";

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

function toLocalInput(value) {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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
  const [tab, setTab] = useState("fees");
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [festival, setFestival] = useState({ enabled: false, title: "", message: "", startsAt: "", endsAt: "" });
  const [commerce, setCommerce] = useState({
    feeEnabled: false,
    feeAmount: 10,
    feePercent: 0,
    partnerChoice: true,
    partners: DEFAULT_PARTNERS,
    codEnabled: true,
    returnsEnabled: true,
    returnWindowDays: 7,
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
        codEnabled: settingValue(data, "payments.codEnabled", true) !== false,
        returnsEnabled: settingValue(data, "returns.enabled", true) !== false,
        returnWindowDays: Number(settingValue(data, "returns.windowDays", 7)) || 7,
      });
      const wish = settingValue(data, "platform.festival", null);
      if (wish && typeof wish === "object") {
        setFestival({
          enabled: Boolean(wish.enabled),
          title: wish.title || "",
          message: wish.message || "",
          startsAt: toLocalInput(wish.startsAt),
          endsAt: toLocalInput(wish.endsAt),
        });
      }
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
      <p className="mt-1 text-sm text-msr-muted">Fees, festival wishes, and platform keys.</p>
      <PanelTabs
        value={tab}
        onChange={setTab}
        tabs={[
          { id: "fees", label: "Fees" },
          { id: "festival", label: "Festival" },
          { id: "keys", label: "Keys" },
        ]}
      />
      {tab === "keys" ? <PanelToolbar search={q} onSearch={setQ} searchPlaceholder="Setting key" onReset={reset} /> : null}
      {msg ? <p className="mt-3 text-sm text-msr-muted">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error}>
        {tab === "fees" ? (
        <form
          className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm"
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
                api.upsertSetting("payments.codEnabled", Boolean(commerce.codEnabled)),
                api.upsertSetting("returns.enabled", Boolean(commerce.returnsEnabled)),
                api.upsertSetting("returns.windowDays", Math.min(90, Math.max(1, Number(commerce.returnWindowDays) || 7))),
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
          <div className="rounded-xl border border-msr-border p-3">
            <h3 className="text-sm font-extrabold">Payment methods</h3>
            <label className="mt-2 flex items-start gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={commerce.codEnabled}
                onChange={(e) => setCommerce((prev) => ({ ...prev, codEnabled: e.target.checked }))}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Allow Cash on Delivery
                <span className="block text-xs font-normal text-msr-muted">
                  When off, no store can take COD. When on, each store can still switch COD off for itself.
                </span>
              </span>
            </label>
          </div>
          <div className="rounded-xl border border-msr-border p-3">
            <h3 className="text-sm font-extrabold">Return policy</h3>
            <label className="mt-2 flex items-start gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={commerce.returnsEnabled}
                onChange={(e) => setCommerce((prev) => ({ ...prev, returnsEnabled: e.target.checked }))}
                className="mt-0.5 h-4 w-4"
              />
              <span>
                Allow returns
                <span className="block text-xs font-normal text-msr-muted">
                  Applies to every store. Buyers can return items marked “Easy return”; the store approves (refund) or rejects.
                </span>
              </span>
            </label>
            <label className="mt-3 block text-sm font-semibold">
              Return window (days after delivery)
              <input
                type="number"
                min="1"
                max="90"
                value={commerce.returnWindowDays}
                disabled={!commerce.returnsEnabled}
                onChange={(e) => setCommerce((prev) => ({ ...prev, returnWindowDays: e.target.value }))}
                className={`mt-1 max-w-[160px] font-normal ${FIELD}`}
              />
            </label>
          </div>
          <button type="submit" disabled={busy} className="rounded-lg bg-msr-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save fees, partners, payments & returns"}
          </button>
        </form>
        ) : null}
        {tab === "festival" ? (
        <form
          className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            setMsg("");
            try {
              await api.upsertSetting("platform.festival", {
                enabled: festival.enabled,
                title: festival.title.trim(),
                message: festival.message.trim(),
                startsAt: festival.startsAt ? new Date(festival.startsAt).toISOString() : null,
                endsAt: festival.endsAt ? new Date(festival.endsAt).toISOString() : null,
              });
              setMsg("Festival wish saved. Shoppers see it while it is enabled and inside the dates.");
              reload();
            } catch (err) {
              setMsg(err.message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <h2 className="text-lg font-extrabold">Festival wishes</h2>
          <p className="text-sm font-normal text-msr-muted">A banner on the shop for Diwali, Holi, Eid and any other celebration.</p>
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input
              type="checkbox"
              checked={festival.enabled}
              onChange={(e) => setFestival((prev) => ({ ...prev, enabled: e.target.checked }))}
              className="h-4 w-4"
            />
            Show this wish in the app
          </label>
          <input
            value={festival.title}
            onChange={(e) => setFestival((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Title, for example Happy Diwali"
            className={FIELD}
          />
          <textarea
            value={festival.message}
            onChange={(e) => setFestival((prev) => ({ ...prev, message: e.target.value }))}
            rows={3}
            placeholder="Wish message"
            className={FIELD}
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">
              Starts
              <input
                type="datetime-local"
                value={festival.startsAt}
                onChange={(e) => setFestival((prev) => ({ ...prev, startsAt: e.target.value }))}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
            <label className="text-sm font-semibold">
              Ends
              <input
                type="datetime-local"
                value={festival.endsAt}
                onChange={(e) => setFestival((prev) => ({ ...prev, endsAt: e.target.value }))}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
          </div>
          <button type="submit" disabled={busy} className="rounded-lg bg-msr-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
            {busy ? "Saving…" : "Save festival wish"}
          </button>
        </form>
        ) : null}
        {tab === "keys" ? (
        <form
          className="mt-3 space-y-3 rounded-xl bg-white p-4 shadow-sm"
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
            <button type="submit" disabled={busy} className="rounded-lg bg-msr-navy px-4 py-2 text-[13px] font-semibold text-white disabled:opacity-50">
              {busy ? "Saving…" : "Save"}
            </button>
          </div>
        </form>
        ) : null}
      </PanelState>
    </div>
  );
}
