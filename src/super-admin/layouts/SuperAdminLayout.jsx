import {
  Building2,
  FileText,
  LayoutDashboard,
  LineChart,
  ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Users,
} from "lucide-react";
import PanelLayout from "../../shared/components/PanelLayout.jsx";
import RequireAuth from "../../shared/components/RequireAuth.jsx";
import { ROLES } from "../../shared/auth.js";

const links = [
  { to: "/super-admin", icon: LayoutDashboard, label: "Overview", end: true },
  { to: "/super-admin/tenants", icon: Building2, label: "Tenants" },
  { to: "/super-admin/users", icon: Users, label: "Users" },
  { to: "/super-admin/roles", icon: Shield, label: "Roles" },
  { to: "/super-admin/orders", icon: ShoppingBag, label: "Orders" },
  { to: "/super-admin/cms", icon: FileText, label: "CMS" },
  { to: "/super-admin/analytics", icon: LineChart, label: "Analytics" },
  { to: "/super-admin/audit", icon: ScrollText, label: "Audit" },
  { to: "/super-admin/settings", icon: Settings, label: "Settings" },
];

export default function SuperAdminLayout() {
  return (
    <RequireAuth roles={[ROLES.SUPER_ADMIN]}>
      <PanelLayout
        eyebrow="MS₹ company console"
        links={links}
        homeTo="/"
        homeLabel="← Storefront"
        loginTo="/super-admin/login"
        sidebarClass="bg-msr-navy-dark"
      />
    </RequireAuth>
  );
}
