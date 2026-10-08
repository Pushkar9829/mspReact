import { Fragment } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "./cn.js";
import { Button, IconButton } from "./Button.jsx";
import { NativeSelect } from "./form.jsx";
import { useDocumentTitle } from "../hooks/useDocumentTitle.js";

/* ------------------------------------------------------------------ Breadcrumbs */

/** items: [{ label, to? }] — the last item is the current page. */
export function Breadcrumbs({ items = [], className }) {
  if (!items.length) return null;
  return (
    <nav aria-label="Breadcrumb" className={cn("min-w-0", className)}>
      <ol className="flex min-w-0 items-center gap-1 text-ui-sm text-fg-muted">
        {items.map((item, i) => {
          const last = i === items.length - 1;
          return (
            <Fragment key={`${item.label}-${i}`}>
              <li className={cn("min-w-0", last ? "truncate font-medium text-fg" : "hidden truncate sm:block")}>
                {item.to && !last ? (
                  <Link to={item.to} className="rounded-xs hover:text-fg hover:underline">
                    {item.label}
                  </Link>
                ) : (
                  <span aria-current={last ? "page" : undefined}>{item.label}</span>
                )}
              </li>
              {!last ? (
                <li aria-hidden className="hidden text-fg-subtle sm:block">
                  <ChevronRight className="size-3.5" />
                </li>
              ) : null}
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

/* ------------------------------------------------------------------ PageHeader */

/**
 * <PageHeader title="Orders" description="…" breadcrumbs={[{label:"Orders", to:"/tenant/orders"}, {label:"MSR10231"}]}
 *   back="/tenant/orders" meta={<StatusPill …/>} primaryAction={<Button variant="primary">New</Button>}
 *   secondaryActions={<Button>Export</Button>} />
 * Also sets document.title (pass `documentTitle` to override, or false to skip).
 */
export function PageHeader({ title, description, breadcrumbs, back, meta, primaryAction, secondaryActions, actions, documentTitle, className }) {
  useDocumentTitle(documentTitle === false ? null : documentTitle || (typeof title === "string" ? title : null));
  const navigate = useNavigate();
  const location = useLocation();
  return (
    <header className={cn("grid gap-2 pb-5", className)}>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div className="flex min-w-0 items-start gap-2">
          {back ? (
            <IconButton
              icon={ArrowLeft}
              label="Back"
              size="sm"
              variant="ghost"
              className="mt-0.5"
              onClick={() => (location.key !== "default" ? navigate(-1) : navigate(back))}
            />
          ) : null}
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="truncate text-title font-semibold tracking-tight text-fg">{title}</h1>
              {meta}
            </div>
            {description ? <p className="mt-1 max-w-3xl text-ui-sm text-fg-muted">{description}</p> : null}
          </div>
        </div>
        {primaryAction || secondaryActions || actions ? (
          <div className="flex flex-wrap items-center gap-2">
            {secondaryActions}
            {actions}
            {primaryAction}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ Pagination */

function windowOf(current, pages) {
  const out = [];
  const start = Math.max(1, Math.min(current - 2, pages - 4));
  const end = Math.min(pages, start + 4);
  for (let n = start; n <= end; n += 1) out.push(n);
  return out;
}

/**
 * <Pagination page={2} limit={20} total={135} onPageChange={setPage} onLimitChange={setLimit} />
 * Accepts `meta` ({ total, page, limit, pages }) instead of the individual props.
 */
export function Pagination({ meta, page: pageProp, limit: limitProp, total: totalProp, onPageChange, onLimitChange, limits = [10, 20, 50, 100], className, compact }) {
  const total = Number(totalProp ?? meta?.total ?? 0);
  const limit = Number(limitProp ?? meta?.limit ?? 20);
  const page = Number(pageProp ?? meta?.page ?? 1);
  const pages = Math.max(1, Number(meta?.pages) || Math.ceil(total / limit) || 1);
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = Math.min(total, page * limit);
  return (
    <nav aria-label="Pagination" className={cn("flex flex-wrap items-center justify-between gap-3 text-ui-sm text-fg-muted", className)}>
      <div className="flex items-center gap-3">
        <p aria-live="polite">
          {total ? (
            <>
              <span className="tabular-nums text-fg">{from.toLocaleString("en-IN")}</span>–<span className="tabular-nums text-fg">{to.toLocaleString("en-IN")}</span> of{" "}
              <span className="tabular-nums text-fg">{total.toLocaleString("en-IN")}</span>
            </>
          ) : (
            "No results"
          )}
        </p>
        {onLimitChange && !compact ? (
          <label className="hidden items-center gap-2 sm:flex">
            <span>Rows</span>
            <NativeSelect size="sm" className="w-[4.5rem]" value={limit} onChange={(e) => onLimitChange(Number(e.target.value))} options={limits.map((n) => ({ value: n, label: String(n) }))} />
          </label>
        ) : null}
      </div>
      <div className="flex items-center gap-1">
        <IconButton icon={ChevronLeft} label="Previous page" size="sm" variant="secondary" disabled={page <= 1} onClick={() => onPageChange?.(page - 1)} />
        {!compact
          ? windowOf(page, pages).map((n) => (
              <Button
                key={n}
                size="sm"
                variant={n === page ? "primary" : "ghost"}
                aria-current={n === page ? "page" : undefined}
                aria-label={`Page ${n}`}
                className="hidden min-w-8 px-2 tabular-nums sm:inline-flex"
                onClick={() => onPageChange?.(n)}
              >
                {n}
              </Button>
            ))
          : null}
        <span className="px-2 tabular-nums sm:hidden">
          {page} / {pages}
        </span>
        <IconButton icon={ChevronRight} label="Next page" size="sm" variant="secondary" disabled={page >= pages} onClick={() => onPageChange?.(page + 1)} />
      </div>
    </nav>
  );
}
