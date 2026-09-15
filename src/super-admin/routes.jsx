import { Route } from "react-router-dom";
import SuperAdminLayout from "./layouts/SuperAdminLayout.jsx";
import Overview from "./pages/Overview.jsx";
import Tenants from "./pages/Tenants.jsx";
import Users from "./pages/Users.jsx";
import Roles from "./pages/Roles.jsx";
import Orders from "./pages/Orders.jsx";
import Support from "./pages/Support.jsx";
import Cms from "./pages/Cms.jsx";
import Analytics from "./pages/Analytics.jsx";
import Audit from "./pages/Audit.jsx";
import Settings from "./pages/Settings.jsx";

export function superAdminRoutes() {
  return (
    <Route path="/super-admin" element={<SuperAdminLayout />}>
      <Route index element={<Overview />} />
      <Route path="tenants" element={<Tenants />} />
      <Route path="users" element={<Users />} />
      <Route path="roles" element={<Roles />} />
      <Route path="orders" element={<Orders />} />
      <Route path="support" element={<Support />} />
      <Route path="cms" element={<Cms />} />
      <Route path="analytics" element={<Analytics />} />
      <Route path="audit" element={<Audit />} />
      <Route path="settings" element={<Settings />} />
    </Route>
  );
}
