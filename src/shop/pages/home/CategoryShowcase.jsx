/**
 * "Shop by category" on the home page: an image-led bento grid.
 *
 * Each card's picture is chosen in this order:
 *   1. the category's own image (upload one in the admin catalogue manager to art-direct it)
 *   2. a mosaic of real product photos from that category (live search)
 *   3. a large line icon on the category's tint, while it has no products yet
 * The first category is a feature tile (2×2 on desktop, full width on phones); the last tile links
 * to every category. Each card shows the live product count.
 */
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ArrowUpRight, LayoutGrid, Sparkles } from "lucide-react";
import { cn, SectionHeading, Skeleton } from "../../components/ui/index.js";
import { useCategories, useProducts } from "../../hooks/index.js";
import { displayName } from "../../lib/text.js";
import { categoryCounter, lookFor } from "../../lib/categoryLook.js";

/** Image URLs (deduped) that actually load, so a broken photo never shows as an empty box. */
function useWorkingImages(urls, max) {
  const key = urls.filter(Boolean).join("|");
  const list = useMemo(() => [...new Set(key ? key.split("|") : [])].slice(0, 8), [key]);
  const [ok, setOk] = useState(() => new Set());
  useEffect(() => {
    let alive = true;
    for (const url of list) {
      const img = new Image();
      img.onload = () => alive && img.naturalWidth > 0 && setOk((prev) => (prev.has(url) ? prev : new Set(prev).add(url)));
      img.src = url;
    }
    return () => {
      alive = false;
    };
  }, [list]);
  return list.filter((u) => ok.has(u)).slice(0, max);
}

const photo = "size-full rounded-[0.9rem] object-cover";

function CategoryVisual({ c, look, images, featured }) {
  const Icon = look.icon;
  const frame = cn("absolute inset-0 overflow-hidden bg-gradient-to-br", look.tint);

  if (c.image) {
    return (
      <div className={frame}>
        <img src={c.image} alt="" loading="lazy" decoding="async" className="size-full object-cover transition-transform duration-500 group-hover:scale-[1.04]" />
      </div>
    );
  }
  if (images.length >= 3 || (featured && images.length >= 2)) {
    const [a, b, third] = images;
    return (
      <div
        className={cn(frame, "grid gap-1.5 p-1.5")}
        style={{ gridTemplateColumns: third ? "1.4fr 1fr" : "1fr 1fr", gridTemplateRows: third ? "1fr 1fr" : "1fr" }}
      >
        <img src={a} alt="" loading="lazy" decoding="async" className={cn(photo, "transition-transform duration-500 group-hover:scale-[1.03]")} style={third ? { gridRow: "span 2" } : undefined} />
        <img src={b} alt="" loading="lazy" decoding="async" className={photo} />
        {third ? <img src={third} alt="" loading="lazy" decoding="async" className={photo} /> : null}
      </div>
    );
  }
  if (images.length) {
    return (
      <div className={cn(frame, "p-1.5")}>
        <img src={images[0]} alt="" loading="lazy" decoding="async" className={cn(photo, "transition-transform duration-500 group-hover:scale-[1.03]")} />
      </div>
    );
  }
  return (
    <div className={cn(frame, "grid place-items-center")}>
      <div aria-hidden className="absolute inset-0 opacity-40 [background-image:radial-gradient(rgba(255,255,255,0.9)_1.2px,transparent_1.2px)] [background-size:16px_16px]" />
      <span
        className={cn(
          "relative grid place-items-center rounded-[1.4rem] bg-white/75 shadow-[0_12px_30px_-14px_rgba(0,0,0,0.35)] ring-1 ring-black/5 backdrop-blur transition-transform duration-300 group-hover:-translate-y-0.5",
          featured ? "size-28" : "size-20",
          look.ink
        )}
      >
        <Icon className={featured ? "size-14" : "size-10"} strokeWidth={1.4} aria-hidden />
      </span>
    </div>
  );
}

function CategoryCard({ c, featured = false, className }) {
  const look = lookFor(c);
  const res = useProducts({ category: c.slug }, { limit: 6 });
  const images = useWorkingImages(
    res.products.map((p) => p.image),
    3
  );
  const total = res.total;
  const subs = c.children || [];

  return (
    <li
      className={cn(
        "group relative flex min-w-0 flex-col overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card transition-[box-shadow,transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-shop-line-strong hover:shadow-[0_18px_40px_-22px_rgba(11,16,51,0.45)] motion-reduce:hover:translate-y-0",
        featured && "cat-feature",
        className
      )}
    >
      <div className="cat-media">
        {res.isPending && !c.image ? <Skeleton className="absolute inset-0 rounded-none" /> : <CategoryVisual c={c} look={look} images={images} featured={featured} />}
        {featured && total ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 text-shop-xs font-semibold text-shop-ink shadow-sm backdrop-blur">
            <Sparkles className="size-3.5 text-shop-gold-ink" aria-hidden /> Popular with shops
          </span>
        ) : null}
      </div>

      <div className={cn("flex items-end justify-between gap-3", featured ? "p-4 sm:p-5" : "p-3.5 sm:p-4")}>
        <div className="min-w-0">
          <Link
            to={`/category/${c.slug}`}
            className={cn(
              "block truncate font-display font-bold text-shop-ink after:absolute after:inset-0 after:content-[''] focus-visible:outline-none",
              featured ? "text-shop-lg sm:text-shop-xl" : "text-shop-base sm:text-shop-md"
            )}
          >
            {displayName(c.name)}
          </Link>
          <p className="mt-0.5 truncate text-shop-xs text-shop-muted sm:text-shop-sm">
            {res.isPending ? (
              <Skeleton className="inline-block h-3.5 w-20 align-middle" />
            ) : total ? (
              <>
                {total} product{total === 1 ? "" : "s"}
                {featured && subs.length ? <span className="text-shop-subtle"> · {subs.slice(0, 3).map((s) => displayName(s.name)).join(", ")}</span> : null}
              </>
            ) : (
              "New sellers joining soon"
            )}
          </p>
        </div>
        <span
          aria-hidden
          className={cn(
            "grid shrink-0 place-items-center rounded-full border border-shop-line bg-shop-card text-shop-ink transition-colors duration-200 group-hover:border-shop-primary group-hover:bg-shop-primary group-hover:text-white",
            featured ? "size-11" : "size-9"
          )}
        >
          <ArrowUpRight className="size-4" />
        </span>
      </div>
      {/* keep a visible focus ring for keyboard users (the link covers the card) */}
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[1.25rem] ring-shop-primary group-has-[a:focus-visible]:ring-2" />
    </li>
  );
}

/** Root categories ranked by how many products they hold (sub-categories rolled up), busiest first. */
function useRankedRoots(roots) {
  const facets = useProducts({ facets: true }, { limit: 1 });
  return useMemo(() => {
    const countOf = categoryCounter(facets.data?.facets?.categories || []);
    return roots
      .map((c, i) => ({ c, i, n: countOf(c) }))
      .sort((a, b) => b.n - a.n || a.i - b.i)
      .map((x) => x.c);
  }, [roots, facets.data]);
}

export function CategoryShowcase() {
  const cats = useCategories();
  const ranked = useRankedRoots(cats.data?.roots || []);
  if (cats.isPending)
    return (
      <section aria-label="Categories">
        <Skeleton className="mb-4 h-7 w-48" />
        <ul className="cat-bento">
          <li className="cat-feature flex flex-col">
            <Skeleton className="cat-media rounded-[1.25rem]" />
          </li>
          {Array.from({ length: 8 }, (_, i) => (
            <li key={i}>
              <Skeleton className="cat-media rounded-[1.25rem]" />
            </li>
          ))}
        </ul>
      </section>
    );

  const roots = ranked;
  if (!roots.length) return null;
  // Feature tile (4 cells) + 7 cards + the "all categories" tile = 12 cells: 3 full rows of 4,
  // and on phones the feature row plus 4 rows of 2.
  const shown = roots.slice(0, 8);

  return (
    <section aria-labelledby="home-cats">
      <SectionHeading id="home-cats" title="Shop by category" description="Case-pack and single-unit prices from verified sellers" to="/category/all" action="All categories" />
      <ul className="cat-bento">
        {shown.map((c, i) => (
          <CategoryCard key={c.slug} c={c} featured={i === 0} />
        ))}
        <li className="relative flex min-w-0">
          <Link
            to="/category/all"
            className="group relative flex w-full flex-col justify-between gap-6 overflow-hidden rounded-[1.25rem] bg-shop-navy p-4 text-white transition-colors hover:bg-shop-navy-2 sm:p-5"
          >
            <span aria-hidden className="pointer-events-none absolute -right-10 -top-10 size-32 rounded-full bg-shop-gold/20 blur-2xl" />
            <span className="relative grid size-11 place-items-center rounded-2xl bg-white/10 text-shop-gold ring-1 ring-white/15">
              <LayoutGrid className="size-5" aria-hidden />
            </span>
            <span className="relative">
              <span className="block font-display text-shop-md font-bold sm:text-shop-lg">
                {roots.length > shown.length ? `All ${roots.length} categories` : "Browse all products"}
              </span>
              <span className="mt-1 inline-flex items-center gap-1 text-shop-sm text-shop-on-navy-muted group-hover:text-white">
                Shop everything <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
              </span>
            </span>
          </Link>
        </li>
      </ul>
    </section>
  );
}
