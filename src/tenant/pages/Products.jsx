import { useState } from "react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { inr } from "../../shared/lib/format.js";
import { parseBulkProductCsv, readTierPricesFromForm } from "../../shared/lib/bulk.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { PRODUCT_STATUSES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";

function WholesaleFields({ defaults = {}, slabs = [] }) {
  const seedSlabs =
    slabs?.length > 0
      ? slabs
      : [
          { minQty: 1, maxQty: 49, unitPrice: "" },
          { minQty: 50, maxQty: 199, unitPrice: "" },
          { minQty: 200, maxQty: null, unitPrice: "" },
        ];
  return (
    <fieldset className="rounded-xl border border-[#eceef4] p-3">
      <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-msr-muted">Bulk / wholesale</legend>
      <label className="mt-1 flex items-center gap-2 text-sm font-semibold">
        <input name="bulkEligible" type="checkbox" defaultChecked={Boolean(defaults.bulkEligible)} className="h-4 w-4" />
        Bulk eligible (show on Bulk Buy and enforce wholesale checkout rules)
      </label>
      <div className="mt-3 grid gap-3 sm:grid-cols-3">
        <label className="block text-sm font-semibold">
          MOQ
          <input name="moq" type="number" min="1" defaultValue={defaults.moq || 1} className={`mt-1 font-normal ${FIELD}`} />
        </label>
        <label className="block text-sm font-semibold">
          Max qty / order
          <input
            name="maxQty"
            type="number"
            min="1"
            defaultValue={defaults.maxQty || ""}
            placeholder="No limit"
            className={`mt-1 font-normal ${FIELD}`}
          />
        </label>
        <label className="block text-sm font-semibold">
          Pack multiple
          <input
            name="packMultiple"
            type="number"
            min="1"
            defaultValue={defaults.packMultiple || 1}
            className={`mt-1 font-normal ${FIELD}`}
          />
        </label>
      </div>
      <p className="mt-2 text-xs text-msr-muted">Quantity slabs (tier prices). Leave price blank to skip a row.</p>
      <div className="mt-2 space-y-2">
        {seedSlabs.map((slab, i) => (
          <div key={i} className="grid grid-cols-3 gap-2">
            <input name="slabMin" type="number" min="1" defaultValue={slab.minQty ?? ""} placeholder="Min qty" className={FIELD} />
            <input
              name="slabMax"
              type="number"
              min="1"
              defaultValue={slab.maxQty ?? ""}
              placeholder="Max (blank = open)"
              className={FIELD}
            />
            <input
              name="slabPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={slab.unitPrice ?? ""}
              placeholder="Unit price"
              className={FIELD}
            />
          </div>
        ))}
      </div>
    </fieldset>
  );
}

export default function Products() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listStaffProducts(query), [query]);
  const categories = useApi(() => api.listCategories(), []);
  const brands = useApi(() => api.listBrands().catch(() => []), []);
  const warehouses = useApi(() => api.listWarehouses(), []);
  const rows = rowsOf(data);
  const categoryRows = rowsOf(categories.data);
  const brandRows = rowsOf(brands.data);
  const warehouseRows = Array.isArray(warehouses.data) ? warehouses.data : rowsOf(warehouses.data);
  const [open, setOpen] = useState(false);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [catalog, setCatalog] = useState("");
  const [editing, setEditing] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [bulkMsg, setBulkMsg] = useState("");

  function wholesaleFromForm(form, base = {}) {
    return {
      ...base,
      bulkEligible: Boolean(form.get("bulkEligible")),
      moq: Number(form.get("moq") || base.moq || 1),
      maxQty: form.get("maxQty") === "" ? null : Number(form.get("maxQty")),
      packMultiple: Math.max(1, Number(form.get("packMultiple") || base.packMultiple || 1)),
    };
  }

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setBusy("create");
    const form = new FormData(e.currentTarget);
    const warehouseId = String(form.get("warehouseId") || "");
    const qty = Number(form.get("qty") || 0);
    const deliveryModes = [
      form.get("storePickup") ? "store_pickup" : null,
      form.get("deliveryPartner") ? "delivery_partner" : null,
    ].filter(Boolean);
    const tierPrices = readTierPricesFromForm(form);
    try {
      await api.createProduct({
        name: String(form.get("name") || "").trim(),
        sku: String(form.get("sku") || "").trim(),
        sellingPrice: Number(form.get("sellingPrice") || 0),
        listPrice: Number(form.get("listPrice") || form.get("sellingPrice") || 0),
        categoryId: String(form.get("categoryId") || "") || undefined,
        brandId: String(form.get("brandId") || "") || undefined,
        status: "draft",
        easyReturn: Boolean(form.get("easyReturn")),
        deliveryModes: deliveryModes.length ? deliveryModes : ["delivery_partner"],
        wholesale: wholesaleFromForm(form),
        ...(tierPrices.length ? { tierPrices } : {}),
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

  async function saveFlags(e) {
    e.preventDefault();
    if (!editing) return;
    setMsg("");
    setBusy("edit");
    const form = new FormData(e.currentTarget);
    const deliveryModes = [
      form.get("storePickup") ? "store_pickup" : null,
      form.get("deliveryPartner") ? "delivery_partner" : null,
    ].filter(Boolean);
    const tierPrices = readTierPricesFromForm(form);
    try {
      await api.updateProduct(rowId(editing), {
        easyReturn: Boolean(form.get("easyReturn")),
        deliveryModes: deliveryModes.length ? deliveryModes : ["delivery_partner"],
        sellingPrice: Number(form.get("sellingPrice") || 0),
        listPrice: Number(form.get("listPrice") || form.get("sellingPrice") || 0),
        availableQty: Number(form.get("availableQty") || 0),
        wholesale: wholesaleFromForm(form, editing.wholesale || {}),
        tierPrices,
      });
      setEditing(null);
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

  async function toggleBulk(row) {
    const id = rowId(row);
    setBusy(id);
    setMsg("");
    try {
      await api.updateProduct(id, {
        wholesale: {
          ...(row.wholesale || {}),
          bulkEligible: !row.wholesale?.bulkEligible,
        },
      });
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function createCatalog(e) {
    e.preventDefault();
    setBusy(catalog);
    setMsg("");
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") || "").trim();
    try {
      if (catalog === "category") await api.createCategory({ name });
      else await api.createBrand({ name });
      setCatalog("");
      categories.reload();
      brands.reload();
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

  async function runBulkUpload(e) {
    e.preventDefault();
    setBulkMsg("");
    setBusy("bulk");
    const form = new FormData(e.currentTarget);
    const file = form.get("file");
    try {
      const text = await file.text();
      const items = parseBulkProductCsv(text);
      if (!items.length) throw new Error("No valid rows found. Check CSV headers.");
      const result = await api.bulkUploadProducts(items);
      setBulkMsg(
        `Created ${result.created?.length || 0}, updated ${result.updated?.length || 0}` +
          (result.errors?.length ? `, ${result.errors.length} failed` : ""),
      );
      if (!result.errors?.length) {
        setBulkOpen(false);
        reload();
      }
    } catch (err) {
      setBulkMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Products</h1>
          <p className="mt-1 text-sm text-msr-muted">Search, filter, publish, bulk upload, or add a SKU.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => setCatalog("category")} className="rounded-xl border border-msr-border px-4 py-2 text-sm font-bold">
            New category
          </button>
          <button type="button" onClick={() => setCatalog("brand")} className="rounded-xl border border-msr-border px-4 py-2 text-sm font-bold">
            New brand
          </button>
          <button type="button" onClick={() => setBulkOpen(true)} className="rounded-xl border border-msr-border px-4 py-2 text-sm font-bold">
            Bulk upload
          </button>
          <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
            New product
          </button>
        </div>
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
          {
            key: "bulkEligible",
            label: "Bulk",
            value: filters.bulkEligible || "",
            onChange: (value) => setFilter("bulkEligible", value),
            options: [
              { value: "true", label: "Eligible" },
              { value: "false", label: "Not eligible" },
            ],
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No products match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          selectedKey={editing ? rowId(editing) : ""}
          columns={[
            { key: "name", label: "Product", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "sku", label: "SKU", render: (row) => <span className="font-mono text-xs">{row.primarySku || row.sku}</span> },
            { key: "brand", label: "Brand", render: (row) => row.brandId?.name || "—" },
            { key: "price", label: "Price", render: (row) => (row.sellingPrice != null ? inr(row.sellingPrice) : "—") },
            { key: "stock", label: "Available", render: (row) => row.available ?? "—" },
            {
              key: "bulk",
              label: "Bulk",
              render: (row) => (
                <ActionBtn disabled={busy === rowId(row)} onClick={() => toggleBulk(row)}>
                  {row.wholesale?.bulkEligible ? "On" : "Off"}
                </ActionBtn>
              ),
            },
            { key: "limit", label: "Max qty", render: (row) => row.wholesale?.maxQty || "—" },
            { key: "slabs", label: "Slabs", render: (row) => (row.tierPrices?.length ? row.tierPrices.length : "—") },
            { key: "pack", label: "Pack step", render: (row) => row.wholesale?.packMultiple || 1 },
            {
              key: "status",
              label: "Status",
              render: (row) => (
                <StatusBadge value={row.status === "published" && row.enabled === false ? "disabled" : row.status} />
              ),
            },
            {
              key: "actions",
              label: " ",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  <ActionBtn onClick={() => setEditing(row)}>Edit</ActionBtn>
                  <ActionBtn
                    danger={row.enabled !== false && row.status === "published"}
                    disabled={busy === rowId(row)}
                    onClick={() => setEnabled(row, !(row.enabled !== false && row.status === "published"))}
                  >
                    {row.enabled !== false && row.status === "published" ? "Disable" : "Enable"}
                  </ActionBtn>
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
            <select name="brandId" className={FIELD} defaultValue="">
              <option value="">No brand</option>
              {brandRows.map((row) => (
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
            <WholesaleFields defaults={{ bulkEligible: true, moq: 1, packMultiple: 1 }} />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input name="easyReturn" type="checkbox" defaultChecked className="h-4 w-4" />
              Easy return
            </label>
            <fieldset className="rounded-xl border border-[#eceef4] p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-msr-muted">Delivery</legend>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input name="storePickup" type="checkbox" className="h-4 w-4" />
                Store pickup
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input name="deliveryPartner" type="checkbox" defaultChecked className="h-4 w-4" />
                Delivery partner
              </label>
            </fieldset>
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "create"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "create" ? "Creating…" : "Create product"}
            </button>
          </form>
        </PanelModal>
      ) : null}
      {editing ? (
        <PanelModal title={`Edit · ${editing.name}`} onClose={() => setEditing(null)}>
          <form className="grid gap-3" onSubmit={saveFlags}>
            <label className="block text-sm font-semibold">
              Selling price
              <input
                name="sellingPrice"
                type="number"
                min="0"
                step="0.01"
                required
                defaultValue={editing.sellingPrice ?? ""}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              List price
              <input
                name="listPrice"
                type="number"
                min="0"
                step="0.01"
                defaultValue={editing.listPrice ?? editing.sellingPrice ?? ""}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
            <label className="block text-sm font-semibold">
              Available
              <input
                name="availableQty"
                type="number"
                min="0"
                step="1"
                required
                defaultValue={editing.available ?? 0}
                className={`mt-1 font-normal ${FIELD}`}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input name="easyReturn" type="checkbox" defaultChecked={Boolean(editing.easyReturn)} className="h-4 w-4" />
              Easy return
            </label>
            <WholesaleFields defaults={editing.wholesale || {}} slabs={editing.tierPrices || []} />
            <fieldset className="rounded-xl border border-[#eceef4] p-3">
              <legend className="px-1 text-xs font-bold uppercase tracking-[0.12em] text-msr-muted">Delivery</legend>
              <label className="mt-1 flex items-center gap-2 text-sm">
                <input
                  name="storePickup"
                  type="checkbox"
                  defaultChecked={(editing.deliveryModes || []).includes("store_pickup")}
                  className="h-4 w-4"
                />
                Store pickup
              </label>
              <label className="mt-2 flex items-center gap-2 text-sm">
                <input
                  name="deliveryPartner"
                  type="checkbox"
                  defaultChecked={(editing.deliveryModes || ["delivery_partner"]).includes("delivery_partner")}
                  className="h-4 w-4"
                />
                Delivery partner
              </label>
            </fieldset>
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "edit"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "edit" ? "Saving…" : "Save changes"}
            </button>
          </form>
        </PanelModal>
      ) : null}
      {bulkOpen ? (
        <PanelModal title="Bulk upload products" onClose={() => setBulkOpen(false)}>
          <form className="grid gap-3" onSubmit={runBulkUpload}>
            <p className="text-sm text-msr-muted">
              CSV headers: sku,name,sellingPrice,listPrice,moq,maxQty,packMultiple,bulkEligible,slabMin1,slabMax1,slabPrice1,...
            </p>
            <p className="text-xs text-msr-muted">
              Set maxQty to cap how many units a buyer can purchase per line. Rows upsert by SKU; bulkEligible defaults to true.
            </p>
            <input name="file" type="file" accept=".csv,text/csv" required className={FIELD} />
            {bulkMsg ? <p className="text-sm text-msr-muted">{bulkMsg}</p> : null}
            <button disabled={busy === "bulk"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "bulk" ? "Uploading…" : "Upload CSV"}
            </button>
          </form>
        </PanelModal>
      ) : null}
      {catalog ? (
        <PanelModal title={catalog === "category" ? "New category" : "New brand"} onClose={() => setCatalog("")}>
          <form className="grid gap-3" onSubmit={createCatalog}>
            <input name="name" required placeholder="Name" className={FIELD} />
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === catalog} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === catalog ? "Saving…" : "Create"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
