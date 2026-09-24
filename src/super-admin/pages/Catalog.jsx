import { useState } from "react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { inr } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { metaOf, rowId } from "../../shared/lib/panel.js";

export default function Catalog() {
  const { q, setQ, page, setPage, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listStaffProducts(query), [query]);
  const categories = useApi(() => api.listCategories(), []);
  const rows = rowsOf(data);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

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

  async function createCategory(e) {
    e.preventDefault();
    setBusy("category");
    setMsg("");
    const form = new FormData(e.currentTarget);
    try {
      await api.createCategory({ name: String(form.get("name") || "").trim() });
      setOpen(false);
      categories.reload();
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
          <p className="mt-1 text-sm text-msr-muted">Enable or disable any store’s product, and add categories.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          New category
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
            { key: "limit", label: "Order limit", render: (row) => row.wholesale?.maxQty || "—" },
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
        <PanelModal title="New category" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={createCategory}>
            <input name="name" required placeholder="Category name" className={FIELD} />
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "category"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "category" ? "Saving…" : "Create category"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
