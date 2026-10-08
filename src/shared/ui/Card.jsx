import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "./cn.js";
import { Skeleton } from "./feedback.jsx";

export function Card({ className, children, as: Tag = "div", padded = false, ...props }) {
  return (
    <Tag className={cn("rounded-lg border border-border bg-surface shadow-xs", padded && "p-4 sm:p-5", className)} {...props}>
      {children}
    </Tag>
  );
}

export function CardHeader({ title, description, actions, className }) {
  return (
    <div className={cn("flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5", className)}>
      <div className="min-w-0">
        <h2 className="text-ui font-semibold text-fg">{title}</h2>
        {description ? <p className="mt-0.5 text-ui-sm text-fg-muted">{description}</p> : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function CardBody({ className, children }) {
  return <div className={cn("p-4 sm:p-5", className)}>{children}</div>;
}

export function CardFooter({ className, children }) {
  return <div className={cn("flex items-center justify-end gap-2 border-t border-border px-4 py-3 sm:px-5", className)}>{children}</div>;
}

/**
 * KPI tile. delta: number (percent) → arrow + colour; `invertDelta` when lower is better.
 * <StatCard label="Net sales" value={<Money value={x} />} delta={12.4} hint="vs previous 30 days" to="/tenant/orders" />
 */
export function StatCard({ label, value, delta, deltaLabel, invertDelta, hint, icon: Icon, loading, to, className }) {
  const n = typeof delta === "number" && Number.isFinite(delta) ? delta : null;
  const good = n == null ? null : invertDelta ? n < 0 : n > 0;
  const DeltaIcon = n == null ? null : n > 0 ? ArrowUpRight : n < 0 ? ArrowDownRight : Minus;
  const body = (
    <>
      <div className="flex items-center justify-between gap-2">
        <p className="text-ui-sm font-medium text-fg-muted">{label}</p>
        {Icon ? <Icon aria-hidden className="size-4 text-fg-subtle" /> : null}
      </div>
      {loading ? <Skeleton className="mt-2 h-7 w-28" /> : <p className="mt-1.5 text-display font-semibold tabular-nums tracking-tight text-fg">{value ?? "—"}</p>}
      {n != null || hint ? (
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-ui-xs">
          {n != null ? (
            <span className={cn("inline-flex items-center gap-0.5 rounded-sm px-1 font-medium", n === 0 ? "text-fg-muted" : good ? "bg-success-soft text-success-fg" : "bg-danger-soft text-danger-fg")}>
              <DeltaIcon aria-hidden className="size-3" />
              {Math.abs(n).toFixed(1)}%<span className="sr-only">{n >= 0 ? " increase" : " decrease"}</span>
            </span>
          ) : null}
          {deltaLabel || hint ? <span className="text-fg-subtle">{deltaLabel || hint}</span> : null}
        </div>
      ) : null}
    </>
  );
  const cls = cn("block rounded-lg border border-border bg-surface p-4 shadow-xs", to && "transition-colors hover:border-border-strong hover:bg-surface-2", className);
  return to ? (
    <Link to={to} className={cls}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

/** Page section with heading and optional actions. */
export function Section({ title, description, actions, children, className, id }) {
  return (
    <section className={cn("grid gap-3", className)} aria-labelledby={title && id ? `${id}-title` : undefined} id={id}>
      {title || actions ? (
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            {title ? (
              <h2 id={id ? `${id}-title` : undefined} className="text-ui-lg font-semibold text-fg">
                {title}
              </h2>
            ) : null}
            {description ? <p className="mt-0.5 text-ui-sm text-fg-muted">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
        </div>
      ) : null}
      {children}
    </section>
  );
}

/**
 * <DescriptionList items={[{ label: "Email", value: user.email }, ...]} columns={2} />
 * Null/undefined/"" values render as "—".
 */
export function DescriptionList({ items = [], columns = 1, className }) {
  return (
    <dl className={cn("grid gap-x-6 gap-y-3", columns === 2 && "sm:grid-cols-2", columns === 3 && "sm:grid-cols-2 lg:grid-cols-3", className)}>
      {items.filter(Boolean).map((item) => (
        <KeyValue key={item.key || (typeof item.label === "string" ? item.label : undefined)} label={item.label} value={item.value} className={item.className} />
      ))}
    </dl>
  );
}

export function KeyValue({ label, value, className, inline }) {
  const empty = value === null || value === undefined || value === "";
  return (
    <div className={cn(inline ? "flex items-baseline justify-between gap-4" : "grid gap-0.5", className)}>
      <dt className="text-ui-xs font-medium text-fg-subtle">{label}</dt>
      <dd className={cn("min-w-0 break-words text-ui-sm text-fg", inline && "text-right")}>{empty ? <span className="text-fg-subtle">—</span> : value}</dd>
    </div>
  );
}

export default Card;
