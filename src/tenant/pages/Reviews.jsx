import { PageHeader } from "../../shared/ui/index.js";
import ReviewModeration from "../../shared/components/ReviewModeration.jsx";

export default function Reviews() {
  return (
    <>
      <PageHeader
        title="Reviews"
        description="Moderate buyer reviews of your products. Hidden reviews don’t count toward ratings."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Reviews" }]}
      />
      <ReviewModeration productHref={(p) => `/tenant/products/${p._id || p.id}`} buyerHref={(userId) => `/tenant/customers/${userId}`} />
    </>
  );
}
