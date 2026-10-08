import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import { Clock, LayoutGrid, Loader2, Search, Tag, TrendingUp, X } from "lucide-react";
import { cn } from "./cn.js";
import { ImageWithFallback, BrandMonogram } from "./Media.jsx";
import { useSearchSuggest } from "../../hooks/useSearchSuggest.js";
import { useCategories } from "../../hooks/useCatalog.js";
import { formatListing } from "../../lib/money.js";
import { clearRecentSearches, pushRecentSearch } from "../../lib/recentSearches.js";
import { api } from "../../../shared/api/index.js";

/**
 * Header search: WAI-ARIA combobox + listbox with product / brand / category suggestions (server
 * search, thumbnails), recent and popular terms, full keyboard support (↑ ↓ Home End Enter Esc).
 * Inside a category page the search stays scoped to that category (a chip shows it; Backspace on an
 * empty box or the chip's × widens to all products).
 *
 * The search is recorded here (recent + popular). Listing pages must not record it again.
 */
export function SearchCombobox({ className, placeholder = "Search atta, oil, Tata, case packs…", autoFocus = false, onNavigate, variant = "default" }) {
  const header = variant === "header";
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams();
  const cats = useCategories();
  const routeCategory = location.pathname.startsWith("/category/") ? params.slug || location.pathname.split("/")[2] : "";
  const urlQ = new URLSearchParams(location.search).get("q") || "";
  const [term, setTerm] = useState(urlQ);
  const [scope, setScope] = useState(routeCategory && routeCategory !== "all" ? routeCategory : "");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [recentTick, setRecentTick] = useState(0);
  const inputRef = useRef(null);
  const rootRef = useRef(null);
  const listId = useId();
  const optId = (i) => `${listId}-opt-${i}`;

  useEffect(() => {
    setTerm(urlQ);
    setScope(routeCategory && routeCategory !== "all" ? routeCategory : "");
  }, [routeCategory, urlQ]);

  const s = useSearchSuggest(term, { category: scope, enabled: open });
  const scopeName = scope ? cats.data?.bySlug?.get(scope)?.name || scope : "";

  /** Flat option list (drives keyboard + aria-activedescendant). */
  const options = useMemo(() => {
    const t = term.trim();
    const out = [];
    if (t.length >= 1) out.push({ group: "search", kind: "submit", label: t, value: t });
    if (t.length >= 2) {
      s.products.forEach((p) => out.push({ group: "products", kind: "product", product: p }));
      s.categories.forEach((c) => out.push({ group: "categories", kind: "category", category: c }));
      s.brands.forEach((b) => out.push({ group: "brands", kind: "brand", brand: b }));
    } else {
      s.recent.forEach((r) => out.push({ group: "recent", kind: "term", value: r }));
      s.popular.forEach((r) => out.push({ group: "popular", kind: "term", value: r }));
    }
    return out;
  }, [term, s.products, s.categories, s.brands, s.recent, s.popular, recentTick]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => setActive(-1), [term, open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => {
      if (rootRef.current && !rootRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  function go(to) {
    setOpen(false);
    inputRef.current?.blur();
    onNavigate?.();
    navigate(to);
  }

  function submitTerm(value) {
    const q = String(value || "").trim();
    if (q.length < 1) return;
    pushRecentSearch(q);
    api.recordSearch(q).catch(() => {});
    setTerm(q);
    go(`/category/${scope || "all"}?q=${encodeURIComponent(q)}`);
  }

  function choose(opt) {
    if (!opt) return submitTerm(term);
    if (opt.kind === "submit" || opt.kind === "term") return submitTerm(opt.value);
    if (opt.kind === "product") {
      pushRecentSearch(term);
      return go(`/product/${opt.product.slug}`);
    }
    if (opt.kind === "category") return go(`/category/${opt.category.slug}`);
    if (opt.kind === "brand") return go(`/category/all?brand=${encodeURIComponent(opt.brand.slug)}`);
    return undefined;
  }

  function onKeyDown(e) {
    const n = options.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (n ? (i + 1) % n : -1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setOpen(true);
      setActive((i) => (n ? (i <= 0 ? n - 1 : i - 1) : -1));
    } else if (e.key === "Home" && open && active >= 0) {
      e.preventDefault();
      setActive(0);
    } else if (e.key === "End" && open && active >= 0) {
      e.preventDefault();
      setActive(n - 1);
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(open && active >= 0 ? options[active] : null);
    } else if (e.key === "Escape") {
      if (open) setOpen(false);
      else setTerm("");
    } else if (e.key === "Backspace" && !term && scope) {
      setScope("");
    } else if (e.key === "Tab") {
      setOpen(false);
    }
  }

  useEffect(() => {
    if (active < 0) return;
    document.getElementById(optId(active))?.scrollIntoView({ block: "nearest" });
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps

  const groups = [
    ["search", null],
    ["products", "Products"],
    ["categories", "Categories"],
    ["brands", "Brands"],
    ["recent", "Recent searches"],
    ["popular", "Popular searches"],
  ];
  const showPanel = open && (options.length > 0 || (term.trim().length >= 2 && !s.loading));

  return (
    <div ref={rootRef} className={cn("relative min-w-0", className)}>
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          choose(open && active >= 0 ? options[active] : null);
        }}
        className={cn(
          "flex items-center gap-2 border bg-white text-shop-ink transition-shadow",
          header
            ? "h-11 rounded-full border-white/0 pl-4 pr-1 shadow-[0_1px_0_rgba(255,255,255,0.08),0_6px_20px_-8px_rgba(0,0,0,0.45)] focus-within:ring-[3px] focus-within:ring-shop-gold/55 md:h-12"
            : "h-11 rounded-control border-transparent px-3 focus-within:border-shop-gold"
        )}
      >
        <Search className="size-5 shrink-0 text-shop-muted" strokeWidth={1.75} aria-hidden />
        {scope ? (
          <span className="inline-flex max-w-36 shrink-0 items-center gap-1 rounded-full bg-shop-primary-soft py-0.5 pl-2 pr-0.5 text-shop-xs font-semibold text-shop-primary-ink">
            <span className="truncate">in {scopeName}</span>
            <button type="button" onClick={() => setScope("")} className="relative grid size-6 place-items-center rounded-full after:absolute after:-inset-2.5 after:content-[''] hover:bg-white/70" aria-label={`Search all products instead of only ${scopeName}`}>
              <X className="size-3.5" aria-hidden />
            </button>
          </span>
        ) : null}
        <input
          ref={inputRef}
          type="search"
          role="combobox"
          aria-label="Search products"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? optId(active) : undefined}
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          enterKeyHint="search"
          autoFocus={autoFocus}
          value={term}
          placeholder={placeholder}
          onChange={(e) => {
            setTerm(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          className="h-full min-w-0 flex-1 bg-transparent text-shop-base placeholder:text-shop-subtle focus:outline-none [&::-webkit-search-cancel-button]:hidden"
        />
        {s.loading ? <Loader2 className="size-4 shrink-0 animate-spin text-shop-muted" aria-hidden /> : null}
        {term ? (
          <button
            type="button"
            onClick={() => (setTerm(""), inputRef.current?.focus())}
            className={cn("grid size-11 shrink-0 place-items-center text-shop-muted hover:bg-shop-hover", header ? "-my-px rounded-full" : "-my-px -mr-3 rounded-control")}
            aria-label="Clear search"
          >
            <X className="size-4" aria-hidden />
          </button>
        ) : null}
        {header ? (
          <button
            type="submit"
            className="hidden h-9 shrink-0 items-center gap-1.5 rounded-full bg-shop-primary px-4 text-shop-sm font-semibold text-white transition-colors hover:bg-shop-primary-hover md:inline-flex md:h-10 md:px-5 pointer-coarse:min-h-11"
          >
            <Search className="size-4" strokeWidth={2} aria-hidden />
            Search
          </button>
        ) : null}
      </form>

      <div
        id={listId}
        role="listbox"
        aria-label="Search suggestions"
        hidden={!showPanel}
        className="absolute inset-x-0 top-full z-50 mt-2 max-h-[min(70dvh,32rem)] overflow-y-auto rounded-card border border-shop-line bg-shop-card py-2 text-shop-text shadow-shop-pop"
      >
        {showPanel && !options.length ? <p className="px-4 py-3 text-shop-sm text-shop-muted">No suggestions. Press Enter to search.</p> : null}
        {groups.map(([group, title]) => {
          const rows = options.map((o, i) => [o, i]).filter(([o]) => o.group === group);
          if (!rows.length) return null;
          const gid = `${listId}-${group}`;
          return (
            <div key={group} role="group" aria-labelledby={title ? gid : undefined} className="py-1">
              {title ? (
                <div className="flex items-center justify-between px-4 pb-1 pt-1.5">
                  <span id={gid} className="text-shop-xs font-semibold text-shop-muted">
                    {title}
                  </span>
                  {group === "recent" ? (
                    <button
                      type="button"
                      tabIndex={-1}
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        clearRecentSearches();
                        api.clearRecentSearches().catch(() => {});
                        setRecentTick((n) => n + 1);
                      }}
                      className="text-shop-xs font-semibold text-shop-primary-ink hover:underline"
                    >
                      Clear
                    </button>
                  ) : null}
                </div>
              ) : null}
              {rows.map(([o, i]) => (
                <div
                  key={i}
                  id={optId(i)}
                  role="option"
                  aria-selected={active === i}
                  onMouseDown={(e) => e.preventDefault()}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(o)}
                  className={cn("flex min-h-11 cursor-pointer items-center gap-3 px-4 py-1.5 text-shop-base", active === i && "bg-shop-hover")}
                >
                  <OptionBody option={o} scopeName={scopeName} />
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OptionBody({ option: o, scopeName }) {
  if (o.kind === "submit")
    return (
      <>
        <Search className="size-4 shrink-0 text-shop-muted" aria-hidden />
        <span className="min-w-0 truncate">
          Search for <span className="font-semibold text-shop-ink">“{o.label}”</span>
          {scopeName ? <span className="text-shop-muted"> in {scopeName}</span> : null}
        </span>
      </>
    );
  if (o.kind === "product") {
    const p = o.product;
    return (
      <>
        <ImageWithFallback src={p.image} alt="" className="size-10 shrink-0" padded={false} />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-medium text-shop-ink">{p.name}</span>
          <span className="block truncate text-shop-xs text-shop-muted">
            {[p.brand, p.defaultVariant?.pack].filter(Boolean).join(" · ")}
          </span>
        </span>
        <span className="shrink-0 text-shop-sm font-semibold tabular-nums text-shop-ink">{formatListing(p.price)}</span>
      </>
    );
  }
  if (o.kind === "category")
    return (
      <>
        <span className="grid size-10 shrink-0 place-items-center rounded-well bg-shop-primary-soft text-shop-primary-ink">
          <LayoutGrid className="size-4" aria-hidden />
        </span>
        <span className="truncate">{o.category.name}</span>
      </>
    );
  if (o.kind === "brand")
    return (
      <>
        <BrandMonogram name={o.brand.name} logo={o.brand.logo} size="sm" className="size-10" />
        <span className="truncate">
          {o.brand.name} <span className="text-shop-xs text-shop-muted">brand</span>
        </span>
      </>
    );
  const Icon = o.group === "recent" ? Clock : o.group === "popular" ? TrendingUp : Tag;
  return (
    <>
      <Icon className="size-4 shrink-0 text-shop-muted" aria-hidden />
      <span className="truncate">{o.value}</span>
    </>
  );
}

export default SearchCombobox;
