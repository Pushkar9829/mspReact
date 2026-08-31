import { BarChart3, Boxes, LayoutDashboard, LineChart, Package, Percent, Settings, ShoppingBag, Users } from "lucide-react";
import PanelLayout from "../../shared/components/PanelLayout.jsx";
import RequireAuth from "../../shared/components/RequireAuth.jsx";
import { ROLES } from "../../shared/auth.js";

const links = [
  { to: "/tenant", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/tenant/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/tenant/products", icon: Package, label: "Products" },
  { to: "/tenant/inventory", icon: Boxes, label: "Inventory" },
  { to: "/tenant/customers", icon: Users, label: "Customers" },
  { to: "/tenant/reports", icon: BarChart3, label: "Reports" },
  { to: "/tenant/offers", icon: Percent, label: "Offers" },
  { to: "/tenant/analytics", icon: LineChart, label: "Analytics" },
  { to: "/tenant/settings", icon: Settings, label: "Settings" },
];

export default function TenantLayout() {
  return (
    <RequireAuth roles={[ROLES.TENANT]}>
      <PanelLayout
        eyebrow="Tenant panel · Acme Wholesale"
        links={links}
        homeTo="/"
        homeLabel="← Storefront"
        loginTo="/tenant/login"
      />
    </RequireAuth>
  );
}
