import { Home, LayoutGrid, ShoppingCart, UserRound } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useCart } from "../context/CartContext.jsx";
import { useAccountDrawer } from "../context/AccountDrawerContext.jsx";

const items = [
  { to: "/", icon: Home, label: "Home" },
  { to: "/category/all", icon: LayoutGrid, label: "Categories" },
  { to: "/cart", icon: ShoppingCart, label: "Cart" },
];

export default function MobileNav() {
  const { count } = useCart();
  const { open, openAccount } = useAccountDrawer();
  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-msr-line bg-white/95 px-2 pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 backdrop-blur-md md:hidden">
      <div className="grid grid-cols-4">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] ${
                isActive && !open ? "font-bold text-msr-primary" : "text-msr-muted"
              }`
            }
          >
            {({ isActive }) => (
              <>
                <span className={`grid h-8 w-12 place-items-center rounded-full ${isActive && !open ? "bg-msr-primary-soft" : ""}`}>
                  <item.icon className="h-5 w-5" />
                </span>
                {item.label}
                {item.to === "/cart" && count ? (
                  <span className="absolute right-5 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-msr-primary px-1 text-[9px] font-bold text-white">
                    {count}
                  </span>
                ) : null}
              </>
            )}
          </NavLink>
        ))}
        <button
          type="button"
          onClick={() => openAccount()}
          className={`relative flex flex-col items-center gap-0.5 py-1.5 text-[11px] ${open ? "font-bold text-msr-primary" : "text-msr-muted"}`}
        >
          <span className={`grid h-8 w-12 place-items-center rounded-full ${open ? "bg-msr-primary-soft" : ""}`}>
            <UserRound className="h-5 w-5" />
          </span>
          Account
        </button>
      </div>
    </nav>
  );
}
