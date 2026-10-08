import { useState } from "react";
import { useParams } from "react-router-dom";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { ArrowRight, Mail, Phone, ShoppingBag } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { paymentLabel } from "../../shared/lib/format.js";
import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  DataTable,
  DateTime,
  DescriptionList,
  EmptyState,
  ErrorState,
  Money,
  PageHeader,
  PageSkeleton,
  StatCard,
  StatusPill,
  TabPanel,
  Tabs,
  statusLabel,
} from "../../shared/ui/index.js";
import { LedgerAccountPanel, LedgerSummary } from "../../shared/components/LedgerAccounts.jsx";

const VIEW = ["reports.view", "orders.view", "ledger.view"];
const LEDGER = ["ledger.view", "ledger.manage"];
const ORDERS_PAGE = 10;

/**
 * One buyer as seen by this store: GET /reports/customers/:userId → { customer, stats, orders (paged), ledger }.
 * The credit tab is the full ledger account (terms, payments, adjustments, statement).
 */
export default function CustomerPage() {
  const { id } = useParams();
  const can = useCan();
  const [page, setPage] = useState(1);
  const query = { page, limit: ORDERS_PAGE };
  const q = useQuery({
    queryKey: keys.customers.detail(id).concat([query]),
    queryFn: () => api.getCustomerReport(id, query),
    enabled: can(VIEW),
    placeholderData: keepPreviousData,
  });

  if (!can(VIEW)) {
    return <EmptyState title="No access to customers" description="Requires reports.view, orders.view or ledger.view." />;
  }
  if (q.isPending) return <PageSkeleton />;
  if (q.error) {
    return (
      <>
        <PageHeader title="Customer" back="/tenant/customers" breadcrumbs={[{ label: "Customers", to: "/tenant/customers" }, { label: "Not available" }]} />
        <ErrorState
          error={q.error}
          title={q.error.status === 404 ? "Not a customer of your store" : "Couldn’t load this customer"}
          onRetry={q.error.status === 404 ? undefined : q.refetch}
        />
      </>
    );
  }

  const { customer = {}, stats = {}, orders = {}, ledger } = q.data || {};
  const name = customer.name || customer.email || "Customer";
  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "orders", label: "Orders", count: orders.meta?.total },
    can(LEDGER) ? { value: "credit", label: "Credit account" } : null,
  ].filter(Boolean);
  const byStatus = Object.entries(stats.byStatus || {}).filter(([, n]) => Number(n) > 0);

  return (
    <>
      <PageHeader
        title={
          <span className="flex items-center gap-3">
            <Avatar name={name} size="lg" />
            <span className="min-w-0">
              <span className="block truncate">{name}</span>
              {customer.company ? <span className="block truncate text-ui-sm font-normal text-fg-muted">{customer.company}</span> : null}
            </span>
          </span>
        }
        documentTitle={`Customer · ${name}`}
        back="/tenant/customers"
        breadcrumbs={[{ label: "Customers", to: "/tenant/customers" }, { label: name }]}
        meta={
          <>
            {customer.status ? <StatusPill status={customer.status} /> : null}
            {customer.homeStore ? <Badge tone="info">Signed up via your store</Badge> : null}
          </>
        }
        secondaryActions={
          can("orders.view") ? (
            <Button size="sm" rightIcon={ArrowRight} to={`/tenant/orders?buyerId=${encodeURIComponent(customer.id || id)}`}>
              Open in Orders
            </Button>
          ) : null
        }
      />
      <Tabs urlParam="tab" tabs={tabs}>
        <TabPanel value="overview">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
            <div className="grid grid-cols-[minmax(0,1fr)] content-start gap-4">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatCard label="Orders" value={Number(stats.orders || 0).toLocaleString("en-IN")} hint={`${Number(stats.revenueOrders || 0).toLocaleString("en-IN")} counted as revenue`} />
                <StatCard label="Spend" value={<Money value={stats.spend} />} hint="Revenue orders, all time" />
                <StatCard label="Avg. order value" value={<Money value={stats.aov} />} />
                <StatCard label="Refunded" value={<Money value={stats.refunded?.amount} />} hint={`${stats.refunded?.count || 0} order${stats.refunded?.count === 1 ? "" : "s"}`} />
              </div>
              <Card padded>
                <DescriptionList
                  columns={2}
                  items={[
                    {
                      label: "Email",
                      value: customer.email ? (
                        <a className="inline-flex items-center gap-1 text-primary-soft-fg hover:underline" href={`mailto:${customer.email}`}>
                          <Mail aria-hidden className="size-3.5" />
                          {customer.email}
                        </a>
                      ) : null,
                    },
                    {
                      label: "Phone",
                      value: customer.phone ? (
                        <a className="inline-flex items-center gap-1 hover:underline" href={`tel:${customer.phone}`}>
                          <Phone aria-hidden className="size-3.5" />
                          {customer.phone}
                        </a>
                      ) : null,
                    },
                    { label: "Company", value: customer.company },
                    { label: "GSTIN", value: customer.gstin || "Unregistered" },
                    { label: "Address", value: customer.address },
                    { label: "Customer since", value: customer.joinedAt ? <DateTime value={customer.joinedAt} format="date" /> : null },
                    { label: "First order", value: stats.firstOrderAt ? <DateTime value={stats.firstOrderAt} format="date" /> : "No orders yet" },
                    { label: "Last order", value: stats.lastOrderAt ? <DateTime value={stats.lastOrderAt} /> : null },
                  ]}
                />
              </Card>
              {byStatus.length ? (
                <Card>
                  <CardHeader title="Orders by status" />
                  <CardBody className="flex flex-wrap gap-2">
                    {byStatus.map(([status, n]) => (
                      <Badge key={status} tone="outline" size="md">
                        {statusLabel(status)} · {n}
                      </Badge>
                    ))}
                  </CardBody>
                </Card>
              ) : null}
            </div>
            <Card>
              <CardHeader title="Credit with your store" />
              <CardBody>
                {ledger ? (
                  <LedgerSummary account={ledger} compact />
                ) : (
                  <p className="text-ui-sm text-fg-muted">Pays upfront — no credit or PO terms with your store.</p>
                )}
                {can(LEDGER) ? (
                  <Button size="sm" className="mt-3" to="?tab=credit" rightIcon={ArrowRight}>
                    {ledger ? "Open credit account" : "Give credit terms"}
                  </Button>
                ) : null}
              </CardBody>
            </Card>
          </div>
        </TabPanel>
        <TabPanel value="orders">
          <DataTable
            caption="Customer orders"
            data={orders.data}
            meta={orders.meta}
            table={{ page, limit: ORDERS_PAGE, setPage, query }}
            loading={q.isPending}
            fetching={q.isFetching}
            error={q.error}
            onRetry={q.refetch}
            rowHref={(o) => (can("orders.view") ? `/tenant/orders/${o._id}` : undefined)}
            exportFilename={`orders-${id}`}
            columns={[
              { id: "number", header: "Order", accessorKey: "orderNumber", primary: true },
              { id: "placed", header: "Placed", cell: (o) => <DateTime value={o.createdAt} />, csv: (o) => o.createdAt, mobile: "meta" },
              { id: "items", header: "Units", align: "right", accessorFn: (o) => o.items, mobile: "hidden" },
              {
                id: "payment",
                header: "Payment",
                cell: (o) => (
                  <span className="inline-flex items-center gap-1.5">
                    <StatusPill status={o.paymentStatus} domain="payment" />
                    <span className="text-ui-xs text-fg-subtle">{paymentLabel(o.paymentMethod)}</span>
                  </span>
                ),
                csv: (o) => `${o.paymentStatus} (${o.paymentMethod})`,
              },
              {
                id: "status",
                header: "Status",
                cell: (o) => (
                  <span className="inline-flex flex-wrap gap-1">
                    <StatusPill status={o.status} />
                    {o.returnStatus ? <StatusPill status={o.returnStatus} domain="returnRequest" /> : null}
                  </span>
                ),
                csv: (o) => o.status,
                mobile: "meta",
              },
              { id: "total", header: "Total", align: "right", cell: (o) => <Money value={o.grandTotal ?? o.total} />, csv: (o) => o.grandTotal ?? o.total, mobile: "meta" },
            ]}
            emptyState={<EmptyState icon={ShoppingBag} title="No orders yet" description="This buyer hasn’t ordered from your store." compact />}
          />
        </TabPanel>
        <TabPanel value="credit">
          {customer.homeStore === false && !ledger ? (
            <Alert tone="info" className="mb-4">
              This buyer signed up through another store. You can still give them credit terms with yours.
            </Alert>
          ) : null}
          <LedgerAccountPanel userId={id} orderHref={(orderId) => `/tenant/orders/${orderId}`} />
        </TabPanel>
      </Tabs>
    </>
  );
}
