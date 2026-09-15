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

export default function Settings() {
  const { q, setQ, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(
    () => api.listSettings(query.q ? { q: query.q } : {}),
    [query.q]
  );
  const [rows, setRows] = useState([]);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (Array.isArray(data)) setRows(data);
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
