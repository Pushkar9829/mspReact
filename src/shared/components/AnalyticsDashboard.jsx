import { useMemo, useState } from "react";
import { api } from "../api.js";
import { prettyStatus, rowsOf } from "../auth.js";
import { useApi } from "../hooks/useApi.js";
import { formatDate, formatDateTime, inr } from "../lib/format.js";
import { PanelState, PanelStat, PanelTable } from "./PanelTable.jsx";

const PRESETS = [
  { id: "today", label: "Today", days: 0 },
  { id: "7", label: "7 days", days: 6 },
  { id: "30", label: "30 days", days: 29 },
  { id: "90", label: "90 days", days: 89 },
];

const IMPORTANCE = ["critical", "high", "normal", "low"];

const IMPORTANCE_CLASS = {
  critical: "bg-red-50 text-msr-danger",
  high: "bg-amber-50 text-[#b45309]",
  normal: "bg-indigo-50 text-msr-navy",
  low: "bg-slate-100 text-msr-muted",
};

function isoDay(value) {
  const d = value instanceof Date ? value : new Date(value);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function today() {
  return isoDay(new Date());
}

function daysAgo(n) {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - n);
  return isoDay(d);
}

function compact(value) {
  return new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(value || 0);
}

function fieldClass() {
  return "rounded-xl border border-msr-border bg-white px-3 py-2 text-sm outline-none focus:border-msr-navy";
}

function DateChart({ series, metric }) {
  const points = series || [];
  const values = points.map((p) => Number(p[metric]) || 0);
  const max = Math.max(...values, 1);
  const w = 720;
  const h = 200;
  const padX = 12;
  const padY = 18;
  const innerW = w - padX * 2;
  const innerH = h - padY * 2;

  if (!points.length) {
    return <p className="py-16 text-center text-sm text-msr-muted">No daily data for this range.</p>;
  }

  const coords = points.map((p, i) => {
    const x = padX + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = padY + innerH - (values[i] / max) * innerH;
    return { x, y, day: p.day, value: values[i] };
  });
  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");
  const area = `${padX},${padY + innerH} ${line} ${padX + innerW},${padY + innerH}`;
  const ticks = [coords[0], coords[Math.floor(coords.length / 2)], coords[coords.length - 1]].filter(Boolean);

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="h-52 w-full" role="img" aria-label="Events by day">
      <line x1={padX} y1={padY + innerH} x2={padX + innerW} y2={padY + innerH} stroke="#e5e7f0" />
      <polygon points={area} fill="#080a3d" opacity="0.08" />
      <polyline points={line} fill="none" stroke="#080a3d" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {coords.map((c) => (
        <circle key={c.day} cx={c.x} cy={c.y} r="3.2" fill="#f5c542" stroke="#080a3d" strokeWidth="1.2">
          <title>
            {c.day}: {metric === "amount" ? inr(c.value) : c.value}
          </title>
        </circle>
      ))}
      {ticks.map((c) => (
        <text key={`t-${c.day}`} x={c.x} y={h - 2} textAnchor="middle" fontSize="10" fill="#6b6d80">
          {c.day.slice(5)}
        </text>
      ))}
    </svg>
  );
}

function BarList({ rows, valueKey = "count", labelKey = "label", onPick, active }) {
  const max = Math.max(...rows.map((r) => Number(r[valueKey]) || 0), 1);
  if (!rows.length) return <p className="text-sm text-msr-muted">Nothing in this range.</p>;
  return (
    <div className="grid gap-2">
      {rows.map((row) => {
        const value = Number(row[valueKey]) || 0;
        const key = row.id || row[labelKey];
        const selected = active && active === key;
        return (
          <button
            key={key}
            type="button"
            onClick={() => onPick?.(key)}
            className={`rounded-xl px-3 py-2 text-left transition ${selected ? "bg-msr-navy/5 ring-1 ring-msr-navy/20" : "hover:bg-msr-bg"}`}
          >
            <div className="flex items-center justify-between gap-3 text-sm">
              <span className="truncate font-semibold">{row[labelKey]}</span>
              <span className="shrink-0 text-msr-muted">{compact(value)}</span>
            </div>
            <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-msr-bg">
              <div className="h-full rounded-full bg-msr-navy" style={{ width: `${Math.max(4, (value / max) * 100)}%` }} />
            </div>
          </button>
        );
      })}
    </div>
  );
}

export default function AnalyticsDashboard({ title, subtitle, showTenants = false }) {
  const [preset, setPreset] = useState("7");
  const [from, setFrom] = useState(daysAgo(6));
  const [to, setTo] = useState(today());
  const [category, setCategory] = useState("");
  const [event, setEvent] = useState("");
  const [importance, setImportance] = useState("");
  const [tenantId, setTenantId] = useState("");
  const [page, setPage] = useState(1);
  const [metric, setMetric] = useState("count");

  const query = {
    from,
    to,
    ...(category ? { category } : {}),
    ...(event ? { event } : {}),
    ...(importance ? { importance } : {}),
    ...(showTenants && tenantId ? { tenantId } : {}),
  };

  const catalog = useApi(() => api.analyticsCatalog(), []);
  const tenants = useApi(() => (showTenants ? api.listTenants({ limit: 100 }) : Promise.resolve({ data: [] })), [showTenants]);
  const bundle = useApi(
    () =>
      Promise.all([
        api.analyticsOverview(query),
        api.analyticsByDate(query),
        api.analyticsByEvent(query),
        api.analyticsImportant({ ...query, limit: 12 }),
        showTenants ? api.analyticsByTenant(query) : Promise.resolve({ tenants: [] }),
      ]).then(([overview, byDate, byEvent, important, byTenant]) => ({
        overview,
        byDate,
        byEvent,
        important,
        byTenant,
      })),
    [from, to, category, event, importance, tenantId, showTenants]
  );
  const feed = useApi(() => api.analyticsEvents({ ...query, page, limit: 20 }), [
    from,
    to,
    category,
    event,
    importance,
    tenantId,
    page,
    showTenants,
  ]);

  const catalogEvents = catalog.data?.events || [];
  const eventOptions = category ? catalogEvents.filter((item) => item.category === category) : catalogEvents;
  const tenantRows = rowsOf(tenants.data);
  const overview = bundle.data?.overview;
  const series = bundle.data?.byDate?.series || [];
  const eventRows = (bundle.data?.byEvent?.events || []).slice(0, 10).map((row) => ({
    id: row.event,
    label: prettyStatus(row.event),
    count: row.count,
    amount: row.amount,
  }));
  const categoryRows = Object.entries(overview?.byCategory || {})
    .sort((a, b) => b[1] - a[1])
    .map(([label, count]) => ({ id: label, label: prettyStatus(label), count }));
  const tenantBreakdown = bundle.data?.byTenant?.tenants || [];
  const importantRows = rowsOf(bundle.data?.important);
  const feedRows = rowsOf(feed.data);
  const feedMeta = feed.data?.meta || { page: 1, pages: 0, total: 0 };
  const peak = series.reduce((best, day) => (day.count > (best?.count || 0) ? day : best), null);
  const priorityCount = (overview?.byImportance?.critical || 0) + (overview?.byImportance?.high || 0);

  const importanceRows = useMemo(
    () =>
      IMPORTANCE.map((level) => ({
        id: level,
        label: prettyStatus(level),
        count: overview?.byImportance?.[level] || 0,
      })),
    [overview]
  );

  function applyPreset(id) {
    const next = PRESETS.find((item) => item.id === id);
    if (!next) return;
    setPreset(id);
    setFrom(daysAgo(next.days));
    setTo(today());
    setPage(1);
  }

  function resetFilters() {
    setPreset("7");
    setFrom(daysAgo(6));
    setTo(today());
    setCategory("");
    setEvent("");
    setImportance("");
    setTenantId("");
    setPage(1);
  }

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold">{title}</h1>
          {subtitle ? <p className="mt-1 text-sm text-msr-muted">{subtitle}</p> : null}
        </div>
        <button type="button" onClick={resetFilters} className="text-sm font-semibold text-msr-purple">
          Reset filters
        </button>
      </div>

      <div className="mt-5 rounded-2xl bg-white p-4 shadow-sm md:p-5">
        <div className="flex flex-wrap gap-2">
          {PRESETS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => applyPreset(item.id)}
              className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
                preset === item.id ? "bg-msr-navy text-white" : "bg-msr-bg text-msr-muted hover:text-msr-navy"
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setPreset("custom")}
            className={`rounded-full px-3 py-1.5 text-sm font-semibold ${
              preset === "custom" ? "bg-msr-navy text-white" : "bg-msr-bg text-msr-muted hover:text-msr-navy"
            }`}
          >
            Custom
          </button>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <label className="grid gap-1 text-xs font-semibold text-msr-muted">
            From
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setPreset("custom");
                setFrom(e.target.value);
                setPage(1);
              }}
              className={fieldClass()}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-msr-muted">
            To
            <input
              type="date"
              value={to}
              min={from}
              max={today()}
              onChange={(e) => {
                setPreset("custom");
                setTo(e.target.value);
                setPage(1);
              }}
              className={fieldClass()}
            />
          </label>
          <label className="grid gap-1 text-xs font-semibold text-msr-muted">
            Category
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setEvent("");
                setPage(1);
              }}
              className={fieldClass()}
            >
              <option value="">All categories</option>
              {(catalog.data?.categories || []).map((item) => (
                <option key={item} value={item}>
                  {prettyStatus(item)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-msr-muted">
            Event
            <select
              value={event}
              onChange={(e) => {
                setEvent(e.target.value);
                setPage(1);
              }}
              className={fieldClass()}
            >
              <option value="">All events</option>
              {eventOptions.map((item) => (
                <option key={item.event} value={item.event}>
                  {prettyStatus(item.event)}
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1 text-xs font-semibold text-msr-muted">
            Importance
            <select
              value={importance}
              onChange={(e) => {
                setImportance(e.target.value);
                setPage(1);
              }}
              className={fieldClass()}
            >
              <option value="">All levels</option>
              {IMPORTANCE.map((item) => (
                <option key={item} value={item}>
                  {prettyStatus(item)}
                </option>
              ))}
            </select>
          </label>
          {showTenants ? (
            <label className="grid gap-1 text-xs font-semibold text-msr-muted">
              Tenant
              <select
                value={tenantId}
                onChange={(e) => {
                  setTenantId(e.target.value);
                  setPage(1);
                }}
                className={fieldClass()}
              >
                <option value="">All tenants</option>
                {tenantRows.map((row) => (
                  <option key={row._id} value={row._id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}
        </div>
      </div>

      <PanelState loading={bundle.loading} error={bundle.error}>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <PanelStat label="Events" value={compact(overview?.totals?.events)} hint={`${overview?.totals?.days || 0} days in range`} />
          <PanelStat label="Amount" value={inr(overview?.totals?.amount)} hint="Recorded event value" />
          <PanelStat
            label="Priority events"
            value={compact(priorityCount)}
            hint={`${overview?.byImportance?.critical || 0} critical · ${overview?.byImportance?.high || 0} high`}
          />
          <PanelStat
            label="Peak day"
            value={peak?.count ? compact(peak.count) : "—"}
            hint={peak?.day ? formatDate(peak.day) : "No activity"}
          />
        </div>

        <div className="mt-5 rounded-2xl bg-white p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h2 className="font-bold">Activity by day</h2>
            <div className="flex gap-1 rounded-full bg-msr-bg p-1">
              {[
                { id: "count", label: "Count" },
                { id: "amount", label: "Amount" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setMetric(item.id)}
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    metric === item.id ? "bg-white text-msr-navy shadow-sm" : "text-msr-muted"
                  }`}
                >
                  {item.label}
                </button>
              ))}
            </div>
          </div>
          <DateChart series={series} metric={metric} />
        </div>

        <div className={`mt-5 grid gap-4 ${showTenants ? "xl:grid-cols-3" : "md:grid-cols-2"}`}>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">By event</h2>
            <p className="mt-1 text-xs text-msr-muted">Click a row to filter the feed.</p>
            <div className="mt-3">
              <BarList
                rows={eventRows}
                active={event}
                onPick={(id) => {
                  setEvent(event === id ? "" : id);
                  setPage(1);
                }}
              />
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">By category</h2>
            <div className="mt-3">
              <BarList
                rows={categoryRows}
                active={category}
                onPick={(id) => {
                  setCategory(category === id ? "" : id);
                  setEvent("");
                  setPage(1);
                }}
              />
            </div>
          </div>
          {showTenants ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm">
              <h2 className="font-bold">By tenant</h2>
              <div className="mt-3">
                <BarList
                  rows={tenantBreakdown.map((row) => ({
                    id: row.tenantId ? String(row.tenantId) : "platform",
                    label: row.name,
                    count: row.count,
                  }))}
                  active={tenantId}
                  onPick={(id) => {
                    const next = id === "platform" ? "" : id;
                    setTenantId(tenantId === next ? "" : next);
                    setPage(1);
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <h2 className="font-bold">Importance</h2>
            <div className="mt-3 grid gap-2">
              {importanceRows.map((row) => (
                <button
                  key={row.id}
                  type="button"
                  onClick={() => {
                    setImportance(importance === row.id ? "" : row.id);
                    setPage(1);
                  }}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-sm ${
                    importance === row.id ? "ring-1 ring-msr-navy/20" : ""
                  } ${IMPORTANCE_CLASS[row.id]}`}
                >
                  <span className="font-semibold">{row.label}</span>
                  <span>{row.count}</span>
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-sm lg:col-span-2">
            <h2 className="font-bold">{importance ? `${prettyStatus(importance)} events` : "Priority events"}</h2>
            <p className="mt-1 text-xs text-msr-muted">
              {importance ? "Matching the selected importance." : "Critical and high events in this range."}
            </p>
            <div className="mt-3 grid gap-2">
              {importantRows.map((row) => (
                <div key={row._id} className="flex items-start justify-between gap-3 rounded-xl bg-msr-bg px-3 py-2">
                  <div>
                    <p className="text-sm font-semibold">{prettyStatus(row.event)}</p>
                    <p className="text-xs text-msr-muted">
                      {row.tenantId?.name || "Platform"}
                      {row.userId?.email ? ` · ${row.userId.email}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${IMPORTANCE_CLASS[row.importance] || ""}`}>
                      {row.importance}
                    </span>
                    <p className="mt-1 text-[11px] text-msr-muted">{formatDateTime(row.occurredAt)}</p>
                  </div>
                </div>
              ))}
              {!importantRows.length ? <p className="text-sm text-msr-muted">No priority events in this range.</p> : null}
            </div>
          </div>
        </div>

        {showTenants && tenantBreakdown.length ? (
          <div className="mt-5">
            <h2 className="font-bold">Tenant volume</h2>
            <PanelTable
              rows={tenantBreakdown}
              rowKey={(row) => (row.tenantId ? String(row.tenantId) : "platform")}
              columns={[
                { key: "name", label: "Tenant", render: (row) => <span className="font-semibold">{row.name}</span> },
                { key: "slug", label: "Slug", render: (row) => <span className="font-mono text-xs">{row.slug || "—"}</span> },
                { key: "count", label: "Events", render: (row) => compact(row.count) },
                { key: "amount", label: "Amount", render: (row) => inr(row.amount) },
              ]}
            />
          </div>
        ) : null}

        <div className="mt-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <h2 className="font-bold">Event feed</h2>
              <p className="text-xs text-msr-muted">{feedMeta.total || 0} events matching filters</p>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-xl border border-msr-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
              >
                Prev
              </button>
              <button
                type="button"
                disabled={page >= (feedMeta.pages || 1)}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-xl border border-msr-border px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
          <PanelState loading={feed.loading} error={feed.error} empty={!feedRows.length} emptyText="No events in this range.">
            <PanelTable
              rows={feedRows}
              rowKey={(row) => row._id}
              columns={[
                { key: "occurredAt", label: "When", render: (row) => formatDateTime(row.occurredAt) },
                { key: "event", label: "Event", render: (row) => prettyStatus(row.event) },
                { key: "category", label: "Category", render: (row) => prettyStatus(row.category) },
                {
                  key: "importance",
                  label: "Level",
                  render: (row) => (
                    <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${IMPORTANCE_CLASS[row.importance] || ""}`}>
                      {row.importance}
                    </span>
                  ),
                },
                ...(showTenants
                  ? [{ key: "tenant", label: "Tenant", render: (row) => row.tenantId?.name || "Platform" }]
                  : []),
                { key: "user", label: "User", render: (row) => row.userId?.email || row.userId?.name || "—" },
                { key: "amount", label: "Amount", render: (row) => (row.amount ? inr(row.amount) : "—") },
              ]}
            />
          </PanelState>
        </div>
      </PanelState>
    </div>
  );
}
