import { useMemo } from "react";
import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { ErrorState, PageHeader, PageSkeleton } from "../../shared/ui/index.js";
import { InvoicePanel } from "../../shared/components/InvoiceView.jsx";

const B = "/super-admin/orders";

export default function OrderInvoice() {
  const { id } = useParams();
  // Shares the order-detail cache with OrderPage.
  const order = useQuery({ queryKey: keys.orders.detail(id), queryFn: () => api.withTenant(null).getOrder(id) });
  const tenantId = order.data ? String(order.data.tenantId?._id || order.data.tenantId || "") : "";
  const scoped = useMemo(() => api.withTenant(tenantId || null), [tenantId]);
  const number = order.data?.orderNumber || "Order";

  if (order.isPending) return <PageSkeleton />;
  if (order.error) {
    return (
      <>
        <PageHeader title="Invoice" back={B} breadcrumbs={[{ label: "Orders", to: B }, { label: "Invoice" }]} />
        <ErrorState error={order.error} onRetry={order.refetch} />
      </>
    );
  }
  return (
    <>
      <PageHeader
        title={order.data?.invoiceNumber ? `Invoice ${order.data.invoiceNumber}` : "Invoice"}
        description={`Tax invoice for order ${number}${order.data?.tenantId?.name ? ` · ${order.data.tenantId.name}` : ""}`}
        back={`${B}/${id}`}
        breadcrumbs={[
          { label: "Orders", to: B },
          { label: number, to: `${B}/${id}` },
          { label: "Invoice" },
        ]}
        className="print:hidden"
      />
      <InvoicePanel orderId={id} apiClient={scoped} />
    </>
  );
}
