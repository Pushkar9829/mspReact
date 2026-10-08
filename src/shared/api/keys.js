/**
 * Query-key conventions (TanStack Query).
 *
 *   keys.orders.all                → ["orders"]                 invalidate everything about orders
 *   keys.orders.lists()            → ["orders", "list"]         every list variant
 *   keys.orders.list(query)        → ["orders", "list", query]  one filtered/paged list
 *   keys.orders.detail(id)         → ["orders", "detail", id]
 *   keys.orders.sub(id, "invoice") → ["orders", "detail", id, "invoice"]
 *
 * Mutations invalidate the entity root (`keys.orders.all`) unless they know better.
 * Tenant switching (super admin) resets the whole cache, so keys do not include the tenant.
 */
function entity(name) {
  return {
    all: [name],
    lists: () => [name, "list"],
    list: (query = {}) => [name, "list", query],
    details: () => [name, "detail"],
    detail: (id) => [name, "detail", String(id)],
    sub: (id, part, extra) => (extra === undefined ? [name, "detail", String(id), part] : [name, "detail", String(id), part, extra]),
    custom: (...parts) => [name, ...parts],
  };
}

export const keys = {
  me: ["me"],
  orders: entity("orders"),
  products: entity("products"),
  variants: entity("variants"),
  categories: entity("categories"),
  brands: entity("brands"),
  reviews: entity("reviews"),
  media: entity("media"),
  inventory: entity("inventory"),
  warehouses: entity("warehouses"),
  reservations: entity("reservations"),
  offers: entity("offers"),
  coupons: entity("coupons"),
  priceLists: entity("priceLists"),
  tenants: entity("tenants"),
  myTenant: ["tenants", "me"],
  users: entity("users"),
  roles: entity("roles"),
  permissions: ["permissions"],
  ledger: entity("ledger"),
  /** Store customers (GET /reports/customers, /reports/customers/:userId). */
  customers: entity("customers"),
  cms: entity("cms"),
  chats: entity("chats"),
  macros: ["chats", "macros"],
  notifications: {
    ...entity("notifications"),
    unread: ["notifications", "unread"],
    preferences: ["notifications", "preferences"],
    sent: (query = {}) => ["notifications", "sent", query],
  },
  settings: entity("settings"),
  reports: entity("reports"),
  analytics: entity("analytics"),
  audit: entity("audit"),
  /** Legacy useApi() queries live under this prefix. */
  legacy: ["useApi"],
};

export default keys;
