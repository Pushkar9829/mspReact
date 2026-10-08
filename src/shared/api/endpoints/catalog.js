import { request, qs, enc, downloadFile, upload } from "../client.js";

const V = "/api/v1";

function bulkQuery({ dryRun, availableQtyMode } = {}) {
  return { ...(dryRun ? { dryRun: "true" } : {}), ...(availableQtyMode ? { availableQtyMode } : {}) };
}

export const catalogApi = {
  // Storefront
  lookupProduct: (slug, pack) => request(`${V}/products/lookup${qs({ slug: slug || "", pack })}`),
  searchProducts: (query = {}) => request(`${V}/products/search${qs(query)}`),
  notifyRestock: (slug, body = {}) => request(`${V}/products/${enc(slug)}/notify-restock`, { method: "POST", body }),
  confirmRestock: (token) => request(`${V}/products/restock-alerts/confirm${qs({ token })}`),
  listReviews: (slug, query = {}) => request(`${V}/products/${enc(slug)}/reviews${qs(query)}`),
  createReview: (slug, body) => request(`${V}/products/${enc(slug)}/reviews`, { method: "POST", body }),
  /** Whether the signed-in buyer may review (verified purchase). → { eligible, reason?, review? }. 404 on older APIs. */
  reviewEligibility: (slug) => request(`${V}/products/${enc(slug)}/reviews/eligibility`),
  /** Delivery to a PIN for one product. → { serviceable, eta?, zone?, ... }. 404 on older APIs. */
  productServiceability: (slug, pincode) => request(`${V}/products/${enc(slug)}/serviceability${qs({ pincode, postalCode: pincode })}`),

  // Products (staff)
  listStaffProducts: (query = {}) => request(`${V}/products${qs({ limit: 20, ...query })}`),
  listProducts: (query = {}) => request(`${V}/products${qs({ limit: 20, ...query })}`),
  getProduct: (id) => request(`${V}/products/${enc(id)}`),
  getStaffProduct: (id) => request(`${V}/products/${enc(id)}`),
  createProduct: (body) => request(`${V}/products`, { method: "POST", body }),
  updateProduct: (id, body) => request(`${V}/products/${enc(id)}`, { method: "PATCH", body }),
  publishProduct: (id) => request(`${V}/products/${enc(id)}/publish`, { method: "POST" }),
  archiveProduct: (id) => request(`${V}/products/${enc(id)}`, { method: "DELETE" }),
  deleteProduct: (id) => request(`${V}/products/${enc(id)}`, { method: "DELETE" }),
  /**
   * JSON `{ items }` bulk create/update by SKU (requires a tenant context).
   * opts: { dryRun?: boolean, availableQtyMode?: "set" | "skip" }.
   * Dry run -> 200 { dryRun, ok, availableQtyMode, summary { total, valid, invalid, create, update }, rows [{ index, sku, action, ok, errors, stock }] }.
   * Real run -> 201 { created, updated, errors [{ index, sku, message, code, fields? }], ok, availableQtyMode }.
   */
  bulkUploadProducts: (items, opts = {}) => request(`${V}/products/bulk-upload${qs(bulkQuery(opts))}`, { method: "POST", body: { items } }),
  /**
   * CSV import: a File/Blob (multipart `file`, max 2 MB) or raw CSV text. Same `opts` and responses as
   * bulkUploadProducts. `availableQty` SETS the absolute sellable stock (mode "set"); "skip" ignores it.
   */
  importProductsCsv: (fileOrText, opts = {}) => {
    const path = `${V}/products/bulk-upload${qs(bulkQuery(opts))}`;
    return typeof fileOrText === "string" ? request(path, { method: "POST", body: fileOrText, headers: { "Content-Type": "text/csv" } }) : upload(path, fileOrText);
  },
  /** products.create or products.edit. query: { q, categoryId, brandId, status (comma), tag, bulkEligible }. */
  exportProductsCsv: (query = {}) => downloadFile(`${V}/products/export${qs(query)}`, "products.csv"),

  // Variants
  listVariants: (query = {}) => request(`${V}/variants${qs(query)}`),
  createVariant: (body) => request(`${V}/variants`, { method: "POST", body }),
  updateVariant: (id, body) => request(`${V}/variants/${enc(id)}`, { method: "PATCH", body }),
  deleteVariant: (id) => request(`${V}/variants/${enc(id)}`, { method: "DELETE" }),

  /**
   * Review moderation (reviews.moderate or products.edit). query: { status (published|hidden), productId, userId,
   * rating (comma list 1-5), minRating, maxRating, verified, q, sort (createdAt|updatedAt|rating|moderatedAt), order, page, limit }.
   * Rows: { id, authorName, rating, body, verifiedPurchase, status, tenant, buyer { id, name, email },
   * product { id, name, slug, sku }, moderation { status, moderatedAt, moderatedBy, note }, ... }.
   */
  listReviewsForModeration: (query = {}) => request(`${V}/products/reviews/manage${qs({ limit: 20, ...query })}`),
  /** body: { status: "published" | "hidden", note? } */
  moderateReview: (reviewId, body) => request(`${V}/products/reviews/${enc(reviewId)}`, { method: "PATCH", body }),
  deleteReview: (reviewId) => request(`${V}/products/reviews/${enc(reviewId)}`, { method: "DELETE" }),

  // Media library (media.upload or products.create). query: { folder, page, limit }
  listMedia: (query = {}) => request(`${V}/media${qs({ limit: 24, ...query })}`),
  /** fields: { folder?, tags?: "comma,separated" }. 10 MB; png/jpg/webp/gif/pdf (sniffed server-side). */
  uploadMedia: (file, fields = {}) => upload(`${V}/media`, file, fields),
  deleteMedia: (id) => request(`${V}/media/${enc(id)}`, { method: "DELETE" }),

  // Categories & brands
  listCategories: (query = {}) => request(`${V}/categories${qs(query)}`),
  createCategory: (body) => request(`${V}/categories`, { method: "POST", body }),
  updateCategory: (id, body) => request(`${V}/categories/${enc(id)}`, { method: "PATCH", body }),
  deleteCategory: (id) => request(`${V}/categories/${enc(id)}`, { method: "DELETE" }),
  listBrands: (query = {}) => request(`${V}/brands${qs(query)}`),
  listPublicBrands: () => request(`${V}/brands/public`),
  createBrand: (body) => request(`${V}/brands`, { method: "POST", body }),
  updateBrand: (id, body) => request(`${V}/brands/${enc(id)}`, { method: "PATCH", body }),
  deleteBrand: (id) => request(`${V}/brands/${enc(id)}`, { method: "DELETE" }),
};
