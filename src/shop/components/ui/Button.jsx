import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Loader2 } from "lucide-react";
import { cn } from "./cn.js";

const BASE =
  "inline-flex select-none items-center justify-center gap-2 whitespace-nowrap font-semibold transition-colors disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50";

const SIZES = {
  sm: "h-9 rounded-control px-3 text-shop-sm pointer-coarse:h-11",
  md: "h-11 rounded-control px-4 text-shop-base",
  lg: "h-12 rounded-control px-5 text-shop-md",
  icon: "size-11 rounded-control",
  "icon-sm": "size-9 rounded-control pointer-coarse:size-11",
};

const VARIANTS = {
  primary: "bg-shop-primary text-white hover:bg-shop-primary-hover",
  secondary: "border border-shop-line-strong bg-shop-card text-shop-ink hover:border-shop-primary hover:text-shop-primary-ink",
  outline: "border border-shop-primary bg-shop-card text-shop-primary-ink hover:bg-shop-primary-soft",
  ghost: "text-shop-text hover:bg-shop-hover",
  /** Business / bulk actions only. */
  gold: "bg-shop-gold text-shop-ink hover:brightness-105",
  danger: "bg-shop-danger text-white hover:brightness-95",
  /** On the navy header/footer. */
  navy: "bg-shop-navy text-white hover:bg-shop-navy-2",
  "on-navy": "text-white hover:bg-white/10",
  link: "h-auto px-0 text-shop-primary-ink underline-offset-4 hover:underline",
};

/** Class string for links styled as buttons: <Link className={buttonClass({ variant: "secondary" })} />. */
export function buttonClass({ variant = "primary", size = "md", block = false, className } = {}) {
  return cn(BASE, SIZES[size] || SIZES.md, VARIANTS[variant] || VARIANTS.primary, block && "w-full", variant === "link" && "h-auto px-0 pointer-coarse:min-h-11", className);
}

/**
 * Shop button. 44 px tall by default (tap target). `to` renders a router Link; `loading` shows a
 * spinner and disables it; `leftIcon` / `rightIcon` take lucide components.
 */
export const Button = forwardRef(function Button(
  { variant = "primary", size = "md", block, className, loading = false, disabled, leftIcon: Left, rightIcon: Right, to, href, type = "button", children, ...props },
  ref
) {
  const cls = buttonClass({ variant, size, block, className });
  const content = (
    <>
      {loading ? <Loader2 className="size-4 animate-spin" aria-hidden /> : Left ? <Left className="size-4" strokeWidth={1.75} aria-hidden /> : null}
      {children}
      {Right && !loading ? <Right className="size-4" strokeWidth={1.75} aria-hidden /> : null}
    </>
  );
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} aria-disabled={disabled || undefined} {...props}>
        {content}
      </Link>
    );
  }
  if (href) {
    return (
      <a ref={ref} href={href} className={cls} {...props}>
        {content}
      </a>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

/** Icon-only button with a required accessible label. */
export const IconButton = forwardRef(function IconButton({ icon: Icon, label, size = "icon", variant = "ghost", className, badge, ...props }, ref) {
  return (
    <button ref={ref} type="button" aria-label={label} title={label} className={cn(buttonClass({ variant, size }), "relative px-0", className)} {...props}>
      <Icon className={size === "icon-sm" ? "size-4" : "size-5"} strokeWidth={1.75} aria-hidden />
      {badge ? (
        <span aria-hidden className="pointer-events-none absolute -right-0.5 -top-0.5 grid h-5 min-w-5 place-items-center rounded-full bg-shop-deal px-1 text-shop-xs font-bold leading-none text-white tabular-nums">
          {badge}
        </span>
      ) : null}
    </button>
  );
});

export default Button;
