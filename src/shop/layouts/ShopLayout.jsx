import { useState } from "react";
import { Outlet } from "react-router-dom";
import { X } from "lucide-react";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import MobileNav from "../components/MobileNav.jsx";
import AccountDrawer from "../components/AccountDrawer.jsx";
import { AccountDrawerProvider } from "../context/AccountDrawerContext.jsx";
import { ShopCatalogProvider } from "../context/ShopCatalogContext.jsx";
import { CartProvider } from "../context/CartContext.jsx";
import { LocationProvider } from "../context/LocationContext.jsx";

function FestivalBanner() {
  const { branding } = useShopCatalog();
  const wish = branding?.festival;
  const [dismissed, setDismissed] = useState(false);
  if (!wish?.message || dismissed) return null;
  return (
    <div className="bg-msr-primary px-4 py-2 text-center text-[13px] text-white">
      <div className="msr-gutter relative flex items-center justify-center gap-2">
        <span>
          <span className="font-bold">{wish.title || "Festival wishes"}</span>
          <span className="ml-2 text-white/85">{wish.message}</span>
        </span>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="absolute right-0 grid h-7 w-7 place-items-center rounded-full hover:bg-white/15"
          aria-label="Dismiss announcement"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}

export default function ShopLayout() {
  return (
    <ShopCatalogProvider>
      <CartProvider>
        <LocationProvider>
          <AccountDrawerProvider>
            <div className="min-h-screen bg-msr-bg pb-16 md:pb-0">
              <FestivalBanner />
              <Header />
              <main>
                <Outlet />
              </main>
              <Footer />
              <MobileNav />
              <AccountDrawer />
            </div>
          </AccountDrawerProvider>
        </LocationProvider>
      </CartProvider>
    </ShopCatalogProvider>
  );
}
