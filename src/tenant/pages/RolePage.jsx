import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Lock, Minus, Plus, Trash2, Users } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { api } from "../../shared/api/index.js";
import { keys } from "../../shared/api/keys.js";
import { useApiMutation } from "../../shared/hooks/useApiMutation.js";
import { useUnsavedChangesGuard } from "../../shared/hooks/useUnsavedChangesGuard.js";
import { useAuth, useCan } from "../../shared/context/AuthContext.jsx";
import {
  Alert,
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  ConfirmDialog,
  Dialog,
  ErrorState,
  Field,
  FormActions,
  Input,
  PageHeader,
  PageSkeleton,
  Skeleton,
  Textarea,
  UnsavedChangesDialog,
} from "../../shared/ui/index.js";
import { PermissionGate } from "../../shared/components/PermissionGate.jsx";
import { PermissionMatrix } from "./team/PermissionMatrix.jsx";
import { missingPermissions, permissionInfo } from "./team/permissions.js";
import { holdersQuery } from "./team/RolesTab.jsx";

const TEAM = "/tenant/team?tab=roles";

function validate(form) {
  const errors = {};
  const name = form.name.trim();
  if (name.length < 2) errors.name = "Enter at least 2 characters";
  else if (name.length > 80) errors.name = "Keep it under 80 characters";
  if (form.description.length > 300) errors.description = "Keep it under 300 characters";
  if (form.permissions.length > 200) errors.permissions = "At most 200 permissions";
  return errors;
}

function DiffList({ title, keysList, tone, icon: Icon }) {
  if (!keysList.length) return null;
  return (
    <div className="grid gap-2">
      <h4 className="text-ui-sm font-semibold text-fg">
        {title} <span className="font-normal text-fg-muted">({keysList.length})</span>
      </h4>
      <ul className="grid gap-1">
        {keysList.map((k) => (
          <li key={k} className="flex items-center gap-2 text-ui-sm">
            <Badge tone={tone} className="px-1.5">
              <Icon className="size-3" aria-hidden />
            </Badge>
            <span className="text-fg">{permissionInfo(k).label}</span>
            <code className="font-mono text-ui-2xs text-fg-subtle">{k}</code>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Keyed by id so switching roles (or to /new) starts with fresh form state. */
export default function RolePage() {
  const { id } = useParams();
  return <RoleEditor key={id || "new"} id={id} />;
}

function RoleEditor({ id }) {
  const isNew = !id;
  const navigate = useNavigate();
  const can = useCan();
  const { user } = useAuth();
  const myPerms = useMemo(() => user?.permissions || [], [user]);

  const roleQ = useQuery({ queryKey: keys.roles.detail(id || "new"), queryFn: () => api.getRole(id), enabled: !isNew });
  const permsQ = useQuery({ queryKey: keys.permissions, queryFn: () => api.listPermissions(), staleTime: 5 * 60_000 });
  const holdersQ = useQuery({ ...holdersQuery(id), enabled: !isNew && can("users.view") });

  const role = roleQ.data;
  const initial = useMemo(
    () => ({
      name: role?.name || "",
      description: role?.description || "",
      permissions: [...(role?.permissions || [])].sort(),
    }),
    [role]
  );
  const [form, setForm] = useState(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [diffOpen, setDiffOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [inUse, setInUse] = useState(null);
  const [goTo, setGoTo] = useState(null);
  useEffect(() => setForm(initial), [initial]);

  const isSystem = Boolean(role?.isSystem);
  const outside = role ? missingPermissions(myPerms, role) : [];
  const canWrite = isNew ? can("roles.create") : can("roles.edit") && !isSystem && outside.length === 0;
  const canDelete = !isNew && !isSystem && can("roles.delete") && outside.length === 0;

  const dirty = JSON.stringify(form) !== JSON.stringify(initial);
  const added = form.permissions.filter((p) => !initial.permissions.includes(p));
  const removed = initial.permissions.filter((p) => !form.permissions.includes(p));
  const errors = validate(form);

  const create = useApiMutation((body) => api.createRole(body), {
    invalidate: [keys.roles.all],
    success: (r) => `Role “${r?.name}” created`,
    error: false,
    onSuccess: (r) => {
      setForm(initial);
      setGoTo(`/tenant/team/roles/${r?._id || r?.id}`);
    },
  });
  const update = useApiMutation((body) => api.updateRole(id, body), {
    invalidate: [keys.roles.all],
    success: "Role saved",
    error: false,
    onSuccess: () => setDiffOpen(false),
  });
  const remove = useApiMutation(() => api.deleteRole(id), { invalidate: [keys.roles.all, keys.users.all], success: "Role deleted", error: false });
  const saving = create.isPending || update.isPending;
  const saveError = create.error || update.error;

  const blocker = useUnsavedChangesGuard(dirty && canWrite && !saving && !goTo);
  useEffect(() => {
    if (goTo) navigate(goTo, { replace: true });
  }, [goTo, navigate]);

  const err = (name) =>
    (showErrors ? errors[name] : undefined) ||
    (name === "name" && saveError?.code === "DUPLICATE" ? "A role with this name already exists" : undefined) ||
    saveError?.fieldError?.(name);

  function body() {
    const out = { name: form.name.trim(), description: form.description.trim(), permissions: form.permissions };
    return out;
  }

  function submit(e) {
    e.preventDefault();
    setShowErrors(true);
    if (Object.keys(errors).length || !canWrite) return;
    if (isNew) {
      create.mutate(body());
      return;
    }
    if (added.length || removed.length) setDiffOpen(true);
    else update.mutate({ name: form.name.trim(), description: form.description.trim() });
  }

  if (!isNew && roleQ.isPending) return <PageSkeleton />;
  if (!isNew && roleQ.error) {
    return (
      <>
        <PageHeader title="Role" back={TEAM} breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Team", to: "/tenant/team" }, { label: "Roles", to: TEAM }, { label: "Not found" }]} />
        <ErrorState error={roleQ.error} onRetry={roleQ.refetch} title={roleQ.error?.status === 404 ? "Role not found" : "Couldn’t load this role"} />
      </>
    );
  }

  const holders = holdersQ.data?.meta?.total;
  const title = isNew ? "New role" : role.name;
  const serverFieldErrors = saveError ? Object.keys(saveError.fields || {}).length > 0 || saveError.code === "DUPLICATE" : false;

  return (
    <>
      <PageHeader
        title={title}
        back={TEAM}
        breadcrumbs={[{ label: "Store admin", to: "/tenant" }, { label: "Team", to: "/tenant/team" }, { label: "Roles", to: TEAM }, { label: title }]}
        meta={!isNew ? isSystem ? <Badge tone="outline">System · read-only</Badge> : <Badge tone="info">Custom</Badge> : null}
        description={isNew ? "Pick exactly what members with this role can see and do." : role.description || undefined}
        secondaryActions={
          canDelete || (!isNew && !isSystem) ? (
            <PermissionGate perm="roles.delete" allowed={canDelete} reason={outside.length ? "This role has permissions you don’t hold" : undefined}>
              <Button variant="danger-ghost" leftIcon={Trash2} onClick={() => setDeleteOpen(true)}>
                Delete
              </Button>
            </PermissionGate>
          ) : null
        }
        primaryAction={
          canWrite ? (
            <Button type="submit" form="role-form" variant="primary" loading={saving} disabled={!isNew && !dirty}>
              {isNew ? "Create role" : "Save changes"}
            </Button>
          ) : null
        }
      />

      <div className="grid gap-4">
        {isSystem ? (
          <Alert tone="info" icon={Lock} title="System role">
            Permissions of system roles are defined by the platform and can’t be changed. Create a custom role to choose your own set.
          </Alert>
        ) : null}
        {!isNew && !isSystem && outside.length ? (
          <Alert tone="warning" title="You can’t edit this role">
            It includes permissions you don’t hold ({outside.map((p) => permissionInfo(p).label).join(", ")}).
          </Alert>
        ) : null}
        {!isNew && !isSystem && !outside.length && !can("roles.edit") ? <Alert tone="info">View only — editing roles requires roles.edit.</Alert> : null}
        {inUse ? (
          <Alert
            tone="danger"
            title="This role is still assigned"
            action={
              <Button size="sm" leftIcon={Users} to={`/tenant/team?roleId=${id}`}>
                View members
              </Button>
            }
          >
            {inUse.message}. Move those members to another role, then try again.
          </Alert>
        ) : null}

        <form id="role-form" onSubmit={submit} noValidate className="grid gap-4">
          <Card>
            <CardHeader
              title="Details"
              actions={
                !isNew ? (
                  <span className="text-ui-sm text-fg-muted">
                    {holdersQ.isPending && can("users.view") ? (
                      <Skeleton className="h-4 w-24" />
                    ) : holders != null ? (
                      <Link to={`/tenant/team?roleId=${id}`} className="text-primary-soft-fg underline-offset-4 hover:underline">
                        {holders} {holders === 1 ? "member" : "members"}
                      </Link>
                    ) : null}
                  </span>
                ) : null
              }
            />
            <CardBody>
              <fieldset disabled={!canWrite || saving} className="m-0 grid min-w-0 gap-4 border-0 p-0 md:grid-cols-2">
                <Field label="Name" required error={err("name")} hint={isNew ? "For example “Packer” or “Catalog editor”." : role?.slug ? `Slug: ${role.slug}` : undefined}>
                  <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} maxLength={80} autoFocus={isNew} />
                </Field>
                <Field label="Description" optional error={err("description")} hint={`${form.description.length}/300`}>
                  <Textarea rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} maxLength={300} />
                </Field>
              </fieldset>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Permissions" description={canWrite ? "You can grant only permissions you hold yourself." : undefined} />
            <CardBody>
              {permsQ.isPending ? (
                <div className="grid gap-3 lg:grid-cols-2">
                  {Array.from({ length: 4 }, (_, i) => (
                    <Skeleton key={i} className="h-40" />
                  ))}
                </div>
              ) : permsQ.error ? (
                <ErrorState compact error={permsQ.error} onRetry={permsQ.refetch} title="Couldn’t load permissions" />
              ) : (
                <PermissionMatrix
                  value={form.permissions}
                  onChange={(permissions) => setForm({ ...form, permissions })}
                  available={(Array.isArray(permsQ.data) ? permsQ.data : permsQ.data?.data || []).map((p) => p.key)}
                  myPermissions={myPerms}
                  readOnly={!canWrite || saving}
                />
              )}
              {err("permissions") ? (
                <p role="alert" className="mt-2 text-ui-xs text-danger-fg">
                  {err("permissions")}
                </p>
              ) : null}
            </CardBody>
          </Card>

          {saveError && !serverFieldErrors ? <Alert tone="danger">{saveError.message}</Alert> : null}

          {canWrite ? (
            <FormActions>
              {!isNew && dirty ? (
                <span className="mr-auto text-ui-sm text-fg-muted">
                  Unsaved changes{added.length || removed.length ? ` · +${added.length} / −${removed.length} permissions` : ""}
                </span>
              ) : null}
              <Button to={TEAM} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" loading={saving} disabled={!isNew && !dirty}>
                {isNew ? "Create role" : "Save changes"}
              </Button>
            </FormActions>
          ) : null}
        </form>
      </div>

      <Dialog
        open={diffOpen}
        onOpenChange={setDiffOpen}
        title={`Update permissions for “${form.name.trim() || role?.name}”?`}
        description={
          holders
            ? `${holders} ${holders === 1 ? "member gets" : "members get"} the new permissions on their next request.`
            : "Nobody holds this role yet."
        }
        busy={update.isPending}
        footer={
          <>
            <Button onClick={() => setDiffOpen(false)} disabled={update.isPending}>
              Keep editing
            </Button>
            <Button variant="primary" loading={update.isPending} onClick={() => update.mutate(body())}>
              Save changes
            </Button>
          </>
        }
      >
        <div className="grid gap-4">
          <DiffList title="Added" keysList={added} tone="success" icon={Plus} />
          <DiffList title="Removed" keysList={removed} tone="danger" icon={Minus} />
          {update.error ? <Alert tone="danger">{update.error.message}</Alert> : null}
        </div>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title={`Delete role “${role?.name}”?`}
        description={
          holders
            ? `${holders} ${holders === 1 ? "member still holds" : "members still hold"} this role. Reassign them first — deletion will be refused while it is in use.`
            : "This can’t be undone. Nobody holds this role right now."
        }
        confirmLabel="Delete role"
        tone="danger"
        typedConfirmation={role?.name}
        onConfirm={async () => {
          try {
            await remove.mutateAsync();
            setGoTo(TEAM);
          } catch (e) {
            if (e?.code === "ROLE_IN_USE") {
              setInUse(e);
              return;
            }
            throw e;
          }
        }}
      />
      <UnsavedChangesDialog blocker={blocker} />
    </>
  );
}
