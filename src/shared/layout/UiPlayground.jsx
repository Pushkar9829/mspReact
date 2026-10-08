// Dev-only kitchen sink (/super-admin/__ui): exercises the shared UI against the live API.
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Download, Package, Plus } from "lucide-react";
import { api } from "../api/index.js";
import { keys } from "../api/keys.js";
import { listQueryOptions } from "../api/queryClient.js";
import { useUrlTableState } from "../hooks/useUrlTableState.js";
import { ORDER_STATUSES, PAYMENT_STATUSES, statusOptions } from "../lib/panel.js";
import {
  AreaChart,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  DataTable,
  DateTime,
  DonutChart,
  EmptyState,
  Field,
  FilterBar,
  Input,
  Money,
  PageHeader,
  Section,
  StatCard,
  StatusPill,
  TabPanel,
  Tabs,
  TenantCombobox,
  Timeline,
  toast,
} from "../ui/index.js";

export default function UiPlayground() {
  const table = useUrlTableState({ filters: ["status", "paymentStatus", "from", "to"], defaults: { limit: 10 } });
  const orders = useQuery({ queryKey: keys.orders.list(table.query), queryFn: () => api.listOrders(table.query), ...listQueryOptions });
  const sales = useQuery({ queryKey: keys.reports.custom("sales", 30), queryFn: () => api.reportsSales(30) });
  const [confirm, setConfirm] = useState(false);
  const [tenant, setTenant] = useState("");
  const rows = Array.isArray(sales.data) ? sales.data : sales.data?.data || sales.data?.days || [];

  return (
    <div className="grid gap-8">
      <PageHeader
        title="UI playground"
        description="Dev-only page exercising the shared components."
        breadcrumbs={[{ label: "Company console", to: "/super-admin" }, { label: "UI playground" }]}
        secondaryActions={<Button leftIcon={Download}>Export</Button>}
        primaryAction={
          <Button variant="primary" leftIcon={Plus} onClick={() => toast.success("Toast works")}>
            Toast
          </Button>
        }
      />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Net sales" value={<Money value={123456.5} />} delta={12.4} hint="vs last 30 days" />
        <StatCard label="Refunds" value={<Money value={null} />} delta={-3.2} invertDelta hint="lower is better" />
        <StatCard label="Orders" value="42" loading={orders.isPending} />
        <StatCard label="Status" value={<StatusPill status="return_approved" />} />
      </div>
      <Section title="Orders" description="DataTable + FilterBar + useUrlTableState">
        <DataTable
          storageKey="playground-orders"
          exportFilename="orders-page"
          table={table}
          data={orders.data?.data}
          meta={orders.data?.meta}
          loading={orders.isPending}
          fetching={orders.isFetching}
          error={orders.error}
          onRetry={orders.refetch}
          selectable
          bulkActions={(sel, clear) => (
            <Button size="xs" onClick={() => { toast(`${sel.length} selected`); clear(); }}>
              Count
            </Button>
          )}
          rowHref={(o) => `/super-admin/orders/${o._id}`}
          toolbar={
            <FilterBar
              table={table}
              searchPlaceholder="Search orders"
              facets={[
                { key: "status", title: "Status", options: statusOptions(ORDER_STATUSES) },
                { key: "paymentStatus", title: "Payment", options: statusOptions(PAYMENT_STATUSES) },
              ]}
              dateRange={{ from: "from", to: "to" }}
            />
          }
          columns={[
            { id: "orderNumber", header: "Order", accessorKey: "orderNumber", sortKey: "orderNumber", primary: true },
            { id: "buyer", header: "Buyer", accessorFn: (o) => o.buyerSnapshot?.name, mobile: "subtitle" },
            { id: "status", header: "Status", cell: (o) => <StatusPill status={o.status} />, csv: (o) => o.status },
            { id: "payment", header: "Payment", cell: (o) => <StatusPill status={o.paymentStatus} domain="payment" />, csv: (o) => o.paymentStatus },
            { id: "total", header: "Total", align: "right", cell: (o) => <Money value={o.grandTotal ?? o.total} />, csv: (o) => o.grandTotal ?? o.total },
            { id: "createdAt", header: "Placed", sortKey: "createdAt", cell: (o) => <DateTime value={o.createdAt} />, csv: (o) => o.createdAt },
          ]}
          emptyState={<EmptyState icon={Package} title="No orders match" />}
        />
      </Section>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader title="Sales (30 days)" />
          <CardBody>
            <AreaChart data={rows} x="_id" series={[{ key: "netSales", label: "Net sales" }, { key: "gmv", label: "GMV" }]} title="Sales" />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Mix" />
          <CardBody>
            <DonutChart data={[{ label: "Paid", value: 12 }, { label: "Pending", value: 5 }, { label: "Refunded", value: 2 }]} centerLabel="Orders" />
          </CardBody>
        </Card>
      </div>
      <Tabs urlParam="tab" tabs={[{ value: "form", label: "Form" }, { value: "timeline", label: "Timeline", count: 3 }]}>
        <TabPanel value="form">
          <Card padded className="grid max-w-lg gap-4">
            <Field label="Name" hint="Shown to buyers" required>
              <Input placeholder="Acme" />
            </Field>
            <Field label="Email" error="Invalid email">
              <Input defaultValue="bad@" />
            </Field>
            <Field label="Tenant">
              <TenantCombobox value={tenant} onChange={setTenant} />
            </Field>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Delete something
            </Button>
          </Card>
        </TabPanel>
        <TabPanel value="timeline">
          <Timeline
            items={[
              { status: "pending", at: "2026-10-01T10:00:00Z" },
              { status: "confirmed", at: "2026-10-01T11:00:00Z", note: "Stock committed" },
              { status: "delivered", at: "2026-10-03T08:00:00Z", actor: "Delhivery" },
            ]}
          />
        </TabPanel>
      </Tabs>
      <ConfirmDialog
        open={confirm}
        onOpenChange={setConfirm}
        title="Delete the thing?"
        description="This cannot be undone."
        tone="danger"
        confirmLabel="Delete"
        typedConfirmation="DELETE"
        note={{ label: "Reason", required: true }}
        onConfirm={async (note) => {
          await new Promise((r) => setTimeout(r, 400));
          toast.success(`Deleted (${note})`);
        }}
      />
    </div>
  );
}
