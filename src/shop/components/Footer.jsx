import { Link } from "react-router-dom";
import { Banknote, BadgeCheck, CreditCard, FileText, Landmark, Mail, Phone, ShieldCheck, Smartphone, Wallet } from "lucide-react";
import { Logo } from "../../shared/components/ui.jsx";
import { cn } from "./ui/cn.js";
import { trustFacts } from "./ui/TrustBar.jsx";
import { usePublicSettings } from "../hooks/useCatalog.js";
import { POLICY_LINKS, isPlaceholder, resolveLegal } from "../config/legal.js";

const SHOP = [
  { to: "/category/all", label: "All products" },
  { to: "/deals", label: "Deals" },
  { to: "/bulk", label: "Bulk & case packs" },
  { to: "/new", label: "New launches" },
  { to: "/brands", label: "Brands" },
  { to: "/stores", label: "Sellers" },
];
const HELP = [
  { to: "/help", label: "Help centre" },
  { to: "/account/orders", label: "Track an order" },
  { to: "/account/support", label: "Contact support" },
  { to: "/register", label: "Open a business account" },
];
const PAYMENTS = [
  { icon: Smartphone, label: "UPI" },
  { icon: CreditCard, label: "Cards" },
  { icon: Landmark, label: "Netbanking" },
  { icon: Banknote, label: "Cash on delivery" },
  { icon: Wallet, label: "Credit & PO" },
];

/** A value is shown only when it is real: "[placeholder]" values from config/legal.js are hidden. */
const real = (v) => (v && !isPlaceholder(v) ? v : "");

/**
 * Storefront footer.
 *  - Slim trust row (facts from public settings), brand + links, company & grievance details, and a
 *    bottom bar with payment methods, policies and ©.
 *  - Legal details (Consumer Protection (E-Commerce) Rules, 2020) come from public settings, falling
 *    back to src/shop/config/legal.js. Unfilled "[...]" placeholders are never shown to shoppers; in
 *    development a single note lists what is still missing.
 */
export default function Footer() {
  const settings = usePublicSettings();
  const legal = resolveLegal(settings.data);
  const g = legal.grievanceOfficer || {};
  const facts = trustFacts(settings.data);

  const company = {
    name: real(legal.legalName),
    address: real(legal.address),
    gstin: real(legal.gstin),
    cin: real(legal.cin),
    phone: real(legal.phone),
    email: real(legal.email),
    hours: real(legal.hours),
  };
  const officer = { name: real(g.name), designation: g.designation || "Grievance Officer", email: real(g.email), phone: real(g.phone) };
  const missing = [
    !company.name && "legal entity name",
    !company.address && "registered address",
    !company.gstin && "GSTIN",
    !company.phone && "customer-care phone",
    !officer.name && "grievance officer",
  ].filter(Boolean);
  const brandName = company.name || legal.tradeName || "MS₹ Market Server Price";

  return (
    <footer className="shop-on-navy mt-14 bg-shop-navy text-white">
      {/* trust row */}
      {facts.length ? (
        <div className="border-b border-white/10">
          <ul aria-label="Why buy here" className="msr-gutter grid grid-cols-2 gap-x-6 gap-y-4 py-5 lg:grid-cols-4">
            {facts.map(({ id, icon: Icon, title, text }) => (
              <li key={id} className="flex items-center gap-3">
                <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-shop-gold ring-1 ring-white/10">
                  <Icon className="size-[18px]" strokeWidth={1.8} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="block text-shop-sm font-semibold leading-snug">{title}</span>
                  <span className="hidden text-shop-xs text-shop-on-navy-muted sm:block">{text}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {/* main */}
      <div className="msr-gutter grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.5fr_1fr_1fr_1.5fr]">
        <div className="grid content-start gap-4">
          <Logo light slogan={settings.data?.slogan} />
          <p className="max-w-sm text-shop-sm leading-relaxed text-shop-on-navy-muted">
            Wholesale and retail FMCG from verified sellers — business prices, GST invoices and credit terms for shops, restaurants and resellers.
          </p>
          <ul className="flex flex-wrap gap-2 text-shop-xs">
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-white/10">
              <BadgeCheck className="size-3.5 text-shop-gold" aria-hidden /> Verified sellers
            </li>
            <li className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.07] px-3 py-1.5 ring-1 ring-white/10">
              <ShieldCheck className="size-3.5 text-shop-gold" aria-hidden /> Secure payments
            </li>
          </ul>
        </div>

        <FooterLinks title="Shop" links={SHOP} />
        <FooterLinks title="Help" links={HELP} />

        <div className="grid content-start gap-5 text-shop-sm">
          <div className="grid gap-2">
            <h2 className="font-display text-shop-sm font-bold uppercase tracking-wider text-white/90">Contact</h2>
            <address className="grid gap-2 not-italic text-shop-on-navy-muted">
              {company.email ? (
                <a href={`mailto:${company.email}`} className="inline-flex items-center gap-2 hover:text-white">
                  <Mail className="size-4 shrink-0 text-shop-gold" aria-hidden /> {company.email}
                </a>
              ) : null}
              {company.phone ? (
                <a href={`tel:${company.phone.replace(/[^\d+]/g, "")}`} className="inline-flex items-center gap-2 tabular-nums hover:text-white">
                  <Phone className="size-4 shrink-0 text-shop-gold" aria-hidden /> {company.phone}
                </a>
              ) : null}
              {company.hours ? <span className="pl-6 text-shop-xs">{company.hours}</span> : null}
              <Link to="/account/support" className="inline-flex items-center gap-2 font-semibold text-white hover:underline">
                Chat with support →
              </Link>
            </address>
          </div>

          {company.name || company.address || company.gstin ? (
            <div className="grid gap-1 text-shop-on-navy-muted">
              {company.name ? <span className="font-semibold text-white">{company.name}</span> : null}
              {company.address ? <span>{company.address}</span> : null}
              {company.gstin || company.cin ? (
                <span className="inline-flex items-center gap-1.5 tabular-nums">
                  <FileText className="size-3.5 text-shop-gold" aria-hidden />
                  {company.gstin ? `GSTIN ${company.gstin}` : ""}
                  {company.cin ? ` · CIN ${company.cin}` : ""}
                </span>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-1 text-shop-on-navy-muted">
            <span className="font-semibold text-white">Grievance redressal</span>
            {officer.name ? (
              <>
                <span>
                  {officer.name}, {officer.designation}
                </span>
                {officer.email || officer.phone ? <span className="tabular-nums">{[officer.email, officer.phone].filter(Boolean).join(" · ")}</span> : null}
              </>
            ) : null}
            <Link to="/pages/grievance" className="w-fit hover:text-white hover:underline">
              How to raise a complaint
            </Link>
          </div>

          {import.meta.env.DEV && missing.length ? (
            <p className="rounded-xl border border-dashed border-shop-gold/60 bg-shop-gold/10 px-3 py-2 text-shop-xs text-shop-gold" role="note">
              Dev note — add before launch ({missing.join(", ")}) in <code className="font-mono">src/shop/config/legal.js</code> or the platform settings. Hidden from shoppers.
            </p>
          ) : null}
        </div>
      </div>

      {/* bottom bar */}
      <div className="border-t border-white/10">
        <div className="msr-gutter flex flex-col gap-4 py-6 pb-24 md:pb-6 lg:flex-row lg:items-center lg:justify-between">
          <ul aria-label="Payment methods" className="flex flex-wrap gap-2">
            {PAYMENTS.map((p) => (
              <li key={p.label} className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-white px-2.5 text-shop-xs font-semibold text-shop-ink">
                <p.icon className="size-3.5 text-shop-primary-ink" strokeWidth={2} aria-hidden />
                {p.label}
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 text-shop-xs text-shop-on-navy-muted lg:items-end">
            <nav aria-label="Policies" className="flex flex-wrap gap-x-4 gap-y-1">
              {POLICY_LINKS.map((l) => (
                <Link key={l.to} to={l.to} className="inline-flex items-center hover:text-white hover:underline pointer-coarse:min-h-11">
                  {l.label}
                </Link>
              ))}
            </nav>
            <p>
              © {new Date().getFullYear()} {brandName}. All prices include GST unless stated.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

function FooterLinks({ title, links }) {
  return (
    <nav aria-label={title} className="grid content-start gap-0.5">
      <h2 className="mb-2 font-display text-shop-sm font-bold uppercase tracking-wider text-white/90">{title}</h2>
      {links.map((l) => (
        <Link key={l.to} to={l.to} className={cn("group flex min-h-9 w-fit items-center text-shop-sm text-shop-on-navy-muted transition-colors hover:text-white pointer-coarse:min-h-11")}>
          <span className="bg-[length:0%_1px] bg-left-bottom bg-no-repeat transition-[background-size] duration-200 [background-image:linear-gradient(currentColor,currentColor)] group-hover:bg-[length:100%_1px]">{l.label}</span>
        </Link>
      ))}
    </nav>
  );
}
