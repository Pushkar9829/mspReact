import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { mapApiRole, ROLES, can as canFor } from "../auth.js";
import { api } from "../api/index.js";
import { onApiEvent } from "../api/client.js";
import {
  broadcast,
  endSession,
  getAccessToken,
  onBroadcast,
  onSessionEnd,
  onTokenChange,
  refreshAccessToken,
  setAccessToken,
  setPrincipal,
  tokenTtl,
} from "../api/session.js";
import { queryClient } from "../api/queryClient.js";
import { shopKeys } from "../../shop/hooks/keys.js";

const AuthContext = createContext(null);

const ME_INTERVAL_MS = 5 * 60_000;
const FOCUS_THROTTLE_MS = 30_000;

function tenantIdOf(user) {
  const value = user?.tenantId || user?.tenant?.id || user?.tenant?._id;
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
}

/** API user → app user. `token` is filled from memory by the provider. */
export function mapUser(apiUser) {
  if (!apiUser) return null;
  const role = apiUser.role && typeof apiUser.role === "object" ? apiUser.role : null;
  const kind = mapApiRole(apiUser);
  return {
    id: apiUser.id || apiUser._id,
    name: apiUser.name || apiUser.email,
    email: apiUser.email,
    phone: apiUser.phone || "",
    status: apiUser.status,
    emailVerified: apiUser.emailVerified !== false,
    role: kind,
    roleSlug: role?.slug || (typeof apiUser.role === "string" ? apiUser.role : ""),
    roleName: role?.name || "",
    roleScope: role?.scope || "",
    isPlatformAdmin: kind === ROLES.SUPER_ADMIN,
    tenant: apiUser.tenant?.name || "",
    tenantSlug: apiUser.tenant?.slug || "",
    tenantStatus: apiUser.tenant?.status || "",
    tenantInfo: apiUser.tenant || null,
    tenantId: tenantIdOf(apiUser),
    homeTenantId: apiUser.homeTenantId ? String(apiUser.homeTenantId) : null,
    permissions: Array.isArray(role?.permissions) ? role.permissions : [],
    profile: apiUser.profile || {},
    lastLoginAt: apiUser.lastLoginAt || null,
    ledgerBalance: apiUser.ledgerBalance ?? null,
    ledgerUpdatedAt: apiUser.ledgerUpdatedAt || null,
  };
}

/** Back-compat: `mapSession({ user, accessToken })`. */
export function mapSession(data) {
  const user = mapUser(data?.user);
  return user ? { ...user, token: data.accessToken } : null;
}

export function AuthProvider({ children }) {
  /** "loading" while the refresh cookie is exchanged on boot, then "authenticated" | "anonymous". */
  const [status, setStatus] = useState("loading");
  const [profile, setProfile] = useState(null);
  const [token, setToken] = useState(getAccessToken());
  /** Why the session ended (TOKEN_REUSE, TOKEN_REVOKED, ACCOUNT_INACTIVE, TENANT_SUSPENDED, SESSION_EXPIRED). */
  const [endedReason, setEndedReason] = useState(null);
  const [emailBlocked, setEmailBlocked] = useState(false);
  const lastMe = useRef(0);

  const applyUser = useCallback((apiUser) => {
    const mapped = mapUser(apiUser);
    setPrincipal(mapped ? { kind: mapped.role, tenantId: mapped.tenantId } : null);
    setProfile(mapped);
    setStatus(mapped ? "authenticated" : "anonymous");
    return mapped;
  }, []);

  const loadMe = useCallback(async () => {
    lastMe.current = Date.now();
    const me = await api.me();
    return applyUser(me);
  }, [applyUser]);

  // Token changes (refresh, other tabs, logout) → state.
  useEffect(() => onTokenChange((next) => setToken(next)), []);

  // Hard / soft session end → clear state, remember the reason for the explanatory screen.
  useEffect(
    () =>
      onSessionEnd((reason) => {
        setPrincipal(null);
        setProfile(null);
        setStatus("anonymous");
        queryClient.clear();
        if (reason && reason !== "logout") setEndedReason(reason);
      }),
    []
  );

  useEffect(() => onApiEvent("emailNotVerified", () => setEmailBlocked(true)), []);

  // Boot: exchange the httpOnly refresh cookie for an access token, then load the profile.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        if (!getAccessToken()) await refreshAccessToken();
        const me = await api.me();
        if (!cancelled) applyUser(me);
      } catch (err) {
        if (!cancelled) {
          setPrincipal(null);
          setStatus("anonymous");
          if (["TOKEN_REUSE", "TOKEN_REVOKED", "ACCOUNT_INACTIVE", "TENANT_SUSPENDED"].includes(err?.code)) setEndedReason(err.code);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyUser]);

  // Other tabs: login → adopt the session; profile updates → mirror.
  useEffect(
    () =>
      onBroadcast((msg) => {
        if (msg.type === "login" && msg.user) {
          setEndedReason(null);
          applyUser(msg.user);
        }
        if (msg.type === "user" && msg.user) applyUser(msg.user);
      }),
    [applyUser]
  );

  // Proactive refresh shortly before the access token expires.
  useEffect(() => {
    if (!token) return undefined;
    const ttl = tokenTtl(token);
    if (ttl == null) return undefined;
    const ms = Math.max(5_000, (ttl - 60) * 1000);
    const timer = setTimeout(() => {
      refreshAccessToken().catch((err) => endSession(err?.code && err.code !== "UNAUTHORIZED" ? err.code : "SESSION_EXPIRED"));
    }, Math.min(ms, 2 ** 31 - 1));
    return () => clearTimeout(timer);
  }, [token]);

  // Keep permissions fresh: /auth/me every 5 min and when the window regains focus.
  useEffect(() => {
    if (status !== "authenticated") return undefined;
    const refreshMe = () => {
      if (Date.now() - lastMe.current < FOCUS_THROTTLE_MS) return;
      loadMe().catch(() => {});
    };
    const interval = setInterval(() => loadMe().catch(() => {}), ME_INTERVAL_MS);
    const onVisible = () => document.visibilityState === "visible" && refreshMe();
    window.addEventListener("focus", refreshMe);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      clearInterval(interval);
      window.removeEventListener("focus", refreshMe);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [status, loadMe]);

  const value = useMemo(() => {
    const user = profile && token ? { ...profile, token } : null;

    /**
     * Sign in. For buyers the guest cart is merged server-side BEFORE the user is applied, so no
     * component can fetch the un-merged cart in between; the merged quote is written to the shop
     * cart cache and returned as `cartQuote` (null when there was nothing to merge or it failed).
     */
    async function login(email, password) {
      const data = await api.login({ email: String(email).trim().toLowerCase(), password });
      if (!data?.accessToken || !data?.user) throw new Error("Sign in failed. Please try again.");
      queryClient.clear();
      setAccessToken(data.accessToken);
      const preview = mapUser(data.user);
      let cartQuote = null;
      if (preview?.role === ROLES.BUYER) {
        try {
          const merged = await api.mergeCart();
          if (merged && Array.isArray(merged.groups)) {
            cartQuote = merged;
            queryClient.setQueryData(shopKeys.cart(String(preview.id)), merged);
          }
        } catch {
          /* guest cart may be empty / merge failed: the cart page loads the server cart */
        }
      }
      const mapped = applyUser(data.user);
      setEndedReason(null);
      setEmailBlocked(false);
      broadcast({ type: "login", user: data.user });
      return { ...mapped, token: data.accessToken, cartQuote };
    }

    async function logout() {
      try {
        await api.logout();
      } catch {
        /* the local session ends regardless */
      }
      endSession("logout");
    }

    async function logoutAll() {
      await api.logoutAll();
      endSession("logout");
    }

    return {
      user,
      status,
      loading: status === "loading",
      isAuthenticated: Boolean(user),
      endedReason,
      clearEndedReason: () => setEndedReason(null),
      emailBlocked,
      can: (permission) => canFor(user, permission),
      login,
      /**
       * Registers a buyer. Does NOT sign in: the API answers 201 with the same message for new and
       * existing emails (no enumeration), so the caller shows a "check your email / sign in" step.
       * Pass `tenantSlug` to attach the buyer to a store; `businessType` (kirana | horeca | distributor |
       * institution | other) and `gstin` are stored on the profile. Resolves { ok, email, message }.
       */
      register: async ({ name, email, password, company, phone, tenantSlug, businessType, gstin }) =>
        api.register({
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          password,
          ...(company ? { company } : {}),
          ...(phone ? { phone } : {}),
          ...(tenantSlug ? { tenantSlug } : {}),
          ...(businessType ? { businessType } : {}),
          ...(gstin ? { gstin } : {}),
        }),
      logout,
      logoutAll,
      /** Change password: the server revokes other sessions and returns a fresh access token. */
      changePassword: async (currentPassword, newPassword) => {
        const res = await api.changePassword({ currentPassword, newPassword });
        if (res?.accessToken) setAccessToken(res.accessToken);
        return res;
      },
      reloadUser: loadMe,
      updateProfile: async (body) => {
        await api.updateMe(body);
        const me = await api.me();
        broadcast({ type: "user", user: me });
        return applyUser(me);
      },
      patchUser: (partial) => setProfile((prev) => (prev ? { ...prev, ...partial } : prev)),
    };
  }, [profile, token, status, endedReason, emailBlocked, applyUser, loadMe]); // eslint-disable-line react-hooks/exhaustive-deps

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** `const can = useCan(); can("orders.update")` — fail-closed. */
export function useCan() {
  const { can } = useAuth();
  return can;
}
