import { useState } from "react";
import { Link } from "react-router-dom";
import { Popover as RPopover } from "radix-ui";
import { Bell, CheckCheck } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { IconButton } from "./ui/Button.jsx";
import { cn } from "./ui/cn.js";
import { Skeleton } from "./ui/Skeletons.jsx";
import { useNotificationActions, useNotificationList, useUnreadCount } from "../hooks/useNotifications.js";
import { useViewer } from "../hooks/useViewer.js";
import { shopKeys } from "../hooks/keys.js";
import { useSocketEvent } from "../../shared/realtime/socket.js";
import { relativeTime } from "../../shared/lib/format.js";

/** Buyer notification bell (signed-in only): unread count, latest 8, mark read, link to all. */
export default function ShopNotificationBell() {
  const { signedIn, viewer } = useViewer();
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const { unread } = useUnreadCount();
  const list = useNotificationList({ limit: 8 }, { enabled: open });
  const { readOne, readAll } = useNotificationActions();

  useSocketEvent(
    "notification",
    (n) => {
      if (n?.title) toast(n.title, { description: n.body ? String(n.body).slice(0, 140) : undefined });
    },
    { invalidate: [shopKeys.notifications(viewer)], enabled: signedIn }
  );
  useSocketEvent("order:updated", () => {}, { invalidate: [[...shopKeys.all, "orders"], [...shopKeys.all, "order"]], enabled: signedIn });

  if (!signedIn) return null;
  const rows = list.data?.data || [];

  return (
    <RPopover.Root
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) qc.invalidateQueries({ queryKey: shopKeys.notificationUnread(viewer) });
      }}
    >
      <RPopover.Trigger asChild>
        <IconButton icon={Bell} variant="on-navy" label={unread ? `Notifications, ${unread} unread` : "Notifications"} badge={unread ? (unread > 99 ? "99+" : unread) : null} />
      </RPopover.Trigger>
      <RPopover.Portal>
        <RPopover.Content align="end" sideOffset={8} collisionPadding={12} className="z-50 w-[min(92vw,24rem)] overflow-hidden rounded-card border border-shop-line bg-shop-card text-shop-text shadow-shop-pop outline-none data-[state=open]:animate-scale-in">
          <div className="flex items-center justify-between border-b border-shop-line px-4 py-2">
            <p className="font-display text-shop-md font-bold text-shop-ink">Notifications</p>
            <button type="button" disabled={!unread || readAll.isPending} onClick={() => readAll.mutate()} className="inline-flex min-h-9 items-center gap-1 rounded-control px-2 text-shop-xs pointer-coarse:min-h-11 font-semibold text-shop-primary-ink hover:bg-shop-hover disabled:opacity-40">
              <CheckCheck className="size-4" aria-hidden /> Mark all read
            </button>
          </div>
          <div className="max-h-[60dvh] overflow-y-auto">
            {list.isPending ? (
              <div className="grid gap-3 p-4">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-2/3" />
              </div>
            ) : !rows.length ? (
              <p className="px-4 py-8 text-center text-shop-sm text-shop-muted">You’re all caught up. Order updates and offers show up here.</p>
            ) : (
              <ul className="divide-y divide-shop-line">
                {rows.map((n) => {
                  const isUnread = !n.readAt;
                  return (
                    <li key={n._id}>
                      <button type="button" onClick={() => isUnread && readOne.mutate(n._id)} className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-shop-hover", isUnread && "bg-shop-primary-soft/40")}>
                        <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", isUnread ? "bg-shop-primary" : "bg-transparent")} />
                        <span className="min-w-0 flex-1">
                          <span className="block text-shop-sm font-semibold text-shop-ink">{n.title}</span>
                          {n.body ? <span className="mt-0.5 line-clamp-2 block text-shop-xs text-shop-muted">{n.body}</span> : null}
                          <span className="mt-1 block text-shop-xs text-shop-subtle">{relativeTime(n.publishedAt || n.createdAt)}</span>
                        </span>
                        {isUnread ? <span className="sr-only">Unread. Activate to mark as read.</span> : null}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
          <Link to="/account/notifications" onClick={() => setOpen(false)} className="block border-t border-shop-line px-4 py-3 text-center text-shop-sm font-semibold text-shop-primary-ink hover:bg-shop-hover">
            All notifications and settings
          </Link>
        </RPopover.Content>
      </RPopover.Portal>
    </RPopover.Root>
  );
}
