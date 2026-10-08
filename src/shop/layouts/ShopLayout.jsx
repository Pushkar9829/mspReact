import { Suspense, useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import Header from "../components/Header.jsx";
import Footer from "../components/Footer.jsx";
import MobileNav, { useBottomNavVisible } from "../components/MobileNav.jsx";
import MobileMenu from "../components/MobileMenu.jsx";
import { MiniCart } from "../components/ui/MiniCart.jsx";
import { RouteSkeleton } from "../components/ui/Skeletons.jsx";
import { AccountDrawerProvider } from "../context/AccountDrawerContext.jsx";
import { PincodeProvider } from "../context/PincodeContext.jsx";
import { usePublicSettings } from "../hooks/useCatalog.js";
import { useShopTheme } from "../hooks/useShopTheme.js";
import { useViewer } from "../hooks/useViewer.js";
import { mergeGuestWishlist } from "../hooks/useWishlist.js";
import { shopKeys } from "../hooks/keys.js";
import { installShopSessionHooks } from "../lib/session.js";

function FestivalBanner() {
  const { data } = usePublicSettings();
  const wish = data?.festival;
  const [dismissed, setDismissed] = useState(false);
  if (!wish?.message || dismissed) return null;
  return (
    <div className="bg-shop-gold-soft text-shop-gold-ink">
      <div className="msr-gutter flex min-h-10 items-center justify-center gap-2 py-1.5 text-center text-shop-sm">
        <p>
          <span className="font-semibold">{wish.title || "Festival wishes"}</span> <span>{wish.message}</span>
        </p>
        <button type="button" onClick={() => setDismissed(true)} className="grid size-11 shrink-0 place-items-center rounded-full hover:bg-white/60" aria-label="Dismiss announcement">
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

/** Sign-in from anywhere (register, other tab): merge this device's guest wishlist into the account. */
function useSessionSync() {
  const { viewer, signedIn } = useViewer();
  const qc = useQueryClient();
  useEffect(() => installShopSessionHooks(), []);
  useEffect(() => {
    // No-op when this device has no guest wishlist.
    if (signedIn) mergeGuestWishlist().then(({ merged }) => merged && qc.invalidateQueries({ queryKey: shopKeys.wishlist(viewer) }));
  }, [viewer, signedIn, qc]);
}

/**
 * Storefront shell: shop theme (html.shop), header + mega-menu, page (lazy routes get a real
 * skeleton), footer, mini-cart drawer, mobile menu sheet and bottom nav (hidden on /cart, /checkout;
 * the page is padded so content never sits under it).
 */
export default function ShopLayout() {
  useShopTheme();
  useSessionSync();
  const bottomNav = useBottomNavVisible();
  return (
    <AccountDrawerProvider>
      <PincodeProvider>
        <div className={`flex min-h-dvh flex-col bg-shop-page ${bottomNav ? "shop-bottom-safe" : ""}`}>
          <a href="#main" className="sr-only z-50 rounded-control bg-shop-card px-4 py-2 focus:not-sr-only focus:fixed focus:left-2 focus:top-2">
            Skip to content
          </a>
          <FestivalBanner />
          <Header />
          <main id="main" tabIndex={-1} className="flex-1 outline-none">
            <Suspense fallback={<RouteSkeleton />}>
              <Outlet />
            </Suspense>
          </main>
          <Footer />
          <MobileNav />
          <MobileMenu />
          <MiniCart />
        </div>
      </PincodeProvider>
    </AccountDrawerProvider>
  );
}
