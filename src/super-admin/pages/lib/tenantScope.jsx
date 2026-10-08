import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Building2 } from "lucide-react";
import { api } from "../../../shared/api/index.js";
import { useTenantContext } from "../../../shared/context/TenantContext.jsx";
import { Card, EmptyState, TenantCombobox, useTenantsQuery } from "../../../shared/ui/index.js";
import { cn } from "../../../shared/ui/cn.js";

/**
 * Page-level tenant scope for the platform console.
 *
 *   const scope = useTenantScope();               // ?tenant= in the URL, falls back to the topbar switcher
 *   scope.tenantId                               // "" = all tenants / platform scope
 *   scope.api.listOffers(query)                  // api bound to X-Tenant-Id: scope.tenantId (or none)
 *   scope.setTenant(id)                          // writes ?tenant= (and resets ?page)
 *
 * Query keys must include `scope.tenantId`: the cache is only reset when the *topbar* tenant changes.
 */
export function useTenantScope({ param = "tenant", fallbackToContext = true } = {}) {
  const [params, setParams] = useSearchParams();
  const { tenantId: ctxTenant } = useTenantContext();
  const urlTenant = params.get(param) || "";
  const tenantId = urlTenant || (fallbackToContext ? ctxTenant || "" : "");
  const setTenant = useCallback(
    (id) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        if (id) next.set(param, id);
        else next.delete(param);
        next.delete("page");
        return next;
      }),
    [setParams, param]
  );
  const scopedApi = useMemo(() => api.withTenant(tenantId || null), [tenantId]);
  return { tenantId, setTenant, api: scopedApi, fromContext: !urlTenant && Boolean(ctxTenant && fallbackToContext) };
}

/** Inline tenant filter for toolbars. */
export function TenantFilter({ value, onChange, placeholder = "All tenants", className }) {
  return (
    <TenantCombobox
      value={value || ""}
      onChange={(id) => onChange(id || "")}
      placeholder={placeholder}
      size="sm"
      className={cn("w-full sm:w-56", className)}
      aria-label="Filter by tenant"
    />
  );
}

/** Empty state for pages whose endpoints need a tenant context (backend `requireTenant`). */
export function TenantRequired({ title = "Choose a tenant", description, value, onChange, icon = Building2 }) {
  return (
    <Card>
      <EmptyState
        icon={icon}
        title={title}
        description={description || "This data belongs to a store. Pick the tenant you want to work on."}
        action={
          <div className="w-72 max-w-full">
            <TenantCombobox value={value || ""} onChange={(id) => onChange(id || "")} placeholder="Search tenants…" aria-label="Tenant" />
          </div>
        }
      />
    </Card>
  );
}

function idOf(t) {
  if (!t) return "";
  if (typeof t === "object") return String(t._id || t.id || "");
  return String(t);
}

/** Tenant name linked to its detail page. Accepts a populated tenant object or an id. */
export function TenantLink({ tenant, fallback = "Platform", className }) {
  const id = idOf(tenant);
  const lookup = useTenantsQuery({ enabled: Boolean(id) && !(tenant && typeof tenant === "object" && tenant.name) });
  if (!id) return <span className={cn("text-fg-subtle", className)}>{fallback}</span>;
  const name = (typeof tenant === "object" && tenant.name) || lookup.data?.find((t) => String(t._id) === id)?.name || "Tenant";
  return (
    <Link to={`/super-admin/tenants/${id}`} className={cn("text-fg hover:underline", className)}>
      {name}
    </Link>
  );
}

export { idOf as tenantIdOf };

/**
 * Run `fn(scopedApi, tenant)` for every tenant (optionally filtered by status) with limited concurrency.
 * For endpoints that only work inside a tenant context (offers, coupons, ledger…). Returns
 * [{ tenant, data?, error? }].
 */
export async function forEachTenant(fn, { statuses, concurrency = 4 } = {}) {
  const res = await api.withTenant(null).listAllTenants();
  const tenants = (res?.data || []).filter((t) => !statuses || statuses.includes(t.status));
  const out = new Array(tenants.length);
  let cursor = 0;
  async function worker() {
    while (cursor < tenants.length) {
      const i = cursor++;
      const tenant = tenants[i];
      try {
        out[i] = { tenant, data: await fn(api.withTenant(tenant._id), tenant) };
      } catch (error) {
        out[i] = { tenant, error };
      }
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, tenants.length) }, worker));
  return out;
}
