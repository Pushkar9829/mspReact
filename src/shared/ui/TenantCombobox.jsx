import { useQuery } from "@tanstack/react-query";
import { api } from "../api/index.js";
import { keys } from "../api/keys.js";
import { Combobox } from "./Combobox.jsx";
import { statusLabel } from "./status.js";

/** Every tenant, cached for 5 minutes (shared cache key). Use for small lookups (id → name). */
export function useTenantsQuery(options = {}) {
  return useQuery({
    queryKey: keys.tenants.custom("all"),
    queryFn: () => api.withTenant(null).listAllTenants(),
    staleTime: 5 * 60_000,
    select: (res) => res?.data || [],
    ...options,
  });
}

/** One tenant by id (cached). */
export function useTenantQuery(id, options = {}) {
  return useQuery({
    queryKey: keys.tenants.detail(id),
    queryFn: () => api.withTenant(null).getTenant(id),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
    ...options,
  });
}

const toOption = (t) => ({
  value: String(t._id || t.id),
  label: t.name,
  description: [t.slug, t.status && t.status !== "active" ? statusLabel(t.status) : null].filter(Boolean).join(" · "),
  tenant: t,
});

/**
 * Async tenant picker (server search over GET /tenants?q=). Platform admins only.
 *   <TenantCombobox value={tenantId} onChange={(id, option) => …} clearable placeholder="All tenants" />
 */
export function TenantCombobox({ value, onChange, placeholder = "Select a tenant", clearable = true, status, ...props }) {
  const selected = useTenantQuery(value, { enabled: Boolean(value) });
  return (
    <Combobox
      value={value || ""}
      onChange={onChange}
      queryKey={keys.tenants.custom("combobox", status || "any")}
      search={(q) => api.withTenant(null).listTenants({ q, limit: 20, status })}
      mapOption={toOption}
      selectedLabel={selected.data?.name}
      placeholder={placeholder}
      searchPlaceholder="Search tenants…"
      emptyText="No tenants match"
      clearable={clearable}
      {...props}
    />
  );
}

export default TenantCombobox;
