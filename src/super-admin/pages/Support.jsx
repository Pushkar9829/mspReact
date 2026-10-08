import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { keys } from "../../shared/api/keys.js";
import { PageHeader } from "../../shared/ui/index.js";
import SupportInbox from "../../shared/components/SupportInbox.jsx";
import { TenantFilter, useTenantScope } from "./lib/tenantScope.jsx";

/**
 * Cross-tenant support inbox. `?tenant=` (or the topbar switcher) narrows it to one store; every
 * request then carries that store's X-Tenant-Id.
 */
export default function Support() {
  const scope = useTenantScope();
  const qc = useQueryClient();
  const prev = useRef(scope.tenantId);
  // SupportInbox's list key has no tenant in it: drop cached lists when the store filter changes.
  useEffect(() => {
    if (prev.current !== scope.tenantId) {
      qc.removeQueries({ queryKey: keys.chats.all });
      prev.current = scope.tenantId;
    }
  }, [scope.tenantId, qc]);

  return (
    <>
      <PageHeader
        title="Support"
        description="Conversations across every store. Reply, add internal notes, assign, escalate or close."
        breadcrumbs={[{ label: "Console", to: "/super-admin" }, { label: "Support" }]}
        actions={<TenantFilter value={scope.tenantId} onChange={scope.setTenant} />}
      />
      <SupportInbox
        key={scope.tenantId || "all"}
        header={false}
        showTenants={!scope.tenantId}
        apiClient={scope.api}
        orderHref={(id) => `/super-admin/orders/${id}`}
      />
    </>
  );
}
