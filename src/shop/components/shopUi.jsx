import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ChevronRight, Star, X } from "lucide-react";
import { inr } from "../../shared/lib/format.js";
import { discount } from "../data/catalog.js";

export function cx(...parts) {
  return parts.filter(Boolean).join(" ");
}

export const inputClass =
  "h-11 w-full rounded-xl border border-msr-line bg-white px-3.5 text-sm text-msr-ink outline-none placeholder:text-msr-subtle transition focus:border-msr-primary focus:ring-4 focus:ring-msr-primary/15";

export const selectClass = `${inputClass} appearance-none pr-8`;

export function buttonClass({ variant = "primary", size = "md", block = false, className = "" } = {}) {
  const base =
    "inline-flex items-center justify-center gap-1.5 font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50";
  const sizes = {
    sm: "h-8 rounded-lg px-3 text-[12px]",
    md: "h-10 rounded-xl px-4 text-[13px]",
    lg: "h-12 rounded-xl px-5 text-sm",
  };
  const variants = {
    primary: "bg-msr-primary text-white hover:bg-msr-primary-hover",
    secondary: "border border-msr-line-strong bg-white text-msr-ink hover:border-msr-primary hover:text-msr-primary",
    ghost: "text-msr-ink hover:bg-msr-primary-soft hover:text-msr-primary",
    danger: "bg-msr-danger text-white hover:brightness-95",
    navy: "bg-msr-ink text-white hover:bg-msr-navy-dark",
    dark: "bg-msr-ink text-white hover:bg-msr-navy-dark",
    gold: "bg-msr-gold text-msr-ink hover:brightness-105",
  };
  return cx(base, sizes[size] || sizes.md, variants[variant] || variants.primary, block && "w-full", className);
}

export function Button({ variant, size, block, className, type = "button", children, ...props }) {
  return (
    <button type={type} className={buttonClass({ variant, size, block, className })} {...props}>
      {children}
    </button>
  );
}

export function Badge({ tone = "navy", className = "", children }) {
  const tones = {
    navy: "bg-msr-ink text-white",
    primary: "bg-msr-primary-soft text-msr-primary-ink",
    gold: "bg-msr-gold text-msr-ink",
    success: "bg-msr-success text-white",
    deal: "bg-msr-warning-soft text-msr-warning-ink",
    new: "bg-msr-primary-soft text-msr-primary-ink",
    muted: "bg-msr-surface text-msr-muted",
  };
  return (
    <span
      className={cx(
        "inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide",
        tones[tone] || tones.navy,
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Chip({ children, onClear, className = "", as: Tag = "span", to, ...props }) {
  const classes = cx(
    "inline-flex items-center gap-1 rounded-full border border-msr-line bg-white px-2.5 py-1 text-[12px] font-medium text-msr-ink",
    Tag === Link || to ? "hover:border-msr-primary hover:text-msr-primary" : "",
    className,
  );
  if (to) {
    return (
      <Link to={to} className={classes} {...props}>
        {children}
      </Link>
    );
  }
  return (
    <Tag className={classes} {...props}>
      {children}
      {onClear ? (
        <button type="button" onClick={onClear} className="text-msr-subtle hover:text-msr-ink" aria-label="Remove">
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </Tag>
  );
}

export function Card({ className = "", children, as: Tag = "div", ...props }) {
  return (
    <Tag className={cx("rounded-2xl border border-msr-line bg-white shadow-card", className)} {...props}>
      {children}
    </Tag>
  );
}

export function Checkbox({ checked = false, radio = false }) {
  return (
    <span
      className={cx(
        "grid h-4 w-4 shrink-0 place-items-center border",
        radio ? "rounded-full" : "rounded",
        checked ? "border-msr-primary bg-msr-primary text-white" : "border-msr-line-strong bg-white",
      )}
      aria-hidden
    >
      {checked ? (radio ? <span className="h-1.5 w-1.5 rounded-full bg-white" /> : <Check className="h-3 w-3" strokeWidth={3} />) : null}
    </span>
  );
}

export function RatingPill({ value, reviews }) {
  if (!value) return null;
  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-msr-success px-1.5 py-0.5 text-[11px] font-bold text-white">
      {Number(value).toFixed(1)}
      <Star className="h-2.5 w-2.5 fill-white text-white" />
      {reviews ? <span className="font-medium text-white/85">({reviews})</span> : null}
    </span>
  );
}

/** Accepts either a product object or { price, mrp } props. */
export function Price({ product, price, mrp, size = "md", showSave = false, showOff = true, className = "" }) {
  const p = product || { price, mrp };
  const off = discount(p);
  const saved = Math.max(0, (p.mrp || 0) - (p.price || 0));
  const priceSize = size === "lg" ? "text-[1.65rem]" : size === "sm" ? "text-[15px]" : "text-[17px]";
  return (
    <div className={className}>
      <p className="flex flex-wrap items-baseline gap-1.5 leading-none">
        <span className={cx(priceSize, "font-extrabold tracking-tight text-msr-ink")}>{inr(p.price)}</span>
        {off > 0 ? <span className="text-[12px] font-medium text-msr-subtle line-through">{inr(p.mrp)}</span> : null}
        {showOff && off > 0 ? <span className="text-[12px] font-bold text-msr-success">{off}% off</span> : null}
      </p>
      {showSave && saved > 0 ? <p className="mt-1 text-[11px] font-semibold text-msr-success">You save {inr(saved)}</p> : null}
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cx("animate-pulse rounded-xl bg-msr-line/70", className)} />;
}

export function EmptyState({ icon: Icon, title, text, children, className = "" }) {
  return (
    <div className={cx("rounded-2xl border border-dashed border-msr-line bg-white px-6 py-14 text-center", className)}>
      {Icon ? (
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-msr-primary-soft text-msr-primary">
          <Icon className="h-6 w-6" />
        </span>
      ) : null}
      <h2 className="mt-4 text-lg font-extrabold text-msr-ink">{title}</h2>
      {text ? <p className="mx-auto mt-1.5 max-w-md text-sm leading-relaxed text-msr-muted">{text}</p> : null}
      {children ? <div className="mt-5 flex flex-wrap items-center justify-center gap-2">{children}</div> : null}
    </div>
  );
}

export function Breadcrumbs({ items = [] }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-[13px] text-msr-muted">
      {items.map((item, i) => {
        const last = i === items.length - 1;
        return (
          <span key={`${item.label}-${i}`} className="inline-flex items-center gap-1.5">
            {i ? <span className="text-msr-line-strong">/</span> : null}
            {item.to && !last ? (
              <Link to={item.to} className="hover:text-msr-ink">
                {item.label}
              </Link>
            ) : (
              <span className={last ? "font-medium text-msr-ink" : ""}>{item.label}</span>
            )}
          </span>
        );
      })}
    </nav>
  );
}

/** Snap a typed quantity to the line rules: 0 removes, otherwise at least `min`, a multiple of `step`, at most `max`. */
export function snapQty(raw, { min = 1, max = Infinity, step = 1 } = {}) {
  const n = Math.floor(Number(raw));
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return 0;
  const stepN = Math.max(1, Number(step) || 1);
  const minN = Math.max(1, Number(min) || 1);
  const maxN = Number.isFinite(Number(max)) ? Math.floor(Number(max) / stepN) * stepN : Infinity;
  let next = Math.max(minN, Math.ceil(n / stepN) * stepN);
  if (next > maxN) next = maxN;
  return next;
}

/**
 * Typed quantity box. Commits on Enter or blur, snapping to the rules; entering 0 removes the line.
 * Shows a short note when the typed value had to be adjusted.
 */
export function QtyInput({ value, onChange, min = 1, max = Infinity, step = 1, size = "md", disabled = false, className = "" }) {
  const [draft, setDraft] = useState(String(value));
  const [note, setNote] = useState("");
  const [settled, setSettled] = useState(0);

  useEffect(() => {
    setDraft(String(value));
  }, [value, settled]);

  function commit() {
    const typed = draft.trim();
    if (typed === "" || typed === String(value)) {
      setDraft(String(value));
      return;
    }
    const next = snapQty(typed, { min, max, step });
    if (next == null) {
      setDraft(String(value));
      return;
    }
    if (next > 0 && next !== Math.floor(Number(typed))) {
      const rules = [
        min > 1 ? `min ${min}` : "",
        step > 1 ? `steps of ${step}` : "",
        Number.isFinite(Number(max)) ? `max ${max}` : "",
      ].filter(Boolean);
      setNote(`Set to ${next}${rules.length ? ` (${rules.join(", ")})` : ""}`);
      setTimeout(() => setNote(""), 3500);
    } else {
      setNote("");
    }
    setDraft(String(next));
    if (next !== value) {
      Promise.resolve(onChange(next))
        .catch(() => {})
        .finally(() => setSettled((n) => n + 1));
    }
  }

  const box = size === "sm" ? "h-8 w-20 text-sm" : "h-10 w-24";
  return (
    <div className={cx("inline-flex flex-col", className)}>
      <label className="inline-flex items-center gap-1.5">
        <span className="text-[11px] font-semibold text-msr-muted">Qty</span>
        <input
          type="number"
          inputMode="numeric"
          min={0}
          max={Number.isFinite(Number(max)) ? max : undefined}
          step={step}
          value={draft}
          disabled={disabled}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
            if (e.key === "Escape") {
              setDraft(String(value));
              e.currentTarget.blur();
            }
          }}
          onFocus={(e) => e.currentTarget.select()}
          aria-label="Quantity"
          className={cx(
            box,
            "rounded-lg border border-msr-line-strong bg-white px-2 text-center font-semibold text-msr-ink outline-none focus:border-msr-primary focus:ring-2 focus:ring-msr-primary/15 disabled:opacity-60"
          )}
        />
      </label>
      {note ? <span className="mt-1 text-[10.5px] font-semibold text-msr-warning-ink">{note}</span> : null}
    </div>
  );
}

export function Stars({ value }) {
  const full = Math.round(value);
  return (
    <span className="inline-flex items-center gap-1 text-sm">
      <span className="text-amber-500">
        {"★".repeat(full)}
        {"☆".repeat(5 - full)}
      </span>
      <span className="font-semibold text-msr-ink">{value}</span>
    </span>
  );
}

export function SectionTitle({ title, to, action = "View all", kicker, subtitle, className = "" }) {
  return (
    <div className={cx("mb-5 flex items-end justify-between gap-4", className)}>
      <div className="min-w-0">
        {kicker ? <p className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em] text-msr-primary">{kicker}</p> : null}
        {to ? (
          <Link to={to} className="min-w-0">
            <h2 className="text-xl font-extrabold tracking-tight text-msr-ink hover:text-msr-primary md:text-2xl">{title}</h2>
          </Link>
        ) : (
          <h2 className="text-xl font-extrabold tracking-tight text-msr-ink md:text-2xl">{title}</h2>
        )}
        {subtitle ? <p className="mt-1 text-[13px] text-msr-muted">{subtitle}</p> : null}
      </div>
      {to ? (
        <Link
          to={to}
          className="inline-flex shrink-0 items-center gap-0.5 text-[13px] font-semibold text-msr-primary hover:text-msr-primary-ink"
        >
          {action}
          <ChevronRight className="h-4 w-4" />
        </Link>
      ) : null}
    </div>
  );
}

export function PageBanner({ kicker, title, text, children, className = "" }) {
  return (
    <div className={cx("overflow-hidden rounded-2xl bg-msr-ink text-white", className)}>
      <div className="px-6 py-8 md:px-10 md:py-10">
        {kicker ? <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-msr-gold">{kicker}</p> : null}
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight md:text-3xl">{title}</h1>
        {text ? <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/70">{text}</p> : null}
        {children}
      </div>
    </div>
  );
}
