import { Fragment } from "react";
import { Link } from "react-router-dom";
import { Check } from "lucide-react";
import { cn } from "../ui/cn.js";

const STAGES = [
  { key: "cart", label: "Cart", to: "/cart" },
  { key: "details", label: "Address & delivery" },
  { key: "payment", label: "Payment" },
  { key: "done", label: "Order placed" },
];

/**
 * Where the buyer is in the purchase: Cart → Address & delivery → Payment → Order placed.
 *   <CheckoutProgress current="cart" />
 * Finished stages with a route (only the cart) are links back.
 */
export function CheckoutProgress({ current = "cart", className }) {
  const at = Math.max(0, STAGES.findIndex((s) => s.key === current));
  return (
    <nav aria-label="Checkout progress" className={cn("w-full", className)}>
      <ol className="flex items-center gap-2 sm:gap-3">
        {STAGES.map((s, i) => {
          const done = i < at;
          const now = i === at;
          const dot = (
            <span
              className={cn(
                "grid size-6 shrink-0 place-items-center rounded-full text-[0.7rem] font-bold tabular-nums transition-colors",
                done ? "bg-shop-primary text-white" : now ? "bg-shop-navy text-white ring-4 ring-shop-navy/10" : "bg-shop-card text-shop-muted ring-1 ring-shop-line-strong"
              )}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} aria-hidden /> : i + 1}
            </span>
          );
          const label = (
            <span className={cn("truncate text-shop-sm", now ? "font-semibold text-shop-ink" : done ? "font-medium text-shop-text" : "text-shop-muted", !now && "hidden sm:inline")}>{s.label}</span>
          );
          return (
            <Fragment key={s.key}>
              {i > 0 ? <li aria-hidden className={cn("h-px min-w-3 flex-1 rounded-full", i <= at ? "bg-shop-primary" : "bg-shop-line-strong")} /> : null}
              <li className="flex min-w-0 shrink-0 items-center gap-2" aria-current={now ? "step" : undefined}>
                {done && s.to ? (
                  <Link to={s.to} className="-m-1 flex min-w-0 items-center gap-2 rounded-full p-1 hover:text-shop-primary-ink">
                    {dot}
                    {label}
                  </Link>
                ) : (
                  <>
                    {dot}
                    {label}
                  </>
                )}
                <span className="sr-only">{done ? " (done)" : now ? " (current)" : ""}</span>
              </li>
            </Fragment>
          );
        })}
      </ol>
    </nav>
  );
}

export default CheckoutProgress;
