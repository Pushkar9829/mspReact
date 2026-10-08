/**
 * /help and /account/help — help centre.
 *  - Hero with an instant search over the FAQs and help topics.
 *  - Topic cards (ordering, delivery, payments, returns, FAQs, contact) that jump to their section.
 *  - Guides per topic, then the FAQ accordion with topic filter chips.
 *  - Contact options: support conversations (tickets), email, phone, grievance officer.
 * FAQs come from the CMS "help" page when it is published (faq sections; an optional `topic` matching a
 * topic id groups them), otherwise from the structured content below. Contact details come from
 * public settings / config/legal.js; delivery and returns facts from public settings only.
 */
import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { ChevronDown, ChevronRight, CreditCard, Inbox, LifeBuoy, Mail, MessageCircle, PackageCheck, Phone, RotateCcw, Scale, Search, Truck, X } from "lucide-react";
import { useCmsPage, usePublicSettings, useViewer } from "../hooks/index.js";
import { Button, Skeleton, cn } from "../components/ui/index.js";
import { useDocumentTitle } from "../../shared/hooks/useDocumentTitle.js";
import { formatListing } from "../lib/money.js";
import { resolveLegal } from "../config/legal.js";
import { Fact, RefundPolicy } from "./discovery/content.jsx";

const TOPICS = [
  { id: "ordering", label: "Ordering", blurb: "Carts, sellers, bulk slabs and minimums", icon: PackageCheck, keywords: "order cart seller slab bulk moq minimum quantity restock alert notify" },
  { id: "delivery", label: "Delivery", blurb: "PIN codes, delivery times and fees", icon: Truck, keywords: "delivery shipping pin code pincode eta fee pickup lead time" },
  { id: "payments", label: "Payments", blurb: "UPI, cards, COD, credit and invoices", icon: CreditCard, keywords: "payment pay upi card net banking cod cash credit terms purchase order po gst invoice gstin" },
  { id: "returns", label: "Returns & refunds", blurb: "Return window and where refunds go", icon: RotateCcw, keywords: "return refund cancel credit note money back" },
  { id: "faq", label: "FAQs", blurb: "Quick answers to common questions", icon: LifeBuoy, keywords: "faq question answer" },
  { id: "contact", label: "Contact us", blurb: "Message support or reach our team", icon: Mail, keywords: "contact support email phone ticket message grievance complaint help" },
];
const TOPIC_LABEL = Object.fromEntries(TOPICS.map((t) => [t.id, t.label]));

function builtInFaqs(s) {
  return [
    { topic: "ordering", q: "Who sells the products?", a: "Every product is sold and invoiced by the seller named on the product page (“Sold by …”). The marketplace connects you with verified sellers; each seller ships and invoices their own items, so a cart with several sellers becomes one order per seller." },
    { topic: "ordering", q: "What are slab or bulk prices?", a: "Bulk-eligible products get cheaper per pack as the quantity in your cart goes up. The cart applies the right slab automatically and shows how many more packs unlock the next price." },
    { topic: "ordering", q: "Is there a minimum order?", a: "Below the bulk quantity you can buy any number of packs at the regular price. From the bulk quantity the seller’s case size applies, up to their per-order maximum." },
    { topic: "payments", q: "Do I get a GST invoice?", a: `Yes, the seller issues a GST invoice for every order${s?.taxInclusive === false ? "" : " (prices include GST)"}. Add your GSTIN at checkout to claim input tax credit. Download invoices from the order page.` },
    { topic: "returns", q: "Can I cancel an order?", a: "Yes, until the seller ships it. Open the order under My account → Orders and choose Cancel. Anything you paid is refunded as described under Returns & refunds." },
    { topic: "ordering", q: "How do restock alerts work?", a: "On an out-of-stock product, tap “Notify me”. Signed-in buyers are subscribed straight away; guests confirm by email first. We email you once when it is back." },
  ];
}

const norm = (v) => String(v || "").toLowerCase();

function Section({ id, icon: Icon, title, children, className }) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn("scroll-mt-36 rounded-[1.25rem] border border-shop-line bg-shop-card p-4 md:p-6", className)}>
      <h2 id={`${id}-h`} className="flex items-center gap-3 font-display text-shop-lg font-bold text-shop-ink">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        {title}
      </h2>
      <div className="mt-4 grid gap-2.5 text-shop-base leading-relaxed text-shop-text">{children}</div>
    </section>
  );
}

/** FAQ accordion on <details>; `forceOpen` opens every item (search results). */
function Accordion({ items, forceOpen }) {
  return (
    <div className="divide-y divide-shop-line overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card">
      {items.map((item, i) => (
        <details key={`${item.q}-${i}-${forceOpen ? 1 : 0}`} open={forceOpen || undefined} className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 text-shop-base font-semibold text-shop-ink hover:bg-shop-hover md:px-5 [&::-webkit-details-marker]:hidden">
            <span className="min-w-0">
              {item.q}
              {item.topic && TOPIC_LABEL[item.topic] ? <span className="mt-0.5 block text-shop-xs font-medium text-shop-muted">{TOPIC_LABEL[item.topic]}</span> : null}
            </span>
            <span className="grid size-8 shrink-0 place-items-center rounded-full bg-shop-page text-shop-muted transition-transform group-open:rotate-180">
              <ChevronDown className="size-4" aria-hidden />
            </span>
          </summary>
          <div className="px-4 pb-4 text-shop-base leading-relaxed text-shop-text md:px-5">{item.a}</div>
        </details>
      ))}
    </div>
  );
}

function ContactTile({ icon: Icon, title, children, action }) {
  return (
    <li className="flex min-w-0 flex-col gap-3 rounded-xl border border-shop-line bg-shop-page/60 p-4">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
          <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="font-semibold text-shop-ink">{title}</p>
          <div className="mt-0.5 break-words text-shop-sm text-shop-muted">{children}</div>
        </div>
      </div>
      {action ? <div className="mt-auto flex flex-wrap gap-2">{action}</div> : null}
    </li>
  );
}

export default function Help() {
  useDocumentTitle("Help centre");
  const { hash, pathname } = useLocation();
  const nested = pathname.startsWith("/account");
  const settings = usePublicSettings();
  const cms = useCmsPage("help");
  const { signedIn } = useViewer();
  const s = settings.data;
  const legal = resolveLegal(s);
  const d = s?.delivery || {};
  const [query, setQuery] = useState("");
  const [topic, setTopic] = useState("all");

  useEffect(() => {
    if (!hash) return;
    const t = setTimeout(() => document.querySelector(hash)?.scrollIntoView({ block: "start" }), 50);
    return () => clearTimeout(t);
  }, [hash, cms.isPending]);

  const cmsFaqs = (cms.data?.sections || []).filter((x) => x?.kind === "faq" && x.q).map((x) => ({ q: x.q, a: x.a, topic: TOPIC_LABEL[x.topic] ? x.topic : undefined }));
  const faqs = cmsFaqs.length ? cmsFaqs : builtInFaqs(s);
  const faqTopics = useMemo(() => [...new Set(faqs.map((f) => f.topic).filter(Boolean))], [faqs]);

  const q = norm(query.trim());
  const searching = q.length > 0;
  const words = q.split(/\s+/).filter(Boolean);
  const matches = (text) => words.every((w) => text.includes(w));
  const faqHits = searching ? faqs.filter((f) => matches(norm(`${f.q} ${typeof f.a === "string" ? f.a : ""} ${TOPIC_LABEL[f.topic] || ""}`))) : [];
  const topicHits = searching ? TOPICS.filter((t) => matches(norm(`${t.label} ${t.blurb} ${t.keywords}`))) : [];
  const shownFaqs = topic === "all" ? faqs : faqs.filter((f) => f.topic === topic);

  const supportNew = "/account/support?new=1";

  return (
    <div className={nested ? "grid grid-cols-[minmax(0,1fr)] gap-6" : "msr-gutter grid grid-cols-[minmax(0,1fr)] gap-6 py-5 md:gap-8 md:py-6"}>
      {/* Hero + search */}
      <header className="shop-on-navy relative overflow-hidden rounded-[1.25rem] bg-shop-navy px-5 py-7 text-white md:px-10 md:py-10">
        <div aria-hidden className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(50% 60% at 100% 0%, rgba(212,160,23,0.16), transparent 70%)" }} />
        <div className="relative max-w-2xl">
          {!nested ? (
            <nav aria-label="Breadcrumb" className="mb-3">
              <ol className="flex items-center gap-1 text-shop-sm text-shop-on-navy-muted">
                <li>
                  <Link to="/" className="inline-flex items-center hover:text-white hover:underline pointer-coarse:min-h-11">
                    Home
                  </Link>
                </li>
                <li aria-hidden>
                  <ChevronRight className="size-3.5" />
                </li>
                <li aria-current="page" className="font-medium text-white">
                  Help
                </li>
              </ol>
            </nav>
          ) : null}
          <h1 className="font-display text-shop-2xl font-bold tracking-tight md:text-shop-3xl">How can we help?</h1>
          <p className="mt-1.5 text-shop-base text-shop-on-navy-muted">Ordering, delivery, payments, returns and how to reach us.</p>
          <div className="relative mt-5">
            <label htmlFor="help-search" className="sr-only">
              Search help
            </label>
            <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-shop-muted" aria-hidden />
            <input
              id="help-search"
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. GST invoice, refund, delivery"
              autoComplete="off"
              className="h-12 w-full rounded-full border-0 bg-white pl-12 pr-12 text-shop-base text-shop-ink shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)] outline-none ring-2 ring-transparent placeholder:text-shop-subtle focus:ring-shop-gold [&::-webkit-search-cancel-button]:hidden"
            />
            {query ? (
              <button type="button" onClick={() => setQuery("")} aria-label="Clear search" className="absolute right-1 top-1/2 grid size-10 -translate-y-1/2 place-items-center rounded-full text-shop-muted hover:bg-shop-hover hover:text-shop-ink">
                <X className="size-4" aria-hidden />
              </button>
            ) : null}
          </div>
        </div>
      </header>

      {searching ? (
        <section aria-labelledby="help-results-h" className="grid gap-4">
          <h2 id="help-results-h" className="font-display text-shop-lg font-bold text-shop-ink" aria-live="polite">
            {faqHits.length + topicHits.length ? `Results for “${query.trim()}”` : `No results for “${query.trim()}”`}
          </h2>
          {topicHits.length ? (
            <ul className="flex flex-wrap gap-2">
              {topicHits.map(({ id, label, icon: Icon }) => (
                <li key={id}>
                  <a href={`#${id}`} onClick={() => setQuery("")} className="inline-flex min-h-11 items-center gap-2 rounded-full border border-shop-line bg-shop-card px-4 text-shop-sm font-semibold text-shop-ink hover:border-shop-primary hover:text-shop-primary-ink">
                    <Icon className="size-4 text-shop-primary-ink" strokeWidth={1.75} aria-hidden />
                    {label}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          {cms.isPending ? <Skeleton className="h-32 w-full rounded-[1.25rem]" /> : faqHits.length ? <Accordion items={faqHits} forceOpen /> : null}
          {!faqHits.length && !topicHits.length ? (
            <div className="rounded-[1.25rem] border border-dashed border-shop-line-strong bg-shop-card px-5 py-8 text-center">
              <p className="text-shop-base text-shop-text">Try different words, browse the topics below, or ask our team directly.</p>
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                <Button variant="secondary" onClick={() => setQuery("")}>
                  Clear search
                </Button>
                {signedIn ? (
                  <Button to={supportNew} leftIcon={MessageCircle}>
                    Ask support
                  </Button>
                ) : (
                  <Button to="/login" state={{ from: "/account/support" }} leftIcon={MessageCircle}>
                    Sign in to ask support
                  </Button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      {/* Topic cards */}
      <nav aria-label="Help topics">
        <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          {TOPICS.map(({ id, label, blurb, icon: Icon }) => (
            <li key={id} className="min-w-0">
              <a href={`#${id}`} className="group flex h-full min-h-28 flex-col gap-3 rounded-[1.25rem] border border-shop-line bg-shop-card p-4 transition-[box-shadow,border-color] hover:border-shop-line-strong hover:shadow-[0_18px_40px_-22px_rgba(11,16,51,0.45)]">
                <span className="grid size-9 place-items-center rounded-full bg-shop-primary-soft text-shop-primary-ink">
                  <Icon className="size-[18px]" strokeWidth={1.75} aria-hidden />
                </span>
                <span className="min-w-0">
                  <span className="flex items-center gap-1 font-semibold text-shop-ink group-hover:text-shop-primary-ink">
                    {label}
                    <ChevronRight className="size-4 shrink-0 text-shop-subtle transition-transform group-hover:translate-x-0.5" aria-hidden />
                  </span>
                  <span className="mt-0.5 block text-shop-xs leading-snug text-shop-muted">{blurb}</span>
                </span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="grid gap-4 lg:grid-cols-2">
        <Section id="ordering" icon={PackageCheck} title="Ordering">
          <p>Search or browse, choose a pack size and add it to your cart. Bulk-eligible products show their price slabs on the product page; the cart applies the right slab as you change the quantity.</p>
          <p>A cart with products from several sellers is placed as one order per seller, each with its own GST invoice and tracking.</p>
          <p>
            <Link to="/bulk" className="inline-flex min-h-11 items-center gap-1 font-semibold text-shop-primary-ink hover:underline">
              How bulk buying, MOQ and credit terms work <ChevronRight className="size-4" aria-hidden />
            </Link>
          </p>
        </Section>

        <Section id="delivery" icon={Truck} title="Delivery">
          {settings.isPending ? (
            <Skeleton className="h-16 w-full" />
          ) : (
            <>
              <p>Each seller delivers from their own warehouse to the PIN codes they serve. Set your PIN code at the top of the page to see which products deliver to you; every product page shows the delivery estimate and fee for your PIN.</p>
              {d.etaDaysMin != null && d.etaDaysMax != null ? <p>Typical delivery: {d.etaDaysMin}–{d.etaDaysMax} days.</p> : null}
              {Number(s?.freeDeliveryAbove) > 0 ? <p>Delivery is free on orders above {formatListing(s.freeDeliveryAbove)} per seller.</p> : <p>Any delivery fee is shown for your address before you pay.</p>}
              <p>Bulk lines can carry a seller lead time, which is already included in the estimate. Some sellers also offer store pickup.</p>
            </>
          )}
        </Section>

        <Section id="payments" icon={CreditCard} title="Payments">
          <p>Pay online with UPI, cards or net banking (processed by Razorpay){s?.codEnabled ? ", or cash on delivery where the seller allows it" : ""}.</p>
          <p>Approved businesses can also order on credit terms or with a purchase order. Your available credit is checked at checkout and only the methods you are approved for can be selected.</p>
        </Section>

        <Section id="returns" icon={RotateCcw} title="Returns & refunds">
          <RefundPolicy returnWindowDays={s?.returnWindowDays} returnsEnabled={s?.returnsEnabled} />
        </Section>
      </div>

      <section id="faq" aria-labelledby="faq-h" className="grid scroll-mt-36 gap-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 id="faq-h" className="font-display text-shop-lg font-bold text-shop-ink md:text-shop-xl">
              Frequently asked questions
            </h2>
            <p className="mt-0.5 text-shop-sm text-shop-muted">Tap a question to see the answer.</p>
          </div>
        </div>
        {faqTopics.length > 1 ? (
          <div role="group" aria-label="Filter questions by topic" className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {["all", ...faqTopics].map((t) => (
              <button
                key={t}
                type="button"
                aria-pressed={topic === t}
                onClick={() => setTopic(t)}
                className={cn(
                  "inline-flex min-h-10 shrink-0 items-center rounded-full border px-4 text-shop-sm font-semibold transition-colors pointer-coarse:min-h-11",
                  topic === t ? "border-shop-navy bg-shop-navy text-white" : "border-shop-line bg-shop-card text-shop-text hover:border-shop-line-strong"
                )}
              >
                {t === "all" ? "All questions" : TOPIC_LABEL[t]}
              </button>
            ))}
          </div>
        ) : null}
        {cms.isPending ? <Skeleton className="h-48 w-full rounded-[1.25rem]" /> : <Accordion items={shownFaqs.length ? shownFaqs : faqs} />}
      </section>

      <Section id="contact" icon={Mail} title="Still need help?">
        <p className="text-shop-muted">Questions about a specific order go fastest as a support conversation: the seller’s team sees the order with your message.</p>
        <ul className="mt-1 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <ContactTile
            icon={MessageCircle}
            title="Message support"
            action={
              signedIn ? (
                <Button to={supportNew} size="sm" leftIcon={MessageCircle}>
                  New conversation
                </Button>
              ) : (
                <Button to="/login" state={{ from: supportNew }} size="sm">
                  Sign in to message
                </Button>
              )
            }
          >
            About an order, delivery, payment or invoice.
          </ContactTile>
          <ContactTile
            icon={Inbox}
            title="Your conversations"
            action={
              <Button to={signedIn ? "/account/support" : "/login"} state={signedIn ? undefined : { from: "/account/support" }} size="sm" variant="secondary">
                View conversations
              </Button>
            }
          >
            Replies and status of the questions you’ve asked.
          </ContactTile>
          {legal.email || legal.phone ? (
            <ContactTile icon={legal.email ? Mail : Phone} title="Email or call us">
              {legal.email ? (
                <a href={`mailto:${legal.email}`} className="inline-flex min-h-11 items-center font-semibold text-shop-primary-ink hover:underline">
                  {legal.email}
                </a>
              ) : null}
              {legal.phone ? (
                <span className="flex items-center gap-1.5">
                  <Phone className="size-3.5 shrink-0" aria-hidden />
                  <Fact value={legal.phone} className="font-semibold text-shop-ink" />
                </span>
              ) : null}
              {legal.hours ? (
                <span className="mt-1 block text-shop-xs">
                  Hours: <Fact value={legal.hours} />
                </span>
              ) : null}
            </ContactTile>
          ) : null}
          <ContactTile
            icon={Scale}
            title="Grievance redressal"
            action={
              <Button to="/pages/grievance" size="sm" variant="secondary">
                How to raise a complaint
              </Button>
            }
          >
            Unresolved issue? Complaints are acknowledged within 48 hours.
          </ContactTile>
        </ul>
      </Section>
    </div>
  );
}
