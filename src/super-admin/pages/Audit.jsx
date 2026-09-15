import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { formatDateTime } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { PanelPager, PanelToolbar } from "../../shared/components/PanelKit.jsx";
import { metaOf, rowId } from "../../shared/lib/panel.js";

export default function Audit() {
  const { q, setQ, page, setPage, filters, setFilter, reset, query } = useListQuery();
  const { data, error, loading } = useApi(() => api.listAudit(query), [query]);
  const tenants = useApi(() => api.listTenants({ limit: 100 }), []);
  const rows = rowsOf(data);
  const tenantRows = rowsOf(tenants.data);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Audit log</h1>
      <p className="mt-1 text-sm text-msr-muted">Search actions, actors, and resources with a date range.</p>
      <PanelToolbar
        search={q}
        onSearch={setQ}
        searchPlaceholder="Action, actor email, path, request id"
        onReset={reset}
        filters={[
          {
            key: "resource",
            label: "Resource",
            value: filters.resource || "",
            onChange: (value) => setFilter("resource", value),
            options: ["tenant", "user", "role", "order", "cms", "settings"].map((value) => ({ value, label: value })),
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
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No audit events match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "createdAt", label: "When", render: (row) => formatDateTime(row.createdAt) },
            { key: "actor", label: "Actor", render: (row) => row.actorId?.email || row.actorId?.name || "—" },
            { key: "action", label: "Action", render: (row) => <span className="font-mono text-xs">{row.action}</span> },
            { key: "resource", label: "Resource", render: (row) => row.resource },
            { key: "tenant", label: "Tenant", render: (row) => row.tenantId?.name || "Platform" },
            { key: "ip", label: "IP", render: (row) => row.ip || "—" },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
    </div>
  );
}
