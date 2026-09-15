import { Route } from "react-router-dom";
import ShopLayout from "./layouts/ShopLayout.jsx";
import Home from "./pages/Home.jsx";
import Category from "./pages/Category.jsx";
import ProductDetails from "./pages/ProductDetails.jsx";
import Cart from "./pages/Cart.jsx";
import Checkout from "./pages/Checkout.jsx";
import OrderConfirmation from "./pages/OrderConfirmation.jsx";
import Register from "./pages/Register.jsx";
import Account from "./pages/Account.jsx";
import Addresses from "./pages/Addresses.jsx";
import Coupons from "./pages/Coupons.jsx";
import Deals from "./pages/Deals.jsx";
import NewLaunches from "./pages/NewLaunches.jsx";
import Brands from "./pages/Brands.jsx";
import BulkBuy from "./pages/BulkBuy.jsx";
import Wishlist from "./pages/Wishlist.jsx";
import Orders from "./pages/Orders.jsx";
import Help from "./pages/Help.jsx";
import Legal from "./pages/Legal.jsx";
import AccountLayout from "./layouts/AccountLayout.jsx";
import RequireAuth from "../shared/components/RequireAuth.jsx";
import { ROLES } from "../shared/auth.js";

export function shopRoutes() {
  return (
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
      <Route path="/register" element={<Register />} />
      <Route path="account" element={<AccountLayout />}>
        <Route index element={<Account />} />
        <Route path="orders" element={<Orders />} />
        <Route path="addresses" element={<Addresses />} />
        <Route path="wishlist" element={<Wishlist />} />
        <Route path="coupons" element={<Coupons />} />
        <Route path="help" element={<Help />} />
      </Route>
      <Route path="/deals" element={<Deals />} />
      <Route path="/new" element={<NewLaunches />} />
      <Route path="/brands" element={<Brands />} />
      <Route path="/bulk" element={<BulkBuy />} />
      <Route path="/help" element={<Help />} />
      <Route path="/legal" element={<Legal />} />
    </Route>
  );
}
