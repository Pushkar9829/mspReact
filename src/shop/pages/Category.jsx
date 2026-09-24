import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ProductCard, { PRODUCT_GRID, ProductCardSkeleton } from "../components/ProductCard.jsx";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed.js";
import { useShopCatalog } from "../context/ShopCatalogContext.jsx";
import BrandLogo from "../components/BrandLogo.jsx";
import { PackageSearch, Search, SlidersHorizontal, TrendingUp, X } from "lucide-react";
import { api } from "../../shared/api.js";
import { pushRecentSearch } from "../lib/recentSearches.js";
import { Breadcrumbs, Button, Checkbox, Chip, EmptyState } from "../components/shopUi.jsx";

const PRICE_OPTIONS = [
  ["200", "Under ₹200"],
  ["400", "Under ₹400"],
  ["800", "Under ₹800"],
];

const SORTS = [
  ["popular", "Popularity"],
  ["price-asc", "Price: Low to high"],
  ["price-desc", "Price: High to low"],
];

const PAGE_SIZE = 12;

export default function Category() {
  const { slug = "all" } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [brand, setBrand] = useState("");
  const [brandQuery, setBrandQuery] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [popular, setPopular] = useState([]);
  const { categories, brands, filterProducts, ready } = useShopCatalog();

  const cat = categories.find((c) => c.slug === slug);
  const list = useMemo(() => {
    let rows = filterProducts({
      category: slug === "all" ? undefined : slug,
      brand: brand || undefined,
      q,
      maxPrice: price ? Number(price) : undefined,
    });
    if (sort === "price-asc") rows = [...rows].sort((a, b) => a.price - b.price);
    if (sort === "price-desc") rows = [...rows].sort((a, b) => b.price - a.price);
    return rows;
  }, [slug, brand, q, price, sort, filterProducts]);

  const { visible, hasMore, loading, sentinelRef } = useInfiniteFeed(list, PAGE_SIZE);

  const title = q ? `Results for “${q}”` : cat?.name || "All products";
  const hasFilters = Boolean(brand || price);
  const filterCount = (brand ? 1 : 0) + (price ? 1 : 0);
  const shownBrands = brandQuery
    ? brands.filter((b) => b.name.toLowerCase().includes(brandQuery.trim().toLowerCase()))
    : brands;

  function resetFilters() {
    setBrand("");
    setPrice("");
  }

  useEffect(() => {
    setFiltersOpen(false);
  }, [slug, q]);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return undefined;
    pushRecentSearch(term);
    api.recordSearch(term).catch(() => {});
  }, [q]);

  useEffect(() => {
    let cancelled = false;
    api
      .searchSuggestions()
      .then((res) => {
        if (!cancelled && Array.isArray(res.popular)) setPopular(res.popular);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  const filters = (
    <div className="divide-y divide-msr-line">
      <FilterGroup title="Category">
        <nav className="grid gap-0.5">
          <FilterLink to="/category/all" active={!cat && !q} onPick={() => setFiltersOpen(false)}>
            All products
          </FilterLink>
          {categories.map((c) => (
            <FilterLink key={c.slug} to={`/category/${c.slug}`} active={slug === c.slug && !q} onPick={() => setFiltersOpen(false)}>
              {c.name}
            </FilterLink>
          ))}
        </nav>
      </FilterGroup>

      <FilterGroup title="Brand">
        {brands.length > 6 ? (
          <label className="relative mb-2 block">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-msr-subtle" />
            <input
              value={brandQuery}
              onChange={(e) => setBrandQuery(e.target.value)}
              placeholder="Search brands"
              className="h-9 w-full rounded-lg border border-msr-line bg-msr-surface pl-8 pr-2 text-[13px] outline-none placeholder:text-msr-subtle focus:border-msr-primary focus:bg-white"
            />
          </label>
        ) : null}
        <div className="msr-pane grid max-h-64 gap-0.5 overflow-y-auto pr-1">
          {shownBrands.map((b) => {
            const on = brand === b.name;
            return (
              <label
                key={b.slug}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                  on ? "bg-msr-primary-soft font-semibold text-msr-ink" : "text-msr-ink/85 hover:bg-msr-surface"
                }`}
              >
                <Checkbox checked={on} />
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setBrand(on ? "" : b.name)} />
                <BrandLogo className="h-6 w-6" alt="" />
                <span className="truncate">{b.name}</span>
              </label>
            );
          })}
          {!shownBrands.length ? <p className="px-2 py-1.5 text-[12px] text-msr-subtle">No brands match.</p> : null}
        </div>
      </FilterGroup>

      <FilterGroup title="Price">
        <div className="grid gap-0.5">
          {PRICE_OPTIONS.map(([v, label]) => {
            const on = price === v;
            return (
              <label
                key={v}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] transition-colors ${
                  on ? "bg-msr-primary-soft font-semibold text-msr-ink" : "text-msr-ink/85 hover:bg-msr-surface"
                }`}
              >
                <Checkbox checked={on} radio />
                <input type="radio" name="price" className="sr-only" checked={on} onChange={() => setPrice(v)} />
                {label}
              </label>
            );
          })}
        </div>
      </FilterGroup>
    </div>
  );

  return (
    <div className="msr-gutter py-5 pb-12">
      <Breadcrumbs
        items={[
          { label: "Home", to: "/" },
          ...(cat ? [{ label: "All products", to: "/category/all" }] : []),
          { label: title },
        ]}
      />

      <div className="mt-4 grid gap-6 lg:grid-cols-[250px_minmax(0,1fr)]">
        <aside className="hidden lg:block">
          <div className="sticky top-32 overflow-hidden rounded-2xl border border-msr-line bg-white">
            <div className="flex items-center justify-between border-b border-msr-line px-4 py-3.5">
              <p className="text-[14px] font-bold text-msr-ink">Filters</p>
              {hasFilters ? (
                <button type="button" className="text-[12px] font-semibold text-msr-primary hover:underline" onClick={resetFilters}>
                  Clear all
                </button>
              ) : null}
            </div>
            <div className="msr-pane max-h-[calc(100vh-12rem)] overflow-y-auto">{filters}</div>
          </div>
        </aside>

        <div className="min-w-0">
          <div className="flex flex-wrap items-end justify-between gap-3 rounded-2xl border border-msr-line bg-white px-4 py-3.5">
            <div className="min-w-0">
              <h1 className="truncate text-xl font-extrabold tracking-tight text-msr-ink md:text-[1.4rem]">{title}</h1>
              <p className="mt-0.5 text-[12.5px] text-msr-muted">
                {list.length
                  ? `Showing ${visible.length} of ${list.length} product${list.length === 1 ? "" : "s"}`
                  : "No products"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-msr-line-strong bg-white px-3.5 text-[13px] font-semibold text-msr-ink transition hover:border-msr-primary lg:hidden"
                onClick={() => setFiltersOpen(true)}
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {filterCount ? (
                  <span className="grid h-5 min-w-5 place-items-center rounded-full bg-msr-primary px-1 text-[11px] text-white">
                    {filterCount}
                  </span>
                ) : null}
              </button>
              <label className="flex items-center gap-2">
                <span className="hidden text-[12.5px] text-msr-muted sm:inline">Sort by</span>
                <select value={sort} onChange={(e) => setSort(e.target.value)} className="h-10 cursor-pointer rounded-xl border border-msr-line-strong bg-white px-3 text-[13px] font-medium text-msr-ink outline-none focus:border-msr-primary focus:ring-4 focus:ring-msr-primary/10">
                  {SORTS.map(([v, label]) => (
                    <option key={v} value={v}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            {hasFilters ? (
              <div className="flex w-full flex-wrap items-center gap-2 border-t border-msr-line pt-3">
                {brand ? <Chip onClear={() => setBrand("")}>{brand}</Chip> : null}
                {price ? <Chip onClear={() => setPrice("")}>{PRICE_OPTIONS.find(([v]) => v === price)?.[1]}</Chip> : null}
                <button type="button" onClick={resetFilters} className="text-[12px] font-semibold text-msr-primary hover:underline">
                  Clear all
                </button>
              </div>
            ) : null}
          </div>

          {!ready && !list.length ? (
            <div className={`mt-4 ${PRODUCT_GRID}`}>
              {Array.from({ length: 8 }, (_, i) => (
                <ProductCardSkeleton key={i} />
              ))}
            </div>
          ) : visible.length === 0 ? (
            <EmptyState
              icon={PackageSearch}
              className="mt-4"
              title={q ? `No products for “${q}”` : "No products match these filters"}
              text="Try another category, brand, or one of the popular searches below."
            >
              {popular.slice(0, 8).map((row) => (
                <Chip as={Link} key={row.term} to={`/category/all?q=${encodeURIComponent(row.display)}`}>
                  <TrendingUp className="h-3.5 w-3.5 text-msr-primary" />
                  {row.display}
                </Chip>
              ))}
              {hasFilters ? (
                <Button variant="secondary" size="sm" onClick={resetFilters}>
                  Reset filters
                </Button>
              ) : null}
            </EmptyState>
          ) : (
            <>
              <div className={`mt-4 ${PRODUCT_GRID}`}>
                {visible.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
                {loading ? Array.from({ length: 4 }, (_, i) => <ProductCardSkeleton key={`sk-${i}`} />) : null}
              </div>
              <div ref={sentinelRef} className="h-8" aria-hidden />
              <p className="pb-2 text-center text-[12.5px] text-msr-muted">
                {hasMore ? (loading ? "Loading more products…" : "Scroll for more") : `You’ve seen all ${list.length} products`}
              </p>
            </>
          )}
        </div>
      </div>

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex lg:hidden" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="msr-fade absolute inset-0 bg-msr-brand/45" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
          <div className="relative ml-auto flex h-full w-[min(22rem,92vw)] flex-col bg-white shadow-pop">
            <div className="flex shrink-0 items-center justify-between border-b border-msr-line px-5 py-4">
              <p className="text-[15px] font-bold text-msr-ink">Filters</p>
              <div className="flex items-center gap-3">
                {hasFilters ? (
                  <button type="button" className="text-[12px] font-semibold text-msr-primary" onClick={resetFilters}>
                    Clear all
                  </button>
                ) : null}
                <button type="button" className="grid h-8 w-8 place-items-center rounded-lg text-msr-muted hover:bg-msr-surface hover:text-msr-ink" onClick={() => setFiltersOpen(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="msr-pane min-h-0 flex-1 overflow-y-auto">{filters}</div>
            <div className="shrink-0 border-t border-msr-line p-4">
              <Button size="lg" block onClick={() => setFiltersOpen(false)}>
                Show {list.length} products
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function FilterGroup({ title, children }) {
  return (
    <section className="px-4 py-4">
      <h3 className="mb-2 text-[11px] font-bold uppercase tracking-[0.12em] text-msr-subtle">{title}</h3>
      {children}
    </section>
  );
}

function FilterLink({ to, active, children, onPick }) {
  return (
    <Link
      to={to}
      onClick={onPick}
      className={`rounded-lg px-2.5 py-2 text-[13px] transition-colors ${
        active ? "bg-msr-primary-soft font-semibold text-msr-primary-ink" : "text-msr-ink/85 hover:bg-msr-surface hover:text-msr-ink"
      }`}
    >
      {children}
    </Link>
  );
}
