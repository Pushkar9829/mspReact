import { useState } from "react";
import { api } from "../../shared/api.js";
import { inr } from "../../shared/lib/format.js";
import { prettyStatus } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { PanelState, PanelStat } from "../../shared/components/PanelTable.jsx";
import { StatusBadge } from "../../shared/components/PanelKit.jsx";

export default function Reports() {
  const [days, setDays] = useState(30);
  const { data, error, loading } = useApi(() => api.reportsOverview(), []);
  const sales = useApi(() => api.reportsSales(days), [days]);
  const [exporting, setExporting] = useState("");
  const [msg, setMsg] = useState("");
  const statusEntries = Object.entries(data?.byStatus || {});

  async function exportKind(kind) {
    setExporting(kind);
    setMsg("");
    try {
      await api.exportReport(kind, kind === "sales" ? { days } : {});
    } catch (err) {
      setMsg(err.message);
    } finally {
      setExporting("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Reports</h1>
          <p className="mt-1 text-sm text-msr-muted">Fill rate, sales trend, and CSV exports.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {["orders", "inventory", "customers", "sales"].map((kind) => (
            <button
              key={kind}
              type="button"
              disabled={Boolean(exporting)}
              onClick={() => exportKind(kind)}
              className="rounded-xl border border-msr-border px-3 py-1.5 text-xs font-bold capitalize disabled:opacity-50"
            >
              {exporting === kind ? "Exporting…" : `Export ${kind}`}
            </button>
          ))}
        </div>
      </div>
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading} error={error}>
        <div className="mt-5 grid gap-4 md:grid-cols-3">
          <PanelStat label="Fill rate" value={`${data?.fillRate ?? 0}%`} />
          <PanelStat label="Cancel rate" value={`${data?.cancelRate ?? 0}%`} />
          <PanelStat label="AOV" value={inr(data?.aov)} />
        </div>
        {statusEntries.length ? (
          <div className="mt-5 flex flex-wrap gap-2">
            {statusEntries.map(([status, count]) => (
              <span key={status} className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold shadow-sm">
                <StatusBadge value={status} />
                {count}
              </span>
            ))}
          </div>
        ) : (
          <p className="mt-4 text-xs text-msr-muted">Status mix: {prettyStatus("none")}</p>
        )}
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">Top SKUs</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {(data?.topSkus || []).slice(0, 8).map((row) => (
              <li key={row._id} className="flex justify-between border-b border-msr-border py-2">
                <span>{row.name || row._id}</span>
                <span className="font-semibold">{inr(row.revenue)}</span>
              </li>
            ))}
            {!data?.topSkus?.length ? <li className="text-msr-muted">No sales yet.</li> : null}
          </ul>
        </div>
        <div className="mt-6 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Sales trend</h2>
            <select value={days} onChange={(e) => setDays(Number(e.target.value))} className="rounded-xl border border-msr-border px-3 py-1.5 text-sm">
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </div>
          <PanelState loading={sales.loading} error={sales.error} empty={!Array.isArray(sales.data) || !sales.data.length} emptyText="No sales in this window.">
            <ul className="mt-3 grid max-h-80 gap-1 overflow-y-auto text-sm">
              {(sales.data || []).map((row) => (
                <li key={row._id} className="flex justify-between">
                  <span className="text-msr-muted">{row._id}</span>
                  <span>
                    {row.orders} · {inr(row.gmv)}
                  </span>
                </li>
              ))}
            </ul>
          </PanelState>
        </div>
      </PanelState>
    </div>
  );
}
