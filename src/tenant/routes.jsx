import { Route } from "react-router-dom";
import TenantLayout from "./layouts/TenantLayout.jsx";
import Dashboard from "./pages/Dashboard.jsx";
import Orders from "./pages/Orders.jsx";
import Products from "./pages/Products.jsx";
import Inventory from "./pages/Inventory.jsx";
import Customers from "./pages/Customers.jsx";
import Team from "./pages/Team.jsx";
import Reports from "./pages/Reports.jsx";
import Offers from "./pages/Offers.jsx";
import Support from "./pages/Support.jsx";
import Analytics from "./pages/Analytics.jsx";
import Settings from "./pages/Settings.jsx";

export function tenantRoutes() {
  return (
    <Route path="/tenant" element={<TenantLayout />}>
      <Route index element={<Dashboard />} />
      <Route path="orders" element={<Orders />} />
      <Route path="products" element={<Products />} />
      <Route path="inventory" element={<Inventory />} />
      <Route path="customers" element={<Customers />} />
      <Route path="team" element={<Team />} />
      <Route path="reports" element={<Reports />} />
      <Route path="offers" element={<Offers />} />
      <Route path="support" element={<Support />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="settings" element={<Settings />} />
    </Route>
  );
}
