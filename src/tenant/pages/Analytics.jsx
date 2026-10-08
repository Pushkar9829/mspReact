import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, X } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { istDaysAgo, istToday } from "../../shared/lib/format.js";
import { cn } from "../../shared/ui/cn.js";
import {
  AreaChart,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DateRangePicker,
  DateTime,
  DonutChart,
  EmptyState,
  FacetFilter,
  Money,
  PageHeader,
  RelativeTime,
  SkeletonText,
  StatCard,
} from "../../shared/ui/index.js";
import { ChartSkeleton, PanelState, Segmented, countAxis, dayShort, eventLabel, moneyAxis } from "./insights/shared.jsx";

const IMPORTANCE = ["critical", "high", "normal", "low"];
const IMPORTANCE_TONE = { critical: "danger", high: "warning", normal: "info", low: "neutral" };
const CATEGORIES = ["order", "inventory", "pricing", "chat", "auth", "tenant", "catalog", "cms", "account"];
const cap = (s) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : "");

function ImportanceBadge({ value }) {
  if (!value) return <span className="text-fg-subtle">—</span>;
  return (
    <Badge tone={IMPORTANCE_TONE[value] || "neutral"} dot>
      {cap(value)}
    </Badge>
  );
}

function ResourceLink({ row }) {
  if (!row.resource) return <span className="text-fg-subtle">—</span>;
  if (row.resource === "order" && row.resourceId) {
    return (
      <Link to={`/tenant/orders/${row.resourceId}`} className="relative z-10 text-primary-soft-fg underline-offset-4 hover:underline">
        Order ›
      </Link>
    );
  }
  return <span className="text-fg-muted">{cap(row.resource)}</span>;
}

export default function Analytics() {
  const table = useUrlTableState({ filters: ["from", "to", "category", "event", "importance"], defaults: { limit: 25 } });
  const f = table.filters;
  // Default range: last 7 IST days including today. Kept out of the URL until the user changes it.
  const from = f.from || istDaysAgo(6);
  const to = f.to || istToday();
  const customized = !!(f.from || f.to || f.category || f.event || f.importance);

  const catalog = useQuery({ queryKey: keys.analytics.custom("catalog"), queryFn: () => api.analyticsCatalog(), staleTime: 10 * 60_000 });
  const catalogEvents = catalog.data?.events || [];
  const categories = catalog.data?.categories || CATEGORIES;
  const eventOptions = catalogEvents.filter((e) => !f.category || e.category === f.category).map((e) => ({ value: e.event, label: eventLabel(e.event) }));

  // The daily rollups (overview totals, by-date, by-event) have no importance dimension, so only
  // event/category apply to them; importance applies to the event-level panels.
  const rollupQ = useMemo(() => clean({ from, to, category: f.category, event: f.event }), [from, to, f.category, f.event]);
  const eventQ = useMemo(() => clean({ ...rollupQ, importance: f.importance }), [rollupQ, f.importance]);

  const overview = useQuery({ queryKey: keys.analytics.custom("overview", eventQ), queryFn: () => api.analyticsOverview(eventQ), placeholderData: (p) => p });
  const byDate = useQuery({ queryKey: keys.analytics.custom("by-date", rollupQ), queryFn: () => api.analyticsByDate(rollupQ), placeholderData: (p) => p });
  const byEvent = useQuery({ queryKey: keys.analytics.custom("by-event", rollupQ), queryFn: () => api.analyticsByEvent(rollupQ), placeholderData: (p) => p });
  const important = useQuery({
    queryKey: keys.analytics.custom("important", eventQ),
    queryFn: () => api.analyticsImportant({ ...eventQ, limit: 8 }),
    placeholderData: (p) => p,
  });
  const feedQ = { ...eventQ, page: table.page, limit: table.limit };
  const feed = useQuery({ queryKey: keys.analytics.list(feedQ), queryFn: () => api.analyticsEvents(feedQ), ...listQueryOptions });

  const setRange = ({ from: a, to: b }) => table.setFilters({ from: a || "", to: b || "" });
  const resetAll = () => table.setFilters({ from: "", to: "", category: "", event: "", importance: "" });

  return (
    <>
      <PageHeader title="Analytics" description="Store activity tracked as events. Days are IST (Asia/Kolkata) calendar days." />

      <div className="grid gap-6">
        <div role="search" aria-label="Analytics filters" className="flex flex-wrap items-center gap-2">
          <DateRangePicker from={from} to={to} onChange={setRange} />
          <FacetFilter
            title="Category"
            value={f.category}
            onChange={(v) => table.setFilters({ category: v, event: v && f.event && catalogEvents.find((e) => e.event === f.event)?.category !== v ? "" : f.event })}
            options={categories.map((c) => ({ value: c, label: cap(c) }))}
          />
          <FacetFilter title="Event" value={f.event} onChange={(v) => table.setFilter("event", v)} options={eventOptions} />
          <FacetFilter title="Importance" value={f.importance} onChange={(v) => table.setFilter("importance", v)} options={(catalog.data?.importance || IMPORTANCE).map((i) => ({ value: i, label: cap(i) }))} />
          {customized ? (
            <Button size="sm" variant="ghost" rightIcon={X} onClick={resetAll}>
              Reset
            </Button>
          ) : null}
          {f.importance ? <p className="w-full text-ui-xs text-fg-subtle">Importance filters the event log, important events and importance counts. Daily totals and per-event charts are rolled up without importance.</p> : null}
        </div>

        <OverviewTiles overview={overview} />

        <div className="grid gap-6 xl:grid-cols-3">
          <TrendCard byDate={byDate} className="xl:col-span-2" />
          <CategoryCard overview={overview} />
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <ByEventCard byEvent={byEvent} active={f.event} onPick={(ev) => table.setFilter("event", f.event === ev ? "" : ev)} />
          <ImportantCard important={important} />
        </div>

        <Card>
          <CardHeader title="Event log" description="Every tracked event in the selected range, newest first." />
          <div className="p-4 sm:p-5">
            <DataTable
              storageKey="tenant-analytics-events"
              exportFilename="analytics-events"
              table={table}
              data={feed.data?.data}
              meta={feed.data?.meta}
              loading={feed.isPending}
              fetching={feed.isFetching}
              error={feed.error}
              onRetry={feed.refetch}
              columns={[
                { id: "event", header: "Event", primary: true, accessorFn: (r) => eventLabel(r.event), mobile: "title", csv: (r) => r.event },
                { id: "category", header: "Category", accessorFn: (r) => cap(r.category), mobile: "subtitle" },
                { id: "importance", header: "Importance", cell: (r) => <ImportanceBadge value={r.importance} />, csv: (r) => r.importance },
                { id: "user", header: "User", accessorFn: (r) => r.userId?.name || r.userId?.email || "—", hideable: true },
                { id: "resource", header: "Resource", cell: (r) => <ResourceLink row={r} />, csv: (r) => (r.resource ? `${r.resource}:${r.resourceId || ""}` : "") },
                { id: "amount", header: "Amount", align: "right", cell: (r) => (Number(r.amount) ? <Money value={r.amount} /> : <span className="text-fg-subtle">—</span>), csv: (r) => r.amount },
                { id: "at", header: "When (IST)", cell: (r) => <DateTime value={r.occurredAt} />, csv: (r) => r.occurredAt, mobile: "meta" },
              ]}
              emptyState={
                <EmptyState
                  icon={Activity}
                  title="No events in this range"
                  description={customized ? "Try widening the date range or clearing filters." : "Activity such as orders, logins and stock changes appears here."}
                  action={customized ? <Button size="sm" onClick={resetAll}>Reset filters</Button> : null}
                />
              }
            />
          </div>
        </Card>
      </div>
    </>
  );
}

function clean(obj) {
  return Object.fromEntries(Object.entries(obj).filter(([, v]) => v != null && v !== ""));
}

/* ------------------------------------------------------------------ panels */

function OverviewTiles({ overview }) {
  const d = overview.data;
  const loading = overview.isPending;
  if (overview.error) {
    return (
      <Card>
        <PanelState query={overview} />
      </Card>
    );
  }
  const days = d?.totals?.days;
  return (
    <section aria-label="Activity totals" className={cn("grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4", overview.isFetching && !loading && "opacity-70")}>
      <StatCard label="Events" loading={loading} value={d?.totals?.events != null ? Number(d.totals.events).toLocaleString("en-IN") : null} hint={days ? `Across ${days} IST day${days === 1 ? "" : "s"}` : null} />
      <StatCard label="Event amount" loading={loading} value={<Money value={d?.totals?.amount} whole />} hint="Sum of amounts attached to events" />
      <StatCard label="Critical" loading={loading} value={d?.byImportance?.critical != null ? Number(d.byImportance.critical).toLocaleString("en-IN") : null} hint="Cancellations, stock-outs, lockouts" />
      <StatCard label="High importance" loading={loading} value={d?.byImportance?.high != null ? Number(d.byImportance.high).toLocaleString("en-IN") : null} hint="Orders, returns, refunds, low stock" />
    </section>
  );
}

function TrendCard({ byDate, className }) {
  const [metric, setMetric] = useState("count");
  const series = byDate.data?.series || [];
  const empty = series.length > 0 && series.every((r) => !Number(r.count));
  return (
    <Card className={className}>
      <CardHeader
        title={metric === "count" ? "Events per day" : "Event amount per day"}
        description="IST calendar days"
        actions={
          <Segmented
            label="Trend metric"
            value={metric}
            onChange={setMetric}
            options={[
              { value: "count", label: "Count" },
              { value: "amount", label: "Amount" },
            ]}
          />
        }
      />
      <CardBody>
        <PanelState query={byDate} skeleton={<ChartSkeleton />}>
          {empty || !series.length ? (
            <EmptyState compact icon={Activity} title="No activity in this range" description="Widen the date range to see more." />
          ) : (
            <AreaChart
              data={series}
              x="day"
              series={[metric === "count" ? { key: "count", label: "Events" } : { key: "amount", label: "Amount", color: "var(--chart-2)" }]}
              format={metric === "count" ? countAxis : moneyAxis}
              formatX={dayShort}
              title={metric === "count" ? "Events per day" : "Event amount per day"}
              height={240}
            />
          )}
        </PanelState>
      </CardBody>
    </Card>
  );
}

function CategoryCard({ overview }) {
  const entries = Object.entries(overview.data?.byCategory || {})
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => b[1] - a[1]);
  const data = entries.length > 5
    ? [...entries.slice(0, 4).map(([k, v]) => ({ label: cap(k), value: v })), { label: "Other", value: entries.slice(4).reduce((a, [, v]) => a + v, 0), color: "var(--fg-subtle)" }]
    : entries.map(([k, v]) => ({ label: cap(k), value: v }));
  return (
    <Card>
      <CardHeader title="By category" description="Event count" />
      <CardBody>
        <PanelState query={overview} skeleton={<ChartSkeleton className="h-40" />}>
          {data.length ? <DonutChart data={data} format={countAxis} centerLabel="events" title="Events by category" /> : <EmptyState compact icon={Activity} title="No events" />}
        </PanelState>
      </CardBody>
    </Card>
  );
}

function ByEventCard({ byEvent, active, onPick }) {
  const rows = byEvent.data?.events || [];
  const max = Math.max(1, ...rows.map((r) => Number(r.count) || 0));
  return (
    <Card>
      <CardHeader title="By event" description="Select an event to filter the page" />
      <PanelState query={byEvent} skeleton={<SkeletonText lines={6} className="p-4 sm:p-5" />}>
        {rows.length ? (
          <ul className="grid gap-0.5 p-2">
            {rows.map((r) => {
              const on = active === r.event;
              return (
                <li key={r.event}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onPick(r.event)}
                    className={cn(
                      "grid w-full grid-cols-[minmax(0,10rem)_1fr_auto] items-center gap-3 rounded-md px-2.5 py-2 text-left text-ui-sm transition-colors hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-primary",
                      on && "bg-primary-soft"
                    )}
                  >
                    <span className="min-w-0">
                      <span className="block truncate font-medium text-fg">{eventLabel(r.event)}</span>
                      <span className="block truncate text-ui-2xs text-fg-subtle">
                        {cap(r.category)}
                        {Number(r.amount) ? <> · <Money value={r.amount} whole /></> : null}
                      </span>
                    </span>
                    <span aria-hidden className="h-2 overflow-hidden rounded-full bg-surface-sunken">
                      <span className="block h-full rounded-full bg-chart-1" style={{ width: `${((Number(r.count) || 0) / max) * 100}%` }} />
                    </span>
                    <span className="tabular-nums text-fg">{Number(r.count || 0).toLocaleString("en-IN")}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState compact icon={Activity} title="No events in this range" />
        )}
      </PanelState>
    </Card>
  );
}

function ImportantCard({ important }) {
  const rows = important.data?.data || [];
  const total = important.data?.meta?.total;
  return (
    <Card>
      <CardHeader title="Important events" description={total > rows.length ? `Latest ${rows.length} of ${total.toLocaleString("en-IN")} critical/high events` : "Critical and high-importance events"} />
      <PanelState query={important} skeleton={<SkeletonText lines={6} className="p-4 sm:p-5" />}>
        {rows.length ? (
          <ul className="divide-y divide-border">
            {rows.map((r) => (
              <li key={r._id} className="flex items-start gap-3 px-4 py-2.5 sm:px-5">
                <AlertTriangle aria-hidden className={cn("mt-0.5 size-4 shrink-0", r.importance === "critical" ? "text-danger-fg" : "text-warning-fg")} />
                <div className="min-w-0 flex-1">
                  <p className="flex flex-wrap items-center gap-2 text-ui-sm">
                    <span className="font-medium text-fg">{eventLabel(r.event)}</span>
                    <ImportanceBadge value={r.importance} />
                  </p>
                  <p className="truncate text-ui-xs text-fg-subtle">
                    {r.userId?.name || r.userId?.email || "System"} · <RelativeTime value={r.occurredAt} />
                    {Number(r.amount) ? <> · <Money value={r.amount} /></> : null}
                  </p>
                </div>
                <span className="shrink-0 text-ui-xs">
                  <ResourceLink row={r} />
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState compact icon={AlertTriangle} title="Nothing important" description="No critical or high-importance events in this range." />
        )}
      </PanelState>
    </Card>
  );
}
