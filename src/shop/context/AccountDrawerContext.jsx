import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Bell, BellRing, Heart, HelpCircle, MapPin, MessageCircle, Package, ShieldCheck, Tag, UserRound, Wallet } from "lucide-react";

/**
 * Open state of the mobile menu sheet (components/MobileMenu.jsx). `openAccount()` is kept for older
 * callers; it opens the same sheet.
 */
const AccountDrawerContext = createContext(null);

export const ACCOUNT_TABS = [
  { id: "profile", label: "Overview", to: "/account", icon: UserRound },
  { id: "orders", label: "Orders", to: "/account/orders", icon: Package },
  { id: "addresses", label: "Addresses", to: "/account/addresses", icon: MapPin },
  { id: "credit", label: "Credit & ledger", to: "/account/credit", icon: Wallet },
  { id: "wishlist", label: "Wishlist", to: "/account/wishlist", icon: Heart },
  { id: "alerts", label: "Restock alerts", to: "/account/alerts", icon: BellRing },
  { id: "coupons", label: "Coupons", to: "/account/coupons", icon: Tag },
  { id: "notifications", label: "Notifications", to: "/account/notifications", icon: Bell },
  { id: "support", label: "Support", to: "/account/support", icon: MessageCircle },
  { id: "security", label: "Login & security", to: "/account/security", icon: ShieldCheck },
  { id: "help", label: "Help", to: "/account/help", icon: HelpCircle },
];

export function isAccountTabActive(pathname, to) {
  if (to === "/account") return pathname === "/account";
  return pathname === to || pathname.startsWith(`${to}/`);
}

export function AccountDrawerProvider({ children }) {
  const [open, setOpen] = useState(false);

  const openAccount = useCallback(() => setOpen(true), []);
  const closeAccount = useCallback(() => setOpen(false), []);

  const value = useMemo(
    () => ({ open, openAccount, closeAccount }),
    [open, openAccount, closeAccount]
  );

  return <AccountDrawerContext.Provider value={value}>{children}</AccountDrawerContext.Provider>;
}

export function useAccountDrawer() {
  const ctx = useContext(AccountDrawerContext);
  if (!ctx) throw new Error("useAccountDrawer must be used inside AccountDrawerProvider");
  return ctx;
}
