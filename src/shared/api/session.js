/**
 * In-memory session store: the access token never touches localStorage.
 *
 * - The refresh token lives in an httpOnly cookie (path /api/v1/auth); `refreshAccessToken()`
 *   exchanges it for a new access token. Calls are single-flight per tab and serialised across
 *   tabs with the Web Locks API, so concurrent tabs do not race the rotation.
 * - Tabs share login/logout/token events over a BroadcastChannel (same origin, memory only).
 * - Hard session failures (TOKEN_REUSE, TOKEN_REVOKED, ACCOUNT_INACTIVE, TENANT_SUSPENDED) end the
 *   session everywhere and tell the UI why (see `onSessionEnd`).
 */
import { apiUrl } from "../config.js";

export const HARD_LOGOUT_CODES = new Set(["TOKEN_REUSE", "TOKEN_REVOKED", "ACCOUNT_INACTIVE", "TENANT_SUSPENDED"]);

let accessToken = null;
/** { kind: "buyer"|"tenant"|"super_admin", tenantId } for header selection in the client. */
let principal = null;
const tokenListeners = new Set();
const endListeners = new Set();
const messageListeners = new Set();

const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel("msr-auth") : null;
const TAB_ID = Math.random().toString(36).slice(2);

channel?.addEventListener("message", (event) => {
  const msg = event.data;
  if (!msg || msg.from === TAB_ID) return;
  if (msg.type === "token") setAccessToken(msg.token, { broadcast: false });
  if (msg.type === "end") endSession(msg.reason, { broadcast: false });
  messageListeners.forEach((fn) => fn(msg));
});

export function broadcast(message) {
  try {
    channel?.postMessage({ ...message, from: TAB_ID });
  } catch {
    /* structured clone failure: ignore */
  }
}

/** Listen to messages from other tabs ({ type: "login" | "token" | "end" | "user", ... }). */
export function onBroadcast(fn) {
  messageListeners.add(fn);
  return () => messageListeners.delete(fn);
}

export function getAccessToken() {
  return accessToken;
}

export function setAccessToken(token, { broadcast: share = true } = {}) {
  const next = token || null;
  if (next === accessToken) return;
  accessToken = next;
  tokenListeners.forEach((fn) => fn(next));
  if (share && next) broadcast({ type: "token", token: next });
}

export function onTokenChange(fn) {
  tokenListeners.add(fn);
  return () => tokenListeners.delete(fn);
}

export function setPrincipal(value) {
  principal = value || null;
}

export function getPrincipal() {
  return principal;
}

/** Seconds until the JWT expires (null when unknown). */
export function tokenTtl(token = accessToken) {
  try {
    const payload = JSON.parse(atob(String(token).split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
    return payload.exp ? payload.exp - Date.now() / 1000 : null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ session end */

/**
 * End the session locally (and in other tabs). `reason` is an API error code
 * (TOKEN_REUSE, TOKEN_REVOKED, ACCOUNT_INACTIVE, TENANT_SUSPENDED, SESSION_EXPIRED) or "logout".
 */
export function endSession(reason = "logout", { broadcast: share = true } = {}) {
  const hadSession = Boolean(accessToken) || Boolean(principal);
  accessToken = null;
  principal = null;
  tokenListeners.forEach((fn) => fn(null));
  if (share) broadcast({ type: "end", reason });
  if (hadSession || reason !== "logout") endListeners.forEach((fn) => fn(reason));
}

export function onSessionEnd(fn) {
  endListeners.add(fn);
  return () => endListeners.delete(fn);
}

/* ------------------------------------------------------------------ refresh */

let inflight = null;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function parse(res) {
  const data = await res.json().catch(() => ({}));
  return data || {};
}

async function refreshOnce(startedWith, attempt) {
  // Another tab may have refreshed while we waited for the lock: reuse its token.
  if (accessToken && accessToken !== startedWith && (tokenTtl(accessToken) ?? 60) > 30) return accessToken;

  const res = await fetch(apiUrl("/api/v1/auth/refresh"), {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  });
  const data = await parse(res);
  if (res.ok && data.accessToken) {
    setAccessToken(data.accessToken);
    return data.accessToken;
  }
  const code = data.code || (res.status === 401 ? "UNAUTHORIZED" : "ERROR");
  if (code === "REFRESH_RACE" && attempt < 3) {
    // A concurrent request rotated the cookie; the browser now holds the new one.
    await sleep(250 + Math.random() * 350);
    if (accessToken && accessToken !== startedWith) return accessToken;
    return refreshOnce(startedWith, attempt + 1);
  }
  const error = new Error(data.message || "Session expired");
  error.status = res.status;
  error.code = code;
  error.requestId = data.requestId || res.headers.get("x-request-id") || "";
  throw error;
}

/**
 * Exchange the refresh cookie for a new access token. Single-flight: concurrent callers share
 * one request. Rejects with { status, code } when there is no valid session.
 */
export function refreshAccessToken() {
  if (inflight) return inflight;
  const startedWith = accessToken;
  const run = () => refreshOnce(startedWith, 0);
  const locked =
    typeof navigator !== "undefined" && navigator.locks?.request
      ? navigator.locks.request("msr-auth-refresh", run)
      : run();
  inflight = locked.finally(() => {
    inflight = null;
  });
  return inflight;
}
