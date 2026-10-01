import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Heart, MapPin, ShoppingCart, UserRound } from "lucide-react";
import { Logo } from "../../shared/components/ui.jsx";
import { buttonClass } from "./shopUi.jsx";
import { useCart } from "../context/CartContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import { useDeliveryLocation } from "../context/LocationContext.jsx";
import { useAccountDrawer } from "../context/AccountDrawerContext.jsx";
import SearchBar from "./SearchBar.jsx";
import CategoryBar from "./CategoryBar.jsx";

export default function Header() {
  const { count } = useCart();
  const { user } = useAuth();
  const { branding } = useShopCatalog();
  const { location, setLocation, open, setOpen, locations } = useDeliveryLocation();
  const { openAccount } = useAccountDrawer();
  const locRef = useRef(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    function onScroll() {
      setScrolled(window.scrollY > 8);
    }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return undefined;
    function onPointerDown(e) {
      if (locRef.current && !locRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open, setOpen]);

  return (
    <header className={`sticky top-0 z-40 transition-shadow ${scrolled ? "shadow-[0_6px_20px_rgba(11,16,51,0.12)]" : ""}`}>
      <div className="relative z-10 bg-msr-ink text-white">
        <div className="msr-gutter flex h-16 items-center gap-3 lg:gap-5">
          <Link to="/" className="shrink-0" aria-label="MS₹ home">
            <Logo light compact slogan={branding?.slogan} />
          </Link>

          <div className="relative shrink-0" ref={locRef}>
            <button
              type="button"
              onClick={() => setOpen(!open)}
              className="flex max-w-38 items-center gap-1.5 rounded-xl px-1.5 py-1 text-left hover:bg-white/10 sm:max-w-48"
              aria-expanded={open}
              aria-haspopup="listbox"
            >
              <MapPin className="h-4 w-4 shrink-0 text-msr-gold" />
              <span className="min-w-0 hidden sm:block">
                <span className="block text-[10px] font-medium leading-none text-white/60">Deliver to</span>
                <span className="mt-0.5 block truncate text-[13px] font-semibold leading-tight">{location.city}</span>
              </span>
              <ChevronDown className="hidden h-3.5 w-3.5 text-white/60 sm:block" />
            </button>
            {open ? (
              <div
                className="absolute left-0 top-full z-50 mt-2 w-56 overflow-hidden rounded-2xl border border-msr-line bg-white py-1 text-msr-ink shadow-pop"
                role="listbox"
              >
                {locations.map((loc) => (
                  <button
                    key={loc.postalCode}
                    type="button"
                    role="option"
                    aria-selected={loc.postalCode === location.postalCode}
                    className={`block w-full px-4 py-2.5 text-left text-sm hover:bg-msr-bg ${
                      loc.postalCode === location.postalCode ? "font-semibold text-msr-primary" : ""
                    }`}
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
          </div>

          <SearchBar />

          <div className="flex shrink-0 items-center gap-0.5 sm:gap-1">
            <Link
              to="/account/wishlist"
              className="hidden h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10 md:grid"
              aria-label="Wishlist"
            >
              <Heart className="h-5 w-5" strokeWidth={1.7} />
            </Link>
            <Link
              to="/cart"
              className="relative grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10"
              aria-label={count ? `Cart, ${count} items` : "Cart"}
            >
              <ShoppingCart className="h-5 w-5" strokeWidth={1.7} />
              {count ? (
                <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-msr-primary px-1 text-[9px] font-bold leading-none text-white">
                  {count}
                </span>
              ) : null}
            </Link>
            {user ? (
              <button
                type="button"
                onClick={() => openAccount()}
                className="flex h-10 items-center gap-2 rounded-full px-2 text-white hover:bg-white/10 sm:px-3"
                aria-label="Account"
              >
                <UserRound className="h-5 w-5" strokeWidth={1.7} />
                <span className="hidden text-sm font-semibold sm:inline">{user.name.split(" ")[0]}</span>
              </button>
            ) : (
              <>
                <Link
                  to="/login"
                  className="grid h-10 w-10 place-items-center rounded-full text-white hover:bg-white/10 sm:hidden"
                  aria-label="Sign in"
                >
                  <UserRound className="h-5 w-5" strokeWidth={1.7} />
                </Link>
                <Link to="/login" className={`${buttonClass({ size: "md", className: "ml-1 hidden sm:inline-flex" })}`}>
                  Sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <CategoryBar />
    </header>
  );
}
