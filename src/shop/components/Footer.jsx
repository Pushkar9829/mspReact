import { Link } from "react-router-dom";
import { Logo } from "../../shared/components/ui.jsx";
import { useAccountDrawer } from "../../shared/context/AccountDrawerContext.jsx";

export default function Footer() {
  const { openAccount } = useAccountDrawer();
  return (
    <footer className="mt-16 bg-msr-navy-dark text-white">
      <div className="msr-gutter grid gap-10 py-14 md:grid-cols-4">
        <div>
          <Link to="/" className="inline-block">
            <Logo light />
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-white/70">
            Your trusted FMCG marketplace for quality products at the best wholesale and retail prices.
          </p>
        </div>
        <div>
          <h3 className="font-bold">Shop</h3>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link to="/category/all" className="hover:text-white">All products</Link>
            <Link to="/deals" className="hover:text-white">Best deals</Link>
            <Link to="/new" className="hover:text-white">New launches</Link>
            <Link to="/brands" className="hover:text-white">Top brands</Link>
            <Link to="/bulk" className="hover:text-white">Bulk buy</Link>
          </div>
        </div>
        <div>
          <h3 className="font-bold">Support</h3>
          <div className="mt-3 grid gap-2 text-sm text-white/70">
            <Link to="/help" className="hover:text-white">Help centre</Link>
            <Link to="/help#shipping" className="hover:text-white">Shipping</Link>
            <Link to="/help#returns" className="hover:text-white">Returns</Link>
            <Link to="/wishlist" className="hover:text-white">Wishlist</Link>
            <button type="button" onClick={() => openAccount()} className="text-left hover:text-white">
              Your account
            </button>
            <Link to="/legal" className="hover:text-white">Privacy & terms</Link>
          </div>
        </div>
        <div>
          <h3 className="font-bold">Sell with MS₹</h3>
          <p className="mt-3 text-sm text-white/70">Reach thousands of retailers across India.</p>
          <Link to="/tenant/login" className="mt-3 inline-flex rounded-lg bg-msr-accent px-4 py-2 text-sm font-semibold">
            Tenant panel
          </Link>
        </div>
      </div>
      <div className="border-t border-white/10">
        <div className="msr-gutter py-4 text-xs text-white/50">
          © {new Date().getFullYear()} MS₹ Market Server Price. All rights reserved.
        </div>
      </div>
    </footer>
  );
}
