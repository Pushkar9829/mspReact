import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { DropdownMenu as RMenu } from "radix-ui";
import {
  BadgeCheck,
  Bell,
  ChevronDown,
  CreditCard,
  FileText,
  Heart,
  LifeBuoy,
  LogOut,
  MapPin,
  Menu,
  Package,
  RotateCcw,
  ShoppingBag,
  Store,
  Truck,
  UserRound,
} from "lucide-react";
import { Logo } from "../../shared/components/ui.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { IconButton } from "./ui/Button.jsx";
import { cn } from "./ui/cn.js";
import { PincodeCheck } from "./ui/PincodeCheck.jsx";
import { SearchCombobox } from "./ui/SearchCombobox.jsx";
import ShopNotificationBell from "./ShopNotificationBell.jsx";
import CategoryBar from "./CategoryBar.jsx";
import { useCartQuery } from "../hooks/useCart.js";
import { useViewer } from "../hooks/useViewer.js";
import { usePublicSettings } from "../hooks/useCatalog.js";
import { useAccountDrawer } from "../context/AccountDrawerContext.jsx";
import { openMiniCart } from "../lib/events.js";
import { formatListing } from "../lib/money.js";
import { homeFor } from "../../shared/auth.js";

/** True once the page has scrolled past the utility strip; the header condenses. */
function useScrolled(threshold = 24) {
  const [scrolled, setScrolled] = useState(() => typeof window !== "undefined" && window.scrollY > threshold);
  useEffect(() => {
    // setState with an unchanged boolean is a no-op render, so no throttling is needed.
    const onScroll = () => setScrolled(window.scrollY > threshold);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [threshold]);
  return scrolled;
}

function initials(name) {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "M";
}

/** Thin top strip (lg+): the three promises that matter to a business buyer, plus quick links. */
function UtilityStrip({ hidden }) {
  const promises = [
    { icon: FileText, text: "GST invoice on every order" },
    { icon: BadgeCheck, text: "Verified wholesale sellers" },
    { icon: CreditCard, text: "Credit terms for approved businesses" },
  ];
  const links = [
    { to: "/account/orders", icon: Truck, label: "Track order" },
    { to: "/help", icon: LifeBuoy, label: "Help" },
    { to: "/stores", icon: Store, label: "Sellers" },
  ];
  return (
    <div
      aria-hidden={hidden || undefined}
      className={cn(
        "hidden overflow-hidden bg-black/25 transition-[max-height,opacity] duration-300 ease-out lg:block",
        hidden ? "max-h-0 opacity-0" : "max-h-9 border-b border-white/[0.07] opacity-100"
      )}
    >
      <div className="msr-gutter flex h-9 items-center justify-between gap-6 text-shop-xs text-shop-on-navy-muted">
        <ul className="flex min-w-0 items-center gap-5">
          {promises.map((p) => (
            <li key={p.text} className="flex items-center gap-1.5 whitespace-nowrap">
              <p.icon className="size-3.5 text-shop-gold" strokeWidth={2} aria-hidden />
              {p.text}
            </li>
          ))}
        </ul>
        <nav aria-label="Quick links" className="flex shrink-0 items-center gap-1">
          {links.map((l) => (
            <Link
              key={l.to}
              to={l.to}
              tabIndex={hidden ? -1 : undefined}
              className="inline-flex h-9 items-center gap-1.5 rounded-control px-2 transition-colors hover:text-white"
            >
              <l.icon className="size-3.5" strokeWidth={2} aria-hidden />
              {l.label}
            </Link>
          ))}
        </nav>
      </div>
    </div>
  );
}

const menuItem =
  "flex min-h-11 cursor-pointer select-none items-center gap-3 rounded-control px-3 text-shop-sm text-shop-text outline-none transition-colors data-[highlighted]:bg-shop-hover [&_svg]:size-4 [&_svg]:text-shop-muted";

function AccountMenu() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const first = String(user?.name || "").split(" ")[0] || "there";
  const business = user?.profile?.company || user?.company;
  const groups = [
    [
      { to: "/account/orders", icon: Package, label: "Orders" },
      { to: "/account/orders?view=buy-again", icon: RotateCcw, label: "Buy again" },
      { to: "/account/wishlist", icon: Heart, label: "Wishlist" },
    ],
    [
      { to: "/account/credit", icon: CreditCard, label: "Credit & payments" },
      { to: "/account/addresses", icon: MapPin, label: "Addresses" },
      { to: "/account/notifications", icon: Bell, label: "Notifications" },
      { to: "/account", icon: UserRound, label: "Account overview" },
    ],
  ];
  return (
    <RMenu.Root modal={false}>
      <RMenu.Trigger asChild>
        <button
          type="button"
          className="group hidden min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-2.5 text-white transition-colors hover:bg-white/10 data-[state=open]:bg-white/10 md:flex"
          aria-label={`Account menu for ${user?.name}`}
        >
          <span aria-hidden className="grid size-9 place-items-center rounded-full bg-gradient-to-br from-shop-gold to-[#f3d27e] font-display text-shop-sm font-bold text-shop-navy ring-2 ring-white/15">
            {initials(user?.name)}
          </span>
          <span className="hidden text-left leading-tight xl:grid">
            <span className="text-shop-xs text-shop-on-navy-muted">Hello, {first}</span>
            <span className="text-shop-sm font-semibold">Account & orders</span>
          </span>
          <ChevronDown className="size-4 text-shop-on-navy-muted transition-transform group-data-[state=open]:rotate-180" aria-hidden />
        </button>
      </RMenu.Trigger>
      <RMenu.Portal>
        <RMenu.Content
          align="end"
          sideOffset={10}
          className="z-50 w-72 overflow-hidden rounded-card border border-shop-line bg-shop-card text-shop-text shadow-shop-pop data-[state=open]:animate-scale-in"
        >
          <div className="flex items-center gap-3 bg-shop-navy px-4 py-3.5 text-white">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-gradient-to-br from-shop-gold to-[#f3d27e] font-display text-shop-base font-bold text-shop-navy">
              {initials(user?.name)}
            </span>
            <div className="min-w-0">
              <p className="truncate text-shop-sm font-semibold">{user?.name}</p>
              <p className="truncate text-shop-xs text-shop-on-navy-muted">{business || user?.email}</p>
            </div>
          </div>
          <div className="p-1.5">
            {groups.map((g, gi) => (
              <div key={gi}>
                {gi ? <RMenu.Separator className="mx-2 my-1 h-px bg-shop-line" /> : null}
                {g.map((l) => (
                  <RMenu.Item key={l.label} className={menuItem} onSelect={() => navigate(l.to)}>
                    <l.icon aria-hidden /> {l.label}
                  </RMenu.Item>
                ))}
              </div>
            ))}
            {user?.role && homeFor(user.role) !== "/" ? (
              <>
                <RMenu.Separator className="mx-2 my-1 h-px bg-shop-line" />
                <RMenu.Item className={menuItem} onSelect={() => navigate(homeFor(user.role))}>
                  <Store aria-hidden /> Open your dashboard
                </RMenu.Item>
              </>
            ) : null}
            <RMenu.Separator className="mx-2 my-1 h-px bg-shop-line" />
            <RMenu.Item className={cn(menuItem, "text-shop-danger-ink [&_svg]:text-shop-danger-ink")} onSelect={() => logout().then(() => navigate("/"))}>
              <LogOut aria-hidden /> Sign out
            </RMenu.Item>
          </div>
        </RMenu.Content>
      </RMenu.Portal>
    </RMenu.Root>
  );
}

function SignInLinks() {
  return (
    <Link to="/login" className="group hidden min-h-11 items-center gap-2.5 rounded-full py-1 pl-1 pr-3 text-white transition-colors hover:bg-white/10 md:flex">
      <span aria-hidden className="grid size-9 place-items-center rounded-full border border-white/20 bg-white/5">
        <UserRound className="size-[18px]" strokeWidth={1.75} />
      </span>
      <span className="hidden text-left leading-tight xl:grid">
        <span className="text-shop-xs text-shop-on-navy-muted">Sign in for</span>
        <span className="text-shop-sm font-semibold">Business prices</span>
      </span>
    </Link>
  );
}

function CartButton() {
  const { cart } = useCartQuery();
  const n = cart.count;
  const subtotal = cart.totals?.subtotal;
  return (
    <button
      type="button"
      onClick={() => openMiniCart()}
      className={cn(
        "relative flex min-h-11 items-center gap-2.5 rounded-full text-white transition-colors",
        "md:border md:border-white/15 md:bg-white/[0.06] md:p-1 md:hover:border-white/30 md:hover:bg-white/10 lg:pr-4",
        "px-2 hover:bg-white/10 md:px-0"
      )}
      aria-label={n ? `Cart, ${n} item${n === 1 ? "" : "s"}` : "Cart, empty"}
    >
      <span className="relative grid size-9 place-items-center rounded-full md:bg-shop-primary">
        <ShoppingBag className="size-5" strokeWidth={1.75} aria-hidden />
        {n ? (
          <span
            aria-hidden
            className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-shop-gold px-1 text-shop-xs font-bold leading-none text-shop-navy tabular-nums ring-2 ring-shop-navy"
          >
            {n > 99 ? "99+" : n}
          </span>
        ) : null}
      </span>
      <span className="hidden text-left leading-tight lg:grid">
        <span className="text-shop-xs text-shop-on-navy-muted">{n ? `${n} item${n === 1 ? "" : "s"}` : "Your cart"}</span>
        <span className="text-shop-sm font-semibold tabular-nums">{n && subtotal != null ? formatListing(subtotal) : "Empty"}</span>
      </span>
    </button>
  );
}

/**
 * Storefront header.
 *  - lg+: a thin utility strip (trust promises + quick links) that folds away on scroll.
 *  - Main navy bar: brand, delivery PIN, a wide search with its own action button, notifications,
 *    account menu and a cart pill with count and subtotal. It tightens and gains a shadow on scroll.
 *  - Category bar with the mega-menu below (md+). Phones get a search row and the menu sheet.
 */
export default function Header() {
  const { signedIn } = useViewer();
  const settings = usePublicSettings();
  const { openAccount } = useAccountDrawer();
  const scrolled = useScrolled();

  return (
    <header className={cn("sticky top-0 z-40 transition-shadow duration-300", scrolled && "shadow-[0_8px_24px_-12px_rgba(11,16,51,0.35)]")}>
      <div className="shop-on-navy relative bg-shop-navy text-white">
        {/* soft brand glow: navy → navy-2, with a hint of gold at the top edge */}
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_140%_at_0%_0%,rgba(233,185,73,0.10),transparent_45%),linear-gradient(180deg,transparent,rgba(22,29,77,0.55))]" />
        <div className="relative">
          <UtilityStrip hidden={scrolled} />
          <div className={cn("msr-gutter flex items-center gap-2 transition-[height] duration-300 ease-out lg:gap-5", scrolled ? "h-14 md:h-16" : "h-14 md:h-[4.5rem]")}>
            <IconButton icon={Menu} variant="on-navy" label="Open menu" onClick={openAccount} className="-ml-2 md:hidden" />
            <Link to="/" className="inline-flex min-h-11 shrink-0 items-center rounded-control pr-1" aria-label="MS₹ home">
              <Logo light compact slogan={settings.data?.slogan} />
            </Link>
            <span aria-hidden className="hidden h-8 w-px bg-white/12 sm:block" />
            <PincodeCheck className="hidden sm:flex" />
            <SearchCombobox variant="header" className="mx-auto hidden w-full max-w-3xl flex-1 md:block" />
            <div className="ml-auto flex shrink-0 items-center gap-1 md:ml-0 lg:gap-2">
              <PincodeCheck className="sm:hidden" />
              <ShopNotificationBell />
              {signedIn ? <AccountMenu /> : <SignInLinks />}
              <CartButton />
            </div>
          </div>
          <div className="msr-gutter pb-3 md:hidden">
            <SearchCombobox variant="header" />
          </div>
        </div>
      </div>
      <CategoryBar scrolled={scrolled} />
    </header>
  );
}
