import { useState } from "react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { inr } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { PRODUCT_STATUSES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";

export default function Products() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listStaffProducts(query), [query]);
  const categories = useApi(() => api.listCategories(), []);
  const warehouses = useApi(() => api.listWarehouses(), []);
  const rows = rowsOf(data);
  const categoryRows = rowsOf(categories.data);
  const warehouseRows = Array.isArray(warehouses.data) ? warehouses.data : rowsOf(warehouses.data);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setBusy("create");
    const form = new FormData(e.currentTarget);
    const warehouseId = String(form.get("warehouseId") || "");
    const qty = Number(form.get("qty") || 0);
    try {
      await api.createProduct({
        name: String(form.get("name") || "").trim(),
        sku: String(form.get("sku") || "").trim(),
        sellingPrice: Number(form.get("sellingPrice") || 0),
        listPrice: Number(form.get("listPrice") || form.get("sellingPrice") || 0),
        categoryId: String(form.get("categoryId") || "") || undefined,
        status: "draft",
        ...(warehouseId ? { initialStock: { warehouseId, qty } } : {}),
      });
      setOpen(false);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function publish(id) {
    setBusy(id);
    setMsg("");
    try {
      await api.publishProduct(id);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function archive(id) {
    setBusy(id);
    setMsg("");
    try {
      await api.archiveProduct(id);
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
          <h1 className="text-2xl font-extrabold">Products</h1>
          <p className="mt-1 text-sm text-msr-muted">Search, filter, publish, or add a SKU.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          New product
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Name, SKU, tags"
        onReset={reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: filters.status || "",
            onChange: (value) => setFilter("status", value),
            options: statusOptions(PRODUCT_STATUSES),
          },
          {
            key: "categoryId",
            label: "Category",
            value: filters.categoryId || "",
            onChange: (value) => setFilter("categoryId", value),
            options: categoryRows.map((row) => ({ value: rowId(row), label: row.name })),
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No products match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "name", label: "Product", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "sku", label: "SKU", render: (row) => <span className="font-mono text-xs">{row.primarySku || row.sku}</span> },
            { key: "brand", label: "Brand", render: (row) => row.brandId?.name || "—" },
            { key: "price", label: "Price", render: (row) => (row.sellingPrice != null ? inr(row.sellingPrice) : "—") },
            { key: "stock", label: "Available", render: (row) => row.available ?? "—" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {row.status !== "published" ? (
                    <ActionBtn disabled={busy === rowId(row)} onClick={() => publish(rowId(row))}>
                      Publish
                    </ActionBtn>
                  ) : (
                    <ActionBtn danger disabled={busy === rowId(row)} onClick={() => archive(rowId(row))}>
                      Archive
                    </ActionBtn>
                  )}
                </div>
              ),
            },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
      {open ? (
        <PanelModal title="Create product" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={create}>
            <input name="name" required placeholder="Product name" className={FIELD} />
            <input name="sku" required placeholder="SKU" className={FIELD} />
            <input name="sellingPrice" type="number" min="0" step="0.01" required placeholder="Selling price" className={FIELD} />
            <input name="listPrice" type="number" min="0" step="0.01" placeholder="List price (optional)" className={FIELD} />
            <select name="categoryId" className={FIELD} defaultValue="">
              <option value="">No category</option>
              {categoryRows.map((row) => (
                <option key={rowId(row)} value={rowId(row)}>
                  {row.name}
                </option>
              ))}
            </select>
            <select name="warehouseId" className={FIELD} defaultValue="">
              <option value="">No opening stock</option>
              {warehouseRows.map((row) => (
                <option key={rowId(row)} value={rowId(row)}>
                  {row.name || row.code}
                </option>
              ))}
            </select>
            <input name="qty" type="number" min="0" placeholder="Opening qty" className={FIELD} />
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "create"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "create" ? "Creating…" : "Create product"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
