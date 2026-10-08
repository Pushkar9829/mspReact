import { useQueries, useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Building2, MoreHorizontal, Plus } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { TENANT_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { formatDate, inr } from "../../shared/lib/format.js";
import {
  Avatar,
  Button,
  DataTable,
  DateRangePicker,
  DateTime,
  DropdownMenu,
  EmptyState,
  FilterBar,
  IconButton,
  MenuItem,
  MenuSeparator,
  Money,
  PageHeader,
  StatCard,
  StatusPill,
  Tabs,
} from "../../shared/ui/index.js";
import { tenantStatusActions, useTenantLifecycle } from "./lib/tenantStatus.jsx";

const B = "/super-admin/tenants";
const HEALTH = ["active", "trial", "pending", "suspended", "archived"];
const VIEWS = [
  { value: "performance", label: "Performance" },
  { value: "profile", label: "Profile" },
];
const P = api.withTenant(null);
const num = (n) => (n == null ? "—" : Number(n).toLocaleString("en-IN"));

function useStatusCounts() {
  return useQueries({
    queries: HEALTH.map((status) => ({
      queryKey: keys.tenants.custom("count", status),
      queryFn: () => P.listTenants({ status, limit: 1 }),
      select: (res) => res?.meta?.total ?? 0,
      staleTime: 60_000,
    })),
  });
}

function StoreCell({ t }) {
  return (
    <span className="flex min-w-0 items-center gap-2.5">
      <Avatar name={t.name} src={t.branding?.logo} size="sm" />
      <span className="min-w-0">
        <span className="block truncate">{t.name}</span>
        <span className="block truncate font-mono text-ui-xs font-normal text-fg-subtle">{t.slug}</span>
      </span>
    </span>
  );
}

export default function Tenants() {
  const can = useCan();
  const [params, setParams] = useSearchParams();
  const view = params.get("view") === "profile" ? "profile" : "performance";
  const perf = view === "performance";
  const canReports = can("reports.view");
  const table = useUrlTableState({ filters: ["status", "from", "to"], defaults: { limit: 20 }, reserved: ["view"] });
  const { from, to } = table.filters;
  // GET /reports/tenants defaults to the last 30 days; /tenants has no date filter.
  const reportQuery = from || to ? table.query : { ...table.query, days: 30 };
  const { from: _f, to: _t, ...profileQuery } = table.query;

  const report = useQuery({
    queryKey: keys.reports.custom("tenants", reportQuery),
    queryFn: () => P.reportsTenants(reportQuery),
    enabled: perf && canReports,
    ...listQueryOptions,
  });
  const profile = useQuery({
    queryKey: keys.tenants.list(profileQuery),
    queryFn: () => P.listTenants(profileQuery),
    enabled: !perf || !canReports,
    ...listQueryOptions,
  });
  const q = perf && canReports ? report : profile;
  const rows = perf && canReports ? (report.data?.data || []).map((r) => ({ ...r, _id: r.tenantId })) : profile.data?.data;
  const counts = useStatusCounts();
  const lifecycle = useTenantLifecycle();
  const canEdit = can("tenants.edit");

  function switchView(next) {
    setParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next === "performance") p.delete("view");
      else p.set("view", next);
      // sort keys differ between the two endpoints
      ["sort", "order", "page"].forEach((k) => p.delete(k));
      return p;
    });
  }

  const totals = report.data?.totals;
  const rangeLabel = report.data?.range
    ? `${formatDate(report.data.range.from)} – ${formatDate(report.data.range.to)}`
    : from || to
      ? "Selected range"
      : "Last 30 days";

  const actionsCol = {
    id: "actions",
    header: <span className="sr-only">Actions</span>,
    hideable: false,
    csv: false,
    align: "right",
    width: 48,
    mobile: "hidden",
    cell: (t) => (
      <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${t.name}`} size="sm" />}>
        <MenuItem to={`${B}/${t._id}`}>Open</MenuItem>
        <MenuItem to={`/super-admin/orders?tenant=${t._id}`}>View orders</MenuItem>
        <MenuItem to={`/super-admin/users?tenant=${t._id}&staff=true`}>View staff</MenuItem>
        {canEdit ? <MenuSeparator /> : null}
        {canEdit
          ? tenantStatusActions(t).map((a) => (
              <MenuItem key={a.id} tone={a.tone} onSelect={() => lifecycle.open(t, a)}>
                {a.label}
              </MenuItem>
            ))
          : null}
      </DropdownMenu>
    ),
  };

  const storeCol = { id: "name", header: "Store", primary: true, accessorKey: "name", sortKey: "name", cell: (t) => <StoreCell t={t} />, csv: (t) => t.name };
  const statusCol = { id: "status", header: "Status", cell: (t) => <StatusPill status={t.status} />, csv: (t) => t.status, mobile: "meta" };
  const staffCol = {
    id: "staff",
    header: "Staff",
    align: "right",
    sortKey: perf && canReports ? "staffCount" : undefined,
    accessorFn: (t) => t.staffCount ?? null,
    cell: (t) => <span className="tabular-nums">{num(t.staffCount)}</span>,
    mobile: "meta",
  };
  const createdCol = { id: "created", header: "Created", sortKey: "createdAt", cell: (t) => <DateTime value={t.createdAt} format="date" />, csv: (t) => t.createdAt, mobile: "hidden" };

  const columns = perf && canReports
    ? [
        storeCol,
        statusCol,
        staffCol,
        { id: "orders", header: "Orders", align: "right", sortKey: "ordersCount", accessorFn: (t) => t.ordersCount, cell: (t) => <span className="tabular-nums">{num(t.ordersCount)}</span>, mobile: "meta" },
        { id: "allOrders", header: "All orders", align: "right", accessorFn: (t) => t.totalOrders, cell: (t) => <span className="tabular-nums text-fg-muted">{num(t.totalOrders)}</span>, defaultHidden: true },
        { id: "gmv", header: "GMV", align: "right", sortKey: "gmv", cell: (t) => <Money value={t.gmv} whole />, csv: (t) => t.gmv, mobile: "subtitle" },
        { id: "aov", header: "AOV", align: "right", sortKey: "aov", cell: (t) => <Money value={t.ordersCount ? t.aov : null} />, csv: (t) => t.aov },
        { id: "net", header: "Net sales", align: "right", cell: (t) => <Money value={t.netSales} whole />, csv: (t) => t.netSales, defaultHidden: true },
        createdCol,
        actionsCol,
      ]
    : [
        storeCol,
        statusCol,
        { id: "legal", header: "Legal name", accessorFn: (t) => t.businessProfile?.legalName || null, mobile: "subtitle" },
        { id: "gstin", header: "GSTIN", cell: (t) => (t.businessProfile?.gstin ? <span className="font-mono text-ui-xs">{t.businessProfile.gstin}</span> : <span className="text-fg-subtle">—</span>), csv: (t) => t.businessProfile?.gstin, defaultHidden: true },
        { id: "email", header: "Contact", accessorFn: (t) => t.businessProfile?.email || null, mobile: "hidden" },
        { id: "city", header: "City", accessorFn: (t) => t.pickupAddress?.city || null, defaultHidden: true },
        staffCol,
        { id: "zones", header: "Zones", align: "right", accessorFn: (t) => (t.deliveryZones || []).length, mobile: "hidden" },
        createdCol,
        actionsCol,
      ];

  return (
    <>
      <PageHeader
        title="Tenants"
        description="Every store on the marketplace: performance, onboarding, status and profile."
        breadcrumbs={[{ label: "Console", to: "/super-admin" }, { label: "Tenants" }]}
        primaryAction={can("tenants.create") ? <Button variant="primary" leftIcon={Plus} to={`${B}/new`}>New tenant</Button> : null}
      />

      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {HEALTH.map((status, i) => (
          <StatCard
            key={status}
            label={<span className="capitalize">{status}</span>}
            value={counts[i].data?.toLocaleString("en-IN")}
            loading={counts[i].isPending}
            to={`${B}?status=${status}${perf ? "" : "&view=profile"}`}
          />
        ))}
      </div>

      {canReports ? (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <Tabs variant="pill" value={view} onValueChange={switchView} tabs={VIEWS} aria-label="Tenant list view" />
          {perf ? (
            <p className="text-ui-sm text-fg-muted">
              {rangeLabel}
              {totals ? (
                <>
                  {" · "}
                  <span className="font-medium text-fg">{num(totals.ordersCount)}</span> orders ·{" "}
                  <span className="font-medium text-fg">{inr(totals.gmv, { whole: true })}</span> GMV ·{" "}
                  <span className="font-medium text-fg">{num(totals.staffCount)}</span> staff
                </>
              ) : null}
            </p>
          ) : null}
        </div>
      ) : null}

      <DataTable
        key={view}
        storageKey={perf && canReports ? "sa-tenants-perf" : "sa-tenants"}
        exportFilename={perf && canReports ? "tenant-performance" : "tenants"}
        table={table}
        data={rows}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(t) => `${B}/${t._id}`}
        getRowId={(t) => String(t._id)}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder={perf && canReports ? "Search name or slug" : "Search name, slug, GSTIN, email"}
            facets={[{ key: "status", title: "Status", options: statusOptions(TENANT_STATUSES), multiple: true }]}
          >
            {perf && canReports ? (
              <DateRangePicker from={from} to={to} placeholder="Last 30 days" onChange={(r) => table.setFilters({ from: r.from, to: r.to })} />
            ) : null}
          </FilterBar>
        }
        columns={columns}
        emptyState={
          table.activeCount ? undefined : (
            <EmptyState
              icon={Building2}
              title="No tenants yet"
              description="Onboard the first store to start selling on the marketplace."
              action={can("tenants.create") ? <Button variant="primary" leftIcon={Plus} to={`${B}/new`}>New tenant</Button> : null}
            />
          )
        }
      />
      {perf && canReports ? (
        <p className="mt-2 text-ui-xs text-fg-subtle">
          Orders, GMV and AOV count revenue orders placed {from || to ? "in the selected range" : "in the last 30 days"} (IST). Staff counts every live
          account of the store.
        </p>
      ) : null}
      {lifecycle.dialog}
    </>
  );
}
