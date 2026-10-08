import { lazy, Suspense } from "react";
import { Route } from "react-router-dom";
import { tenantNav as nav } from "./layouts/nav.js";
import { page } from "../shared/layout/routing.jsx";
import { NotFoundRoute } from "../shared/layout/RequirePermission.jsx";
import { PanelBootSkeleton } from "../shared/layout/PanelBootSkeleton.jsx";

const TenantLayout = lazy(() => import("./layouts/TenantLayout.jsx"));

const Dashboard = lazy(() => import("./pages/Dashboard.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const OrderPage = lazy(() => import("./pages/OrderPage.jsx"));
const InvoicePage = lazy(() => import("./pages/InvoicePage.jsx"));
const Returns = lazy(() => import("./pages/Returns.jsx"));
const Products = lazy(() => import("./pages/Products.jsx"));
const ProductPage = lazy(() => import("./pages/ProductPage.jsx"));
const ProductImport = lazy(() => import("./pages/ProductImport.jsx"));
const Reviews = lazy(() => import("./pages/Reviews.jsx"));
const Media = lazy(() => import("./pages/Media.jsx"));
const Inventory = lazy(() => import("./pages/Inventory.jsx"));
const Customers = lazy(() => import("./pages/Customers.jsx"));
const CustomerPage = lazy(() => import("./pages/CustomerPage.jsx"));
const Team = lazy(() => import("./pages/Team.jsx"));
const RolePage = lazy(() => import("./pages/RolePage.jsx"));
const Reports = lazy(() => import("./pages/Reports.jsx"));
const Offers = lazy(() => import("./pages/Offers.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));
const Analytics = lazy(() => import("./pages/Analytics.jsx"));
const Settings = lazy(() => import("./pages/Settings.jsx"));

const B = "/tenant";

/** Route guards come from the nav config (layouts/nav.js); details inherit their section's permission. */
export function tenantRoutes() {
  return (
    <Route path={B} element={<Suspense fallback={<PanelBootSkeleton />}><TenantLayout /></Suspense>}>
      <Route index element={page(nav, B, Dashboard)} />
      <Route path="orders" element={page(nav, `${B}/orders`, Orders)} />
      <Route path="orders/:id" element={page(nav, `${B}/orders/:id`, OrderPage)} />
      <Route path="orders/:id/invoice" element={page(nav, `${B}/orders/:id/invoice`, InvoicePage)} />
      <Route path="returns" element={page(nav, `${B}/returns`, Returns)} />
      <Route path="products" element={page(nav, `${B}/products`, Products)} />
      <Route path="products/new" element={page(nav, `${B}/products/new`, ProductPage, { perm: "products.create" })} />
      <Route path="products/import" element={page(nav, `${B}/products/import`, ProductImport, { perm: "products.create" })} />
      <Route path="products/:id" element={page(nav, `${B}/products/:id`, ProductPage)} />
      <Route path="reviews" element={page(nav, `${B}/reviews`, Reviews)} />
      <Route path="media" element={page(nav, `${B}/media`, Media)} />
      <Route path="inventory" element={page(nav, `${B}/inventory`, Inventory)} />
      <Route path="customers" element={page(nav, `${B}/customers`, Customers)} />
      <Route path="customers/:id" element={page(nav, `${B}/customers/:id`, CustomerPage)} />
      <Route path="team" element={page(nav, `${B}/team`, Team)} />
      <Route path="team/roles/new" element={page(nav, `${B}/team/roles/new`, RolePage, { all: ["roles.view", "roles.create"] })} />
      <Route path="team/roles/:id" element={page(nav, `${B}/team/roles/:id`, RolePage, { perm: "roles.view" })} />
      <Route path="reports" element={page(nav, `${B}/reports`, Reports)} />
      <Route path="offers" element={page(nav, `${B}/offers`, Offers)} />
      <Route path="support" element={page(nav, `${B}/support`, Support)} />
      <Route path="analytics" element={page(nav, `${B}/analytics`, Analytics)} />
      <Route path="settings" element={page(nav, `${B}/settings`, Settings)} />
      <Route path="*" element={<NotFoundRoute home={B} />} />
    </Route>
  );
}
