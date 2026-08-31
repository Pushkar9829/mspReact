import { Home, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../../shared/context/CartContext.jsx";
import { useAccountDrawer } from "../../shared/context/AccountDrawerContext.jsx";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/category/all", icon: LayoutGrid, label: "Categories" },
  { to: "/cart", icon: ShoppingCart, label: "Cart" },
];

export default function MobileNav() {
  const { count } = useCart();
  const { open, openAccount } = useAccountDrawer();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-msr-border bg-white px-2 py-1 md:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${isActive && !open ? "font-bold text-msr-purple" : "text-msr-muted"}`
            }
          >
            <item.icon className="h-5 w-5" />
            {item.label}
            {item.to === "/cart" && count ? (
              <span className="absolute right-5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-msr-gold text-[9px] font-bold text-msr-navy">
                {count}
              </span>
            ) : null}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => openAccount()}
          className={`relative flex flex-col items-center gap-0.5 py-2 text-[11px] ${open ? "font-bold text-msr-purple" : "text-msr-muted"}`}
        >
          <UserRound className="h-5 w-5" />
          Account
        </button>
      </div>
    </nav>
  );
}
