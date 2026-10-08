import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import { ArrowRight, BadgeCheck, Boxes, ChevronDown, ChevronRight, Flame, LayoutGrid, PackageSearch, Sparkles, X } from "lucide-react";
import { cn } from "./ui/cn.js";
import { ImageWithFallback } from "./ui/Media.jsx";
import { useCategories, useProducts } from "../hooks/useCatalog.js";
import { categoryCounter, lookFor } from "../lib/categoryLook.js";
import { displayName } from "../lib/text.js";
import { formatListing } from "../lib/money.js";

const QUICK = [
  { to: "/deals", label: "Deals", icon: Flame, tone: "deal" },
  { to: "/new", label: "New", icon: Sparkles },
  { to: "/brands", label: "Brands", icon: BadgeCheck },
];

/** Text link with a sliding underline: grows from the centre on hover, stays on the active route. */
const underline =
  "relative inline-flex h-11 shrink-0 items-center px-3 text-shop-sm transition-colors after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:origin-center after:scale-x-0 after:rounded-full after:bg-shop-primary after:transition-transform after:duration-200 hover:text-shop-ink hover:after:scale-x-100";

function CategoryIcon({ c, size = "md" }) {
  const look = lookFor(c);
  const Icon = look.icon;
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl bg-gradient-to-br ring-1 ring-black/5", look.tint, look.ink, size === "lg" ? "size-14 rounded-2xl" : "size-8")}>
      <Icon className={size === "lg" ? "size-7" : "size-4"} strokeWidth={1.8} />
    </span>
  );
}

/** Up to four live products from the highlighted category ("Popular in …"). */
function PopularIn({ category, onNavigate }) {
  const res = useProducts(category ? { category: category.slug } : {}, { limit: 4 });
  if (res.isPending)
    return (
      <div className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="shop-skeleton h-[4.5rem] rounded-xl" />
        ))}
      </div>
    );
  if (!res.products.length) return null;
  return (
    <ul className="grid grid-cols-2 gap-3 2xl:grid-cols-4">
      {res.products.map((p) => (
        <li key={p.id}>
          <Link
            to={`/product/${p.slug}`}
            onClick={onNavigate}
            className="group flex items-center gap-3 rounded-xl border border-shop-line bg-shop-card p-2 transition-[border-color,box-shadow] hover:border-shop-primary/40 hover:shadow-[0_10px_24px_-18px_rgba(11,16,51,0.5)]"
          >
            <ImageWithFallback src={p.image} alt="" fit="cover" fallbackName={displayName(p.name)} className="size-12 shrink-0 rounded-lg" />
            <span className="min-w-0">
              <span className="line-clamp-2 text-shop-sm font-medium leading-snug text-shop-ink group-hover:text-shop-primary-ink">{displayName(p.name)}</span>
              <span className="text-shop-xs font-semibold tabular-nums text-shop-text">{formatListing(p.price ?? p.defaultVariant?.price)}</span>
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/**
 * Category bar under the header with the "All categories" mega-menu.
 *  - Left: every top-level category with its icon and live product count.
 *  - Middle: the highlighted category — header with counts and "Shop all", its sub-categories (with
 *    counts) and up to four popular products; a friendly empty state when it has nothing yet.
 *  - Right (xl+): bulk-buying card.
 * Behaviour: opens on click / Enter / ↓; switches on hover with a short intent delay (so a diagonal
 * mouse move to the panel doesn't flip categories); Escape, outside click, the close button or a
 * route change closes it. The page behind is dimmed; the panel scrolls on short screens.
 */
export default function CategoryBar({ scrolled = false }) {
  const cats = useCategories();
  const facets = useProducts({ facets: true }, { limit: 1 });
  const countOf = useMemo(() => categoryCounter(facets.data?.facets?.categories || []), [facets.data]);
  // Busiest categories first (sub-categories rolled up); empty ones last, admin order kept on ties.
  const roots = useMemo(
    () =>
      (cats.data?.roots || [])
        .map((c, i) => ({ c, i, n: countOf(c) }))
        .sort((a, b) => b.n - a.n || a.i - b.i)
        .map((x) => x.c),
    [cats.data, countOf]
  );
  const [open, setOpen] = useState(false);
  const [hot, setHot] = useState(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);
  const hoverTimer = useRef(null);
  const { pathname, search } = useLocation();

  useEffect(() => setOpen(false), [pathname, search]);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (!panelRef.current?.contains(e.target) && !triggerRef.current?.contains(e.target)) setOpen(false);
    };
    const onKey = (e) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
      clearTimeout(hoverTimer.current);
    };
  }, [open]);

  const active = roots.find((c) => c.id === hot) || roots[0];
  const activeCount = active ? countOf(active) : 0;

  const hoverTo = (id) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setHot(id), 90);
  };
  function onRootKey(e, index) {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const next = (index + (e.key === "ArrowDown" ? 1 : -1) + roots.length) % roots.length;
      panelRef.current?.querySelectorAll("[data-root]")[next]?.focus();
    }
  }
  const close = () => setOpen(false);

  return (
    <nav aria-label="Categories" className="relative hidden border-b border-shop-line bg-shop-card/95 backdrop-blur supports-[backdrop-filter]:bg-shop-card/85 md:block">
      <div className={cn("msr-gutter flex items-center gap-2 transition-[height] duration-300", scrolled ? "h-11" : "h-12")}>
        <button
          ref={triggerRef}
          type="button"
          aria-expanded={open}
          aria-controls="mega-menu"
          aria-haspopup="true"
          onClick={() => {
            setHot(null);
            setOpen((v) => !v);
          }}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setOpen(true);
              setTimeout(() => panelRef.current?.querySelector("[data-root]")?.focus(), 0);
            }
          }}
          className={cn(
            "inline-flex h-9 shrink-0 items-center gap-2 rounded-full pl-3 pr-2.5 text-shop-sm font-semibold transition-colors pointer-coarse:min-h-11",
            open ? "bg-shop-primary text-white" : "bg-shop-navy text-white hover:bg-shop-navy-2"
          )}
        >
          <LayoutGrid className="size-4" strokeWidth={2} aria-hidden />
          All categories
          <ChevronDown className={cn("size-4 opacity-80 transition-transform duration-200", open && "rotate-180")} aria-hidden />
        </button>

        <div className="flex min-w-0 flex-1 items-center overflow-hidden">
          {roots.slice(0, 8).map((c, i) => (
            <NavLink
              key={c.slug}
              to={`/category/${c.slug}`}
              className={({ isActive }) =>
                cn(
                  underline,
                  i >= 2 && "hidden lg:inline-flex",
                  i >= 4 && "lg:hidden xl:inline-flex",
                  i >= 6 && "xl:hidden 2xl:inline-flex",
                  isActive ? "font-semibold text-shop-ink after:scale-x-100" : "font-medium text-shop-text"
                )
              }
            >
              {displayName(c.name)}
            </NavLink>
          ))}
          {cats.isPending
            ? Array.from({ length: 5 }, (_, i) => <span key={i} aria-hidden className="mx-3 h-3 w-20 shrink-0 animate-pulse rounded-full bg-shop-well" />)
            : null}
        </div>

        <div className="flex shrink-0 items-center gap-1">
          {QUICK.map((q) => (
            <NavLink
              key={q.to}
              to={q.to}
              className={({ isActive }) =>
                cn(underline, "gap-1.5 font-semibold", q.tone === "deal" ? "text-shop-saffron-ink after:bg-shop-deal" : "text-shop-text", isActive && "after:scale-x-100")
              }
            >
              <q.icon className={cn("size-4", q.tone === "deal" ? "text-shop-deal" : "text-shop-muted")} strokeWidth={2} aria-hidden />
              {q.label}
            </NavLink>
          ))}
          <NavLink
            to="/bulk"
            className={({ isActive }) =>
              cn(
                "ml-1 inline-flex h-9 items-center gap-1.5 rounded-full border px-3.5 text-shop-sm font-semibold transition-colors pointer-coarse:min-h-11",
                isActive ? "border-shop-gold bg-shop-gold text-shop-navy" : "border-shop-gold/60 bg-shop-gold-soft text-shop-gold-ink hover:border-shop-gold hover:bg-shop-gold/25"
              )
            }
          >
            <Boxes className="size-4" strokeWidth={2} aria-hidden />
            Bulk buy
          </NavLink>
        </div>
      </div>

      {open ? <div aria-hidden onClick={close} className="mega-dim absolute inset-x-0 top-full z-30 h-[100dvh] bg-shop-ink/30" /> : null}

      <div id="mega-menu" ref={panelRef} hidden={!open} className="mega-panel absolute inset-x-0 top-full z-40 border-b border-shop-line bg-shop-card shadow-[0_24px_48px_-20px_rgba(11,16,51,0.35)]">
        <div className="mega-scroll">
          <div className="msr-gutter grid grid-cols-[17rem_minmax(0,1fr)] gap-8 py-6 xl:grid-cols-[17rem_minmax(0,1fr)_16rem]">
            {/* category list */}
            <div className="min-w-0 border-r border-shop-line pr-4">
              <p className="px-2 pb-2 text-shop-xs font-semibold uppercase tracking-wider text-shop-subtle">Shop by category</p>
              <ul className="grid gap-0.5">
                {roots.map((c, i) => {
                  const on = active?.id === c.id;
                  const n = countOf(c);
                  return (
                    <li key={c.slug}>
                      <Link
                        data-root
                        to={`/category/${c.slug}`}
                        onMouseEnter={() => hoverTo(c.id)}
                        onFocus={() => setHot(c.id)}
                        onKeyDown={(e) => onRootKey(e, i)}
                        onClick={close}
                        className={cn(
                          "relative flex min-h-11 items-center gap-2.5 rounded-xl px-2 py-1 text-shop-sm transition-colors",
                          on ? "bg-shop-primary-soft font-semibold text-shop-primary-ink" : "text-shop-text hover:bg-shop-hover"
                        )}
                      >
                        {on ? <span aria-hidden className="absolute -left-1 top-2 bottom-2 w-1 rounded-full bg-shop-primary" /> : null}
                        <CategoryIcon c={c} />
                        <span className="min-w-0 flex-1 truncate">{displayName(c.name)}</span>
                        {n ? <span className={cn("shrink-0 text-shop-xs tabular-nums", on ? "text-shop-primary-ink" : "text-shop-subtle")}>{n}</span> : null}
                        <ChevronRight className={cn("size-4 shrink-0 transition-transform", on ? "translate-x-0.5 text-shop-primary-ink" : "text-shop-subtle")} aria-hidden />
                      </Link>
                    </li>
                  );
                })}
                {!roots.length ? <li className="px-3 py-2 text-shop-sm text-shop-muted">{cats.isPending ? "Loading categories…" : "No categories yet"}</li> : null}
              </ul>
              <Link to="/category/all" onClick={close} className="mt-2 flex min-h-11 items-center gap-2 rounded-xl px-2 text-shop-sm font-semibold text-shop-primary-ink hover:bg-shop-primary-soft">
                <LayoutGrid className="size-4" aria-hidden /> Browse all products
              </Link>
            </div>

            {/* highlighted category */}
            {active ? (
              <div className="grid min-w-0 content-start gap-5">
                <div className="flex items-center gap-4 border-b border-shop-line pb-4">
                  <CategoryIcon c={active} size="lg" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-shop-xl font-bold text-shop-ink">{displayName(active.name)}</p>
                    <p className="mt-0.5 text-shop-sm text-shop-muted">
                      {activeCount ? `${activeCount} product${activeCount === 1 ? "" : "s"}` : "New sellers joining soon"}
                      {active.children.length ? ` · ${active.children.length} sub-categor${active.children.length === 1 ? "y" : "ies"}` : ""}
                    </p>
                  </div>
                  <Link
                    to={`/category/${active.slug}`}
                    onClick={close}
                    className="group inline-flex h-10 shrink-0 items-center gap-1.5 rounded-full bg-shop-primary px-4 text-shop-sm font-semibold text-white transition-colors hover:bg-shop-primary-hover"
                  >
                    Shop all <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </Link>
                  <button type="button" onClick={close} className="grid size-10 shrink-0 place-items-center rounded-full text-shop-muted hover:bg-shop-hover hover:text-shop-ink" aria-label="Close categories">
                    <X className="size-5" aria-hidden />
                  </button>
                </div>

                {active.children.length ? (
                  <div>
                    <p className="mb-2 text-shop-xs font-semibold uppercase tracking-wider text-shop-subtle">Sub-categories</p>
                    <ul className="grid grid-cols-2 gap-2 lg:grid-cols-3">
                      {active.children.map((child) => {
                        const n = countOf(child);
                        return (
                          <li key={child.slug}>
                            <Link
                              to={`/category/${child.slug}`}
                              onClick={close}
                              className="group flex min-h-12 items-center justify-between gap-2 rounded-xl border border-shop-line px-3 text-shop-sm text-shop-text transition-colors hover:border-shop-primary/40 hover:bg-shop-primary-soft hover:text-shop-primary-ink"
                            >
                              <span className="min-w-0 truncate font-medium">{displayName(child.name)}</span>
                              <span className="flex shrink-0 items-center gap-1 text-shop-xs text-shop-subtle group-hover:text-shop-primary-ink">
                                {n ? <span className="tabular-nums">{n}</span> : null}
                                <ChevronRight className="size-3.5" aria-hidden />
                              </span>
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}

                {activeCount ? (
                  <div>
                    <p className="mb-2 text-shop-xs font-semibold uppercase tracking-wider text-shop-subtle">Popular in {displayName(active.name)}</p>
                    <PopularIn key={active.slug} category={active} onNavigate={close} />
                  </div>
                ) : (
                  <>
                    <div className="flex items-center gap-3 rounded-2xl bg-shop-page px-4 py-3 ring-1 ring-shop-line">
                      <PackageSearch className="size-5 shrink-0 text-shop-muted" strokeWidth={1.7} aria-hidden />
                      <p className="min-w-0 flex-1 text-shop-sm text-shop-muted">
                        <span className="font-semibold text-shop-ink">No products in {displayName(active.name)} yet.</span> Sellers are adding stock — here’s what buyers are ordering now.
                      </p>
                    </div>
                    <div>
                      <p className="mb-2 text-shop-xs font-semibold uppercase tracking-wider text-shop-subtle">Popular on MS₹ right now</p>
                      <PopularIn category={null} onNavigate={close} />
                    </div>
                  </>
                )}
              </div>
            ) : null}

            {/* promo */}
            <aside className="hidden self-start xl:block">
              <Link to="/bulk" onClick={close} className="group relative flex flex-col overflow-hidden rounded-2xl bg-shop-navy p-5 text-white">
                <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-40 rounded-full bg-shop-gold/20 blur-2xl" />
                <span className="relative">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-shop-gold px-2.5 py-1 text-shop-xs font-bold text-shop-navy">
                    <Boxes className="size-3.5" aria-hidden /> For businesses
                  </span>
                  <span className="mt-3 block font-display text-shop-lg font-bold leading-snug">Buy by the case, pay less per pack</span>
                  <span className="mt-1.5 block text-shop-sm text-shop-on-navy-muted">Slab prices, GST invoices and credit terms for approved buyers.</span>
                </span>
                <span className="relative mt-4 inline-flex items-center gap-1.5 text-shop-sm font-semibold text-shop-gold">
                  How bulk buying works <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
                </span>
              </Link>
            </aside>
          </div>
        </div>
      </div>
    </nav>
  );
}
