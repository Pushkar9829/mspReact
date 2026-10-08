import { cn } from "./cn.js";
import { statusLabel, statusTone } from "./status.js";

const TONES = {
  neutral: "bg-neutral-soft text-neutral-fg",
  success: "bg-success-soft text-success-fg",
  warning: "bg-warning-soft text-warning-fg",
  danger: "bg-danger-soft text-danger-fg",
  info: "bg-info-soft text-info-fg",
  accent: "bg-accent-soft text-accent-fg",
  primary: "bg-primary-soft text-primary-soft-fg",
  outline: "border border-border-strong text-fg-muted",
};

const DOTS = {
  neutral: "bg-fg-subtle",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-danger",
  info: "bg-info",
  accent: "bg-accent-fg",
  primary: "bg-primary",
  outline: "bg-fg-subtle",
};

/** <Badge tone="success|warning|danger|info|accent|primary|neutral|outline" dot size="sm|md">Text</Badge> */
export function Badge({ tone = "neutral", dot = false, size = "sm", className, children, ...props }) {
  return (
    <span
      className={cn(
        "inline-flex max-w-full items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        size === "sm" ? "h-5 px-2 text-ui-xs" : "h-6 px-2.5 text-ui-sm",
        TONES[tone] || TONES.neutral,
        className
      )}
      {...props}
    >
      {dot ? <span aria-hidden className={cn("size-1.5 rounded-full", DOTS[tone])} /> : null}
      <span className="truncate">{children}</span>
    </span>
  );
}

/**
 * Status pill using the central map: <StatusPill status={order.status} />,
 * <StatusPill status={order.paymentStatus} domain="payment" />, <StatusPill status="hidden" domain="review" />.
 */
export function StatusPill({ status, domain, label, className, size }) {
  if (!status) return <span className="text-fg-subtle">—</span>;
  return (
    <Badge tone={statusTone(status, domain)} dot size={size} className={className}>
      {label || statusLabel(status)}
    </Badge>
  );
}

export default Badge;
