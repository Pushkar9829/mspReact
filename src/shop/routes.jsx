/**
 * Storefront routes. Lazy pages render inside ShopLayout's <Suspense fallback={<RouteSkeleton/>}>,
 * so there is never a blank area while a chunk loads.
 *
 * Email links (backend `utils/links.js`): /verify-email, /reset-password, /unsubscribe,
 * /restock/confirm (all ?token=), buyer orders /account/orders/:id, products /product/:slug.
 */
import { lazy, Suspense } from "react";
import { Navigate, Route, useLocation, useParams } from "react-router-dom";
import ShopLayout from "./layouts/ShopLayout.jsx";
import AccountLayout from "./layouts/AccountLayout.jsx";
import ShopAuthLayout from "./layouts/ShopAuthLayout.jsx";
import RequireAuth from "../shared/components/RequireAuth.jsx";
import { ROLES } from "../shared/auth.js";
import { useProduct } from "./hooks/useCatalog.js";
import { PdpSkeleton } from "./components/ui/Skeletons.jsx";

const Home = lazy(() => import("./pages/Home.jsx"));
const Category = lazy(() => import("./pages/Category.jsx"));
const ProductDetails = lazy(() => import("./pages/ProductDetails.jsx"));
const Cart = lazy(() => import("./pages/Cart.jsx"));
const Checkout = lazy(() => import("./pages/Checkout.jsx"));
const OrderConfirmation = lazy(() => import("./pages/OrderConfirmation.jsx"));
const Register = lazy(() => import("./pages/Register.jsx"));
const Account = lazy(() => import("./pages/Account.jsx"));
const Addresses = lazy(() => import("./pages/Addresses.jsx"));
const Coupons = lazy(() => import("./pages/Coupons.jsx"));
const Deals = lazy(() => import("./pages/Deals.jsx"));
const NewLaunches = lazy(() => import("./pages/NewLaunches.jsx"));
const Brands = lazy(() => import("./pages/Brands.jsx"));
const Store = lazy(() => import("./pages/Store.jsx"));
const Stores = lazy(() => import("./pages/Stores.jsx"));
const BulkBuy = lazy(() => import("./pages/BulkBuy.jsx"));
const Wishlist = lazy(() => import("./pages/Wishlist.jsx"));
const Orders = lazy(() => import("./pages/Orders.jsx"));
const Help = lazy(() => import("./pages/Help.jsx"));
const Support = lazy(() => import("./pages/Support.jsx"));
const Legal = lazy(() => import("./pages/Legal.jsx"));
const CmsPage = lazy(() => import("./pages/CmsPage.jsx"));
const Notifications = lazy(() => import("./pages/Notifications.jsx"));
const OrderDetail = lazy(() => import("./pages/OrderDetail.jsx"));
const Credit = lazy(() => import("./pages/Credit.jsx"));
const Security = lazy(() => import("./pages/Security.jsx"));
const RestockAlerts = lazy(() => import("./pages/RestockAlerts.jsx"));
const RestockConfirmPage = lazy(() => import("./pages/TokenActions.jsx").then((m) => ({ default: m.RestockConfirmPage })));
const NotFound = lazy(() => import("./pages/NotFound.jsx"));
const UnsubscribePage = lazy(() => import("./pages/TokenActions.jsx").then((m) => ({ default: m.UnsubscribePage })));

/** Remount a page when its params change (so state never leaks between products/orders). */
function Keyed({ Component }) {
  const params = useParams();
  return <Component key={JSON.stringify(params)} />;
}

/**
 * /product/:slug — resolves by slug (the lookup also accepts an old SKU link; we then redirect to
 * the real slug so the URL is canonical and the page's `product.slug === param` holds).
 */
function ProductRoute() {
  const { slug } = useParams();
  const { search, hash } = useLocation();
  const q = useProduct(slug);
  if (q.isPending) return <PdpSkeleton />;
  if (q.product?.slug && q.product.slug !== String(slug).toLowerCase()) {
    return <Navigate to={`/product/${q.product.slug}${search}${hash}`} replace />;
  }
  return <Keyed Component={ProductDetails} />;
}

function Redirect({ to }) {
  const params = useParams();
  const { search } = useLocation();
  const path = to.replace(/:(\w+)/g, (_, k) => encodeURIComponent(params[k] ?? ""));
  return <Navigate to={`${path}${search}`} replace />;
}

const buyer = (el) => <RequireAuth roles={[ROLES.BUYER, ROLES.TENANT, ROLES.SUPER_ADMIN]}>{el}</RequireAuth>;

export function shopRoutes() {
  return (
    <>
      <Route element={<ShopLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/category/:slug" element={<Keyed Component={Category} />} />
        <Route path="/category" element={<Navigate to="/category/all" replace />} />
        <Route path="/search" element={<Redirect to="/category/all" />} />
        <Route path="/product/:slug" element={<ProductRoute />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/checkout" element={buyer(<Checkout />)} />
        <Route path="/order/:id" element={<Keyed Component={OrderConfirmation} />} />
        <Route path="account" element={<AccountLayout />}>
          <Route index element={<Account />} />
          <Route path="orders" element={<Orders />} />
          <Route path="orders/:id" element={<Keyed Component={OrderDetail} />} />
          <Route path="credit" element={<Credit />} />
          <Route path="security" element={<Security />} />
          <Route path="alerts" element={<RestockAlerts />} />
          <Route path="addresses" element={<Addresses />} />
          <Route path="wishlist" element={<Wishlist />} />
          <Route path="coupons" element={<Coupons />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="help" element={<Help />} />
          <Route path="support" element={<Support />} />
        </Route>
        <Route path="/deals" element={<Deals />} />
        <Route path="/new" element={<NewLaunches />} />
        <Route path="/brands" element={<Brands />} />
        <Route path="/stores" element={<Stores />} />
        <Route path="/store/:slug" element={<Keyed Component={Store} />} />
        <Route path="/bulk" element={<BulkBuy />} />
        <Route path="/help" element={<Help />} />
        <Route path="/legal" element={<Legal />} />
        <Route path="/pages/:slug" element={<Keyed Component={CmsPage} />} />
        <Route path="/privacy" element={<Navigate to="/pages/privacy" replace />} />
        <Route path="/terms" element={<Navigate to="/pages/terms" replace />} />
        <Route path="/restock/confirm" element={<RestockConfirmPage />} />
        <Route path="/unsubscribe" element={<UnsubscribePage />} />
        {/* Old email links */}
        <Route path="/orders/:id" element={<Redirect to="/account/orders/:id" />} />
        {/* Short URLs people type or bookmark */}
        <Route path="/orders" element={<Navigate to="/account/orders" replace />} />
        <Route path="/coupons" element={<Navigate to="/account/coupons" replace />} />
        <Route path="/support" element={<Navigate to="/account/support" replace />} />
        <Route path="/addresses" element={<Navigate to="/account/addresses" replace />} />
        <Route path="/refunds" element={<Navigate to="/pages/refunds" replace />} />
        <Route path="/returns" element={<Navigate to="/pages/refunds" replace />} />
        {/* Unknown storefront URLs: a real 404 inside the shop chrome (panels have their own). */}
        <Route path="*" element={<NotFound />} />
      </Route>
      <Route
        path="/register"
        element={
          <ShopAuthLayout guestOnly>
            <Suspense fallback={null}>
              <Register />
            </Suspense>
          </ShopAuthLayout>
        }
      />
    </>
  );
}
