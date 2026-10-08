import { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { ProductCard, ProductCardSkeleton, cn } from "../../components/ui/index.js";

/**
 * Horizontal product rail.
 *  - Cards are sized (CSS `.rail-item`) so a whole number fit the row: 2 + a peek on phones, 3 on
 *    tablets, 5 on laptops, 6 on wide screens. Skeleton and loaded rail share the size (no shift).
 *  - Arrows show only when the row actually overflows, and disable at each end; a soft edge fade
 *    hints there is more. Phones swipe (scroll-snap).
 *  - Renders nothing when the server has no products for it (no placeholder content).
 *
 *   <ProductRail title="Deals of the day" to="/deals" query={useProducts({ tag: "deal" })} />
 */
export function ProductRail({ title, description, to, action = "View all", query, products: list, bulk = false, className, exclude, count = 6, icon: Icon }) {
  const id = useId();
  const scroller = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const pending = query ? query.isPending : false;
  const products = (list || query?.products || []).filter((p) => !exclude || p.slug !== exclude);
  const total = query?.total;

  useEffect(() => {
    const el = scroller.current;
    if (!el) return undefined;
    const update = () => setEdges({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 });
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [products.length, pending]);

  if (!pending && !products.length) return null;
  const overflowing = !(edges.start && edges.end);

  const scroll = (dir) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: "smooth" });
  };
  const arrow =
    "grid size-10 place-items-center rounded-full border border-shop-line-strong bg-shop-card text-shop-ink transition-colors hover:border-shop-primary hover:text-shop-primary-ink disabled:pointer-events-none disabled:opacity-35";

  return (
    <section aria-labelledby={`${id}-h`} className={cn("min-w-0", className)}>
      <div className="mb-4 flex items-end justify-between gap-4">
        <div className="min-w-0">
          <h2 id={`${id}-h`} className="flex items-center gap-2 font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
            {Icon ? <Icon className="size-5 text-shop-primary-ink" strokeWidth={2.2} aria-hidden /> : null}
            {title}
          </h2>
          {description ? <p className="mt-0.5 text-shop-sm text-shop-muted">{description}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {to ? (
            <Link to={to} className="group inline-flex min-h-10 items-center gap-1 rounded-full px-3 text-shop-sm font-semibold text-shop-primary-ink hover:bg-shop-primary-soft pointer-coarse:min-h-11">
              {action}
              {total ? <span className="font-normal text-shop-muted">({total})</span> : null}
              <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" aria-hidden />
            </Link>
          ) : null}
          {overflowing ? (
            <div className="hidden gap-1.5 md:flex">
              <button type="button" onClick={() => scroll(-1)} disabled={edges.start} className={arrow} aria-label={`Scroll ${title} back`}>
                <ChevronLeft className="size-5" aria-hidden />
              </button>
              <button type="button" onClick={() => scroll(1)} disabled={edges.end} className={arrow} aria-label={`Scroll ${title} forward`}>
                <ChevronRight className="size-5" aria-hidden />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="relative">
        <div ref={scroller} className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0" aria-busy={pending || undefined}>
          {pending
            ? Array.from({ length: count }, (_, i) => (
                <div key={i} className="rail-item">
                  <ProductCardSkeleton />
                </div>
              ))
            : products.map((p) => (
                <div key={p.id} className="rail-item">
                  <ProductCard product={p} bulk={bulk} />
                </div>
              ))}
        </div>
        <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 right-0 hidden w-14 bg-gradient-to-l from-shop-page to-transparent transition-opacity sm:block", edges.end && "opacity-0")} />
        <div aria-hidden className={cn("pointer-events-none absolute inset-y-0 left-0 hidden w-10 bg-gradient-to-r from-shop-page to-transparent transition-opacity sm:block", edges.start && "opacity-0")} />
      </div>
    </section>
  );
}

export default ProductRail;
