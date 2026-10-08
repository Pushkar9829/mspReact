import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpDown, Check, ChevronDown, Search, SlidersHorizontal, X } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./Button.jsx";
import { ShopSheet } from "./Overlays.jsx";
import { SORTS } from "../../hooks/useShopFilters.js";
import { categoryCounter } from "../../lib/categoryLook.js";
import { displayName } from "../../lib/text.js";

/* ------------------------------------------------------------------ primitives */

/** Collapsible filter section with a "selected" count badge. */
function Group({ title, count = 0, children, defaultOpen = true }) {
  return (
    <details open={defaultOpen} className="group border-b border-shop-line py-1 last:border-0">
      <summary className="flex min-h-11 cursor-pointer list-none items-center justify-between gap-2 rounded-lg text-shop-sm font-semibold text-shop-ink [&::-webkit-details-marker]:hidden">
        <span className="flex items-center gap-2">
          {title}
          {count ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-shop-primary px-1.5 text-shop-xs font-bold leading-none text-white tabular-nums">{count}</span> : null}
        </span>
        <ChevronDown className="size-4 text-shop-muted transition-transform duration-200 group-open:rotate-180" aria-hidden />
      </summary>
      <div className="pb-3 pt-0.5">{children}</div>
    </details>
  );
}

/** Compact checkbox row (36px; 44px on touch) with an optional count. */
function CheckRow({ checked, onChange, label, count }) {
  return (
    <label className="group flex min-h-9 cursor-pointer items-center gap-2.5 rounded-lg px-1.5 text-shop-sm hover:bg-shop-hover pointer-coarse:min-h-11">
      <input type="checkbox" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden
        className={cn(
          "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-shop-primary peer-focus-visible:ring-offset-1",
          checked ? "border-shop-primary bg-shop-primary text-white" : "border-shop-line-strong bg-shop-card group-hover:border-shop-primary"
        )}
      >
        {checked ? <Check className="size-3.5" strokeWidth={3} /> : null}
      </span>
      <span className={cn("min-w-0 flex-1 truncate", checked ? "font-semibold text-shop-ink" : "text-shop-text")}>{label}</span>
      {count != null ? <span className="shrink-0 text-shop-xs tabular-nums text-shop-subtle">{count}</span> : null}
    </label>
  );
}

/** On/off switch row. */
function SwitchRow({ checked, onChange, label, hint }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center justify-between gap-3 rounded-lg px-1.5 hover:bg-shop-hover">
      <span className="min-w-0">
        <span className="block text-shop-sm text-shop-ink">{label}</span>
        {hint ? <span className="block text-shop-xs text-shop-muted">{hint}</span> : null}
      </span>
      <input type="checkbox" role="switch" className="peer sr-only" checked={checked} onChange={onChange} />
      <span
        aria-hidden
        className={cn(
          "relative h-6 w-10 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-shop-primary peer-focus-visible:ring-offset-1",
          checked ? "bg-shop-primary" : "bg-shop-line-strong"
        )}
      >
        <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
      </span>
    </label>
  );
}

/** Small toggle chip. */
function Chip({ on, onClick, children, title }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      title={title}
      className={cn(
        "inline-flex h-8 items-center gap-1 rounded-full border px-3 text-shop-xs font-medium transition-colors pointer-coarse:h-11",
        on ? "border-shop-primary bg-shop-primary-soft font-semibold text-shop-primary-ink" : "border-shop-line-strong bg-shop-card text-shop-text hover:border-shop-primary"
      )}
    >
      {on ? <Check className="size-3" strokeWidth={3} aria-hidden /> : null}
      {children}
    </button>
  );
}

function CatLink({ to, active, children, count, level = 0 }) {
  return (
    <Link
      to={to}
      aria-current={active ? "page" : undefined}
      className={cn(
        "flex min-h-9 items-center justify-between gap-2 rounded-lg px-2 text-shop-sm transition-colors pointer-coarse:min-h-11",
        level ? "ml-3" : "",
        active ? "bg-shop-primary-soft font-semibold text-shop-primary-ink" : "text-shop-text hover:bg-shop-hover"
      )}
    >
      <span className="min-w-0 truncate">{children}</span>
      {count ? <span className={cn("shrink-0 text-shop-xs tabular-nums", active ? "text-shop-primary-ink" : "text-shop-subtle")}>{count}</span> : null}
    </Link>
  );
}

const PRICE_PRESETS = [
  { label: "Under ₹100", min: "", max: "100" },
  { label: "₹100–500", min: "100", max: "500" },
  { label: "₹500–1,000", min: "500", max: "1000" },
  { label: "Above ₹1,000", min: "1000", max: "" },
];

/* ------------------------------------------------------------------ panel */

/**
 * The filter rail content (desktop sticky aside and the mobile FilterSheet share it).
 *
 *   <FilterPanel f={useShopFilters({ category })} categories={tree} brands={brands} facets={search.facets} />
 *
 * `facets` (from the search response) adds counts, seller and pack-size groups.
 * `hide`: groups to leave out — "category" | "brand" | "seller" | "pack" | "price" | "discount" | "bulk".
 * `heading`: show the "Filters · Clear all" header (desktop rail).
 */
export function FilterPanel({ f, categories, brands = [], facets, className, hide = [], heading = false }) {
  const shown = (group) => !hide.includes(group);
  const [brandQuery, setBrandQuery] = useState("");
  const [allBrands, setAllBrands] = useState(false);
  const [allPacks, setAllPacks] = useState(false);
  const [price, setPrice] = useState({ min: f.filters.minPrice, max: f.filters.maxPrice });

  const brandSource = facets?.brands?.length ? facets.brands.map((b) => ({ slug: b.slug || b.value, name: b.name || b.label, count: b.count })) : brands;
  const brandRows = brandSource
    .filter((b) => (brandQuery ? b.name.toLowerCase().includes(brandQuery.toLowerCase()) : true))
    // Selected brands first so they never hide behind "Show all".
    .sort((a, b) => Number(f.filters.brand.includes(b.slug)) - Number(f.filters.brand.includes(a.slug)));
  const visibleBrands = allBrands || brandQuery ? brandRows : brandRows.slice(0, 8);

  const packRows = facets?.packSizes || facets?.packs || [];
  const visiblePacks = allPacks ? packRows : packRows.slice(0, 10);
  const discountRows = facets?.discounts
    ? facets.discounts.map((d) => ({ min: String(d.min), count: d.count })).filter((d) => d.count > 0 || f.filters.discount === d.min)
    : ["10", "20", "30", "50"].map((min) => ({ min, count: null }));

  const current = f.filters.category;
  const node = categories?.bySlug?.get(current);
  const root = node?.parentId ? categories?.byId?.get(node.parentId) : node;
  const countOf = useMemo(() => categoryCounter(facets?.categories || []), [facets]);
  const priceActive = Boolean(f.filters.minPrice || f.filters.maxPrice);
  const q = f.filters.q ? `?q=${encodeURIComponent(f.filters.q)}` : "";

  return (
    <div className={cn("text-shop-text", className)}>
      {heading ? (
        <div className="flex items-center justify-between gap-2 border-b border-shop-line pb-2 pt-1">
          <p className="flex items-center gap-2 font-display text-shop-md font-bold text-shop-ink">
            <SlidersHorizontal className="size-4 text-shop-muted" aria-hidden /> Filters
          </p>
          {f.activeCount ? (
            <button type="button" onClick={f.reset} className="min-h-9 rounded-full px-2 text-shop-xs font-semibold text-shop-primary-ink hover:bg-shop-primary-soft">
              Clear all ({f.activeCount})
            </button>
          ) : null}
        </div>
      ) : null}

      {categories && shown("category") ? (
        <Group title="Category">
          <nav aria-label="Categories" className="grid gap-0.5">
            <CatLink to={`/category/all${q}`} active={!current || current === "all"}>
              All products
            </CatLink>
            {root ? (
              <>
                <CatLink to={`/category/${root.slug}${q}`} active={current === root.slug} count={countOf(root) || null}>
                  {displayName(root.name)}
                </CatLink>
                {root.children?.map((child) => (
                  <CatLink key={child.slug} to={`/category/${child.slug}${q}`} active={current === child.slug} count={countOf(child) || null} level={1}>
                    {displayName(child.name)}
                  </CatLink>
                ))}
                <Link to={`/category/all${q}`} className="mt-1 inline-flex min-h-9 items-center px-2 text-shop-xs font-semibold text-shop-primary-ink hover:underline">
                  ← All categories
                </Link>
              </>
            ) : (
              categories.roots
                .map((c) => ({ c, n: countOf(c) }))
                .sort((a, b) => b.n - a.n)
                .map(({ c, n }) => (
                  <CatLink key={c.slug} to={`/category/${c.slug}${q}`} active={current === c.slug} count={n || null}>
                    {displayName(c.name)}
                  </CatLink>
                ))
            )}
          </nav>
        </Group>
      ) : null}

      {shown("price") ? (
        <Group title="Price per pack" count={priceActive ? 1 : 0}>
          <div className="flex flex-wrap gap-1.5">
            {PRICE_PRESETS.map((p) => {
              const on = f.filters.minPrice === p.min && f.filters.maxPrice === p.max;
              return (
                <Chip
                  key={p.label}
                  on={on}
                  onClick={() => {
                    const next = on ? { min: "", max: "" } : { min: p.min, max: p.max };
                    setPrice(next);
                    f.setMany({ minPrice: next.min, maxPrice: next.max });
                  }}
                >
                  {p.label}
                </Chip>
              );
            })}
          </div>
          <form
            className="mt-2.5 grid grid-cols-[1fr_auto_1fr_auto] items-center gap-1.5"
            onSubmit={(e) => {
              e.preventDefault();
              f.setMany({ minPrice: price.min, maxPrice: price.max });
            }}
          >
            <label className="sr-only" htmlFor="f-min">
              Minimum price
            </label>
            <input id="f-min" inputMode="numeric" placeholder="₹ Min" value={price.min} onChange={(e) => setPrice((p) => ({ ...p, min: e.target.value.replace(/\D/g, "") }))} className="h-9 min-w-0 rounded-lg border border-shop-line-strong bg-shop-card px-2.5 text-shop-sm tabular-nums focus:border-shop-primary focus:outline-none pointer-coarse:h-11" />
            <span className="text-shop-subtle">–</span>
            <label className="sr-only" htmlFor="f-max">
              Maximum price
            </label>
            <input id="f-max" inputMode="numeric" placeholder="₹ Max" value={price.max} onChange={(e) => setPrice((p) => ({ ...p, max: e.target.value.replace(/\D/g, "") }))} className="h-9 min-w-0 rounded-lg border border-shop-line-strong bg-shop-card px-2.5 text-shop-sm tabular-nums focus:border-shop-primary focus:outline-none pointer-coarse:h-11" />
            <button type="submit" className="h-9 rounded-lg bg-shop-ink px-3 text-shop-xs font-semibold text-white hover:bg-shop-navy-2 pointer-coarse:h-11">
              Go
            </button>
          </form>
        </Group>
      ) : null}

      {shown("brand") && (brandRows.length || brandQuery) ? (
        <Group title="Brand" count={f.filters.brand.length}>
          {brandSource.length > 6 ? (
            <label className="relative mb-1.5 block">
              <span className="sr-only">Search brands</span>
              <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-shop-muted" aria-hidden />
              <input value={brandQuery} onChange={(e) => setBrandQuery(e.target.value)} placeholder="Search brands" className="h-9 w-full rounded-lg border border-shop-line-strong bg-shop-card pl-8 pr-3 text-shop-sm focus:border-shop-primary focus:outline-none pointer-coarse:h-11" />
            </label>
          ) : null}
          <div className="grid">
            {visibleBrands.map((b) => (
              <CheckRow key={b.slug} label={displayName(b.name)} count={b.count} checked={f.filters.brand.includes(b.slug)} onChange={() => f.toggle("brand", b.slug)} />
            ))}
            {!brandRows.length ? <p className="px-1.5 py-2 text-shop-xs text-shop-muted">No brands match “{brandQuery}”.</p> : null}
          </div>
          {!brandQuery && brandRows.length > 8 ? (
            <button type="button" onClick={() => setAllBrands((v) => !v)} className="mt-1 min-h-9 px-1.5 text-shop-xs font-semibold text-shop-primary-ink hover:underline">
              {allBrands ? "Show fewer" : `Show all ${brandRows.length} brands`}
            </button>
          ) : null}
        </Group>
      ) : null}

      {shown("pack") && packRows.length ? (
        <Group title="Pack size" count={f.filters.pack.length} defaultOpen={packRows.length <= 12 || f.filters.pack.length > 0}>
          <div className="flex flex-wrap gap-1.5">
            {visiblePacks.map((p) => {
              const v = String(p.value ?? p);
              return (
                <Chip key={v} on={f.filters.pack.includes(v)} onClick={() => f.toggle("pack", v)}>
                  {p.label || v}
                  {p.count != null ? <span className="text-shop-subtle">· {p.count}</span> : null}
                </Chip>
              );
            })}
          </div>
          {packRows.length > 10 ? (
            <button type="button" onClick={() => setAllPacks((v) => !v)} className="mt-1.5 min-h-9 px-0.5 text-shop-xs font-semibold text-shop-primary-ink hover:underline">
              {allPacks ? "Show fewer" : `+${packRows.length - 10} more sizes`}
            </button>
          ) : null}
        </Group>
      ) : null}

      {shown("discount") && discountRows.length ? (
        <Group title="Discount" count={f.filters.discount ? 1 : 0} defaultOpen={Boolean(f.filters.discount) || discountRows.length <= 5}>
          <div className="flex flex-wrap gap-1.5">
            {discountRows.map((d) => (
              <Chip key={d.min} on={f.filters.discount === d.min} onClick={() => f.set("discount", f.filters.discount === d.min ? "" : d.min)}>
                {d.min}%+ off{d.count != null ? <span className="text-shop-subtle">· {d.count}</span> : null}
              </Chip>
            ))}
          </div>
        </Group>
      ) : null}

      {shown("seller") && facets?.sellers?.length ? (
        <Group title="Seller" count={f.filters.seller.length}>
          {facets.sellers.map((s) => (
            <CheckRow
              key={s.value || s.id}
              label={displayName(s.name || s.label)}
              count={s.count}
              checked={f.filters.seller.includes(String(s.value || s.id))}
              onChange={() => f.toggle("seller", String(s.value || s.id))}
            />
          ))}
        </Group>
      ) : null}

      <Group title="Availability" count={(f.filters.inStock ? 1 : 0) + (f.filters.bulk ? 1 : 0)}>
        <SwitchRow label="In stock only" hint={typeof facets?.inStock === "number" ? `${facets.inStock} available now` : undefined} checked={f.filters.inStock} onChange={(e) => f.set("inStock", e.target.checked)} />
        {shown("bulk") ? <SwitchRow label="Bulk / case-pack prices" hint="Slab pricing and minimum quantities" checked={f.filters.bulk} onChange={(e) => f.set("bulk", e.target.checked)} /> : null}
      </Group>
    </div>
  );
}

/* ------------------------------------------------------------------ chips, sort, sheet */

/** Active filter chips + "Clear all". */
export function FilterChips({ f, className }) {
  if (!f.chips.length) return null;
  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)} aria-label="Active filters">
      {f.chips.map((chip) => (
        <button
          key={`${chip.key}:${chip.value}`}
          type="button"
          onClick={() => f.removeChip(chip)}
          className="inline-flex h-8 items-center gap-1 rounded-full bg-shop-ink pl-3 pr-2 text-shop-xs font-medium text-white transition-colors hover:bg-shop-navy-2 pointer-coarse:h-11"
          aria-label={`Remove filter ${chip.label}`}
        >
          {displayName(String(chip.label))}
          <X className="size-3.5 opacity-80" aria-hidden />
        </button>
      ))}
      <button type="button" onClick={f.reset} className="h-8 rounded-full px-2.5 text-shop-xs font-semibold text-shop-primary-ink hover:bg-shop-primary-soft pointer-coarse:h-11">
        Clear all
      </button>
    </div>
  );
}

/** Sort control bound to the URL (native select for accessibility, styled as a pill). */
export function SortSelect({ f, className, compact = false }) {
  return (
    <label className={cn("relative flex items-center", className)}>
      <span className="sr-only">Sort products</span>
      <ArrowUpDown className="pointer-events-none absolute left-3 size-4 text-shop-muted" aria-hidden />
      <select
        value={f.filters.sort}
        onChange={(e) => f.set("sort", e.target.value)}
        className={cn(
          "h-10 cursor-pointer appearance-none rounded-full border border-shop-line-strong bg-shop-card pl-9 pr-9 text-shop-sm font-medium text-shop-ink hover:border-shop-primary focus:border-shop-primary focus:outline-none pointer-coarse:h-11",
          compact && "w-full"
        )}
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {compact ? s.label : `Sort: ${s.label}`}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 size-4 text-shop-muted" aria-hidden />
    </label>
  );
}

/**
 * Mobile filters: a "Filters (n)" button that opens a bottom sheet with <FilterPanel>.
 *   <FilterSheet f={f} categories={tree} brands={brands} facets={facets} total={search.total} />
 */
export function FilterSheet({ f, total, className, ...panelProps }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={cn("inline-flex h-11 items-center justify-center gap-2 rounded-full border border-shop-line-strong bg-shop-card px-4 text-shop-sm font-semibold text-shop-ink hover:border-shop-primary", className)}
      >
        <SlidersHorizontal className="size-4" aria-hidden />
        Filters
        {f.activeCount ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-shop-primary px-1 text-shop-xs text-white tabular-nums">{f.activeCount}</span> : null}
      </button>
      <ShopSheet
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        side="bottom"
        footer={
          <div className="flex gap-2">
            {f.activeCount ? (
              <Button variant="secondary" onClick={f.reset} className="rounded-full">
                Clear all
              </Button>
            ) : null}
            <Button block onClick={() => setOpen(false)} className="rounded-full">
              {total != null ? `Show ${total} product${total === 1 ? "" : "s"}` : "Show products"}
            </Button>
          </div>
        }
      >
        <FilterPanel f={f} {...panelProps} />
      </ShopSheet>
    </>
  );
}
