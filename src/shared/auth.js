export const ROLES = {
  BUYER: "buyer",
  TENANT: "tenant",
  SUPER_ADMIN: "super_admin",
};

export function mapApiRole(roleSlug) {
  const slug = typeof roleSlug === "string" ? roleSlug : roleSlug?.slug || "";
  if (slug === "super_admin" || slug === "admin") return ROLES.SUPER_ADMIN;
  if (
    slug === "vendor" ||
    slug === "seller" ||
    slug === "tenant" ||
    slug === "tenant_admin" ||
    slug === "support_agent"
  ) {
    return ROLES.TENANT;
  }
  return ROLES.BUYER;
}

export function homeFor(role) {
  if (role === ROLES.SUPER_ADMIN) return "/super-admin";
  if (role === ROLES.TENANT) return "/tenant";
  return "/";
}

export function loginFor(role) {
  if (role === ROLES.SUPER_ADMIN) return "/super-admin/login";
  if (role === ROLES.TENANT) return "/tenant/login";
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
