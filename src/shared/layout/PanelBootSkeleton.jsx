/** Shown while a panel's shell chunk loads (before the theme/shell is applied). */
export function PanelBootSkeleton() {
  return (
    <div className="flex h-dvh bg-bg" role="status" aria-label="Loading">
      <div className="hidden w-60 shrink-0 border-r border-border bg-surface md:block" />
      <div className="flex flex-1 flex-col">
        <div className="h-14 border-b border-border bg-surface" />
        <div className="grid gap-4 p-6">
          <div className="h-7 w-56 animate-pulse rounded-md bg-surface-sunken" />
          <div className="h-64 animate-pulse rounded-lg bg-surface-sunken" />
        </div>
      </div>
    </div>
  );
}

export default PanelBootSkeleton;
