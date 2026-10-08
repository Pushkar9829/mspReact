import { Suspense } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { ArrowLeft, BadgeCheck, Layers, ReceiptText, Wallet } from "lucide-react";
import { Logo } from "../../shared/components/ui.jsx";
import { useAuth } from "../../shared/context/AuthContext.jsx";
import { homeFor } from "../../shared/auth.js";
import { useShopTheme } from "../hooks/useShopTheme.js";
import { PageSkeleton } from "../components/ui/Skeletons.jsx";

/** Static, truthful product facts (no numbers): what a business account gets on MS₹. */
const VALUE_PROPS = [
  { icon: ReceiptText, title: "GST invoices on every order", text: "Add your GSTIN once and it goes on each seller’s invoice, ready for input tax credit." },
  { icon: Layers, title: "Bulk slab pricing", text: "Bulk-eligible products get cheaper per pack as your quantity crosses each slab." },
  { icon: Wallet, title: "Credit terms & purchase orders", text: "Approved businesses can order on credit or with a PO, alongside UPI, cards and net banking." },
  { icon: BadgeCheck, title: "Verified sellers", text: "Every product is sold, shipped and invoiced by the seller named on it." },
];

/** Headline for the brand panel, by page. */
function panelCopy(pathname) {
  if (pathname.startsWith("/register")) return { kicker: "Business account", title: "Buy wholesale for your shop, the simple way" };
  if (/^\/(forgot|reset)-password/.test(pathname)) return { kicker: "Account recovery", title: "Back to your orders in a minute" };
  return { kicker: "Welcome back", title: "Wholesale prices, GST invoices and credit in one account" };
}

/**
 * Shop-styled frame for account pages outside the main shell (sign-in, register, forgot/reset
 * password). Desktop: a navy brand panel with what a business account gets on the left, the form on
 * the right. Phones: a compact navy brand bar, then just the form.
 * `guestOnly` redirects signed-in users to where they came from (or their home).
 */
export default function ShopAuthLayout({ guestOnly = false, children }) {
  useShopTheme();
  const { user, status } = useAuth();
  const location = useLocation();
  const from = location.state?.from;
  const fromPath = typeof from === "string" ? from : from?.pathname || "";
  // "Back": where the buyer came from. /checkout needs a sign-in, so it goes back to the cart; the
  // auth pages themselves are skipped.
  const toCart = /^\/(cart|checkout)(?:[/?#]|$)/.test(fromPath);
  const backTo = toCart ? "/cart" : fromPath && !/^\/(login|register|forgot-password|reset-password)(?:[/?#]|$)/.test(fromPath) ? from : "/";
  if (guestOnly && status !== "loading" && user?.token) {
    return <Navigate to={from && !String(from).startsWith("/login") ? from : homeFor(user.role)} replace />;
  }
  const backLabel = toCart ? "Back to cart" : "Back to shop";
  const copy = panelCopy(location.pathname);

  return (
    <div className="grid min-h-dvh bg-shop-page lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      {/* Desktop brand panel */}
      <aside className="shop-on-navy relative hidden overflow-hidden bg-shop-navy text-white lg:block">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(60% 45% at 100% 0%, rgba(212,160,23,0.18), transparent 70%), radial-gradient(55% 40% at 0% 100%, rgba(22,163,74,0.16), transparent 70%)" }}
        />
        <div className="relative flex h-dvh flex-col justify-between gap-10 p-10 xl:p-14 lg:sticky lg:top-0">
          <Link to="/" aria-label="MS₹ home" className="inline-flex min-h-11 w-fit items-center rounded-control">
            <Logo light />
          </Link>
          <div className="max-w-md">
            <p className="text-shop-xs font-semibold uppercase tracking-[0.16em] text-shop-gold">{copy.kicker}</p>
            <h2 className="mt-3 font-display text-shop-3xl font-bold leading-tight tracking-tight text-white">{copy.title}</h2>
            <ul className="mt-8 grid gap-5">
              {VALUE_PROPS.map(({ icon: Icon, title, text }) => (
                <li key={title} className="flex gap-3.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white/10 text-shop-gold ring-1 ring-white/15">
                    <Icon className="size-5" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-white">{title}</span>
                    <span className="mt-0.5 block text-shop-sm leading-relaxed text-shop-on-navy-muted">{text}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <nav aria-label="Help and policies" className="flex flex-wrap gap-x-5 gap-y-1 text-shop-sm text-shop-on-navy-muted">
            <Link to="/help" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
              Help centre
            </Link>
            <Link to="/pages/terms" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
              Terms
            </Link>
            <Link to="/pages/privacy" className="inline-flex min-h-11 items-center hover:text-white hover:underline">
              Privacy
            </Link>
          </nav>
        </div>
      </aside>

      <div className="flex min-w-0 flex-col">
        {/* Phone / tablet brand bar */}
        <header className="shop-on-navy bg-shop-navy text-white lg:hidden">
          <div className="msr-gutter flex h-14 items-center justify-between gap-3">
            <Link to="/" aria-label="MS₹ home" className="inline-flex min-h-11 items-center rounded-control">
              <Logo light compact />
            </Link>
            <Link to={backTo} className="inline-flex min-h-11 items-center gap-1.5 rounded-control px-2 text-shop-sm font-semibold hover:bg-white/10">
              <ArrowLeft className="size-4" aria-hidden />
              {backLabel}
            </Link>
          </div>
          <p className="msr-gutter truncate border-t border-white/10 py-2 text-shop-xs text-shop-on-navy-muted">GST invoices · Bulk slab prices · Credit terms · Verified sellers</p>
        </header>

        {/* Desktop back link */}
        <div className="hidden justify-end px-10 pt-6 lg:flex">
          <Link to={backTo} className="inline-flex min-h-11 items-center gap-1.5 rounded-full px-3 text-shop-sm font-semibold text-shop-text hover:bg-shop-hover hover:text-shop-ink">
            <ArrowLeft className="size-4" aria-hidden />
            {backLabel}
          </Link>
        </div>

        <main className="flex flex-1 items-start justify-center px-4 py-6 sm:py-10 lg:items-center lg:px-10 lg:pb-16 lg:pt-4">
          <div className="w-full max-w-xl">
            <Suspense fallback={<PageSkeleton rows={2} />}>{children || <Outlet />}</Suspense>
          </div>
        </main>
      </div>
    </div>
  );
}
