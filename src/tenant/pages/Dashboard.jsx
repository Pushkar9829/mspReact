import { Link } from "react-router-dom";
import { api } from "../../shared/api.js";
import { inr, formatDate } from "../../shared/lib/format.js";
import { rowsOf } from "../../shared/auth.js";
import { useApi } from "../../shared/hooks/useApi.js";
import { PanelState, PanelStat, PanelTable } from "../../shared/components/PanelTable.jsx";
import { StatusBadge } from "../../shared/components/PanelKit.jsx";

export default function Dashboard() {
  const { data, error, loading } = useApi(() => api.reportsOverview(), []);
  const orders = useApi(() => api.listOrders({ limit: 8 }), []);
  const recent = rowsOf(orders.data);

  return (
    <div>
      <h1 className="text-2xl font-extrabold">Dashboard</h1>
      <p className="mt-1 text-sm text-msr-muted">Orders, catalog, and stock for your store.</p>
      <PanelState loading={loading} error={error}>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Link to="/tenant/orders">
            <PanelStat label="Orders" value={data?.orders ?? 0} hint={`${data?.changes?.orders ?? 0}% vs prior 30 days`} />
          </Link>
          <Link to="/tenant/reports">
            <PanelStat label="GMV" value={inr(data?.gmv)} hint={`${data?.changes?.gmv ?? 0}% vs prior 30 days`} />
          </Link>
          <Link to="/tenant/products">
            <PanelStat label="Products" value={data?.publishedProducts ?? 0} hint={`${data?.products ?? 0} in catalog`} />
          </Link>
          <Link to="/tenant/customers">
            <PanelStat label="Customers" value={data?.customers ?? 0} hint={`${data?.lowStockCount ?? 0} low-stock SKUs`} />
          </Link>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Link to="/tenant/inventory">
            <PanelStat label="Low stock" value={data?.lowStockCount ?? 0} hint="Open inventory" />
          </Link>
          <Link to="/tenant/support">
            <PanelStat label="Open chats" value={data?.openChats ?? 0} hint="Support queue" />
          </Link>
        </div>
        <div className="mt-6">
          <div className="flex items-center justify-between">
            <h2 className="font-bold">Recent orders</h2>
            <Link to="/tenant/orders" className="text-sm font-semibold text-msr-purple">
              View all
            </Link>
          </div>
          <PanelState loading={orders.loading} error={orders.error} empty={!recent.length} emptyText="No orders yet.">
            <PanelTable
              rows={recent}
              rowKey={(row) => row._id}
              columns={[
                { key: "orderNumber", label: "Order", render: (row) => <span className="font-semibold">{row.orderNumber}</span> },
                { key: "customer", label: "Customer", render: (row) => row.buyerId?.name || row.buyerId?.email || "—" },
                { key: "total", label: "Amount", render: (row) => inr(row.total) },
                { key: "status", label: "Status", render: (row) => <StatusBadge value={row.status} /> },
                { key: "createdAt", label: "Date", render: (row) => formatDate(row.createdAt) },
              ]}
            />
          </PanelState>
        </div>
      </PanelState>
    </div>
  );
}
