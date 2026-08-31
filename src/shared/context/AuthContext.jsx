import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { mapApiRole, ROLES } from "../auth.js";
import { api } from "../api.js";

const KEY = "msr-auth";
const AuthContext = createContext(null);

function tenantIdOf(user) {
  const value = user?.tenantId || user?.tenant?.id || user?.tenant?._id;
  if (!value) return null;
  if (typeof value === "object") return String(value._id || value.id || "");
  return String(value);
}

export function mapSession(data) {
  const roleSlug = data.user?.role?.slug || data.user?.role;
  return {
    id: data.user?.id,
    name: data.user?.name || data.user?.email,
    email: data.user?.email,
    role: mapApiRole(roleSlug),
    roleSlug: typeof roleSlug === "string" ? roleSlug : "",
    tenant: data.user?.tenant?.name || "",
    tenantId: tenantIdOf(data.user),
    permissions: data.user?.role?.permissions || [],
    token: data.accessToken,
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  });

  useEffect(() => {
    if (user) localStorage.setItem(KEY, JSON.stringify(user));
    else localStorage.removeItem(KEY);
  }, [user]);

  const value = useMemo(() => {
    async function login(email, password) {
      const data = await api.login({ email: String(email).trim().toLowerCase(), password });
      if (!data?.accessToken || !data?.user) {
        throw new Error("Sign in failed. Please try again.");
      }
      const mapped = mapSession(data);
      localStorage.setItem(KEY, JSON.stringify(mapped));
      if (mapped.role === ROLES.BUYER) {
        try {
          await api.mergeCart();
        } catch {
          /* guest cart may be empty */
        }
      }
      setUser(mapped);
      return mapped;
    }

    return {
      user,
      login,
      register: async ({ name, email, password, company }) => {
        await api.register({
          name: String(name).trim(),
          email: String(email).trim().toLowerCase(),
          password,
          company: company || "",
          tenantSlug: "acme-wholesale",
        });
        return login(email, password);
      },
      logout: () => setUser(null),
    };
  }, [user]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
