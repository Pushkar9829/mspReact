import { Link } from "react-router-dom";
import { Logo } from "../../shared/components/ui.jsx";
import { useAccountDrawer } from "../context/AccountDrawerContext.jsx";

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

export default function Footer() {
  const { openAccount } = useAccountDrawer();

  return (
    <footer className="shop-footer mt-4">
      <div className="relative z-10 h-[3px] bg-gradient-to-r from-msr-gold via-white/50 to-msr-gold" />
      <div className="msr-gutter relative z-10 grid gap-10 py-12 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-block" aria-label="MS₹ home">
            <Logo light />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/75">
            Your trusted FMCG marketplace for quality products at the best wholesale and retail prices.
          </p>
        </div>

        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-msr-gold">Shop</h3>
          <div className="mt-4 grid gap-2.5 text-sm text-white/75">
            {shop.map((item) => (
              <Link key={item.to} to={item.to} className="transition hover:text-msr-gold">
                {item.label}
              </Link>
            ))}
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-msr-gold">Support</h3>
          <div className="mt-4 grid gap-2.5 text-sm text-white/75">
            {support.map((item) => (
              <Link key={item.to} to={item.to} className="transition hover:text-msr-gold">
                {item.label}
              </Link>
            ))}
            <button type="button" onClick={() => openAccount()} className="text-left transition hover:text-msr-gold">
              Your account
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-[13px] font-bold uppercase tracking-[0.16em] text-msr-gold">Sell with MS₹</h3>
          <p className="mt-4 text-sm leading-relaxed text-white/75">Reach thousands of retailers across India.</p>
          <Link
            to="/login"
            className="shop-header-cta mt-4 inline-flex h-10 items-center rounded-full px-5 text-sm font-semibold text-white"
          >
            Tenant panel
          </Link>
        </div>
      </div>

      <div className="relative z-10 border-t border-white/15">
        <div className="msr-gutter flex flex-col gap-1 py-4 text-xs text-white/60 sm:flex-row sm:items-center sm:justify-between">
          <span>© {new Date().getFullYear()} MS₹ Market Server Price. All rights reserved.</span>
          <span>Wholesale & retail FMCG, delivered pan-India.</span>
        </div>
      </div>
    </footer>
  );
}
