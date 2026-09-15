import { Link } from "react-router-dom";
import { api } from "../../shared/api.js";
import { rowsOf } from "../../shared/auth.js";
import { formatDate, inr } from "../../shared/lib/format.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { PanelState, PanelStat, PanelTable } from "../../shared/components/PanelTable.jsx";
import { StatusBadge } from "../../shared/components/PanelKit.jsx";

export default function SuperAdminOverview() {
  const overview = useApi(() => api.reportsOverview(), []);
  const sales = useApi(() => api.reportsSales(30), []);
  const orders = useApi(() => api.listOrders({ limit: 8 }), []);
  const data = overview.data;
  const recent = rowsOf(orders.data);
  const trend = Array.isArray(sales.data) ? sales.data : [];

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Platform overview</h1>
      <p className="mt-1 text-sm text-msr-muted">Live counts across tenants, orders, and support.</p>
      <PanelState loading={overview.loading} error={overview.error}>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/super-admin/tenants">
            <PanelStat label="Active tenants" value={data?.tenants ?? 0} hint="Open tenant list" />
          </Link>
          <Link to="/super-admin/users">
            <PanelStat label="Users" value={data?.users ?? data?.buyers ?? 0} hint={`${data?.buyers ?? 0} buyers`} />
          </Link>
          <Link to="/super-admin/orders">
            <PanelStat label="Orders" value={data?.orders ?? 0} hint={inr(data?.gmv)} />
          </Link>
          <Link to="/super-admin/support">
            <PanelStat label="Open chats" value={data?.openChats ?? 0} hint="Support queue" />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <PanelStat label="Published products" value={data?.products ?? 0} />
          <PanelStat label="Low stock SKUs" value={data?.lowStock ?? 0} />
        </div>
      </PanelState>

      <div className="mt-6 grid gap-4 xl:grid-cols-2">
        <div className="rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Sales last 30 days</h2>
            <Link to="/super-admin/analytics" className="text-sm font-semibold text-msr-purple">
              Analytics
            </Link>
          </div>
          <PanelState loading={sales.loading} error={sales.error} empty={!trend.length} emptyText="No sales in this window.">
            <ul className="mt-3 grid max-h-72 gap-1 overflow-y-auto text-sm">
              {trend.slice(-14).map((row) => (
                <li key={row._id} className="flex justify-between gap-3 border-b border-msr-border py-1.5">
                  <span className="text-msr-muted">{row._id}</span>
                  <span className="font-semibold">
                    {row.orders} · {inr(row.gmv)}
                  </span>
                </li>
              ))}
            </ul>
          </PanelState>
        </div>
        <div>
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link to="/super-admin/orders" className="text-sm font-semibold text-msr-purple">
              View all
            </Link>
          </div>
          <PanelState loading={orders.loading} error={orders.error} empty={!recent.length} emptyText="No orders yet.">
            <PanelTable
              rows={recent}
              rowKey={(row) => row._id}
              columns={[
                { key: "orderNumber", label: "Order", render: (row) => <span className="font-semibold">{row.orderNumber}</span> },
                { key: "tenant", label: "Tenant", render: (row) => row.tenantId?.name || "—" },
                { key: "total", label: "Amount", render: (row) => inr(row.total) },
                { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
                { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
              ]}
            />
          </PanelState>
        </div>
      </div>
    </div>
  );
}
