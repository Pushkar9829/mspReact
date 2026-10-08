import {
  BarChart3,
  Boxes,
  ImageIcon,
  LayoutDashboard,
  LineChart,
  MessageSquare,
  Package,
  Percent,
  Settings,
  ShoppingBag,
  Star,
  Undo2,
  UserCog,
  Users,
} from "lucide-react";
import { api } from "../../shared/api/index.js";

/**
 * Single source of truth for the tenant navigation AND route guards (see ../routes.jsx).
 * Works for system and custom roles: visibility depends only on permissions (fail-closed).
 * Detail routes inherit the `req` of the item whose `to` is their longest prefix.
 */
export const tenantNav = {
  base: "/tenant",
  title: "Store admin",
  groups: [
    {
      label: "Store",
      items: [
        { to: "/tenant", end: true, label: "Dashboard", icon: LayoutDashboard, req: { public: true }, keywords: ["home", "overview", "kpi"] },
        { to: "/tenant/orders", label: "Orders", icon: ShoppingBag, req: { perm: "orders.view" }, keywords: ["invoices", "shipping", "fulfilment"] },
        { to: "/tenant/returns", label: "Returns & refunds", icon: Undo2, req: { perm: "orders.view" }, keywords: ["returns", "refunds", "rma", "failed refunds"] },
        { to: "/tenant/support", label: "Support", icon: MessageSquare, req: { perm: "chat.view" }, keywords: ["chat", "inbox", "tickets"] },
      ],
    },
    {
      label: "Catalog",
      items: [
        { to: "/tenant/products", label: "Products", icon: Package, req: { perm: "products.view" }, keywords: ["catalog", "variants", "import", "csv", "categories", "brands"] },
        { to: "/tenant/inventory", label: "Inventory", icon: Boxes, req: { perm: "inventory.view" }, keywords: ["stock", "warehouses", "transfer", "reservations"] },
        { to: "/tenant/offers", label: "Offers & coupons", icon: Percent, req: { perm: "pricing.view" }, keywords: ["discounts", "pricing", "price lists", "b2b"] },
        { to: "/tenant/reviews", label: "Reviews", icon: Star, req: { any: ["reviews.moderate", "products.edit"] }, keywords: ["ratings", "moderation"] },
        { to: "/tenant/media", label: "Media", icon: ImageIcon, req: { any: ["media.upload", "products.create"] }, keywords: ["images", "uploads", "files"] },
      ],
    },
    {
      label: "People",
      items: [
        { to: "/tenant/customers", label: "Customers", icon: Users, req: { any: ["reports.view", "orders.view", "ledger.view"] }, keywords: ["buyers", "ledger", "credit", "terms", "outstanding"] },
        { to: "/tenant/team", label: "Team", icon: UserCog, req: { perm: "users.view" }, keywords: ["staff", "roles", "permissions"] },
      ],
    },
    {
      label: "Insights",
      items: [
        { to: "/tenant/reports", label: "Reports", icon: BarChart3, req: { perm: "reports.view" }, keywords: ["sales", "export"] },
        { to: "/tenant/analytics", label: "Analytics", icon: LineChart, req: { any: ["analytics.view", "reports.view"] }, keywords: ["events", "activity"] },
        { to: "/tenant/settings", label: "Settings", icon: Settings, req: { any: ["settings.view", "settings.edit"] }, keywords: ["store", "fees", "delivery", "branding", "tax"] },
      ],
    },
  ],
};

const rows = (res) => (Array.isArray(res) ? res : res?.data || []);

export const tenantSearchers = [
  {
    id: "orders",
    label: "Orders",
    icon: ShoppingBag,
    req: { perm: "orders.view" },
    search: (q) => api.listOrders({ q, limit: 5 }).then(rows),
    map: (o) => ({ id: o._id, label: o.orderNumber || o._id, description: [o.buyerSnapshot?.name || o.buyerId?.name, o.status?.replaceAll("_", " ")].filter(Boolean).join(" · "), to: `/tenant/orders/${o._id}` }),
  },
  {
    id: "products",
    label: "Products",
    icon: Package,
    req: { perm: "products.view" },
    search: (q) => api.listStaffProducts({ q, limit: 5 }).then(rows),
    map: (p) => ({ id: p._id, label: p.name, description: [p.sku, p.status].filter(Boolean).join(" · "), to: `/tenant/products/${p._id}` }),
  },
  {
    id: "customers",
    label: "Customers",
    icon: Users,
    req: { any: ["reports.view", "orders.view", "ledger.view"] },
    search: (q) => api.listCustomersReport({ q, limit: 5 }).then(rows),
    map: (c) => ({ id: c.id || c._id, label: c.name || c.email || "Customer", description: [c.company, c.email].filter(Boolean).join(" · "), to: `/tenant/customers/${c.id || c._id}` }),
  },
];
