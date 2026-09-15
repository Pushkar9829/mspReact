import { useState } from "react";
import { api } from "../../shared/api.js";
import { prettyStatus, rowsOf } from "../../shared/auth.js";
import { inr, formatDate } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { ORDER_STATUSES, PAYMENT_STATUSES, NEXT_ORDER_STATUSES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";

export default function Orders() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listOrders(query), [query]);
  const tenants = useApi(() => api.listTenants({ limit: 100 }), []);
  const rows = rowsOf(data);
  const tenantRows = rowsOf(tenants.data);
  const [openId, setOpenId] = useState("");
  const [detail, setDetail] = useState(null);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");
  const [exporting, setExporting] = useState(false);

  async function openOrder(row) {
    const id = rowId(row);
    if (openId === id) {
      setOpenId("");
      setDetail(null);
      return;
    }
    setOpenId(id);
    try {
      setDetail(await api.getOrder(id));
    } catch (err) {
      setMsg(err.message);
    }
  }

  async function changeStatus(id, status) {
    setBusy(id);
    setMsg("");
    try {
      await api.updateOrderStatus(id, status);
      reload();
      if (openId === id) setDetail(await api.getOrder(id));
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function exportCsv() {
    setExporting(true);
    setMsg("");
    try {
      await api.exportReport("orders", {
        status: query.status,
        paymentStatus: query.paymentStatus,
        tenantId: query.tenantId,
        from: query.from,
        to: query.to,
      });
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
          <h1 className="text-2xl font-extrabold">Platform orders</h1>
          <p className="mt-1 text-sm text-msr-muted">Search by order number or customer, then update status.</p>
        </div>
        <button type="button" onClick={exportCsv} disabled={exporting} className="rounded-xl border border-msr-border px-4 py-2 text-sm font-bold disabled:opacity-50">
          {exporting ? "Exporting…" : "Export CSV"}
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Order no, PO, customer"
        onReset={reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: filters.status || "",
            onChange: (value) => setFilter("status", value),
            options: statusOptions(ORDER_STATUSES),
          },
          {
            key: "paymentStatus",
            label: "Payment",
            value: filters.paymentStatus || "",
            onChange: (value) => setFilter("paymentStatus", value),
            options: statusOptions(PAYMENT_STATUSES),
          },
          {
            key: "tenantId",
            label: "Tenant",
            value: filters.tenantId || "",
            onChange: (value) => setFilter("tenantId", value),
            options: tenantRows.map((row) => ({ value: rowId(row), label: row.name })),
          },
          { key: "from", label: "From", type: "date", value: filters.from || "", onChange: (value) => setFilter("from", value) },
          { key: "to", label: "To", type: "date", value: filters.to || "", onChange: (value) => setFilter("to", value) },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No orders match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          onRowClick={openOrder}
          columns={[
            { key: "orderNumber", label: "Order", render: (row) => <span className="font-semibold">{row.orderNumber}</span> },
            { key: "tenant", label: "Tenant", render: (row) => row.tenantId?.name || "—" },
            { key: "customer", label: "Customer", render: (row) => row.buyerId?.name || row.buyerId?.email || "—" },
            { key: "total", label: "Amount", render: (row) => inr(row.total) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "payment", label: "Payment", render: (row) => <StatusBadge value={row.paymentStatus} /> },
            { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
            {
              key: "actions",
              label: "",
              render: (row) => {
                const next = NEXT_ORDER_STATUSES[row.status] || [];
                if (!next.length) return null;
                return (
                  <select
                    className="rounded-lg border border-msr-border px-2 py-1 text-xs"
                    defaultValue=""
                    disabled={busy === rowId(row)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => {
                      const status = e.target.value;
                      e.target.value = "";
                      if (status) changeStatus(rowId(row), status);
                    }}
                  >
                    <option value="" disabled>
                      Move to
                    </option>
                    {next.map((status) => (
                      <option key={status} value={status}>
                        {prettyStatus(status)}
                      </option>
                    ))}
                  </select>
                );
              },
            },
          ]}
        />
      </PanelState>
      {detail && openId === rowId(detail) ? (
        <div className="mt-4 rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="font-bold">{detail.orderNumber}</h2>
          <p className="mt-1 text-sm text-msr-muted">
            {detail.buyerId?.email} · {detail.addressSnapshot?.city || ""} {detail.addressSnapshot?.postalCode || ""}
          </p>
          <ul className="mt-3 grid gap-2 text-sm">
            {(detail.items || []).map((item) => (
              <li key={item._id || item.sku} className="flex justify-between gap-3 border-b border-msr-border py-2">
                <span>
                  {item.name} · {item.sku} × {item.qty}
                </span>
                <span className="font-semibold">{inr(item.lineTotal)}</span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
    </div>
  );
}
