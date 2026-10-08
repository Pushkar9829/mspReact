import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, FileText, MessageSquare } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useSocketEvent } from "../../shared/realtime/socket.js";
import { INVOICEABLE_STATUSES } from "../../shared/lib/panel.js";
import { Button, CopyButton, ErrorState, PageHeader, PageSkeleton, StatusPill, toast } from "../../shared/ui/index.js";
import { prettyStatus } from "../../shared/auth.js";
import OrderDetail from "../../shared/components/OrderDetail.jsx";
import OrderActions, { isRecentLocalOrderChange } from "../../shared/components/OrderActions.jsx";

const B = "/super-admin/orders";

export default function OrderPage() {
  const { id } = useParams();
  const can = useCan();
  // Platform scope for the lookup (the topbar tenant must not hide another store's order).
  const q = useQuery({ queryKey: keys.orders.detail(id), queryFn: () => api.withTenant(null).getOrder(id) });
  // The console shell refetches order queries on `order:updated`; say so when this order moved under us.
  useSocketEvent("order:updated", (payload) => {
    const current = q.data;
    const same = current && (String(payload?.orderId) === String(current._id) || payload?.order?.orderNumber === current.orderNumber);
    if (same && payload?.status && payload.status !== current.status && !isRecentLocalOrderChange(current._id)) {
      toast.info(`${current.orderNumber} is now ${prettyStatus(payload.status)}`, { description: "The order was updated elsewhere; this page has been refreshed." });
    }
  });
  const order = q.data;
  const tenantId = order ? String(order.tenantId?._id || order.tenantId || "") : "";
  const scoped = useMemo(() => api.withTenant(tenantId || null), [tenantId]);

  if (q.isPending) return <PageSkeleton />;
  if (q.error) {
    return (
      <>
        <PageHeader title="Order" back={B} breadcrumbs={[{ label: "Orders", to: B }, { label: "Not available" }]} />
        <ErrorState error={q.error} title={q.error.status === 404 ? "Order not found" : "Couldn’t load this order"} onRetry={q.error.status === 404 ? undefined : q.refetch} />
      </>
    );
  }
  const invoiceable = INVOICEABLE_STATUSES.includes(order.status) || Boolean(order.invoiceNumber);
  const tenantName = order.tenantId?.name;

  return (
    <>
      <PageHeader
        title={
          <span className="inline-flex items-center gap-1.5">
            {order.orderNumber}
            <CopyButton value={order.orderNumber} label="Copy order number" />
          </span>
        }
        documentTitle={`Order ${order.orderNumber}`}
        description={[tenantName, order.buyerSnapshot?.company || order.buyerSnapshot?.name || order.buyerId?.name, order.poNumber && `PO ${order.poNumber}`].filter(Boolean).join(" · ")}
        meta={
          <>
            <StatusPill status={order.status} />
            <StatusPill status={order.paymentStatus} domain="payment" />
          </>
        }
        back={B}
        breadcrumbs={[
          { label: "Orders", to: B },
          ...(tenantId ? [{ label: tenantName || "Store", to: `${B}?tenant=${tenantId}` }] : []),
          { label: order.orderNumber },
        ]}
        secondaryActions={
          <>
            {tenantId ? (
              <Button size="sm" variant="ghost" leftIcon={Building2} to={`/super-admin/tenants/${tenantId}`}>
                Store
              </Button>
            ) : null}
            {invoiceable ? (
              <Button size="sm" leftIcon={FileText} to={`${B}/${order._id}/invoice`}>
                Invoice
              </Button>
            ) : null}
            {can("chat.view") ? (
              <Button size="sm" variant="ghost" leftIcon={MessageSquare} to={`/super-admin/support?q=${encodeURIComponent(order.orderNumber)}${tenantId ? `&tenant=${tenantId}` : ""}`}>
                Conversations
              </Button>
            ) : null}
          </>
        }
        primaryAction={<OrderActions order={order} apiClient={scoped} />}
      />
      <OrderDetail
        order={order}
        apiClient={scoped}
        showTenant
        invoiceHref={`${B}/${order._id}/invoice`}
        customerHref={(buyerId) => (buyerId && can("users.view") ? `/super-admin/users/${buyerId}` : null)}
        productHref={(item) => (item.productId && can("products.view") ? `/super-admin/catalog/${item.productId}` : null)}
      />
    </>
  );
}
