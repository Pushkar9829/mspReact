/**
 * Server-paged product listing shared by the category / search page and the content listings
 * (Deals, New launches, Bulk, Store). Every filter, the sort and the grid/list view live in the URL
 * (useShopFilters), so links are shareable and back/forward restores the exact list.
 *
 *   <ProductListing category="staples" title="Staples" breadcrumbs={[…]} />
 *   <ProductListing fixed={{ tag: "deal" }} hide={["category"]} title="Deals" />
 */
import { useMemo } from "react";
import { Link } from "react-router-dom";
import { LayoutGrid, List, PackageSearch, RotateCcw, SearchX } from "lucide-react";
import { useBrands, useCategories, useProductSearch, useShopFilters } from "../../hooks/index.js";
import {
  Button,
  EmptyState,
  FilterChips,
  FilterPanel,
  FilterSheet,
  Notice,
  PRODUCT_GRID,
  ProductCard,
  ProductCardSkeleton,
  RowSkeleton,
  ShopPageHeader,
  Skeleton,
  SortSelect,
  cn,
} from "../../components/ui/index.js";

const PAGE_SIZE = 24;

function ViewToggle({ f }) {
  const view = f.filters.view;
  const btn = (value, Icon, label) => (
    <button
      type="button"
      onClick={() => f.set("view", value, { replace: true })}
      aria-pressed={view === value}
      aria-label={label}
      title={label}
      className={cn("grid size-9 place-items-center rounded-full transition-colors pointer-coarse:size-11", view === value ? "bg-shop-ink text-white" : "text-shop-muted hover:text-shop-ink")}
    >
      <Icon className="size-4" strokeWidth={2} aria-hidden />
    </button>
  );
  return (
    <div role="group" aria-label="Layout" className="flex items-center gap-0.5 rounded-full border border-shop-line-strong bg-shop-card p-0.5">
      {btn("grid", LayoutGrid, "Grid view")}
      {btn("list", List, "List view with quantity steppers")}
    </div>
  );
}

function QuickChip({ on, onClick, children }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "inline-flex h-9 shrink-0 items-center rounded-full border px-3.5 text-shop-sm font-medium transition-colors pointer-coarse:h-11",
        on ? "border-shop-primary bg-shop-primary-soft text-shop-primary-ink" : "border-shop-line-strong bg-shop-card text-shop-ink hover:border-shop-primary"
      )}
    >
      {children}
    </button>
  );
}

/** Phone / tablet: one-tap filters above the results. */
function QuickChips({ f, facets, hide }) {
  const brands = (facets?.brands || []).slice(0, 6);
  return (
    <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:hidden" aria-label="Quick filters" role="group">
      <QuickChip on={f.filters.inStock} onClick={() => f.set("inStock", !f.filters.inStock)}>
        In stock
      </QuickChip>
      {!hide.includes("bulk") ? (
        <QuickChip on={f.filters.bulk} onClick={() => f.set("bulk", !f.filters.bulk)}>
          Bulk prices
        </QuickChip>
      ) : null}
      {facets?.discounts?.some((d) => d.count > 0) || f.filters.discount ? (
        <QuickChip on={Boolean(f.filters.discount)} onClick={() => f.set("discount", f.filters.discount ? "" : "10")}>
          On discount
        </QuickChip>
      ) : null}
      {f.filters.sort !== "price-asc" ? (
        <QuickChip on={false} onClick={() => f.set("sort", "price-asc")}>
          Lowest price
        </QuickChip>
      ) : null}
      {brands.map((b) => (
        <QuickChip key={b.slug} on={f.filters.brand.includes(b.slug)} onClick={() => f.toggle("brand", b.slug)}>
          {b.name}
        </QuickChip>
      ))}
    </div>
  );
}

function ResultsSkeleton({ view }) {
  if (view === "list")
    return (
      <div className="grid gap-3" role="status" aria-label="Loading products">
        {Array.from({ length: 6 }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    );
  return (
    <div className={PRODUCT_GRID} role="status" aria-label="Loading products">
      {Array.from({ length: 8 }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

function Results({ products, view, bulk, busy }) {
  return (
    <div className={cn(view === "list" ? "grid gap-3" : PRODUCT_GRID, "transition-opacity", busy && "opacity-60")} aria-busy={busy || undefined}>
      {products.map((p, i) => (
        <ProductCard key={p.id} product={p} variant={view === "list" ? "list" : "grid"} bulk={bulk} priority={i < 4} />
      ))}
    </div>
  );
}

/**
 * Spelling notice from the search API (meta.didYouMean / meta.matchedBy). With results the server
 * already searched the corrected words ("Showing results for …"); with none it is only a suggestion.
 */
function SpellingNotice({ q, meta, hasResults, onSearch }) {
  const dym = meta?.didYouMean;
  if (!q || !dym || dym.toLowerCase() === q.toLowerCase()) return null;
  if (hasResults)
    return (
      <Notice tone="info" icon={SearchX}>
        No exact matches for <strong>“{q}”</strong>. Showing results for <strong>“{dym}”</strong>.
      </Notice>
    );
  return (
    <Notice tone="info" icon={SearchX}>
      Did you mean{" "}
      <button type="button" className="inline-flex min-h-11 items-center font-semibold underline underline-offset-2" onClick={() => onSearch(dym)}>
        “{dym}”
      </button>
      ?
    </Notice>
  );
}

export function ProductListing({
  category = "",
  fixed = {},
  hide: hideProp = [],
  title,
  documentTitle,
  description,
  kicker,
  breadcrumbs,
  intro,
  subnav,
  headerActions,
  bulkCards = false,
  emptyTitle = "No products here yet",
  emptyDescription = "Sellers add new stock every week. Browse everything in the meantime.",
}) {
  const cats = useCategories();
  const brands = useBrands();
  const hide = hideProp;

  const f0 = useShopFilters({ category });
  const filters = useMemo(() => ({ ...f0.filters, ...fixed, facets: true }), [f0.filters, fixed]);
  const s = useProductSearch(filters, { pageSize: PAGE_SIZE });

  // Chip labels (slugs / ids → names) from the brand list and the search facets.
  const labels = useMemo(
    () => ({
      brand: Object.fromEntries([...(brands.data || []), ...(s.facets?.brands || [])].map((b) => [b.slug, b.name])),
      seller: Object.fromEntries((s.facets?.sellers || []).flatMap((x) => [[String(x.id), x.name], [x.slug, x.name]])),
    }),
    [brands.data, s.facets]
  );
  const f = useShopFilters({ category, labels });
  // One seller in the whole result set: the seller group adds nothing (unless one is selected).
  const facets = useMemo(() => {
    if (!s.facets) return null;
    const sellers = s.facets.sellers || [];
    return { ...s.facets, sellers: sellers.length > 1 || f.filters.seller.length ? sellers : [] };
  }, [s.facets, f.filters.seller.length]);

  const q = f.filters.q?.trim() || "";
  const view = f.filters.view;
  const settled = !s.isPending && !s.isPlaceholderData && !s.error;
  const meta = s.meta;
  const spelling = settled ? <SpellingNotice q={q} meta={meta} hasResults={s.products.length > 0} onSearch={(v) => f.set("q", v)} /> : null;
  const panelProps = { f, categories: hide.includes("category") ? null : cats.data, brands: brands.data || [], facets, hide };

  const countText =
    s.total == null ? null : `${s.total.toLocaleString("en-IN")} product${s.total === 1 ? "" : "s"}${q ? ` for “${q}”` : ""}`;

  let body;
  if (s.error && !s.products.length) {
    body = (
      <Notice tone="danger" title="We couldn’t load products" action={<Button variant="secondary" leftIcon={RotateCcw} onClick={() => s.refetch()}>Try again</Button>}>
        {s.error.message || "Check your connection and try again."}
      </Notice>
    );
  } else if (s.isPending) {
    body = <ResultsSkeleton view={view} />;
  } else if (s.products.length) {
    body = <Results products={s.products} view={view} bulk={bulkCards} busy={s.isPlaceholderData} />;
  } else if (q) {
    body = (
      <EmptyState
        icon={SearchX}
        title={`No results for “${q}”`}
        description={`Check the spelling, try a shorter or more general word (for example a brand or “atta”, “tea”, “oil”)${f.activeCount ? ", or clear your filters" : ""}.`}
        action={
          <>
            {f.activeCount ? (
              <Button variant="secondary" onClick={f.reset}>
                Clear filters
              </Button>
            ) : null}
            {category && category !== "all" ? <Button to={`/category/all?q=${encodeURIComponent(q)}`}>Search all categories</Button> : <Button to="/category/all">Browse all products</Button>}
          </>
        }
      >
        {cats.data?.roots?.length ? (
          <nav aria-label="Popular categories" className="mt-2 flex w-full flex-wrap justify-center gap-2">
            {cats.data.roots.slice(0, 6).map((c) => (
              <Link key={c.slug} to={`/category/${c.slug}`} className="inline-flex min-h-11 items-center rounded-full border border-shop-line-strong px-4 text-shop-sm font-medium text-shop-ink hover:border-shop-primary">
                {c.name}
              </Link>
            ))}
          </nav>
        ) : null}
      </EmptyState>
    );
  } else if (f.activeCount) {
    body = (
      <EmptyState
        icon={PackageSearch}
        title="No products match these filters"
        description="Remove a filter below, or clear them all to see every product here."
        action={
          <Button variant="secondary" onClick={f.reset}>
            Clear all filters
          </Button>
        }
      />
    );
  } else {
    body = <EmptyState icon={PackageSearch} title={emptyTitle} description={emptyDescription} action={<Button to="/category/all">Browse all products</Button>} />;
  }

  return (
    <div className="msr-gutter grid grid-cols-[minmax(0,1fr)] gap-5 py-5 md:py-6">
      <ShopPageHeader
        title={
          <span className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span>{title}</span>
            <span className="text-shop-sm font-medium text-shop-muted" aria-live="polite">
              {s.total == null ? <Skeleton className="inline-block h-4 w-24 align-middle" /> : `${s.total.toLocaleString("en-IN")} product${s.total === 1 ? "" : "s"}`}
            </span>
          </span>
        }
        documentTitle={documentTitle || (typeof title === "string" ? title : undefined)}
        description={description}
        kicker={kicker}
        breadcrumbs={breadcrumbs}
        actions={headerActions}
      />
      {intro}
      {subnav}
      <div className="listing-layout">
        <aside className="filter-rail hidden self-start rounded-[1.1rem] border border-shop-line bg-shop-card px-3.5 py-2 lg:block" aria-label="Filters">
          <h2 className="sr-only">Filters</h2>
          <FilterPanel {...panelProps} heading />
        </aside>
        <section className="grid min-w-0 content-start gap-3" aria-label="Products">
          {/* phones/tablets: Filters + Sort side by side */}
          <div className="grid grid-cols-2 gap-2 lg:hidden">
            <FilterSheet className="w-full" total={s.total} {...panelProps} />
            <SortSelect f={f} compact className="w-full" />
          </div>
          {/* desktop toolbar: active filters on the left, sort + layout on the right */}
          <div className="hidden min-h-10 items-center justify-between gap-3 lg:flex">
            <div className="min-w-0 flex-1">
              {f.chips.length ? <FilterChips f={f} /> : <p className="text-shop-sm text-shop-muted">{countText ? `Showing ${countText}` : " "}</p>}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              <SortSelect f={f} />
              <ViewToggle f={f} />
            </div>
          </div>
          <QuickChips f={f} facets={facets} hide={hide} />
          <div className="lg:hidden">
            <FilterChips f={f} />
          </div>
          {meta?.capped ? <p className="text-shop-xs text-shop-muted">Showing the best matches from the first 1,000 products. Add a filter to narrow it down.</p> : null}
          {spelling}
          {body}
          {s.products.length && s.total != null ? (
            <div className="grid justify-items-center gap-2 pt-2">
              <p className="text-shop-sm text-shop-muted">
                Showing {s.products.length.toLocaleString("en-IN")} of {s.total.toLocaleString("en-IN")}
              </p>
              {s.hasNextPage ? (
                <Button variant="secondary" size="lg" loading={s.isFetchingNextPage} onClick={() => s.fetchNextPage()} className="min-w-56">
                  Load more products
                </Button>
              ) : null}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  );
}

export default ProductListing;
