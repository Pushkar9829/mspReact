import { FileText, RotateCcw, ShieldCheck, Truck, Wallet } from "lucide-react";
import { cn } from "./cn.js";
import { usePublicSettings } from "../../hooks/useCatalog.js";
import { formatListing } from "../../lib/money.js";

/**
 * The single source of trust copy. Every claim comes from GET /settings/public; a claim the
 * settings do not support is left out (never a hard-coded "1–2 day delivery").
 * Returns [{ id, icon, title, text }].
 */
export function trustFacts(s) {
  if (!s) return [];
  const facts = [];
  facts.push({ id: "gst", icon: FileText, title: "GST invoice on every order", text: s.taxInclusive === false ? "Prices exclude GST" : "Prices include GST" });
  const d = s.delivery || {};
  if (d.etaDaysMin != null && d.etaDaysMax != null)
    facts.push({ id: "eta", icon: Truck, title: `Delivery in ${d.etaDaysMin}–${d.etaDaysMax} days`, text: Number(s.freeDeliveryAbove) > 0 ? `Free above ${formatListing(s.freeDeliveryAbove)} per seller` : "Delivery fee shown at checkout" });
  else if (Number(s.freeDeliveryAbove) > 0) facts.push({ id: "free", icon: Truck, title: `Free delivery above ${formatListing(s.freeDeliveryAbove)}`, text: "Per seller, at checkout" });
  if (s.returnsEnabled && Number(s.returnWindowDays) > 0)
    facts.push({ id: "returns", icon: RotateCcw, title: `${s.returnWindowDays}-day returns`, text: "On easy-return items" });
  facts.push({ id: "pay", icon: s.codEnabled ? Wallet : ShieldCheck, title: s.codEnabled ? "UPI, cards or cash on delivery" : "Secure online payment", text: "Credit terms for approved businesses" });
  return facts;
}

/**
 *   <TrustBar />               // strip of 3–4 facts
 *   <TrustBar variant="list" /> // stacked (cart / checkout sidebars)
 *   <TrustBar tone="navy" />    // on the navy footer
 */
export function TrustBar({ variant = "strip", tone = "light", className }) {
  const settings = usePublicSettings();
  const facts = trustFacts(settings.data);
  if (!facts.length) return null;
  const onNavy = tone === "navy";
  return (
    <ul
      aria-label="Why buy here"
      className={cn(
        variant === "list" ? "grid gap-3" : "grid grid-cols-1 gap-px overflow-hidden rounded-card sm:grid-cols-2 lg:grid-cols-4",
        variant !== "list" && (onNavy ? "bg-white/10" : "border border-shop-line bg-shop-line"),
        className
      )}
    >
      {facts.map(({ id, icon: Icon, title, text }) => (
        <li key={id} className={cn("flex items-center gap-3", variant === "list" ? "" : cn("px-4 py-3", onNavy ? "bg-shop-navy" : "bg-shop-card"))}>
          <span className={cn("grid size-10 shrink-0 place-items-center rounded-full", onNavy ? "bg-white/10 text-shop-gold" : "bg-shop-primary-soft text-shop-primary-ink")}>
            <Icon className="size-5" strokeWidth={1.75} aria-hidden />
          </span>
          <span className="min-w-0">
            <span className={cn("block text-shop-sm font-semibold", onNavy ? "text-white" : "text-shop-ink")}>{title}</span>
            <span className={cn("block text-shop-xs", onNavy ? "text-shop-on-navy-muted" : "text-shop-muted")}>{text}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export default TrustBar;
