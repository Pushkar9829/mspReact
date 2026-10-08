/**
 * Legal entity details shown in the footer, legal pages and invoices-facing copy.
 *
 * Required by the Consumer Protection (E-Commerce) Rules, 2020: legal name, registered address,
 * customer-care contact, GSTIN and a grievance officer (name, designation, contact).
 *
 * Fields come from GET /settings/public when the backend provides them (`legal.*` keys); anything
 * missing falls back to this file. TODO(owner): replace every "[...]" placeholder below with your
 * real, verified details before going live. Placeholders are rendered as-is and flagged in dev.
 */
export const LEGAL = {
  legalName: "[Registered legal entity name]",
  tradeName: "MS₹ Market Server Price",
  address: "[Registered office address, City, State, PIN]",
  phone: "[Customer care phone]",
  email: "", // falls back to public settings supportEmail
  gstin: "[GSTIN]",
  cin: "", // optional: company identification number
  hours: "[Support hours, e.g. Mon–Sat, 10:00–18:00 IST]",
  grievanceOfficer: {
    name: "[Grievance officer name]",
    designation: "Grievance Officer",
    email: "[grievance@your-domain]",
    phone: "[Grievance officer phone]",
  },
};

/** Policy pages (CMS slugs under /pages/:slug). */
export const POLICY_LINKS = [
  { to: "/pages/terms", label: "Terms of use" },
  { to: "/pages/privacy", label: "Privacy policy" },
  { to: "/pages/refunds", label: "Returns & refunds" },
  { to: "/pages/shipping", label: "Shipping policy" },
  { to: "/pages/grievance", label: "Grievance redressal" },
];

export function isPlaceholder(value) {
  return typeof value === "string" && /^\[.*\]$/.test(value.trim());
}

/** Merge public settings (`legal` object or flat `legal*` keys) over the config file. */
export function resolveLegal(settings) {
  const s = settings?.legal || {};
  const pick = (key, flat) => s[key] || settings?.[flat] || LEGAL[key];
  return {
    legalName: pick("legalName", "legalName"),
    tradeName: settings?.store?.displayName || settings?.name || LEGAL.tradeName,
    address: pick("address", "registeredAddress"),
    phone: pick("phone", "supportPhone"),
    email: s.email || settings?.supportEmail || LEGAL.email,
    gstin: pick("gstin", "gstin"),
    cin: pick("cin", "cin"),
    hours: pick("hours", "supportHours"),
    grievanceOfficer: { ...LEGAL.grievanceOfficer, ...(s.grievanceOfficer || settings?.grievanceOfficer || {}) },
  };
}
