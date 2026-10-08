/**
 * HTTP client for the mspNode API.
 *
 *   request(path, { method, body, query, headers, signal, tenantId, raw, auth })
 *
 * - JSON in/out; FormData/Blob/string bodies are sent as-is.
 * - Bearer token from memory (session.js). On 401 the token is refreshed once (single-flight)
 *   and the request retried once. Hard failures end the session (see session.js).
 * - Errors are `ApiError { status, code, message, requestId, fields, retryAfter }`.
 * - Tenant context: staff always send their own tenant; a platform admin sends the tenant chosen in
 *   the tenant switcher (`setPlatformTenant`), or the per-call `tenantId` option (null = none).
 */
import { apiUrl } from "../config.js";
import {
  HARD_LOGOUT_CODES,
  endSession,
  getAccessToken,
  getPrincipal,
  refreshAccessToken,
} from "./session.js";

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

export function qs(query = {}) {
  const q = new URLSearchParams();
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value == null || value === "") return;
    if (Array.isArray(value)) value.forEach((v) => v != null && v !== "" && q.append(key, String(v)));
    else q.set(key, String(value));
  });
  const suffix = q.toString();
  return suffix ? `?${suffix}` : "";
}

export const enc = (value) => encodeURIComponent(String(value ?? ""));

/* ------------------------------------------------------------------ errors */

/**
 * Field errors → `{ path: message }`.
 * The API sends `fields` as an object (zod: every failing path; mongoose ValidationError; DUPLICATE).
 * Fallbacks for older responses: an array of paths (legacy mongoose), or a "path: message" prefix in
 * `message` (legacy validate middleware). `"_"` is a whole-object issue.
 */
export function parseFieldErrors(message, fields, field) {
  const out = {};
  if (fields && typeof fields === "object" && !Array.isArray(fields)) {
    Object.entries(fields).forEach(([key, value]) => {
      if (value == null || value === "") return;
      out[key] = typeof value === "string" ? value : value?.message || String(value);
    });
  } else if (Array.isArray(fields)) {
    fields.forEach((name) => {
      if (typeof name === "string") out[name] = "Invalid value";
      else if (name?.path) out[name.path] = name.message || "Invalid value";
    });
  }
  if (!Object.keys(out).length) {
    const match = /^([A-Za-z_$][\w$]*(?:\.[\w$]+)*):\s+(.+)$/.exec(String(message || ""));
    if (match) out[match[1]] = match[2];
    else if (typeof field === "string" && field) out[field] = String(message || "Invalid value");
  }
  return out;
}

export class ApiError extends Error {
  constructor(message, code = "ERROR", status = 0, extra = {}) {
    super(message || "Request failed");
    this.name = "ApiError";
    this.code = code;
    this.status = status;
    this.requestId = extra.requestId || "";
    this.fields = extra.fields || {};
    this.retryAfter = extra.retryAfter ?? null;
    this.data = extra.data;
  }

  /** First field error message for `name` (also matches nested paths like "items.0.qty"). */
  fieldError(name) {
    if (this.fields[name]) return this.fields[name];
    const key = Object.keys(this.fields).find((k) => k === name || k.startsWith(`${name}.`));
    return key ? this.fields[key] : undefined;
  }

  get isValidation() {
    return this.code === "VALIDATION_ERROR" || this.status === 400 || this.status === 422;
  }
}

export function isApiError(err) {
  return err instanceof ApiError;
}

function retryAfterOf(res) {
  const raw = res.headers.get("retry-after");
  if (!raw) return null;
  const n = Number(raw);
  if (Number.isFinite(n)) return n;
  const at = Date.parse(raw);
  return Number.isFinite(at) ? Math.max(0, Math.round((at - Date.now()) / 1000)) : null;
}

export function toApiError(res, data = {}) {
  const message = data.message || `Request failed (${res.status})`;
  const code = data.code || (res.status === 401 ? "UNAUTHORIZED" : res.status === 403 ? "FORBIDDEN" : res.status === 404 ? "NOT_FOUND" : "ERROR");
  return new ApiError(message, code, res.status, {
    requestId: data.requestId || res.headers.get("x-request-id") || "",
    fields: parseFieldErrors(data.message, data.fields, data.field),
    retryAfter: retryAfterOf(res),
    data,
  });
}

/** Human message for any thrown value (for toasts / inline errors). */
export function errorMessage(err, fallback = "Something went wrong") {
  if (!err) return "";
  if (typeof err === "string") return err;
  return err.message || fallback;
}

/* ------------------------------------------------------------------ context */

let platformTenantId = null;
/** Tenant the platform admin is acting on (X-Tenant-Id). null = all tenants / platform scope. */
export function setPlatformTenant(id) {
  platformTenantId = id || null;
}
export function getPlatformTenant() {
  return platformTenantId;
}

// Ambient per-call context (set synchronously around a call so endpoint helpers need no extra args).
let ambient = null;
/** Run `fn` with { signal?, tenantId? } applied to every request it starts synchronously. */
export function withRequestContext(ctx, fn) {
  const prev = ambient;
  ambient = { ...(prev || {}), ...ctx };
  try {
    return fn();
  } finally {
    ambient = prev;
  }
}

const listeners = { emailNotVerified: new Set() };
/** Subscribe to cross-cutting API conditions: "emailNotVerified". */
export function onApiEvent(name, fn) {
  listeners[name]?.add(fn);
  return () => listeners[name]?.delete(fn);
}

function tenantHeaderFor(option) {
  const who = getPrincipal();
  if (option !== undefined) return option || null;
  if (!who) return null;
  if (who.kind === "tenant") return who.tenantId || null;
  if (who.kind === "super_admin") return platformTenantId;
  return null;
}

const AUTH_PATHS = /\/api\/v1\/auth\/(login|refresh|logout|register|forgot-password|reset-password|verify-email)$/;

function isPlainBody(body) {
  return body != null && typeof body === "object" && !(body instanceof FormData) && !(body instanceof Blob) && !(body instanceof URLSearchParams) && !(body instanceof ArrayBuffer);
}

/* ------------------------------------------------------------------ request */

export async function request(path, options = {}) {
  const ctx = ambient || {};
  const {
    query,
    body,
    headers: extraHeaders,
    tenantId = ctx.tenantId,
    signal = ctx.signal,
    raw = false,
    retry = true,
    auth = true,
    ...rest
  } = options;

  const url = apiUrl(query ? `${path}${qs(query)}` : path);
  const headers = { Accept: "application/json", ...(extraHeaders || {}) };
  let payload = body;
  if (isPlainBody(body)) {
    payload = JSON.stringify(body);
    headers["Content-Type"] = "application/json";
  } else if (typeof body === "string" && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  const token = auth ? getAccessToken() : null;
  if (token) {
    headers.Authorization = `Bearer ${token}`;
    const tenant = tenantHeaderFor(tenantId);
    if (tenant) headers["X-Tenant-Id"] = tenant;
  } else if (!headers["X-Guest-Key"]) {
    headers["X-Guest-Key"] = guestKey();
  }

  let res;
  try {
    res = await fetch(url, { ...rest, body: payload, headers, signal, credentials: "include" });
  } catch (err) {
    if (err?.name === "AbortError") throw err;
    throw new ApiError("Network error — check your connection and try again.", "NETWORK_ERROR", 0);
  }

  if (!res.ok) {
    const data = await res
      .clone()
      .json()
      .catch(() => ({}));
    const error = toApiError(res, data);

    if (res.status === 401 && token && retry && !AUTH_PATHS.test(path)) {
      if (HARD_LOGOUT_CODES.has(error.code)) {
        endSession(error.code);
        throw error;
      }
      try {
        await refreshAccessToken();
      } catch (refreshErr) {
        endSession(HARD_LOGOUT_CODES.has(refreshErr.code) ? refreshErr.code : "SESSION_EXPIRED");
        throw error;
      }
      return request(path, { ...options, tenantId, signal, retry: false });
    }
    if (HARD_LOGOUT_CODES.has(error.code) && token) endSession(error.code);
    if (error.code === "EMAIL_NOT_VERIFIED") listeners.emailNotVerified.forEach((fn) => fn(error));
    throw error;
  }

  if (raw) return res;
  if (res.status === 204) return null;
  const type = res.headers.get("content-type") || "";
  if (type.includes("application/json")) return res.json();
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

/* ------------------------------------------------------------------ files */

function filenameFrom(res, fallback) {
  const cd = res.headers.get("content-disposition") || "";
  const star = /filename\*=UTF-8''([^;]+)/i.exec(cd);
  if (star) return decodeURIComponent(star[1]);
  const plain = /filename="?([^";]+)"?/i.exec(cd);
  return plain ? plain[1] : fallback;
}

/** Save a Blob as a file. The object URL is revoked after the download has started. */
export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || "download";
  a.rel = "noopener";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/**
 * Export headers sent by `GET /reports/export/:kind` (and any capped export):
 * `X-Export-Total` (matching rows), `X-Export-Truncated: true` + `X-Export-Limit` when the cap was hit.
 */
export function exportInfo(res) {
  const num = (name) => {
    const raw = res?.headers?.get?.(name);
    if (raw == null || raw === "") return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
  };
  const total = num("x-export-total");
  const limit = num("x-export-limit");
  const truncated = String(res?.headers?.get?.("x-export-truncated") || "").toLowerCase() === "true";
  return { total, limit, truncated };
}

/**
 * One-line description of a finished export for a toast:
 *   { title, description, truncated } — e.g. "Exported 1,000 of 2,340 rows (the export limit)".
 */
export function describeExport(result, label = "Export") {
  const fmt = (n) => Number(n).toLocaleString("en-IN");
  if (!result) return { title: `${label} downloaded`, description: undefined, truncated: false };
  if (result.truncated) {
    const limit = result.limit ?? 1000;
    return {
      title: `${label} capped at ${fmt(limit)} rows`,
      description: `${result.total != null ? `${fmt(result.total)} rows match; only the first ${fmt(limit)} were exported.` : `Only the first ${fmt(limit)} rows were exported.`} Narrow the filters or date range to export the rest.`,
      truncated: true,
    };
  }
  return {
    title: `${label} downloaded`,
    description: result.total != null ? `${fmt(result.total)} row${result.total === 1 ? "" : "s"} · ${result.filename}` : result.filename,
    truncated: false,
  };
}

/**
 * Authenticated GET that downloads the response (CSV, PDF, JSON export).
 * Resolves `{ filename, size, total, truncated, limit }` (export headers; null when not sent).
 */
export async function downloadFile(path, filename, options = {}) {
  const res = await request(path, { ...options, raw: true, headers: { Accept: "*/*", ...(options.headers || {}) } });
  const blob = await res.blob();
  const name = filenameFrom(res, filename || "export.csv");
  saveBlob(blob, name);
  return { filename: name, size: blob.size, ...exportInfo(res) };
}

/** Authenticated GET returning a Blob (e.g. to preview a PDF in an iframe). */
export async function fetchBlob(path, options = {}) {
  const res = await request(path, { ...options, raw: true, headers: { Accept: "*/*" } });
  return res.blob();
}

/** multipart/form-data upload. `fields` are appended next to the file. */
export function upload(path, file, fields = {}, options = {}) {
  const form = new FormData();
  form.append(options.fileField || "file", file);
  Object.entries(fields).forEach(([k, v]) => v != null && form.append(k, String(v)));
  return request(path, { method: "POST", body: form, ...options });
}
