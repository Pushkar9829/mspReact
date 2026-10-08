/**
 * /account/notifications — buyer notification centre: category filter (GET /notifications?category=),
 * grouped by IST day, unread dot, open the related order / conversation / coupons (marks it read),
 * mark all read; and channel preferences per category (GET/PUT /notifications/preferences).
 */
import { useState } from "react";
import { Link } from "react-router-dom";
import { Bell, CheckCheck, ChevronRight, MessageCircle, Package, ShieldCheck, Tag } from "lucide-react";
import { Button, EmptyState, Notice, RowSkeleton, ShopPageHeader, Tabs, TabPanel } from "../components/ui/index.js";
import { cn } from "../components/ui/cn.js";
import { useNotificationActions, useNotificationList, useNotificationPreferences, useUnreadCount } from "../hooks/useNotifications.js";
import { formatDate, formatTime, istDaysAgo, istToday, toIstDateValue } from "../../shared/lib/format.js";

const CHANNELS = [
  ["inApp", "In app"],
  ["email", "Email"],
  ["sms", "SMS"],
];

const FILTERS = [
  { value: "", label: "All" },
  { value: "order", label: "Orders" },
  { value: "chat", label: "Messages" },
  { value: "marketing", label: "Offers" },
  { value: "account", label: "Account" },
];

const CATEGORY_ICON = {
  order: [Package, "bg-shop-info-soft text-shop-info-ink"],
  chat: [MessageCircle, "bg-shop-primary-soft text-shop-primary-ink"],
  marketing: [Tag, "bg-shop-saffron-soft text-shop-saffron-ink"],
  account: [ShieldCheck, "bg-shop-gold-soft text-shop-gold-ink"],
};

/** Where a notification leads, from its data (order, conversation, coupon, offer). */
function targetOf(n) {
  const d = n.data || {};
  if (d.orderId) return { to: `/account/orders/${d.orderId}`, label: "View order" };
  if (d.conversationId) return { to: `/account/support?c=${d.conversationId}`, label: "Open conversation" };
  if (d.couponId || d.code) return { to: "/account/coupons", label: "See coupons" };
  if (d.offerId) return { to: "/deals", label: "See deals" };
  return null;
}

function dayLabel(key, today, yesterday, sample) {
  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";
  return formatDate(sample);
}

function Inbox() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");
  const list = useNotificationList({ page, limit: 20, ...(category ? { category } : {}) });
  const { unread } = useUnreadCount();
  const { readOne, readAll } = useNotificationActions();
  const rows = list.data?.data || [];
  const meta = list.data?.meta;

  const today = istToday();
  const yesterday = istDaysAgo(1);
  const days = [];
  for (const n of rows) {
    const at = n.publishedAt || n.createdAt;
    const key = toIstDateValue(at) || "unknown";
    let day = days[days.length - 1];
    if (!day || day.key !== key) {
      day = { key, label: key === "unknown" ? "Earlier" : dayLabel(key, today, yesterday, at), rows: [] };
      days.push(day);
    }
    day.rows.push(n);
  }

  const pick = (value) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="no-scrollbar -mx-4 flex min-w-0 gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label="Filter notifications">
          {FILTERS.map((f) => (
            <button
              key={f.value || "all"}
              type="button"
              aria-pressed={category === f.value}
              onClick={() => pick(f.value)}
              className={cn(
                "min-h-11 shrink-0 rounded-full border px-4 text-shop-sm font-semibold transition-colors",
                category === f.value ? "border-shop-navy bg-shop-navy text-white" : "border-shop-line bg-shop-card text-shop-text hover:border-shop-line-strong"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Button variant="secondary" size="sm" leftIcon={CheckCheck} disabled={!unread} loading={readAll.isPending} onClick={() => readAll.mutate()} className="rounded-full">
          Mark all read{unread ? ` (${unread})` : ""}
        </Button>
      </div>

      {list.isPending ? (
        <div className="grid gap-2" role="status" aria-label="Loading notifications">
          <RowSkeleton />
          <RowSkeleton />
          <RowSkeleton />
        </div>
      ) : list.error ? (
        <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => list.refetch()}>Retry</Button>}>
          {list.error.message}
        </Notice>
      ) : !rows.length ? (
        category ? (
          <EmptyState compact icon={Bell} title="Nothing here" description="No notifications in this category yet." action={<Button variant="secondary" onClick={() => pick("")}>Show all</Button>} />
        ) : (
          <EmptyState icon={Bell} title="No notifications yet" description="Order updates, messages from sellers and offers show up here." action={<Button to="/account/orders" variant="secondary">View orders</Button>} />
        )
      ) : (
        <div className="grid gap-5">
          {days.map((day) => (
            <section key={day.key} aria-labelledby={`nd-${day.key}`} className="grid gap-2">
              <h3 id={`nd-${day.key}`} className="text-[0.6875rem] font-bold uppercase tracking-[0.08em] text-shop-subtle">
                {day.label}
              </h3>
              <ul className="divide-y divide-shop-line overflow-hidden rounded-[1.25rem] border border-shop-line bg-shop-card">
                {day.rows.map((n) => {
                  const [Icon, tint] = CATEGORY_ICON[n.category] || [Bell, "bg-shop-well text-shop-text"];
                  const target = targetOf(n);
                  const unreadRow = !n.readAt;
                  const markRead = () => unreadRow && readOne.mutate(n._id);
                  const inner = (
                    <>
                      <span aria-hidden className={cn("relative grid size-9 shrink-0 place-items-center rounded-full", tint)}>
                        <Icon className="size-4" strokeWidth={1.9} />
                        {unreadRow ? <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-shop-saffron ring-2 ring-shop-card" /> : null}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="flex items-start justify-between gap-3">
                          <span className={cn("block text-shop-sm text-shop-ink", unreadRow ? "font-bold" : "font-semibold")}>{n.title}</span>
                          <span className="shrink-0 text-shop-xs tabular-nums text-shop-subtle">{formatTime(n.publishedAt || n.createdAt)}</span>
                        </span>
                        {n.body ? <span className="mt-0.5 block text-shop-sm text-shop-muted">{n.body}</span> : null}
                        {target ? (
                          <span className="mt-1 inline-flex items-center gap-0.5 text-shop-xs font-semibold text-shop-primary-ink">
                            {target.label} <ChevronRight className="size-3.5" aria-hidden />
                          </span>
                        ) : null}
                      </span>
                      {unreadRow ? <span className="sr-only">Unread. {target ? "Opening it marks it as read." : "Activate to mark as read."}</span> : null}
                    </>
                  );
                  const cls = cn("flex w-full gap-3 px-4 py-3 text-left transition-colors hover:bg-shop-hover", unreadRow && "bg-shop-primary-soft/40");
                  return (
                    <li key={n._id}>
                      {target ? (
                        <Link to={target.to} onClick={markRead} className={cls}>
                          {inner}
                        </Link>
                      ) : (
                        <button type="button" onClick={markRead} className={cls}>
                          {inner}
                        </button>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
      {meta && meta.pages > 1 ? (
        <div className="flex items-center justify-between">
          <Button variant="secondary" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
            Newer
          </Button>
          <span className="text-shop-sm text-shop-muted">
            Page {meta.page} of {meta.pages}
          </span>
          <Button variant="secondary" size="sm" disabled={page >= meta.pages} onClick={() => setPage((p) => p + 1)}>
            Older
          </Button>
        </div>
      ) : null}
    </div>
  );
}

const CATEGORIES = [
  { key: "order", label: "Orders", help: "Confirmation, dispatch, delivery, cancellations and refunds" },
  { key: "chat", label: "Support messages", help: "Replies from sellers and the MS₹ team" },
  { key: "marketing", label: "Offers and restocks", help: "Coupons, price drops and back-in-stock alerts" },
  { key: "account", label: "Account and security", help: "Sign-ins and account changes" },
];
const LOCKED = { account: ["email"] };

function Preferences() {
  const prefs = useNotificationPreferences();
  const data = prefs.data?.preferences || prefs.data || {};
  const rows = CATEGORIES.filter((c) => data[c.key] && typeof data[c.key] === "object");
  if (prefs.isPending) return <RowSkeleton />;
  if (prefs.error) return <Notice tone="danger" action={<Button size="sm" variant="secondary" onClick={() => prefs.refetch()}>Retry</Button>}>{prefs.error.message}</Notice>;
  if (!rows.length) return <p className="text-shop-sm text-shop-muted">No preference settings available.</p>;
  return (
    <div className="grid gap-3">
      <div className="overflow-x-auto rounded-[1.25rem] border border-shop-line bg-shop-card">
        <table className="w-full text-shop-sm">
          <caption className="sr-only">How you receive each kind of notification</caption>
          <thead>
            <tr className="border-b border-shop-line text-left text-shop-muted">
              <th scope="col" className="px-4 py-3 font-semibold">Notification</th>
              {CHANNELS.map(([k, label]) => (
                <th key={k} scope="col" className="w-12 px-0 py-3 text-center text-shop-xs font-semibold sm:w-20 sm:text-shop-sm">{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-shop-line">
            {rows.map((cat) => (
              <tr key={cat.key}>
                <th scope="row" className="px-3 py-3 text-left font-normal sm:px-4">
                  <span className="block font-semibold text-shop-ink">{cat.label}</span>
                  <span className="block text-shop-xs text-shop-muted">{cat.help}</span>
                </th>
                {CHANNELS.map(([k, label]) => {
                  const locked = (LOCKED[cat.key] || []).includes(k);
                  return (
                    <td key={k} className="px-0 py-2 text-center">
                      {data[cat.key][k] === undefined ? (
                        <span className="text-shop-subtle">—</span>
                      ) : (
                        <label className="inline-grid size-11 cursor-pointer place-items-center">
                          <input
                            type="checkbox"
                            aria-label={`${label} for ${cat.label}${locked ? " (always on)" : ""}`}
                            className="size-5 accent-[var(--shop-primary)]"
                            checked={Boolean(data[cat.key][k])}
                            disabled={prefs.save.isPending || locked}
                            onChange={(e) => prefs.save.mutate({ [cat.key]: { [k]: e.target.checked } })}
                          />
                        </label>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-shop-xs text-shop-muted">Security emails are always sent. Changes save immediately.</p>
    </div>
  );
}

export default function Notifications() {
  return (
    <div className="grid gap-5">
      <ShopPageHeader title="Notifications" description="Order updates, messages and offers, and how you want to receive them." />
      <Tabs urlParam="tab" tabs={[{ value: "inbox", label: "Inbox" }, { value: "settings", label: "Settings" }]} aria-label="Notifications">
        <TabPanel value="inbox"><Inbox /></TabPanel>
        <TabPanel value="settings"><Preferences /></TabPanel>
      </Tabs>
    </div>
  );
}
