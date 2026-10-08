export const ROLES = {
  BUYER: "buyer",
  TENANT: "tenant",
  SUPER_ADMIN: "super_admin",
};

function tenantIdOf(user) {
  const value = user?.tenantId ?? user?.tenant?.id ?? user?.tenant?._id;
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id || "") || null;
  return String(value);
}

/**
 * Which panel a user belongs to, from the API user (GET /auth/me or login `user`).
 * - role.scope === "platform"            → super admin (the backend only honours the system role)
 * - staff role (not buyer) + a tenantId  → tenant panel (system or custom roles)
 * - everything else                      → buyer
 *
 * Legacy call style `mapApiRole("tenant_admin")` (slug only) is still accepted.
 */
export function mapApiRole(roleOrUser, maybeTenantId) {
  if (typeof roleOrUser === "string") {
    if (roleOrUser === "super_admin") return ROLES.SUPER_ADMIN;
    if (roleOrUser === "buyer" || !roleOrUser) return ROLES.BUYER;
    return maybeTenantId ? ROLES.TENANT : ROLES.BUYER;
  }
  const isUser = roleOrUser && ("email" in roleOrUser || "tenantId" in roleOrUser || "role" in roleOrUser);
  const role = isUser ? roleOrUser.role : roleOrUser;
  const tenantId = isUser ? tenantIdOf(roleOrUser) : maybeTenantId;
  if (!role) return ROLES.BUYER;
  if (role.scope === "platform") return ROLES.SUPER_ADMIN;
  if (role.slug === "buyer") return ROLES.BUYER;
  return tenantId ? ROLES.TENANT : ROLES.BUYER;
}

export function homeFor(role) {
  if (role === ROLES.SUPER_ADMIN) return "/super-admin";
  if (role === ROLES.TENANT) return "/tenant";
  return "/";
}

export function loginFor() {
  return "/login";
}

export function portalLabel(role) {
  if (role === ROLES.SUPER_ADMIN) return "super admin";
  if (role === ROLES.TENANT) return "tenant";
  return "shopper";
}

export function isPortalPath(pathname, role) {
  if (!pathname || pathname.includes("/login")) return false;
  if (role === ROLES.SUPER_ADMIN) return pathname.startsWith("/super-admin");
  if (role === ROLES.TENANT) return pathname.startsWith("/tenant");
  return !pathname.startsWith("/tenant") && !pathname.startsWith("/super-admin");
}

export function prettyStatus(value) {
  return String(value || "")
    .replaceAll("_", " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function rowsOf(res) {
  if (Array.isArray(res)) return res;
  if (Array.isArray(res?.data)) return res.data;
  return [];
}

/**
 * Fail-closed permission check. No user / no permissions → false.
 * "*" only counts for the platform role (mirrors the backend: "*" on any other role is ignored).
 * `permission` may be a string or an array (any-of).
 */
export function can(user, permission) {
  if (!user || !permission) return false;
  if (Array.isArray(permission)) return permission.some((p) => can(user, p));
  const list = Array.isArray(user.permissions) ? user.permissions : [];
  if (!list.length) return false;
  if (list.includes("*") && user.role === ROLES.SUPER_ADMIN) return true;
  return list.includes(permission);
}

export function canAny(user, permissions = []) {
  return permissions.some((permission) => can(user, permission));
}

export function canAll(user, permissions = []) {
  return permissions.length > 0 && permissions.every((permission) => can(user, permission));
}

/**
 * Evaluate a requirement object used by nav items and route guards:
 *   { perm: "x" } | { any: ["x","y"] } | { all: ["x","y"] } | { public: true } | undefined
 * Items without any requirement are allowed only when `public` is set (fail closed).
 */
export function allows(user, req) {
  if (!req) return false;
  if (req.public) return Boolean(user);
  if (req.perm) return can(user, req.perm);
  if (req.any) return canAny(user, req.any);
  if (req.all) return canAll(user, req.all);
  return false;
}
