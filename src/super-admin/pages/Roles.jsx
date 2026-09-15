import { useMemo, useState } from "react";
import { api } from "../../shared/api.js";
import { prettyStatus, rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState } from "../../shared/components/PanelTable.jsx";
import { FIELD, PanelModal, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { ROLE_SCOPES, rowId, statusOptions } from "../../shared/lib/panel.js";

export default function Roles() {
  const { q, setQ, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading, reload } = useApi(() => api.listRoles(query), [query]);
  const permissionApi = useApi(() => api.listPermissions(), []);
  const rows = rowsOf(data);
  const [open, setOpen] = useState(false);
  const [openId, setOpenId] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  const grouped = useMemo(() => {
    const map = {};
    const list = Array.isArray(permissionApi.data)
      ? permissionApi.data.map((p) => p.key || `${p.resource}.${p.action}`).filter(Boolean)
      : [];
    const keys = list.length ? list : [];
    keys.forEach((key) => {
      const group = key.split(".")[0] || "other";
      (map[group] ||= []).push(key);
    });
    return map;
  }, [permissionApi.data]);

  async function create(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    const form = new FormData(e.currentTarget);
    const permissions = form.getAll("permissions").map(String);
    try {
      await api.createRole({
        name: String(form.get("name") || "").trim(),
        description: String(form.get("description") || "").trim(),
        permissions,
      });
      setOpen(false);
      reload();
    } catch (err) {
      setMsg(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">Roles & permissions</h1>
          <p className="mt-1 text-sm text-msr-muted">Inspect system roles or create a tenant-scoped role.</p>
        </div>
        <button type="button" onClick={() => setOpen(true)} className="rounded-xl bg-msr-navy px-4 py-2 text-sm font-bold text-white">
          New role
        </button>
      </div>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Role name or slug"
        onReset={reset}
        filters={[
          {
            key: "scope",
            label: "Scope",
            value: filters.scope || "",
            onChange: (value) => setFilter("scope", value),
            options: statusOptions(ROLE_SCOPES),
          },
        ]}
      />
      {msg ? <p className="mt-3 text-sm text-msr-danger">{msg}</p> : null}
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No roles match these filters.">
        <div className="mt-4 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((row) => {
            const id = rowId(row);
            const openRow = openId === id;
            const count = row.permissions?.includes("*") ? "All" : row.permissions?.length || 0;
            return (
              <div key={id} className="rounded-2xl bg-white p-5 shadow-sm">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs uppercase tracking-wide text-msr-muted">{row.scope || "tenant"}</p>
                    <h2 className="mt-1 font-bold">{row.name}</h2>
                  </div>
                  {row.isSystem ? <StatusBadge value="active" /> : null}
                </div>
                <p className="mt-2 font-mono text-xs text-msr-muted">{row.slug}</p>
                <p className="mt-2 text-sm text-msr-muted">
                  {count} permissions{row.tenantId?.name ? ` · ${row.tenantId.name}` : ""}
                </p>
                {row.description ? <p className="mt-2 text-sm text-msr-muted">{row.description}</p> : null}
                <button type="button" onClick={() => setOpenId(openRow ? "" : id)} className="mt-3 text-xs font-bold text-msr-purple">
                  {openRow ? "Hide permissions" : "View permissions"}
                </button>
                {openRow ? (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(row.permissions || []).map((perm) => (
                      <span key={perm} className="rounded-full bg-msr-bg px-2 py-0.5 font-mono text-[10px] text-msr-muted">
                        {perm}
                      </span>
                    ))}
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </PanelState>
      {open ? (
        <PanelModal title="Create role" onClose={() => setOpen(false)}>
          <form className="grid gap-3" onSubmit={create}>
            <input name="name" required placeholder="Role name" className={FIELD} />
            <input name="description" placeholder="Description" className={FIELD} />
            <p className="text-xs font-semibold text-msr-muted">Permissions</p>
            <div className="max-h-64 overflow-y-auto rounded-xl border border-msr-border p-3">
              {Object.entries(grouped).map(([group, keys]) => (
                <fieldset key={group} className="mb-3">
                  <legend className="text-xs font-bold uppercase text-msr-muted">{prettyStatus(group)}</legend>
                  <div className="mt-1 grid gap-1">
                    {keys.map((key) => (
                      <label key={key} className="flex items-center gap-2 text-sm">
                        <input type="checkbox" name="permissions" value={key} />
                        <span className="font-mono text-xs">{key}</span>
                      </label>
                    ))}
                  </div>
                </fieldset>
              ))}
              {!Object.keys(grouped).length ? <p className="text-sm text-msr-muted">No permission catalog loaded.</p> : null}
            </div>
            {msg ? <p className="text-sm text-msr-danger">{msg}</p> : null}
            <button disabled={busy} className="rounded-xl bg-msr-navy py-2.5 font-bold text-white disabled:opacity-50">
              {busy ? "Creating…" : "Create role"}
            </button>
          </form>
        </PanelModal>
      ) : null}
    </div>
  );
}
