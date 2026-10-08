import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { MoreHorizontal, Plus, Shield } from "lucide-react";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { listQueryOptions } from "../../shared/api/queryClient.js";
import { useUrlTableState } from "../../shared/hooks/useUrlTableState.js";
import { useCan } from "../../shared/context/AuthContext.jsx";
import {
  Alert,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DropdownMenu,
  EmptyState,
  FilterBar,
  IconButton,
  MenuItem,
  MenuSeparator,
  PageHeader,
  RelativeTime,
  toast,
} from "../../shared/ui/index.js";
import { TenantFilter, TenantLink, useTenantScope } from "./lib/tenantScope.jsx";

const B = "/super-admin/roles";

/** Holder count for a role (non-deleted users; same rule as the backend's ROLE_IN_USE check). */
export function useRoleHolders(roleId, options = {}) {
  return useQuery({
    queryKey: keys.users.custom("count", "role", roleId),
    queryFn: () => api.withTenant(null).listUsers({ roleId, limit: 1 }),
    select: (r) => r?.meta?.total ?? 0,
    enabled: Boolean(roleId),
    ...options,
  });
}

/** Delete with holder count up front and ROLE_IN_USE handling. */
export function DeleteRoleDialog({ role, open, onOpenChange, onDeleted }) {
  const qc = useQueryClient();
  const known = typeof role?.usersCount === "number";
  const holders = useRoleHolders(open && !known ? role?._id : null);
  const [inUse, setInUse] = useState(null);
  if (!role) return null;
  const count = known ? role.usersCount : holders.data;
  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(o) => {
        if (!o) setInUse(null);
        onOpenChange(o);
      }}
      title={`Delete role “${role.name}”?`}
      description="This can’t be undone. Users must be moved to another role first."
      confirmLabel="Delete role"
      tone="danger"
      typedConfirmation={role.slug}
      onConfirm={async () => {
        try {
          await api.withTenant(null).deleteRole(role._id);
        } catch (err) {
          if (err?.code === "ROLE_IN_USE") setInUse(err.message);
          throw err;
        }
        await qc.invalidateQueries({ queryKey: keys.roles.all });
        toast.success(`Role “${role.name}” deleted`);
        onDeleted?.();
      }}
    >
      {!known && holders.isPending ? null : count > 0 || inUse ? (
        <Alert tone="warning" title={`${count ?? "Some"} user${count === 1 ? "" : "s"} hold this role`}>
          {inUse || "The server will refuse the delete while anyone holds it."}{" "}
          <Link className="font-medium underline" to={`/super-admin/users?roleId=${role._id}`}>
            Review holders
          </Link>
        </Alert>
      ) : (
        <p className="text-ui-sm text-fg-muted">Nobody holds this role.</p>
      )}
    </ConfirmDialog>
  );
}

export default function Roles() {
  const can = useCan();
  const scope = useTenantScope();
  const table = useUrlTableState({ filters: ["scope", "system"], defaults: { limit: 20 } });
  const q = useQuery({
    queryKey: keys.roles.list({ ...table.query, tenant: scope.tenantId }),
    queryFn: () => scope.api.listRoles(table.query),
    ...listQueryOptions,
  });
  const [deleting, setDeleting] = useState(null);
  const newHref = scope.tenantId ? `${B}/new?tenant=${scope.tenantId}` : `${B}/new`;
  const add = can("roles.create") ? (
    <Button variant="primary" leftIcon={Plus} to={newHref}>
      New role
    </Button>
  ) : null;

  return (
    <>
      <PageHeader
        title="Roles"
        description="System roles are defined in code. Stores can have custom roles built from the permission catalog."
        breadcrumbs={[{ label: "Console", to: "/super-admin" }, { label: "Roles" }]}
        primaryAction={add}
      />
      <DataTable
        storageKey="sa-roles"
        exportFilename="roles"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        rowHref={(r) => `${B}/${r._id}`}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Name, slug, description"
            facets={[
              {
                key: "scope",
                title: "Scope",
                options: [
                  { value: "staff", label: "Store staff" },
                  { value: "buyer", label: "Buyer" },
                  { value: "tenant", label: "Any store role" },
                  { value: "platform", label: "Platform" },
                ],
              },
              { key: "system", title: "Type", options: [{ value: "true", label: "System" }, { value: "false", label: "Custom" }] },
            ]}
          >
            <TenantFilter value={scope.tenantId} onChange={scope.setTenant} />
          </FilterBar>
        }
        columns={[
          {
            id: "name",
            header: "Role",
            primary: true,
            accessorKey: "name",
            cell: (r) => (
              <span className="grid min-w-0">
                <span className="truncate">{r.name}</span>
                <span className="truncate font-mono text-ui-xs font-normal text-fg-subtle">{r.slug}</span>
              </span>
            ),
          },
          {
            id: "type",
            header: "Type",
            cell: (r) => (r.isSystem ? <Badge tone="neutral">System</Badge> : <Badge tone="info">Custom</Badge>),
            csv: (r) => (r.isSystem ? "system" : "custom"),
            mobile: "meta",
          },
          { id: "scope", header: "Scope", cell: (r) => (r.scope === "platform" ? <Badge tone="accent">Platform</Badge> : "Store"), csv: (r) => r.scope, mobile: "meta" },
          { id: "owner", header: "Owner", cell: (r) => (r.tenantId ? <TenantLink tenant={r.tenantId} /> : <span className="text-fg-subtle">All stores</span>), csv: (r) => r.tenantId?.name || "", mobile: "meta" },
          {
            id: "holders",
            header: "Users",
            align: "right",
            accessorFn: (r) => r.usersCount ?? null,
            cell: (r) =>
              typeof r.usersCount === "number" ? (
                <Link to={`/super-admin/users?roleId=${r._id}`} className="relative z-[1] tabular-nums hover:underline">
                  {r.usersCount.toLocaleString("en-IN")}
                </Link>
              ) : (
                <span className="text-fg-subtle">—</span>
              ),
            mobile: "meta",
          },
          { id: "perms", header: "Permissions", align: "right", accessorFn: (r) => ((r.permissions || []).includes("*") ? "All" : (r.permissions || []).length) },
          { id: "description", header: "Description", accessorFn: (r) => r.description || null, mobile: "subtitle", defaultHidden: true },
          { id: "updated", header: "Updated", cell: (r) => <RelativeTime value={r.updatedAt} />, csv: (r) => r.updatedAt, defaultHidden: true },
          {
            id: "actions",
            header: <span className="sr-only">Actions</span>,
            hideable: false,
            csv: false,
            align: "right",
            width: 48,
            mobile: "hidden",
            cell: (r) => (
              <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${r.name}`} size="sm" />}>
                <MenuItem to={`${B}/${r._id}`}>{r.isSystem ? "View" : "Edit"}</MenuItem>
                <MenuItem to={`/super-admin/users?roleId=${r._id}`}>View holders</MenuItem>
                {!r.isSystem && can("roles.delete") ? (
                  <>
                    <MenuSeparator />
                    <MenuItem tone="danger" onSelect={() => setDeleting(r)}>
                      Delete role
                    </MenuItem>
                  </>
                ) : null}
              </DropdownMenu>
            ),
          },
        ]}
        emptyState={table.activeCount ? undefined : <EmptyState icon={Shield} title="No roles" description="Create a custom role for a store." action={add} />}
      />
      <DeleteRoleDialog role={deleting} open={Boolean(deleting)} onOpenChange={(o) => !o && setDeleting(null)} />
    </>
  );
}
