import { useEffect, useState } from "react";
import { Check, Copy } from "lucide-react";
import { cn } from "./cn.js";
import { Tooltip } from "./overlays.jsx";
import { DASH, formatDate, formatDateTime, inr, relativeTime } from "../lib/format.js";

/**
 * <Money value={1234.5} />            → ₹1,234.50 (null → —)
 * <Money paise={123450} />            → ₹1,234.50
 * <Money value={-50} signed tone />   → −₹50.00 in danger colour
 */
export function Money({ value, paise, whole, signed, tone, className }) {
  const raw = paise != null ? Number(paise) / 100 : value;
  if (raw === null || raw === undefined || raw === "" || !Number.isFinite(Number(raw))) return <span className={cn("text-fg-subtle", className)}>{DASH}</span>;
  const n = Number(raw);
  const text = inr(signed ? Math.abs(n) : n, { whole });
  const prefix = signed ? (n > 0 ? "+" : n < 0 ? "−" : "") : "";
  return (
    <span className={cn("tabular-nums", tone && n < 0 && "text-danger-fg", tone && n > 0 && "text-success-fg", className)}>
      {prefix}
      {text}
    </span>
  );
}

/** <DateTime value={iso} /> (IST). format: "datetime" | "date". Hover shows the full timestamp. */
export function DateTime({ value, format = "datetime", className }) {
  if (!value) return <span className={cn("text-fg-subtle", className)}>{DASH}</span>;
  const text = format === "date" ? formatDate(value) : formatDateTime(value);
  if (!text) return <span className={cn("text-fg-subtle", className)}>{DASH}</span>;
  const iso = new Date(value).toISOString();
  return (
    <time dateTime={iso} title={`${formatDateTime(value)} IST`} className={cn("tabular-nums", className)}>
      {text}
    </time>
  );
}

/** "5 minutes ago" — re-renders every minute; tooltip shows the absolute IST time. */
export function RelativeTime({ value, className }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(t);
  }, []);
  if (!value) return <span className={cn("text-fg-subtle", className)}>{DASH}</span>;
  return (
    <time dateTime={new Date(value).toISOString()} title={`${formatDateTime(value)} IST`} className={className}>
      {relativeTime(value, now)}
    </time>
  );
}

/** Copies `value` to the clipboard. Renders an icon button, or children as the label. */
export function CopyButton({ value, label = "Copy", className, children }) {
  const [done, setDone] = useState(false);
  async function copy(e) {
    e.preventDefault();
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(String(value ?? ""));
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  }
  const Icon = done ? Check : Copy;
  return (
    <Tooltip content={done ? "Copied" : label}>
      <button
        type="button"
        onClick={copy}
        aria-label={done ? "Copied" : label}
        className={cn("inline-flex items-center gap-1 rounded-sm p-0.5 text-fg-subtle hover:bg-surface-hover hover:text-fg", className)}
      >
        <Icon aria-hidden className={cn("size-3.5", done && "text-success")} />
        {children}
      </button>
    </Tooltip>
  );
}

const AVATAR_TONES = ["bg-primary-soft text-primary-soft-fg", "bg-success-soft text-success-fg", "bg-warning-soft text-warning-fg", "bg-info-soft text-info-fg", "bg-accent-soft text-accent-fg"];

export function initials(name = "") {
  const parts = String(name).trim().split(/\s+|@/).filter(Boolean);
  return ((parts[0]?.[0] || "") + (parts[1]?.[0] || "")).toUpperCase() || "?";
}

/** <Avatar name="Asha Rao" src={url} size="sm|md|lg" /> */
export function Avatar({ name, src, size = "md", className }) {
  const [broken, setBroken] = useState(false);
  const box = { xs: "size-5 text-ui-2xs", sm: "size-6 text-ui-2xs", md: "size-8 text-ui-xs", lg: "size-10 text-ui-sm" }[size];
  const tone = AVATAR_TONES[[...String(name || "")].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_TONES.length];
  if (src && !broken) {
    return <img src={src} alt="" onError={() => setBroken(true)} className={cn("shrink-0 rounded-full object-cover", box, className)} />;
  }
  return (
    <span aria-hidden className={cn("inline-grid shrink-0 place-items-center rounded-full font-semibold", box, tone, className)}>
      {initials(name)}
    </span>
  );
}

export function Kbd({ children, className }) {
  return <kbd className={cn("inline-flex h-5 min-w-5 items-center justify-center rounded-xs border border-border bg-surface-2 px-1 font-sans text-ui-2xs font-medium text-fg-muted", className)}>{children}</kbd>;
}

/** Monospace identifier with copy (order numbers, SKUs, request ids). */
export function Code({ children, copy, className }) {
  return (
    <span className={cn("inline-flex items-center gap-1 font-mono text-ui-xs text-fg", className)}>
      {children}
      {copy ? <CopyButton value={typeof copy === "string" ? copy : children} /> : null}
    </span>
  );
}
