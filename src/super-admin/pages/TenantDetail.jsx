import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Building2, ChevronDown, Package, Plus, ScrollText, Settings2, ShoppingBag, Users } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { ORDER_STATUSES, PRODUCT_STATUSES, USER_STATUSES_ALL, statusOptions } from "../../shared/lib/panel.js";
import {
  Alert,
  Avatar,
  Button,
  Card,
  CardBody,
  CardHeader,
  Code,
  DataTable,
  DateTime,
  DescriptionList,
  DropdownMenu,
  EmptyState,
  ErrorState,
  FilterBar,
  FormActions,
  MenuItem,
  Money,
  PageSkeleton,
  PageHeader,
  RelativeTime,
  Section,
  StatCard,
  StatusPill,
  TabPanel,
  Tabs,
  Tooltip,
  UnsavedChangesDialog,
} from "../../shared/ui/index.js";
import { BasicsFields, BrandingFields, PickupFields, ZonesEditor, errorsOf, formFromTenant, updatePayload, validateTenantForm } from "./tenantForm.jsx";
import { tenantStatusActions, useTenantLifecycle } from "./lib/tenantStatus.jsx";
import { orderColumns, orderHref } from "./lib/orderColumns.jsx";
import { CreateUserDialog } from "./lib/CreateUserDialog.jsx";
import { entityHref } from "./lib/links.js";
import { useSyncedForm } from "./lib/useSyncedForm.js";

const B = "/super-admin/tenants";
const pct = (cur, prev) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : null);
/** StatCard props: a number shows the arrow; null (no previous data) shows "—". */
const deltaOf = (change) => (typeof change === "number" ? { delta: change, deltaLabel: "vs previous 30 days" } : { hint: "— vs previous 30 days" });

/* ------------------------------------------------------------------ overview */

function OverviewTab({ tenant }) {
  const id = tenant._id;
  const scoped = useMemo(() => api.withTenant(id), [id]);
  const ov = useQuery({ queryKey: keys.reports.custom("tenant-overview", id), queryFn: () => scoped.reportsOverviewRange({ days: 30 }) });
  const staff = useQuery({ queryKey: keys.users.custom("count", id, "staff"), queryFn: () => scoped.listUsers({ staff: "true", limit: 1 }), select: (r) => r?.meta?.total ?? 0 });
  const o = ov.data;
  const p = o?.period;
  const prev = o?.previous;
  const loading = ov.isPending;
  const b = tenant.businessProfile || {};
  const pick = tenant.pickupAddress || {};

  return (
    <div className="grid gap-6">
      {tenant.status === "suspended" || tenant.status === "archived" ? (
        <Alert tone="danger" title={`This store is ${tenant.status}`}>
          Staff are blocked from signing in and its catalog is hidden from buyers.
        </Alert>
      ) : tenant.status === "pending" ? (
        <Alert tone="warning" title="Pending activation">Activate the store when onboarding is complete.</Alert>
      ) : null}
      {ov.error ? <ErrorState error={ov.error} onRetry={ov.refetch} compact /> : null}
      <div>
        <p className="mb-2 text-ui-xs text-fg-subtle">Last 30 days (IST) vs the 30 days before</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="GMV" value={<Money value={p?.gmv} whole />} {...deltaOf(o?.changes?.gmv)} loading={loading} to={`/super-admin/orders?tenant=${id}`} />
          <StatCard label="Orders" value={p?.orders?.toLocaleString("en-IN")} {...deltaOf(o?.changes?.orders)} loading={loading} to={`/super-admin/orders?tenant=${id}`} />
          <StatCard label="Average order value" value={<Money value={p?.orders ? p.aov : null} />} {...deltaOf(o?.changes?.aov)} loading={loading} />
          <StatCard
            label="Net sales"
            value={<Money value={p?.netSales} whole />}
            {...deltaOf(p && prev ? pct(p.netSales, prev.netSales) : null)}
            loading={loading}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Staff" value={staff.data?.toLocaleString("en-IN")} loading={staff.isPending} to={`?tab=staff`} />
        <StatCard label="Products" value={o ? `${o.publishedProducts} / ${o.products}` : undefined} hint="published / total" loading={loading} to={`?tab=products`} />
        <StatCard label="Customers" value={o?.customers?.toLocaleString("en-IN")} loading={loading} />
        <StatCard label="Open chats" value={o?.openChats?.toLocaleString("en-IN")} loading={loading} to={`/super-admin/support?tenant=${id}`} />
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Business profile" />
          <CardBody>
            <DescriptionList
              columns={2}
              items={[
                { label: "Legal name", value: b.legalName },
                { label: "GSTIN", value: b.gstin ? <Code copy>{b.gstin}</Code> : null },
                { label: "Email", value: b.email },
                { label: "Phone", value: b.phone },
                { label: "Website", value: b.website },
                { label: "Default tax rate", value: tenant.taxSettings ? `${tenant.taxSettings.defaultTaxRate ?? 0}%` : null },
                { label: "Minimum order", value: <Money value={tenant.orderRules?.minOrderValue} /> },
                { label: "Backorders", value: tenant.orderRules?.allowBackorder ? "Allowed" : "Not allowed" },
              ]}
            />
          </CardBody>
        </Card>
        <Card>
          <CardHeader title="Fulfilment" />
          <CardBody>
            <DescriptionList
              items={[
                { label: "Pickup address", value: pick.formatted || [pick.addressLine1, pick.city, pick.state, pick.postalCode].filter(Boolean).join(", ") },
                { label: "Pickup contact", value: [pick.contactName, pick.phone].filter(Boolean).join(" · ") },
                {
                  label: "Delivery zones",
                  value: (tenant.deliveryZones || []).length ? (
                    <ul className="grid gap-1">
                      {tenant.deliveryZones.map((z) => (
                        <li key={z._id || z.name} className="flex flex-wrap items-baseline justify-between gap-2">
                          <span>{z.name}</span>
                          <span className="text-ui-xs text-fg-subtle">
                            {z.pincodes?.length ? `${z.pincodes.length} pincode${z.pincodes.length === 1 ? "" : "s"}` : z.radiusKm ? `${z.radiusKm} km radius` : "—"} · {z.etaDaysMin}–{z.etaDaysMax} days · <Money value={z.deliveryFee} />
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null,
                },
                { label: "Low-stock SKUs", value: o ? o.lowStockCount : null },
                { label: "Fill rate / cancel rate", value: o ? `${o.fillRate}% / ${o.cancelRate}%` : null },
              ]}
            />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ profile */

const SECTION_LABELS = {
  name: "store name",
  businessProfile: "business details",
  branding: "branding",
  taxSettings: "tax",
  orderRules: "order rules",
  notificationPreferences: "notifications",
  pickupAddress: "pickup address",
  deliveryZones: "delivery zones",
};

function ProfileTab({ tenant, canEdit }) {
  const initial = useMemo(() => formFromTenant(tenant), [tenant]);
  const [form, setForm] = useSyncedForm(initial);
  const [showErrors, setShowErrors] = useState(false);
  const patch = useMemo(() => updatePayload(initial, form), [initial, form]);
  const dirty = Object.keys(patch).length > 0;

  const save = useApiMutation((body) => api.withTenant(null).updateTenant(tenant._id, body), {
    invalidate: [keys.tenants.all],
    success: "Profile saved",
    error: false,
    onSuccess: () => setShowErrors(false),
  });
  const blocker = useUnsavedChangesGuard(dirty && !save.isPending);
  const clientErrors = validateTenantForm(form);
  const errors = showErrors ? errorsOf(clientErrors, save.error) : errorsOf({}, save.error);
  const disabled = !canEdit;

  function submit(e) {
    e.preventDefault();
    if (Object.keys(clientErrors).length) return setShowErrors(true);
    save.mutate(patch);
  }

  return (
    <form onSubmit={submit} className="grid gap-6" noValidate>
      {!canEdit ? <Alert tone="info">You can view this profile. Editing requires tenants.edit.</Alert> : null}
      {save.error && !Object.keys(save.error.fields || {}).length ? <Alert tone="danger" title="Couldn’t save">{save.error.message}</Alert> : null}
      <Card>
        <CardHeader title="Store & business" />
        <CardBody>
          <BasicsFields form={form} setForm={setForm} errors={errors} disabled={disabled} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Branding, tax & order rules" />
        <CardBody>
          <BrandingFields form={form} setForm={setForm} errors={errors} disabled={disabled} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Pickup address" description="Saved addresses are geocoded again, so only change it when it really moved." />
        <CardBody>
          <PickupFields form={form} setForm={setForm} errors={errors} disabled={disabled} />
        </CardBody>
      </Card>
      <Card>
        <CardHeader title="Delivery zones" description="Saving zones replaces the whole list." />
        <CardBody>
          <ZonesEditor zones={form.deliveryZones} onChange={(z) => setForm({ ...form, deliveryZones: z })} errors={errors} disabled={disabled} />
        </CardBody>
      </Card>
      {canEdit ? (
        <div className="sticky bottom-0 z-10 -mx-1 rounded-lg border border-border bg-surface px-4 py-3 shadow-md">
          <FormActions className="border-0 pt-0">
            <span className="mr-auto text-ui-sm text-fg-muted" aria-live="polite">
              {dirty ? `Unsaved changes: ${Object.keys(patch).map((k) => SECTION_LABELS[k] || k).join(", ")}` : "All changes saved"}
              {patch.pickupAddress ? " · address will be re-geocoded" : ""}
              {patch.deliveryZones ? " · zones will be replaced" : ""}
            </span>
            <Button disabled={!dirty || save.isPending} onClick={() => { setForm(initial); setShowErrors(false); save.reset(); }}>
              Discard
            </Button>
            <Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty}>
              Save changes
            </Button>
          </FormActions>
        </div>
      ) : null}
      <UnsavedChangesDialog blocker={blocker} />
    </form>
  );
}

/* ------------------------------------------------------------------ staff */

function StaffTab({ tenant, can }) {
  const id = tenant._id;
  const table = useUrlTableState({ prefix: "st_", filters: ["status"], defaults: { limit: 20 } });
  const query = { ...table.query, staff: "true" };
  const q = useQuery({ queryKey: keys.users.list({ ...query, tenant: id }), queryFn: () => api.withTenant(id).listUsers(query), ...listQueryOptions });
  const [adding, setAdding] = useState(false);
  const add = can("users.create") ? (
    <Button size="sm" variant="primary" leftIcon={Plus} onClick={() => setAdding(true)}>
      Add staff
    </Button>
  ) : null;
  return (
    <>
      <DataTable
        storageKey="sa-tenant-staff"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        getRowId={(u) => String(u.id)}
        rowHref={(u) => `/super-admin/users/${u.id}`}
        toolbar={<FilterBar table={table} searchPlaceholder="Search staff" facets={[{ key: "status", title: "Status", options: statusOptions(USER_STATUSES_ALL.filter((s) => s !== "deleted")) }]} actions={add} />}
        columns={[
          {
            id: "name",
            header: "Name",
            primary: true,
            accessorKey: "name",
            cell: (u) => (
              <span className="flex items-center gap-2">
                <Avatar name={u.name} size="sm" />
                <span className="grid min-w-0">
                  <span className="truncate">{u.name}</span>
                  <span className="truncate text-ui-xs font-normal text-fg-subtle">{u.email}</span>
                </span>
              </span>
            ),
          },
          { id: "role", header: "Role", accessorFn: (u) => u.role?.name || "—", mobile: "meta" },
          { id: "status", header: "Status", cell: (u) => <StatusPill status={u.status} />, csv: (u) => u.status, mobile: "meta" },
          { id: "login", header: "Last sign-in", cell: (u) => <RelativeTime value={u.lastLoginAt} />, csv: (u) => u.lastLoginAt },
          { id: "created", header: "Added", cell: (u) => <DateTime value={u.createdAt} format="date" />, csv: (u) => u.createdAt, defaultHidden: true },
        ]}
        emptyState={table.activeCount ? undefined : <EmptyState icon={Users} title="No staff yet" description="Add the store admin so the store can manage its catalog and orders." action={add} />}
      />
      <CreateUserDialog open={adding} onOpenChange={setAdding} tenantId={id} kinds={["staff"]} defaultRoleSlug="tenant_admin" title={`Add staff to ${tenant.name}`} />
    </>
  );
}

/* ------------------------------------------------------------------ orders / products / settings / audit */

function OrdersTab({ tenant }) {
  const id = tenant._id;
  const table = useUrlTableState({ prefix: "o_", filters: ["status", "from", "to"], defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.orders.list({ ...table.query, tenant: id }), queryFn: () => api.withTenant(id).listOrders(table.query), ...listQueryOptions });
  return (
    <DataTable
      storageKey="sa-tenant-orders"
      table={table}
      data={q.data?.data}
      meta={q.data?.meta}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      rowHref={orderHref}
      toolbar={
        <FilterBar
          table={table}
          searchPlaceholder="Order no., buyer"
          facets={[{ key: "status", title: "Status", options: statusOptions(ORDER_STATUSES) }]}
          dateRange={{ from: "from", to: "to" }}
          actions={<Button size="sm" to={`/super-admin/orders?tenant=${id}`}>Open in Orders</Button>}
        />
      }
      columns={orderColumns({ showTenant: false })}
      emptyState={table.activeCount ? undefined : <EmptyState icon={ShoppingBag} title="No orders yet" description="Orders placed with this store appear here." />}
    />
  );
}

function ProductsTab({ tenant }) {
  const id = tenant._id;
  const table = useUrlTableState({ prefix: "p_", filters: ["status"], defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.products.list({ ...table.query, tenant: id }), queryFn: () => api.withTenant(id).listStaffProducts(table.query), ...listQueryOptions });
  return (
    <DataTable
      storageKey="sa-tenant-products"
      table={table}
      data={q.data?.data}
      meta={q.data?.meta}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      rowHref={(p) => `/super-admin/catalog/${p._id}`}
      toolbar={
        <FilterBar
          table={table}
          searchPlaceholder="Name, SKU, tag"
          facets={[{ key: "status", title: "Status", options: statusOptions(PRODUCT_STATUSES) }]}
          actions={<Button size="sm" to={`/super-admin/catalog?tenant=${id}`}>Open in Catalog</Button>}
        />
      }
      columns={[
        {
          id: "name",
          header: "Product",
          primary: true,
          accessorKey: "name",
          cell: (p) => (
            <span className="flex items-center gap-2.5">
              <span className="size-8 shrink-0 overflow-hidden rounded-md border border-border bg-surface-2">{p.images?.[0] ? <img src={p.images[0]} alt="" className="size-full object-cover" /> : null}</span>
              <span className="grid min-w-0">
                <span className="truncate">{p.name}</span>
                <span className="truncate font-mono text-ui-xs font-normal text-fg-subtle">{p.sku}</span>
              </span>
            </span>
          ),
        },
        { id: "status", header: "Status", cell: (p) => <StatusPill status={p.status} />, csv: (p) => p.status, mobile: "meta" },
        { id: "updated", header: "Updated", cell: (p) => <RelativeTime value={p.updatedAt} />, csv: (p) => p.updatedAt, mobile: "meta" },
      ]}
      emptyState={table.activeCount ? undefined : <EmptyState icon={Package} title="No products yet" description="The store hasn’t added products." />}
    />
  );
}

function SettingsTab({ tenant }) {
  const id = tenant._id;
  const q = useQuery({ queryKey: keys.settings.custom("tenant", id), queryFn: () => api.withTenant(id).listSettings() });
  const rows = Array.isArray(q.data) ? q.data : q.data?.data || [];
  return (
    <Section
      title="Settings overrides"
      description="Values this store sets on top of the platform defaults (fees, COD, delivery partners…)."
      actions={<Button size="sm" leftIcon={Settings2} to={`/super-admin/settings?tab=overrides&tenant=${id}`}>Manage overrides</Button>}
    >
      <DataTable
        data={rows}
        loading={q.isPending}
        error={q.error}
        onRetry={q.refetch}
        pagination={false}
        getRowId={(r) => r._id || r.key}
        columns={[
          { id: "key", header: "Key", cell: (r) => <Code>{r.key}</Code>, csv: (r) => r.key },
          { id: "value", header: "Value", cell: (r) => <span className="break-all font-mono text-ui-xs">{JSON.stringify(r.value)}</span>, csv: (r) => JSON.stringify(r.value) },
          { id: "updated", header: "Updated", cell: (r) => <RelativeTime value={r.updatedAt} />, csv: (r) => r.updatedAt },
        ]}
        emptyState={<EmptyState icon={Settings2} title="No overrides" description="This store uses the platform defaults for everything." compact />}
      />
    </Section>
  );
}

function AuditTab({ tenant }) {
  const id = tenant._id;
  const table = useUrlTableState({ prefix: "a_", filters: ["from", "to"], defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.audit.list({ ...table.query, tenant: id }), queryFn: () => api.withTenant(id).listAudit(table.query), ...listQueryOptions });
  return (
    <DataTable
      storageKey="sa-tenant-audit"
      table={table}
      data={q.data?.data}
      meta={q.data?.meta}
      loading={q.isPending}
      fetching={q.isFetching}
      error={q.error}
      onRetry={q.refetch}
      rowHref={(a) => `/super-admin/audit?tenant=${id}&entry=${a._id}`}
      toolbar={<FilterBar table={table} searchPlaceholder="Action, resource, actor" dateRange={{ from: "from", to: "to" }} actions={<Button size="sm" to={`/super-admin/audit?tenant=${id}`}>Open audit log</Button>} />}
      columns={[
        { id: "at", header: "When", primary: true, cell: (a) => <DateTime value={a.createdAt} />, csv: (a) => a.createdAt },
        { id: "actor", header: "Actor", accessorFn: (a) => a.actorId?.name || a.actorId?.email || "System", mobile: "subtitle" },
        { id: "action", header: "Action", cell: (a) => <span className="font-mono text-ui-xs">{a.resource}.{a.action}</span>, csv: (a) => `${a.resource}.${a.action}`, mobile: "meta" },
        {
          id: "resource",
          header: "Resource",
          cell: (a) => {
            const href = a.resourceId ? entityHref(a.resource, a.resourceId, { tenantId: id }) : null;
            return a.resourceId ? <span className="font-mono text-ui-xs">{href ? <Link to={href} className="hover:underline">{String(a.resourceId)}</Link> : String(a.resourceId)}</span> : <span className="text-fg-subtle">—</span>;
          },
          csv: (a) => a.resourceId,
        },
      ]}
      emptyState={<EmptyState icon={ScrollText} title="No audit entries" description="Changes made by or to this store are recorded here." />}
    />
  );
}

/* ------------------------------------------------------------------ page */

export default function TenantDetail() {
  const { id } = useParams();
  const can = useCan();
  const q = useQuery({ queryKey: keys.tenants.detail(id), queryFn: () => api.withTenant(null).getTenant(id) });
  const lifecycle = useTenantLifecycle();

  if (q.isPending) return <PageSkeleton />;
  if (q.error)
    return (
      <>
        <PageHeader title="Tenant" back={B} breadcrumbs={[{ label: "Tenants", to: B }, { label: "Not found" }]} />
        <ErrorState error={q.error} onRetry={q.refetch} title={q.error.status === 404 ? "Tenant not found" : undefined} />
      </>
    );
  const t = q.data;
  const actions = can("tenants.edit") ? tenantStatusActions(t) : [];

  return (
    <>
      <PageHeader
        title={t.name}
        back={B}
        breadcrumbs={[{ label: "Tenants", to: B }, { label: t.name }]}
        meta={
          <>
            <StatusPill status={t.status} />
            <Code copy={t.slug} className="text-fg-muted">{t.slug}</Code>
          </>
        }
        description={
          <span>
            Created <DateTime value={t.createdAt} format="date" /> · updated <RelativeTime value={t.updatedAt} />
          </span>
        }
        secondaryActions={
          <Button to={`/super-admin/orders?tenant=${t._id}`} leftIcon={ShoppingBag}>
            Orders
          </Button>
        }
        primaryAction={
          actions.length ? (
            <DropdownMenu trigger={<Button rightIcon={ChevronDown}>Status</Button>}>
              {actions.map((a) => (
                <MenuItem key={a.id} tone={a.tone} onSelect={() => lifecycle.open(t, a)}>
                  {a.label}
                </MenuItem>
              ))}
            </DropdownMenu>
          ) : !can("tenants.edit") ? (
            <Tooltip content="Requires tenants.edit">
              <span>
                <Button disabled>Status</Button>
              </span>
            </Tooltip>
          ) : null
        }
      />
      <Tabs
        urlParam="tab"
        aria-label="Tenant sections"
        tabs={[
          { value: "overview", label: "Overview", icon: Building2 },
          { value: "profile", label: "Profile" },
          { value: "staff", label: "Staff" },
          { value: "orders", label: "Orders" },
          { value: "products", label: "Products" },
          { value: "settings", label: "Settings" },
          { value: "audit", label: "Audit" },
        ]}
      >
        <TabPanel value="overview">
          <OverviewTab tenant={t} />
        </TabPanel>
        <TabPanel value="profile">
          <ProfileTab tenant={t} canEdit={can("tenants.edit")} />
        </TabPanel>
        <TabPanel value="staff">
          <StaffTab tenant={t} can={can} />
        </TabPanel>
        <TabPanel value="orders">
          <OrdersTab tenant={t} />
        </TabPanel>
        <TabPanel value="products">
          <ProductsTab tenant={t} />
        </TabPanel>
        <TabPanel value="settings">
          <SettingsTab tenant={t} />
        </TabPanel>
        <TabPanel value="audit">{can("audit.view") ? <AuditTab tenant={t} /> : <EmptyState title="Requires audit.view" />}</TabPanel>
      </Tabs>
      {lifecycle.dialog}
    </>
  );
}
