import { useEffect, useRef } from "react";
import { NavLink, Outlet, useLocation } from "react-router-dom";
import { BadgeCheck, LockKeyhole, LogIn } from "lucide-react";
import { ACCOUNT_TABS, isAccountTabActive } from "../context/AccountDrawerContext.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { Button } from "../components/ui/Button.jsx";
import { cn } from "../components/ui/cn.js";
import { useUnreadCount } from "../hooks/useNotifications.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { displayName, initialsOf } from "../lib/text.js";

/** Sidebar groups (by ACCOUNT_TABS id). Any tab not listed here lands in the last group. */
const GROUPS = [
  { label: "Orders & buying", ids: ["profile", "orders", "addresses"] },
  { label: "Money & credit", ids: ["credit", "coupons"] },
  { label: "Saved", ids: ["wishlist", "alerts"] },
  { label: "Settings & help", ids: ["notifications", "security", "support", "help"] },
];

function groupTabs(tabs) {
  const placed = new Set(GROUPS.flatMap((g) => g.ids));
  return GROUPS.map((g, i) => ({
    label: g.label,
    items: [...g.ids.map((id) => tabs.find((t) => t.id === id)).filter(Boolean), ...(i === GROUPS.length - 1 ? tabs.filter((t) => !placed.has(t.id)) : [])],
  })).filter((g) => g.items.length);
}

function SignInWall({ from }) {
  useDocumentTitle("Your account");
  return (
    <div className="msr-gutter flex min-h-[60vh] items-center justify-center py-12">
      <div className="w-full max-w-md overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card text-center shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
        <div className="bg-shop-navy px-6 py-8 text-white">
          <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10 text-white">
            <LockKeyhole className="size-6" strokeWidth={1.75} aria-hidden />
          </span>
          <h1 className="mt-4 font-display text-shop-xl font-bold">Sign in to your account</h1>
          <p className="mt-2 text-shop-base text-shop-on-navy-muted">Orders, invoices, credit terms, addresses and saved items for your business.</p>
        </div>
        <div className="px-6 py-6 sm:px-8">
          <Button to="/login" state={{ from }} size="lg" block leftIcon={LogIn}>
            Sign in
          </Button>
          <Button to="/register" state={{ from }} variant="link" className="mt-4">
            New here? Create a business account
          </Button>
        </div>
      </div>
    </div>
  );
}

function UnreadBadge({ count, className }) {
  if (!count) return null;
  return (
    <span className={cn("ml-auto inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-shop-saffron px-1.5 text-[0.6875rem] font-bold tabular-nums text-white", className)}>
      {count > 99 ? "99+" : count}
      <span className="sr-only"> unread</span>
    </span>
  );
}

function IdentityCard({ user }) {
  const company = user?.profile?.company ? displayName(user.profile.company) : "";
  const name = user?.name ? displayName(user.name) : "";
  const title = company || name || "Guest";
  return (
    <div className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
      <div className="flex items-center gap-3 bg-shop-navy p-4 text-white">
        <span aria-hidden className="grid size-11 shrink-0 place-items-center rounded-full bg-shop-gold font-display text-shop-base font-bold text-shop-ink">
          {user ? initialsOf(title) : "G"}
        </span>
        <span className="min-w-0">
          <span className="block truncate font-display text-shop-base font-bold">{title}</span>
          <span className="block truncate text-shop-xs text-shop-on-navy-muted">{user ? (company && name ? name : user.email) : "Browsing as a guest"}</span>
        </span>
      </div>
      {user ? (
        <div className="flex flex-wrap items-center gap-1.5 px-4 py-2.5 text-shop-xs">
          {user.emailVerified ? (
            <span className="inline-flex items-center gap-1 rounded-full bg-shop-primary-soft px-2 py-0.5 font-semibold text-shop-primary-ink">
              <BadgeCheck className="size-3.5" aria-hidden /> Verified
            </span>
          ) : (
            <span className="rounded-full bg-shop-warning-soft px-2 py-0.5 font-semibold text-shop-warning-ink">Email not verified</span>
          )}
          {user.profile?.gstin ? <span className="rounded-full bg-shop-gold-soft px-2 py-0.5 font-semibold text-shop-gold-ink">GST registered</span> : null}
        </div>
      ) : (
        <div className="px-4 py-3">
          <Button to="/login" size="sm" block leftIcon={LogIn}>
            Sign in
          </Button>
        </div>
      )}
    </div>
  );
}

/**
 * Account shell. lg+: sticky sidebar with an identity card and grouped nav (unread count on
 * Notifications). Phones/tablets: one horizontally scrolling pill row that keeps the current page
 * in view. Wishlist and help work for guests; everything else asks to sign in.
 */
export default function AccountLayout() {
  const { user, status } = useAuth();
  const { pathname } = useLocation();
  const { unread } = useUnreadCount();
  const pillRow = useRef(null);
  const guestOk = pathname.startsWith("/account/wishlist") || pathname.startsWith("/account/help");

  // Keep the active pill visible (without scrolling the page vertically).
  useEffect(() => {
    const row = pillRow.current;
    const active = row?.querySelector('[aria-current="page"]');
    if (!row || !active) return;
    const left = active.offsetLeft - row.clientWidth / 2 + active.clientWidth / 2;
    row.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [pathname]);

  if (status !== "loading" && !user && !guestOk) return <SignInWall from={pathname || "/account"} />;

  const tabs = ACCOUNT_TABS.filter((t) => user || t.id === "wishlist" || t.id === "help");
  const groups = groupTabs(tabs);

  return (
    <div className="msr-gutter py-5 md:py-8">
      <div className="grid gap-5 lg:grid-cols-[256px_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* Phones / tablets: compact pill row */}
        <nav aria-label="Account" className="relative -mx-4 min-w-0 sm:mx-0 lg:hidden">
          <div ref={pillRow} className="no-scrollbar flex gap-2 overflow-x-auto px-4 pb-1 sm:px-0">
            {tabs.map((item) => {
              const Icon = item.icon;
              const active = isAccountTabActive(pathname, item.to);
              return (
                <NavLink
                  key={item.id}
                  to={item.to}
                  end={item.to === "/account"}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full border px-3.5 text-shop-sm font-semibold transition-colors",
                    active ? "border-shop-navy bg-shop-navy text-white" : "border-shop-line bg-shop-card text-shop-text hover:border-shop-line-strong hover:text-shop-ink"
                  )}
                >
                  <Icon className="size-4 shrink-0" strokeWidth={1.9} aria-hidden />
                  {item.label}
                  {item.id === "notifications" ? <UnreadBadge count={unread} className="ml-0" /> : null}
                </NavLink>
              );
            })}
          </div>
          <div aria-hidden className="pointer-events-none absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-shop-page to-transparent sm:hidden" />
        </nav>

        {/* Desktop: sticky sidebar */}
        <aside className="hidden min-w-0 lg:sticky lg:top-36 lg:grid lg:gap-4">
          <IdentityCard user={user} />
          <nav aria-label="Account sections" className="rounded-[1.25rem] border border-shop-line bg-shop-card p-2">
            {groups.map((g, gi) => (
              <div key={g.label} className={cn(gi > 0 && "mt-1 border-t border-shop-line pt-1")}>
                <p className="px-3 pb-1 pt-2.5 text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-shop-subtle">{g.label}</p>
                <ul className="grid gap-0.5">
                  {g.items.map((item) => {
                    const Icon = item.icon;
                    const active = isAccountTabActive(pathname, item.to);
                    return (
                      <li key={item.id}>
                        <NavLink
                          to={item.to}
                          end={item.to === "/account"}
                          aria-current={active ? "page" : undefined}
                          className={cn(
                            "relative flex min-h-10 items-center gap-2.5 rounded-xl px-3 text-shop-sm font-semibold transition-colors",
                            active ? "bg-shop-primary-soft text-shop-primary-ink" : "text-shop-text hover:bg-shop-hover hover:text-shop-ink"
                          )}
                        >
                          {active ? <span aria-hidden className="absolute inset-y-2 left-0 w-1 rounded-full bg-shop-primary" /> : null}
                          <Icon className={cn("size-4 shrink-0", active ? "text-shop-primary-ink" : "text-shop-muted")} strokeWidth={1.9} aria-hidden />
                          <span className="truncate">{item.label}</span>
                          {item.id === "notifications" ? <UnreadBadge count={unread} /> : null}
                        </NavLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
          </nav>
        </aside>

        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
