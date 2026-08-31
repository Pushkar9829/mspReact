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
  if (session?.token) headers.Authorization = `Bearer ${session.token}`;
  else if (!headers["X-Guest-Key"]) headers["X-Guest-Key"] = guestKey();

  const res = await fetch(path, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new ApiError(data.message || `Request failed (${res.status})`, data.code || "ERROR", res.status);
  }
  return data;
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
  searchProducts: (query = {}) => {
    const q = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== "") q.set(key, String(value));
    });
    return request(`/api/v1/products/search?${q}`);
  },
  listCategories: (query = {}) => {
    const q = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value != null && value !== "") q.set(key, String(value));
    });
    const suffix = q.toString() ? `?${q}` : "";
    return request(`/api/v1/categories${suffix}`);
  },
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
  previewCheckout: (addressId) =>
    request("/api/v1/checkout/preview", { method: "POST", body: JSON.stringify({ addressId }) }),
  checkout: (body, idempotencyKey) =>
    request("/api/v1/checkout", {
      method: "POST",
      headers: { "Idempotency-Key": idempotencyKey },
      body: JSON.stringify(body),
    }),
  listOrders: () => request("/api/v1/orders?limit=50"),
  getOrder: (id) => request(`/api/v1/orders/${encodeURIComponent(id)}`),
};
