const B = "/super-admin";

/** Console URL for an audited resource, or null when there is no page for it. */
export function entityHref(resource, id, { tenantId } = {}) {
  const rid = id && typeof id === "object" ? id._id || id.id : id;
  const tq = tenantId ? `?tenant=${encodeURIComponent(tenantId)}` : "";
  switch (resource) {
    case "order":
      return rid ? `${B}/orders/${rid}` : `${B}/orders`;
    case "tenant":
      return rid ? `${B}/tenants/${rid}` : `${B}/tenants`;
    case "user":
      return rid ? `${B}/users/${rid}` : `${B}/users`;
    case "role":
      return rid ? `${B}/roles/${rid}` : `${B}/roles`;
    case "product":
      return rid ? `${B}/catalog/${rid}` : `${B}/catalog`;
    case "cms":
      return rid ? `${B}/cms/${rid}` : `${B}/cms`;
    case "review":
      return `${B}/reviews`;
    case "offer":
      return `${B}/offers${tq}`;
    case "ledger":
      return `${B}/ledger${tq}`;
    case "settings":
      return `${B}/settings`;
    case "notification":
      return `${B}/announcements`;
    default:
      return null;
  }
}

export { B as SUPER_ADMIN_BASE };
