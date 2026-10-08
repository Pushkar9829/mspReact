/**
 * Human labels and descriptions for permission keys (GET /permissions only returns the key as its
 * description). Grouped for the role permission matrix. Keys the API returns that are not listed
 * here fall into an "Other" group with the key as label, so new backend permissions still show up.
 */
export const PERMISSION_GROUPS = [
  {
    id: "orders",
    label: "Orders",
    description: "Order queue, fulfilment and refunds.",
    permissions: {
      "orders.view": ["View orders", "See orders, invoices and order history for the store."],
      "orders.create": ["Create orders", "Place orders on behalf of buyers."],
      "orders.update": ["Fulfil orders", "Confirm, process, ship and deliver orders."],
      "orders.cancel": ["Cancel orders", "Cancel orders and release reserved stock."],
      "orders.refund": ["Issue refunds", "Refund paid orders back to buyers."],
    },
  },
  {
    id: "returns",
    label: "Returns",
    description: "Return requests from buyers.",
    permissions: {
      "returns.manage": ["Manage returns", "Approve, reject and receive returned items."],
    },
  },
  {
    id: "products",
    label: "Products",
    description: "Your catalog listings.",
    permissions: {
      "products.view": ["View products", "Browse the store catalog in the admin."],
      "products.create": ["Create products", "Add products, variants and bulk imports."],
      "products.edit": ["Edit products", "Change product details, images and variants."],
      "products.delete": ["Delete products", "Remove products from the catalog."],
      "products.publish": ["Publish products", "Make products visible to buyers or hide them."],
    },
  },
  {
    id: "categories",
    label: "Categories",
    description: "Catalog categories.",
    permissions: {
      "categories.view": ["View categories", "See the category tree."],
      "categories.create": ["Create categories", "Add new categories."],
      "categories.edit": ["Edit categories", "Rename or reorganise categories."],
      "categories.delete": ["Delete categories", "Remove categories."],
    },
  },
  {
    id: "brands",
    label: "Brands",
    description: "Brands used on products.",
    permissions: {
      "brands.view": ["View brands", "See brands."],
      "brands.create": ["Create brands", "Add new brands."],
      "brands.edit": ["Edit brands", "Change brand names and logos."],
      "brands.delete": ["Delete brands", "Remove brands."],
    },
  },
  {
    id: "inventory",
    label: "Inventory",
    description: "Stock levels across warehouses.",
    permissions: {
      "inventory.view": ["View inventory", "See stock levels and movements."],
      "inventory.adjust": ["Adjust stock", "Add or remove stock with a reason."],
      "inventory.transfer": ["Transfer stock", "Move stock between warehouses."],
      "inventory.publish": ["Publish stock", "Make stock available for sale."],
    },
  },
  {
    id: "warehouses",
    label: "Warehouses",
    description: "Pickup and storage locations.",
    permissions: {
      "warehouses.view": ["View warehouses", "See warehouse locations."],
      "warehouses.create": ["Create warehouses", "Add warehouse locations."],
      "warehouses.edit": ["Edit warehouses", "Change warehouse details."],
    },
  },
  {
    id: "pricing",
    label: "Pricing, offers & coupons",
    description: "Price lists, promotions and discount codes.",
    permissions: {
      "pricing.view": ["View pricing", "See price lists and tiers."],
      "pricing.create": ["Create price lists", "Add price lists and tiers."],
      "pricing.edit": ["Edit pricing", "Change prices and tiers."],
      "pricing.approve": ["Approve pricing", "Approve price changes before they go live."],
      "offers.create": ["Create offers", "Set up promotions."],
      "offers.edit": ["Edit offers", "Change or end promotions."],
      "coupons.create": ["Create coupons", "Issue discount codes."],
      "coupons.disable": ["Disable coupons", "Switch off discount codes."],
    },
  },
  {
    id: "customers",
    label: "Customers & credit",
    description: "Buyer accounts, credit terms and ledger.",
    permissions: {
      "ledger.view": ["View ledger", "See buyer balances and statements."],
      "ledger.manage": ["Manage credit", "Set credit terms, record payments and adjustments."],
    },
  },
  {
    id: "chat",
    label: "Support chat",
    description: "Conversations with buyers.",
    permissions: {
      "chat.view": ["View conversations", "Read the support inbox."],
      "chat.reply": ["Reply", "Send messages to buyers."],
      "chat.assign": ["Assign conversations", "Assign conversations to teammates."],
      "chat.close": ["Close conversations", "Resolve and close conversations."],
    },
  },
  {
    id: "reports",
    label: "Reports & analytics",
    description: "Sales numbers and exports.",
    permissions: {
      "reports.view": ["View reports", "See sales, order and customer reports."],
      "reports.export": ["Export reports", "Download reports and lists as CSV."],
      "analytics.view": ["View analytics", "See the analytics dashboard."],
    },
  },
  {
    id: "team",
    label: "Team & roles",
    description: "Staff accounts and what they can do.",
    permissions: {
      "users.view": ["View team", "See staff members and buyers of the store."],
      "users.create": ["Add members", "Create staff accounts."],
      "users.edit": ["Edit members", "Change names, roles and status of staff."],
      "users.delete": ["Suspend members", "Suspend staff and sign them out."],
      "users.activate": ["Activate members", "Activate pending accounts."],
      "roles.view": ["View roles", "See roles and their permissions."],
      "roles.create": ["Create roles", "Add custom roles."],
      "roles.edit": ["Edit roles", "Change custom role permissions."],
      "roles.delete": ["Delete roles", "Remove custom roles that nobody holds."],
      "permissions.assign": ["Assign permissions", "Grant permissions to roles."],
    },
  },
  {
    id: "settings",
    label: "Settings",
    description: "Store profile, delivery and payments.",
    permissions: {
      "settings.view": ["View settings", "See store settings."],
      "settings.edit": ["Edit settings", "Change store profile, branding, delivery, fees and payments."],
    },
  },
  {
    id: "media",
    label: "Media",
    description: "Image and file library.",
    permissions: {
      "media.upload": ["Upload media", "Upload images and files to the media library."],
    },
  },
  {
    id: "reviews",
    label: "Reviews",
    description: "Buyer product reviews.",
    permissions: {
      "reviews.moderate": ["Moderate reviews", "Publish, hide and reply to reviews."],
    },
  },
  {
    id: "cms",
    label: "Content",
    description: "Store pages and banners.",
    permissions: {
      "cms.view": ["View content", "See pages and banners."],
      "cms.create": ["Create content", "Add pages and banners."],
      "cms.edit": ["Edit content", "Change pages and banners."],
      "cms.publish": ["Publish content", "Make pages and banners live."],
    },
  },
  {
    id: "notifications",
    label: "Notifications",
    description: "Announcements to buyers.",
    permissions: {
      "notifications.create": ["Draft notifications", "Write announcements."],
      "notifications.send": ["Send notifications", "Send announcements to buyers."],
      "notifications.manage": ["Manage notifications", "Manage notification settings and history."],
    },
  },
  {
    id: "audit",
    label: "Audit log",
    description: "Who changed what.",
    permissions: {
      "audit.view": ["View audit log", "See the history of admin actions."],
    },
  },
];

const INDEX = new Map();
PERMISSION_GROUPS.forEach((g, gi) =>
  Object.entries(g.permissions).forEach(([key, [label, description]], pi) => INDEX.set(key, { group: g.id, label, description, order: gi * 100 + pi }))
);

export function permissionInfo(key) {
  return INDEX.get(key) || { group: "other", label: key, description: key, order: 99999 };
}

/** Group a list of available permission keys for the matrix. */
export function groupPermissions(keys = []) {
  const byGroup = new Map();
  keys.forEach((key) => {
    const info = permissionInfo(key);
    if (!byGroup.has(info.group)) byGroup.set(info.group, []);
    byGroup.get(info.group).push({ key, ...info });
  });
  const out = PERMISSION_GROUPS.filter((g) => byGroup.has(g.id)).map((g) => ({
    id: g.id,
    label: g.label,
    description: g.description,
    items: byGroup.get(g.id).sort((a, b) => a.order - b.order),
  }));
  if (byGroup.has("other")) {
    out.push({ id: "other", label: "Other", description: "Permissions without a description yet.", items: byGroup.get("other").sort((a, b) => a.key.localeCompare(b.key)) });
  }
  return out;
}

/** True when the signed-in user holds `key` (platform "*" holds everything). */
export function holds(userPermissions = [], key) {
  return userPermissions.includes("*") || userPermissions.includes(key);
}

/** Roles a tenant member may be given: system tenant roles and this store's custom roles, never buyer/platform. */
export function isStaffRole(role) {
  if (!role) return false;
  if (role.scope === "platform") return false;
  if (role.isSystem && role.slug === "buyer") return false;
  return true;
}

/** Role permissions the actor does not hold (backend rejects assigning/editing such roles with 403). */
export function missingPermissions(userPermissions = [], role) {
  if (userPermissions.includes("*")) return [];
  return (role?.permissions || []).filter((p) => !userPermissions.includes(p));
}

export function roleId(role) {
  return String(role?._id ?? role?.id ?? "");
}
