import { cn } from "./cn.js";

/**
 * One badge system, three tones. Show at most ONE badge per product card.
 *   neutral  – facts (pack size, "New", "Out of stock")
 *   deal     – saffron: discounts, limited offers, urgency
 *   business – gold: bulk / case pack / business price / credit
 */
const TONES = {
  neutral: "bg-shop-well text-shop-text",
  deal: "bg-shop-deal text-white",
  business: "bg-shop-gold text-shop-ink",
};
const SOFT = {
  neutral: "bg-shop-well text-shop-text",
  deal: "bg-shop-saffron-soft text-shop-saffron-ink",
  business: "bg-shop-gold-soft text-shop-gold-ink",
};

export function Badge({ tone = "neutral", soft = false, icon: Icon, className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center gap-1 whitespace-nowrap rounded-full px-2 text-shop-xs font-semibold",
        (soft ? SOFT : TONES)[tone] || TONES.neutral,
        className
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3.5" strokeWidth={2} aria-hidden /> : null}
      {children}
    </span>
  );
}

export default Badge;
