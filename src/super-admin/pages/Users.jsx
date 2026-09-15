import { useState } from "react";
import { api } from "../../shared/api.js";
import { prettyStatus, rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { ActionBtn, FIELD, PanelModal, PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { USER_STATUSES, metaOf, rowId, statusOptions } from "../../shared/lib/panel.js";

export default function Users() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listUsers(query), [query]);
  const roles = useApi(() => api.listRoles(), []);
  const tenants = useApi(() => api.listTenants({ limit: 100 }), []);
  const rows = rowsOf(data);
  const roleRows = rowsOf(roles.data);
  const tenantRows = rowsOf(tenants.data);
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState("");

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setBusy("create");
    const form = new FormData(e.currentTarget);
    try {
      await api.createUser({
        name: String(form.get("name") || "").trim(),
        email: String(form.get("email") || "").trim(),
        password: String(form.get("password") || ""),
        phone: String(form.get("phone") || "").trim() || undefined,
        roleId: String(form.get("roleId") || ""),
        tenantId: String(form.get("tenantId") || "") || undefined,
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
      if (status === "suspended") await api.deleteUser(id);
      else await api.updateUser(id, { status });
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
          <h1 className="text-2xl font-extrabold">Users</h1>
          <p className="mt-1 text-sm text-msr-muted">Find buyers and staff by name, email, role, or tenant.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          New user
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Name, email, phone, company"
        onReset={reset}
        filters={[
          {
            key: "status",
            label: "Status",
            value: filters.status || "",
            onChange: (value) => setFilter("status", value),
            options: statusOptions(USER_STATUSES),
          },
          {
            key: "role",
            label: "Role",
            value: filters.role || "",
            onChange: (value) => setFilter("role", value),
            options: roleRows.map((row) => ({ value: row.slug, label: row.name })),
          },
          {
            key: "tenantId",
            label: "Tenant",
            value: filters.tenantId || "",
            onChange: (value) => setFilter("tenantId", value),
            options: tenantRows.map((row) => ({ value: rowId(row), label: row.name })),
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No users match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "name", label: "Name", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "email", label: "Email", render: (row) => row.email },
            { key: "role", label: "Role", render: (row) => prettyStatus(row.role?.slug || row.roleId?.slug) },
            { key: "tenant", label: "Tenant", render: (row) => row.tenant?.name || row.tenantId?.name || "Platform" },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            {
              key: "actions",
              label: "",
              render: (row) => (
                <div className="flex flex-wrap gap-2">
                  {row.status !== "active" ? (
                    <ActionBtn disabled={busy === rowId(row)} onClick={() => setStatus(rowId(row), "active")}>
                      Activate
                    </ActionBtn>
                  ) : (
                    <ActionBtn danger disabled={busy === rowId(row)} onClick={() => setStatus(rowId(row), "suspended")}>
                      Suspend
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
        <PanelModal title="Create user" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={create}>
            <input name="name" required placeholder="Name" className={FIELD} />
            <input name="email" type="email" required placeholder="Email" className={FIELD} />
            <input name="phone" placeholder="Phone" className={FIELD} />
            <input name="password" type="password" minLength={8} required placeholder="Password (8+ chars)" className={FIELD} />
            <select name="roleId" required className={FIELD} defaultValue="">
              <option value="" disabled>
                Role
              </option>
              {roleRows.map((row) => (
                <option key={rowId(row)} value={rowId(row)}>
                  {row.name} ({row.scope})
                </option>
              ))}
            </select>
            <select name="tenantId" className={FIELD} defaultValue="">
              <option value="">No tenant (platform)</option>
              {tenantRows.map((row) => (
                <option key={rowId(row)} value={rowId(row)}>
                  {row.name}
                </option>
              ))}
            </select>
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy === "create"} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy === "create" ? "Creating…" : "Create user"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
