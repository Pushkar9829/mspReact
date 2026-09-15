import { useState } from "react";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { TENANT_STATUSES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";
import { formatDate } from "../../shared/lib/format.js";

export default function Tenants() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listTenants(query), [query]);
  const rows = rowsOf(data);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setBusy("create");
    const form = new FormData(e.currentTarget);
    try {
      await api.createTenant({
        name: String(form.get("name") || "").trim(),
        slug: String(form.get("slug") || "").trim() || undefined,
        admin: {
          name: String(form.get("adminName") || "").trim(),
          email: String(form.get("adminEmail") || "").trim(),
          password: String(form.get("adminPassword") || ""),
        },
      });
      setOpen(false);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy("");
    }
  }

  async function setStatus(id, status) {
    setBusy(id);
    try {
      await api.updateTenant(id, { status });
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
          <h1 className="text-2xl font-extrabold">Tenants</h1>
          <p className="mt-1 text-sm text-msr-muted">Search, filter, and activate marketplace sellers.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          New tenant
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Name, slug, GSTIN, email"
        onReset={reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: filters.status || "",
            onChange: (value) => setFilter("status", value),
            options: statusOptions(TENANT_STATUSES),
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No tenants match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "name", label: "Tenant", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "slug", label: "Slug", render: (row) => <span className="font-mono text-xs">{row.slug}</span> },
            { key: "legal", label: "Legal / city", render: (row) => row.businessProfile?.legalName || row.deliveryZones?.[0]?.name || "—" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "createdAt", label: "Created", render: (row) => formatDate(row.createdAt) },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                  {row.status !== "active" ? (
                    <ActionBtn disabled={busy === rowId(row)} onClick={() => setStatus(rowId(row), "active")}>
                      Activate
                    </ActionBtn>
                  ) : null}
                  {row.status !== "suspended" ? (
                    <ActionBtn danger disabled={busy === rowId(row)} onClick={() => setStatus(rowId(row), "suspended")}>
                      Suspend
                    </ActionBtn>
                  ) : null}
                </div>
              ),
            },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
      {open ? (
        <PanelModal title="Create tenant" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={create}>
            <input name="name" required placeholder="Store name" className={FIELD} />
            <input name="slug" placeholder="slug (optional)" className={FIELD} />
            <input name="adminName" required placeholder="Admin name" className={FIELD} />
            <input name="adminEmail" type="email" required placeholder="Admin email" className={FIELD} />
            <input name="adminPassword" type="password" minLength={8} required placeholder="Admin password (8+ chars)" className={FIELD} />
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "create"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "create" ? "Creating…" : "Create tenant"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
