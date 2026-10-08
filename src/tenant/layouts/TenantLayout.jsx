import { AppShell } from "../../shared/layout/AppShell.jsx";
import RequireAuth from "../../shared/components/RequireAuth.jsx";
import { ROLES } from "../../shared/auth.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { TenantProvider } from "../../shared/context/TenantContext.jsx";
import { tenantNav, tenantSearchers } from "./nav.js";
import { useOrderLiveUpdates } from "../../shared/components/orderQueues.js";

/** Keeps order lists, queue counts and order details fresh from the `order:updated` socket event. */
function OrderLiveUpdates() {
  const { can, status } = useAuth();
  useOrderLiveUpdates({ enabled: status === "authenticated" && can("orders.view") });
  return null;
}

export default function TenantLayout() {
  const { user } = useAuth();
  return (
    <RequireAuth roles={[ROLES.TENANT]}>
      <TenantProvider>
        <OrderLiveUpdates />
        <AppShell nav={tenantNav} eyebrow={user?.tenant || "Store admin"} searchers={tenantSearchers} />
      </TenantProvider>
    </RequireAuth>
  );
}
