import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { superAdminNav as nav } from "./layouts/nav.js";
import { page } from "../shared/layout/routing.jsx";
import { NotFoundRoute } from "../shared/layout/RequirePermission.jsx";
import { PanelBootSkeleton } from "../shared/layout/PanelBootSkeleton.jsx";

const SuperAdminLayout = lazy(() => import("./layouts/SuperAdminLayout.jsx"));

const Overview = lazy(() => import("./pages/Overview.jsx"));
const Tenants = lazy(() => import("./pages/Tenants.jsx"));
const TenantCreate = lazy(() => import("./pages/TenantCreate.jsx"));
const TenantDetail = lazy(() => import("./pages/TenantDetail.jsx"));
const Catalog = lazy(() => import("./pages/Catalog.jsx"));
const CatalogProduct = lazy(() => import("./pages/CatalogProduct.jsx"));
const Reviews = lazy(() => import("./pages/Reviews.jsx"));
const Offers = lazy(() => import("./pages/Offers.jsx"));
const Ledger = lazy(() => import("./pages/Ledger.jsx"));
const Reservations = lazy(() => import("./pages/Reservations.jsx"));
const Users = lazy(() => import("./pages/Users.jsx"));
const UserDetail = lazy(() => import("./pages/UserDetail.jsx"));
const Roles = lazy(() => import("./pages/Roles.jsx"));
const RolePage = lazy(() => import("./pages/RolePage.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const OrderPage = lazy(() => import("./pages/OrderPage.jsx"));
const OrderInvoice = lazy(() => import("./pages/OrderInvoice.jsx"));
const Returns = lazy(() => import("./pages/Returns.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));
const Announcements = lazy(() => import("./pages/Announcements.jsx"));
const Cms = lazy(() => import("./pages/Cms.jsx"));
const CmsEditor = lazy(() => import("./pages/CmsEditor.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Audit = lazy(() => import("./pages/Audit.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));

const UiPlayground = import.meta.env.DEV ? lazy(() => import("../shared/layout/UiPlayground.jsx")) : null;

const B = "/super-admin";

/** Route guards come from the nav config (layouts/nav.js); details inherit their section's permission. */
export function superAdminRoutes() {
  return (
    <Route path={B} element={<Suspense fallback={<PanelBootSkeleton />}><SuperAdminLayout /></Suspense>}>
      <Route index element={page(nav, B, Overview)} />
      <Route path="tenants" element={page(nav, `${B}/tenants`, Tenants)} />
      <Route path="tenants/new" element={page(nav, `${B}/tenants/new`, TenantCreate, { perm: "tenants.create" })} />
      <Route path="tenants/:id" element={page(nav, `${B}/tenants/:id`, TenantDetail)} />
      <Route path="catalog" element={page(nav, `${B}/catalog`, Catalog)} />
      <Route path="catalog/:id" element={page(nav, `${B}/catalog/:id`, CatalogProduct)} />
      <Route path="reviews" element={page(nav, `${B}/reviews`, Reviews)} />
      <Route path="offers" element={page(nav, `${B}/offers`, Offers)} />
      <Route path="ledger" element={page(nav, `${B}/ledger`, Ledger)} />
      <Route path="reservations" element={page(nav, `${B}/reservations`, Reservations)} />
      <Route path="users" element={page(nav, `${B}/users`, Users)} />
      <Route path="users/:id" element={page(nav, `${B}/users/:id`, UserDetail)} />
      <Route path="roles" element={page(nav, `${B}/roles`, Roles)} />
      <Route path="roles/new" element={page(nav, `${B}/roles/new`, RolePage, { perm: "roles.create" })} />
      <Route path="roles/:id" element={page(nav, `${B}/roles/:id`, RolePage)} />
      <Route path="orders" element={page(nav, `${B}/orders`, Orders)} />
      <Route path="orders/:id" element={page(nav, `${B}/orders/:id`, OrderPage)} />
      <Route path="orders/:id/invoice" element={page(nav, `${B}/orders/:id/invoice`, OrderInvoice)} />
      <Route path="returns" element={page(nav, `${B}/returns`, Returns)} />
      <Route path="support" element={page(nav, `${B}/support`, Support)} />
      <Route path="announcements" element={page(nav, `${B}/announcements`, Announcements)} />
      <Route path="cms" element={page(nav, `${B}/cms`, Cms)} />
      <Route path="cms/:id" element={page(nav, `${B}/cms/:id`, CmsEditor)} />
      <Route path="analytics" element={page(nav, `${B}/analytics`, Analytics)} />
      <Route path="audit" element={page(nav, `${B}/audit`, Audit)} />
      <Route path="settings" element={page(nav, `${B}/settings`, Settings)} />
      {UiPlayground ? <Route path="__ui" element={page(nav, `${B}/__ui`, UiPlayground, { perm: "orders.view" })} /> : null}
      <Route path="*" element={<NotFoundRoute home={B} />} />
    </Route>
  );
}
