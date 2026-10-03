import { useState } from "react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { inr } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import CatalogManager from "../../shared/components/CatalogManager.jsx";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { metaOf, rowId } from "../../shared/lib/panel.js";

export default function Catalog() {
  const { q, setQ, page, setPage, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listStaffProducts(query), [query]);
  const categories = useApi(() => api.listCategories({ scope: "platform" }), []);
  const rows = rowsOf(data);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function setBulkEligible(row, bulkEligible) {
    const id = rowId(row);
    setBusy(id);
    setMsg("");
    try {
      await api.updateProduct(id, {
        wholesale: { ...(row.wholesale || {}), bulkEligible },
      });
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function setEnabled(row, enabled) {
    const id = rowId(row);
    setBusy(id);
    setMsg("");
    try {
      if (enabled && row.status !== "published") await api.publishProduct(id);
      await api.updateProduct(id, { enabled });
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Catalog</h1>
          <p className="mt-1 text-sm text-msr-muted">Enable or disable any store’s product, and add, rename or delete categories.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          Categories
        </button>
      </div>
      <PanelToolbar search={q} onSearch={setQ} searchPlaceholder="Name or SKU" onReset={reset} />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No products match this search.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "name", label: "Product", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "store", label: "Store", render: (row) => row.tenantId?.name || "—" },
            { key: "price", label: "Price", render: (row) => (row.sellingPrice != null ? inr(row.sellingPrice) : "—") },
            { key: "available", label: "Available", render: (row) => row.available ?? "—" },
            { key: "limit", label: "Max qty", render: (row) => row.wholesale?.maxQty || "—" },
            {
              key: "bulk",
              label: "Bulk",
              render: (row) => (
                <ActionBtn disabled={busy === rowId(row)} onClick={() => setBulkEligible(row, !row.wholesale?.bulkEligible)}>
                  {row.wholesale?.bulkEligible ? "On" : "Off"}
                </ActionBtn>
              ),
            },
            {
              key: "status",
              label: "Status",
              render: (row) => <StatusBadge value={row.status === "published" && row.enabled === false ? "disabled" : row.status} />,
            },
            {
              key: "actions",
              label: "",
              render: (row) => {
                const live = row.enabled !== false && row.status === "published";
                return (
                  <ActionBtn danger={live} disabled={busy === rowId(row)} onClick={() => setEnabled(row, !live)}>
                    {live ? "Disable" : "Enable"}
                  </ActionBtn>
                );
              },
            },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
      {open ? (
        <CatalogManager
          kind="category"
          rows={rowsOf(categories.data)}
          onClose={() => setOpen(false)}
          onChanged={() => {
            categories.reload();
            reload();
          }}
        />
      ) : null}
    </div>
  );
}
