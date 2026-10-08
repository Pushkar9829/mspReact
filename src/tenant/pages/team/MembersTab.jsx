import { useMemo, useState } from "react";
import { MoreHorizontal, Pencil, UserCheck, UserPlus, UserX, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { listQueryOptions } from "../../../shared/api/queryClient.js";
import { useApiMutation } from "../../../shared/hooks/useApiMutation.js";
import { useUrlTableState } from "../../../shared/hooks/useUrlTableState.js";
import { useAuth, useCan } from "../../../shared/context/AuthContext.jsx";
import { USER_STATUSES, statusOptions } from "../../../shared/lib/panel.js";
import {
  Avatar,
  Badge,
  Button,
  ConfirmDialog,
  DataTable,
  DateTime,
  DropdownMenu,
  EmptyState,
  FilterBar,
  IconButton,
  MenuItem,
  MenuSeparator,
  RelativeTime,
  StatusPill,
} from "../../../shared/ui/index.js";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { CreateMemberDialog, EditMemberSheet } from "./MemberForms.jsx";
import { missingPermissions } from "./permissions.js";

export function MembersTab({ roles, createOpen, setCreateOpen }) {
  const can = useCan();
  const { user } = useAuth();
  const myId = String(user?.id || "");
  const myPerms = user?.permissions || [];
  const table = useUrlTableState({ filters: ["status", "roleId"], defaults: { limit: 20 } });
  const query = { ...table.query, staff: "true" };
  const q = useQuery({ queryKey: keys.users.list(query), queryFn: () => api.listUsers(query), ...listQueryOptions });
  const [editing, setEditing] = useState(null);
  const [suspending, setSuspending] = useState(null);
  const [reactivating, setReactivating] = useState(null);

  const suspend = useApiMutation((id) => api.deleteUser(id), { invalidate: [keys.users.all], success: "Member suspended and signed out", error: false });
  const reactivate = useApiMutation((id) => api.updateUser(id, { status: "active" }), { invalidate: [keys.users.all], success: "Member reactivated", error: false });

  // Role facet: every staff role we know of (falls back to roles seen on this page without roles.view).
  const roleFacet = useMemo(() => {
    const map = new Map(roles.options.map((o) => [o.value, o.role?.name || o.label]));
    (q.data?.data || []).forEach((u) => u.role?.id && !map.has(String(u.role.id)) && map.set(String(u.role.id), u.role.name));
    return [...map.entries()].map(([value, label]) => ({ value, label }));
  }, [roles.options, q.data]);

  const canManageRow = (u) => !u.role || missingPermissions(myPerms, u.role).length === 0;

  const columns = [
    {
      id: "member",
      header: "Member",
      primary: true,
      accessorFn: (u) => u.name,
      csv: (u) => u.name,
      cell: (u) => (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar name={u.name} size="md" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="truncate font-medium text-fg">{u.name}</span>
              {String(u.id) === myId ? <Badge tone="primary">You</Badge> : null}
            </div>
            <div className="truncate text-ui-sm text-fg-muted">{u.email}</div>
          </div>
        </div>
      ),
    },
    {
      id: "role",
      header: "Role",
      accessorFn: (u) => u.role?.name,
      mobile: "meta",
      cell: (u) => (u.role ? <Badge tone={u.role.slug === "tenant_admin" ? "accent" : "neutral"}>{u.role.name}</Badge> : <span className="text-fg-subtle">—</span>),
    },
    { id: "status", header: "Status", mobile: "meta", accessorFn: (u) => u.status, cell: (u) => <StatusPill status={u.status} /> },
    { id: "phone", header: "Phone", accessorFn: (u) => u.phone || null, defaultHidden: true, mobile: "hidden" },
    {
      id: "lastLogin",
      header: "Last sign-in",
      accessorFn: (u) => u.lastLoginAt,
      cell: (u) => (u.lastLoginAt ? <RelativeTime value={u.lastLoginAt} /> : <span className="text-fg-subtle">Never</span>),
    },
    { id: "joined", header: "Added", accessorFn: (u) => u.createdAt, mobile: "hidden", cell: (u) => <DateTime value={u.createdAt} format="date" /> },
    {
      id: "actions",
      header: <span className="sr-only">Actions</span>,
      hideable: false,
      align: "right",
      csv: () => "",
      cell: (u) => {
        const self = String(u.id) === myId;
        const manageable = canManageRow(u);
        const reason = !manageable ? "This member's role has permissions you don't hold" : null;
        return (
          <DropdownMenu trigger={<IconButton icon={MoreHorizontal} label={`Actions for ${u.name}`} size="sm" />}>
            <MenuItem icon={Pencil} onSelect={() => setEditing(u)}>
              {can("users.edit") && manageable ? "Edit member" : "View details"}
            </MenuItem>
            {!self && u.status !== "active" ? (
              <MenuItem icon={UserCheck} disabled={!can("users.edit") || !manageable} onSelect={() => setReactivating(u)}>
                {u.status === "pending" ? "Activate" : "Reactivate"}
                {!can("users.edit") ? " (requires users.edit)" : reason ? " (not allowed)" : ""}
              </MenuItem>
            ) : null}
            {!self && u.status !== "suspended" ? (
              <>
                <MenuSeparator />
                <MenuItem icon={UserX} tone="danger" disabled={!can("users.delete") || !manageable} onSelect={() => setSuspending(u)}>
                  Suspend
                  {!can("users.delete") ? " (requires users.delete)" : reason ? " (not allowed)" : ""}
                </MenuItem>
              </>
            ) : null}
          </DropdownMenu>
        );
      },
    },
  ];

  const filtered = table.activeCount > 0;

  return (
    <>
      <DataTable
        storageKey="tenant-team-members"
        exportFilename="team-members"
        caption="Team members"
        table={table}
        data={q.data?.data}
        meta={q.data?.meta}
        loading={q.isPending}
        fetching={q.isFetching}
        error={q.error}
        onRetry={q.refetch}
        getRowId={(u) => String(u.id)}
        columns={columns}
        toolbar={
          <FilterBar
            table={table}
            searchPlaceholder="Search name, email or phone"
            facets={[
              { key: "status", title: "Status", options: statusOptions(USER_STATUSES) },
              ...(roleFacet.length ? [{ key: "roleId", title: "Role", options: roleFacet }] : []),
            ]}
          />
        }
        emptyState={
          filtered ? (
            <EmptyState
              icon={Users}
              title="No members match"
              description="Try a different search or clear the filters."
              action={
                <Button size="sm" onClick={table.reset}>
                  Clear filters
                </Button>
              }
            />
          ) : (
            <EmptyState
              icon={Users}
              title="No team members yet"
              description="Add staff so they can help with orders, catalog and support."
              action={
                <PermissionGate
                  allowed={can("users.create") && roles.enabled}
                  reason={can("users.create") ? "Adding members also requires roles.view (to choose their role)" : "Requires users.create"}
                >
                  <Button variant="primary" leftIcon={UserPlus} onClick={() => setCreateOpen(true)}>
                    Add member
                  </Button>
                </PermissionGate>
              }
            />
          )
        }
      />

      <CreateMemberDialog open={createOpen && roles.enabled} onOpenChange={setCreateOpen} roleOptions={roles.options} rolesLoading={roles.enabled && roles.query.isPending} />
      <EditMemberSheet
        member={editing}
        onOpenChange={(next) => !next && setEditing(null)}
        roleOptions={roles.options}
        canChangeRole={roles.enabled}
        isSelf={editing ? String(editing.id) === myId : false}
        canEdit={can("users.edit") && (editing ? canManageRow(editing) : false)}
      />
      <ConfirmDialog
        open={Boolean(suspending)}
        onOpenChange={(next) => !next && setSuspending(null)}
        title={`Suspend ${suspending?.name || "member"}?`}
        description={`${suspending?.name || "They"} will be signed out of every device immediately and won’t be able to sign in until reactivated. Their past activity is kept.`}
        confirmLabel="Suspend member"
        tone="danger"
        onConfirm={() => suspend.mutateAsync(suspending.id)}
      />
      <ConfirmDialog
        open={Boolean(reactivating)}
        onOpenChange={(next) => !next && setReactivating(null)}
        title={`${reactivating?.status === "pending" ? "Activate" : "Reactivate"} ${reactivating?.name || "member"}?`}
        description={`${reactivating?.name || "They"} can sign in again with their existing password, with the permissions of the ${reactivating?.role?.name || "assigned"} role.`}
        confirmLabel={reactivating?.status === "pending" ? "Activate" : "Reactivate"}
        onConfirm={() => reactivate.mutateAsync(reactivating.id)}
      />
    </>
  );
}
