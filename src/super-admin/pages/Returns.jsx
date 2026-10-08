import { api } from "../../shared/api/index.js";
import { useTenantContext } from "../../shared/context/TenantContext.jsx";
import { Alert, PageHeader } from "../../shared/ui/index.js";
import ReturnsQueue from "../../shared/components/ReturnsQueue.jsx";
import { TenantLink } from "./lib/tenantScope.jsx";

const tenantOf = (o) => String(o.tenantId?._id || o.tenantId || "") || null;

/**
 * Cross-tenant returns & refunds queue. Scope follows the topbar tenant switcher (which resets the
 * query cache); each row's actions run in that order's own tenant context.
 */
export default function Returns() {
  const { tenantId } = useTenantContext();
  const listApi = api.withTenant(tenantId || null);
  return (
    <>
      <PageHeader
        title="Returns & refunds"
        description="Every store’s return requests, goods in transit back, refunds to issue and refunds that failed."
        breadcrumbs={[{ label: "Console", to: "/super-admin" }, { label: "Returns & refunds" }]}
      />
      {tenantId ? (
        <Alert tone="info" className="mb-4">
          Showing one store: <TenantLink tenant={tenantId} />. Clear the tenant in the top bar to see every store.
        </Alert>
      ) : null}
      <ReturnsQueue
        showTenant={!tenantId}
        scope={`sa:${tenantId || "all"}`}
        apiClient={listApi}
        apiClientFor={(o) => api.withTenant(tenantOf(o))}
        orderHref={(o) => `/super-admin/orders/${o._id}`}
      />
    </>
  );
}
