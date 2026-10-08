import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Slot } from "radix-ui";
import { cn } from "./cn.js";
import { Spinner } from "./Spinner.jsx";

const VARIANTS = {
  primary: "bg-primary text-fg-on-primary hover:bg-primary-hover shadow-xs",
  secondary: "bg-surface text-fg border border-border-strong hover:bg-surface-hover shadow-xs",
  ghost: "text-fg-muted hover:bg-surface-hover hover:text-fg",
  danger: "bg-danger text-white hover:bg-danger-hover shadow-xs",
  "danger-ghost": "text-danger-fg hover:bg-danger-soft",
  link: "text-primary-soft-fg underline-offset-4 hover:underline px-0 h-auto",
};

const SIZES = {
  xs: "h-7 px-2 text-ui-xs gap-1 rounded-sm",
  sm: "h-8 px-2.5 text-ui-sm gap-1.5 rounded-md",
  md: "h-9 px-3.5 text-ui gap-2 rounded-md",
  lg: "h-10 px-4 text-ui gap-2 rounded-md",
};

export function buttonClass({ variant = "secondary", size = "md", className } = {}) {
  return cn(
    "inline-flex shrink-0 select-none items-center justify-center whitespace-nowrap font-medium transition-colors",
    "disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50",
    "[&_svg]:size-4 [&_svg]:shrink-0",
    SIZES[size],
    VARIANTS[variant],
    className
  );
}

/**
 * <Button variant="primary|secondary|ghost|danger|danger-ghost|link" size="xs|sm|md|lg"
 *         loading leftIcon={Icon} rightIcon={Icon} to="/path" asChild>
 * `to` renders a router Link; `loading` disables and shows a spinner.
 */
export const Button = forwardRef(function Button(
  { variant = "secondary", size = "md", loading = false, leftIcon: Left, rightIcon: Right, to, asChild, className, children, disabled, type = "button", ...props },
  ref
) {
  const cls = buttonClass({ variant, size, className });
  const content = (
    <>
      {loading ? <Spinner className="size-4" /> : Left ? <Left aria-hidden /> : null}
      {children}
      {Right && !loading ? <Right aria-hidden /> : null}
    </>
  );
  if (asChild) {
    return (
      <Slot.Root ref={ref} className={cls} {...props}>
        {children}
      </Slot.Root>
    );
  }
  if (to) {
    return (
      <Link ref={ref} to={to} className={cls} aria-disabled={disabled || undefined} {...props}>
        {content}
      </Link>
    );
  }
  return (
    <button ref={ref} type={type} className={cls} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {content}
    </button>
  );
});

/** Square icon-only button. `label` is required (aria-label + tooltip title). */
export const IconButton = forwardRef(function IconButton(
  { icon: Icon, label, variant = "ghost", size = "md", className, children, ...props },
  ref
) {
  const box = { xs: "size-7", sm: "size-8", md: "size-9", lg: "size-10" }[size];
  return (
    <Button ref={ref} variant={variant} size={size} aria-label={label} title={props.title ?? label} className={cn("px-0", box, className)} {...props}>
      {Icon ? <Icon aria-hidden /> : children}
    </Button>
  );
});

export default Button;
