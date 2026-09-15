import {
  BarChart3,
  Boxes,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  UserCog,
  Users,
} from "lucide-react";
import PanelLayout from "../../shared/components/PanelLayout.jsx";
import RequireAuth from "../../shared/components/RequireAuth.jsx";
import { ROLES } from "../../shared/auth.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";

const links = [
  { to: "/tenant", icon: LayoutDashboard, label: "Dashboard", end: true },
  { to: "/tenant/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/tenant/products", icon: Package, label: "Products" },
  { to: "/tenant/inventory", icon: Boxes, label: "Inventory" },
  { to: "/tenant/customers", icon: Users, label: "Customers" },
  { to: "/tenant/team", icon: UserCog, label: "Team" },
  { to: "/tenant/reports", icon: BarChart3, label: "Reports" },
  { to: "/tenant/offers", icon: Percent, label: "Offers" },
  { to: "/tenant/support", icon: MessageSquare, label: "Support" },
  { to: "/tenant/analytics", icon: LineChart, label: "Analytics" },
  { to: "/tenant/settings", icon: Settings, label: "Settings" },
];

export default function TenantLayout() {
  const { user } = useAuth();
  return (
    <RequireAuth roles={[ROLES.TENANT]}>
      <PanelLayout
        eyebrow={user?.tenant ? `Tenant panel · ${user.tenant}` : "Tenant panel"}
        links={links}
        homeTo="/"
        homeLabel="← Storefront"
        loginTo="/login"
      />
    </RequireAuth>
  );
}
