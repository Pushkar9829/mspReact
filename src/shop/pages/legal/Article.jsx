/**
 * Reading layout for policy / CMS pages (/pages/:slug, /legal):
 *   - header (breadcrumbs, title, optional last-updated meta)
 *   - content column at a comfortable measure, `PROSE` typography for server HTML
 *   - "On this page" table of contents built from the rendered <h2>s: sticky aside on desktop,
 *     collapsible box on phones; the section in view is highlighted
 *   - related policy links
 */
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, ChevronRight, FileText } from "lucide-react";
import { ShopPageHeader, cn } from "../../components/ui/index.js";
import { POLICY_LINKS } from "../../config/legal.js";

/** Typography for CMS HTML / text (no typography plugin in the project). */
export const PROSE = cn(
  "text-shop-md leading-[1.75] text-shop-text [&>*:first-child]:mt-0",
  "[&_h2]:mb-3 [&_h2]:mt-10 [&_h2]:scroll-mt-32 [&_h2]:font-display [&_h2]:text-shop-xl [&_h2]:font-bold [&_h2]:leading-snug [&_h2]:text-shop-ink",
  "[&_h3]:mb-2 [&_h3]:mt-7 [&_h3]:scroll-mt-32 [&_h3]:font-display [&_h3]:text-shop-lg [&_h3]:font-semibold [&_h3]:text-shop-ink",
  "[&_p]:my-4 [&_ul]:my-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:my-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:my-1.5 [&_li]:pl-1",
  "[&_a]:font-medium [&_a]:text-shop-primary-ink [&_a]:underline [&_a]:underline-offset-2 [&_strong]:font-semibold [&_strong]:text-shop-ink",
  "[&_blockquote]:my-5 [&_blockquote]:border-l-4 [&_blockquote]:border-shop-gold [&_blockquote]:pl-4 [&_blockquote]:text-shop-muted [&_hr]:my-8 [&_hr]:border-shop-line",
  "[&_table]:my-5 [&_table]:block [&_table]:max-w-full [&_table]:overflow-x-auto [&_table]:text-shop-sm [&_th]:border [&_th]:border-shop-line [&_th]:bg-shop-well [&_th]:px-3 [&_th]:py-2 [&_th]:text-left [&_td]:border [&_td]:border-shop-line [&_td]:px-3 [&_td]:py-2 [&_img]:my-5 [&_img]:rounded-xl"
);

const slugify = (t) =>
  String(t || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "section";

/** Collect the <h2>s inside `root` (giving them stable ids) once content has rendered. */
export function useHeadings(rootRef, deps = []) {
  const [items, setItems] = useState([]);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const seen = new Set();
    const next = [...root.querySelectorAll("h2")]
      .map((h) => {
        const text = h.textContent.trim();
        if (!text) return null;
        if (!h.id) {
          let id = slugify(text);
          let n = 2;
          while (seen.has(id) || (document.getElementById(id) && document.getElementById(id) !== h)) id = `${slugify(text)}-${n++}`;
          h.id = id;
        }
        seen.add(h.id);
        return { id: h.id, text };
      })
      .filter(Boolean);
    setItems(next);
  }, deps); // eslint-disable-line react-hooks/exhaustive-deps
  return items;
}

function useActiveHeading(items) {
  const [active, setActive] = useState("");
  useEffect(() => {
    if (!items.length || typeof IntersectionObserver === "undefined") return undefined;
    const els = items.map((i) => document.getElementById(i.id)).filter(Boolean);
    const io = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -65% 0px" }
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [items]);
  return active || items[0]?.id || "";
}

function TocList({ items, active }) {
  return (
    <ol className="grid gap-0.5 border-l border-shop-line">
      {items.map((h) => (
        <li key={h.id}>
          <a
            href={`#${h.id}`}
            aria-current={active === h.id ? "location" : undefined}
            className={cn(
              "-ml-px flex min-h-9 items-center border-l-2 py-1.5 pl-3 pr-2 text-shop-sm leading-snug transition-colors pointer-coarse:min-h-11",
              active === h.id ? "border-shop-primary font-semibold text-shop-primary-ink" : "border-transparent text-shop-muted hover:border-shop-line-strong hover:text-shop-ink"
            )}
          >
            {h.text}
          </a>
        </li>
      ))}
    </ol>
  );
}

function RelatedPolicies({ current, extra = [] }) {
  const links = [...POLICY_LINKS.filter((p) => p.to !== current), ...extra.filter((p) => p.to !== current)];
  if (!links.length) return null;
  return (
    <nav aria-label="Related policies" className="rounded-[1.25rem] border border-shop-line bg-shop-card p-4">
      <p className="mb-2 flex items-center gap-2 text-shop-xs font-semibold uppercase tracking-wide text-shop-muted">
        <FileText className="size-3.5" aria-hidden /> Related policies
      </p>
      <ul className="divide-y divide-shop-line">
        {links.map((p) => (
          <li key={p.to}>
            <Link to={p.to} className="flex min-h-11 items-center justify-between gap-2 text-shop-sm font-medium text-shop-ink hover:text-shop-primary-ink">
              {p.label}
              <ChevronRight className="size-4 shrink-0 text-shop-subtle" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}

/**
 * <ArticleLayout title documentTitle breadcrumbs meta description current headings>{content}</ArticleLayout>
 * `headings` from useHeadings(ref). `current` is this page's path (left out of related links).
 */
export function ArticleLayout({ title, documentTitle, description, breadcrumbs, meta, headings = [], current, relatedExtra, children, footer }) {
  const active = useActiveHeading(headings);
  const showToc = headings.length >= 2;
  return (
    <div className="msr-gutter py-5 md:py-8">
      <div className="mx-auto grid max-w-6xl grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_260px] lg:gap-10">
        <article className="min-w-0">
          <ShopPageHeader title={title} documentTitle={documentTitle} description={description} breadcrumbs={breadcrumbs} meta={meta} className="mb-6 border-b border-shop-line pb-6" />

          {showToc ? (
            <details className="group mb-6 rounded-xl border border-shop-line bg-shop-card lg:hidden">
              <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-2 px-4 text-shop-sm font-semibold text-shop-ink [&::-webkit-details-marker]:hidden">
                On this page
                <ChevronDown className="size-4 text-shop-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="px-4 pb-3">
                <TocList items={headings} active={active} />
              </div>
            </details>
          ) : null}

          <div className="max-w-[46rem]">{children}</div>
          {footer ? <div className="mt-10 max-w-[46rem]">{footer}</div> : null}
          <div className="mt-10 max-w-[46rem] lg:hidden">
            <RelatedPolicies current={current} extra={relatedExtra} />
          </div>
        </article>

        <aside className="hidden lg:block">
          <div className="sticky top-[8.5rem] grid gap-5">
            {showToc ? (
              <nav aria-label="On this page">
                <p className="mb-2 text-shop-xs font-semibold uppercase tracking-wide text-shop-muted">On this page</p>
                <TocList items={headings} active={active} />
              </nav>
            ) : null}
            <RelatedPolicies current={current} extra={relatedExtra} />
          </div>
        </aside>
      </div>
    </div>
  );
}
