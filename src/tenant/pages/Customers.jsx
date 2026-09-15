import { api } from "../../shared/api.js";
import { inr, formatDate } from "../../shared/lib/format.js";
import { rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { useListQuery } from "../../shared/hooks/useListQuery.js";
import { PanelState, PanelTable } from "../../shared/components/PanelTable.jsx";
import { PanelPager, PanelToolbar, StatusBadge } from "../../shared/components/PanelKit.jsx";
import { metaOf, rowId } from "../../shared/lib/panel.js";

export default function Customers() {
  const { q, setQ, page, setPage, reset, query } = useListQuery();
  const { data, error, loading } = useApi(() => api.reportsCustomers(query), [query]);
  const rows = rowsOf(data);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Customers</h1>
      <p className="mt-1 text-sm text-msr-muted">Retailers who have ordered from this store.</p>
      <PanelToolbar search={q} onSearch={setQ} searchPlaceholder="Name, email, phone" onReset={reset} />
      <PanelState loading={loading && !data} error={error} empty={!rows.length} emptyText="No buyers match these filters.">
        <PanelTable
          rows={rows}
          rowKey={rowId}
          columns={[
            { key: "name", label: "Retailer", render: (row) => <span className="font-semibold">{row.name}</span> },
            { key: "email", label: "Email", render: (row) => row.email || "—" },
            { key: "city", label: "City", render: (row) => row.city || "—" },
            { key: "orders", label: "Orders" },
            { key: "spend", label: "Lifetime spend", render: (row) => inr(row.spend) },
            { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
            { key: "lastOrderAt", label: "Last order", render: (row) => formatDate(row.lastOrderAt) },
          ]}
        />
      </PanelState>
      <PanelPager meta={metaOf(data)} page={page} onPage={setPage} />
    </div>
  );
}
