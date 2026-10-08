import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { getPlatformTenant, setPlatformTenant } from "../api/client.js";
import { useAuth } from "./AuthContext.jsx";
import { ROLES } from "../auth.js";

/**
 * Tenant context for API calls.
 *
 * - Staff: always their own tenant (read-only here).
 * - Platform admin: the tenant picked in the topbar switcher (persisted per tab in sessionStorage),
 *   sent as X-Tenant-Id on every request. null = all tenants / platform scope.
 *   Routes guarded by `requireTenant` on the backend (inventory, warehouses, pricing/offers/coupons,
 *   ledger accounts, reports/customers, tenant-scope settings, creating roles) need one selected,
 *   or pass it per call: `api.withTenant(id).listInventory()`.
 *
 *   const { tenantId, setTenantId, isPlatform } = useTenantContext();
 */
const KEY = "msr-platform-tenant";
const TenantContext = createContext({ tenantId: null, setTenantId: () => {}, isPlatform: false });

function initial() {
  try {
    const v = sessionStorage.getItem(KEY) || null;
    setPlatformTenant(v);
    return v;
  } catch {
    return getPlatformTenant();
  }
}

export function TenantProvider({ children }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(initial);
  const isPlatform = user?.role === ROLES.SUPER_ADMIN;

  const setTenantId = useCallback(
    (id) => {
      const next = id || null;
      setPlatformTenant(next);
      setSelected(next);
      try {
        if (next) sessionStorage.setItem(KEY, next);
        else sessionStorage.removeItem(KEY);
      } catch {
        /* ignore */
      }
      // Every cached response may depend on the tenant header: refetch everything.
      queryClient.resetQueries();
    },
    [queryClient]
  );

  const value = useMemo(
    () => ({
      tenantId: isPlatform ? selected : user?.tenantId || null,
      setTenantId: isPlatform ? setTenantId : () => {},
      isPlatform,
    }),
    [isPlatform, selected, user?.tenantId, setTenantId]
  );
  return <TenantContext.Provider value={value}>{children}</TenantContext.Provider>;
}

export function useTenantContext() {
  return useContext(TenantContext);
}
