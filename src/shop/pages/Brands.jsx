/**
 * /brands — brand directory.
 *  - Hero: title, live stats and an instant brand search.
 *  - Top brands: the brands with the most products as showcase cards with a mosaic of their real
 *    product photos (falls back to a tinted monogram).
 *  - A–Z: a sticky letter bar (letters without brands are disabled) and a compact directory grouped
 *    by letter. Each brand opens the server listing filtered by it (/category/all?brand=<slug>).
 * Names come from GET /brands/public; product counts from the search brand facet, so only brands with
 * live products are listed.
 */
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Search, Sparkles, Tags, X } from "lucide-react";
import { useBrands, useProducts } from "../hooks/index.js";
import { Breadcrumbs, Button, EmptyState, ImageWithFallback, Notice, Skeleton, cn } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { displayName, initialsOf } from "../lib/text.js";

const FACET_QUERY = { facets: true };
const LETTERS = ["#", ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ"];
const TONES = [
  "from-[#fbf3dc] to-[#f3e2b3] text-[#7a5600]",
  "from-[#e8f4ee] to-[#c9e5d6] text-[#0b5a37]",
  "from-[#e7eefc] to-[#cfdcf6] text-[#23468f]",
  "from-[#fdeee5] to-[#f6d2bb] text-[#a63c08]",
  "from-[#f3ecfb] to-[#e0d0f3] text-[#5b3a8c]",
];
function toneFor(key) {
  let h = 0;
  for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return TONES[h % TONES.length];
}
const letterOf = (name) => (/[a-z]/i.test(name?.[0] || "") ? name[0].toUpperCase() : "#");

function Monogram({ brand, className }) {
  if (brand.logo)
    return (
      <span className={cn("grid shrink-0 place-items-center overflow-hidden rounded-xl bg-white ring-1 ring-shop-line", className)}>
        <img src={brand.logo} alt="" loading="lazy" className="size-full object-contain p-1.5" />
      </span>
    );
  return (
    <span aria-hidden className={cn("grid shrink-0 place-items-center rounded-xl bg-gradient-to-br font-display font-bold", toneFor(brand.slug), className)}>
      {initialsOf(brand.display)}
    </span>
  );
}

/**
 * Showcase card for a top brand. Same structure for every brand, whatever photos exist:
 * header (badge, name, product count, arrow) and up to three of the brand's real products as
 * thumbnails with names — a product without a photo gets a tinted initials tile.
 */
function FeaturedBrand({ brand, rank }) {
  const res = useProducts({ brand: [brand.slug] }, { limit: 3 });
  const href = `/category/all?brand=${encodeURIComponent(brand.slug)}`;
  return (
    <li className="group/card relative flex min-w-0 flex-col rounded-[1.25rem] border border-shop-line bg-shop-card p-4 transition-[box-shadow,border-color] duration-300 hover:border-shop-line-strong hover:shadow-[0_18px_40px_-22px_rgba(11,16,51,0.45)]">
      <div className="flex items-center gap-3">
        <Monogram brand={brand} className="size-12 text-shop-md" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Link to={href} className="truncate font-display text-shop-md font-bold text-shop-ink hover:text-shop-primary-ink">
              {brand.display}
            </Link>
            {rank === 0 && brand.count > 1 ? (
              <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-shop-gold-soft px-2 py-0.5 text-shop-xs font-semibold text-shop-gold-ink">
                <Sparkles className="size-3" aria-hidden /> #1
              </span>
            ) : null}
          </div>
          <p className="text-shop-sm text-shop-muted">
            {brand.count} product{brand.count === 1 ? "" : "s"}
          </p>
        </div>
        <Link
          to={href}
          aria-label={`Shop all ${brand.display}`}
          className="grid size-9 shrink-0 place-items-center rounded-full border border-shop-line text-shop-ink transition-colors hover:border-shop-primary hover:bg-shop-primary hover:text-white group-hover/card:border-shop-primary"
        >
          <ArrowUpRight className="size-4" aria-hidden />
        </Link>
      </div>

      <ul className="mt-4 grid gap-2" style={{ gridTemplateColumns: `repeat(${res.isPending ? 3 : Math.max(1, Math.min(3, res.products.length))}, minmax(0, 1fr))` }}>
        {res.isPending
          ? Array.from({ length: 3 }, (_, i) => (
              <li key={i}>
                <Skeleton className="aspect-square rounded-xl" />
                <Skeleton className="mt-1.5 h-3 w-4/5" />
              </li>
            ))
          : res.products.slice(0, 3).map((p) => (
              <li key={p.id} className="min-w-0">
                <Link to={`/product/${p.slug}`} className="group/p block">
                  <ImageWithFallback
                    src={p.image}
                    alt=""
                    fit="cover"
                    fallbackName={displayName(p.name)}
                    ratio={res.products.length === 1 ? "auto" : "square"}
                    className={cn("rounded-xl ring-1 ring-black/5 [&_span]:text-shop-lg", res.products.length === 1 && "aspect-[2.4/1]", res.products.length === 2 && "aspect-[4/3]")}
                    imgClassName="transition-transform duration-300 group-hover/p:scale-[1.05]"
                  />
                  <span className="mt-1.5 line-clamp-2 text-shop-xs leading-snug text-shop-text group-hover/p:text-shop-primary-ink">{displayName(p.name)}</span>
                </Link>
              </li>
            ))}
      </ul>
      <div aria-hidden className="flex-1" />

      <Link
        to={href}
        className="mt-3 inline-flex min-h-10 items-center justify-center gap-1.5 rounded-full bg-shop-page text-shop-sm font-semibold text-shop-ink ring-1 ring-shop-line transition-colors hover:bg-shop-primary hover:text-white hover:ring-shop-primary pointer-coarse:min-h-11"
      >
        Shop {brand.display} <ArrowUpRight className="size-4" aria-hidden />
      </Link>
    </li>
  );
}

export default function Brands() {
  useDocumentTitle("Brands");
  const brands = useBrands();
  const facetQ = useProducts(FACET_QUERY, { limit: 1 });
  const [query, setQuery] = useState("");

  const rows = useMemo(() => {
    const facet = facetQ.data?.facets?.brands;
    const counts = new Map((facet || []).map((b) => [b.slug, b.count]));
    // Brands only in the facet (not in /brands/public) still count.
    const base = new Map((brands.data || []).map((b) => [b.slug, b]));
    for (const f of facet || []) if (!base.has(f.slug)) base.set(f.slug, { slug: f.slug, name: f.name });
    const list = [...base.values()].map((b) => ({ ...b, display: displayName(b.name), count: counts.get(b.slug) ?? null }));
    const live = facet ? list.filter((b) => b.count > 0) : list;
    return live.sort((a, b) => a.display.localeCompare(b.display));
  }, [brands.data, facetQ.data]);

  const term = query.trim().toLowerCase();
  const shown = term ? rows.filter((b) => b.display.toLowerCase().includes(term)) : rows;
  const featured = useMemo(() => [...rows].filter((b) => b.count > 0).sort((a, b) => b.count - a.count || a.display.localeCompare(b.display)).slice(0, 4), [rows]);
  const groups = useMemo(() => {
    const map = new Map();
    for (const b of shown) {
      const l = letterOf(b.display);
      if (!map.has(l)) map.set(l, []);
      map.get(l).push(b);
    }
    return [...map.entries()].sort((a, b) => LETTERS.indexOf(a[0]) - LETTERS.indexOf(b[0]));
  }, [shown]);
  const present = new Set(groups.map(([l]) => l));
  const pending = brands.isPending || facetQ.isPending;
  const totalProducts = rows.reduce((n, b) => n + (b.count || 0), 0);

  return (
    <div className="msr-gutter grid grid-cols-[minmax(0,1fr)] gap-8 py-5 md:py-6">
      {/* hero */}
      <section className="relative isolate overflow-hidden rounded-[1.5rem] bg-shop-navy px-5 py-7 text-white sm:px-8 sm:py-9">
        <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_120%_at_100%_0%,rgba(233,185,73,0.22),transparent_55%),radial-gradient(60%_90%_at_0%_100%,rgba(15,122,74,0.35),transparent_60%)]" />
        <div className="relative grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,26rem)] lg:items-end">
          <div className="min-w-0">
            <Breadcrumbs items={[{ label: "Home", to: "/" }, { label: "Brands" }]} className="[&_a]:text-shop-on-navy-muted [&_a:hover]:text-white [&_span]:text-white/90" />
            <h1 className="mt-3 font-display text-shop-2xl font-bold sm:text-shop-3xl">Shop by brand</h1>
            <p className="mt-1.5 max-w-xl text-shop-base text-shop-on-navy-muted">Genuine stock of the brands your customers ask for, at wholesale prices from verified sellers.</p>
            <dl className="mt-4 flex flex-wrap gap-2 text-shop-sm">
              <div className="rounded-full bg-white/10 px-3.5 py-1.5 ring-1 ring-white/15">
                <dt className="sr-only">Brands</dt>
                <dd>{pending ? "…" : <><span className="font-bold">{rows.length}</span> brands</>}</dd>
              </div>
              <div className="rounded-full bg-white/10 px-3.5 py-1.5 ring-1 ring-white/15">
                <dt className="sr-only">Products</dt>
                <dd>{pending ? "…" : <><span className="font-bold">{totalProducts}</span> products</>}</dd>
              </div>
            </dl>
          </div>
          <label className="relative block">
            <span className="sr-only">Find a brand</span>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-shop-muted" aria-hidden />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Find a brand — Tata, Amul, Parle…"
              className="h-12 w-full rounded-full bg-white pl-11 pr-11 text-shop-base text-shop-ink shadow-[0_8px_24px_-10px_rgba(0,0,0,0.5)] placeholder:text-shop-subtle focus:outline-none focus:ring-[3px] focus:ring-shop-gold/60 [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center rounded-full text-shop-muted hover:bg-shop-hover" aria-label="Clear brand search">
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </label>
        </div>
      </section>

      {brands.error ? (
        <Notice tone="danger" title="We couldn’t load brands" action={<Button variant="secondary" onClick={() => brands.refetch()}>Try again</Button>}>
          {brands.error.message}
        </Notice>
      ) : null}

      {/* top brands */}
      {!term && (pending || featured.length) ? (
        <section aria-labelledby="top-brands">
          <div className="mb-4">
            <h2 id="top-brands" className="font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
              Top brands
            </h2>
            <p className="mt-0.5 text-shop-sm text-shop-muted">The brands with the widest range on the marketplace</p>
          </div>
          <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {pending
              ? Array.from({ length: 4 }, (_, i) => (
                  <li key={i}>
                    <Skeleton className="h-72 rounded-[1.25rem]" />
                  </li>
                ))
              : featured.map((b, i) => <FeaturedBrand key={b.slug} brand={b} rank={i} />)}
          </ul>
        </section>
      ) : null}

      {/* A–Z */}
      <section aria-labelledby="all-brands" className="min-w-0">
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <h2 id="all-brands" className="font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
            {term ? `Brands matching “${query.trim()}”` : "All brands A–Z"}
          </h2>
          {!pending ? <p className="text-shop-sm text-shop-muted">{shown.length} brand{shown.length === 1 ? "" : "s"}</p> : null}
        </div>

        {!term && groups.length > 1 ? (
          <nav aria-label="Jump to letter" className="sticky top-[7.5rem] z-10 -mx-4 mb-4 border-y border-shop-line bg-shop-page/95 px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-full sm:border sm:px-2">
            <ol className="no-scrollbar flex gap-0.5 overflow-x-auto">
              {LETTERS.map((l) =>
                present.has(l) ? (
                  <li key={l}>
                    <a href={`#brands-${l}`} className="grid size-8 shrink-0 place-items-center rounded-full text-shop-sm font-semibold text-shop-ink hover:bg-shop-primary hover:text-white pointer-coarse:size-11">
                      {l}
                    </a>
                  </li>
                ) : (
                  <li key={l} aria-hidden className="grid size-8 shrink-0 place-items-center text-shop-sm text-shop-line-strong pointer-coarse:size-11">
                    {l}
                  </li>
                )
              )}
            </ol>
          </nav>
        ) : null}

        {pending ? (
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5" role="status" aria-label="Loading brands">
            {Array.from({ length: 10 }, (_, i) => (
              <Skeleton key={i} className="h-14 rounded-xl" />
            ))}
          </div>
        ) : !shown.length ? (
          <EmptyState
            icon={Tags}
            title={term ? `No brand matches “${query.trim()}”` : "No brands yet"}
            description="Try another spelling, or search all products for it."
            action={<Button to={term ? `/category/all?q=${encodeURIComponent(query.trim())}` : "/category/all"}>Search products</Button>}
            compact
          />
        ) : (
          <div className="overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card">
            {groups.map(([letter, list], i) => (
              <section
                key={letter}
                id={`brands-${letter}`}
                aria-labelledby={`brands-${letter}-h`}
                className={cn("flex scroll-mt-44 items-start gap-4 px-4 py-3.5 sm:px-5", i > 0 && "border-t border-shop-line")}
              >
                <h3 id={`brands-${letter}-h`} className="grid size-10 shrink-0 place-items-center rounded-xl bg-shop-ink font-display text-shop-md font-bold text-white">
                  {letter}
                </h3>
                <ul className="flex min-w-0 flex-1 flex-wrap gap-2">
                  {list.map((b) => (
                    <li key={b.slug}>
                      <Link
                        to={`/category/all?brand=${encodeURIComponent(b.slug)}`}
                        className="group inline-flex h-10 items-center gap-2 rounded-full border border-shop-line bg-shop-page py-1 pl-1 pr-3.5 transition-colors hover:border-shop-primary hover:bg-shop-primary-soft pointer-coarse:h-11"
                      >
                        <Monogram brand={b} className="size-8 rounded-full text-shop-xs" />
                        <span className="text-shop-sm font-semibold text-shop-ink group-hover:text-shop-primary-ink">{b.display}</span>
                        {b.count != null ? <span className="text-shop-xs tabular-nums text-shop-subtle">{b.count}</span> : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
