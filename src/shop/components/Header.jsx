import { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import { BadgePercent, ChevronDown, Heart, MapPin, Menu, Search, ShoppingCart, X } from "lucide-react";
import { Logo } from "../../shared/components/ui.jsx";
import { useCart } from "../../shared/context/CartContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { useDeliveryLocation } from "../../shared/context/LocationContext.jsx";
import { useAccountDrawer } from "../../shared/context/AccountDrawerContext.jsx";
import { useShopCatalog } from "../../shared/context/ShopCatalogContext.jsx";

const nav = [
  { to: "/", label: "Home" },
  { to: "/deals", label: "Best Deals" },
  { to: "/new", label: "New Launches" },
  { to: "/brands", label: "Top Brands" },
  { to: "/bulk", label: "Bulk Buy" },
  { to: "/tenant/login", label: "Sell on MS₹" },
];

export default function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const { location, setLocation, open, setOpen, locations } = useDeliveryLocation();
  const { openAccount } = useAccountDrawer();
  const { categories } = useShopCatalog();
  const [q, setQ] = useState("");
  const [menu, setMenu] = useState(false);
  const [cats, setCats] = useState(false);
  const navigate = useNavigate();

  function search(e) {
    e.preventDefault();
    navigate(q.trim() ? `/category/all?q=${encodeURIComponent(q.trim())}` : "/category/all");
    setMenu(false);
  }

  return (
    <header className="sticky top-0 z-40 bg-[#070b2e] text-white">
      <div className="msr-gutter flex h-[4.25rem] items-center gap-4 lg:gap-6">
        <button type="button" className="lg:hidden" onClick={() => setMenu((v) => !v)} aria-label="Menu">
          {menu ? <X /> : <Menu />}
        </button>
        <Link to="/" className="shrink-0">
          <Logo light compact />
        </Link>

        <button
          type="button"
          onClick={() => setOpen(!open)}
          className="relative hidden items-center gap-2 rounded-lg px-1 py-1.5 text-left text-sm hover:bg-white/10 lg:flex"
        >
          <MapPin className="h-4 w-4 shrink-0 text-white/80" />
          <span className="whitespace-nowrap">
            Deliver to {location.city}, {location.postalCode}
          </span>
          <ChevronDown className="h-4 w-4" />
          {open ? (
            <div className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-xl bg-white py-1 text-msr-text shadow-xl">
              {locations.map((loc) => (
                <button
                  key={loc.postalCode}
                  type="button"
                  className="block w-full px-4 py-2 text-left text-sm hover:bg-msr-bg"
                  onClick={() => {
                    setLocation(loc);
                    setOpen(false);
                  }}
                >
                  {loc.city}, {loc.postalCode}
                </button>
              ))}
            </div>
          ) : null}
        </button>

        <form onSubmit={search} className="relative hidden min-w-0 flex-1 md:block">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search for products, brands and more..."
            className="h-11 w-full rounded-xl bg-white px-4 pr-11 text-sm text-msr-text outline-none ring-0 placeholder:text-[#8b8ea3] focus:ring-2 focus:ring-[#7b6cff]/40"
          />
          <button type="submit" className="absolute right-3 top-1/2 -translate-y-1/2 text-msr-navy" aria-label="Search">
            <Search className="h-4 w-4" />
          </button>
        </form>

        <nav className="ml-auto flex shrink-0 items-center gap-5 lg:gap-6">
          <Link to="/deals" className="hidden flex-col items-center gap-1 text-white hover:opacity-90 lg:flex">
            <BadgePercent className="h-5 w-5" strokeWidth={1.6} />
            <span className="text-[11px] font-medium leading-none">Offers</span>
          </Link>
          <Link to="/wishlist" className="hidden flex-col items-center gap-1 text-white hover:opacity-90 md:flex">
            <Heart className="h-5 w-5" strokeWidth={1.6} />
            <span className="text-[11px] font-medium leading-none">Wishlist</span>
          </Link>
          <Link to="/cart" className="flex flex-col items-center gap-1 text-white hover:opacity-90">
            <span className="relative">
              <ShoppingCart className="h-5 w-5" strokeWidth={1.6} />
              {count ? (
                <span className="absolute -right-2 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[#7b6cff] px-1 text-[9px] font-bold leading-none text-white">
                  {count}
                </span>
              ) : null}
            </span>
            <span className="text-[11px] font-medium leading-none">Cart</span>
          </Link>
          {user ? (
            <button
              type="button"
              onClick={() => openAccount()}
              className="flex flex-col items-end justify-center text-right text-white hover:opacity-90"
            >
              <span className="text-sm font-bold leading-tight">Hi, {user.name.split(" ")[0]}</span>
              <span className="text-[11px] font-normal leading-tight text-white/80">Account</span>
            </button>
          ) : (
            <div className="flex flex-col items-end justify-center text-right text-white">
              <Link to="/login" className="text-sm font-bold leading-tight hover:opacity-90">
                Sign In
              </Link>
              <Link to="/register" className="text-[11px] font-normal leading-tight text-white/85 hover:opacity-90">
                or Sign Up
              </Link>
            </div>
          )}
        </nav>
      </div>

      <form onSubmit={search} className="msr-gutter pb-3 md:hidden">
        <div className="relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search products..."
            className="h-11 w-full rounded-xl bg-white px-4 pr-10 text-sm text-msr-text outline-none"
          />
          <Search className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-msr-navy" />
        </div>
      </form>

      <div className="border-t border-white/10">
        <div className="msr-gutter flex h-12 items-center gap-2 overflow-x-auto no-scrollbar">
          <div
            className="relative shrink-0"
            onMouseEnter={() => setCats(true)}
            onMouseLeave={() => setCats(false)}
          >
            <Link
              to="/category/all"
              className="flex h-8 items-center gap-2 rounded-md border border-white/35 px-3 text-sm font-semibold hover:bg-white/10"
            >
              <Menu className="h-4 w-4" /> All Categories
            </Link>
            {cats ? (
              <div className="absolute left-0 top-full z-40 pt-1">
                <div className="grid w-72 gap-1 rounded-xl border border-msr-border bg-white p-2 text-msr-text shadow-xl">
                  <Link
                    to="/category/all"
                    onClick={() => setCats(false)}
                    className="rounded-lg px-3 py-2 text-sm font-semibold hover:bg-msr-bg"
                  >
                    All products
                  </Link>
                  {categories.map((c) => (
                    <Link
                      key={c.slug}
                      to={`/category/${c.slug}`}
                      onClick={() => setCats(false)}
                      className="rounded-lg px-3 py-2 text-sm hover:bg-msr-bg"
                    >
                      {c.emoji} {c.name}
                    </Link>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          {nav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                `flex h-full shrink-0 items-center whitespace-nowrap px-3.5 text-sm font-semibold ${
                  isActive ? "border-b-2 border-white text-white" : "text-white/75 hover:text-white"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </div>
      </div>

      {menu ? (
        <div className="border-t border-white/10 lg:hidden">
          <div className="msr-gutter py-3">
            <button type="button" className="mb-3 flex items-center gap-2 text-sm" onClick={() => setOpen(true)}>
              <MapPin className="h-4 w-4" />
              Deliver to {location.city}, {location.postalCode}
            </button>
            <div className="grid gap-2">
              <Link to="/category/all" onClick={() => setMenu(false)} className="font-medium">
                All Categories
              </Link>
              {nav.map((item) => (
                <Link key={item.to} to={item.to} onClick={() => setMenu(false)} className="font-medium">
                  {item.label}
                </Link>
              ))}
              <Link to="/wishlist" onClick={() => setMenu(false)} className="font-medium">
                Wishlist
              </Link>
              <Link to="/cart" onClick={() => setMenu(false)} className="font-medium">
                Cart
              </Link>
              {user ? (
                <button type="button" onClick={() => { setMenu(false); openAccount(); }} className="text-left font-medium">
                  Account
                </button>
              ) : (
                <>
                  <Link to="/login" onClick={() => setMenu(false)} className="font-medium">
                    Sign In
                  </Link>
                  <Link to="/register" onClick={() => setMenu(false)} className="font-medium">
                    Sign Up
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      ) : null}
    </header>
  );
}
