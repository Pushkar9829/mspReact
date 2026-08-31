import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "./shared/context/AuthContext.jsx";
import { CartProvider } from "./shared/context/CartContext.jsx";
import { LocationProvider } from "./shared/context/LocationContext.jsx";
import { ShopCatalogProvider } from "./shared/context/ShopCatalogContext.jsx";
import RequireAuth from "./shared/components/RequireAuth.jsx";
import ScrollToTop from "./shared/components/ScrollToTop.jsx";
import { ROLES } from "./shared/auth.js";

import ShopLayout from "./shop/layouts/ShopLayout.jsx";
import Home from "./shop/pages/Home.jsx";
import Category from "./shop/pages/Category.jsx";
import ProductDetails from "./shop/pages/ProductDetails.jsx";
import Cart from "./shop/pages/Cart.jsx";
import Checkout from "./shop/pages/Checkout.jsx";
import OrderConfirmation from "./shop/pages/OrderConfirmation.jsx";
import ShopLogin from "./shop/pages/Login.jsx";
import Register from "./shop/pages/Register.jsx";
import Account from "./shop/pages/Account.jsx";
import Addresses from "./shop/pages/Addresses.jsx";
import Coupons from "./shop/pages/Coupons.jsx";
import Deals from "./shop/pages/Deals.jsx";
import NewLaunches from "./shop/pages/NewLaunches.jsx";
import Brands from "./shop/pages/Brands.jsx";
import BulkBuy from "./shop/pages/BulkBuy.jsx";
import Wishlist from "./shop/pages/Wishlist.jsx";
import Orders from "./shop/pages/Orders.jsx";
import Help from "./shop/pages/Help.jsx";
import Legal from "./shop/pages/Legal.jsx";

import TenantLayout from "./tenant/layouts/TenantLayout.jsx";
import TenantLogin from "./tenant/pages/Login.jsx";
import TenantDashboard from "./tenant/pages/Dashboard.jsx";
import TenantOrders from "./tenant/pages/Orders.jsx";
import TenantProducts from "./tenant/pages/Products.jsx";
import TenantInventory from "./tenant/pages/Inventory.jsx";
import TenantCustomers from "./tenant/pages/Customers.jsx";
import TenantReports from "./tenant/pages/Reports.jsx";
import TenantOffers from "./tenant/pages/Offers.jsx";
import TenantAnalytics from "./tenant/pages/Analytics.jsx";
import TenantSettings from "./tenant/pages/Settings.jsx";

import SuperAdminLayout from "./super-admin/layouts/SuperAdminLayout.jsx";
import SuperAdminLogin from "./super-admin/pages/Login.jsx";
import SuperOverview from "./super-admin/pages/Overview.jsx";
import SuperTenants from "./super-admin/pages/Tenants.jsx";
import SuperUsers from "./super-admin/pages/Users.jsx";
import SuperRoles from "./super-admin/pages/Roles.jsx";
import SuperOrders from "./super-admin/pages/Orders.jsx";
import SuperCms from "./super-admin/pages/Cms.jsx";
import SuperAnalytics from "./super-admin/pages/Analytics.jsx";
import SuperAudit from "./super-admin/pages/Audit.jsx";
import SuperSettings from "./super-admin/pages/Settings.jsx";

export default function App() {
  return (
    <AuthProvider>
      <ShopCatalogProvider>
        <CartProvider>
          <LocationProvider>
            <BrowserRouter>
              <ScrollToTop />
              <Routes>
              <Route element={<ShopLayout />}>
                <Route path="/" element={<Home />} />
                <Route path="/category/:slug" element={<Category />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<Cart />} />
                <Route
                  path="/checkout"
                  element={
                    <RequireAuth roles={[ROLES.BUYER, ROLES.TENANT, ROLES.SUPER_ADMIN]}>
                      <Checkout />
                    </RequireAuth>
                  }
                />
                <Route path="/order/:id" element={<OrderConfirmation />} />
                <Route path="/login" element={<ShopLogin />} />
                <Route path="/register" element={<Register />} />
                <Route path="/account" element={<Account />} />
                <Route path="/account/addresses" element={<Addresses />} />
                <Route path="/account/coupons" element={<Coupons />} />
                <Route path="/orders" element={<Orders />} />
                <Route path="/deals" element={<Deals />} />
                <Route path="/new" element={<NewLaunches />} />
                <Route path="/brands" element={<Brands />} />
                <Route path="/bulk" element={<BulkBuy />} />
                <Route path="/wishlist" element={<Wishlist />} />
                <Route path="/help" element={<Help />} />
                <Route path="/legal" element={<Legal />} />
              </Route>

              <Route path="/tenant/login" element={<TenantLogin />} />
              <Route path="/tenant" element={<TenantLayout />}>
                <Route index element={<TenantDashboard />} />
                <Route path="orders" element={<TenantOrders />} />
                <Route path="products" element={<TenantProducts />} />
                <Route path="inventory" element={<TenantInventory />} />
                <Route path="customers" element={<TenantCustomers />} />
                <Route path="reports" element={<TenantReports />} />
                <Route path="offers" element={<TenantOffers />} />
                <Route path="analytics" element={<TenantAnalytics />} />
                <Route path="settings" element={<TenantSettings />} />
              </Route>

              <Route path="/super-admin/login" element={<SuperAdminLogin />} />
              <Route path="/super-admin" element={<SuperAdminLayout />}>
                <Route index element={<SuperOverview />} />
                <Route path="tenants" element={<SuperTenants />} />
                <Route path="users" element={<SuperUsers />} />
                <Route path="roles" element={<SuperRoles />} />
                <Route path="orders" element={<SuperOrders />} />
                <Route path="cms" element={<SuperCms />} />
                <Route path="analytics" element={<SuperAnalytics />} />
                <Route path="audit" element={<SuperAudit />} />
                <Route path="settings" element={<SuperSettings />} />
              </Route>

              <Route path="/admin" element={<Navigate to="/tenant" replace />} />
              <Route path="/seller" element={<Navigate to="/tenant" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </LocationProvider>
      </CartProvider>
      </ShopCatalogProvider>
    </AuthProvider>
  );
}
