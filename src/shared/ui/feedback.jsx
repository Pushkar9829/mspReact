import { AlertCircle, AlertTriangle, CheckCircle2, Info, Inbox, RefreshCw } from "lucide-react";
import { cn } from "./cn.js";
import { Button } from "./Button.jsx";
import { Skeleton, SkeletonText, PageSkeleton } from "./skeletons.jsx";
import { Toaster, toast } from "./Toaster.jsx";

export { toast, Toaster, Skeleton, SkeletonText, PageSkeleton };

/**
 * <EmptyState icon={Package} title="No products yet" description="..." action={<Button>Add product</Button>} />
 */
export function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", description, action, className, compact }) {
  return (
    <div className={cn("flex flex-col items-center justify-center text-center", compact ? "gap-2 px-4 py-8" : "gap-3 px-6 py-14", className)}>
      <div className="grid size-10 place-items-center rounded-full bg-surface-sunken text-fg-subtle">
        <Icon aria-hidden className="size-5" />
      </div>
      <div className="grid max-w-sm gap-1">
        <p className="text-ui font-semibold text-fg">{title}</p>
        {description ? <p className="text-ui-sm text-fg-muted">{description}</p> : null}
      </div>
      {action ? <div className="mt-1 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

/** Error block with retry. `error` may be an ApiError, Error or string. */
export function ErrorState({ error, title = "Couldn’t load this", onRetry, className, compact }) {
  const message = typeof error === "string" ? error : error?.message;
  const requestId = typeof error === "object" ? error?.requestId : null;
  return (
    <div role="alert" className={cn("flex flex-col items-center justify-center gap-3 text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      <div className="grid size-10 place-items-center rounded-full bg-danger-soft text-danger-fg">
        <AlertTriangle aria-hidden className="size-5" />
      </div>
      <div className="grid max-w-md gap-1">
        <p className="text-ui font-semibold text-fg">{title}</p>
        {message ? <p className="text-ui-sm text-fg-muted">{message}</p> : null}
        {requestId ? <p className="font-mono text-ui-2xs text-fg-subtle">Reference: {requestId}</p> : null}
      </div>
      {onRetry ? (
        <Button size="sm" leftIcon={RefreshCw} onClick={onRetry}>
          Try again
        </Button>
      ) : null}
    </div>
  );
}

const ALERT = {
  info: { cls: "border-info/30 bg-info-soft text-info-fg", Icon: Info },
  success: { cls: "border-success/30 bg-success-soft text-success-fg", Icon: CheckCircle2 },
  warning: { cls: "border-warning/30 bg-warning-soft text-warning-fg", Icon: AlertTriangle },
  danger: { cls: "border-danger/30 bg-danger-soft text-danger-fg", Icon: AlertCircle },
};

/** Inline callout. <Alert tone="warning" title="Unpaid">Collect payment first.</Alert> */
export function Alert({ tone = "info", title, children, action, className, icon }) {
  const { cls, Icon } = ALERT[tone] || ALERT.info;
  const I = icon || Icon;
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-md border px-3.5 py-3 text-ui-sm", cls, className)}>
      <I aria-hidden className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5", "opacity-95")}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/**
 * Query state switch for useApi/useQuery results:
 *   <QueryState query={q} empty={!rows.length} emptyState={<EmptyState .../>}>{...}</QueryState>
 */
export function QueryState({ query, loading, error, empty, onRetry, skeleton, emptyState, children }) {
  const isLoading = loading ?? (query ? query.isPending ?? query.loading : false);
  const err = error ?? (query ? query.error : null);
  if (isLoading) return skeleton || <SkeletonText lines={4} className="p-4" />;
  if (err) return <ErrorState error={err} onRetry={onRetry || query?.refetch || query?.reload} />;
  if (empty) return emptyState || <EmptyState />;
  return children;
}
