import { withRequestContext } from "./client.js";
import { authApi } from "./endpoints/auth.js";
import { catalogApi } from "./endpoints/catalog.js";
import { ordersApi } from "./endpoints/orders.js";
import { inventoryApi } from "./endpoints/inventory.js";
import { peopleApi } from "./endpoints/people.js";
import { platformApi } from "./endpoints/platform.js";
import { commerceApi } from "./endpoints/commerce.js";

export * from "./client.js";
export {
  getAccessToken,
  refreshAccessToken,
  onTokenChange,
  onSessionEnd,
  endSession,
  HARD_LOGOUT_CODES,
} from "./session.js";

const endpoints = {
  ...authApi,
  ...catalogApi,
  ...ordersApi,
  ...inventoryApi,
  ...peopleApi,
  ...platformApi,
  ...commerceApi,
};

function bind(ctx) {
  const out = {};
  Object.entries(endpoints).forEach(([name, fn]) => {
    out[name] = (...args) => withRequestContext(ctx, () => fn(...args));
  });
  return out;
}

/**
 * Every endpoint as `api.name(...)`.
 *
 * Tenant context for a platform admin:
 *   api.withTenant(tenantId).listInventory(query)   // X-Tenant-Id: tenantId
 *   api.withTenant(null).reportsOverview()          // force platform scope (no header)
 * Without it, the tenant chosen in the super-admin tenant switcher is used.
 *
 * Abort: api.withSignal(signal).listOrders(q) (useApi/useQuery loaders get this automatically).
 */
export const api = {
  ...endpoints,
  withTenant: (tenantId) => bind({ tenantId: tenantId || null }),
  withSignal: (signal) => bind({ signal }),
  with: (ctx) => bind(ctx),
};

export default api;
