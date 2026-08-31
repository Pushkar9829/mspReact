import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Heart, HelpCircle, MapPin, Package, Tag, UserRound } from "lucide-react";

const AccountDrawerContext = createContext(null);

export const ACCOUNT_TABS = [
  { id: "profile", label: "Profile", to: "/account", icon: UserRound },
  { id: "orders", label: "Orders", to: "/orders", icon: Package },
  { id: "addresses", label: "Addresses", to: "/account/addresses", icon: MapPin },
  { id: "wishlist", label: "Wishlist", to: "/wishlist", icon: Heart },
  { id: "coupons", label: "Coupons", to: "/account/coupons", icon: Tag },
  { id: "help", label: "Help", to: "/help", icon: HelpCircle },
];

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
