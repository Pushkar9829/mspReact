import { cn } from "./cn.js";

/** Shimmer block. Size it with classes: <Skeleton className="h-4 w-24" />. */
/** A <span> (block by default) so it is valid inside <p>, <dd> and buttons; pass "inline-block" to inline it. */
export function Skeleton({ className, ...props }) {
  return <span aria-hidden className={cn("block shop-skeleton rounded-well", className)} {...props} />;
}

export const PRODUCT_GRID = "grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5";

/** Same box as <ProductCard variant="grid"> so the layout does not jump. */
export function ProductCardSkeleton({ variant = "grid" }) {
  if (variant === "list") return <RowSkeleton />;
  return (
    <div aria-hidden className="flex h-full flex-col overflow-hidden rounded-[1.1rem] border border-shop-line bg-shop-card">
      <Skeleton className="aspect-square w-full rounded-none" />
      <div className="flex flex-1 flex-col px-3 pb-3 pt-2.5">
        <Skeleton className="h-3 w-1/3" />
        <Skeleton className="mt-2 h-3.5 w-11/12" />
        <Skeleton className="mt-1.5 h-3.5 w-3/5" />
        <Skeleton className="mt-3 h-5 w-1/2" />
        <Skeleton className="mt-2 h-3 w-2/3" />
        <Skeleton className="mt-4 h-11 w-full rounded-full" />
      </div>
    </div>
  );
}

/** A grid of card skeletons. */
export function ProductGridSkeleton({ count = 8, className }) {
  return (
    <div className={cn(PRODUCT_GRID, className)} role="status" aria-label="Loading products">
      {Array.from({ length: count }, (_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

/** List row / cart line skeleton. */
export function RowSkeleton({ className }) {
  return (
    <div aria-hidden className={cn("flex gap-3 rounded-card border border-shop-line bg-shop-card p-3", className)}>
      <Skeleton className="size-20 shrink-0" />
      <div className="flex min-w-0 flex-1 flex-col gap-2 py-1">
        <Skeleton className="h-3 w-1/4" />
        <Skeleton className="h-4 w-3/4" />
        <Skeleton className="h-4 w-1/3" />
      </div>
      <Skeleton className="h-11 w-28 self-center rounded-control" />
    </div>
  );
}

/** Product detail page skeleton (gallery + buy box). */
export function PdpSkeleton() {
  return (
    <div className="msr-gutter py-6" role="status" aria-label="Loading product">
      <Skeleton className="h-4 w-56" />
      <div className="pdp-layout mt-4">
        <div>
          <Skeleton className="aspect-square w-full rounded-[1.25rem]" />
          <div className="mt-3 flex gap-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="size-16" />
            ))}
          </div>
        </div>
        <div className="grid content-start gap-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-8 w-4/5" />
          <Skeleton className="h-4 w-40" />
          <div className="mt-2 flex gap-2">
            <Skeleton className="h-11 w-24 rounded-control" />
            <Skeleton className="h-11 w-24 rounded-control" />
          </div>
          <Skeleton className="mt-2 h-10 w-48" />
          <Skeleton className="h-72 w-full rounded-[1.25rem]" />
          <Skeleton className="h-12 w-full rounded-control" />
        </div>
      </div>
    </div>
  );
}

/** Generic page: title + a few blocks. */
export function PageSkeleton({ rows = 3 }) {
  return (
    <div className="msr-gutter py-6" role="status" aria-label="Loading">
      <Skeleton className="h-4 w-40" />
      <Skeleton className="mt-3 h-8 w-72" />
      <div className="mt-6 grid gap-3">
        {Array.from({ length: rows }, (_, i) => (
          <RowSkeleton key={i} />
        ))}
      </div>
    </div>
  );
}

/**
 * Suspense fallback for lazy shop routes: never a blank area. Picks a shape from the path.
 *   <Suspense fallback={<RouteSkeleton />}>
 */
export function RouteSkeleton({ kind }) {
  const path = typeof window !== "undefined" ? window.location.pathname : "";
  const k = kind || (path.startsWith("/product/") ? "pdp" : /^\/(category|deals|new|bulk|brands)/.test(path) || path === "/" ? "grid" : "page");
  if (k === "pdp") return <PdpSkeleton />;
  if (k === "grid") {
    return (
      <div className="msr-gutter py-6">
        <Skeleton className="h-8 w-64" />
        <ProductGridSkeleton className="mt-5" count={10} />
      </div>
    );
  }
  return <PageSkeleton />;
}
