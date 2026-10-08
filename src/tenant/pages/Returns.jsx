import { PageHeader } from "../../shared/ui/index.js";
import ReturnsQueue from "../../shared/components/ReturnsQueue.jsx";

export default function Returns() {
  return (
    <>
      <PageHeader
        title="Returns & refunds"
        description="Approve or reject return requests, receive goods with an inspection, refund, and watch for failed refunds."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Returns & refunds" }]}
      />
      <ReturnsQueue orderHref={(o) => `/tenant/orders/${o._id}`} />
    </>
  );
}
