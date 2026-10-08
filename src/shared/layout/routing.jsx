import { Suspense } from "react";
import { useParams } from "react-router-dom";
import { RequirePermission } from "./RequirePermission.jsx";
import { PageSkeleton } from "../ui/skeletons.jsx";
import { matchNav } from "./navUtils.js";

/**
 * Element for a lazily loaded panel page, guarded by the nav item that owns `path`.
 *   <Route path="orders/:id" element={page(nav, "/tenant/orders/:id", OrderPage)} />
 * Pass an explicit `req` to override the inherited requirement.
 */
export function page(nav, path, Component, req) {
  const owner = matchNav(nav, path.replace(/\/:[^/]+/g, "/x"));
  const requirement = req || owner?.req || { public: true };
  return (
    <RequirePermission req={requirement}>
      <Suspense fallback={<PageSkeleton />}>
        <KeyedByParams Component={Component} />
      </Suspense>
    </RequirePermission>
  );
}

/** Remount the page when its route params change (e.g. /users/a → /users/b) so form state never carries over. */
function KeyedByParams({ Component }) {
  const params = useParams();
  return <Component key={JSON.stringify(params)} />;
}

/** Suspense wrapper for lazy pages outside the panels (storefront). */
export function lazyEl(Component, fallback = null) {
  return (
    <Suspense fallback={fallback ?? <div className="min-h-[50vh]" aria-busy="true" />}>
      <Component />
    </Suspense>
  );
}
