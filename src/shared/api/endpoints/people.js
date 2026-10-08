import { request, qs, enc } from "../client.js";

const V = "/api/v1";

export const peopleApi = {
  // Tenants (platform: tenants.view / create / edit)
  /** query: { q, status (comma list), sort: createdAt|updatedAt|name|slug|status, order, page, limit }. Rows include `staffCount`. */
  listTenants: (query = {}) => request(`${V}/tenants${qs({ limit: 20, ...query })}`),
  /** Every tenant (paged through). In components prefer useTenantsQuery() or <TenantCombobox>. */
  listAllTenants: async () => {
    const pageSize = 100;
    const first = await request(`${V}/tenants${qs({ limit: pageSize, page: 1 })}`);
    const data = Array.isArray(first?.data) ? [...first.data] : [];
    const pages = Number(first?.meta?.pages) || 1;
    for (let page = 2; page <= pages; page += 1) {
      const next = await request(`${V}/tenants${qs({ limit: pageSize, page })}`);
      if (Array.isArray(next?.data)) data.push(...next.data);
    }
    return { data, meta: { total: data.length, page: 1, limit: data.length, pages: 1 } };
  },
  getTenant: (id) => request(`${V}/tenants/${enc(id)}`),
  createTenant: (body) => request(`${V}/tenants`, { method: "POST", body }),
  updateTenant: (id, body) => request(`${V}/tenants/${enc(id)}`, { method: "PATCH", body }),
  getMyTenant: () => request(`${V}/tenants/me`),
  updateMyTenant: (body) => request(`${V}/tenants/me`, { method: "PATCH", body }),

  /**
   * query: { q, status, role, roleId, staff: "true"|"false" (false = buyers), emailVerified: "true"|"false", homeTenantId,
   *          from, to, sort: createdAt|name|email|lastLoginAt|status|updatedAt, order, page, limit }.
   * Rows: public user + homeTenant { id, name, slug } | null.
   */
  listUsers: (query = {}) => request(`${V}/users${qs({ limit: 50, ...query })}`),
  getUser: (id) => request(`${V}/users/${enc(id)}`),
  createUser: (body) => request(`${V}/users`, { method: "POST", body }),
  updateUser: (id, body) => request(`${V}/users/${enc(id)}`, { method: "PATCH", body }),
  /** Suspends the user and revokes their sessions. */
  deleteUser: (id) => request(`${V}/users/${enc(id)}`, { method: "DELETE" }),
  /** Revokes every session and access token of the user (users.edit). → { ok, id, revokedAt } */
  signOutUserEverywhere: (id) => request(`${V}/users/${enc(id)}/sign-out-everywhere`, { method: "POST" }),

  // Roles & permissions — listRoles returns { data, meta }; rows carry `usersCount`.
  // query: { scope: platform|tenant|staff|buyer (platform), system: "true"|"false", q, page, limit }
  listRoles: (query = {}) => request(`${V}/roles${qs({ limit: 100, ...query })}`),
  getRole: (id) => request(`${V}/roles/${enc(id)}`),
  /** Platform admins must pass a tenant context (or body.tenantId): custom roles belong to a tenant. */
  createRole: (body) => request(`${V}/roles`, { method: "POST", body }),
  updateRole: (id, body) => request(`${V}/roles/${enc(id)}`, { method: "PATCH", body }),
  /** 409 ROLE_IN_USE while a user holds it. */
  deleteRole: (id) => request(`${V}/roles/${enc(id)}`, { method: "DELETE" }),
  /** → [{ _id, key, resource, action, group, label, description, platformOnly }] sorted by group. */
  listPermissions: () => request(`${V}/permissions`),

  // Buyer ledger. Seller side needs ledger.view / ledger.manage and a tenant context.
  getLedger: (query = {}) => request(`${V}/ledger/me${qs(query)}`),
  listLedgerAccounts: (query = {}) => request(`${V}/ledger/accounts${qs({ limit: 20, ...query })}`),
  getLedgerAccount: (userId) => request(`${V}/ledger/accounts/${enc(userId)}`),
  getLedgerStatement: (userId, query = {}) => request(`${V}/ledger/accounts/${enc(userId)}/statement${qs(query)}`),
  /** body: { creditEnabled?, purchaseOrderEnabled?, creditLimit?, paymentDays? } */
  setLedgerTerms: (userId, body) => request(`${V}/ledger/accounts/${enc(userId)}/terms`, { method: "PUT", body }),
  /** body: { amount (>0), reference?, note? } */
  recordLedgerPayment: (userId, body) => request(`${V}/ledger/accounts/${enc(userId)}/payments`, { method: "POST", body }),
  /** body: { amount (signed, non-zero), note (required) } */
  adjustLedger: (userId, body) => request(`${V}/ledger/accounts/${enc(userId)}/adjustments`, { method: "POST", body }),
};
