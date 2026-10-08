/**
 * Card used by the storefront auth pages (sign-in, register, forgot/reset password) inside
 * ShopAuthLayout. Optional icon-in-circle, title, description; children are the form / result.
 * `tone` colours the icon for result states: primary (default) | danger | gold.
 */
import { cn } from "../ui/cn.js";

const ICON_TONES = {
  primary: "bg-shop-primary-soft text-shop-primary-ink",
  danger: "bg-shop-danger-soft text-shop-danger-ink",
  gold: "bg-shop-gold-soft text-shop-gold-ink",
};

export function AuthCard({ icon: Icon, tone = "primary", title, description, children, footer, className, role }) {
  return (
    <div className={cn("overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card shadow-[0_18px_40px_-30px_rgba(11,16,51,0.4)]", className)}>
      <div className="p-5 sm:p-8" role={role}>
        {Icon ? (
          <span className={cn("mb-4 grid size-12 place-items-center rounded-full", ICON_TONES[tone] || ICON_TONES.primary)}>
            <Icon className="size-6" strokeWidth={1.75} aria-hidden />
          </span>
        ) : null}
        {title ? <h1 className="font-display text-shop-xl font-bold text-shop-ink sm:text-shop-2xl">{title}</h1> : null}
        {description ? <div className="mt-1.5 text-shop-base text-shop-muted">{description}</div> : null}
        {children}
      </div>
      {footer ? <div className="border-t border-shop-line bg-shop-page/60 px-5 py-4 text-center text-shop-sm text-shop-text sm:px-8">{footer}</div> : null}
    </div>
  );
}
