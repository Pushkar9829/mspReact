import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, MessageSquare } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useSocketEvent } from "../../shared/realtime/socket.js";
import { INVOICEABLE_STATUSES } from "../../shared/lib/panel.js";
import { Button, CopyButton, ErrorState, PageHeader, PageSkeleton, StatusPill, statusLabel, toast } from "../../shared/ui/index.js";
import OrderDetail from "../../shared/components/OrderDetail.jsx";
import OrderActions, { isRecentLocalOrderChange } from "../../shared/components/OrderActions.jsx";

export default function OrderPage() {
  const { id } = useParams();
  const can = useCan();
  const q = useQuery({ queryKey: keys.orders.detail(id), queryFn: () => api.getOrder(id) });
  // The panel shell refetches order queries on `order:updated`; tell the user when this order moved under them.
  useSocketEvent("order:updated", (payload) => {
    const current = q.data;
    const sameOrder = current && (String(payload?.orderId) === String(current._id) || payload?.order?.orderNumber === current.orderNumber);
    if (sameOrder && payload?.status && payload.status !== current.status && !isRecentLocalOrderChange(current._id)) {
      toast.info(`${current.orderNumber} is now ${statusLabel(payload.status).toLowerCase()}`, { description: "The order was updated elsewhere; this page has been refreshed." });
    }
  });

  if (q.isPending) return <PageSkeleton />;
  if (q.error) {
    return (
      <>
        <PageHeader title="Order" back="/tenant/orders" breadcrumbs={[{ label: "Orders", to: "/tenant/orders" }, { label: "Not available" }]} />
        <ErrorState error={q.error} title={q.error.status === 404 ? "Order not found" : "Couldn’t load this order"} onRetry={q.error.status === 404 ? undefined : q.refetch} />
      </>
    );
  }
  const order = q.data;
  const invoiceable = INVOICEABLE_STATUSES.includes(order.status) || Boolean(order.invoiceNumber);

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
        description={[order.buyerSnapshot?.company || order.buyerSnapshot?.name || order.buyerId?.name, order.poNumber && `PO ${order.poNumber}`].filter(Boolean).join(" · ")}
        meta={
          <>
            <StatusPill status={order.status} />
            <StatusPill status={order.paymentStatus} domain="payment" />
          </>
        }
        back="/tenant/orders"
        breadcrumbs={[{ label: "Orders", to: "/tenant/orders" }, { label: order.orderNumber }]}
        secondaryActions={
          <>
            {invoiceable ? (
              <Button size="sm" leftIcon={FileText} to={`/tenant/orders/${order._id}/invoice`}>
                Invoice
              </Button>
            ) : null}
            {can("chat.view") ? (
              <Button size="sm" variant="ghost" leftIcon={MessageSquare} to={`/tenant/support?q=${encodeURIComponent(order.orderNumber)}`}>
                Conversations
              </Button>
            ) : null}
          </>
        }
        primaryAction={<OrderActions order={order} />}
      />
      <OrderDetail
        order={order}
        invoiceHref={`/tenant/orders/${order._id}/invoice`}
        customerHref={(buyerId) => (buyerId && can(["reports.view", "orders.view", "ledger.view"]) ? `/tenant/customers/${buyerId}` : null)}
        productHref={(item) => (item.productId && can("products.view") ? `/tenant/products/${item.productId}` : null)}
      />
    </>
  );
}
