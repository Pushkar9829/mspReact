import { apiUrl } from "./config.js";

function qs(query = {}) {
  const q = new URLSearchParams();
  Object.entries(query).forEach(([key, value]) => {
    if (value != null && value !== "") q.set(key, String(value));
  });
  const suffix = q.toString();
  return suffix ? `?${suffix}` : "";
}

const AUTH_KEY = "msr-auth";
const GUEST_KEY = "msr-guest";

export function guestKey() {
  try {
    let key = localStorage.getItem(GUEST_KEY);
    if (!key) {
      key = crypto.randomUUID();
      localStorage.setItem(GUEST_KEY, key);
    }
    return key;
  } catch {
    return "guest";
  }
}

function readSession() {
  try {
    return JSON.parse(localStorage.getItem(AUTH_KEY) || "null");
  } catch {
    return null;
  }
}

export class ApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.code = code;
    this.status = status;
  }
}

export async function request(path, options = {}) {
  const session = readSession();
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };
  if (session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
    if (session.role === "tenant" && session.tenantId) {
      headers["X-Tenant-Id"] = session.tenantId;
    }
  } else if (!headers["X-Guest-Key"]) {
    headers["X-Guest-Key"] = guestKey();
  }

  const res = await fetch(apiUrl(path), { ...options, headers, credentials: "include" });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || `Request failed (${res.status})`, data.code || "ERROR", res.status);
  }
  return data;
}

export async function downloadFile(path, filename) {
  const session = readSession();
  const headers = {};
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  const res = await fetch(apiUrl(path), { headers, credentials: "include" });
  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new ApiError(data.message || `Request failed (${res.status})`, data.code || "ERROR", res.status);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "export.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export const api = {
  health: () => request("/api/health"),
  login: (body) => request("/api/v1/auth/login", { method: "POST", body: JSON.stringify(body) }),
  register: (body) => request("/api/v1/auth/register", { method: "POST", body: JSON.stringify(body) }),
  lookupProduct: (slug, pack) => {
    const q = new URLSearchParams({ slug: slug || "" });
    if (pack) q.set("pack", pack);
    return request(`/api/v1/products/lookup?${q}`);
  },
  searchProducts: (query = {}) => request(`/api/v1/products/search${qs(query)}`),
  listStaffProducts: (query = {}) => request(`/api/v1/products${qs({ limit: 20, ...query })}`),
  getStaffProduct: (id) => request(`/api/v1/products/${encodeURIComponent(id)}`),
  createProduct: (body) => request("/api/v1/products", { method: "POST", body: JSON.stringify(body) }),
  updateProduct: (id, body) => request(`/api/v1/products/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  publishProduct: (id) => request(`/api/v1/products/${encodeURIComponent(id)}/publish`, { method: "POST" }),
  archiveProduct: (id) => request(`/api/v1/products/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listCategories: (query = {}) => request(`/api/v1/categories${qs(query)}`),
  getCart: () => request("/api/v1/cart"),
  addCartItem: (body) => request("/api/v1/cart/items", { method: "POST", body: JSON.stringify(body) }),
  updateCartItem: (id, qty) =>
    request(`/api/v1/cart/items/${id}`, { method: "PATCH", body: JSON.stringify({ qty }) }),
  removeCartItem: (id) => request(`/api/v1/cart/items/${id}`, { method: "DELETE" }),
  applyCoupon: (code) => request("/api/v1/cart/coupon", { method: "POST", body: JSON.stringify({ code: code || "" }) }),
  listCartCoupons: () => request("/api/v1/cart/coupons"),
  mergeCart: () =>
    request("/api/v1/cart/merge", {
      method: "POST",
      headers: { "X-Guest-Key": guestKey() },
    }),
  listAddresses: () => request("/api/v1/addresses"),
  createAddress: (body) => request("/api/v1/addresses", { method: "POST", body: JSON.stringify(body) }),
  updateAddress: (id, body) => request(`/api/v1/addresses/${id}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteAddress: (id) => request(`/api/v1/addresses/${id}`, { method: "DELETE" }),
  previewCheckout: (addressId, deliveryPartnerId) =>
    request("/api/v1/checkout/preview", {
      method: "POST",
      body: JSON.stringify({ addressId, ...(deliveryPartnerId ? { deliveryPartnerId } : {}) }),
    }),
  notifyRestock: (slug, body = {}) =>
    request(`/api/v1/products/${encodeURIComponent(slug)}/notify-restock`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkout: (body, idempotencyKey) =>
    request("/api/v1/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    }),
  listOrders: (query = {}) => request(`/api/v1/orders${qs({ limit: 50, ...query })}`),
  getOrder: (id) => request(`/api/v1/orders/${encodeURIComponent(id)}`),
  reorder: (id) => request(`/api/v1/orders/${encodeURIComponent(id)}/reorder`, { method: "POST" }),
  updateOrderStatus: (id, status, note) =>
    request(`/api/v1/orders/${encodeURIComponent(id)}/status`, {
      method: "POST",
      body: JSON.stringify({ status, note }),
    }),
  me: () => request("/api/v1/auth/me"),
  updateMe: (body) => request("/api/v1/auth/me", { method: "PATCH", body: JSON.stringify(body) }),
  changePassword: (body) =>
    request("/api/v1/auth/change-password", { method: "POST", body: JSON.stringify(body) }),
  searchSuggestions: () => request("/api/v1/search/suggestions"),
  recordSearch: (q) => request("/api/v1/search", { method: "POST", body: JSON.stringify({ q }) }),
  removeRecentSearch: (q) => request(`/api/v1/search/recent?q=${encodeURIComponent(q)}`, { method: "DELETE" }),
  clearRecentSearches: () => request("/api/v1/search/recent", { method: "DELETE" }),

  listTenants: (query = {}) => request(`/api/v1/tenants${qs({ limit: 20, ...query })}`),
  getTenant: (id) => request(`/api/v1/tenants/${encodeURIComponent(id)}`),
  createTenant: (body) => request("/api/v1/tenants", { method: "POST", body: JSON.stringify(body) }),
  getMyTenant: () => request("/api/v1/tenants/me"),
  updateMyTenant: (body) => request("/api/v1/tenants/me", { method: "PATCH", body: JSON.stringify(body) }),
  updateTenant: (id, body) => request(`/api/v1/tenants/${id}`, { method: "PATCH", body: JSON.stringify(body) }),

  listUsers: (query = {}) => request(`/api/v1/users${qs({ limit: 50, ...query })}`),
  createUser: (body) => request("/api/v1/users", { method: "POST", body: JSON.stringify(body) }),
  updateUser: (id, body) => request(`/api/v1/users/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteUser: (id) => request(`/api/v1/users/${encodeURIComponent(id)}`, { method: "DELETE" }),
  listRoles: (query = {}) => request(`/api/v1/roles${qs(query)}`),
  createRole: (body) => request("/api/v1/roles", { method: "POST", body: JSON.stringify(body) }),
  updateRole: (id, body) => request(`/api/v1/roles/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  listPermissions: () => request("/api/v1/permissions"),

  listInventory: (query = {}) => request(`/api/v1/inventory${qs({ limit: 20, ...query })}`),
  listWarehouses: () => request("/api/v1/warehouses"),
  adjustInventory: (body) => request("/api/v1/inventory/adjust", { method: "POST", body: JSON.stringify(body) }),
  listOffers: (query = {}) => request(`/api/v1/offers${qs({ limit: 20, ...query })}`),
  createOffer: (body) => request("/api/v1/offers", { method: "POST", body: JSON.stringify(body) }),
  updateOffer: (id, body) => request(`/api/v1/offers/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  approveOffer: (id) => request(`/api/v1/offers/${encodeURIComponent(id)}/approve`, { method: "POST" }),
  listCoupons: (query = {}) => request(`/api/v1/coupons${qs({ limit: 20, ...query })}`),
  createCoupon: (body) => request("/api/v1/coupons", { method: "POST", body: JSON.stringify(body) }),
  disableCoupon: (id) => request(`/api/v1/coupons/${id}/disable`, { method: "POST" }),

  reportsOverview: () => request("/api/v1/reports/overview"),
  reportsSales: (days = 30) => request(`/api/v1/reports/sales?days=${days}`),
  reportsCustomers: (query = {}) => request(`/api/v1/reports/customers${qs({ limit: 50, ...query })}`),
  exportReport: (kind, query = {}) => downloadFile(`/api/v1/reports/export/${kind}${qs(query)}`, `${kind}.csv`),
  analyticsCatalog: () => request("/api/v1/analytics/catalog"),
  analyticsOverview: (query = {}) => request(`/api/v1/analytics/overview${qs(query)}`),
  analyticsByDate: (query = {}) => request(`/api/v1/analytics/by-date${qs(query)}`),
  analyticsByEvent: (query = {}) => request(`/api/v1/analytics/by-event${qs(query)}`),
  analyticsByTenant: (query = {}) => request(`/api/v1/analytics/by-tenant${qs(query)}`),
  analyticsImportant: (query = {}) => request(`/api/v1/analytics/important${qs({ limit: 20, ...query })}`),
  analyticsEvents: (query = {}) => request(`/api/v1/analytics/events${qs({ limit: 25, ...query })}`),
  listAudit: (query = {}) => request(`/api/v1/audit${qs({ limit: 20, ...query })}`),
  listCmsAdmin: (query = {}) => request(`/api/v1/cms/admin${qs({ limit: 20, ...query })}`),
  createCmsPage: (body) => request("/api/v1/cms/admin", { method: "POST", body: JSON.stringify(body) }),
  updateCmsPage: (id, body) => request(`/api/v1/cms/admin/${encodeURIComponent(id)}`, { method: "PATCH", body: JSON.stringify(body) }),
  deleteCmsPage: (id) => request(`/api/v1/cms/admin/${encodeURIComponent(id)}`, { method: "DELETE" }),
  cmsTransition: (id, action) => request(`/api/v1/cms/admin/${encodeURIComponent(id)}/${action}`, { method: "POST" }),
  listChats: (query = {}) => request(`/api/v1/chat${qs({ limit: 20, ...query })}`),
  getChat: (id) => request(`/api/v1/chat/${encodeURIComponent(id)}`),
  listChatMessages: (id) => request(`/api/v1/chat/${encodeURIComponent(id)}/messages`),
  postChatMessage: (id, body) =>
    request(`/api/v1/chat/${encodeURIComponent(id)}/messages`, { method: "POST", body: JSON.stringify(body) }),
  assignChat: (id, assigneeId) =>
    request(`/api/v1/chat/${encodeURIComponent(id)}/assign`, { method: "POST", body: JSON.stringify({ assigneeId }) }),
  closeChat: (id) => request(`/api/v1/chat/${encodeURIComponent(id)}/close`, { method: "POST" }),
  listSettings: (query = {}) => request(`/api/v1/settings${qs(query)}`),
  upsertSetting: (key, value) => request(`/api/v1/settings/${encodeURIComponent(key)}`, { method: "PUT", body: JSON.stringify({ value }) }),
  publicSettings: () => request("/api/v1/settings/public"),
  getLedger: () => request("/api/v1/ledger/me"),
};
