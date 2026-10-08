// Dependency-free loading placeholders (used by Suspense fallbacks in the entry chunk).
const join = (...c) => c.filter(Boolean).join(" ");

export function Skeleton({ className, ...props }) {
  return <div aria-hidden className={join("animate-pulse rounded-md bg-surface-sunken", className)} {...props} />;
}

/** Lines of skeleton text. */
export function SkeletonText({ lines = 3, className }) {
  return (
    <div className={join("grid gap-2", className)} role="status" aria-label="Loading">
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className={join("h-3.5", i === lines - 1 ? "w-2/3" : "w-full")} />
      ))}
    </div>
  );
}

/** Full-page loading placeholder used by Suspense fallbacks and detail pages. */
export function PageSkeleton() {
  return (
    <div className="grid gap-6" role="status" aria-label="Loading page">
      <div className="grid gap-2">
        <Skeleton className="h-3 w-40" />
        <Skeleton className="h-7 w-64" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <Skeleton className="h-72" />
    </div>
  );
}
