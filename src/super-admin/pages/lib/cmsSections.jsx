import { createElement, Fragment, useEffect, useMemo, useState } from "react";
import { Code2, FileText, HelpCircle, Image as ImageIcon, Star } from "lucide-react";
import { Field, Input, Textarea } from "../../../shared/ui/index.js";
import { cn } from "../../../shared/ui/cn.js";

/*
 * CMS section kinds. There is no CMS renderer in the storefront yet (src/shop never reads
 * /cms/pages), so the shapes follow the backend seed data (mspNode/src/seeds/demo.js):
 *   { kind: "hero", heading }            (+ optional subheading, image, ctaLabel, ctaUrl)
 *   { kind: "bestsellers" }              (+ optional heading)
 *   { kind: "faq", q, a }                one question per section
 *   { kind: "html", html }               sanitised server-side (allowlist, see cms/sanitize.js)
 * Anything else is edited as raw JSON so unknown/legacy kinds round-trip untouched.
 * The backend sanitises every string as HTML and URL-ish keys (image, ctaUrl, href…) as safe URLs.
 */

export const SECTION_KINDS = [
  { kind: "html", label: "Rich text (HTML)", icon: Code2, description: "Paragraphs, headings, lists, links and tables." },
  { kind: "hero", label: "Hero", icon: ImageIcon, description: "Large heading with optional subheading, image and button." },
  { kind: "faq", label: "FAQ entry", icon: HelpCircle, description: "One question and its answer." },
  { kind: "bestsellers", label: "Bestsellers", icon: Star, description: "The store's best-selling products (filled in by the storefront)." },
];

export const KIND_LABEL = Object.fromEntries(SECTION_KINDS.map((k) => [k.kind, k.label]));
export const isKnownKind = (kind) => Boolean(KIND_LABEL[kind]);
export const kindIcon = (kind) => SECTION_KINDS.find((k) => k.kind === kind)?.icon || FileText;

export const MAX_SECTIONS = 100;

/** Mirror of the backend slugify() (utils/slug.js). */
export function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}
export const MAX_SECTIONS_BYTES = 256 * 1024;

export function blankSection(kind) {
  if (kind === "hero") return { kind: "hero", heading: "" };
  if (kind === "faq") return { kind: "faq", q: "", a: "" };
  if (kind === "bestsellers") return { kind: "bestsellers" };
  return { kind: "html", html: "" };
}

let seq = 0;
/** Client-only stable key; never sent to the server (items are { key, section }). */
export const newKey = () => `s${Date.now().toString(36)}${(seq += 1).toString(36)}`;
export const toItems = (sections) => (Array.isArray(sections) ? sections : []).map((section) => ({ key: newKey(), section: section ?? {} }));
export const fromItems = (items) => items.map((i) => i.section);

/** Remove empty optional string fields so "" doesn't get saved for untouched inputs. */
function compact(section, optional) {
  const out = { ...section };
  optional.forEach((k) => {
    if (out[k] === "" || out[k] == null) delete out[k];
  });
  return out;
}

/** Problems that block saving: [{ index, field?, message }] + a global message. */
export function validateSections(sections) {
  const problems = [];
  if (sections.length > MAX_SECTIONS) problems.push({ index: -1, message: `At most ${MAX_SECTIONS} sections.` });
  const bytes = JSON.stringify(sections).length;
  if (bytes > MAX_SECTIONS_BYTES) problems.push({ index: -1, message: `Sections are too large (${Math.round(bytes / 1024)} KB, max 256 KB).` });
  sections.forEach((s, index) => {
    if (!s || typeof s !== "object" || Array.isArray(s)) problems.push({ index, message: "Section must be a JSON object." });
    else if (s.kind === "hero" && !String(s.heading || "").trim()) problems.push({ index, field: "heading", message: "Heading is required." });
    else if (s.kind === "faq" && (!String(s.q || "").trim() || !String(s.a || "").trim())) {
      if (!String(s.q || "").trim()) problems.push({ index, field: "q", message: "Question is required." });
      if (!String(s.a || "").trim()) problems.push({ index, field: "a", message: "Answer is required." });
    }
  });
  return problems;
}

/** Short text summary of a section (for collapsed headers and diffs). */
export function sectionSummary(s) {
  if (!s || typeof s !== "object") return "";
  if (s.kind === "hero") return s.heading || "";
  if (s.kind === "faq") return s.q || "";
  if (s.kind === "html") return String(s.html || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 80);
  if (s.kind === "bestsellers") return s.heading || "";
  return "";
}

/* ------------------------------------------------------------------ editors */

/**
 * Typed editor for one section. `onChange(nextSection)`. `problems` = validateSections() rows for
 * this section. Unknown kinds get a JSON editor.
 */
export function SectionEditor({ section, onChange, problems = [], disabled, idPrefix }) {
  const err = (field) => problems.find((p) => p.field === field)?.message;
  const set = (patch, optional = []) => onChange(compact({ ...section, ...patch }, optional));

  if (section?.kind === "hero") {
    const opt = ["subheading", "image", "ctaLabel", "ctaUrl"];
    return (
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Heading" required error={err("heading")} className="sm:col-span-2" id={`${idPrefix}-heading`}>
          <Input value={section.heading || ""} maxLength={200} disabled={disabled} onChange={(e) => set({ heading: e.target.value }, opt)} />
        </Field>
        <Field label="Subheading" optional className="sm:col-span-2" id={`${idPrefix}-sub`}>
          <Input value={section.subheading || ""} maxLength={300} disabled={disabled} onChange={(e) => set({ subheading: e.target.value }, opt)} />
        </Field>
        <Field label="Image URL" optional hint="https:// or a /relative path. Unsafe URLs are dropped on save." className="sm:col-span-2" id={`${idPrefix}-img`}>
          <Input value={section.image || ""} inputMode="url" disabled={disabled} onChange={(e) => set({ image: e.target.value }, opt)} />
        </Field>
        <Field label="Button label" optional id={`${idPrefix}-cta`}>
          <Input value={section.ctaLabel || ""} maxLength={60} disabled={disabled} onChange={(e) => set({ ctaLabel: e.target.value }, opt)} />
        </Field>
        <Field label="Button link" optional id={`${idPrefix}-ctaurl`}>
          <Input value={section.ctaUrl || ""} inputMode="url" placeholder="/deals" disabled={disabled} onChange={(e) => set({ ctaUrl: e.target.value }, opt)} />
        </Field>
      </div>
    );
  }
  if (section?.kind === "faq") {
    return (
      <div className="grid gap-3">
        <Field label="Question" required error={err("q")} id={`${idPrefix}-q`}>
          <Input value={section.q || ""} maxLength={300} disabled={disabled} onChange={(e) => set({ q: e.target.value })} />
        </Field>
        <Field label="Answer" required error={err("a")} hint="Plain text; basic HTML is allowed." id={`${idPrefix}-a`}>
          <Textarea rows={3} value={section.a || ""} disabled={disabled} onChange={(e) => set({ a: e.target.value })} />
        </Field>
      </div>
    );
  }
  if (section?.kind === "bestsellers") {
    return (
      <div className="grid gap-3">
        <Field label="Heading" optional hint="The products are chosen by the storefront." id={`${idPrefix}-bh`}>
          <Input value={section.heading || ""} maxLength={120} placeholder="Bestsellers" disabled={disabled} onChange={(e) => set({ heading: e.target.value }, ["heading"])} />
        </Field>
      </div>
    );
  }
  if (section?.kind === "html") {
    return (
      <Field
        label="HTML"
        id={`${idPrefix}-html`}
        hint="Allowed: p, h1–h6, strong, em, lists, links, images, tables, blockquote, code. Scripts, styles, iframes and event handlers are removed on save."
      >
        <Textarea rows={8} className="font-mono text-ui-sm" spellCheck={false} value={section.html || ""} disabled={disabled} onChange={(e) => set({ html: e.target.value })} />
      </Field>
    );
  }
  return <JsonSectionEditor section={section} onChange={onChange} disabled={disabled} idPrefix={idPrefix} />;
}

function JsonSectionEditor({ section, onChange, disabled, idPrefix }) {
  const serialized = useMemo(() => JSON.stringify(section ?? {}, null, 2), [section]);
  const [text, setText] = useState(serialized);
  const [error, setError] = useState("");
  // External changes (reload, restore) replace the text unless it is the same value.
  useEffect(() => {
    setText((cur) => {
      try {
        if (JSON.stringify(JSON.parse(cur)) === JSON.stringify(section ?? {})) return cur;
      } catch {
        /* fall through */
      }
      return serialized;
    });
  }, [serialized, section]);
  return (
    <Field
      label={`Raw section JSON${section?.kind ? ` (kind "${section.kind}")` : ""}`}
      id={`${idPrefix}-json`}
      error={error}
      hint="This section type has no visual editor. Edit the JSON object directly; changes apply when it parses."
    >
      <Textarea
        rows={8}
        className="font-mono text-ui-sm"
        spellCheck={false}
        value={text}
        disabled={disabled}
        onChange={(e) => {
          const next = e.target.value;
          setText(next);
          try {
            const parsed = JSON.parse(next);
            if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("Must be a JSON object");
            setError("");
            onChange(parsed);
          } catch (err) {
            setError(err.message || "Invalid JSON");
          }
        }}
      />
    </Field>
  );
}

/* ------------------------------------------------------------------ safe HTML preview */

const ALLOWED_TAGS = new Set([
  "p", "br", "hr", "strong", "b", "em", "i", "u", "s", "small", "sup", "sub", "span", "div",
  "h1", "h2", "h3", "h4", "h5", "h6", "blockquote", "code", "pre",
  "ul", "ol", "li", "a", "img", "figure", "figcaption",
  "table", "thead", "tbody", "tfoot", "tr", "th", "td", "caption",
]);
const VOID = new Set(["br", "hr", "img"]);
const ATTRS = {
  a: ["href", "title"],
  img: ["src", "alt", "width", "height", "title"],
  td: ["colspan", "rowspan"],
  th: ["colspan", "rowspan", "scope"],
  ol: ["start"],
};
const REACT_ATTR = { colspan: "colSpan", rowspan: "rowSpan" };

/** Mirror of the backend safeUrl(): http(s), mailto/tel (links), relative, data:image (img). */
export function safeUrl(value, { image = false } = {}) {
  // eslint-disable-next-line no-control-regex
  const v = String(value ?? "").replace(/[\u0000- \u007f-\u009f]/g, "").trim();
  if (!v) return null;
  const lower = v.toLowerCase();
  if (/^https?:\/\//.test(lower)) return v;
  if (!image && /^(mailto|tel):/.test(lower)) return v;
  if (image && /^data:image\/(png|jpe?g|gif|webp);base64,[a-z0-9+/=]+$/i.test(v)) return v;
  if (/^[/#?.]/.test(v) && !/^\/\//.test(v)) return v;
  if (!/^[a-z][a-z0-9+.-]*:/i.test(v)) return v;
  return null;
}

function toReact(node, key) {
  if (node.nodeType === 3) return node.nodeValue;
  if (node.nodeType !== 1) return null;
  const tag = node.nodeName.toLowerCase();
  const children = () => Array.from(node.childNodes).map((c, i) => toReact(c, i));
  if (!ALLOWED_TAGS.has(tag)) {
    // Dropped tag: keep its text content unless it's an executable/embedded container.
    if (["script", "style", "iframe", "object", "embed", "template", "svg", "math", "noscript", "textarea", "select", "title", "head"].includes(tag)) return null;
    return createElement(Fragment, { key }, ...children());
  }
  const props = { key };
  (ATTRS[tag] || []).forEach((name) => {
    const raw = node.getAttribute(name);
    if (raw == null) return;
    if (name === "href") {
      const url = safeUrl(raw);
      if (url) Object.assign(props, { href: url, target: "_blank", rel: "noopener noreferrer nofollow" });
      return;
    }
    if (name === "src") {
      const url = safeUrl(raw, { image: true });
      if (url) props.src = url;
      return;
    }
    if (["width", "height", "colspan", "rowspan", "start"].includes(name) && !/^\d{1,5}%?$/.test(raw)) return;
    props[REACT_ATTR[name] || name] = raw;
  });
  if (tag === "img" && !props.src) return null;
  if (VOID.has(tag)) return createElement(tag, props);
  return createElement(tag, props, ...children());
}

/**
 * Renders CMS HTML without innerHTML: parsed in an inert DOMParser document (scripts never run),
 * then rebuilt as React elements from the same allowlist the backend sanitiser uses.
 */
export function SafeHtml({ html, className }) {
  const nodes = useMemo(() => {
    if (!html) return null;
    if (typeof DOMParser === "undefined") return String(html);
    const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
    return Array.from(doc.body.childNodes).map((n, i) => toReact(n, i));
  }, [html]);
  return <div className={cn(PROSE, className)}>{nodes}</div>;
}

export const PROSE = cn(
  "text-ui leading-relaxed text-fg break-words",
  "[&_p]:my-2 [&_h1]:mb-2 [&_h1]:mt-4 [&_h1]:text-title [&_h1]:font-semibold [&_h2]:mb-2 [&_h2]:mt-4 [&_h2]:text-ui-lg [&_h2]:font-semibold",
  "[&_h3]:mb-1 [&_h3]:mt-3 [&_h3]:font-semibold [&_h4]:font-semibold [&_ul]:my-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:my-2 [&_ol]:list-decimal [&_ol]:pl-5",
  "[&_a]:text-primary-soft-fg [&_a]:underline [&_blockquote]:border-l-2 [&_blockquote]:border-border-strong [&_blockquote]:pl-3 [&_blockquote]:text-fg-muted",
  "[&_code]:rounded-xs [&_code]:bg-surface-sunken [&_code]:px-1 [&_code]:font-mono [&_code]:text-ui-sm [&_pre]:overflow-x-auto [&_pre]:rounded-md [&_pre]:bg-surface-sunken [&_pre]:p-3",
  "[&_img]:max-w-full [&_img]:rounded-md [&_table]:my-2 [&_table]:w-full [&_table]:text-ui-sm [&_td]:border [&_td]:border-border [&_td]:px-2 [&_td]:py-1 [&_th]:border [&_th]:border-border [&_th]:bg-surface-2 [&_th]:px-2 [&_th]:py-1 [&_th]:text-left"
);

/* ------------------------------------------------------------------ preview */

function SectionPreview({ section }) {
  if (!section || typeof section !== "object") return null;
  if (section.kind === "hero") {
    const img = safeUrl(section.image, { image: true });
    const cta = safeUrl(section.ctaUrl);
    return (
      <div className="overflow-hidden rounded-lg border border-border bg-primary-soft">
        {img ? <img src={img} alt="" className="h-40 w-full object-cover" /> : null}
        <div className="grid gap-2 p-5">
          <p className="text-title font-semibold text-primary-soft-fg">{section.heading || <span className="text-fg-subtle">Untitled hero</span>}</p>
          {section.subheading ? <p className="text-ui text-fg-muted">{section.subheading}</p> : null}
          {section.ctaLabel ? (
            <span className="inline-flex w-fit items-center rounded-md bg-primary px-3 py-1.5 text-ui-sm font-medium text-fg-on-primary" title={cta || "No link"}>
              {section.ctaLabel}
            </span>
          ) : null}
        </div>
      </div>
    );
  }
  if (section.kind === "faq") {
    return (
      <details className="group rounded-lg border border-border bg-surface px-4 py-3" open>
        <summary className="cursor-pointer text-ui font-semibold text-fg">{section.q || <span className="text-fg-subtle">Question</span>}</summary>
        <SafeHtml html={section.a || ""} className="mt-1 text-fg-muted" />
      </details>
    );
  }
  if (section.kind === "bestsellers") {
    return (
      <div className="rounded-lg border border-dashed border-border-strong p-4">
        <p className="text-ui font-semibold text-fg">{section.heading || "Bestsellers"}</p>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-hidden>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="grid gap-1.5 rounded-md bg-surface-sunken p-2">
              <div className="aspect-square rounded-sm bg-surface-2" />
              <div className="h-2 w-3/4 rounded-full bg-border" />
            </div>
          ))}
        </div>
        <p className="mt-2 text-ui-xs text-fg-subtle">Products are filled in by the storefront.</p>
      </div>
    );
  }
  if (section.kind === "html") return <SafeHtml html={section.html || ""} />;
  return (
    <div className="rounded-lg border border-dashed border-border-strong p-3 text-ui-sm text-fg-muted">
      Section of type <code className="font-mono">{String(section.kind || "unknown")}</code> has no preview.
    </div>
  );
}

/** Page preview of the current (unsaved) editor state. items: [{ key, section }] (see toItems). */
export function PagePreview({ title, items = [], className }) {
  return (
    <article className={cn("grid gap-4", className)} aria-label="Page preview">
      <h1 className="text-display font-semibold tracking-tight text-fg">{title || <span className="text-fg-subtle">Untitled page</span>}</h1>
      {items.length ? (
        items.map((item) => <SectionPreview key={item.key} section={item.section} />)
      ) : (
        <p className="text-ui-sm text-fg-subtle">This page has no sections yet.</p>
      )}
    </article>
  );
}
