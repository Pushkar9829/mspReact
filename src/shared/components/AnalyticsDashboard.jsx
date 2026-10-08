import { useCallback, useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertOctagon, AlertTriangle, CalendarDays, Download, ListFilter, X } from "lucide-react";
import { api } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useCan } from "../context/AuthContext.jsx";
import { useTenantContext } from "../context/TenantContext.jsx";
import { prettyStatus } from "../auth.js";
import { TZ, compactNumber, inr, istDaysAgo, istToday, number, parseIstDate, toIstDateValue } from "../lib/format.js";
import {
  Alert,
  AreaChart,
  Badge,
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  DateRangePicker,
  DateTime,
  EmptyState,
  ErrorState,
  FacetFilter,
  Money,
  PageHeader,
  Pagination,
  Section,
  Skeleton,
  SkeletonText,
  StatCard,
  StatusPill,
  TenantCombobox,
  Tooltip,
  toast,
} from "../ui/index.js";
import { cn } from "../ui/cn.js";

/*
 * Analytics dashboard shared by the platform console (/super-admin/analytics) and the tenant panel
 * (/tenant/analytics). Props kept backwards compatible: { title, subtitle, showTenants }.
 *
 * URL is the source of truth: ?from=&to= (IST days, default last 30 days), ?tenant= (platform
 * only, falls back to the topbar tenant), ?event=, ?category=, ?page= (event feed), ?ipage=
 * (important events), ?importance= (feed only).
 * Every panel is its own query with its own skeleton / error + retry.
 */

const DAY_MS = 86_400_000;
const MAX_ANALYTICS_DAYS = 400; // analytics/service.js range()
const IMPORTANCE = ["critical", "high", "normal", "low"];
const IMPORTANCE_TONE = { critical: "danger", high: "warning", normal: "info", low: "neutral" };

const shortDayFmt = new Intl.DateTimeFormat("en-IN", { timeZone: TZ, day: "numeric", month: "short" });
/** "2026-10-06" → "6 Oct" (IST). */
export const shortDay = (day) => {
  const d = parseIstDate(day);
  return d ? shortDayFmt.format(d) : day;
};
const isDay = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v || "");
const dayDiff = (a, b) => Math.round((parseIstDate(b) - parseIstDate(a)) / DAY_MS);
const eventLabel = (e) => (e ? prettyStatus(String(e).toLowerCase()) : "—");
const r2 = (n) => Math.round(n * 100) / 100;
const addDays = (day, n) => toIstDateValue(new Date(parseIstDate(day).getTime() + n * DAY_MS));
/** % change, null when the previous period is 0 (same rule as the API's `changes`). */
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
function sumSales(rows) {
  const t = rows.reduce(
    (a, d) => ({ orders: a.orders + (d.orders || 0), gmv: r2(a.gmv + (d.gmv || 0)), netSales: r2(a.netSales + (d.netSales || 0)), fees: r2(a.fees + (d.fees || 0)) }),
    { orders: 0, gmv: 0, netSales: 0, fees: 0 }
  );
  return { ...t, aov: t.orders ? r2(t.gmv / t.orders) : null };
}
/** StatCard props: a number shows the arrow; null shows "—". */
const deltaOf = (change, label) => (typeof change === "number" ? { delta: change, deltaLabel: label } : { hint: `— ${label}` });

/* ------------------------------------------------------------------ URL state */

function useDashboardState(isPlatform) {
  const [params, setParams] = useSearchParams();
  const { tenantId: ctxTenant } = useTenantContext();
  const today = istToday();
  const rawFrom = params.get("from");
  const rawTo = params.get("to");
  const from = isDay(rawFrom) ? rawFrom : istDaysAgo(29);
  const to = isDay(rawTo) ? rawTo : today;
  const urlTenant = params.get("tenant") || "";
  const tenantId = isPlatform ? urlTenant || ctxTenant || "" : ctxTenant || "";
  const event = params.get("event") || "";
  const category = params.get("category") || "";
  const importance = params.get("importance") || "";
  const page = Math.max(1, Number(params.get("page")) || 1);
  const ipage = Math.max(1, Number(params.get("ipage")) || 1);

  const set = useCallback(
    (patch, { keepPages = false } = {}) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        Object.entries(patch).forEach(([k, v]) => {
          if (v == null || v === "") next.delete(k);
          else next.set(k, String(v));
        });
        if (!keepPages) {
          next.delete("page");
          next.delete("ipage");
        }
        return next;
      }),
    [setParams]
  );

  const custom = Boolean(rawFrom || rawTo || event || category || urlTenant || importance);
  return { from, to, today, tenantId, fromContext: isPlatform && !urlTenant && Boolean(ctxTenant), event, category, importance, page, ipage, set, custom };
}

/* ------------------------------------------------------------------ small pieces */

function PanelError({ error, onRetry }) {
  return <ErrorState compact error={error} onRetry={onRetry} />;
}

function ChartSkeleton() {
  return (
    <div className="grid gap-2 p-4 sm:p-5" aria-hidden>
      <Skeleton className="h-48 w-full" />
    </div>
  );
}

/* ------------------------------------------------------------------ main */

export default function AnalyticsDashboard({ title = "Analytics", subtitle, showTenants = false, breadcrumbs }) {
  const can = useCan();
  const { isPlatform } = useTenantContext();
  const s = useDashboardState(isPlatform);
  const scoped = useMemo(() => (isPlatform ? api.withTenant(s.tenantId || null) : api), [isPlatform, s.tenantId]);
  const canRevenue = can("reports.view");
  const canEvents = can("analytics.view");

  const rangeDays = dayDiff(s.from, s.to) + 1;
  const rangeError =
    s.from > s.to ? "The start date is after the end date." : rangeDays > MAX_ANALYTICS_DAYS ? `Pick a range of at most ${MAX_ANALYTICS_DAYS} days.` : s.to > s.today ? "The end date is in the future." : "";

  const tenantKey = s.tenantId || "all";
  const eventQuery = useMemo(() => {
    const q = { from: s.from, to: s.to };
    if (s.event) q.event = s.event;
    if (s.category) q.category = s.category;
    return q;
  }, [s.from, s.to, s.event, s.category]);

  const catalog = useQuery({ queryKey: keys.analytics.custom("catalog"), queryFn: () => api.analyticsCatalog(), staleTime: 10 * 60_000, enabled: canEvents });

  const isDefaultRange = s.from === istDaysAgo(29) && s.to === s.today;

  return (
    <>
      <PageHeader
        title={title}
        description={subtitle}
        breadcrumbs={breadcrumbs}
        meta={<Badge tone="outline">IST</Badge>}
      />

      <Card className="mb-6 p-3">
        <div className="flex flex-wrap items-center gap-2" role="search" aria-label="Analytics filters">
          <DateRangePicker
            from={s.from}
            to={s.to}
            onChange={({ from, to }) => s.set({ from: from || "", to: to || "" })}
            placeholder="Last 30 days"
          />
          {isPlatform && showTenants ? (
            <TenantCombobox
              value={s.tenantId}
              onChange={(id) => s.set({ tenant: id || "" })}
              placeholder="All tenants"
              size="sm"
              className="w-full sm:w-56"
              aria-label="Filter by tenant"
            />
          ) : null}
          {canEvents ? (
            <>
              <FacetFilter title="Event" value={s.event} onChange={(v) => s.set({ event: v })} options={eventOptions(catalog.data, s.event)} />
              <FacetFilter
                title="Category"
                value={s.category}
                onChange={(v) => s.set({ category: v })}
                options={(catalog.data?.categories || []).map((c) => ({ value: c, label: prettyStatus(c) }))}
              />
            </>
          ) : null}
          {s.custom ? (
            <Button size="sm" variant="ghost" rightIcon={X} onClick={() => s.set({ from: "", to: "", event: "", category: "", tenant: "", importance: "" })}>
              Reset
            </Button>
          ) : null}
          <p className="ml-auto text-ui-xs text-fg-subtle">
            {isDefaultRange ? "Last 30 days" : `${shortDay(s.from)} – ${shortDay(s.to)}`} · {rangeDays} day{rangeDays === 1 ? "" : "s"} · Asia/Kolkata
            {s.fromContext ? " · tenant from the top bar" : ""}
          </p>
        </div>
      </Card>

      {rangeError ? (
        <Alert tone="danger" className="mb-6" title="Invalid date range">
          {rangeError}
        </Alert>
      ) : (
        <div className="grid gap-10">
          {canRevenue ? <RevenueSection s={s} scoped={scoped} tenantKey={tenantKey} canExport={can("reports.export")} /> : null}
          {canRevenue && isPlatform && showTenants && !s.tenantId ? <StoresSection s={s} /> : null}
          {canEvents ? (
            <EventsSection s={s} scoped={scoped} tenantKey={tenantKey} query={eventQuery} catalog={catalog.data} showTenants={isPlatform && showTenants && !s.tenantId} isPlatform={isPlatform} />
          ) : null}
          {!canRevenue && !canEvents ? (
            <Card>
              <EmptyState icon={Activity} title="No analytics access" description="Revenue needs reports.view and event analytics needs analytics.view." />
            </Card>
          ) : null}
        </div>
      )}
    </>
  );
}

/** Catalog events (+ the selected one, which may be an uncatalogued event picked from the table). */
function eventOptions(catalog, selected) {
  const seen = new Set();
  const out = [];
  [...(catalog?.events || []).map((e) => e.event), selected].filter(Boolean).forEach((event) => {
    if (seen.has(event)) return;
    seen.add(event);
    out.push({ value: event, label: eventLabel(event) });
  });
  return out;
}

/* ------------------------------------------------------------------ revenue */

function RevenueSection({ s, scoped, tenantKey, canExport }) {
  // GET /reports/sales?from=&to= returns zero-filled IST days for exactly the range; the previous
  // period (same length, just before) gives the comparison.
  const rangeDays = dayDiff(s.from, s.to) + 1;
  const prev = { from: addDays(s.from, -rangeDays), to: addDays(s.from, -1) };
  const q = useQuery({
    queryKey: keys.reports.custom("sales", { from: s.from, to: s.to }, tenantKey),
    queryFn: () => scoped.reportsSalesRange({ from: s.from, to: s.to }),
    ...listQueryOptions,
  });
  const pq = useQuery({
    queryKey: keys.reports.custom("sales", prev, tenantKey),
    queryFn: () => scoped.reportsSalesRange(prev),
    staleTime: 5 * 60_000,
  });
  const rows = useMemo(() => (Array.isArray(q.data) ? q.data : []), [q.data]);
  const totals = useMemo(() => sumSales(rows), [rows]);
  const before = useMemo(() => (Array.isArray(pq.data) ? sumSales(pq.data) : null), [pq.data]);
  const vs = `vs previous ${rangeDays} day${rangeDays === 1 ? "" : "s"}`;
  const change = (k) => (before ? deltaOf(pct(totals[k] || 0, before[k] || 0), vs) : { hint: pq.isPending ? vs : undefined });

  async function exportCsv() {
    try {
      await scoped.exportReport("sales", { from: s.from, to: s.to });
      toast.success("Sales CSV downloaded");
    } catch (err) {
      toast.error(err.message || "Export failed");
    }
  }

  const exportBtn = (
    <Button size="sm" leftIcon={Download} disabled={!canExport} onClick={exportCsv}>
      Export CSV
    </Button>
  );

  return (
    <Section
      id="revenue"
      title="Revenue"
      description={`Revenue orders placed ${shortDay(s.from)} – ${shortDay(s.to)} (IST days), compared with the ${rangeDays} days before. Event and category filters don't apply here.`}
      actions={canExport ? exportBtn : <Tooltip content="Requires reports.export"><span>{exportBtn}</span></Tooltip>}
    >
      {q.error ? (
        <Card>
          <PanelError error={q.error} onRetry={q.refetch} />
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            <StatCard label="GMV" loading={q.isPending} value={<Money value={totals.gmv} whole />} {...change("gmv")} />
            <StatCard label="Net sales" loading={q.isPending} value={<Money value={totals.netSales} whole />} {...change("netSales")} />
            <StatCard label="Fees" loading={q.isPending} value={<Money value={totals.fees} whole />} {...change("fees")} />
            <StatCard label="Orders" loading={q.isPending} value={number(totals.orders)} {...change("orders")} />
            <StatCard label="Avg. order value" loading={q.isPending} value={totals.aov == null ? "—" : <Money value={totals.aov} />} {...(totals.aov == null ? { hint: "No orders" } : change("aov"))} />
          </div>
          <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
            <Card>
              <CardHeader title="GMV and net sales" description="Per IST day" />
              {q.isPending ? (
                <ChartSkeleton />
              ) : (
                <CardBody>
                  <AreaChart
                    data={rows}
                    x="_id"
                    title="GMV and net sales per day"
                    series={[
                      { key: "gmv", label: "GMV" },
                      { key: "netSales", label: "Net sales" },
                    ]}
                    format={(v) => inr(v, { whole: true })}
                    formatX={shortDay}
                  />
                </CardBody>
              )}
            </Card>
            <Card>
              <CardHeader title="Orders" description="Per IST day" />
              {q.isPending ? (
                <ChartSkeleton />
              ) : (
                <CardBody>
                  <BarChart data={rows} x="_id" title="Orders per day" series={[{ key: "orders", label: "Orders" }]} format={(v) => number(v)} formatX={shortDay} />
                </CardBody>
              )}
            </Card>
          </div>
        </>
      )}
    </Section>
  );
}

/** Platform only: per-store stats for the range (GET /reports/tenants). */
function StoresSection({ s }) {
  const query = { from: s.from, to: s.to, sort: "gmv", order: "desc", limit: 10 };
  const q = useQuery({ queryKey: keys.reports.custom("tenants", query), queryFn: () => api.reportsTenants(query), ...listQueryOptions });
  const rows = q.data?.data || [];
  const t = q.data?.totals;
  return (
    <Section
      id="stores"
      title="Stores"
      description="Top stores by GMV in the range. Pick a store above to focus the whole dashboard on it."
      actions={
        <Button size="sm" variant="ghost" to={`/super-admin/tenants?from=${s.from}&to=${s.to}`}>
          All stores
        </Button>
      }
    >
      <Card>
        {q.error ? (
          <PanelError error={q.error} onRetry={q.refetch} />
        ) : q.isPending ? (
          <ChartSkeleton />
        ) : !rows.length ? (
          <EmptyState compact title="No stores" description="No store matches." />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-ui-sm">
              <caption className="sr-only">Top stores by GMV</caption>
              <thead className="bg-surface-2 text-left text-ui-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 font-medium">Store</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Orders</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">GMV</th>
                  <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">AOV</th>
                  <th scope="col" className="hidden px-4 py-2 text-right font-medium sm:table-cell">Share</th>
                  <th scope="col" className="hidden px-4 py-2 text-right font-medium md:table-cell">Staff</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.tenantId} className="border-t border-border">
                    <td className="px-4 py-2">
                      <button type="button" className="text-left text-fg hover:underline" onClick={() => s.set({ tenant: r.tenantId })}>
                        {r.name}
                      </button>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums">{number(r.ordersCount)}</td>
                    <td className="px-4 py-2 text-right"><Money value={r.gmv} whole /></td>
                    <td className="hidden px-4 py-2 text-right sm:table-cell"><Money value={r.ordersCount ? r.aov : null} /></td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-fg-muted sm:table-cell">{t?.gmv ? `${Math.round((r.gmv / t.gmv) * 1000) / 10}%` : "—"}</td>
                    <td className="hidden px-4 py-2 text-right tabular-nums text-fg-muted md:table-cell">{number(r.staffCount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </Section>
  );
}

/* ------------------------------------------------------------------ events */

function EventsSection({ s, scoped, tenantKey, query, catalog, showTenants, isPlatform }) {
  const k = (name, extra) => keys.analytics.custom(name, { ...query, ...extra }, tenantKey);
  const overview = useQuery({ queryKey: k("overview"), queryFn: () => scoped.analyticsOverview(query), ...listQueryOptions });
  const byDate = useQuery({ queryKey: k("by-date"), queryFn: () => scoped.analyticsByDate(query), ...listQueryOptions });
  const byEvent = useQuery({ queryKey: k("by-event"), queryFn: () => scoped.analyticsByEvent(query), ...listQueryOptions });
  const byTenant = useQuery({ queryKey: k("by-tenant"), queryFn: () => scoped.analyticsByTenant(query), enabled: showTenants, ...listQueryOptions });

  const o = overview.data;
  const series = useMemo(() => byDate.data?.series || [], [byDate.data]);
  const importanceCount = (name) => o?.byImportance?.[name];
  const catalogMeta = useMemo(() => Object.fromEntries((catalog?.events || []).map((e) => [e.event, e])), [catalog]);

  return (
    <Section id="events" title="Events" description="Tracked platform activity (orders, stock, pricing, sign-ins, …). Raw events are kept for 180 days; daily totals forever.">
      {overview.error ? (
        <Card>
          <PanelError error={overview.error} onRetry={overview.refetch} />
        </Card>
      ) : (
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Events" icon={Activity} loading={overview.isPending} value={compactNumber(o?.totals?.events)} hint={`${o?.totals?.days ?? "—"} days`} />
          <StatCard label="Critical" icon={AlertOctagon} loading={overview.isPending} value={number(importanceCount("critical"))} hint="Needs attention" />
          <StatCard label="High importance" icon={AlertTriangle} loading={overview.isPending} value={number(importanceCount("high"))} />
          <StatCard label="Amount on events" loading={overview.isPending} value={<Money value={o?.totals?.amount} whole />} hint="Sum of event amounts (not revenue)" />
        </div>
      )}

      <div className="grid grid-cols-[minmax(0,1fr)] gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader title="Events per day" description={s.event ? eventLabel(s.event) : s.category ? `Category: ${prettyStatus(s.category)}` : "All events"} />
          {byDate.isPending ? (
            <ChartSkeleton />
          ) : byDate.error ? (
            <PanelError error={byDate.error} onRetry={byDate.refetch} />
          ) : (
            <CardBody>
              <AreaChart data={series} x="day" title="Events per day" series={[{ key: "count", label: "Events" }]} format={(v) => compactNumber(v)} formatX={shortDay} />
            </CardBody>
          )}
        </Card>
        <Card>
          <CardHeader title="By category" description="Select one to filter" />
          {overview.isPending ? (
            <SkeletonText lines={5} className="p-4" />
          ) : overview.error ? (
            <PanelError error={overview.error} onRetry={overview.refetch} />
          ) : (
            <CardBody>
              <RankList
                rows={Object.entries(o?.byCategory || {})
                  .map(([key, count]) => ({ key, label: prettyStatus(key), count }))
                  .sort((a, b) => b.count - a.count)}
                active={s.category}
                onPick={(key) => s.set({ category: s.category === key ? "" : key })}
                empty="No events in this range."
              />
            </CardBody>
          )}
        </Card>
      </div>

      <div className={cn("grid gap-4", showTenants && "lg:grid-cols-2")}>
        <Card>
          <CardHeader title="Top events" description="Select one to filter" />
          {byEvent.isPending ? (
            <SkeletonText lines={6} className="p-4" />
          ) : byEvent.error ? (
            <PanelError error={byEvent.error} onRetry={byEvent.refetch} />
          ) : (
            <EventTable rows={byEvent.data?.events || []} active={s.event} catalogMeta={catalogMeta} onPick={(ev) => s.set({ event: s.event === ev ? "" : ev })} />
          )}
        </Card>
        {showTenants ? (
          <Card>
            <CardHeader title="By tenant" description="Top 25 stores by event volume" />
            {byTenant.isPending ? (
              <SkeletonText lines={6} className="p-4" />
            ) : byTenant.error ? (
              <PanelError error={byTenant.error} onRetry={byTenant.refetch} />
            ) : (
              <TenantTable rows={byTenant.data?.tenants || []} onPick={(id) => s.set({ tenant: id })} />
            )}
          </Card>
        ) : null}
      </div>

      <ImportantPanel s={s} scoped={scoped} tenantKey={tenantKey} query={query} isPlatform={isPlatform} />
      <FeedPanel s={s} scoped={scoped} tenantKey={tenantKey} query={query} isPlatform={isPlatform} />
    </Section>
  );
}

function RankList({ rows, active, onPick, empty }) {
  if (!rows.length) return <p className="text-ui-sm text-fg-subtle">{empty}</p>;
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <ul className="grid gap-1">
      {rows.map((r) => (
        <li key={r.key}>
          <button
            type="button"
            aria-pressed={active === r.key}
            onClick={() => onPick(r.key)}
            className={cn(
              "grid w-full gap-1 rounded-md px-2 py-1.5 text-left outline-none transition-colors hover:bg-surface-hover focus-visible:ring-2 focus-visible:ring-ring",
              active === r.key && "bg-primary-soft"
            )}
          >
            <span className="flex items-center justify-between gap-3 text-ui-sm">
              <span className="truncate text-fg">{r.label}</span>
              <span className="tabular-nums text-fg-muted">{number(r.count)}</span>
            </span>
            <span aria-hidden className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
              <span className="block h-full rounded-full bg-primary" style={{ width: `${Math.max(3, (r.count / max) * 100)}%` }} />
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

const th = "px-4 py-2 text-left text-ui-xs font-medium text-fg-muted";
const td = "px-4 py-2 text-ui-sm";

function EventTable({ rows, active, onPick, catalogMeta }) {
  if (!rows.length) return <EmptyState compact icon={ListFilter} title="No events" description="Nothing was tracked for these filters." />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <caption className="sr-only">Events by type</caption>
        <thead className="border-b border-border bg-surface-2">
          <tr>
            <th scope="col" className={th}>Event</th>
            <th scope="col" className={cn(th, "hidden sm:table-cell")}>Category</th>
            <th scope="col" className={cn(th, "text-right")}>Count</th>
            <th scope="col" className={cn(th, "hidden text-right md:table-cell")}>Amount</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => {
            const imp = catalogMeta[r.event]?.importance;
            return (
              <tr key={r.event} className={cn(active === r.event && "bg-primary-soft")}>
                <td className={td}>
                  <button type="button" aria-pressed={active === r.event} onClick={() => onPick(r.event)} className="flex items-center gap-2 rounded-sm text-left text-fg hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {eventLabel(r.event)}
                    {imp === "critical" || imp === "high" ? <Badge tone={IMPORTANCE_TONE[imp]}>{prettyStatus(imp)}</Badge> : null}
                  </button>
                </td>
                <td className={cn(td, "hidden text-fg-muted sm:table-cell")}>{r.category ? prettyStatus(r.category) : "—"}</td>
                <td className={cn(td, "text-right tabular-nums")}>{number(r.count)}</td>
                <td className={cn(td, "hidden text-right md:table-cell")}>{r.amount ? <Money value={r.amount} whole /> : <span className="text-fg-subtle">—</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function TenantTable({ rows, onPick }) {
  if (!rows.length) return <EmptyState compact title="No tenant activity" />;
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <caption className="sr-only">Events by tenant</caption>
        <thead className="border-b border-border bg-surface-2">
          <tr>
            <th scope="col" className={th}>Tenant</th>
            <th scope="col" className={cn(th, "hidden sm:table-cell")}>Status</th>
            <th scope="col" className={cn(th, "text-right")}>Events</th>
            <th scope="col" className={cn(th, "text-right")}>
              <span className="sr-only">Actions</span>
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r) => (
            <tr key={r.tenantId || "platform"}>
              <td className={td}>
                {r.tenantId ? (
                  <Link to={`/super-admin/tenants/${r.tenantId}`} className="text-fg hover:underline">
                    {r.name}
                  </Link>
                ) : (
                  <span className="text-fg-muted">Platform (no tenant)</span>
                )}
              </td>
              <td className={cn(td, "hidden sm:table-cell")}>{r.status ? <StatusPill status={r.status} /> : "—"}</td>
              <td className={cn(td, "text-right tabular-nums")}>{number(r.count)}</td>
              <td className={cn(td, "text-right")}>
                {r.tenantId ? (
                  <Button size="xs" variant="ghost" onClick={() => onPick(String(r.tenantId))} aria-label={`Filter analytics by ${r.name}`}>
                    Filter
                  </Button>
                ) : null}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function EventRow({ e, isPlatform }) {
  const tenant = e.tenantId && typeof e.tenantId === "object" ? e.tenantId : null;
  const user = e.userId && typeof e.userId === "object" ? e.userId : null;
  return (
    <li className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-4 py-2.5 sm:px-5">
      <div className="min-w-0">
        <p className="flex flex-wrap items-center gap-2 text-ui-sm font-medium text-fg">
          {eventLabel(e.event)}
          <Badge tone={IMPORTANCE_TONE[e.importance] || "neutral"}>{prettyStatus(e.importance || "normal")}</Badge>
          {e.category ? <span className="text-ui-xs font-normal text-fg-subtle">{prettyStatus(e.category)}</span> : null}
        </p>
        <p className="truncate text-ui-xs text-fg-muted">
          {user ? user.name || user.email : "System"}
          {isPlatform ? (
            <>
              {" · "}
              {tenant ? (
                <Link to={`/super-admin/tenants/${tenant._id}`} className="hover:underline">
                  {tenant.name}
                </Link>
              ) : (
                "Platform"
              )}
            </>
          ) : null}
          {e.resource ? ` · ${e.resource}` : ""}
          {e.amount ? (
            <>
              {" · "}
              <Money value={e.amount} />
            </>
          ) : null}
        </p>
      </div>
      <span className="shrink-0 text-ui-xs text-fg-subtle">
        <DateTime value={e.occurredAt} />
      </span>
    </li>
  );
}

function ImportantPanel({ s, scoped, tenantKey, query, isPlatform }) {
  const limit = 10;
  const q = useQuery({
    queryKey: keys.analytics.custom("important", { ...query, page: s.ipage, limit }, tenantKey),
    queryFn: () => scoped.analyticsImportant({ ...query, page: s.ipage, limit }),
    ...listQueryOptions,
  });
  const rows = q.data?.data || [];
  return (
    <Card>
      <CardHeader title="Important events" description="Critical and high-importance events, newest first." />
      {q.isPending ? (
        <SkeletonText lines={5} className="p-4" />
      ) : q.error ? (
        <PanelError error={q.error} onRetry={q.refetch} />
      ) : !rows.length ? (
        <EmptyState compact icon={AlertTriangle} title="Nothing important" description="No critical or high-importance events in this range." />
      ) : (
        <>
          <ul className="divide-y divide-border">
            {rows.map((e) => (
              <EventRow key={e._id} e={e} isPlatform={isPlatform} />
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <Pagination meta={q.data?.meta} onPageChange={(p) => s.set({ ipage: p > 1 ? p : "" }, { keepPages: true })} compact />
          </div>
        </>
      )}
    </Card>
  );
}

function FeedPanel({ s, scoped, tenantKey, query, isPlatform }) {
  const limit = 25;
  const feedQuery = { ...query, page: s.page, limit, ...(s.importance ? { importance: s.importance } : {}) };
  const q = useQuery({
    queryKey: keys.analytics.custom("events", feedQuery, tenantKey),
    queryFn: () => scoped.analyticsEvents(feedQuery),
    ...listQueryOptions,
  });
  const rows = q.data?.data || [];
  return (
    <Card>
      <CardHeader
        title="Event feed"
        description="Every tracked event for the filters above."
        actions={
          <FacetFilter
            title="Importance"
            value={s.importance}
            onChange={(v) => s.set({ importance: v })}
            options={IMPORTANCE.map((i) => ({ value: i, label: prettyStatus(i) }))}
          />
        }
      />
      {q.isPending ? (
        <SkeletonText lines={8} className="p-4" />
      ) : q.error ? (
        <PanelError error={q.error} onRetry={q.refetch} />
      ) : !rows.length ? (
        <EmptyState compact icon={CalendarDays} title="No events" description="Try a wider date range or clear the filters." />
      ) : (
        <>
          <ul className={cn("divide-y divide-border", q.isFetching && "opacity-70")}>
            {rows.map((e) => (
              <EventRow key={e._id} e={e} isPlatform={isPlatform} />
            ))}
          </ul>
          <div className="border-t border-border px-4 py-3 sm:px-5">
            <Pagination meta={q.data?.meta} onPageChange={(p) => s.set({ page: p > 1 ? p : "" }, { keepPages: true })} />
          </div>
        </>
      )}
    </Card>
  );
}
