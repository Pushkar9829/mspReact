/**
 * /legal — legal entity details (Consumer Protection (E-Commerce) Rules, 2020) and links to the
 * policy pages (CMS, /pages/:slug). Values come from public settings, falling back to
 * src/shop/config/legal.js placeholders; nothing here is invented.
 * Uses the reading layout (pages/legal/Article.jsx) with an "On this page" table of contents.
 */
import { useRef } from "react";
import { Link } from "react-router-dom";
import { Building2, ChevronRight, FileText, ReceiptText, Scale } from "lucide-react";
import { usePublicSettings } from "../hooks/index.js";
import { Button, Skeleton } from "../components/ui/index.js";
import { POLICY_LINKS, resolveLegal } from "../config/legal.js";
import { Fact, RefundPolicy } from "./discovery/content.jsx";
import { ArticleLayout, useHeadings } from "./legal/Article.jsx";

function Row({ label, value }) {
  if (!value) return null;
  return (
    <div className="grid gap-0.5 py-2.5 sm:grid-cols-[11rem_minmax(0,1fr)] sm:gap-4">
      <dt className="text-shop-sm text-shop-muted">{label}</dt>
      <dd className="break-words text-shop-base text-shop-ink">
        <Fact value={value} />
      </dd>
    </div>
  );
}

function Block({ id, icon: Icon, title, children }) {
  return (
    <section aria-labelledby={id} className="scroll-mt-32 border-t border-shop-line pt-8 first:border-t-0 first:pt-0">
      <h2 id={id} className="flex scroll-mt-32 items-center gap-3 font-display text-shop-xl font-bold text-shop-ink">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        {title}
      </h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function Legal() {
  const settings = usePublicSettings();
  const legal = resolveLegal(settings.data);
  const g = legal.grievanceOfficer;
  const s = settings.data;
  const bodyRef = useRef(null);
  const headings = useHeadings(bodyRef, []);

  return (
    <ArticleLayout
      title="Legal & policies"
      description="Who operates this marketplace, our policies and how to raise a complaint."
      breadcrumbs={[{ label: "Home", to: "/" }, { label: "Legal" }]}
      headings={headings}
      current="/legal"
      relatedExtra={[{ to: "/help", label: "Help centre" }]}
    >
      <div ref={bodyRef} className="grid gap-8">
        <Block id="policies" icon={FileText} title="Policies">
          <ul className="grid gap-2 sm:grid-cols-2">
            {POLICY_LINKS.map((p) => (
              <li key={p.to}>
                <Link
                  to={p.to}
                  className="group flex min-h-14 items-center justify-between gap-3 rounded-xl border border-shop-line bg-shop-card px-4 text-shop-base font-semibold text-shop-ink transition-colors hover:border-shop-primary hover:text-shop-primary-ink"
                >
                  {p.label}
                  <ChevronRight className="size-4 shrink-0 text-shop-subtle transition-transform group-hover:translate-x-0.5 group-hover:text-shop-primary-ink" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        </Block>

        <Block id="operator" icon={Building2} title="Marketplace operator">
          {settings.isPending ? (
            <Skeleton className="h-40 w-full rounded-xl" />
          ) : (
            <dl className="divide-y divide-shop-line rounded-xl border border-shop-line bg-shop-card px-4">
              <Row label="Legal name" value={legal.legalName} />
              <Row label="Trade name" value={legal.tradeName} />
              <Row label="Registered office" value={legal.address} />
              <Row label="GSTIN" value={legal.gstin} />
              <Row label="CIN" value={legal.cin} />
              <Row label="Customer care phone" value={legal.phone} />
              <Row label="Customer care email" value={legal.email} />
              <Row label="Support hours" value={legal.hours} />
            </dl>
          )}
          <p className="mt-3 text-shop-sm leading-relaxed text-shop-muted">Products are sold and invoiced by the independent sellers named on each product page and invoice. Each seller’s legal name, address and GSTIN appear on its invoices.</p>
        </Block>

        <Block id="grievance-officer" icon={Scale} title="Grievance officer">
          <dl className="divide-y divide-shop-line rounded-xl border border-shop-line bg-shop-card px-4">
            <Row label="Name" value={g.name} />
            <Row label="Designation" value={g.designation} />
            <Row label="Email" value={g.email} />
            <Row label="Phone" value={g.phone} />
          </dl>
          <p className="mt-3 text-shop-sm leading-relaxed text-shop-muted">Complaints are acknowledged within 48 hours and resolved within one month of receipt.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button to="/pages/grievance" variant="secondary" size="sm">
              Grievance redressal process
            </Button>
            <Button to="/help#contact" variant="ghost" size="sm">
              Other ways to contact us
            </Button>
          </div>
        </Block>

        <Block id="refunds" icon={ReceiptText} title="Refunds summary">
          <RefundPolicy returnWindowDays={s?.returnWindowDays} returnsEnabled={s?.returnsEnabled} />
          <Link to="/pages/refunds" className="mt-3 inline-flex min-h-11 items-center gap-1 text-shop-sm font-semibold text-shop-primary-ink hover:underline">
            Full returns & refunds policy <ChevronRight className="size-4" aria-hidden />
          </Link>
        </Block>
      </div>
    </ArticleLayout>
  );
}
