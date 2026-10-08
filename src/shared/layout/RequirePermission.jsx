import { lazy, Suspense } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { allows } from "../auth.js";

const ForbiddenPage = lazy(() => import("./StatusPages.jsx").then((m) => ({ default: m.ForbiddenPage })));
const NotFound = lazy(() => import("./StatusPages.jsx").then((m) => ({ default: m.NotFoundPage })));

/**
 * Route guard: renders children only when `req` allows the user (fail-closed), else a 403 page.
 *   <RequirePermission req={{ perm: "orders.view" }}>…</RequirePermission>
 *   <RequirePermission req={{ any: ["reports.view", "analytics.view"] }}>…</RequirePermission>
 */
export function RequirePermission({ req, children }) {
  const { user } = useAuth();
  if (!allows(user, req)) {
    const label = req?.perm || req?.any?.join(" or ") || req?.all?.join(" and ") || "";
    return (
      <Suspense fallback={null}>
        <ForbiddenPage permission={label} />
      </Suspense>
    );
  }
  return children;
}

/** Lazy 404 page for panel catch-all routes. */
export function NotFoundRoute({ home }) {
  return (
    <Suspense fallback={null}>
      <NotFound home={home} />
    </Suspense>
  );
}

export default RequirePermission;
