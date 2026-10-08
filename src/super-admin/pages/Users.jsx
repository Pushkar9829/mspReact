import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MoreHorizontal, Plus, Users as UsersIcon } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useAuth, useCan } from "../../shared/context/AuthContext.jsx";
import { USER_STATUSES_ALL, statusOptions } from "../../shared/lib/panel.js";
import {
  Avatar,
  Badge,
  Button,
  Combobox,
  DataTable,
  DateTime,
  DropdownMenu,
  EmptyState,
  FilterBar,
  IconButton,
  MenuItem,
  MenuSeparator,
  PageHeader,
  RelativeTime,
  StatusPill,
} from "../../shared/ui/index.js";
import { TenantFilter, TenantLink, useTenantScope } from "./lib/tenantScope.jsx";
import { CreateUserDialog } from "./lib/CreateUserDialog.jsx";
import { roleKind, useRolesFor } from "./lib/roles.jsx";
import { SignOutEverywhereDialog, UserStatusDialog, userStatusActions } from "./lib/userStatus.jsx";

const B = "/super-admin/users";
const uid = (u) => String(u.id || u._id);

const ACCOUNT_TYPES = [
  { value: "true", label: "Staff & admins" },
  { value: "false", label: "Buyers" },
];
const VERIFIED = [
  { value: "true", label: "Verified" },
  { value: "false", label: "Unverified" },
];

export default function Users() {
  const can = useCan();
  const { user: me } = useAuth();
  const scope = useTenantScope();
  const table = useUrlTableState({ filters: ["status", "staff", "emailVerified", "roleId", "homeTenantId", "from", "to"], defaults: { limit: 20 } });
  const q = useQuery({
    queryKey: keys.users.list({ ...table.query, tenant: scope.tenantId }),
    queryFn: () => scope.api.listUsers(table.query),
    ...listQueryOptions,
  });
  const roles = useRolesFor(scope.tenantId || null);
  const roleOpts = useMemo(
    () =>
      (roles.data || []).map((r) => ({
        value: String(r._id),
        label: r.name,
        description: r.isSystem ? "System" : r.tenantId?.name || "Custom",
      })),
    [roles.data]
  );
  const [creating, setCreating] = useState(false);
  const [statusAction, setStatusAction] = useState(null);
  const [signingOut, setSigningOut] = useState(null);

  const addBtn = can("users.create") ? (
    <Button variant="primary" leftIcon={Plus} onClick={() => setCreating(true)}>
      Add user
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Users"
        description="Every account on the platform: buyers, store staff and platform admins."
        breadcrumbs={[{ label: "Console", to: "/super-admin" }, { label: "Users" }]}
        primaryAction={addBtn}
      />
      <DataTable
        storageKey="sa-users"
        exportFilename="users"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        getRowId={uid}
        rowHref={(u) => `${B}/${uid(u)}`}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Name, email, phone, company"
            facets={[
              { key: "status", title: "Status", options: statusOptions(USER_STATUSES_ALL.filter((s) => s !== "deleted")) },
              { key: "staff", title: "Account type", options: ACCOUNT_TYPES },
              { key: "emailVerified", title: "Email", options: VERIFIED },
            ]}
            dateRange={{ from: "from", to: "to" }}
          >
            <Combobox
              size="sm"
              className="w-full sm:w-48"
              aria-label="Filter by role"
              value={table.filters.roleId}
              onChange={(v) => table.setFilter("roleId", v || "")}
              options={roleOpts}
              placeholder="Any role"
              clearable
            />
            <TenantFilter value={scope.tenantId} onChange={scope.setTenant} placeholder="Any store" />
            <TenantFilter value={table.filters.homeTenantId} onChange={(id) => table.setFilter("homeTenantId", id)} placeholder="Any home store" />
          </FilterBar>
        }
        columns={[
          {
            id: "name",
            header: "User",
            primary: true,
            accessorKey: "name",
            sortKey: "name",
            cell: (u) => (
              <span className="flex min-w-0 items-center gap-2.5">
                <Avatar name={u.name || u.email} size="sm" />
                <span className="grid min-w-0">
                  <span className="truncate">{u.name || "—"}</span>
                  <span className="truncate text-ui-xs font-normal text-fg-subtle">{u.email}</span>
                </span>
              </span>
            ),
            csv: (u) => `${u.name} <${u.email}>`,
          },
          {
            id: "role",
            header: "Role",
            cell: (u) => {
              const kind = roleKind(u.role);
              return (
                <span className="flex flex-wrap items-center gap-1.5">
                  <span>{u.role?.name || "—"}</span>
                  {kind === "platform" ? <Badge tone="accent">Platform</Badge> : null}
                </span>
              );
            },
            csv: (u) => u.role?.name,
            mobile: "meta",
          },
          {
            id: "tenant",
            header: "Store",
            cell: (u) =>
              u.tenantId ? (
                <TenantLink tenant={u.tenant || u.tenantId} />
              ) : (
                <span className="text-fg-subtle">{roleKind(u.role) === "platform" ? "Platform" : "—"}</span>
              ),
            csv: (u) => u.tenant?.name || "",
            mobile: "meta",
          },
          {
            id: "homeTenant",
            header: "Home store",
            cell: (u) => (u.homeTenant || u.homeTenantId ? <TenantLink tenant={u.homeTenant || u.homeTenantId} /> : <span className="text-fg-subtle">—</span>),
            csv: (u) => u.homeTenant?.name || "",
            mobile: "meta",
          },
          { id: "status", header: "Status", sortKey: "status", cell: (u) => <StatusPill status={u.status} />, csv: (u) => u.status, mobile: "meta" },
          {
            id: "verified",
            header: "Email",
            cell: (u) => (u.emailVerified ? <Badge tone="success">Verified</Badge> : <Badge tone="warning">Unverified</Badge>),
            csv: (u) => (u.emailVerified ? "verified" : "unverified"),
          },
          { id: "login", header: "Last sign-in", sortKey: "lastLoginAt", cell: (u) => <RelativeTime value={u.lastLoginAt} />, csv: (u) => u.lastLoginAt },
          { id: "created", header: "Joined", sortKey: "createdAt", cell: (u) => <DateTime value={u.createdAt} format="date" />, csv: (u) => u.createdAt, defaultHidden: true },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            hideable: false,
            csv: false,
            align: "right",
            width: 48,
            mobile: "hidden",
            cell: (u) => {
              const self = uid(u) === String(me?.id);
              const canEdit = !self && can("users.edit");
              const acts = canEdit ? userStatusActions(u) : [];
              const canSignOut = canEdit && u.status !== "deleted";
              return (
                <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${u.name || u.email}`} size="sm" />}>
                  <MenuItem to={`${B}/${uid(u)}`}>Open</MenuItem>
                  <MenuItem to={`/super-admin/orders?q=${encodeURIComponent(u.email)}`}>Orders by this buyer</MenuItem>
                  {acts.length || canSignOut ? <MenuSeparator /> : null}
                  {canSignOut ? <MenuItem onSelect={() => setSigningOut(u)}>Sign out everywhere</MenuItem> : null}
                  {acts.map((a) => (
                    <MenuItem key={a.to} tone={a.tone} onSelect={() => setStatusAction({ user: u, action: a })}>
                      {a.label}
                    </MenuItem>
                  ))}
                </DropdownMenu>
              );
            },
          },
        ]}
        emptyState={table.activeCount || scope.tenantId ? undefined : <EmptyState icon={UsersIcon} title="No users yet" action={addBtn} />}
      />
      <CreateUserDialog open={creating} onOpenChange={setCreating} />
      {signingOut ? <SignOutEverywhereDialog user={signingOut} onClose={() => setSigningOut(null)} /> : null}
      {statusAction ? <UserStatusDialog user={statusAction.user} action={statusAction.action} onClose={() => setStatusAction(null)} /> : null}
    </>
  );
}
