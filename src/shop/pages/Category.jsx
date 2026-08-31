import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import ProductCard, { PRODUCT_GRID } from "../components/ProductCard.jsx";
import { useInfiniteFeed } from "../hooks/useInfiniteFeed.js";
import { useShopCatalog } from "../../shared/context/ShopCatalogContext.jsx";
import { SlidersHorizontal, X } from "lucide-react";

const PRICE_OPTIONS = [
  ["200", "Under ₹200"],
  ["400", "Under ₹400"],
  ["800", "Under ₹800"],
];

const PAGE_SIZE = 8;

export default function Category() {
  const { slug = "all" } = useParams();
  const [params] = useSearchParams();
  const q = params.get("q") || "";
  const [brand, setBrand] = useState("");
  const [price, setPrice] = useState("");
  const [sort, setSort] = useState("popular");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const { categories, brands, filterProducts } = useShopCatalog();

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

  useEffect(() => {
    setFiltersOpen(false);
  }, [slug, q]);

  useEffect(() => {
    document.body.style.overflow = filtersOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [filtersOpen]);

  const filters = (
    <div className="p-5">
      <section>
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Category</h3>
        <nav className="mt-2 grid gap-0.5">
          <FilterLink to="/category/all" active={!cat && !q} onPick={() => setFiltersOpen(false)}>
            All products
          </FilterLink>
          {categories.map((c) => (
            <FilterLink key={c.slug} to={`/category/${c.slug}`} active={slug === c.slug && !q} onPick={() => setFiltersOpen(false)}>
              {c.name}
            </FilterLink>
          ))}
        </nav>
      </section>

      <section className="mt-5 border-t border-[#eceef4] pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Brand</h3>
        <div className="mt-2 grid gap-0.5">
          {brands.map((b) => {
            const on = brand === b.name;
            return (
              <label
                key={b.slug}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] ${
                  on ? "bg-[#f4f3ff] font-semibold text-[#1a1c3d]" : "text-[#3f4254] hover:bg-[#f7f8fc]"
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded border ${
                    on ? "border-[#4b46ff] bg-[#4b46ff]" : "border-[#cfd3e2] bg-white"
                  }`}
                >
                  {on ? <span className="h-1.5 w-1.5 rounded-[1px] bg-white" /> : null}
                </span>
                <input type="checkbox" className="sr-only" checked={on} onChange={() => setBrand(on ? "" : b.name)} />
                {b.name}
              </label>
            );
          })}
        </div>
      </section>

      <section className="mt-5 border-t border-[#eceef4] pt-4">
        <h3 className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#6b7280]">Price</h3>
        <div className="mt-2 grid gap-0.5">
          {PRICE_OPTIONS.map(([v, label]) => {
            const on = price === v;
            return (
              <label
                key={v}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-2 py-1.5 text-[13px] ${
                  on ? "bg-[#f4f3ff] font-semibold text-[#1a1c3d]" : "text-[#3f4254] hover:bg-[#f7f8fc]"
                }`}
              >
                <span
                  className={`grid h-4 w-4 shrink-0 place-items-center rounded-full border ${
                    on ? "border-[#4b46ff]" : "border-[#cfd3e2] bg-white"
                  }`}
                >
                  {on ? <span className="h-1.5 w-1.5 rounded-full bg-[#4b46ff]" /> : null}
                </span>
                <input type="radio" name="price" className="sr-only" checked={on} onChange={() => setPrice(v)} />
                {label}
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );

  return (
    <div className="msr-gutter py-5 pb-10">
      <p className="text-[13px] text-[#6b7280]">
        <Link to="/" className="hover:text-[#1a1c3d]">
          Home
        </Link>
        <span className="mx-1.5 text-[#c5c9d6]">/</span>
        {cat ? (
          <>
            <Link to="/category/all" className="hover:text-[#1a1c3d]">
              All products
            </Link>
            <span className="mx-1.5 text-[#c5c9d6]">/</span>
          </>
        ) : null}
        <span className="text-[#1a1c3d]">{title}</span>
      </p>

      <div className="sticky top-[4.25rem] z-20 mt-4 -mx-1 flex flex-wrap items-center justify-between gap-3 bg-[#f7f8fc]/95 px-1 py-3 backdrop-blur-md md:top-[7.25rem]">
        <div>
          <h1 className="text-[1.35rem] font-bold tracking-tight text-[#1a1c3d] md:text-[1.5rem]">{title}</h1>
          <p className="mt-0.5 text-[13px] text-[#6b7280]">
            {list.length ? `Showing ${visible.length} of ${list.length} products` : "0 products"}
          </p>
          {hasFilters ? (
            <div className="mt-2 flex flex-wrap gap-2">
              {brand ? <Chip onClear={() => setBrand("")}>{brand}</Chip> : null}
              {price ? <Chip onClear={() => setPrice("")}>{PRICE_OPTIONS.find(([v]) => v === price)?.[1]}</Chip> : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#e6e8ef] bg-white px-3.5 text-[13px] font-semibold text-[#1a1c3d] hover:border-[#c5c0ee]"
            onClick={() => setFiltersOpen(true)}
          >
            <SlidersHorizontal className="h-4 w-4" />
            Filters
            {filterCount ? (
              <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#0b1460] px-1 text-[11px] text-white">
                {filterCount}
              </span>
            ) : null}
          </button>
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value)}
            className="h-10 rounded-xl border border-[#e6e8ef] bg-white px-3 text-[13px] text-[#1a1c3d] outline-none focus:border-[#c5c0ee] focus:ring-2 focus:ring-[#7b6cff]/20"
          >
            <option value="popular">Sort: Popular</option>
            <option value="price-asc">Price: Low to high</option>
            <option value="price-desc">Price: High to low</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="mt-2 rounded-2xl border border-dashed border-[#e6e8ef] bg-white px-6 py-16 text-center">
          <p className="font-semibold text-[#1a1c3d]">No products match these filters</p>
          <p className="mt-1 text-sm text-[#6b7280]">Try another category, brand, or price range.</p>
          <button
            type="button"
            className="mt-4 text-sm font-semibold text-[#4b46ff]"
            onClick={() => {
              setBrand("");
              setPrice("");
            }}
          >
            Reset filters
          </button>
        </div>
      ) : (
        <>
          <div className={`mt-2 ${PRODUCT_GRID}`}>
            {visible.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
            {loading
              ? Array.from({ length: 4 }, (_, i) => <ProductSkeleton key={`sk-${i}`} />)
              : null}
          </div>
          <div ref={sentinelRef} className="h-8" aria-hidden />
          {hasMore ? (
            <p className="mt-2 pb-4 text-center text-[13px] text-[#6b7280]">
              {loading ? "Loading more products…" : "More products coming up"}
            </p>
          ) : (
            <p className="mt-2 pb-4 text-center text-[13px] text-[#6b7280]">
              You’ve seen all {list.length} products
            </p>
          )}
        </>
      )}

      {filtersOpen ? (
        <div className="fixed inset-0 z-50 flex" role="dialog" aria-modal="true" aria-label="Filters">
          <button type="button" className="absolute inset-0 bg-[#070b2e]/45" aria-label="Close filters" onClick={() => setFiltersOpen(false)} />
          <div className="relative flex h-full w-[min(22rem,92vw)] flex-col bg-white shadow-[8px_0_32px_rgba(8,10,61,0.18)]">
            <div className="flex shrink-0 items-center justify-between border-b border-[#eceef4] px-5 py-4">
              <p className="text-[15px] font-bold text-[#1a1c3d]">Filters</p>
              <div className="flex items-center gap-3">
                {hasFilters ? (
                  <button
                    type="button"
                    className="text-[12px] font-semibold text-[#4b46ff]"
                    onClick={() => {
                      setBrand("");
                      setPrice("");
                    }}
                  >
                    Clear all
                  </button>
                ) : null}
                <button type="button" className="text-[#6b7280] hover:text-[#1a1c3d]" onClick={() => setFiltersOpen(false)} aria-label="Close">
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>
            <div className="msr-pane min-h-0 flex-1 overflow-y-auto">{filters}</div>
            <div className="shrink-0 border-t border-[#eceef4] p-4">
              <button
                type="button"
                className="h-11 w-full rounded-xl bg-[#0b1460] text-sm font-semibold text-white hover:bg-[#070b2e]"
                onClick={() => setFiltersOpen(false)}
              >
                Show {list.length} products
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ProductSkeleton() {
  return (
    <div className="animate-pulse rounded-[14px] border border-[#e8eaef] bg-white p-4">
      <div className="h-[128px] rounded-xl bg-[#eef0f5] sm:h-[144px]" />
      <div className="mt-3 h-4 w-4/5 rounded bg-[#eef0f5]" />
      <div className="mt-2 h-3 w-1/3 rounded bg-[#eef0f5]" />
      <div className="mt-6 h-8 rounded-full bg-[#eef0f5]" />
    </div>
  );
}

function Chip({ children, onClear }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full border border-[#e0e2f0] bg-white px-2.5 py-1 text-[12px] font-medium text-[#1a1c3d]">
      {children}
      <button type="button" onClick={onClear} className="text-[#6b7280] hover:text-[#1a1c3d]" aria-label="Remove filter">
        <X className="h-3 w-3" />
      </button>
    </span>
  );
}

function FilterLink({ to, active, children, onPick }) {
  return (
    <Link
      to={to}
      onClick={onPick}
      className={`rounded-lg px-2.5 py-2 text-[13px] ${
        active ? "bg-[#f4f3ff] font-semibold text-[#4b46ff]" : "text-[#3f4254] hover:bg-[#f7f8fc] hover:text-[#1a1c3d]"
      }`}
    >
      {children}
    </Link>
  );
}
