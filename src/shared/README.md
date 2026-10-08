# Shared platform — guide for page authors

Everything an admin page needs lives under `src/shared`. Use it. Don't hand-roll tables, modals, badges, fetch
calls, date or money formatting. Run the dev playground at `/super-admin/__ui` (dev builds only) to see
every component working against the live API. Its source is `shared/layout/UiPlayground.jsx`.

```
shared/
  api/            client.js (request, ApiError), session.js (in-memory token, refresh), endpoints/*, keys.js, queryClient.js
  api.js          compat re-export: import { api, ApiError, request } from "shared/api.js"
  auth.js         ROLES, can/canAny/allows (fail-closed), prettyStatus, rowsOf
  context/        AuthContext (useAuth, useCan), TenantContext (useTenantContext)
  hooks/          useApi, useApiMutation, useUrlTableState, useListQuery (legacy), useUnsavedChangesGuard, useDocumentTitle, useDebouncedValue
  lib/            format.js (IST + INR), panel.js (status lists, order state machine, orderActions)
  ui/             component library (import from "shared/ui/index.js")
  layout/         AppShell, nav utils, RequirePermission, status pages, command palette, bell, user menu
  realtime/       socket.js (getSocket, emitWithAck, useSocketEvent)
  styles/         tokens.css (design tokens, light/dark)
```

## Rules

- **Styling.** Use the semantic token classes, not hex values or `msr-*` classes:
  - Surfaces: `bg-surface`, `bg-surface-2`, `bg-bg`.
  - Text: `text-fg`, `text-fg-muted`, `text-fg-subtle`.
  - Borders: `border-border`.
  - Brand: `bg-primary`, `text-primary-soft-fg`.
  - Status pairs: `bg-success-soft text-success-fg`, and the same pattern for `warning`, `danger`, `info`, `accent` and `neutral`.
  - Type scale: `text-ui-xs`, `text-ui-sm`, `text-ui`, `text-ui-lg`, `text-title`, `text-display`.
  - Dark mode comes for free. Never write `bg-white`.
- **Money and dates.**
  - Use `<Money value>`, `<DateTime value>` and `<RelativeTime value>`, or `inr()` and `formatDate()` from `lib/format.js`.
  - Null or undefined renders as "—", never as ₹0.00.
  - Everything displays in Asia/Kolkata.
- **Statuses.**
  - Render a status with `<StatusPill status={x} />`. Pass `domain="payment"`, `"review"` or `"returnRequest"` when the same word means something different in that domain.
  - Take status lists from `lib/panel.js` (`ORDER_STATUSES`, `USER_STATUSES`, which holds only the admin-settable values, `CHAT_STATUSES`, and so on) together with `statusOptions(list)`.
- **Permissions.**
  - Routes are guarded from the nav config: `tenant/layouts/nav.js` and `super-admin/layouts/nav.js`. A detail route inherits its section's `req`.
  - Inside a page, use `const can = useCan()` and then `can("orders.update")`. It fails closed: no permissions means `false`. It also accepts an array for an any-of check.
  - Either hide actions the user can't perform, or disable them with a `<Tooltip content="Requires orders.refund">`.
- **Destructive or irreversible actions** always go through `<ConfirmDialog>` with copy that explains the consequence. Add `typedConfirmation` for actions that really are destructive. Never change state silently from an inline `<select>`.
- **Lists.** Use `DataTable` together with `useUrlTableState`, which makes the URL the source of truth.
- **Forms.**
  - Use controlled state with `<Field>` errors taken from `ApiError.fields`.
  - Disable the submit button while the request is pending.
  - Show a success toast and invalidate the affected queries.
  - Add `useUnsavedChangesGuard` for long forms.

## Data

### Fetching

```jsx
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";

const q = useQuery({ queryKey: keys.orders.detail(id), queryFn: () => api.getOrder(id) });
// q.data, q.isPending, q.error (ApiError), q.refetch()
```

- Query keys follow `keys.<entity>.all | lists() | list(query) | detail(id) | sub(id, "invoice")`.
- The QueryClient doesn't retry 4xx errors, refetches on window focus, and treats data as stale after 30 s.
- For paged lists, spread `listQueryOptions` (keepPreviousData).
- `useApi(loader, deps)` still works for legacy pages. It returns `{ data, error (string), errorObj, loading, reload, setData }` and is built on useQuery. The loader receives `{ signal }`, and api calls inside it are aborted automatically.

### Mutations

```jsx
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";

const save = useApiMutation((body) => api.updateOrder(id, body), {
  invalidate: [keys.orders.detail(id), keys.orders.lists()],
  success: "Notes saved",          // toast; omit for none
  // error: false                  // handle errors yourself (by default a toast with the API message + request id)
});
save.mutate({ sellerNotes });       // save.isPending, save.error?.fields
```

### Errors

`ApiError` carries the following fields:

- `status`
- `code` (`VALIDATION_ERROR`, `TENANT_REQUIRED`, `ROLE_IN_USE`, `INVALID_STATE`, `PAYMENT_REQUIRED`, …)
- `message`
- `requestId`
- `fields`, a map that zod `"path: msg"` messages are parsed into
- `retryAfter`

Use `err.fieldError("name")` to get the error for a single field.

### Tenant context (super admin)

The platform admin picks a tenant in the topbar switcher, and every request then sends `X-Tenant-Id`. Several routes need a tenant context and otherwise return `400 TENANT_REQUIRED`:

- inventory, warehouses, pricing, offers and coupons
- ledger accounts
- `reports/customers`
- tenant-scope settings
- creating a role

To handle this in a page, use either of these:

```jsx
import { useTenantContext } from "../../shared/context/TenantContext.jsx";
const { tenantId, setTenantId, isPlatform } = useTenantContext();   // tenant staff: tenantId = own store

api.withTenant(row.tenantId).listInventory(query);   // per call, overrides the switcher
api.withTenant(null).reportsOverview();              // force platform scope (no header)
```

- When `isPlatform && !tenantId` on a page that needs a tenant, render an `EmptyState` that asks the user to pick a tenant. Put `<TenantCombobox value onChange />` inside it.
- Tenant pickers anywhere should use `<TenantCombobox>`, which runs a server search over `/tenants?q=`. Use `useTenantsQuery()` only for small id→name lookups. Never load every tenant into a `<select>`.

### Realtime

```jsx
import { useSocketEvent, emitWithAck } from "../../shared/realtime/socket.js";
useSocketEvent("chat:message", (msg) => …, { invalidate: [keys.chats.detail(id)] });
const ack = await emitWithAck("chat:join", conversationId); // { ok: true } | { ok:false, error }
```

The panel shell keeps the socket connected and authenticates it with the in-memory token. It reconnects after a token refresh.

## List page (template)

```jsx
import { Package } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import { ORDER_STATUSES, statusOptions } from "../../shared/lib/panel.js";
import { Button, DataTable, DateTime, EmptyState, FilterBar, Money, PageHeader, StatusPill } from "../../shared/ui/index.js";

export default function Orders() {
  const can = useCan();
  const table = useUrlTableState({ filters: ["status", "paymentStatus", "from", "to"], defaults: { limit: 20 } });
  const q = useQuery({ queryKey: keys.orders.list(table.query), queryFn: () => api.listOrders(table.query), ...listQueryOptions });

  return (
    <>
      <PageHeader title="Orders" description="All orders for your store."
        primaryAction={can("reports.export") ? <Button onClick={() => api.exportReport("orders", table.query)}>Export</Button> : null} />
      <DataTable
        storageKey="tenant-orders" exportFilename="orders"
        table={table} data={q.data?.data} meta={q.data?.meta}
        loading={q.isPending} fetching={q.isFetching} error={q.error} onRetry={q.refetch}
        rowHref={(o) => `/tenant/orders/${o._id}`}
        selectable bulkActions={(rows, clear) => <Button size="xs" onClick={…}>Mark processing</Button>}
        toolbar={<FilterBar table={table} searchPlaceholder="Search orders"
          facets={[{ key: "status", title: "Status", options: statusOptions(ORDER_STATUSES) }]}
          dateRange={{ from: "from", to: "to" }} />}
        columns={[
          { id: "number", header: "Order", accessorKey: "orderNumber", primary: true },
          { id: "buyer", header: "Buyer", accessorFn: (o) => o.buyerSnapshot?.name, mobile: "subtitle" },
          { id: "status", header: "Status", cell: (o) => <StatusPill status={o.status} />, csv: (o) => o.status },
          { id: "total", header: "Total", align: "right", cell: (o) => <Money value={o.grandTotal} />, csv: (o) => o.grandTotal },
          { id: "placed", header: "Placed", sortKey: "createdAt", cell: (o) => <DateTime value={o.createdAt} /> },
        ]}
        emptyState={<EmptyState icon={Package} title="No orders yet" description="Orders appear here as buyers check out." />}
      />
    </>
  );
}
```

### `useUrlTableState`

`useUrlTableState({ filters: [...keys], defaults, prefix })` returns the following:

- State: `{ q, search, page, limit, sort, order, filters, query, activeCount }`
- Setters: `setSearch`, `setPage`, `setLimit`, `setSort`, `toggleSort`, `setFilter(key, v)`, `setFilters(obj)`, `reset()`

How it behaves:

- Typing into `search` is debounced into `?q=` with history.replace.
- Changes to the page or a filter push a history entry, so the back button works.
- Any change other than a page change resets the page to 1.
- Unknown URL params such as `?tab=` are preserved.
- Use `prefix` when a page has two tables.

### `DataTable` columns

A column takes the following options:

| Option | Meaning |
| --- | --- |
| `id`, `header` | Required. |
| `accessorKey` or `accessorFn` | Value accessor. |
| `cell(row)` | Custom cell renderer. |
| `sortKey` | Sends `sort` and `order` to the API. |
| `align: "right"` | Use for money and numbers. |
| `primary` | The cell renders the row `Link`. Rows are keyboard-reachable, so don't put an onClick on `<tr>`. |
| `mobile` | `"title"`, `"subtitle"`, `"meta"` or `"hidden"`, for the card layout below `md`. |
| `csv(row)` | Value used for "download this page". |
| `hideable` | Whether the user can hide the column. |
| `defaultHidden` | Hide the column until the user turns it on. |

Interactive controls inside a row (buttons, menus) sit above the row link automatically.

Note: the backend ignores `sort` and `order` today (it sorts by `createdAt desc`). Only add a `sortKey` where the endpoint supports it, or leave sorting off.

## Detail page

```jsx
const { id } = useParams();
const q = useQuery({ queryKey: keys.orders.detail(id), queryFn: () => api.getOrder(id) });
if (q.isPending) return <PageSkeleton />;
if (q.error) return <ErrorState error={q.error} onRetry={q.refetch} />;
const order = q.data;
return (
  <>
    <PageHeader title={order.orderNumber} back="/tenant/orders" meta={<StatusPill status={order.status} />}
      breadcrumbs={[{ label: "Orders", to: "/tenant/orders" }, { label: order.orderNumber }]}
      primaryAction={…} secondaryActions={…} />
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      <Card><CardHeader title="Items" /><CardBody>…</CardBody></Card>
      <Card padded><DescriptionList items={[{ label: "Buyer", value: order.buyerSnapshot?.name }, …]} /></Card>
    </div>
    <Section title="History"><Timeline items={order.statusHistory.map((h) => ({ status: h.status, at: h.at, note: h.note }))} /></Section>
  </>
);
```

Use `<Tabs urlParam="tab" tabs={[…]}>` with `<TabPanel value>` for tabbed detail pages. This keeps the selected tab in the URL.

## Orders: `orderActions` and the state machine

`lib/panel.js` mirrors the backend files `orders/statuses.js` and `lifecycle.js`:

```jsx
import { orderActions, nextStatuses } from "../../shared/lib/panel.js";
const can = useCan();
const actions = orderActions(order, can);
// [{ id: "confirm" | "process" | "ready_to_ship" | "ship" | "out_for_delivery" | "deliver" | "cancel" |
//         "approve_return" | "reject_return" | "receive_return" | "refund",
//    label, tone?, perms, endpoint: { method, path, body?, fields? },
//    confirm: { title, body, cta, note?: { label, required }, items?: true, typed? },
//    call(api, orderId, extra) → Promise, disabled, reason? }]
```

- Render one button or menu item per action. Each action opens a `<ConfirmDialog title body confirmLabel tone note typedConfirmation>` built from `action.confirm`.
- `onConfirm` calls `action.call(api, order._id, { note })`, then invalidates `keys.orders.detail(id)` and `keys.orders.lists()`.
- For `receive_return`, collect `items: [{ itemId, damagedQty }]`.
- For `ready_to_ship` and `ship`, you can collect `trackingNumber` and `carrier`.
- The return flow uses only the dedicated endpoints: approve → receive → refund, or reject. `/status` covers forward fulfilment only.
- `confirm` is returned `disabled` with a `reason` for unpaid online orders (`PAYMENT_REQUIRED`).
- `nextStatuses(order, can)` gives just the `/status` targets.

## Forms

```jsx
const [form, setForm] = useState(initial);
const dirty = JSON.stringify(form) !== JSON.stringify(initial);
const save = useApiMutation((body) => api.updateWarehouse(id, body), { invalidate: [keys.warehouses.all], success: "Warehouse saved", error: false });
const blocker = useUnsavedChangesGuard(dirty && !save.isPending);

<form onSubmit={(e) => { e.preventDefault(); save.mutate(form); }} className="grid gap-4">
  <Field label="Name" name="name" errors={save.error} required>
    <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
  </Field>
  <Field label="Status"><Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })} options={statusOptions(["active", "inactive"])} /></Field>
  {save.error && !Object.keys(save.error.fields).length ? <Alert tone="danger">{save.error.message}</Alert> : null}
  <FormActions><Button type="submit" variant="primary" loading={save.isPending} disabled={!dirty}>Save</Button></FormActions>
</form>
<UnsavedChangesDialog blocker={blocker} />
```

- `Field` wires the label, hint and error to the control (`aria-describedby`, `aria-invalid`).
- Available controls: `Input` (`prefix`/`suffix`), `Textarea`, `Select` (Radix), `NativeSelect`, `Combobox` (static or async `search`), `Checkbox`, `Switch`, `RadioGroup`, `DateRangePicker` and `FileDropzone`. `FileDropzone` validates type and size before upload: use `MEDIA_TYPES` and `10 * MB` for `/media`, or `CSV_TYPES` and `2 * MB` for the product import.
- For datetime inputs, `toIstInputValue(iso)` and `fromIstInputValue(local)` convert between IST and UTC ISO. `parseIstDate("YYYY-MM-DD")` parses a date as IST.
- A `Dialog` with `dirty` or `busy` ignores backdrop clicks, and while `busy` it ignores Escape too. Use `<Sheet>` for side panels.

## Feedback

- Toasts: `toast.success("Saved")`, `toast.error(msg)` and `toast(msg, { description })`. The toaster is mounted once at the root. The legacy `useToast()` still works.
- `<Alert tone>` for inline notices.
- `<EmptyState icon title description action>` for empty views.
- `<ErrorState error onRetry>` for failures.
- `<Skeleton>`, `<SkeletonText>` and `<PageSkeleton>` while loading.
- Every route already has an ErrorBoundary and a Suspense skeleton.

## Auth and session (for reference)

- The access token is held in memory only. The httpOnly refresh cookie bootstraps the session on load, and a proactive refresh runs before expiry.
- A 401 triggers a single-flight refresh and one retry.
- Tabs stay in sync over BroadcastChannel.
- `TOKEN_REUSE`, `TOKEN_REVOKED`, `ACCOUNT_INACTIVE` and `TENANT_SUSPENDED` force a logout and show an explanatory screen.
- `useAuth()` returns `{ user, status, can, login, logout, logoutAll, changePassword, updateProfile, reloadUser }`.
- `user` contains `{ id, name, email, role: "buyer"|"tenant"|"super_admin", roleSlug, roleName, permissions, tenantId, tenant, emailVerified, token }`.
- `/auth/me` is refreshed every 5 minutes and when the window regains focus, so permission changes show up without a re-login.
