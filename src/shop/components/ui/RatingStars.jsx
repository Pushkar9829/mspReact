import { useId, useState } from "react";
import { Star } from "lucide-react";
import { cn } from "./cn.js";

/**
 * Star rating. Display mode renders nothing unless there are reviews (`count > 0`): we never show
 * invented ratings. Input mode (`onChange`) is a radio group (arrow keys work, 44 px targets).
 *
 *   <RatingStars value={p.ratingAvg} count={p.ratingCount} />                // "★ 4.3 (128)"
 *   <RatingStars value={rating} onChange={setRating} label="Your rating" />  // input
 */
export function RatingStars({ value, count, onChange, label = "Rating", size = "sm", showValue = true, className, name }) {
  const id = useId();
  const [hover, setHover] = useState(0);
  const px = size === "lg" ? "size-7" : size === "md" ? "size-5" : "size-3.5";

  if (onChange) {
    const current = hover || Number(value) || 0;
    return (
      <fieldset className={cn("inline-flex flex-col", className)}>
        <legend className="mb-1 text-shop-sm font-semibold text-shop-ink">{label}</legend>
        <div className="flex" role="radiogroup" onMouseLeave={() => setHover(0)}>
          {[1, 2, 3, 4, 5].map((n) => (
            <label key={n} className="grid size-11 cursor-pointer place-items-center rounded-control hover:bg-shop-hover" onMouseEnter={() => setHover(n)}>
              <input type="radio" name={name || id} value={n} checked={Number(value) === n} onChange={() => onChange(n)} className="peer sr-only" aria-label={`${n} star${n > 1 ? "s" : ""}`} />
              <Star className={cn("size-7 transition-colors peer-focus-visible:outline-2", n <= current ? "fill-shop-gold text-shop-gold" : "text-shop-line-strong")} strokeWidth={1.5} aria-hidden />
            </label>
          ))}
        </div>
      </fieldset>
    );
  }

  const n = Number(count) || 0;
  const avg = Number(value) || 0;
  if (!n || !avg) return null;
  const text = `${avg.toFixed(1)} out of 5 from ${n} review${n === 1 ? "" : "s"}`;
  return (
    <span className={cn("inline-flex items-center gap-1 text-shop-xs text-shop-muted", className)} title={text}>
      <span className="sr-only">{text}</span>
      <span aria-hidden className="inline-flex items-center gap-1">
        <Star className={cn(px, "fill-shop-gold text-shop-gold")} strokeWidth={1.5} />
        {showValue ? <span className="font-semibold tabular-nums text-shop-ink">{avg.toFixed(1)}</span> : null}
        <span className="tabular-nums">({n.toLocaleString("en-IN")})</span>
      </span>
    </span>
  );
}

/** Five-star row for review lists. */
export function StarRow({ value = 0, className }) {
  const v = Math.round(Number(value) || 0);
  return (
    <span className={cn("inline-flex", className)} role="img" aria-label={`${v} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star key={n} className={cn("size-4", n <= v ? "fill-shop-gold text-shop-gold" : "text-shop-line-strong")} strokeWidth={1.5} aria-hidden />
      ))}
    </span>
  );
}

export default RatingStars;
