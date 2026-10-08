import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "./cn.js";
import { useDocumentTitle } from "../../../shared/hooks/useDocumentTitle.js";

/**
 * Breadcrumbs with schema-friendly markup. items: [{ label, to? }]; the last item is the current page.
 */
export function Breadcrumbs({ items = [], className }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex flex-wrap items-center gap-1 text-shop-sm text-shop-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <li key={`${item.label}-${i}`} className="inline-flex min-w-0 items-center gap-1">
              {i ? <ChevronRight className="size-3.5 shrink-0 text-shop-subtle" aria-hidden /> : null}
              {item.to && !last ? (
                <Link to={item.to} className="inline-flex min-w-0 items-center rounded hover:text-shop-ink hover:underline pointer-coarse:min-h-11">
                  <span className="truncate">{item.label}</span>
                </Link>
              ) : (
                <span aria-current={last ? "page" : undefined} className={cn("truncate", last && "font-medium text-shop-ink")}>
                  {item.label}
                </span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/**
 * Page title block. Sets document.title (`title` or `documentTitle`).
 *   <ShopPageHeader title="Your orders" description="…" breadcrumbs={[…]} actions={<Button/>} />
 * One kicker per page at most (`kicker`).
 */
export function ShopPageHeader({ title, documentTitle, description, kicker, breadcrumbs, actions, meta, className, as: H = "h1" }) {
  useDocumentTitle(documentTitle || (typeof title === "string" ? title : null));
  return (
    <header className={cn("grid gap-3", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          {kicker ? <p className="mb-1 text-shop-xs font-semibold uppercase tracking-wide text-shop-primary-ink">{kicker}</p> : null}
          <H className="font-display text-shop-xl font-bold text-shop-ink md:text-shop-2xl">{title}</H>
          {description ? <p className="mt-1 max-w-2xl text-shop-base text-shop-muted">{description}</p> : null}
          {meta ? <div className="mt-2 flex flex-wrap items-center gap-2">{meta}</div> : null}
        </div>
        {actions ? <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </header>
  );
}

/** Section heading with an optional "View all" link. */
export function SectionHeading({ title, description, to, action = "View all", className, id }) {
  return (
    <div className={cn("mb-4 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        <h2 id={id} className="font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
          {title}
        </h2>
        {description ? <p className="mt-0.5 text-shop-sm text-shop-muted">{description}</p> : null}
      </div>
      {to ? (
        <Link to={to} className="inline-flex min-h-11 shrink-0 items-center gap-0.5 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
          {action}
          <ChevronRight className="size-4" aria-hidden />
        </Link>
      ) : null}
    </div>
  );
}

/**
 * Empty view. `action` is a node (e.g. <Button to="/">Continue shopping</Button>).
 */
export function EmptyState({ icon: Icon, title, description, action, children, className, compact = false }) {
  return (
    <div className={cn("rounded-card border border-dashed border-shop-line-strong bg-shop-card text-center", compact ? "px-4 py-8" : "px-6 py-14", className)}>
      {Icon ? (
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
          <Icon className="size-6" strokeWidth={1.75} aria-hidden />
        </span>
      ) : null}
      <h2 className="mt-4 font-display text-shop-lg font-bold text-shop-ink">{title}</h2>
      {description ? <p className="mx-auto mt-1.5 max-w-md text-shop-base text-shop-muted">{description}</p> : null}
      {action || children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{action}{children}</div> : null}
    </div>
  );
}

/** Inline notice. tone: info | success | warning | danger | business. */
export function Notice({ tone = "info", title, children, action, icon: Icon, className }) {
  const tones = {
    info: "border-shop-line bg-shop-info-soft text-shop-info-ink",
    success: "border-shop-line bg-shop-primary-soft text-shop-primary-ink",
    warning: "border-shop-line bg-shop-warning-soft text-shop-warning-ink",
    danger: "border-shop-line bg-shop-danger-soft text-shop-danger-ink",
    business: "border-shop-line bg-shop-gold-soft text-shop-gold-ink",
  };
  return (
    <div role={tone === "danger" ? "alert" : "status"} className={cn("flex items-start gap-3 rounded-card border px-4 py-3 text-shop-sm", tones[tone], className)}>
      {Icon ? <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={2} aria-hidden /> : null}
      <div className="min-w-0 flex-1">
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={title ? "mt-0.5" : ""}>{children}</div> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

/** White card surface. */
export function Card({ as: Tag = "div", className, children, ...props }) {
  return (
    <Tag className={cn("rounded-card border border-shop-line bg-shop-card", className)} {...props}>
      {children}
    </Tag>
  );
}
