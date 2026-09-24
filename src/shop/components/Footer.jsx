import { Link } from "react-router-dom";
import { BadgeCheck, RotateCcw, ShieldCheck, Truck } from "lucide-react";
import { Logo } from "../../shared/components/ui.jsx";
import { useAccountDrawer } from "../context/AccountDrawerContext.jsx";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";

const shop = [
  { to: "/category/all", label: "All products" },
  { to: "/deals", label: "Best deals" },
  { to: "/new", label: "New launches" },
  { to: "/brands", label: "Top brands" },
  { to: "/bulk", label: "Bulk buy" },
];

const support = [
  { to: "/help", label: "Help centre" },
  { to: "/help#shipping", label: "Shipping" },
  { to: "/help#returns", label: "Returns" },
  { to: "/account/wishlist", label: "Wishlist" },
  { to: "/legal", label: "Privacy & terms" },
];

const TRUST = [
  { icon: BadgeCheck, title: "Genuine products", text: "Sealed branded packs" },
  { icon: ShieldCheck, title: "Secure payments", text: "UPI, cards, net banking" },
  { icon: Truck, title: "Fast dispatch", text: "Metro in 1–3 days" },
  { icon: RotateCcw, title: "Easy returns", text: "7-day sealed returns" },
];

const PAYMENTS = ["UPI", "Cards", "Net banking", "COD"];

export default function Footer() {
  const { openAccount } = useAccountDrawer();
  const { branding } = useShopCatalog();

  return (
    <footer className="mt-8 bg-msr-ink text-white">
      <div className="border-b border-white/10">
        <div className="msr-gutter grid grid-cols-2 gap-4 py-6 md:grid-cols-4">
          {TRUST.map(({ icon: Icon, title, text }) => (
            <div key={title} className="flex items-start gap-3">
              <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white/8 text-msr-gold">
                <Icon className="h-5 w-5" strokeWidth={1.7} />
              </span>
              <div>
                <p className="text-[13px] font-bold">{title}</p>
                <p className="mt-0.5 text-[12px] text-white/55">{text}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="msr-gutter grid gap-10 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-block" aria-label="MS₹ home">
            <Logo light slogan={branding?.slogan} />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/65">
            {branding?.slogan || "भाव भी भरोसा भी"}. Your trusted FMCG marketplace for quality products at wholesale and
            retail prices.
          </p>
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">Shop</h3>
          <div className="mt-4 grid gap-2.5 text-sm text-white/70">
            {shop.map((item) => (
              <Link key={item.to} to={item.to} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">Support</h3>
          <div className="mt-4 grid gap-2.5 text-sm text-white/70">
            {support.map((item) => (
              <Link key={item.to} to={item.to} className="transition hover:text-white">
                {item.label}
              </Link>
            ))}
            <button type="button" onClick={() => openAccount()} className="text-left transition hover:text-white">
              Your account
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/45">Sell with MS₹</h3>
          <p className="mt-4 text-sm leading-relaxed text-white/70">Reach thousands of retailers across India.</p>
          <Link
            to="/login"
            className="mt-4 inline-flex h-10 items-center rounded-xl bg-msr-primary px-5 text-sm font-semibold text-white hover:bg-msr-primary-hover"
          >
            Tenant panel
          </Link>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="msr-gutter flex flex-col gap-3 py-4 text-xs text-white/50 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MS₹ Market Server Price. All rights reserved.</span>
          <div className="flex flex-wrap items-center gap-2">
            {PAYMENTS.map((p) => (
              <span key={p} className="rounded-md border border-white/15 px-2 py-1 text-[11px] font-semibold text-white/70">
                {p}
              </span>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
