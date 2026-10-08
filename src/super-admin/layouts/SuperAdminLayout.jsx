import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Building2 } from "lucide-react";
import { keys } from "../../shared/api/keys.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { useOrderLiveUpdates } from "../../shared/components/orderQueues.js";
import { AppShell } from "../../shared/layout/AppShell.jsx";
import RequireAuth from "../../shared/components/RequireAuth.jsx";
import { ROLES } from "../../shared/auth.js";
import { TenantProvider, useTenantContext } from "../../shared/context/TenantContext.jsx";
import { TenantCombobox } from "../../shared/ui/TenantCombobox.jsx";
import { Tooltip } from "../../shared/ui/overlays.jsx";
import { superAdminNav, superAdminSearchers } from "./nav.js";

/**
 * Tenant switcher: sets X-Tenant-Id for every request (needed by tenant-scoped routes such as
 * inventory, ledger accounts, tenant settings and role creation). Empty = all tenants.
 */
function TenantSwitcher() {
  const { tenantId, setTenantId } = useTenantContext();
  return (
    <Tooltip content="Acting on this tenant (X-Tenant-Id). Clear to see all tenants.">
      <div className="flex items-center gap-2">
        <Building2 aria-hidden className="hidden size-4 text-fg-subtle lg:block" />
        <TenantCombobox
          value={tenantId || ""}
          onChange={(id) => setTenantId(id || null)}
          placeholder="All tenants"
          size="sm"
          className="w-full sm:w-52"
          aria-label="Tenant context"
        />
      </div>
    </Tooltip>
  );
}

/**
 * `order:updated` (platform admins get every store's orders): refetch order lists, queue counts and
 * details, plus the sales reports that depend on them. Coalesced to one refetch per burst.
 */
function OrderLiveUpdates() {
  const { can, status } = useAuth();
  const qc = useQueryClient();
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  useOrderLiveUpdates({
    enabled: status === "authenticated" && can("orders.view"),
    onUpdate: () => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => qc.invalidateQueries({ queryKey: keys.reports.all }), 2000);
    },
  });
  return null;
}

export default function SuperAdminLayout() {
  return (
    <RequireAuth roles={[ROLES.SUPER_ADMIN]}>
      <TenantProvider>
        <OrderLiveUpdates />
        <AppShell nav={superAdminNav} eyebrow="Company console" searchers={superAdminSearchers} topbarStart={<TenantSwitcher />} />
      </TenantProvider>
    </RequireAuth>
  );
}
