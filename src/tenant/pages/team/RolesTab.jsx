import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Lock, Plus, Search, ShieldCheck } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../../shared/api/index.js";
import { keys } from "../../../shared/api/keys.js";
import { useCan } from "../../../shared/context/AuthContext.jsx";
import { Alert, Badge, Button, DataTable, EmptyState, Input, Skeleton } from "../../../shared/ui/index.js";
import { PermissionGate } from "../../../shared/components/PermissionGate.jsx";
import { roleId } from "./permissions.js";

export function holdersQuery(id) {
  const query = { roleId: id, staff: "true", limit: 1 };
  return { queryKey: keys.users.list(query), queryFn: () => api.listUsers(query) };
}

function HolderCount({ id }) {
  const can = useCan();
  const q = useQuery({ ...holdersQuery(id), enabled: can("users.view") });
  if (!can("users.view")) return <span className="text-fg-subtle">—</span>;
  if (q.isPending) return <Skeleton className="ml-auto h-4 w-6" />;
  if (q.error) return <span className="text-fg-subtle">—</span>;
  const n = q.data?.meta?.total ?? 0;
  if (!n) return <span className="tabular-nums text-fg-subtle">0</span>;
  return (
    <Link to={`/tenant/team?roleId=${id}`} className="relative z-[1] tabular-nums text-primary-soft-fg underline-offset-4 hover:underline">
      {n}
    </Link>
  );
}

export function RolesTab({ roles }) {
  const can = useCan();
  const [search, setSearch] = useState("");
  const rows = useMemo(() => {
    const term = search.trim().toLowerCase();
    if (!term) return roles.roles;
    return roles.roles.filter((r) => [r.name, r.slug, r.description].some((v) => String(v || "").toLowerCase().includes(term)));
  }, [roles.roles, search]);

  if (!can("roles.view")) {
    return <Alert tone="info" title="Roles are hidden">Viewing roles requires the roles.view permission.</Alert>;
  }

  const columns = [
    {
      id: "name",
      header: "Role",
      primary: true,
      accessorFn: (r) => r.name,
      cell: (r) => (
        <span className="inline-flex items-center gap-2">
          {r.isSystem ? <Lock aria-hidden className="size-3.5 text-fg-subtle" /> : <ShieldCheck aria-hidden className="size-3.5 text-fg-subtle" />}
          {r.name}
        </span>
      ),
    },
    {
      id: "type",
      header: "Type",
      mobile: "meta",
      accessorFn: (r) => (r.isSystem ? "System" : "Custom"),
      cell: (r) => (r.isSystem ? <Badge tone="outline">System · read-only</Badge> : <Badge tone="info">Custom</Badge>),
    },
    { id: "description", header: "Description", mobile: "subtitle", accessorFn: (r) => r.description || null, cell: (r) => <span className="line-clamp-1 text-fg-muted">{r.description || "—"}</span> },
    { id: "permissions", header: "Permissions", align: "right", mobile: "meta", accessorFn: (r) => r.permissions?.length || 0, cell: (r) => <span className="tabular-nums">{r.permissions?.length || 0}</span> },
    { id: "holders", header: "Members", align: "right", mobile: "meta", csv: () => "", cell: (r) => <HolderCount id={roleId(r)} /> },
  ];

  return (
    <DataTable
      storageKey="tenant-team-roles"
      exportFilename="roles"
      caption="Roles"
      data={rows}
      loading={roles.query.isPending}
      fetching={roles.query.isFetching}
      error={roles.query.error}
      onRetry={roles.query.refetch}
      pagination={false}
      columns={columns}
      rowHref={(r) => `/tenant/team/roles/${roleId(r)}`}
      toolbar={
        <div className="flex flex-wrap items-center gap-2">
          <Input size="sm" type="search" aria-label="Search roles" placeholder="Search roles" value={search} onChange={(e) => setSearch(e.target.value)} prefix={<Search aria-hidden />} className="w-full sm:w-64" />
          <p className="text-ui-xs text-fg-subtle">System roles are defined by the platform. Create a custom role to choose exact permissions.</p>
        </div>
      }
      emptyState={
        <EmptyState
          icon={ShieldCheck}
          title={search ? "No roles match" : "No roles yet"}
          description={search ? "Try a different search." : "Create a custom role to give staff exactly the access they need."}
          action={
            search ? (
              <Button size="sm" onClick={() => setSearch("")}>
                Clear search
              </Button>
            ) : (
              <PermissionGate perm="roles.create">
                <Button variant="primary" leftIcon={Plus} to="/tenant/team/roles/new">
                  New role
                </Button>
              </PermissionGate>
            )
          }
        />
      }
    />
  );
}
