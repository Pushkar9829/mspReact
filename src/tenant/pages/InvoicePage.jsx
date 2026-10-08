import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { PageHeader } from "../../shared/ui/index.js";
import { InvoicePanel } from "../../shared/components/InvoiceView.jsx";

export default function InvoicePage() {
  const { id } = useParams();
  // Reuses the order detail cache when coming from the order page.
  const order = useQuery({ queryKey: keys.orders.detail(id), queryFn: () => api.getOrder(id) });
  const number = order.data?.orderNumber || "Order";
  return (
    <>
      <PageHeader
        title="Invoice"
        documentTitle={order.data?.invoiceNumber ? `Invoice ${order.data.invoiceNumber}` : "Invoice"}
        description={order.data ? <span className="break-all">{order.data.invoiceNumber ? `${order.data.invoiceNumber} · ` : ""}order {number}</span> : undefined}
        back={`/tenant/orders/${id}`}
        breadcrumbs={[
          { label: "Orders", to: "/tenant/orders" },
          { label: number, to: `/tenant/orders/${id}` },
          { label: "Invoice" },
        ]}
        className="print:hidden"
      />
      <InvoicePanel orderId={id} />
    </>
  );
}
