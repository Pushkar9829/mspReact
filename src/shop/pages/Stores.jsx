/**
 * /stores — public store directory (GET /tenants/public): search by name, filter by city, sort, paged.
 * The query, city, sort and page live in the URL so the list is shareable.
 * Hero stats come from one directory overview request (first 100 stores); city and product totals are
 * shown only when that overview covers every store, so they are never partial numbers.
 */
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, MapPin, RotateCcw, Search, Store as StoreIcon, X } from "lucide-react";
import { usePublicStores } from "../hooks/index.js";
import { Breadcrumbs, Button, EmptyState, Notice, Skeleton, StoreTile, cn } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { displayName } from "../lib/text.js";

const LIMIT = 24;
const OVERVIEW_LIMIT = 100;
const SORTS = [
  { value: "name", label: "A–Z" },
  { value: "products", label: "Most products" },
  { value: "rating", label: "Top rated" },
  { value: "newest", label: "Newest" },
];
const GRID = "grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";
const CHIP =
  "inline-flex h-9 shrink-0 items-center gap-1.5 rounded-full border px-3.5 text-shop-sm font-medium transition-colors pointer-coarse:h-11";
const chipCls = (on) => cn(CHIP, on ? "border-shop-ink bg-shop-ink text-white" : "border-shop-line-strong bg-shop-card text-shop-ink hover:border-shop-primary");

function Stat({ label, one, value }) {
  return (
    <div className="rounded-full bg-white/10 px-3.5 py-1.5 ring-1 ring-white/15">
      <dt className="sr-only">{label}</dt>
      <dd>
        <span className="font-bold tabular-nums">{value}</span> {value === 1 ? one : label}
      </dd>
    </div>
  );
}

export default function Stores() {
  useDocumentTitle("Sellers");
  const [params, setParams] = useSearchParams();
  const q = params.get("q") || "";
  const city = params.get("city") || "";
  const sort = SORTS.some((s) => s.value === params.get("sort")) ? params.get("sort") : "name";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);
  // A new page starts at the top of the list.
  useEffect(() => {
    if (page > 1) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [page]);

  const update = (patch) =>
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      for (const [k, v] of Object.entries(patch)) {
        if (!v || (k === "sort" && v === "name") || (k === "page" && v === 1)) next.delete(k);
        else next.set(k, String(v));
      }
      return next;
    });

  const res = usePublicStores({ ...(q ? { q } : {}), ...(city ? { city } : {}), sort, page, limit: LIMIT });
  const stores = res.data?.stores || [];
  const meta = res.data?.meta;

  // Directory overview for the hero stats and the city chips.
  const overview = usePublicStores({ limit: OVERVIEW_LIMIT });
  const all = overview.data?.stores || [];
  const allTotal = overview.data?.meta?.total ?? null;
  const complete = allTotal != null && all.length >= allTotal;
  const cities = useMemo(() => {
    const map = new Map();
    for (const s of all) {
      const c = String(s.city || "").trim();
      if (!c) continue;
      const key = c.toLowerCase();
      const row = map.get(key) || { name: displayName(c), count: 0 };
      row.count += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
  }, [all]);
  const totalProducts = complete ? all.reduce((n, s) => n + (Number(s.productCount) || 0), 0) : null;
  const cityChips = cities.slice(0, 10);
  const cityActiveMissing = city && !cityChips.some((c) => c.name.toLowerCase() === city.toLowerCase());

  const filtered = Boolean(q || city);
  const clearAll = () => {
    setTerm("");
    update({ q: "", city: "", page: 1 });
  };

  return (
    <div className="msr-gutter grid grid-cols-[minmax(0,1fr)] gap-5 py-5 md:py-6">
      {/* hero */}
      <section className="relative isolate overflow-hidden rounded-[1.5rem] bg-shop-navy px-5 py-7 text-white sm:px-8 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,rgba(233,185,73,0.22),transparent_55%),radial-gradient(60%_90%_at_0%_100%,rgba(15,122,74,0.35),transparent_60%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
          <div className="min-w-0">
            <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Sellers" }]} className="[&_a]:text-shop-on-navy-muted [&_a:hover]:text-white [&_span]:text-white/90" />
            <h1 className="mt-3 font-display text-shop-2xl font-bold sm:text-shop-3xl">Shop by seller</h1>
            <p className="mt-1.5 max-w-xl text-shop-base text-shop-on-navy-muted">
              Every store on the marketplace. Each order is invoiced by the seller, with their GSTIN on the bill.
            </p>
            <dl className="mt-4 flex flex-wrap gap-2 text-shop-sm" aria-live="polite">
              {overview.isPending ? (
                <Skeleton className="h-8 w-28 rounded-full bg-white/10" />
              ) : allTotal != null ? (
                <>
                  <Stat label="stores" one="store" value={allTotal} />
                  {complete && cities.length ? <Stat label="cities" one="city" value={cities.length} /> : null}
                  {totalProducts ? <Stat label="products" one="product" value={totalProducts} /> : null}
                </>
              ) : null}
            </dl>
          </div>
          <form
            role="search"
            className="relative block"
            onSubmit={(e) => {
              e.preventDefault();
              update({ q: term.trim(), page: 1 });
            }}
          >
            <label htmlFor="store-q" className="sr-only">
              Search sellers
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-shop-muted" strokeWidth={1.75} aria-hidden />
            <input
              id="store-q"
              type="search"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="Search by store name"
              enterKeyHint="search"
              className="h-12 w-full rounded-full bg-white pl-11 pr-24 text-shop-base text-shop-ink shadow-[0_8px_24px_-10px_rgba(0,0,0,0.5)] placeholder:text-shop-subtle focus:outline-none focus:ring-[3px] focus:ring-shop-gold/60 [&::-webkit-search-cancel-button]:hidden"
            />
            {term ? (
              <button
                type="button"
                onClick={() => {
                  setTerm("");
                  if (q) update({ q: "", page: 1 });
                }}
                className="absolute right-[4.75rem] top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-shop-muted hover:bg-shop-hover"
                aria-label="Clear search"
              >
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
            <button type="submit" className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-shop-primary px-4 text-shop-sm font-semibold text-white hover:bg-shop-primary-hover">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* filters */}
      <div className="grid gap-3">
        {cityChips.length > 1 || city ? (
          <div role="group" aria-label="Filter by city" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 sm:mx-0 sm:flex-wrap sm:px-0">
            <button type="button" aria-pressed={!city} onClick={() => update({ city: "", page: 1 })} className={chipCls(!city)}>
              All cities
            </button>
            {cityActiveMissing ? (
              <button type="button" aria-pressed aria-label={`City: ${displayName(city)}. Remove`} onClick={() => update({ city: "", page: 1 })} className={chipCls(true)}>
                <MapPin className="size-3.5" aria-hidden />
                {displayName(city)}
                <X className="size-3.5" aria-hidden />
              </button>
            ) : null}
            {cityChips.map((c) => {
              const on = city.toLowerCase() === c.name.toLowerCase();
              return (
                <button key={c.name} type="button" aria-pressed={on} onClick={() => update({ city: on ? "" : c.name, page: 1 })} className={chipCls(on)}>
                  <MapPin className="size-3.5" aria-hidden />
                  {c.name}
                  {complete ? <span className={cn("tabular-nums text-shop-xs", on ? "text-white/70" : "text-shop-muted")}>{c.count}</span> : null}
                </button>
              );
            })}
          </div>
        ) : null}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-shop-sm text-shop-muted" aria-live="polite">
            {meta ? (
              <>
                <span className="font-semibold text-shop-ink">{meta.total.toLocaleString("en-IN")}</span> store{meta.total === 1 ? "" : "s"}
                {q ? ` matching “${q}”` : ""}
                {city ? ` in ${displayName(city)}` : ""}
              </>
            ) : (
              " "
            )}
          </p>
          <div role="group" aria-label="Sort sellers" className="no-scrollbar flex max-w-full gap-1 overflow-x-auto">
            {SORTS.map((s) => (
              <button
                key={s.value}
                type="button"
                aria-pressed={sort === s.value}
                onClick={() => update({ sort: s.value, page: 1 })}
                className={cn(
                  "inline-flex h-9 shrink-0 items-center rounded-full px-3 text-shop-sm font-medium transition-colors pointer-coarse:h-11",
                  sort === s.value ? "bg-shop-primary-soft text-shop-primary-ink" : "text-shop-muted hover:text-shop-ink"
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {res.error && !stores.length ? (
        <Notice tone="danger" title="We couldn’t load the sellers" action={<Button variant="secondary" leftIcon={RotateCcw} onClick={() => res.refetch()}>Try again</Button>}>
          {res.error.message || "Check your connection and try again."}
        </Notice>
      ) : res.isPending ? (
        <div className={GRID} role="status" aria-label="Loading sellers">
          {Array.from({ length: 8 }, (_, i) => (
            <Skeleton key={i} className="h-24 rounded-[1.25rem]" />
          ))}
        </div>
      ) : stores.length ? (
        <ul className={cn(GRID, "transition-opacity", res.isPlaceholderData && "opacity-60")} aria-busy={res.isPlaceholderData || undefined}>
          {stores.map((s) => (
            <li key={s.id}>
              <StoreTile store={s} className="h-full rounded-[1.25rem] hover:border-shop-primary/40" />
            </li>
          ))}
        </ul>
      ) : (
        <EmptyState
          icon={StoreIcon}
          title={filtered ? `No seller matches${q ? ` “${q}”` : ""}${city ? ` in ${displayName(city)}` : ""}` : "No sellers yet"}
          description={filtered ? "Try another name or city, or browse all products." : "Sellers will appear here once their stores are live."}
          action={
            filtered ? (
              <>
                <Button variant="secondary" onClick={clearAll}>
                  Show all sellers
                </Button>
                <Button to="/category/all">Browse products</Button>
              </>
            ) : (
              <Button to="/category/all">Browse products</Button>
            )
          }
        />
      )}

      {meta && meta.pages > 1 ? (
        <nav aria-label="Pages" className="flex items-center justify-center gap-3">
          <Button variant="secondary" leftIcon={ChevronLeft} disabled={page <= 1} onClick={() => update({ page: page - 1 })}>
            Previous
          </Button>
          <span className="text-shop-sm tabular-nums text-shop-muted">
            Page {meta.page} of {meta.pages}
          </span>
          <Button variant="secondary" rightIcon={ChevronRight} disabled={page >= meta.pages} onClick={() => update({ page: page + 1 })}>
            Next
          </Button>
        </nav>
      ) : null}
    </div>
  );
}
