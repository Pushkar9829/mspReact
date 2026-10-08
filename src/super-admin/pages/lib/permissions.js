/**
 * Permission catalog helpers for the role editor. GET /permissions is the source of truth:
 * `[{ key, resource, action, group, label, description, platformOnly }]`, sorted by group.
 */

/** Never assignable to tenant / custom roles (backend: isPlatformOnlyPermission). */
export function isPlatformOnly(key, row) {
  if (row && typeof row.platformOnly === "boolean") return row.platformOnly || key === "*";
  return key === "*" || String(key).startsWith("tenants.");
}

/** Fallback label when a key is not in the catalog (e.g. a stale key stored on a role). */
export function labelOf(key) {
  const [resource, action = ""] = String(key).split(".");
  const a = action.charAt(0).toUpperCase() + action.slice(1);
  return resource ? `${a} ${resource}` : a;
}

/** Catalog rows indexed by key. */
export function indexCatalog(rows = []) {
  const map = new Map();
  rows.forEach((r) => {
    if (r && typeof r === "object" && r.key) map.set(r.key, r);
  });
  return map;
}

const slug = (s) => String(s || "other").toLowerCase().replace(/[^a-z0-9]+/g, "-");

/**
 * Group catalog rows for the matrix using the server's `group`, keeping the server order.
 * `tenantRole` hides platform-only keys. → [{ id, label, keys: [key], rows: [row] }]
 */
export function groupPermissions(rows = [], { tenantRole = true } = {}) {
  const groups = new Map();
  rows.forEach((r) => {
    const row = typeof r === "string" ? { key: r } : r;
    if (!row?.key || row.key === "*") return;
    if (tenantRole && isPlatformOnly(row.key, row)) return;
    const label = row.group || row.resource || row.key.split(".")[0];
    const id = slug(label);
    if (!groups.has(id)) groups.set(id, { id, label, keys: [], rows: [] });
    const g = groups.get(id);
    g.keys.push(row.key);
    g.rows.push(row);
  });
  return [...groups.values()];
}
