import { cn } from "./cn.js";
import { statusLabel, statusTone } from "./status.js";
import { DateTime } from "./display.jsx";

const DOT = {
  success: "bg-success",
  info: "bg-info",
  warning: "bg-warning",
  danger: "bg-danger",
  accent: "bg-accent-fg",
  neutral: "bg-fg-subtle",
  primary: "bg-primary",
};

/**
 * Vertical timeline (order status history, audit trail).
 *   <Timeline items={order.statusHistory.map((h) => ({ status: h.status, at: h.at, note: h.note, actor: h.by?.name }))} />
 * Item: { title?, status?, at, description?/note?, actor?, tone?, icon? }. Newest first by default.
 */
export function Timeline({ items = [], newestFirst = true, className, empty = "No history yet." }) {
  const list = newestFirst ? [...items].sort((a, b) => new Date(b.at || 0) - new Date(a.at || 0)) : items;
  if (!list.length) return <p className="text-ui-sm text-fg-subtle">{empty}</p>;
  return (
    <ol className={cn("relative grid gap-5", className)}>
      {list.map((item, i) => {
        const tone = item.tone || (item.status ? statusTone(item.status) : "neutral");
        const Icon = item.icon;
        return (
          <li key={`${item.at}-${i}`} className="relative grid grid-cols-[1.25rem_1fr] gap-3">
            {i < list.length - 1 ? <span aria-hidden className="absolute left-[0.59rem] top-5 h-[calc(100%+0.5rem)] w-px bg-border" /> : null}
            <span className="relative z-[1] mt-1 grid size-5 place-items-center rounded-full bg-surface">
              {Icon ? <Icon aria-hidden className="size-3.5 text-fg-muted" /> : <span className={cn("size-2.5 rounded-full ring-4 ring-surface", DOT[tone])} />}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-baseline justify-between gap-x-3">
                <p className="text-ui-sm font-medium text-fg">{item.title || statusLabel(item.status)}</p>
                {item.at ? <DateTime value={item.at} className="text-ui-xs text-fg-subtle" /> : null}
              </div>
              {item.description || item.note ? <p className="mt-0.5 whitespace-pre-line text-ui-sm text-fg-muted">{item.description || item.note}</p> : null}
              {item.actor ? <p className="mt-0.5 text-ui-xs text-fg-subtle">by {item.actor}</p> : null}
            </div>
          </li>
        );
      })}
    </ol>
  );
}

export default Timeline;
