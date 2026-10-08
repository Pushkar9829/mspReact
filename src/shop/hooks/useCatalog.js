/**
 * Catalog data for the storefront: categories (tree), brands, public settings, CMS pages,
 * product search (server-paged), product detail (by slug), reviews.
 */
import { useMemo } from "react";
import { keepPreviousData, useInfiniteQuery, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { shopKeys } from "./keys.js";
import { useViewer } from "./useViewer.js";
import { mapCategory, mapLookup, mapProduct } from "../lib/mapProduct.js";

const rowsOf = (res) => (Array.isArray(res) ? res : res?.data || []);
const HOUR = 60 * 60_000;

/* ------------------------------------------------------------------ categories / brands / settings */

/**
 * Active categories as a tree. → { data: { list, roots, bySlug, byId, childrenOf(id), pathOf(slug) }, isPending, error }.
 * Roots are sorted by sortOrder then name; each root has `children`.
 */
export function useCategories() {
  return useQuery({
    queryKey: shopKeys.categories(),
    queryFn: () => api.listCategories({ status: "active" }),
    staleTime: HOUR,
    select: buildCategoryTree,
  });
}

export function buildCategoryTree(res) {
  const list = rowsOf(res).map(mapCategory).filter(Boolean);
  const byId = new Map(list.map((c) => [c.id, { ...c, children: [] }]));
  const roots = [];
  for (const c of byId.values()) {
    const parent = c.parentId ? byId.get(c.parentId) : null;
    if (parent) parent.children.push(c);
    else roots.push(c);
  }
  const sort = (a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name);
  roots.sort(sort);
  for (const c of byId.values()) c.children.sort(sort);
  const bySlug = new Map([...byId.values()].map((c) => [c.slug, c]));
  return {
    list: [...byId.values()],
    roots,
    bySlug,
    byId,
    childrenOf: (id) => byId.get(id)?.children || [],
    /** [root, …, category] for breadcrumbs. */
    pathOf: (slug) => {
      const out = [];
      let cur = bySlug.get(slug);
      while (cur) {
        out.unshift(cur);
        cur = cur.parentId ? byId.get(cur.parentId) : null;
      }
      return out;
    },
  };
}

/** Public brands: [{ id, name, slug, logo }] (logo may be empty: use <BrandMonogram>). */
export function useBrands() {
  return useQuery({
    queryKey: shopKeys.brands(),
    queryFn: () => api.listPublicBrands(),
    staleTime: HOUR,
    select: (res) => rowsOf(res).map((b) => ({ id: String(b._id || b.slug), name: b.name, slug: b.slug, logo: b.logo || "" })),
  });
}

/** GET /settings/public (marketplace name, slogan, supportEmail, codEnabled, freeDeliveryAbove, returnWindowDays, festival, store …). */
export function usePublicSettings(tenantSlug = "") {
  return useQuery({
    queryKey: shopKeys.settings(tenantSlug),
    queryFn: () => api.publicSettings(tenantSlug ? { tenantSlug } : {}),
    staleTime: 10 * 60_000,
  });
}

/** Public store info (pickupCity, deliveryZones with ETA ranges). */
export function usePublicStore(idOrSlug) {
  return useQuery({
    queryKey: shopKeys.store(idOrSlug),
    queryFn: () => api.getPublicStore(idOrSlug),
    enabled: Boolean(idOrSlug),
    staleTime: HOUR,
  });
}

/**
 * Public store directory (GET /tenants/public). query: { q, city, state, sort, page, limit }.
 * → { data: { stores[{ id, name, slug, city, state, logo, rating, ratingCount, productCount, deliveryModes, minOrderValue }], meta } }
 */
export function usePublicStores(query = {}, { enabled = true } = {}) {
  return useQuery({
    queryKey: [...shopKeys.all, "stores", query],
    queryFn: ({ signal }) => api.withSignal(signal).listPublicStores(query),
    select: (res) => ({
      stores: rowsOf(res).map((t) => ({ ...t, id: String(t.id || t._id || t.slug), name: t.displayName || t.name })),
      meta: res?.meta || null,
    }),
    placeholderData: keepPreviousData,
    staleTime: 10 * 60_000,
    enabled,
  });
}

/** CMS page by slug (GET /cms/pages/:slug). 404 → error.status === 404. */
export function useCmsPage(slug, tenantSlug = "") {
  return useQuery({
    queryKey: shopKeys.cms(slug, tenantSlug),
    queryFn: () => api.getCmsPublicPage(slug, tenantSlug ? { tenantSlug } : {}),
    enabled: Boolean(slug),
    staleTime: 10 * 60_000,
  });
}

/* ------------------------------------------------------------------ search */

/**
 * UI filters → GET /products/search params. Unknown keys are dropped; empty values removed.
 * API: q, category (slug, descendants included), brand (comma list of slugs), tag, bulkEligible,
 * minPrice/maxPrice (buyer's effective price), inStock=1, postalCode, facets=1,
 * sort = relevance | price-asc | price-desc | newest | rating | discount, seller / tenantId (store ids
 * or slugs), packSize (from `pack`), minDiscount (from `discount`).
 */
export function toSearchParams(filters = {}) {
  const out = {};
  const set = (k, v) => {
    if (v === undefined || v === null || v === "" || (Array.isArray(v) && !v.length)) return;
    out[k] = Array.isArray(v) ? v.join(",") : v;
  };
  set("q", filters.q?.trim?.() ?? filters.q);
  if (filters.category && filters.category !== "all") set("category", filters.category);
  set("brand", filters.brand);
  // Stores (ids or slugs, comma list). A store page fixes `tenantId`; the listing's seller filter is `seller`.
  set("seller", filters.seller);
  set("tenantId", filters.tenantId);
  set("packSize", filters.pack);
  set("tag", filters.tag);
  set("minPrice", filters.minPrice);
  set("maxPrice", filters.maxPrice);
  set("minDiscount", filters.discount);
  if (filters.inStock) set("inStock", "1");
  if (filters.bulk) set("bulkEligible", "true");
  if (filters.sort && filters.sort !== "relevance") set("sort", filters.sort);
  set("postalCode", filters.postalCode);
  if (filters.facets) set("facets", "1");
  return out;
}

/**
 * Server-paged product search for listings (infinite scroll).
 *
 *   const s = useProductSearch({ q, category, brand: ["tata"], sort: "price-asc" }, { pageSize: 24 });
 *   s.products  s.total  s.facets  s.fetchNextPage()  s.hasNextPage  s.isFetchingNextPage  s.isPending
 */
export function useProductSearch(filters = {}, { pageSize = 24, enabled = true } = {}) {
  const { viewer } = useViewer();
  const params = useMemo(() => toSearchParams(filters), [JSON.stringify(filters)]); // eslint-disable-line react-hooks/exhaustive-deps
  const query = useInfiniteQuery({
    queryKey: shopKeys.search({ ...params, limit: pageSize, mode: "infinite" }, viewer),
    queryFn: ({ pageParam, signal }) => api.withSignal(signal).searchProducts({ ...params, limit: pageSize, page: pageParam }),
    initialPageParam: 1,
    getNextPageParam: (last) => {
      const meta = last?.meta;
      return meta && meta.page < meta.pages ? meta.page + 1 : undefined;
    },
    placeholderData: keepPreviousData,
    enabled,
  });
  const products = useMemo(() => (query.data?.pages || []).flatMap((p) => rowsOf(p).map(mapProduct)).filter(Boolean), [query.data]);
  const first = query.data?.pages?.[0];
  return {
    ...query,
    params,
    products,
    total: first?.meta?.total ?? null,
    /** First page meta: { total, page, pages, capped?, matchedBy: "text"|"synonym"|"fuzzy"|null, didYouMean: string|null }. */
    meta: first?.meta || null,
    /** With { facets: true }: { brands: [{ id, name, slug, count }], priceRange: { min, max } | null }. */
    facets: first?.facets || null,
  };
}

/** One page of products (rails, "more like this"). → { products, total, ...query }. */
export function useProducts(filters = {}, { limit = 12, enabled = true } = {}) {
  const { viewer } = useViewer();
  const params = toSearchParams(filters);
  const query = useQuery({
    queryKey: shopKeys.search({ ...params, limit }, viewer),
    queryFn: ({ signal }) => api.withSignal(signal).searchProducts({ ...params, limit, page: 1 }),
    enabled,
    staleTime: 60_000,
  });
  const products = useMemo(() => rowsOf(query.data).map(mapProduct).filter(Boolean), [query.data]);
  return { ...query, products, total: query.data?.meta?.total ?? null };
}

/* ------------------------------------------------------------------ product detail */

/**
 * Product by slug (GET /products/lookup). Accepts an old SKU too: `product.slug` is then the real
 * slug and the page should redirect (routes.jsx does this for /product/:slug).
 * → { product, raw, ...query }
 */
export function useProduct(slug, { enabled = true } = {}) {
  const { viewer } = useViewer();
  const query = useQuery({
    queryKey: shopKeys.product(slug, viewer),
    queryFn: ({ signal }) => api.withSignal(signal).lookupProduct(slug),
    enabled: Boolean(slug) && enabled,
    staleTime: 30_000,
  });
  const product = useMemo(() => (query.data ? mapLookup(query.data) : null), [query.data]);
  return { ...query, product, raw: query.data };
}

/** Warm the PDP cache on hover/focus of a card. */
export function usePrefetchProduct() {
  const qc = useQueryClient();
  const { viewer } = useViewer();
  return (slug) => {
    if (!slug) return;
    qc.prefetchQuery({ queryKey: shopKeys.product(slug, viewer), queryFn: () => api.lookupProduct(slug), staleTime: 30_000 });
  };
}

/** Reviews page (published only). → { data: rows, meta, summary? } as the API sends it. */
export function useProductReviews(slug, page = 1, limit = 10) {
  return useQuery({
    queryKey: shopKeys.reviews(slug, page),
    queryFn: () => api.listReviews(slug, { page, limit }),
    enabled: Boolean(slug),
    placeholderData: keepPreviousData,
  });
}

/**
 * Can the viewer review this product? GET /products/:slug/reviews/eligibility →
 * { canReview, reason: null | "LOGIN_REQUIRED" | "NOT_VERIFIED_BUYER", message, existingReview | null, orderId }.
 */
export function useReviewEligibility(slug) {
  const { viewer } = useViewer();
  return useQuery({
    queryKey: shopKeys.reviewEligibility(slug, viewer),
    queryFn: async () => {
      return api.reviewEligibility(slug);
    },
    enabled: Boolean(slug),
    staleTime: 60_000,
  });
}
