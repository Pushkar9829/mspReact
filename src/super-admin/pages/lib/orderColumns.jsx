import { paymentLabel } from "../../../shared/lib/format.js";
import { DateTime, Money, StatusPill } from "../../../shared/ui/index.js";
import { TenantLink } from "./tenantScope.jsx";

export const orderHref = (o) => `/super-admin/orders/${o._id}`;

const buyerName = (o) => o.buyerSnapshot?.name || o.buyerId?.name || "";
const buyerEmail = (o) => o.buyerSnapshot?.email || o.buyerId?.email || "";

/** Standard order columns for platform tables. All amounts are the server's (`total`). */
export function orderColumns({ showTenant = true, extra = [], sortable = false } = {}) {
  return [
    {
      id: "number",
      header: "Order",
      primary: true,
      accessorKey: "orderNumber",
      sortKey: sortable ? "orderNumber" : undefined,
      cell: (o) => <span className="whitespace-nowrap font-mono text-ui-sm">{o.orderNumber || o._id}</span>,
      csv: (o) => o.orderNumber,
    },
    showTenant
      ? { id: "tenant", header: "Tenant", cell: (o) => <TenantLink tenant={o.tenantId} />, csv: (o) => o.tenantId?.name || o.tenantId, mobile: "meta" }
      : null,
    {
      id: "buyer",
      header: "Buyer",
      cell: (o) => (
        <span className="grid min-w-0">
          <span className="truncate">{buyerName(o) || "—"}</span>
          {buyerEmail(o) ? <span className="truncate text-ui-xs text-fg-subtle">{buyerEmail(o)}</span> : null}
        </span>
      ),
      csv: (o) => `${buyerName(o)} <${buyerEmail(o)}>`,
      mobile: "subtitle",
    },
    { id: "placed", header: "Placed", sortKey: sortable ? "createdAt" : undefined, cell: (o) => <DateTime value={o.createdAt} />, csv: (o) => o.createdAt, mobile: "meta" },
    { id: "status", header: "Status", sortKey: sortable ? "status" : undefined, cell: (o) => <StatusPill status={o.status} />, csv: (o) => o.status, mobile: "meta" },
    {
      id: "payment",
      header: "Payment",
      cell: (o) => (
        <span className="flex flex-wrap items-center gap-1.5">
          <StatusPill status={o.paymentStatus} domain="payment" />
          <span className="text-ui-xs text-fg-subtle">{paymentLabel(o.paymentMethod)}</span>
        </span>
      ),
      csv: (o) => `${o.paymentStatus} ${o.paymentMethod}`,
    },
    { id: "items", header: "Items", align: "right", accessorFn: (o) => (o.items || []).length, defaultHidden: true },
    { id: "total", header: "Total", align: "right", sortKey: sortable ? "grandTotal" : undefined, cell: (o) => <Money value={o.total ?? o.grandTotal} />, csv: (o) => o.total ?? o.grandTotal, mobile: "meta" },
    ...extra,
  ].filter(Boolean);
}
