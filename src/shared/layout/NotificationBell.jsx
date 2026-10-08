import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Bell, CheckCheck } from "lucide-react";
import { useState } from "react";
import { api } from "../api/index.js";
import { keys } from "../api/keys.js";
import { cn } from "../ui/cn.js";
import { Button, IconButton } from "../ui/Button.jsx";
import { Popover } from "../ui/overlays.jsx";
import { EmptyState, ErrorState, SkeletonText, toast } from "../ui/feedback.jsx";
import { RelativeTime } from "../ui/display.jsx";
import { useSocketEvent } from "../realtime/socket.js";
import { useApiMutation } from "../hooks/useApiMutation.js";

const POLL_MS = 60_000;

/**
 * Topbar bell: unread count (polled every 60 s and refreshed on the socket "notification" event),
 * latest notifications in a popover, mark one / all as read.
 */
export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const queryClient = useQueryClient();

  const unread = useQuery({
    queryKey: keys.notifications.unread,
    queryFn: () => api.withTenant(null).notificationsUnreadCount(),
    refetchInterval: POLL_MS,
    refetchIntervalInBackground: false,
    staleTime: 15_000,
  });
  const list = useQuery({
    queryKey: keys.notifications.list({ limit: 10 }),
    queryFn: () => api.withTenant(null).listNotifications({ limit: 10 }),
    enabled: open,
  });

  useSocketEvent(
    "notification",
    (n) => {
      if (n?.title) toast(n.title, { description: n.body ? String(n.body).slice(0, 140) : undefined });
    },
    { invalidate: [keys.notifications.all] }
  );

  const readOne = useApiMutation((id) => api.withTenant(null).markNotificationRead(id), { invalidate: [keys.notifications.all], legacy: false, error: false });
  const readAll = useApiMutation(() => api.withTenant(null).markAllNotificationsRead(), {
    invalidate: [keys.notifications.all],
    legacy: false,
    success: "All notifications marked as read",
  });

  const count = Number(unread.data?.unread) || 0;
  const rows = list.data?.data || [];

  return (
    <Popover
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) queryClient.invalidateQueries({ queryKey: keys.notifications.unread });
      }}
      align="end"
      className="w-[min(92vw,24rem)] p-0"
      trigger={
        <span className="relative inline-flex">
          <IconButton icon={Bell} label={count ? `Notifications, ${count} unread` : "Notifications"} />
          {count ? (
            <span aria-hidden className="pointer-events-none absolute right-1 top-1 grid min-w-4 place-items-center rounded-full bg-danger px-1 text-[10px] font-semibold leading-4 text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </span>
      }
    >
      <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
        <p className="text-ui font-semibold text-fg">Notifications</p>
        <Button size="xs" variant="ghost" leftIcon={CheckCheck} disabled={!count} loading={readAll.isPending} onClick={() => readAll.mutate()}>
          Mark all read
        </Button>
      </div>
      <div className="max-h-[60vh] overflow-y-auto">
        {list.isPending ? (
          <SkeletonText lines={4} className="p-4" />
        ) : list.error ? (
          <ErrorState error={list.error} onRetry={list.refetch} compact />
        ) : !rows.length ? (
          <EmptyState icon={Bell} title="You’re all caught up" description="New orders, returns and announcements show up here." compact />
        ) : (
          <ul className="divide-y divide-border">
            {rows.map((n) => {
              const isUnread = !n.readAt;
              return (
                <li key={n._id}>
                  <button
                    type="button"
                    onClick={() => isUnread && readOne.mutate(n._id)}
                    className={cn("flex w-full gap-3 px-4 py-3 text-left hover:bg-surface-hover", isUnread && "bg-primary-soft/30")}
                  >
                    <span aria-hidden className={cn("mt-1.5 size-2 shrink-0 rounded-full", isUnread ? "bg-primary" : "bg-transparent")} />
                    <span className="min-w-0 flex-1">
                      <span className="block text-ui-sm font-medium text-fg">{n.title}</span>
                      {n.body ? <span className="mt-0.5 line-clamp-2 block text-ui-xs text-fg-muted">{n.body}</span> : null}
                      <RelativeTime value={n.publishedAt || n.createdAt} className="mt-1 block text-ui-2xs text-fg-subtle" />
                    </span>
                    {isUnread ? <span className="sr-only">Unread. Activate to mark as read.</span> : null}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Popover>
  );
}

export default NotificationBell;
