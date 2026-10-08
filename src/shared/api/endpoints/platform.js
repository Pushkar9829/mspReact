import { request, qs, enc, downloadFile } from "../client.js";

const V = "/api/v1";

export const platformApi = {
  health: () => request("/api/health"),

  // Reports & analytics
  /** query: { from, to (YYYY-MM-DD IST or ISO), days }. → { period, previous, changes: { orders, gmv, aov } (null = no previous data), scope, … } */
  reportsOverview: (query = {}) => request(`${V}/reports/overview${qs(query)}`),
  /** `reportsSales(30)` or `reportsSales({ from, to })` / `{ days }` → [{ _id: "YYYY-MM-DD", orders, gmv, aov, netSales, fees }] */
  reportsSales: (range = 30) => request(`${V}/reports/sales${qs(typeof range === "object" ? range : { days: range })}`),
  /**
   * Platform admin only (no X-Tenant-Id is sent). Per-tenant stats for a range.
   * query: { from, to, days, q, status (comma list), sort: gmv|ordersCount|staffCount|aov|name|createdAt, order, page, limit }
   * → { data: [{ tenantId, name, slug, status, createdAt, staffCount, ordersCount, totalOrders, gmv, aov, netSales }], meta, range, totals }
   */
  reportsTenants: (query = {}) => request(`${V}/reports/tenants${qs({ limit: 20, ...query })}`, { tenantId: null }),
  /** Tenant context required. query: { q, page, limit } */
  reportsCustomers: (query = {}) => request(`${V}/reports/customers${qs({ limit: 50, ...query })}`),
  /** kind: orders | inventory | customers | sales | skus; query: { status, paymentStatus, from, to, days } */
  exportReport: (kind, query = {}) => downloadFile(`${V}/reports/export/${enc(kind)}${qs(query)}`, `${kind}.csv`),
  analyticsCatalog: () => request(`${V}/analytics/catalog`),
  analyticsOverview: (query = {}) => request(`${V}/analytics/overview${qs(query)}`),
  analyticsByDate: (query = {}) => request(`${V}/analytics/by-date${qs(query)}`),
  analyticsByEvent: (query = {}) => request(`${V}/analytics/by-event${qs(query)}`),
  analyticsByTenant: (query = {}) => request(`${V}/analytics/by-tenant${qs(query)}`),
  analyticsImportant: (query = {}) => request(`${V}/analytics/important${qs({ limit: 20, ...query })}`),
  analyticsEvents: (query = {}) => request(`${V}/analytics/events${qs({ limit: 25, ...query })}`),
  /**
   * query: { action, resource, method (comma lists), outcome: success|failure, actorId, resourceId, requestId, ip,
   *          statusCode, from, to, q, order: asc|desc, page, limit }
   */
  listAudit: (query = {}) => request(`${V}/audit${qs({ limit: 20, ...query })}`),
  /** One entry: actorId/tenantId populated, outcome, error, before (true previous state), after, metadata. */
  getAuditEntry: (id) => request(`${V}/audit/${enc(id)}`),

  // CMS
  listCmsPages: (query = {}) => request(`${V}/cms/pages${qs(query)}`),
  /** query: { tenantSlug | tenantId | tenant } (optional). A store page falls back to the global page. */
  getCmsPublicPage: (slug, query = {}) => request(`${V}/cms/pages/${enc(slug)}${qs(query)}`),
  /** query: { type, status, q, includeGlobal: "true" (a store's pages + global ones), globalOnly: "true" (platform), page, limit }. Rows carry `global`. */
  listCmsAdmin: (query = {}) => request(`${V}/cms/admin${qs({ limit: 20, ...query })}`),
  getCmsPage: (id) => request(`${V}/cms/admin/${enc(id)}`),
  /** → [{ version, action, toStatus, scheduledAt, actorId { name, email }, at, snapshot }] */
  listCmsVersions: (id) => request(`${V}/cms/admin/${enc(id)}/versions`),
  createCmsPage: (body) => request(`${V}/cms/admin`, { method: "POST", body }),
  /**
   * Pass `version` (the page version you edited) for optimistic concurrency: it is sent as `If-Match`.
   * A stale version → 409 `CONFLICT` with `err.data.currentVersion`. A PATCH that changes nothing keeps the version.
   */
  updateCmsPage: (id, body, { version } = {}) =>
    request(`${V}/cms/admin/${enc(id)}`, { method: "PATCH", body, headers: version != null ? { "If-Match": String(version) } : undefined }),
  deleteCmsPage: (id) => request(`${V}/cms/admin/${enc(id)}`, { method: "DELETE" }),
  /** action: review | publish | unpublish | draft. `expectedVersion` → 409 CONFLICT { currentVersion } when stale. */
  cmsTransition: (id, action, expectedVersion) =>
    request(`${V}/cms/admin/${enc(id)}/${enc(action)}`, { method: "POST", body: expectedVersion != null ? { expectedVersion } : {} }),
  /** cms.publish. scheduledAt: future ISO (draft / in-review pages only) or null to cancel. */
  scheduleCmsPage: (id, scheduledAt, expectedVersion) =>
    request(`${V}/cms/admin/${enc(id)}/schedule`, { method: "POST", body: { scheduledAt: scheduledAt || null, ...(expectedVersion != null ? { expectedVersion } : {}) } }),

  // Support chat
  createChat: (body) => request(`${V}/chat`, { method: "POST", body }),
  listChats: (query = {}) => request(`${V}/chat${qs({ limit: 20, ...query })}`),
  getChat: (id) => request(`${V}/chat/${enc(id)}`),
  /** Returns an array. For pagination use listChatMessagesPage. query: { before, limit } */
  listChatMessages: (id, query = {}) => request(`${V}/chat/${enc(id)}/messages${qs(query)}`),
  /** One page of messages via `?envelope=1` → { data, hasMore, nextBefore }. query: { before, limit } */
  listChatMessagesPage: async (id, query = {}) => {
    const res = await request(`${V}/chat/${enc(id)}/messages${qs({ ...query, envelope: 1 })}`);
    if (Array.isArray(res)) return { data: res, hasMore: false, nextBefore: null }; // older API without the envelope
    return { data: res?.data || [], hasMore: Boolean(res?.hasMore), nextBefore: res?.nextBefore || null };
  },
  postChatMessage: (id, body) => request(`${V}/chat/${enc(id)}/messages`, { method: "POST", body }),
  assignChat: (id, assigneeId) => request(`${V}/chat/${enc(id)}/assign`, { method: "POST", body: { assigneeId } }),
  closeChat: (id) => request(`${V}/chat/${enc(id)}/close`, { method: "POST" }),
  escalateChat: (id) => request(`${V}/chat/${enc(id)}/escalate`, { method: "POST" }),
  markChatRead: (id) => request(`${V}/chat/${enc(id)}/read`, { method: "POST" }),
  listChatMacros: () => request(`${V}/chat/macros`),
  saveChatMacro: (body) => request(`${V}/chat/macros`, { method: "POST", body }),
  deleteChatMacro: (macroId) => request(`${V}/chat/macros/${enc(macroId)}`, { method: "DELETE" }),

  // Notifications
  listNotifications: (query = {}) => request(`${V}/notifications${qs({ limit: 20, ...query })}`),
  /** → { unread, personal, broadcast } */
  notificationsUnreadCount: () => request(`${V}/notifications/unread-count`),
  markNotificationRead: (id) => request(`${V}/notifications/${enc(id)}/read`, { method: "POST" }),
  markAllNotificationsRead: () => request(`${V}/notifications/read-all`, { method: "POST" }),
  getNotificationPreferences: () => request(`${V}/notifications/preferences`),
  /** body: { [category]: { inApp?, email?, sms? } } */
  updateNotificationPreferences: (body) => request(`${V}/notifications/preferences`, { method: "PUT", body }),
  /**
   * notifications.send. query: { status, audienceType, includeGlobal: "true"|"false", tenantId (platform), page, limit }.
   * Rows: + scope (all|store|role|user), global, tenant { id, name, slug }, createdBy { name, email }, emailDelivery.
   */
  listSentNotifications: (query = {}) => request(`${V}/notifications/sent${qs({ limit: 20, ...query })}`),
  /**
   * body: { title, body?, priority?, audienceType?, userIds?, tenantId?, roleSlug?, scheduledAt?, expiresAt?, channels?: { email } }.
   * The audience comes only from the body (no X-Tenant-Id is sent). `audienceType: "role"` without `tenantId` reaches
   * holders of the role in every store (platform admins).
   */
  sendAnnouncement: (body) => request(`${V}/notifications`, { method: "POST", body, tenantId: null }),
  cancelNotification: (id) => request(`${V}/notifications/${enc(id)}/cancel`, { method: "POST" }),
  unsubscribe: (token) => request(`${V}/notifications/unsubscribe`, { method: "POST", body: { token } }),

  // Settings — only registry keys are accepted.
  // GET /settings/keys → { scope, keys, definitions: [{ key, type, label, description, group, scopes, overridable, default, secret, public, min?, max?, enum? }] }
  listSettings: (query = {}) => request(`${V}/settings${qs(query)}`),
  listSettingKeys: () => request(`${V}/settings/keys`),
  getCommerce: () => request(`${V}/settings/commerce`),
  upsertSetting: (key, value) => request(`${V}/settings/${enc(key)}`, { method: "PUT", body: { value } }),
  /** Remove a store override so the platform default applies again. → { ok, key, scope, tenantId, removed, previous, effective, source } */
  deleteSettingOverride: (key, tenantId) =>
    request(`${V}/settings/${enc(key)}${qs({ scope: "tenant", tenantId })}`, { method: "DELETE", ...(tenantId ? { tenantId } : {}) }),
  /** query: { tenantSlug | tenantId } (optional) applies a store's overrides. */
  publicSettings: (query = {}) => request(`${V}/settings/public${qs(query)}`),
  /** Public store info: { id, name, displayName, slug, status, branding, pickupCity, deliveryZones[{ name, etaDaysMin, etaDaysMax }] }. */
  getPublicStore: (idOrSlug) => request(`${V}/tenants/public/${enc(idOrSlug)}`),
  /**
   * Public store directory (no auth). query: { q, city, state, sort: name|newest|rating|products, page, limit ≤ 100 }
   * → { data[{ id, name, displayName, slug, city, state, logo, rating, ratingCount, productCount, deliveryModes, minOrderValue }], meta }
   */
  listPublicStores: (query = {}) => request(`${V}/tenants/public${qs(query)}`),

  // Platform-wide queues (platform admin: no X-Tenant-Id is sent)
  /**
   * Offers across every tenant (`?tenantId=` narrows it). Rows have `tenantId: { _id, name, slug }`.
   * query: { status (comma list, e.g. "pending_approval"), tenantId, page, limit }
   */
  listPlatformOffers: (query = {}) => request(`${V}/offers${qs({ limit: 20, ...query })}`, { tenantId: null }),
  /** Approve an offer of any tenant (the tenant is taken from the offer). 409 INVALID_STATE when not pending/draft. */
  approvePlatformOffer: (id) => request(`${V}/offers/${enc(id)}/approve`, { method: "POST", tenantId: null }),
  // Failed refunds queue + retry: listRefunds / retryRefund in endpoints/orders.js.

  // Search history (storefront)
  searchSuggestions: () => request(`${V}/search/suggestions`),
  recordSearch: (q) => request(`${V}/search`, { method: "POST", body: { q } }),
  removeRecentSearch: (q) => request(`${V}/search/recent${qs({ q })}`, { method: "DELETE" }),
  clearRecentSearches: () => request(`${V}/search/recent`, { method: "DELETE" }),

  // Shipping
  checkServiceability: (pin) => request(`${V}/shipping/serviceability${qs({ pin })}`),
};
