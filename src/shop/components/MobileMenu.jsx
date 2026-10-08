import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Boxes, ChevronRight, HelpCircle, LogIn, LogOut, Sparkles, Tag, UserPlus } from "lucide-react";
import { ShopSheet } from "./ui/Overlays.jsx";
import { Button } from "./ui/Button.jsx";
import { useAccountDrawer, ACCOUNT_TABS } from "../context/AccountDrawerContext.jsx";
import { useCategories } from "../hooks/useCatalog.js";
import { useAuth } from "../../shared/context/AuthContext.jsx";

const row = "flex min-h-12 items-center gap-3 rounded-control px-3 text-shop-base text-shop-text hover:bg-shop-hover";

/** Accessible mobile menu (left sheet): categories with sub-categories, account, help, sign in/out. */
export default function MobileMenu() {
  const { open, closeAccount } = useAccountDrawer();
  const { user, logout } = useAuth();
  const cats = useCategories();
  const { pathname } = useLocation();
  const navigate = useNavigate();
  useEffect(() => closeAccount(), [pathname, closeAccount]);

  return (
    <ShopSheet open={open} onOpenChange={(v) => (v ? null : closeAccount())} side="left" title={user ? `Hello, ${String(user.name).split(" ")[0]}` : "Menu"} description={user?.email}>
      {!user ? (
        <div className="mb-4 grid grid-cols-2 gap-2">
          <Button to="/login" leftIcon={LogIn}>Sign in</Button>
          <Button to="/register" variant="secondary" leftIcon={UserPlus}>Register</Button>
        </div>
      ) : null}

      <p className="px-3 pb-1 text-shop-xs font-semibold text-shop-muted">Shop</p>
      <nav aria-label="Shop" className="grid">
        <Link to="/deals" className={row}><Tag className="size-5 text-shop-saffron-ink" aria-hidden /> Deals</Link>
        <Link to="/bulk" className={row}><Boxes className="size-5 text-shop-gold-ink" aria-hidden /> Bulk buy</Link>
        <Link to="/new" className={row}><Sparkles className="size-5 text-shop-muted" aria-hidden /> New launches</Link>
        {(cats.data?.roots || []).map((c) =>
          c.children.length ? (
            <details key={c.slug} className="group">
              <summary className={`${row} cursor-pointer list-none justify-between [&::-webkit-details-marker]:hidden`}>
                {c.name}
                <ChevronRight className="size-4 text-shop-muted transition-transform group-open:rotate-90" aria-hidden />
              </summary>
              <div className="ml-3 grid border-l border-shop-line pl-2">
                <Link to={`/category/${c.slug}`} className={row}>All {c.name}</Link>
                {c.children.map((child) => (
                  <Link key={child.slug} to={`/category/${child.slug}`} className={row}>{child.name}</Link>
                ))}
              </div>
            </details>
          ) : (
            <Link key={c.slug} to={`/category/${c.slug}`} className={row}>{c.name}</Link>
          )
        )}
      </nav>

      {user ? (
        <>
          <p className="mt-4 px-3 pb-1 text-shop-xs font-semibold text-shop-muted">Your account</p>
          <nav aria-label="Account" className="grid">
            {ACCOUNT_TABS.map((t) => (
              <Link key={t.id} to={t.to} className={row}>
                <t.icon className="size-5 text-shop-muted" strokeWidth={1.75} aria-hidden /> {t.label}
              </Link>
            ))}
          </nav>
        </>
      ) : (
        <Link to="/help" className={`${row} mt-4`}><HelpCircle className="size-5 text-shop-muted" aria-hidden /> Help centre</Link>
      )}

      {user ? (
        <button type="button" className={`${row} mt-4 w-full text-shop-danger-ink`} onClick={() => logout().then(() => navigate("/"))}>
          <LogOut className="size-5" aria-hidden /> Sign out
        </button>
      ) : null}
    </ShopSheet>
  );
}
