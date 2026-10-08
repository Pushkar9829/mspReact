import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { BarChart3, ChevronDown, Download, PieChart, TrendingUp, Users } from "lucide-react";
import { api, describeExport } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { formatDate, istDaysAgo, istToday, parseIstDate } from "../../shared/lib/format.js";
import {
  Alert,
  AreaChart,
  BarChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DateRangePicker,
  DateTime,
  DonutChart,
  DropdownMenu,
  EmptyState,
  Input,
  MenuItem,
  MenuLabel,
  MenuSeparator,
  Money,
  PageHeader,
  Select,
  SkeletonText,
  StatCard,
  statusLabel,
  toast,
} from "../../shared/ui/index.js";
import { ChartSkeleton, PanelState, ScopeTag, Segmented, changeProps, countAxis, dayLong, dayShort, moneyAxis, pctProps } from "./insights/shared.jsx";

const PRESETS = [
  { value: "7", label: "Last 7 days" },
  { value: "30", label: "Last 30 days" },
  { value: "90", label: "Last 90 days" },
  { value: "180", label: "Last 180 days" },
  { value: "365", label: "Last 365 days" },
  { value: "custom", label: "Custom range…" },
];
const DEFAULT_DAYS = "30";
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const MAX_DAYS = 731;

/**
 * The report range lives in the URL: ?days=7|30|90|180|365 (preset) or ?from=YYYY-MM-DD&to=YYYY-MM-DD (IST days).
 * `query` is what the API gets ({ days } or { from, to }); every widget on the page uses the same range.
 */
function useReportRange() {
  const [params, setParams] = useSearchParams();
  const from = params.get("from") || "";
  const to = params.get("to") || "";
  const custom = DAY_RE.test(from) && DAY_RE.test(to);
  const raw = params.get("days");
  const days = PRESETS.some((p) => p.value === raw && p.value !== "custom") ? Number(raw) : Number(DEFAULT_DAYS);
  const spanDays = custom ? Math.round((parseIstDate(to) - parseIstDate(from)) / 86_400_000) + 1 : days;
  const invalid = custom && (spanDays < 1 || spanDays > MAX_DAYS) ? (spanDays < 1 ? "The start date is after the end date." : `Pick at most ${MAX_DAYS} days.`) : null;
  const query = custom ? { from, to } : { days };
  const label = custom ? `${formatDate(parseIstDate(from))} – ${formatDate(parseIstDate(to))}` : PRESETS.find((p) => Number(p.value) === days)?.label || `Last ${days} days`;
  const set = (next) =>
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      ["days", "from", "to"].forEach((k) => p.delete(k));
      if (next.from && next.to) {
        p.set("from", next.from);
        p.set("to", next.to);
      } else if (next.days && String(next.days) !== DEFAULT_DAYS) p.set("days", String(next.days));
      return p;
    });
  return { custom, from, to, days: spanDays, query, label, invalid, set };
}

export default function Reports() {
  const can = useCan();
  const range = useReportRange();
  const [picking, setPicking] = useState(range.custom);
  const enabled = !range.invalid;

  const overview = useQuery({ queryKey: keys.reports.custom("overview", range.query), queryFn: () => api.reportsOverviewRange(range.query), enabled, placeholderData: (prev) => prev });
  const sales = useQuery({ queryKey: keys.reports.custom("sales", range.query), queryFn: () => api.reportsSalesRange(range.query), enabled, placeholderData: (prev) => prev });

  return (
    <>
      <PageHeader
        title="Reports"
        description="Sales performance for your store. Days are IST (Asia/Kolkata) calendar days. Net sales exclude fees, cancelled/refunded orders and unpaid online orders."
        actions={
          <>
            <Select
              size="sm"
              aria-label="Date range"
              value={range.custom || picking ? "custom" : String(range.days)}
              onValueChange={(v) => {
                if (v === "custom") {
                  setPicking(true);
                  if (!range.custom) range.set({ from: istDaysAgo(range.days - 1), to: istToday() });
                } else {
                  setPicking(false);
                  range.set({ days: v });
                }
              }}
              options={PRESETS}
              className="w-44"
            />
            {range.custom || picking ? (
              <DateRangePicker from={range.from} to={range.to} align="end" onChange={(r) => (r.from && r.to ? range.set(r) : null)} placeholder="Pick dates" />
            ) : null}
            {can("reports.export") ? <ExportMenu range={range} /> : null}
          </>
        }
      />

      <div className="grid grid-cols-[minmax(0,1fr)] gap-6">
        {range.invalid ? (
          <Alert tone="danger" title="Invalid date range">
            {range.invalid}
          </Alert>
        ) : (
          <>
            <PeriodTiles overview={overview} range={range} />
            <SalesCharts sales={sales} days={range.days} rangeLabel={range.label} />
            <DailyTable sales={sales} rangeLabel={range.label} />
            <TopCustomers range={range} />
            <div className="grid gap-6 lg:grid-cols-2">
              <TopSkus overview={overview} rangeLabel={range.label} />
              <StatusMix overview={overview} rangeLabel={range.label} />
            </div>
          </>
        )}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ export */

function ExportMenu({ range }) {
  const [busy, setBusy] = useState(null);
  async function run(kind, query, label) {
    setBusy(kind);
    try {
      const res = await api.exportReport(kind, query);
      const info = describeExport(res, `${label} export`);
      (info.truncated ? toast.warning : toast.success)(info.title, { description: info.description, duration: info.truncated ? 10_000 : undefined });
    } catch (err) {
      toast.error(err?.message || "Export failed", { description: err?.requestId ? `Reference: ${err.requestId}` : undefined });
    } finally {
      setBusy(null);
    }
  }
  const dated = range.custom ? { from: range.from, to: range.to } : { from: istDaysAgo(range.days - 1), to: istToday() };
  const items = [
    { kind: "sales", label: "Daily sales", note: `${range.label} (IST), one row per day`, query: range.query },
    { kind: "orders", label: "Orders", note: `Placed ${range.label.toLowerCase().startsWith("last") ? "in the " + range.label.toLowerCase() : range.label} · max 1,000 rows, newest first`, query: dated },
    { kind: "skus", label: "Top products", note: `${range.label} · top 10 by revenue`, query: range.query },
    { kind: "customers", label: "Customers", note: `Orders in ${range.label.toLowerCase().startsWith("last") ? "the " + range.label.toLowerCase() : range.label} · max 1,000 rows`, query: range.query },
    { kind: "inventory", label: "Inventory", note: "Current stock · max 1,000 rows", query: {} },
  ];
  return (
    <DropdownMenu
      align="end"
      className="w-72"
      trigger={
        <Button size="sm" leftIcon={Download} rightIcon={ChevronDown} loading={!!busy}>
          Export CSV
        </Button>
      }
    >
      <MenuLabel>Download as CSV</MenuLabel>
      <MenuSeparator />
      {items.map((it) => (
        <MenuItem key={it.kind} disabled={!!busy} onSelect={() => run(it.kind, it.query, it.label)}>
          <span className="grid">
            <span className="text-fg">{it.label}</span>
            <span className="whitespace-normal text-ui-xs text-fg-subtle">{it.note}</span>
          </span>
        </MenuItem>
      ))}
    </DropdownMenu>
  );
}

/* ------------------------------------------------------------------ KPIs */

function PeriodTiles({ overview, range }) {
  const o = overview.data;
  const p = o?.period;
  const prev = o?.previous;
  const ch = o?.changes || {};
  const loading = overview.isPending;
  const label = `vs previous ${p?.days || range.days} days`;
  if (overview.error) {
    return (
      <Card>
        <PanelState query={overview} />
      </Card>
    );
  }
  return (
    <section aria-label={`Totals, ${range.label}`} className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-5">
      <StatCard label="Net sales" loading={loading} value={<Money value={p?.netSales} whole />} {...pctProps(p?.netSales, prev?.netSales, label)} />
      <StatCard label="Orders" loading={loading} value={p?.orders != null ? Number(p.orders).toLocaleString("en-IN") : null} {...changeProps(ch.orders, label)} to="/tenant/orders" />
      <StatCard label="GMV" loading={loading} value={<Money value={p?.gmv} whole />} {...changeProps(ch.gmv, label)} />
      <StatCard label="Avg. order value" loading={loading} value={<Money value={p?.aov} whole />} {...changeProps(ch.aov, label)} />
      <StatCard
        label="Fees"
        loading={loading}
        value={<Money value={p?.fees?.total} whole />}
        {...pctProps(p?.fees?.total, prev?.fees?.total, label)}
        hint={
          p?.fees ? (
            <>
              Delivery <Money value={p.fees.delivery} whole /> · Platform <Money value={p.fees.platform} whole /> · Partner <Money value={p.fees.partner} whole />
            </>
          ) : null
        }
      />
    </section>
  );
}

/* ------------------------------------------------------------------ charts */

const METRIC_LABEL = { netSales: "Net sales", gmv: "GMV", aov: "Average order value" };

function SalesCharts({ sales, days, rangeLabel }) {
  const [moneyMetric, setMoneyMetric] = useState("netSales");
  const rows = Array.isArray(sales.data) ? sales.data : [];
  const empty = rows.length > 0 && rows.every((r) => !Number(r.orders) && !Number(r.gmv));
  const dense = days > 90;
  const emptyState = <EmptyState compact icon={TrendingUp} title="No sales in this range" description="Try a longer range, or check back once orders come in." />;
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <Card className="xl:col-span-3">
        <CardHeader
          title={`${METRIC_LABEL[moneyMetric]} per day`}
          description={`${rangeLabel} · IST`}
          actions={
            <Segmented
              label="Revenue metric"
              value={moneyMetric}
              onChange={setMoneyMetric}
              options={[
                { value: "netSales", label: "Net sales" },
                { value: "gmv", label: "GMV" },
                { value: "aov", label: "AOV" },
              ]}
            />
          }
        />
        <CardBody>
          <PanelState query={sales} skeleton={<ChartSkeleton className="h-64" />}>
            {empty ? (
              emptyState
            ) : (
              <AreaChart
                data={rows}
                x="_id"
                series={[{ key: moneyMetric, label: METRIC_LABEL[moneyMetric] }]}
                format={moneyAxis}
                formatX={dayShort}
                height={260}
                title={`${METRIC_LABEL[moneyMetric]} per day, ${rangeLabel}`}
              />
            )}
          </PanelState>
        </CardBody>
      </Card>
      <Card className="xl:col-span-2">
        <CardHeader title="Orders per day" description="Revenue orders only (same definition as net sales)" />
        <CardBody>
          <PanelState query={sales} skeleton={<ChartSkeleton />}>
            {empty ? (
              emptyState
            ) : dense ? (
              <AreaChart data={rows} x="_id" series={[{ key: "orders", label: "Orders", color: "var(--chart-2)" }]} format={countAxis} formatX={dayShort} title={`Orders per day, ${rangeLabel}`} />
            ) : (
              <BarChart data={rows} x="_id" series={[{ key: "orders", label: "Orders", color: "var(--chart-2)" }]} format={countAxis} formatX={dayShort} title={`Orders per day, ${rangeLabel}`} />
            )}
          </PanelState>
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Fees per day" description="Delivery + platform + partner" />
        <CardBody>
          <PanelState query={sales} skeleton={<ChartSkeleton />}>
            {empty ? (
              emptyState
            ) : dense ? (
              <AreaChart data={rows} x="_id" series={[{ key: "fees", label: "Fees", color: "var(--chart-3)" }]} format={moneyAxis} formatX={dayShort} title={`Fees per day, ${rangeLabel}`} />
            ) : (
              <BarChart data={rows} x="_id" series={[{ key: "fees", label: "Fees", color: "var(--chart-3)" }]} format={moneyAxis} formatX={dayShort} title={`Fees per day, ${rangeLabel}`} />
            )}
          </PanelState>
        </CardBody>
      </Card>
    </div>
  );
}

/* ------------------------------------------------------------------ daily table */

function DailyTable({ sales, rangeLabel }) {
  const [showEmpty, setShowEmpty] = useState(false);
  const all = Array.isArray(sales.data) ? [...sales.data].reverse() : [];
  const rows = showEmpty ? all : all.filter((r) => Number(r.orders) || Number(r.gmv));
  return (
    <Card>
      <CardHeader
        title="Daily breakdown"
        description={`${rangeLabel} · newest first · values computed by the server per IST day`}
        actions={
          <Segmented
            label="Days shown"
            value={showEmpty ? "all" : "sales"}
            onChange={(v) => setShowEmpty(v === "all")}
            options={[
              { value: "sales", label: "Days with sales" },
              { value: "all", label: "All days" },
            ]}
          />
        }
      />
      <PanelState query={sales} skeleton={<SkeletonText lines={6} className="p-4 sm:p-5" />}>
        {rows.length ? (
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full min-w-[40rem] text-ui-sm">
              <caption className="sr-only">Daily sales, {rangeLabel}</caption>
              <thead className="sticky top-0 z-10 bg-surface-2 text-ui-xs text-fg-muted">
                <tr>
                  <th scope="col" className="px-4 py-2 text-left font-medium sm:px-5">Date (IST)</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Orders</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">GMV</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">Net sales</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium">AOV</th>
                  <th scope="col" className="px-4 py-2 text-right font-medium sm:pr-5">Fees</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((r) => (
                  <tr key={r._id} className={Number(r.orders) ? "" : "text-fg-subtle"}>
                    <th scope="row" className="whitespace-nowrap px-4 py-2 text-left font-normal sm:px-5">{dayLong(r._id)}</th>
                    <td className="px-4 py-2 text-right tabular-nums">{Number(r.orders || 0).toLocaleString("en-IN")}</td>
                    <td className="px-4 py-2 text-right"><Money value={r.gmv} /></td>
                    <td className="px-4 py-2 text-right font-medium"><Money value={r.netSales} /></td>
                    <td className="px-4 py-2 text-right">{Number(r.orders) ? <Money value={r.aov} /> : "—"}</td>
                    <td className="px-4 py-2 text-right sm:pr-5"><Money value={r.fees} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            compact
            icon={BarChart3}
            title="No sales in this range"
            description="No day in this range had revenue orders."
            action={all.length ? <Button size="sm" onClick={() => setShowEmpty(true)}>Show all days</Button> : null}
          />
        )}
      </PanelState>
    </Card>
  );
}

/* ------------------------------------------------------------------ top customers */

function TopCustomers({ range }) {
  const table = useUrlTableState({ prefix: "c_", defaults: { limit: 10 } });
  const query = { ...table.query, ...range.query };
  const q = useQuery({ queryKey: keys.customers.list(query), queryFn: () => api.listCustomersReport(query), ...listQueryOptions });
  return (
    <Card>
      <CardHeader title="Top customers" description="Ranked by spend on revenue orders placed in the range" actions={<ScopeTag>{range.label}</ScopeTag>} />
      <div className="p-4 sm:p-5">
        <DataTable
          storageKey="tenant-report-customers"
          exportFilename="top-customers"
          table={table}
          data={q.data?.data}
          meta={q.data?.meta}
          loading={q.isPending}
          fetching={q.isFetching}
          error={q.error}
          onRetry={q.refetch}
          getRowId={(r) => String(r.id)}
          rowHref={(r) => `/tenant/customers/${r.id}`}
          toolbar={
            <Input
              size="sm"
              type="search"
              aria-label="Search customers"
              placeholder="Search name, email or company"
              value={table.search}
              onChange={(e) => table.setSearch(e.target.value)}
              className="w-full sm:w-72"
            />
          }
          columns={[
            { id: "name", header: "Customer", primary: true, sortKey: "name", accessorFn: (r) => r.name || r.email, mobile: "title" },
            { id: "company", header: "Company", accessorFn: (r) => r.company || "—", mobile: "subtitle" },
            { id: "email", header: "Email", accessorKey: "email", mobile: "hidden", hideable: true },
            { id: "orders", header: "Orders", align: "right", sortKey: "orders", accessorFn: (r) => Number(r.orders || 0).toLocaleString("en-IN"), csv: (r) => r.orders },
            { id: "spend", header: "Spend", align: "right", sortKey: "spend", cell: (r) => <Money value={r.spend} />, csv: (r) => r.spend, mobile: "meta" },
            { id: "aov", header: "AOV", align: "right", cell: (r) => <Money value={r.aov} />, csv: (r) => r.aov, mobile: "hidden" },
            { id: "last", header: "Last order", sortKey: "lastOrderAt", cell: (r) => <DateTime value={r.lastOrderAt} format="date" />, csv: (r) => r.lastOrderAt },
          ]}
          emptyState={
            <EmptyState
              icon={Users}
              title={table.q ? "No matching customers" : "No customers yet"}
              description={table.q ? "Try a different name, email or company." : "No buyer placed an order in this range."}
              action={table.q ? <Button size="sm" onClick={table.reset}>Clear search</Button> : <Button size="sm" to="/tenant/customers">Open customers</Button>}
            />
          }
        />
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ all-time widgets */

function TopSkus({ overview, rangeLabel }) {
  const rows = (overview.data?.topSkus || []).map((r) => ({ ...r, label: r.name || r._id }));
  return (
    <Card>
      <CardHeader title="Top products" description="By revenue (line totals), top 10" actions={<ScopeTag>{overview.data?.scope === "lifetime" ? "All time" : rangeLabel}</ScopeTag>} />
      <CardBody>
        <PanelState query={overview}>
          {rows.length ? (
            <>
              <BarChart horizontal data={rows} x="label" series={[{ key: "revenue", label: "Revenue" }]} format={moneyAxis} title={`Top products by revenue, ${rangeLabel}`} />
            </>
          ) : (
            <EmptyState compact icon={BarChart3} title="No product sales in this range" />
          )}
        </PanelState>
      </CardBody>
    </Card>
  );
}

function StatusMix({ overview, rangeLabel }) {
  const map = overview.data?.byStatus || {};
  const data = Object.entries(map)
    .filter(([, v]) => Number(v) > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([status, value]) => ({ label: statusLabel(status), value }));
  // Fold the long tail into "Other" so colours are never cycled.
  const shown = data.length > 5 ? [...data.slice(0, 4), { label: "Other", value: data.slice(4).reduce((a, d) => a + d.value, 0), color: "var(--fg-subtle)" }] : data;
  return (
    <Card>
      <CardHeader title="Orders by status" description="Every order placed in the range, including cancelled and unpaid" actions={<ScopeTag>{overview.data?.scope === "lifetime" ? "All time" : rangeLabel}</ScopeTag>} />
      <CardBody>
        <PanelState query={overview}>
          {shown.length ? (
            <DonutChart data={shown} format={countAxis} centerLabel="orders" title={`Orders by status, ${rangeLabel}`} />
          ) : (
            <EmptyState compact icon={PieChart} title="No orders in this range" />
          )}
        </PanelState>
      </CardBody>
    </Card>
  );
}
