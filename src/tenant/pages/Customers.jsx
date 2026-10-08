import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Users } from "lucide-react";
import { api, describeExport } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { inr, number } from "../../shared/lib/format.js";
import { Badge, Button, DataTable, DateTime, EmptyState, FilterBar, Money, PageHeader, StatusPill, TabPanel, Tabs, Tooltip, toast } from "../../shared/ui/index.js";
import LedgerAccounts from "../../shared/components/LedgerAccounts.jsx";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";

const VIEW = ["reports.view", "orders.view", "ledger.view"];

/** Table state shared by the list and the export button (same URL params). */
function useCustomersTable() {
  return useUrlTableState({ filters: ["from", "to"], defaults: { limit: 20 } });
}

function BuyersTable() {
  const table = useCustomersTable();
  const q = useQuery({ queryKey: keys.customers.list(table.query), queryFn: () => api.listCustomersReport(table.query), ...listQueryOptions });
  const ranged = Boolean(table.filters.from || table.filters.to);
  return (
    <DataTable
      storageKey="tenant-customers"
      exportFilename="customers-page"
      caption="Customers"
      table={table}
      data={q.data?.data}
      meta={q.data?.meta}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      getRowId={(c) => String(c.id)}
      rowHref={(c) => `/tenant/customers/${c.id}`}
      toolbar={
        <FilterBar table={table} searchPlaceholder="Name, email, phone or company" dateRange={{ from: "from", to: "to" }}>
          {ranged ? <span className="text-ui-xs text-fg-subtle">Orders and spend count only orders placed in this range.</span> : null}
        </FilterBar>
      }
      columns={[
        {
          id: "name",
          header: "Customer",
          primary: true,
          sortKey: "name",
          accessorKey: "name",
          cell: (c) => (
            <span>
              {c.name || "Unnamed buyer"}
              <span className="block text-ui-xs font-normal text-fg-subtle">{c.company || c.email}</span>
            </span>
          ),
        },
        { id: "email", header: "Email", accessorKey: "email", mobile: "subtitle" },
        { id: "phone", header: "Phone", accessorKey: "phone", defaultHidden: true },
        { id: "city", header: "Location", accessorFn: (c) => [c.city, c.state].filter(Boolean).join(", ") || "—", mobile: "hidden" },
        { id: "orders", header: "Orders", align: "right", sortKey: "orders", cell: (c) => number(c.orders), csv: (c) => c.orders, mobile: "meta" },
        { id: "spend", header: "Spend", align: "right", sortKey: "spend", cell: (c) => <Money value={c.spend} />, csv: (c) => c.spend, mobile: "meta" },
        { id: "aov", header: "AOV", align: "right", cell: (c) => <Money value={c.aov} />, csv: (c) => c.aov, defaultHidden: true },
        {
          id: "outstanding",
          header: "Outstanding",
          align: "right",
          cell: (c) =>
            c.ledger ? (
              <Tooltip content={`Available ${inr(c.ledger.available)} of ${inr(c.ledger.creditLimit)}${Number(c.ledger.advance) > 0 ? ` · advance ${inr(c.ledger.advance)}` : ""}`}>
                <span tabIndex={0}>
                  <Money value={c.ledger.outstanding} className={Number(c.ledger.outstanding) > 0 ? "font-medium text-warning-fg" : "text-fg-muted"} />
                </span>
              </Tooltip>
            ) : (
              <span className="text-fg-subtle">—</span>
            ),
          csv: (c) => c.ledger?.outstanding ?? "",
        },
        { id: "last", header: "Last order", sortKey: "lastOrderAt", cell: (c) => (c.lastOrderAt ? <DateTime value={c.lastOrderAt} format="date" /> : <span className="text-fg-subtle">No orders</span>), csv: (c) => c.lastOrderAt },
        {
          id: "status",
          header: "Status",
          cell: (c) => (
            <span className="inline-flex flex-wrap gap-1">
              <StatusPill status={c.status} />
              {c.homeStore ? <Badge tone="info">Your store</Badge> : null}
            </span>
          ),
          csv: (c) => c.status,
          defaultHidden: true,
        },
      ]}
      emptyState={
        <EmptyState
          icon={Users}
          title={table.activeCount ? "No customers match" : "No customers yet"}
          description={
            table.activeCount
              ? ranged
                ? "No buyer ordered in this range. Buyers without orders are hidden while a date range is set."
                : "Try another name, email or phone."
              : "Buyers who sign up through your store or order from it appear here, ranked by spend."
          }
          action={table.activeCount ? <Button size="sm" onClick={table.reset}>Clear filters</Button> : null}
        />
      }
    />
  );
}

export default function Customers() {
  const can = useCan();
  const table = useCustomersTable();
  const [exporting, setExporting] = useState(false);
  const tabs = [can(VIEW) ? { value: "customers", label: "Customers" } : null, can(["ledger.view", "ledger.manage"]) ? { value: "credit", label: "Credit accounts" } : null].filter(Boolean);

  async function exportCsv() {
    setExporting(true);
    try {
      const { page: _p, limit: _l, ...query } = table.query;
      const res = await api.exportReport("customers", query);
      const info = describeExport(res, "Customers export");
      (info.truncated ? toast.warning : toast.success)(info.title, { description: info.description, duration: info.truncated ? 10_000 : undefined });
    } catch (err) {
      toast.error(err?.message || "Export failed", { description: err?.requestId ? `Reference: ${err.requestId}` : undefined });
    } finally {
      setExporting(false);
    }
  }

  return (
    <>
      <PageHeader
        title="Customers"
        description="Buyers of your store, their spend, and credit / purchase-order accounts."
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Customers" }]}
        secondaryActions={
          <PermissionGate perm="reports.export" mode="hide">
            <Button size="sm" leftIcon={Download} loading={exporting} onClick={exportCsv} title="Customers matching the search, date range and sort (max 1,000 rows)">
              Export CSV
            </Button>
          </PermissionGate>
        }
      />
      {tabs.length > 1 ? (
        <Tabs urlParam="tab" tabs={tabs}>
          <TabPanel value="customers">
            <BuyersTable />
          </TabPanel>
          <TabPanel value="credit">
            <LedgerAccounts customerHref={(id) => `/tenant/customers/${id}?tab=credit`} />
          </TabPanel>
        </Tabs>
      ) : tabs[0]?.value === "credit" ? (
        <LedgerAccounts customerHref={(id) => `/tenant/customers/${id}?tab=credit`} />
      ) : (
        <BuyersTable />
      )}
    </>
  );
}
