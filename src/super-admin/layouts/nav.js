import {
  BadgeCheck,
  Building2,
  FileText,
  HandCoins,
  LayoutDashboard,
  LineChart,
  Megaphone,
  MessageSquare,
  Package,
    ScrollText,
  Settings,
  Shield,
  ShoppingBag,
  Star,
  Undo2,
  Users,
  Warehouse,
} from "lucide-react";
import { api } from "../../shared/api/index.js";

/**
 * Single source of truth for the super-admin navigation AND route guards (see ../routes.jsx).
 * `req` is evaluated fail-closed with `allows(user, req)`; pages under an item's path inherit it.
 */
export const superAdminNav = {
  base: "/super-admin",
  title: "Company console",
  groups: [
    {
      label: "Operate",
      items: [
        { to: "/super-admin", end: true, label: "Overview", icon: LayoutDashboard, req: { any: ["reports.view", "analytics.view"] }, keywords: ["dashboard", "home", "kpi"] },
        { to: "/super-admin/orders", label: "Orders", icon: ShoppingBag, req: { perm: "orders.view" }, keywords: ["sales", "invoices"] },
        { to: "/super-admin/returns", label: "Returns & refunds", icon: Undo2, req: { any: ["returns.manage", "orders.refund"] }, keywords: ["refunds", "failed refunds", "rma"] },
        { to: "/super-admin/support", label: "Support", icon: MessageSquare, req: { perm: "chat.view" }, keywords: ["chat", "inbox", "tickets"] },
      ],
    },
    {
      label: "Marketplace",
      items: [
        { to: "/super-admin/tenants", label: "Tenants", icon: Building2, req: { perm: "tenants.view" }, keywords: ["stores", "sellers", "onboard"] },
        { to: "/super-admin/catalog", label: "Catalog", icon: Package, req: { perm: "products.view" }, keywords: ["products", "variants", "media"] },
        { to: "/super-admin/reviews", label: "Reviews", icon: Star, req: { any: ["reviews.moderate", "products.edit"] }, keywords: ["moderation", "ratings"] },
        { to: "/super-admin/offers", label: "Offer approvals", icon: BadgeCheck, req: { any: ["pricing.approve", "pricing.view"] }, keywords: ["promotions", "discounts", "pricing"] },
        { to: "/super-admin/ledger", label: "Credit ledger", icon: HandCoins, req: { any: ["ledger.view", "ledger.manage"] }, keywords: ["credit", "accounts", "payments"] },
        { to: "/super-admin/reservations", label: "Reservations", icon: Warehouse, req: { perm: "inventory.view" }, keywords: ["inventory", "stock holds"] },
      ],
    },
    {
      label: "People",
      items: [
        { to: "/super-admin/users", label: "Users", icon: Users, req: { perm: "users.view" }, keywords: ["buyers", "staff", "accounts"] },
        { to: "/super-admin/roles", label: "Roles", icon: Shield, req: { perm: "roles.view" }, keywords: ["permissions", "rbac"] },
      ],
    },
    {
      label: "Platform",
      items: [
        { to: "/super-admin/announcements", label: "Announcements", icon: Megaphone, req: { perm: "notifications.send" }, keywords: ["broadcast", "notifications"] },
        { to: "/super-admin/cms", label: "CMS", icon: FileText, req: { perm: "cms.view" }, keywords: ["pages", "content"] },
        { to: "/super-admin/analytics", label: "Analytics", icon: LineChart, req: { any: ["analytics.view", "reports.view"] }, keywords: ["revenue", "events"] },
        { to: "/super-admin/audit", label: "Audit log", icon: ScrollText, req: { perm: "audit.view" }, keywords: ["history", "changes"] },
        { to: "/super-admin/settings", label: "Settings", icon: Settings, req: { any: ["settings.view", "settings.edit"] }, keywords: ["fees", "delivery partners", "festival"] },
      ],
    },
  ],
};

const rows = (res) => (Array.isArray(res) ? res : res?.data || []);

/** Quick entity search for the command palette. Platform scope (no tenant header). */
export const superAdminSearchers = [
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingBag,
    req: { perm: "orders.view" },
    search: (q) => api.withTenant(null).listOrders({ q, limit: 5 }).then(rows),
    map: (o) => ({ id: o._id, label: o.orderNumber || o._id, description: [o.buyerSnapshot?.name, o.status?.replaceAll("_", " ")].filter(Boolean).join(" · "), to: `/super-admin/orders/${o._id}` }),
  },
  {
    id: "tenants",
    label: "Tenants",
    icon: Building2,
    req: { perm: "tenants.view" },
    search: (q) => api.withTenant(null).listTenants({ q, limit: 5 }).then(rows),
    map: (t) => ({ id: t._id, label: t.name, description: `${t.slug} · ${t.status}`, to: `/super-admin/tenants/${t._id}` }),
  },
  {
    id: "users",
    label: "Users",
    icon: Users,
    req: { perm: "users.view" },
    search: (q) => api.withTenant(null).listUsers({ q, limit: 5 }).then(rows),
    map: (u) => ({ id: u.id || u._id, label: u.name || u.email, description: [u.email, u.role?.name].filter(Boolean).join(" · "), to: `/super-admin/users/${u.id || u._id}` }),
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    req: { perm: "products.view" },
    search: (q) => api.withTenant(null).listStaffProducts({ q, limit: 5 }).then(rows),
    map: (p) => ({ id: p._id, label: p.name, description: [p.sku, p.status].filter(Boolean).join(" · "), to: `/super-admin/catalog/${p._id}` }),
  },
];
