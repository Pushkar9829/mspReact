/**
 * Storefront 404. Meant to render inside ShopLayout for unknown storefront paths (see the wiring note
 * in the redesign report). Static, no data: the requested path plus clear ways back into the shop.
 */
import { Link, useLocation } from "react-router-dom";
import { ArrowRight, Boxes, Home, LayoutGrid, LifeBuoy, Percent, Search, Store } from "lucide-react";
import { Button } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";

const LINKS = [
  { to: "/category/all", label: "All products", text: "Browse every category", icon: LayoutGrid },
  { to: "/deals", label: "Deals", text: "Today’s offers from sellers", icon: Percent },
  { to: "/bulk", label: "Bulk buying", text: "Slab prices and credit terms", icon: Boxes },
  { to: "/stores", label: "Sellers", text: "Shop by verified seller", icon: Store },
];

export default function NotFound() {
  useDocumentTitle("Page not found");
  const { pathname } = useLocation();
  return (
    <div className="msr-gutter py-8 md:py-14">
      <div className="mx-auto grid max-w-3xl gap-8">
        <div className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card text-center shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
          <div className="shop-on-navy relative bg-shop-navy px-6 py-10 text-white">
            <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 70% at 50% 0%, rgba(212,160,23,0.18), transparent 70%)" }} />
            <p className="relative font-display text-[4.5rem] font-extrabold leading-none tracking-tight text-shop-gold sm:text-[6rem]">404</p>
            <h1 className="relative mt-3 font-display text-shop-xl font-bold sm:text-shop-2xl">We couldn’t find that page</h1>
            <p className="relative mx-auto mt-2 max-w-md text-shop-base text-shop-on-navy-muted">
              The link may be old or mistyped
              {pathname && pathname !== "/" ? (
                <>
                  : <span className="break-all font-mono text-shop-sm text-white/90">{pathname}</span>
                </>
              ) : null}
              .
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-2 px-6 py-5">
            <Button to="/" leftIcon={Home}>
              Go to the shop
            </Button>
            <Button to="/category/all" variant="secondary" leftIcon={Search}>
              Search products
            </Button>
            <Button to="/help" variant="ghost" leftIcon={LifeBuoy}>
              Help centre
            </Button>
          </div>
        </div>

        <nav aria-label="Popular places">
          <p className="mb-3 text-shop-sm font-semibold text-shop-ink">Popular places</p>
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {LINKS.map(({ to, label, text, icon: Icon }) => (
              <li key={to}>
                <Link to={to} className="group flex min-h-16 items-center gap-3 rounded-[1.25rem] border border-shop-line bg-shop-card p-4 transition-[box-shadow,border-color] hover:border-shop-line-strong hover:shadow-[0_18px_40px_-22px_rgba(11,16,51,0.45)]">
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
                    <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-shop-ink group-hover:text-shop-primary-ink">{label}</span>
                    <span className="block text-shop-xs text-shop-muted">{text}</span>
                  </span>
                  <ArrowRight className="size-4 shrink-0 text-shop-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </div>
  );
}
