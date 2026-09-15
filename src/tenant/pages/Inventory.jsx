import { useState } from "react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { FIELD, PanelModal, PanelPager, PanelToolbar } from "../../shared/components/PanelKit.jsx";
import { metaOf, rowId } from "../../shared/lib/panel.js";

export default function Inventory() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listInventory(query), [query]);
  const warehouses = useApi(() => api.listWarehouses(), []);
  const rows = rowsOf(data);
  const warehouseRows = Array.isArray(warehouses.data) ? warehouses.data : rowsOf(warehouses.data);
  const [adjust, setAdjust] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function saveAdjust(e) {
    e.preventDefault();
    if (!adjust) return;
    setBusy(true);
    setMsg("");
    const form = new FormData(e.currentTarget);
    try {
      await api.adjustInventory({
        warehouseId: adjust.warehouseId?._id || adjust.warehouseId,
        variantId: adjust.variantId?._id || adjust.variantId,
        reason: String(form.get("reason") || "inward"),
        qty: Number(form.get("qty") || 0),
        note: String(form.get("note") || ""),
      });
      setAdjust(null);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function exportCsv() {
    setExporting(true);
    setMsg("");
    try {
      await api.exportReport("inventory");
    } catch (err) {
      setMsg(err.message);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Inventory</h1>
          <p className="mt-1 text-sm text-msr-muted">Search SKUs, filter by warehouse, and adjust stock.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={exporting} className="rounded-xl border border-msr-border px-4 py-2 text-sm font-bold disabled:opacity-50">
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="SKU or product name"
        onReset={reset}
        filters={[
          {
            key: "warehouseId",
            label: "Warehouse",
            value: filters.warehouseId || "",
            onChange: (value) => setFilter("warehouseId", value),
            options: warehouseRows.map((row) => ({ value: rowId(row), label: row.name || row.code })),
          },
          {
            key: "lowStock",
            label: "Stock",
            value: filters.lowStock || "",
            onChange: (value) => setFilter("lowStock", value),
            options: [{ value: "true", label: "Low stock only" }],
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No stock rows match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "sku", label: "SKU", render: (row) => <span className="font-mono text-xs">{row.sku || row.variantId?.sku}</span> },
            { key: "product", label: "Product", render: (row) => row.variantId?.productId?.name || "—" },
            { key: "available", label: "Available", render: (row) => row.available },
            { key: "reserved", label: "Reserved", render: (row) => row.reserved },
            { key: "warehouse", label: "Warehouse", render: (row) => row.warehouseId?.name || row.warehouseId?.code || "—" },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <button type="button" className="text-xs font-bold text-msr-purple" onClick={() => setAdjust(row)}>
                  Adjust
                </button>
              ),
            },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
      {adjust ? (
        <PanelModal title={`Adjust ${adjust.sku || adjust.variantId?.sku || "stock"}`} onClose={() => setAdjust(null)}>
          <form className="grid gap-3" onSubmit={saveAdjust}>
            <select name="reason" className={FIELD} defaultValue="inward">
              <option value="inward">Inward / add</option>
              <option value="adjustment">Adjustment</option>
              <option value="damage">Damage</option>
              <option value="return">Return</option>
            </select>
            <input name="qty" type="number" required placeholder="Qty (use negative to reduce)" className={FIELD} />
            <input name="note" placeholder="Note (optional)" className={FIELD} />
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy ? "Saving…" : "Save adjustment"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
