/**
 * /pages/:slug — public CMS page (GET /cms/pages/:slug; a store page falls back to the global one).
 * Sections: { kind: "html", html } (sanitised server-side), { kind: "text"|"markdown", text|body },
 * { kind: "heading", text }, { kind: "faq", q, a }. Unknown kinds are skipped.
 * Rendered in the reading layout (pages/legal/Article.jsx): prose typography, "On this page" table of
 * contents from the headings, last-updated date and related policy links.
 */
import { useRef } from "react";
import { Navigate, useParams } from "react-router-dom";
import { ChevronDown, Clock, FileQuestion, LifeBuoy, Mail, Scale } from "lucide-react";
import { useCmsPage, usePublicSettings } from "../hooks/useCatalog.js";
import { Button, EmptyState, PageSkeleton } from "../components/ui/index.js";
import { resolveLegal } from "../config/legal.js";
import { formatDate } from "../../shared/lib/format.js";
import { ArticleLayout, PROSE, useHeadings } from "./legal/Article.jsx";
import { Fact } from "./discovery/content.jsx";

const RELATED_EXTRA = [
  { to: "/legal", label: "Legal & company details" },
  { to: "/help", label: "Help centre" },
];

const isoDate = (v) => {
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? undefined : d.toISOString().slice(0, 10);
};

function Section({ s }) {
  if (!s || typeof s !== "object") return null;
  if (s.kind === "html" && s.html) return <div className="cms-prose" dangerouslySetInnerHTML={{ __html: s.html }} />;
  if (s.kind === "heading" && s.text) return <h2>{s.text}</h2>;
  if ((s.kind === "text" || s.kind === "markdown") && (s.text || s.body))
    return String(s.text || s.body)
      .split(/\n{2,}/)
      .map((p, i) => <p key={i}>{p}</p>);
  if (s.kind === "faq" && s.q)
    return (
      <details className="group my-3 rounded-xl border border-shop-line bg-shop-card">
        <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-shop-base font-semibold text-shop-ink [&::-webkit-details-marker]:hidden">
          {s.q}
          <ChevronDown className="size-4 shrink-0 text-shop-muted transition-transform group-open:rotate-180" aria-hidden />
        </summary>
        <div className="px-4 pb-4 text-shop-base [&_p]:my-0">{s.a}</div>
      </details>
    );
  return null;
}

function GrievanceFallback() {
  const settings = usePublicSettings();
  const legal = resolveLegal(settings.data);
  const g = legal.grievanceOfficer;
  return (
    <div className="grid gap-5 text-shop-md leading-[1.75] text-shop-text">
      <p>
        In line with the Consumer Protection (E-Commerce) Rules, 2020, you can raise a complaint with our grievance officer. We acknowledge complaints within 48 hours and resolve them within one month.
      </p>
      <div className="rounded-[1.25rem] border border-shop-line bg-shop-card p-5 shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
            <Scale className="size-[18px]" strokeWidth={1.75} aria-hidden />
          </span>
          <dl className="grid gap-1 text-shop-base">
            <dt className="font-semibold text-shop-ink">
              <Fact value={g.name} />, <Fact value={g.designation} />
            </dt>
            <dd>
              <Fact value={legal.legalName} />
            </dd>
            <dd>
              <Fact value={legal.address} />
            </dd>
            <dd className="flex flex-wrap items-center gap-x-2">
              <span className="inline-flex items-center gap-1.5">
                <Mail className="size-4 text-shop-muted" aria-hidden />
                <Fact value={g.email} />
              </span>
              <span aria-hidden>·</span>
              <Fact value={g.phone} />
            </dd>
          </dl>
        </div>
      </div>
      <p className="text-shop-base text-shop-muted">For order issues, messaging support is usually the fastest way to a resolution.</p>
      <div className="flex flex-wrap gap-2">
        <Button to="/account/support?new=1" leftIcon={LifeBuoy}>
          Message support
        </Button>
        <Button to="/legal" variant="secondary">
          Legal details
        </Button>
      </div>
    </div>
  );
}

export default function CmsPage() {
  const { slug } = useParams();
  const q = useCmsPage(slug);
  const bodyRef = useRef(null);
  const page = q.data;
  const headings = useHeadings(bodyRef, [page]);

  if (q.isPending) return <PageSkeleton rows={2} />;
  if (q.error) {
    if (slug === "grievance")
      return (
        <ArticleLayout title="Grievance redressal" breadcrumbs={[{ label: "Home", to: "/" }, { label: "Legal", to: "/legal" }, { label: "Grievance redressal" }]} current="/pages/grievance" relatedExtra={RELATED_EXTRA}>
          <GrievanceFallback />
        </ArticleLayout>
      );
    return (
      <div className="msr-gutter py-10">
        <EmptyState
          icon={FileQuestion}
          title={q.error.status === 404 ? "Page not found" : "Couldn’t load this page"}
          description={q.error.status === 404 ? "This page doesn’t exist or isn’t published yet." : q.error.message}
          action={
            <>
              {q.error.status !== 404 ? (
                <Button variant="secondary" onClick={() => q.refetch()}>
                  Try again
                </Button>
              ) : null}
              <Button to="/legal" variant="secondary">
                All policies
              </Button>
              <Button to="/">Go to the shop</Button>
            </>
          }
        />
      </div>
    );
  }
  // `returns` ↔ `refunds` alias: the server serves the other page and says so; use its URL.
  if (page?.aliasOf && page.aliasOf !== slug) return <Navigate to={`/pages/${page.aliasOf}`} replace />;
  const updated = page.updatedAt || page.publishedAt;
  const sections = page.sections || [];
  return (
    <ArticleLayout
      title={page.title}
      documentTitle={page.seo?.title || page.title}
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Legal", to: "/legal" }, { label: page.title }]}
      meta={
        updated ? (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-shop-well px-2.5 py-1 text-shop-xs font-medium text-shop-text">
            <Clock className="size-3.5" aria-hidden />
            Last updated <time dateTime={isoDate(updated)}>{formatDate(updated)}</time>
          </span>
        ) : null
      }
      headings={headings}
      current={`/pages/${slug}`}
      relatedExtra={RELATED_EXTRA}
    >
      <div ref={bodyRef} className={PROSE}>
        {sections.length ? sections.map((s, i) => <Section key={i} s={s} />) : <p className="text-shop-muted">This page has no content yet.</p>}
      </div>
    </ArticleLayout>
  );
}
