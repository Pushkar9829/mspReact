import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { Home, LayoutGrid, Package, Search, ShoppingBag } from "lucide-react";
import { cn } from "./ui/cn.js";
import { useCartQuery } from "../hooks/useCart.js";

/** Routes with their own sticky bottom CTA: the bottom nav is hidden there. */
export const HIDE_BOTTOM_NAV = /^\/(cart|checkout)(\/|$)/;

export function useBottomNavVisible() {
  const { pathname } = useLocation();
  return !HIDE_BOTTOM_NAV.test(pathname);
}

/** Tab icon in a pill that fills green when the tab is active. */
function Icon({ icon: I, isActive, children }) {
  return (
    <span className={cn("relative grid h-7 w-12 place-items-center rounded-full transition-colors duration-200", isActive ? "bg-shop-primary-soft" : "group-active:bg-shop-hover")}>
      <I className="size-5" strokeWidth={isActive ? 2.1 : 1.75} aria-hidden />
      {children}
    </span>
  );
}

/**
 * Phone bottom navigation (< md): Home, Categories, Search, Orders, Cart. Hidden on /cart and
 * /checkout so it never overlaps their sticky CTAs. The layout pads the page by the nav height.
 */
export default function MobileNav() {
  const visible = useBottomNavVisible();
  const { cart } = useCartQuery();
  const navigate = useNavigate();
  if (!visible) return null;

  const focusSearch = () => {
    const input = document.querySelector('header input[role="combobox"]:not([disabled])');
    const visibleInput = [...document.querySelectorAll('header input[role="combobox"]')].find((el) => el.offsetParent !== null);
    if (visibleInput || input) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      (visibleInput || input).focus();
    } else navigate("/category/all");
  };

  const cls = ({ isActive }) =>
    cn("group flex min-h-14 flex-col items-center justify-center gap-1 text-shop-xs font-semibold transition-colors", isActive ? "text-shop-primary-ink" : "text-shop-muted active:text-shop-ink");
  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-shop-line/80 bg-shop-card/90 pb-[env(safe-area-inset-bottom)] shadow-[0_-6px_20px_-12px_rgba(11,16,51,0.25)] backdrop-blur-md md:hidden"
    >
      <div className="grid grid-cols-5">
        <NavLink to="/" end className={cls}>
          {({ isActive }) => (
            <>
              <Icon icon={Home} isActive={isActive} /> Home
            </>
          )}
        </NavLink>
        <NavLink to="/category/all" className={cls}>
          {({ isActive }) => (
            <>
              <Icon icon={LayoutGrid} isActive={isActive} /> Categories
            </>
          )}
        </NavLink>
        <button type="button" onClick={focusSearch} className={cls({ isActive: false })}>
          <Icon icon={Search} isActive={false} /> Search
        </button>
        <NavLink to="/account/orders" className={cls}>
          {({ isActive }) => (
            <>
              <Icon icon={Package} isActive={isActive} /> Orders
            </>
          )}
        </NavLink>
        <NavLink to="/cart" className={cls} aria-label={cart.count ? `Cart, ${cart.count} items` : "Cart"}>
          {({ isActive }) => (
            <>
              <Icon icon={ShoppingBag} isActive={isActive}>
                {cart.count ? (
                  <span aria-hidden className="absolute -top-1.5 right-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-shop-gold px-1 text-shop-xs font-bold leading-none text-shop-navy tabular-nums ring-2 ring-shop-card">
                    {cart.count > 99 ? "99+" : cart.count}
                  </span>
                ) : null}
              </Icon>
              Cart
            </>
          )}
        </NavLink>
      </div>
    </nav>
  );
}
