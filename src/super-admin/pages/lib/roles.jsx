import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";

const idOf = (v) => (v && typeof v === "object" ? String(v._id || v.id || "") : v ? String(v) : "");

/** Every role visible in a tenant context (all pages). */
export async function fetchAllRoles(tenantId) {
  const scoped = api.withTenant(tenantId || null);
  const first = await scoped.listRoles({ limit: 100, page: 1 });
  const data = [...(first?.data || [])];
  const pages = Number(first?.meta?.pages) || 1;
  for (let page = 2; page <= pages; page += 1) {
    const next = await scoped.listRoles({ limit: 100, page });
    data.push(...(next?.data || []));
  }
  return data;
}

/** Account class of a role / user: "platform" | "buyer" | "staff". */
export function roleKind(role) {
  if (!role) return "staff";
  if (role.scope === "platform") return "platform";
  if (role.slug === "buyer" && (role.isSystem === undefined || role.isSystem)) return "buyer";
  return "staff";
}

/**
 * Roles that can be given to an account of `kind` belonging to `tenantId` (mirrors users/service
 * loadAssignableRole + the buyer/staff/platform conversion guard).
 */
export function assignableRoles(roles = [], { tenantId, kind }) {
  return roles.filter((r) => {
    const k = roleKind(r);
    if (k !== kind) return false;
    if (k === "platform" || k === "buyer") return true;
    const systemTenantRole = r.isSystem && r.scope === "tenant" && !r.tenantId;
    return systemTenantRole || (tenantId && idOf(r.tenantId) === String(tenantId));
  });
}

export function useRolesFor(tenantId, options = {}) {
  return useQuery({
    queryKey: keys.roles.custom("all", tenantId || "platform"),
    queryFn: () => fetchAllRoles(tenantId),
    staleTime: 60_000,
    ...options,
  });
}

export function roleOptions(roles = []) {
  return roles.map((r) => ({
    value: String(r._id || r.id),
    label: r.name,
    description: [r.isSystem ? "System role" : "Custom role", `${(r.permissions || []).length} permissions`].join(" · "),
  }));
}
